import { describe, it, expect } from 'vitest';
import { Graph } from '../game/graph/Graph';
import { MazeGenerator } from '../game/graph/MazeGenerator';
import { TerrainType, TERRAIN_COSTS } from '../game/graph/Terrain';
import { nodeToKey } from '../game/graph/GraphTypes';

describe('Teoria dos Grafos - Estrutura G = (V, E, w)', () => {
  it('deve adicionar vértices e arestas com pesos arbitrários', () => {
    const graph = new Graph();
    graph.addEdge([0, 0], [0, 1], 1.0, true);
    graph.addEdge([0, 1], [1, 1], 4.0, false); // Direcionado

    expect(graph.order).toBe(3);
    expect(graph.hasEdge([0, 0], [0, 1])).toBe(true);
    expect(graph.hasEdge([0, 1], [0, 0])).toBe(true);
    expect(graph.hasEdge([0, 1], [1, 1])).toBe(true);
    expect(graph.hasEdge([1, 1], [0, 1])).toBe(false); // Não tem volta

    expect(graph.getEdgeWeight([0, 0], [0, 1])).toBe(1.0);
    expect(graph.getEdgeWeight([0, 1], [1, 1])).toBe(4.0);
  });

  it('deve calcular corretamente graus de entrada e saída', () => {
    const graph = new Graph();
    graph.addEdge([0, 0], [0, 1], 1.0, false);
    graph.addEdge([0, 0], [1, 0], 1.0, false);
    graph.addEdge([1, 1], [0, 0], 1.0, false);

    expect(graph.outDegree([0, 0])).toBe(2);
    expect(graph.inDegree([0, 0])).toBe(1);
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
  });

  it('deve alocar portais não-planares com peso 1.0 conectando nós distantes', () => {
    const gen = new MazeGenerator(19, 19, 12345);
    const world = gen.generateWorld(0.1, 1, 2);

    expect(world.portalPairs.length).toBe(1);
    const [p1, p2] = world.portalPairs[0];
    expect(world.graph.hasEdge(p1, p2)).toBe(true);
    expect(world.graph.getEdgeWeight(p1, p2)).toBe(1.0);
    expect(world.graph.getEdgeWeight(p2, p1)).toBe(1.0);
  });
});
