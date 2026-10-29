import { describe, it, expect } from 'vitest';
import { Graph } from '../game/graph/Graph';
import { MazeGenerator } from '../game/graph/MazeGenerator';
import { dijkstra } from '../game/algorithms/Dijkstra';
import { aStar } from '../game/algorithms/AStar';
import { solveMultiGoal } from '../game/algorithms/MultiGoalSolver';

describe('Algoritmos de Pathfinding - Dijkstra vs A*', () => {
  it('Dijkstra e A* devem encontrar rigorosamente o mesmo custo ótimo em grafos ponderados', () => {
    const gen = new MazeGenerator(17, 17, 999);
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
  });

  it('A* deve expandir menor ou igual quantidade de nós em relação ao Dijkstra', () => {
    const gen = new MazeGenerator(21, 21, 555);
    const world = gen.generateWorld(0.05, 1, 2);

    const resD = dijkstra(world.graph, world.start, world.goal);
    const resA = aStar(world.graph, world.start, world.goal, {
      portals: world.portalPairs,
      minWeight: 0.3,
    });

    expect(resA.nodesExpanded).toBeLessThanOrEqual(resD.nodesExpanded);
  });

  it('deve retornar custo 0 quando origem é igual ao destino', () => {
    const graph = new Graph();
    graph.addEdge([1, 1], [1, 2], 1.0);

    const resD = dijkstra(graph, [1, 1], [1, 1]);
    const resA = aStar(graph, [1, 1], [1, 1]);

    expect(resD.cost).toBe(0);
    expect(resD.path).toEqual([[1, 1]]);
    expect(resA.cost).toBe(0);
    expect(resA.path).toEqual([[1, 1]]);
  });

  it('deve indicar destino inacessível quando não há caminho', () => {
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

  it('Multi-Goal Solver deve encontrar a melhor permutação de visitação de chaves', () => {
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
  });
});
