import { describe, it, expect } from 'vitest';
import { Graph } from '../game/graph/Graph';
import { MazeGenerator } from '../game/graph/MazeGenerator';
import { Node } from '../game/graph/GraphTypes';
import { dijkstra } from '../game/algorithms/Dijkstra';
import { aStar } from '../game/algorithms/AStar';

describe('Teoria dos Grafos - Estrutura G = (V, E, w)', () => {
  it('Graph.size deve contabilizar corretamente arcos direcionados sem dividir por dois', () => {
    const graph = new Graph();
    graph.addEdge([0, 0], [0, 1], 1.0, false);
    expect(graph.size).toBe(1);
    expect(graph.order).toBe(2);

    graph.addEdge([0, 1], [0, 0], 1.0, false);
    expect(graph.size).toBe(2);
    expect(graph.order).toBe(2);
  });

  it('deve adicionar vértices e arestas com pesos arbitrários e validar graus', () => {
    const graph = new Graph();
    graph.addEdge([0, 0], [0, 1], 1.0, true);
    graph.addEdge([0, 1], [1, 1], 4.0, false); // Direcionado

    expect(graph.order).toBe(3);
    expect(graph.size).toBe(3); // (0,0)->(0,1), (0,1)->(0,0), (0,1)->(1,1)
    expect(graph.hasEdge([0, 0], [0, 1])).toBe(true);
    expect(graph.hasEdge([0, 1], [0, 0])).toBe(true);
    expect(graph.hasEdge([0, 1], [1, 1])).toBe(true);
    expect(graph.hasEdge([1, 1], [0, 1])).toBe(false);

    expect(graph.getEdgeWeight([0, 0], [0, 1])).toBe(1.0);
    expect(graph.getEdgeWeight([0, 1], [1, 1])).toBe(4.0);

    expect(graph.outDegree([0, 0])).toBe(1);
    expect(graph.inDegree([0, 0])).toBe(1);
    expect(graph.outDegree([0, 1])).toBe(2);
    expect(graph.inDegree([0, 1])).toBe(1);
  });

  it('deve rejeitar pesos negativos, NaN e infinitos', () => {
    const graph = new Graph();
    expect(() => graph.addEdge([0, 0], [0, 1], -1.0)).toThrow('finito e não negativo');
    expect(() => graph.addEdge([0, 0], [0, 1], NaN)).toThrow('finito e não negativo');
    expect(() => graph.addEdge([0, 0], [0, 1], Infinity)).toThrow('finito e não negativo');
    expect(() => graph.addEdge([0, 0], [0, 1], 0.0)).not.toThrow();
  });

  it('deve gerar labirintos conexos e reproduzíveis por semente', () => {
    const gen1 = new MazeGenerator(15, 15, 42);
    const world1 = gen1.generateWorld();

    const gen2 = new MazeGenerator(15, 15, 42);
    const world2 = gen2.generateWorld();

    expect(world1.grid).toEqual(world2.grid);
    expect(world1.keys).toEqual(world2.keys);
    expect(world1.portalPairs).toEqual(world2.portalPairs);
    expect(world1.graph.order).toBe(world2.graph.order);
    expect(world1.graph.size).toBe(world2.graph.size);
  });

  it('portais devem modelar transição completa: entrar na extremidade leva à outra ponta com custo do terreno de entrada', () => {
    const gen = new MazeGenerator(19, 19, 12345);
    const world = gen.generateWorld(0.1, 1, 2);

    expect(world.portalPairs.length).toBe(1);
    const [p1, p2] = world.portalPairs[0];

    // Verifica que entrar em p1 a partir de qualquer vizinho u resolve para p2
    const directions: Array<[number, number]> = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    let testedP1 = false;
    for (const [dr, dc] of directions) {
      const u: Node = [p1[0] - dr, p1[1] - dc];
      if (world.graph.hasVertex(u)) {
        const resolved = world.graph.resolveStep(u, dr, dc);
        if (resolved) {
          expect(resolved).toEqual(p2);
          expect(world.graph.hasEdge(u, p2)).toBe(true);
          expect(world.graph.transitionEntry(u, p2)).toEqual(p1);
          expect(world.graph.hasEdge(u, p1)).toBe(false); // Travessia comum sem teleporte é proibida
          testedP1 = true;
        }
      }
    }
    expect(testedP1).toBe(true);

    // E vice-versa: entrar em p2 a partir de seu vizinho v resolve para p1
    let testedP2 = false;
    for (const [dr, dc] of directions) {
      const v: Node = [p2[0] - dr, p2[1] - dc];
      if (world.graph.hasVertex(v)) {
        const resolved = world.graph.resolveStep(v, dr, dc);
        if (resolved) {
          expect(resolved).toEqual(p1);
          expect(world.graph.hasEdge(v, p1)).toBe(true);
          expect(world.graph.transitionEntry(v, p1)).toEqual(p2);
          expect(world.graph.hasEdge(v, p2)).toBe(false);
          testedP2 = true;
        }
      }
    }
    expect(testedP2).toBe(true);
  });

  it('garante conectividade forte e acessibilidade dos objetivos com múltiplos portais', () => {
    const gen = new MazeGenerator(21, 21, 777);
    const world = gen.generateWorld(0.1, 2, 3); // 2 pares de portais, 3 chaves

    expect(world.portalPairs.length).toBeGreaterThanOrEqual(1);

    const resToGoal = dijkstra(world.graph, world.start, world.goal);
    expect(resToGoal.found).toBe(true);

    for (const key of world.keys) {
      const resKey = dijkstra(world.graph, world.start, key);
      expect(resKey.found).toBe(true);
    }
  });

  it('caminhos retornados são executáveis segundo as regras reais de movimentação do jogo', () => {
    const gen = new MazeGenerator(19, 19, 456);
    const world = gen.generateWorld(0.1, 1, 2);

    const res = dijkstra(world.graph, world.start, world.goal);
    expect(res.found).toBe(true);

    let current = world.start;
    for (let i = 1; i < res.path.length; i++) {
      const next = res.path[i];
      expect(world.graph.hasEdge(current, next)).toBe(true);

      const entry = world.graph.transitionEntry(current, next);
      const dr = entry[0] - current[0];
      const dc = entry[1] - current[1];
      expect(Math.abs(dr) + Math.abs(dc)).toBe(1);

      const resolved = world.graph.resolveStep(current, dr, dc);
      expect(resolved).toEqual(next);

      current = next;
    }
    expect(current).toEqual(world.goal);
  });
});
