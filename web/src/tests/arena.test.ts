import { describe, expect, it } from 'vitest';
import { Graph } from '../game/graph/Graph';
import type { Node } from '../game/graph/GraphTypes';
import { TerrainType } from '../game/graph/Terrain';
import type { WorldData } from '../game/graph/MazeGenerator';
import {
  getArenaDots,
  makeArenaWorld,
  simulateAgent,
} from '../game/arena/simulation';
import {
  completeRounds,
  rankResults,
  readArenaHistory,
  sameRank,
} from '../game/arena/ranking';
import type { ArenaAgent } from '../game/arena/types';

const agent: ArenaAgent = {
  id: 'A',
  name: 'Máquina A',
  algorithm: 'Dijkstra',
  tactic: 'fast',
};
function corridor(): WorldData {
  const graph = new Graph();
  const nodes: Node[] = [
    [1, 1],
    [1, 2],
    [1, 3],
    [1, 4],
    [1, 5],
  ];
  nodes.forEach((node, i) => {
    graph.addVertex(node);
    if (i) graph.addEdge(nodes[i - 1], node, 1);
  });
  return {
    graph,
    rows: 3,
    cols: 7,
    grid: [
      [1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1],
    ],
    start: nodes[0],
    goal: nodes[4],
    keys: [nodes[2]],
    powerPellets: [nodes[1]],
    enemySpawn: nodes[4],
    enemySpawn2: nodes[4],
    portalPairs: [],
    terrains: new Map(nodes.map((n) => [n.join(','), TerrainType.NORMAL])),
    seed: 42,
  };
}
const options = { objective: 'exit' as const, ghosts: false };
describe('Arena: regras e comparação reprodutível', () => {
  it('coleta pontos, chave e poder, respeita custos de movimento e bônus de conclusão', () => {
    const world = corridor();
    const result = simulateAgent(world, agent, options, 'batch', 1, true);
    expect(result.status).toBe('COMPLETED');
    expect(result.keysCollected).toBe(1);
    expect(result.dotsCollected).toBe(1);
    expect(result.score).toBe(660); // 50 poder + 100 chave + 10 ponto + 500 saída
    expect(result.elapsedMs).toBe(420); // intervalos de 135ms quantizados em passos de 20ms
    expect(result.moves).toBe(4);
    expect(result.frames?.at(-1)?.score).toBe(result.score);
    expect(getArenaDots(world).size).toBe(1);
  });
  it('mantém os mundos intactos e produz trajetórias idênticas para execuções iguais', () => {
    const world = makeArenaWorld(42),
      before = JSON.stringify([
        world.grid,
        [...world.terrains],
        world.keys,
        world.portalPairs,
      ]);
    const first = simulateAgent(
      world,
      agent,
      { ...options, ghosts: true },
      'batch',
      1,
      true,
    );
    const second = simulateAgent(
      world,
      agent,
      { ...options, ghosts: true },
      'batch',
      2,
      true,
    );
    expect(first.frames).toEqual(second.frames);
    expect(first.score).toBe(second.score);
    expect(first.elapsedMs).toBe(second.elapsedMs);
    expect(
      JSON.stringify([
        world.grid,
        [...world.terrains],
        world.keys,
        world.portalPairs,
      ]),
    ).toBe(before);
  });
  it('compara algoritmos no mesmo objetivo e exige todos os pontos na modalidade de coleta', () => {
    const world = makeArenaWorld(1234);
    for (const algorithm of ['Dijkstra', 'A*'] as const) {
      const result = simulateAgent(
        world,
        { ...agent, algorithm, tactic: 'collector' },
        { ...options, objective: 'dots' },
        'batch',
        1,
      );
      expect(result.status).toBe('COMPLETED');
      expect(result.dotsCollected).toBe(result.totalDots);
      expect(result.keysCollected).toBe(result.totalKeys);
      expect(result.searchMs).toBeGreaterThanOrEqual(0);
      expect(result.nodesExpanded).toBeGreaterThan(0);
    }
  });
  it('encerra buscas impossíveis, lava fatal e limite de tempo sem declarar vitória', () => {
    const disconnected = corridor();
    disconnected.graph = new Graph();
    disconnected.graph.addVertex(disconnected.start);
    expect(simulateAgent(disconnected, agent, options, 'b', 1).status).toBe(
      'BLOCKED',
    );
    expect(
      simulateAgent(corridor(), agent, options, 'b', 1, false, 0).status,
    ).toBe('TIMEOUT');
    const lava = corridor();
    // Goal cannot be reached without revisiting lava to collect the key on the far side.
    lava.terrains.set('1,2', TerrainType.LAVA);
    const result = simulateAgent(lava, agent, options, 'b', 1);
    expect(result.health).toBe(90);
  });
  it('detecta captura e dá pontuação ao comer fantasmas sob poder', () => {
    const caught = corridor();
    caught.enemySpawn = caught.enemySpawn2 = [1, 2];
    caught.powerPellets = [];
    expect(
      simulateAgent(caught, agent, { ...options, ghosts: true }, 'b', 1).status,
    ).toBe('CAUGHT');
    const powered = corridor();
    powered.enemySpawn = powered.enemySpawn2 = [1, 2];
    const result = simulateAgent(
      powered,
      agent,
      { ...options, ghosts: true },
      'b',
      1,
    );
    expect(result.score).toBeGreaterThanOrEqual(400);
    expect(result.status).toBe('COMPLETED');
  });
  it('reavalia a rota a cada movimento com fantasmas, inclusive na tática rápida', () => {
    const result = simulateAgent(corridor(), agent, { ...options, ghosts: true }, 'b', 1);
    expect(result.status).toBe('COMPLETED');
    expect(result.searches).toBe(result.moves);
    expect(result.searches).toBeGreaterThan(1);
    expect(result.modelVersion).toBe(3);
  });
  it('nunca recompensa captura precoce como o menor tempo e admite empate', () => {
    const winner = simulateAgent(corridor(), agent, options, 'b', 1);
    const loser = {
      ...winner,
      id: 'loser',
      agent: { ...agent, id: 'B', algorithm: 'A*' as const },
      status: 'CAUGHT' as const,
      elapsedMs: 20,
      score: 1000,
    };
    expect(rankResults([winner, loser], 'time')[0].algorithm).toBe('Dijkstra');
    expect(rankResults([winner, loser], 'score')[0].algorithm).toBe('A*');
    const tied = rankResults(
      [winner, { ...winner, agent: loser.agent }],
      'time',
    );
    expect(sameRank(tied[0], tied[1], 'time')).toBe(true);
  });
  it('exclui rodadas interrompidas e recupera histórico inválido com segurança', () => {
    const a = simulateAgent(corridor(), agent, options, 'b', 1);
    const b = { ...a, id: 'b', agent: { ...agent, id: 'B' } };
    expect(completeRounds([a])).toEqual([]);
    expect(completeRounds([a, b])).toHaveLength(2);
    expect(readArenaHistory({ getItem: () => '{broken' })).toEqual([]);
    expect(
      readArenaHistory({
        getItem: () => JSON.stringify([a, { score: 'fake' }]),
      }),
    ).toHaveLength(1);
    expect(
      readArenaHistory({
        getItem: () => {
          throw Error('denied');
        },
      }),
    ).toEqual([]);
  });
});
