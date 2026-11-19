import { describe, it, expect } from 'vitest';
import { Graph } from '../game/graph/Graph';
import { MazeGenerator } from '../game/graph/MazeGenerator';
import { dijkstra } from '../game/algorithms/Dijkstra';
import { aStar } from '../game/algorithms/AStar';
import { solveMultiGoal } from '../game/algorithms/MultiGoalSolver';
import { Node } from '../game/graph/GraphTypes';

describe('Algoritmos de Pathfinding - Dijkstra vs A*', () => {
  it('Dijkstra e A* devem encontrar rigorosamente o mesmo custo ótimo em grafos ponderados com portais', () => {
    for (const seed of [999, 1234, 5678]) {
      const gen = new MazeGenerator(17, 17, seed);
      const world = gen.generateWorld(0.1, 1, 2);

      const resD = dijkstra(world.graph, world.start, world.goal);
      const resA = aStar(world.graph, world.start, world.goal, {
        portals: world.portalPairs,
        minWeight: 0.3,
      });

      expect(resD.found).toBe(true);
      expect(resA.found).toBe(true);
      expect(Math.abs(resD.cost - resA.cost)).toBeLessThan(1e-5);
      expect(resD.path[0]).toEqual(world.start);
      expect(resD.path[resD.path.length - 1]).toEqual(world.goal);
      expect(resA.path[0]).toEqual(world.start);
      expect(resA.path[resA.path.length - 1]).toEqual(world.goal);
    }
  });

  it('Dijkstra e A* devem encontrar o mesmo custo ótimo em labirintos com múltiplos pares de portais', () => {
    const gen = new MazeGenerator(21, 21, 888);
    const world = gen.generateWorld(0.1, 2, 3); // 2 pares de portais

    const resD = dijkstra(world.graph, world.start, world.goal);
    const resA = aStar(world.graph, world.start, world.goal, {
      portals: world.portalPairs,
      minWeight: 0.3,
    });

    expect(resD.found).toBe(true);
    expect(resA.found).toBe(true);
    expect(Math.abs(resD.cost - resA.cost)).toBeLessThan(1e-5);
  });

  it('A* com heurística consistente do grafo expande menor ou igual quantidade de nós que Dijkstra', () => {
    const gen = new MazeGenerator(21, 21, 555);
    const world = gen.generateWorld(0.05, 1, 2);

    const resD = dijkstra(world.graph, world.start, world.goal);
    const resA = aStar(world.graph, world.start, world.goal, {
      portals: world.portalPairs,
      minWeight: 0.3,
    });

    expect(resA.nodesExpanded).toBeLessThanOrEqual(resD.nodesExpanded);
  });

  it('deve retornar custo 0 e caminho unitário quando origem é igual ao destino válido', () => {
    const graph = new Graph();
    graph.addEdge([1, 1], [1, 2], 1.0);

    const resD = dijkstra(graph, [1, 1], [1, 1]);
    const resA = aStar(graph, [1, 1], [1, 1]);

    expect(resD.found).toBe(true);
    expect(resD.cost).toBe(0);
    expect(resD.path).toEqual([[1, 1]]);
    expect(resD.nodesExpanded).toBe(1);

    expect(resA.found).toBe(true);
    expect(resA.cost).toBe(0);
    expect(resA.path).toEqual([[1, 1]]);
    expect(resA.nodesExpanded).toBe(1);
  });

  it('deve retornar found: false quando origem ou destino não existem no grafo, mesmo se start === goal', () => {
    const graph = new Graph();
    graph.addVertex([1, 1]);

    const resD1 = dijkstra(graph, [2, 2], [2, 2]);
    expect(resD1.found).toBe(false);
    expect(resD1.cost).toBe(Infinity);
    expect(resD1.path).toEqual([]);

    const resA1 = aStar(graph, [2, 2], [2, 2]);
    expect(resA1.found).toBe(false);
    expect(resA1.cost).toBe(Infinity);
    expect(resA1.path).toEqual([]);

    const resD2 = dijkstra(graph, [1, 1], [9, 9]);
    expect(resD2.found).toBe(false);

    const resA2 = aStar(graph, [9, 9], [1, 1]);
    expect(resA2.found).toBe(false);
  });

  it('deve indicar destino inacessível quando não há caminho em componentes desconexos', () => {
    const graph = new Graph();
    graph.addVertex([0, 0]);
    graph.addVertex([5, 5]);

    const resD = dijkstra(graph, [0, 0], [5, 5]);
    const resA = aStar(graph, [0, 0], [5, 5]);

    expect(resD.found).toBe(false);
    expect(resD.cost).toBe(Infinity);
    expect(resA.found).toBe(false);
    expect(resA.cost).toBe(Infinity);
  });

  it('Multi-Goal Solver deve encontrar a melhor permutação de visitação de chaves com cache e sem redundância', () => {
    const gen = new MazeGenerator(17, 17, 888);
    const world = gen.generateWorld(0.1, 1, 2);

    const resD = solveMultiGoal(world.graph, world.start, world.keys, world.goal, {
      algorithm: 'Dijkstra',
      portals: world.portalPairs,
    });
    const resA = solveMultiGoal(world.graph, world.start, world.keys, world.goal, {
      algorithm: 'A*',
      portals: world.portalPairs,
    });

    expect(resD.found).toBe(true);
    expect(resA.found).toBe(true);
    expect(Math.abs(resD.cost - resA.cost)).toBeLessThan(1e-5);
    expect(resD.keyOrder?.length).toBe(world.keys.length);
    expect(resA.keyOrder?.length).toBe(world.keys.length);
    expect(resD.totalNodesExpanded).toBeGreaterThanOrEqual(resD.nodesExpanded);
  });

  it('Multi-Goal Solver deve tratar chaves duplicadas sem passos redundantes', () => {
    const gen = new MazeGenerator(15, 15, 101);
    const world = gen.generateWorld(0.1, 1, 2);

    // Passa lista com chave duplicada
    const duplicateKeys = [world.keys[0], world.keys[0], world.keys[1]];
    const res = solveMultiGoal(world.graph, world.start, duplicateKeys, world.goal);

    expect(res.found).toBe(true);
    expect(res.keyOrder?.length).toBe(2); // Apenas as chaves únicas
  });

  it('Multi-Goal Solver deve preferir ordem de menor custo global em vez de escolha puramente gulosa', () => {
    const g = new Graph();
    const s: Node = [0, 0];
    const a: Node = [0, 1];
    const b: Node = [0, 2];
    const t: Node = [0, 3];

    // Guloso escolheria A primeiro (custo 1), mas depois B custaria 10 (total 1+10+10 = 21).
    // A ordem ótima é B (custo 2) -> A (custo 1) -> T (custo 1), total 4!
    g.addEdge(s, a, 1, false);
    g.addEdge(s, b, 2, false);
    g.addEdge(a, b, 10, false);
    g.addEdge(b, a, 1, false);
    g.addEdge(a, t, 1, false);
    g.addEdge(b, t, 10, false);

    const resD = solveMultiGoal(g, s, [a, b], t, { algorithm: 'Dijkstra' });
    const resA = solveMultiGoal(g, s, [a, b], t, { algorithm: 'A*' });

    expect(resD.cost).toBe(4);
    expect(resA.cost).toBe(4);
    expect(resD.keyOrder).toEqual([b, a]);
    expect(resA.keyOrder).toEqual([b, a]);
  });
});
