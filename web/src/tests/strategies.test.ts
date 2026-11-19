import { describe, expect, it } from 'vitest';
import { MazeGenerator } from '../game/graph/MazeGenerator';
import { Node, nodeEquals, nodeToKey } from '../game/graph/GraphTypes';
import { TerrainType } from '../game/graph/Terrain';
import { AutonomousAgent } from '../game/agents/AutonomousAgent';
import { AgentPerception } from '../game/agents/AgentPerception';
import { AgentPlanner } from '../game/agents/AgentPlanner';
import {
  MinCostStrategy,
  MinTimeStrategy,
  SurvivalStrategy,
  MaxScoreStrategy,
  FullClearStrategy,
  getStrategy,
  STRATEGIES,
  StrategyType,
} from '../game/agents/strategies';
import { EnemyPerception } from '../game/agents/AgentTypes';

describe('Etapa 3 - Sistema de Estratégias Inteligentes do Pac-Man', () => {
  const perception = new AgentPerception();
  const planner = new AgentPlanner();

  it('Deve registrar e disponibilizar as cinco estratégias modulares', () => {
    const types: StrategyType[] = ['MIN_COST', 'MIN_TIME', 'SURVIVAL', 'MAX_SCORE', 'FULL_CLEAR'];
    for (const t of types) {
      const s = getStrategy(t);
      expect(s).toBeDefined();
      expect(s.type).toBe(t);
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.description.length).toBeGreaterThan(0);
    }
  });

  describe('1. MIN_COST Strategy', () => {
    it('Deve encontrar o percurso de menor custo acumulado visitando todas as chaves e saída', () => {
      const gen = new MazeGenerator(17, 17, 123);
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

      const strategy = new MinCostStrategy();
      const plan = strategy.plan(data, 'A*');

      expect(plan).not.toBeNull();
      expect(nodeEquals(plan!.fullPath[0], world.start)).toBe(true);
      expect(nodeEquals(plan!.fullPath[plan!.fullPath.length - 1], world.goal)).toBe(true);

      // Todas as chaves devem ser visitadas no trajeto
      const visitedSet = new Set(plan!.fullPath.map(nodeToKey));
      for (const k of world.keys) {
        expect(visitedSet.has(nodeToKey(k))).toBe(true);
      }

      // Custo acumulado deve ser positivo e bater com a soma das arestas físicas
      let sumWeight = 0;
      for (let i = 0; i < plan!.fullPath.length - 1; i++) {
        sumWeight += world.graph.getEdgeWeight(plan!.fullPath[i], plan!.fullPath[i + 1]) ?? 1.0;
      }
      expect(Math.abs(plan!.totalCost - sumWeight)).toBeLessThan(1e-5);
    });
  });

  describe('2. MIN_TIME Strategy', () => {
    it('Deve calcular rota válida e reconhecer a equivalência matemática tempo/custo', () => {
      const gen = new MazeGenerator(15, 15, 456);
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

      const strategy = new MinTimeStrategy();
      const plan = strategy.plan(data, 'A*');

      expect(plan).not.toBeNull();
      expect(nodeEquals(plan!.fullPath[0], world.start)).toBe(true);
      expect(nodeEquals(plan!.fullPath[plan!.fullPath.length - 1], world.goal)).toBe(true);

      // Verificação da estimativa matemática de tempo
      const estimatedTime = MinTimeStrategy.estimateTimeSeconds(plan!.totalCost);
      expect(estimatedTime).toBeGreaterThan(0);
      expect(estimatedTime).toBe((plan!.totalCost * MinTimeStrategy.BASE_STEP_DELAY_MS) / 1000);
    });
  });

  describe('3. SURVIVAL Strategy', () => {
    it('Deve evitar ativamente terrenos de Lava quando houver alternativas seguras', () => {
      const gen = new MazeGenerator(17, 17, 789);
      const world = gen.generateWorld(0.1, 1, 1);

      // Força um terreno de lava em um dos vértices vizinhos do início
      const startNeighbors = world.graph.neighbors(world.start);
      expect(startNeighbors.length).toBeGreaterThan(0);

      const lavaNode = startNeighbors[0].node;
      world.terrains.set(nodeToKey(lavaNode), TerrainType.LAVA);

      const data = perception.readState(
        world.start,
        world.graph,
        world.keys,
        new Set(),
        world.goal,
        world.portalPairs,
        world.terrains,
        [],
        0,
        0,
        undefined,
        undefined,
        30 // HP crítico: aversão máxima à lava
      );

      const survivalStrategy = new SurvivalStrategy();
      const plan = survivalStrategy.plan(data, 'A*');

      expect(plan).not.toBeNull();
      expect(plan!.fullPath.length).toBeGreaterThan(1);

      // Se houver caminho alternativo, o primeiro passo não deve ser o nó de lava
      if (startNeighbors.length > 1) {
        expect(nodeEquals(plan!.fullPath[1], lavaNode)).toBe(false);
      }
    });

    it('Deve incluir Orbe de Poder defensiva quando sob perseguição iminente', () => {
      const gen = new MazeGenerator(17, 17, 333);
      const world = gen.generateWorld(0.1, 1, 1);

      // Seleciona um nó vizinho livre para ser a Power Pellet
      const neighbors = world.graph.neighbors(world.start);
      const pelletNode = neighbors[0].node;
      const powerPellets = new Set<string>([nodeToKey(pelletNode)]);

      // Cria um inimigo não vulnerável próximo
      const enemyNeighbor = neighbors.length > 1 ? neighbors[1].node : world.goal;
      const rawEnemies = [
        {
          id: 'red',
          name: 'Fantasma Vermelho',
          pos: enemyNeighbor,
          spawn: enemyNeighbor,
          facing: [0, 1] as [number, number],
          path: [],
        },
      ];

      const data = perception.readState(
        world.start,
        world.graph,
        world.keys,
        new Set(),
        world.goal,
        world.portalPairs,
        world.terrains,
        rawEnemies,
        0,
        0,
        undefined,
        powerPellets,
        80
      );

      const survivalStrategy = new SurvivalStrategy();
      const plan = survivalStrategy.plan(data, 'A*');

      expect(plan).not.toBeNull();
      // O caminho deve passar pelo nó da Power Pellet para neutralizar o perigo
      const pathKeys = new Set(plan!.fullPath.map(nodeToKey));
      expect(pathKeys.has(nodeToKey(pelletNode))).toBe(true);
    });
  });

  describe('4. MAX_SCORE Strategy', () => {
    it('Deve incorporar Power Pellets no trajeto para maximizar pontos', () => {
      const gen = new MazeGenerator(17, 17, 555);
      const world = gen.generateWorld(0.1, 1, 1);

      const neighbors = world.graph.neighbors(world.start);
      const pelletNode = neighbors[0].node;
      const powerPellets = new Set<string>([nodeToKey(pelletNode)]);

      const data = perception.readState(
        world.start,
        world.graph,
        world.keys,
        new Set(),
        world.goal,
        world.portalPairs,
        world.terrains,
        [],
        0,
        0,
        undefined,
        powerPellets,
        100
      );

      const strategy = new MaxScoreStrategy();
      const plan = strategy.plan(data, 'A*');

      expect(plan).not.toBeNull();
      const pathNodes = new Set(plan!.fullPath.map(nodeToKey));
      expect(pathNodes.has(nodeToKey(pelletNode))).toBe(true);
    });

    it('Deve caçar Fantasma Vulnerável próximo para capturar os 200 pontos de bônus', () => {
      const gen = new MazeGenerator(17, 17, 888);
      const world = gen.generateWorld(0.1, 1, 1);

      const neighbors = world.graph.neighbors(world.start);
      const ghostNode = neighbors[0].node;

      const rawEnemies = [
        {
          id: 'red',
          name: 'Fantasma Vulnerável',
          pos: ghostNode,
          spawn: ghostNode,
          facing: [0, 1] as [number, number],
          path: [],
        },
      ];

      // Frightened ativo com 10 segundos restantes
      const data = perception.readState(
        world.start,
        world.graph,
        world.keys,
        new Set(),
        world.goal,
        world.portalPairs,
        world.terrains,
        rawEnemies,
        10000,
        0,
        undefined,
        undefined,
        100
      );

      const strategy = new MaxScoreStrategy();
      const plan = strategy.plan(data, 'A*');

      expect(plan).not.toBeNull();
      const pathNodes = new Set(plan!.fullPath.map(nodeToKey));
      expect(pathNodes.has(nodeToKey(ghostNode))).toBe(true);
    });

    it('Critério de Encerramento: se HP for crítico (<=25), prioriza finalização imediata na saída', () => {
      const gen = new MazeGenerator(17, 17, 999);
      const world = gen.generateWorld(0.1, 1, 1);

      const neighbors = world.graph.neighbors(world.start);
      const pelletNode = neighbors[0].node;
      const powerPellets = new Set<string>([nodeToKey(pelletNode)]);

      const data = perception.readState(
        world.start,
        world.graph,
        world.keys,
        new Set(),
        world.goal,
        world.portalPairs,
        world.terrains,
        [],
        0,
        0,
        undefined,
        powerPellets,
        20 // HP <= 25: encerra desvios extras para garantir bônus de 1000 pts
      );

      const strategy = new MaxScoreStrategy();
      const plan = strategy.plan(data, 'A*');

      expect(plan).not.toBeNull();
      expect(nodeEquals(plan!.fullPath[plan!.fullPath.length - 1], world.goal)).toBe(true);
    });
  });

  describe('5. FULL_CLEAR Strategy', () => {
    it('Deve coletar todos os Pac-Dots eficientemente sem explosão fatorial', () => {
      const gen = new MazeGenerator(15, 15, 777);
      const world = gen.generateWorld(0.1, 1, 1);

      // Pega 15 nós quaisquer transitáveis para serem Pac-Dots
      const pacDots = new Set<string>();
      for (let i = 0; i < Math.min(15, world.graph.vertices.length); i++) {
        const v = world.graph.vertices[i];
        if (!nodeEquals(v, world.start) && !nodeEquals(v, world.goal)) {
          pacDots.add(nodeToKey(v));
        }
      }

      const data = perception.readState(
        world.start,
        world.graph,
        world.keys,
        new Set(),
        world.goal,
        world.portalPairs,
        world.terrains,
        [],
        0,
        0,
        pacDots
      );

      const strategy = new FullClearStrategy();
      const startTime = performance.now();
      const plan = strategy.plan(data, 'A*');
      const elapsed = performance.now() - startTime;

      expect(plan).not.toBeNull();
      // Deve ser extremamente rápido (< 50ms)
      expect(elapsed).toBeLessThan(50);

      // O caminho deve absorver os dots e terminar na saída
      const visitedNodes = new Set(plan!.fullPath.map(nodeToKey));
      for (const dot of pacDots) {
        expect(visitedNodes.has(dot)).toBe(true);
      }
      expect(nodeEquals(plan!.fullPath[plan!.fullPath.length - 1], world.goal)).toBe(true);
    });
  });

  describe('6. Integração com AutonomousAgent e Métricas por Partida', () => {
    it('Deve permitir alternância de estratégias no AutonomousAgent', () => {
      const agent = new AutonomousAgent('A*', 'MVM', 'MIN_COST');
      expect(agent.getStrategy()).toBe('MIN_COST');

      agent.setStrategy('SURVIVAL');
      expect(agent.getStrategy()).toBe('SURVIVAL');

      agent.setStrategy('MAX_SCORE');
      expect(agent.getStrategy()).toBe('MAX_SCORE');

      agent.setStrategy('FULL_CLEAR');
      expect(agent.getStrategy()).toBe('FULL_CLEAR');
    });

    it('Deve computar métricas reais de partida durante o ciclo de vida', () => {
      const gen = new MazeGenerator(15, 15, 42);
      const world = gen.generateWorld(0.1, 1, 1);

      const dots = new Set<string>([nodeToKey(world.keys[0])]);
      const data = perception.readState(
        world.start,
        world.graph,
        world.keys,
        new Set(),
        world.goal,
        world.portalPairs,
        world.terrains,
        [],
        0,
        0,
        dots,
        undefined,
        100,
        250,
        42
      );

      const agent = new AutonomousAgent('A*', 'MVM', 'MIN_COST');
      const started = agent.start(data);
      expect(started).toBe(true);

      const initialMetrics = agent.getMatchMetrics(data);
      expect(initialMetrics.strategy).toBe('MIN_COST');
      expect(initialMetrics.algorithm).toBe('A*');
      expect(initialMetrics.seed).toBe(42);
      expect(initialMetrics.moves).toBe(0);
      expect(initialMetrics.nodesExpanded).toBeGreaterThan(0);
      expect(initialMetrics.outcome).toBe('IN_PROGRESS');

      // Simula um passo físico do Pac-Man
      const nextMove = agent.update(data, 'PLAYING');
      expect(nextMove).not.toBeNull();

      const nextNode = world.graph.resolveStep(world.start, nextMove![0], nextMove![1])!;
      const updatedData = perception.readState(
        nextNode,
        world.graph,
        world.keys,
        new Set(),
        world.goal,
        world.portalPairs,
        world.terrains,
        [],
        0,
        0,
        dots,
        undefined,
        100,
        260,
        42
      );

      agent.update(updatedData, 'PLAYING');
      const updatedMetrics = agent.getMatchMetrics(updatedData);

      expect(updatedMetrics.moves).toBe(1);
      expect(updatedMetrics.traversedCost).toBeGreaterThan(0);

      // Simula vitória
      agent.update(updatedData, 'WON');
      const wonMetrics = agent.getMatchMetrics(updatedData);
      expect(wonMetrics.outcome).toBe('WON');
    });

    it('As cinco estratégias devem funcionar nos modos DEMO e MVM', () => {
      const gen = new MazeGenerator(15, 15, 111);
      const world = gen.generateWorld(0.1, 1, 1);

      const strategies: StrategyType[] = ['MIN_COST', 'MIN_TIME', 'SURVIVAL', 'MAX_SCORE', 'FULL_CLEAR'];

      for (const st of strategies) {
        // Modo DEMO
        const agentDemo = new AutonomousAgent('A*', 'DEMO', st);
        const dataDemo = perception.readState(
          world.start,
          world.graph,
          world.keys,
          new Set(),
          world.goal,
          world.portalPairs,
          world.terrains
        );
        expect(agentDemo.start(dataDemo)).toBe(true);
        expect(agentDemo.getPlan()).not.toBeNull();

        // Modo MVM
        const agentMvm = new AutonomousAgent('A*', 'MVM', st);
        const dataMvm = perception.readState(
          world.start,
          world.graph,
          world.keys,
          new Set(),
          world.goal,
          world.portalPairs,
          world.terrains,
          [
            {
              id: 'red',
              name: 'Vermelho',
              pos: world.goal,
              spawn: world.goal,
              facing: [0, 1],
              path: [],
            },
          ]
        );
        expect(agentMvm.start(dataMvm)).toBe(true);
        expect(agentMvm.getPlan()).not.toBeNull();
      }
    });
  });
});
