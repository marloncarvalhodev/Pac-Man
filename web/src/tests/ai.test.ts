import { describe, it, expect } from 'vitest';
import { Graph } from '../game/graph/Graph';
import { nodeToKey, type Node } from '../game/graph/GraphTypes';
import { makeArenaWorld } from '../game/arena/simulation';
import { aStar } from '../game/algorithms/AStar';
import { dijkstra } from '../game/algorithms/Dijkstra';
import {
  makeGraphHeuristic,
  searchNearestTarget,
} from '../game/algorithms/SearchEngine';
import { solveMultiGoal } from '../game/algorithms/MultiGoalSolver';
import { createMovementModel, transitionKey } from '../game/ai/MovementModel';
import { planGhost, distanceField, projectPlayer } from '../game/ai/GhostAI';
import { planPacmanRoute } from '../game/ai/PacmanPlanner';
import { TerrainType } from '../game/graph/Terrain';
import { buildThreatModel } from '../game/ai/ThreatModel';

describe('IA: correção, portais e decisões táticas', () => {
  it('reabre estados com uma heurística admissível inconsistente', () => {
    const g = new Graph(),
      s: Node = [0, 0],
      a: Node = [0, 1],
      b: Node = [1, 0],
      goal: Node = [0, 2];
    g.addEdge(s, a, 3, false);
    g.addEdge(s, b, 1, false);
    g.addEdge(b, a, 1, false);
    g.addEdge(a, goal, 10, false);
    g.addEdge(b, goal, 100, false);
    const result = aStar(g, s, goal, {
      heuristic: (node) => (nodeToKey(node) === nodeToKey(b) ? 11 : 0),
      recordFrontier: true,
    });
    expect(result.cost).toBe(12);
    expect(result.reopened).toBe(1);
    expect(result.frontierOrder).toHaveLength(result.visitedOrder.length);
    expect(result.frontierPeak).toBeGreaterThan(0);
  });
  it('considera cadeias de atalhos direcionados, custo baixo e heurística consistente', () => {
    const g = new Graph(),
      nodes: Node[] = [
        [0, 0],
        [0, 1],
        [0, 100],
        [0, 101],
        [0, 200],
        [0, 201],
      ];
    [0.3, 0.2, 0.3, 0.2, 0.3].forEach((cost, i) =>
      g.addEdge(nodes[i], nodes[i + 1], cost, false),
    );
    g.addEdge(nodes[0], nodes[5], 5, false);
    const h = makeGraphHeuristic(g, [nodes[5]]);
    expect(aStar(g, nodes[0], nodes[5]).cost).toBeCloseTo(1.3);
    for (const node of nodes) {
      expect(h(node)).toBeLessThanOrEqual(
        dijkstra(g, node, nodes[5]).cost + 1e-9,
      );
      for (const edge of g.neighbors(node))
        expect(h(node)).toBeLessThanOrEqual(edge.weight + h(edge.node) + 1e-9);
    }
  });
  it('invalida o cache de geometria quando o grafo muda e rejeita pesos inválidos', () => {
    const g = new Graph(),
      a: Node = [0, 0],
      b: Node = [0, 100];
    g.addEdge(a, b, 4, false);
    expect(aStar(g, a, b).cost).toBe(4);
    g.addEdge(a, b, 0.1, false);
    expect(aStar(g, a, b).cost).toBe(0.1);
    expect(() => g.addEdge(a, b, -1)).toThrow();
    expect(() => g.addEdge(a, b, NaN)).toThrow();
    expect(() => g.addEdge(a, b, Infinity)).toThrow();
    expect(aStar(new Graph(), a, a).found).toBe(false);
  });
  it('encontra o alvo mais barato por caminho de grafo, em vez do mais próximo geometricamente', () => {
    const g = new Graph(),
      s: Node = [0, 0],
      near: Node = [0, 1],
      far: Node = [9, 9];
    g.addEdge(s, near, 10, false);
    g.addEdge(s, far, 1, false);
    for (const algorithm of ['Dijkstra', 'A*'] as const) {
      const r = searchNearestTarget(g, s, [near, far], algorithm);
      expect(r.path.at(-1)).toEqual(far);
      expect(r.cost).toBe(1);
    }
  });
  it('Held–Karp mantém o ótimo dirigido e elimina chaves repetidas', () => {
    const g = new Graph(),
      nodes: Node[] = [
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 1],
        [2, 2],
      ];
    nodes.forEach((a, i) =>
      nodes.forEach((b, j) => {
        if (i !== j) g.addEdge(a, b, 1 + ((i * 7 + j * 3) % 11), false);
      }),
    );
    const perms = [
      [1, 2, 3],
      [1, 3, 2],
      [2, 1, 3],
      [2, 3, 1],
      [3, 1, 2],
      [3, 2, 1],
    ];
    const brute = Math.min(
      ...perms.map((order) => {
        const p = [0, ...order, 4];
        return p
          .slice(1)
          .reduce(
            (sum, index, i) =>
              sum + dijkstra(g, nodes[p[i]], nodes[index]).cost,
            0,
          );
      }),
    );
    for (const algorithm of ['Dijkstra', 'A*'] as const) {
      const r = solveMultiGoal(
        g,
        nodes[0],
        [nodes[1], nodes[2], nodes[3], nodes[1]],
        nodes[4],
        { algorithm, recordFrontier: true },
      );
      expect(r.cost).toBe(brute);
      expect(r.path[0]).toEqual(nodes[0]);
      expect(r.path.at(-1)).toEqual(nodes[4]);
      expect(r.frontierOrder).toHaveLength(r.visitedOrder.length);
    }
  });
  it('todos os deslocamentos do modelo correspondem a uma entrada legal, inclusive portais automáticos', () => {
    const world = makeArenaWorld(42),
      model = createMovementModel(world);
    for (const from of model.graph.vertices)
      for (const edge of model.graph.neighbors(from)) {
        const entry = model.entries.get(transitionKey(from, edge.node))!;
        expect(
          Math.abs(from[0] - entry[0]) + Math.abs(from[1] - entry[1]),
        ).toBe(1);
        expect(world.graph.hasEdge(from, entry)).toBe(true);
        const pair = world.portalPairs.find((p) =>
          p.some((n) => nodeToKey(n) === nodeToKey(entry)),
        );
        expect(edge.node).toEqual(
          pair ? pair.find((n) => nodeToKey(n) !== nodeToKey(entry)) : entry,
        );
      }
  });
  it('A* e Dijkstra concordam em custo no movimento real de 30 mapas distintos', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const world = makeArenaWorld(seed),
        model = createMovementModel(world);
      const a = aStar(model.graph, world.start, world.goal),
        d = dijkstra(model.graph, world.start, world.goal);
      expect(a.found).toBe(d.found);
      expect(a.cost).toBeCloseTo(d.cost, 8);
    }
  });
  it('fantasmas respeitam arestas, evitam reversão gratuita e projetam por corredores reais', () => {
    const world = makeArenaWorld(1234),
      g = createMovementModel(world).graph;
    for (const position of g.vertices.slice(0, 40)) {
      const previous = g.neighbors(position)[0]?.node;
      for (const frightened of [false, true]) {
        const r = planGhost(g, {
          position,
          previous,
          player: world.start,
          facing: [0, 1],
          index: 1,
          time: 6000,
          frightened,
          rows: 25,
          cols: 25,
        });
        if (r.path[1]) {
          expect(g.hasEdge(position, r.path[1])).toBe(true);
          if (!frightened && g.neighbors(position).length > 1)
            expect(r.path[1]).not.toEqual(previous);
        }
      }
      expect(
        g.vertexKeys.has(nodeToKey(projectPlayer(g, position, [0, 1]))),
      ).toBe(true);
    }
  });
  it('o piloto não planeja um passo de lava fatal e a avaliação de ameaça considera o grafo', () => {
    const world = makeArenaWorld(42),
      model = createMovementModel(world);
    const lavaEdge = model.graph.vertices
      .flatMap((from) =>
        model.graph
          .neighbors(from)
          .map((edge) => ({
            from,
            edge,
            entry: model.entries.get(transitionKey(from, edge.node))!,
          })),
      )
      .find(
        ({ entry }) =>
          world.terrains.get(nodeToKey(entry)) === TerrainType.LAVA,
      )!;
    const result = planPacmanRoute(world, model, {
      position: lavaEdge.from,
      keys: new Set(),
      dots: new Set(),
      pellets: new Set(),
      enemies: [],
      health: 10,
      powered: false,
      collectAll: false,
      tactic: 'safe',
      algorithm: 'A*',
    });
    for (let i = 1; i < result.path.length; i++) {
      const entry = model.entries.get(
        transitionKey(result.path[i - 1], result.path[i]),
      )!;
      expect(world.terrains.get(nodeToKey(entry))).not.toBe(TerrainType.LAVA);
    }
    const g = new Graph();
    g.addEdge([0, 0], [100, 100], 0.3, false);
    expect(distanceField(g, [[0, 0]]).get('100,100')).toBe(0.3);
  });
});


describe('Planejamento com fantasmas em todas as táticas', () => {
  it('o risco segue portais e arestas dirigidas, sem atravessar paredes', () => {
    const world = makeArenaWorld(42);
    const graph = new Graph();
    graph.addEdge([1, 1], [20, 20], 0.3, false);
    graph.addVertex([1, 2]);
    const movement = { graph, entries: new Map() };
    const danger = buildThreatModel(world, movement, [1, 2], [[1, 1]]);
    expect(danger.distances.get('20,20')).toBe(0.3);
    expect(danger.distances.has('1,2')).toBe(false);
    expect(danger.graph.getEdgeWeight([1, 1], [20, 20])).toBeGreaterThan(0.3);
    expect(buildThreatModel(world, movement, [1, 2], []).graph).toBe(graph);
    const pellet = buildThreatModel(world, movement, [1, 2], [[1, 1]], {
      pellets: new Set(['20,20']),
    });
    expect(pellet.graph.getEdgeWeight([1, 1], [20, 20])).toBe(0.3);
  });
  function forkWorld() {
    const world = makeArenaWorld(42);
    const graph = new Graph();
    for (const row of [1, 2]) for (let col = 1; col <= 5; col++) {
      graph.addVertex([row, col]);
      if (col > 1) graph.addEdge([row, col - 1], [row, col], 1);
    }
    graph.addEdge([1, 1], [2, 1], 1);
    graph.addEdge([1, 5], [2, 5], 1);
    return { ...world, graph, start: [1, 1] as Node, goal: [1, 5] as Node,
      keys: [], powerPellets: [], portalPairs: [], terrains: new Map() };
  }
  for (const tactic of ['fast', 'collector', 'safe'] as const)
    for (const algorithm of ['Dijkstra', 'A*'] as const)
      it(tactic + ' / ' + algorithm + ' desvia do fantasma e volta à rota curta sob poder', () => {
        const world = forkWorld(), movement = createMovementModel(world);
        const context = { position: world.start, keys: new Set<string>(),
          dots: new Set<string>(), pellets: new Set<string>(), enemies: [[1, 3] as Node],
          health: 100, powered: false, collectAll: false, tactic, algorithm };
        const danger = planPacmanRoute(world, movement, context);
        const powered = planPacmanRoute(world, movement, { ...context, powered: true });
        expect(danger.found).toBe(true);
        expect(danger.path[1]).toEqual([2, 1]);
        expect(danger.path).not.toContainEqual([1, 3]);
        expect(powered.path[1]).toEqual([1, 2]);
        expect(powered.cost).toBe(4);
        expect(movement.graph.getEdgeWeight([1, 2], [1, 3])).toBe(1);
      });
});
