import { describe, expect, it } from 'vitest';
import { Graph } from '../game/graph/Graph';
import { MazeGenerator } from '../game/graph/MazeGenerator';
import { Node, nodeEquals, nodeToKey } from '../game/graph/GraphTypes';
import { TerrainType } from '../game/graph/Terrain';
import { AutonomousAgent } from '../game/agents/AutonomousAgent';
import { AgentPerception } from '../game/agents/AgentPerception';
import { AgentPlanner } from '../game/agents/AgentPlanner';
import { AgentExecution } from '../game/agents/AgentExecution';

describe('Pac-Man Autônomo - Arquitetura de Agentes', () => {
  const perception = new AgentPerception();
  const planner = new AgentPlanner();

  it('Percepção deve ler o estado do labirinto sem mutações colaterais', () => {
    const gen = new MazeGenerator(15, 15, 42);
    const world = gen.generateWorld(0.1, 1, 2);

    const collected = new Set<string>();
    collected.add(nodeToKey(world.keys[0]));

    const data = perception.readState(
      world.start,
      world.graph,
      world.keys,
      collected,
      world.goal,
      world.portalPairs,
      world.terrains
    );

    expect(data.remainingKeys.length).toBe(world.keys.length - 1);
    expect(nodeEquals(data.currentPos, world.start)).toBe(true);
    expect(nodeEquals(data.goal, world.goal)).toBe(true);
    expect(data.portalPairs.length).toBe(world.portalPairs.length);
  });

  it('Planejamento deve calcular rota ótima passando por todas as chaves e saída via A* e Dijkstra', () => {
    const gen = new MazeGenerator(17, 17, 101);
    const world = gen.generateWorld(0.1, 1, 2);

    const data = perception.readState(
      world.start,
      world.graph,
      world.keys,
      new Set(),
      world.goal,
      world.portalPairs,
      world.terrains
    );

    const planA = planner.plan(data, 'A*');
    const planD = planner.plan(data, 'Dijkstra');

    expect(planA).not.toBeNull();
    expect(planD).not.toBeNull();

    // Custos ótimos devem ser equivalentes
    expect(Math.abs(planA!.totalCost - planD!.totalCost)).toBeLessThan(1e-5);
    expect(planA!.fullPath.length).toBeGreaterThan(1);
    expect(nodeEquals(planA!.fullPath[0], world.start)).toBe(true);
    expect(nodeEquals(planA!.fullPath[planA!.fullPath.length - 1], world.goal)).toBe(true);

    // O caminho deve visitar todas as chaves
    const pathKeys = new Set(planA!.fullPath.map(nodeToKey));
    for (const key of world.keys) {
      expect(pathKeys.has(nodeToKey(key))).toBe(true);
    }
  });

  it('Execução deve gerar comandos ortogonais válidos [dr, dc] em cada passo', () => {
    const gen = new MazeGenerator(15, 15, 55);
    const world = gen.generateWorld(0.1, 1, 1);

    const data = perception.readState(
      world.start,
      world.graph,
      world.keys,
      new Set(),
      world.goal,
      world.portalPairs,
      world.terrains
    );

    const plan = planner.plan(data, 'A*')!;
    const execution = new AgentExecution();
    execution.setPlan(plan);

    let current = [...world.start] as Node;
    const collected = new Set<string>();

    for (let step = 0; step < plan.fullPath.length - 1; step++) {
      const move = execution.getNextMove(current, world.graph);
      expect(move).not.toBeNull();
      const [dr, dc] = move!;
      expect(Math.abs(dr) + Math.abs(dc)).toBe(1);

      // Simula a transição ortogonal da física do jogo
      const next = world.graph.resolveStep(current, dr, dc);
      expect(next).not.toBeNull();
      current = next!;

      if (world.keys.some((k) => nodeEquals(k, current))) {
        collected.add(nodeToKey(current));
      }
    }

    expect(nodeEquals(current, world.goal)).toBe(true);
    expect(collected.size).toBe(world.keys.length);
    expect(execution.isComplete(current)).toBe(true);
  });

  it('Execução através de portais deve produzir um único comando ortogonal na entrada', () => {
    const g = new Graph();
    const u: Node = [2, 1];
    const p1: Node = [2, 2];
    const p2: Node = [2, 10];
    const v: Node = [2, 11];

    // u -> p2 via portal entry p1
    g.addEdge(u, p2, 1.0, false);
    g.addStep(u, p1, p2);
    g.setEntry(u, p2, p1);

    // p2 -> v
    g.addEdge(p2, v, 1.0, false);
    g.addStep(p2, v, v);
    g.setEntry(p2, v, v);

    const plan = {
      algorithm: 'A*' as const,
      fullPath: [u, p2, v],
      keyOrder: [],
      totalCost: 2.0,
      totalNodesExpanded: 3,
      visitedOrder: [u, p2, v],
    };

    const execution = new AgentExecution();
    execution.setPlan(plan);

    // Passo 1: de u para p2 através do portal p1
    const move1 = execution.getNextMove(u, g);
    expect(move1).toEqual([0, 1]); // dr=0, dc=1 apontando para p1!

    // Física resolve u + [0, 1] -> p2
    const reached = g.resolveStep(u, move1![0], move1![1]);
    expect(reached).toEqual(p2);

    // Passo 2: de p2 para v
    const move2 = execution.getNextMove(reached!, g);
    expect(move2).toEqual([0, 1]);
  });

  it('Ciclo de controle: IDLE -> PLANNING -> MOVING -> PAUSED -> MOVING -> COMPLETED', () => {
    const gen = new MazeGenerator(15, 15, 77);
    const world = gen.generateWorld(0.1, 1, 1);

    const agent = new AutonomousAgent('A*');
    expect(agent.getState()).toBe('IDLE');
    expect(agent.getControlMode()).toBe('HUMAN');

    const data = perception.readState(
      world.start,
      world.graph,
      world.keys,
      new Set(),
      world.goal,
      world.portalPairs,
      world.terrains
    );

    // Iniciar
    const started = agent.start(data);
    expect(started).toBe(true);
    expect(agent.getState()).toBe('MOVING');
    expect(agent.getControlMode()).toBe('AUTONOMOUS');

    // Pausar
    agent.pause();
    expect(agent.getState()).toBe('PAUSED');
    expect(agent.update(data, 'PLAYING')).toBeNull();

    // Retomar
    agent.resume();
    expect(agent.getState()).toBe('MOVING');

    // Executa alguns passos
    const move = agent.update(data, 'PLAYING');
    expect(move).not.toBeNull();

    // Vitória do jogo
    agent.update(data, 'WON');
    expect(agent.getState()).toBe('COMPLETED');

    // Parar volta ao IDLE
    agent.stop();
    expect(agent.getState()).toBe('IDLE');
  });

  it('Alternância entre controle humano e automático sem resetar labirinto', () => {
    const agent = new AutonomousAgent('A*');
    agent.setControlMode('HUMAN');
    expect(agent.getControlMode()).toBe('HUMAN');
    expect(agent.getState()).toBe('IDLE');

    const gen = new MazeGenerator(15, 15, 88);
    const world = gen.generateWorld(0.1, 1, 1);
    const data = perception.readState(
      world.start,
      world.graph,
      world.keys,
      new Set(),
      world.goal,
      world.portalPairs,
      world.terrains
    );

    agent.start(data);
    expect(agent.getControlMode()).toBe('AUTONOMOUS');
    expect(agent.getState()).toBe('MOVING');

    // Desativa controle automático voltando ao humano
    agent.setControlMode('HUMAN');
    expect(agent.getControlMode()).toBe('HUMAN');
    expect(agent.getState()).toBe('IDLE');
    expect(agent.update(data, 'PLAYING')).toBeNull();
  });

  it('Tratamento de caminhos impossíveis ou desconexos deve transicionar para FAILED', () => {
    const g = new Graph();
    const s: Node = [0, 0];
    const key: Node = [5, 5]; // Vértice desconexo
    const goal: Node = [1, 1];
    g.addEdge(s, goal, 1.0, true);

    const impossibleData = {
      currentPos: s,
      graph: g,
      remainingKeys: [key],
      allKeys: [key],
      collectedKeys: new Set<string>(),
      goal,
      portalPairs: [],
      terrains: new Map(),
      enemies: [],
      frightenedUntilTime: 0,
      currentTime: 0,
    };

    const agent = new AutonomousAgent('A*');
    const started = agent.start(impossibleData);
    expect(started).toBe(false);
    expect(agent.getState()).toBe('FAILED');
    expect(agent.update(impossibleData, 'PLAYING')).toBeNull();
  });
});
