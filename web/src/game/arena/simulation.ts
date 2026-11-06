import { createMovementModel, transitionKey } from '../ai/MovementModel';
import { planPacmanRoute } from '../ai/PacmanPlanner';
import { planGhost } from '../ai/GhostAI';
import { MazeGenerator, type WorldData } from '../graph/MazeGenerator';
import { nodeToKey, nodeEquals, type Node } from '../graph/GraphTypes';
import { TerrainType } from '../graph/Terrain';
import type {
  ArenaAgent,
  ArenaConfig,
  ArenaFrame,
  ArenaResult,
  ArenaStatus,
} from './types';

export const ARENA_LIMIT_MS = 180_000;
export const ARENA_TICK_MS = 20;

export function getArenaDots(world: WorldData): Set<string> {
  const reserved = new Set(
    [
      world.start,
      world.goal,
      ...world.keys,
      ...world.powerPellets,
      ...world.portalPairs.flat(),
    ].map(nodeToKey),
  );
  return new Set(
    world.graph.vertices
      .filter(
        (v) =>
          !reserved.has(nodeToKey(v)) &&
          world.terrains.get(nodeToKey(v)) === TerrainType.NORMAL,
      )
      .map(nodeToKey),
  );
}

/** Deterministic simulation using the shared automatic-portal movement model. */
export function simulateAgent(
  world: WorldData,
  agent: ArenaAgent,
  config: Pick<ArenaConfig, 'objective' | 'ghosts'>,
  batchId: string,
  round: number,
  capture = false,
  limitMs = ARENA_LIMIT_MS,
): ArenaResult {
  const movement = createMovementModel(world),
    navigation = movement.graph;
  let previousPlayer: Node | undefined;
  let player: Node = [...world.start],
    facing: [number, number] = [0, 1];
  const dots = getArenaDots(world),
    totalDots = dots.size;
  const keys = new Set<string>(),
    pellets = new Set(world.powerPellets.map(nodeToKey));
  const enemies = [world.enemySpawn, world.enemySpawn2].map((spawn) => ({
    pos: [...spawn] as Node,
    spawn,
    nextMove: 0,
    previous: undefined as Node | undefined,
    respawnUntil: 0,
  }));
  let score = 0,
    health = 100,
    poweredUntil = -1,
    nextMove = 0,
    moves = 0;
  let elapsedMs = 0,
    searchMs = 0,
    searches = 0,
    nodesExpanded = 0;
  let status: ArenaStatus | undefined;
  let route: Node[] = [];
  const frames: ArenaFrame[] = [];
  const snapshot = (time: number) => {
    if (capture)
      frames.push({
        timeMs: time,
        player: [...player],
        facing: [...facing],
        enemies: config.ghosts ? enemies.map((e) => [...e.pos] as Node) : [],
        score,
        health,
        keys: keys.size,
        dots: totalDots - dots.size,
        powered: time < poweredUntil,
      });
  };
  const collision = (time: number) => {
    if (!config.ghosts) return;
    for (const enemy of enemies)
      if (time >= enemy.respawnUntil && nodeEquals(enemy.pos, player)) {
        if (time < poweredUntil) {
          enemy.pos = [...enemy.spawn];
          enemy.previous = undefined;
          enemy.respawnUntil = time + 600;
          score += 200;
        } else {
          status = 'CAUGHT';
          break;
        }
      }
  };
  const plan = (time: number): Node[] => {
    const result = planPacmanRoute(world, movement, {
      position: player,
      time,
      facing,
      previous: previousPlayer,
      keys,
      dots,
      pellets,
      enemies: config.ghosts
        ? enemies.filter((e) => time >= e.respawnUntil).map((e) => e.pos)
        : [],
      enemyPrevious: config.ghosts
        ? enemies.filter((e) => time >= e.respawnUntil).map((e) => e.previous)
        : [],
      health,
      powered: time < poweredUntil,
      collectAll: config.objective === 'dots',
      tactic: agent.tactic,
      algorithm: agent.algorithm,
    });
    searchMs += result.executionTimeMs;
    searches++;
    nodesExpanded += result.nodesExpanded;
    return result.path.slice(1);
  };
  snapshot(0);
  for (let time = 0; time <= limitMs; time += ARENA_TICK_MS) {
    elapsedMs = time;
    let changed = false;
    if (time >= nextMove) {
      if (!route.length || config.ghosts || agent.tactic === 'safe' || health <= 10)
        route = plan(time);
      const next = route.shift();
      if (!next || !navigation.hasEdge(player, next)) {
        status = 'BLOCKED';
        break;
      }
      const weight = navigation.getEdgeWeight(player, next)!;
      const entered = movement.entries.get(transitionKey(player, next)) ?? next;
      facing = [
        Math.sign(entered[0] - player[0]),
        Math.sign(entered[1] - player[1]),
      ];
      previousPlayer = player;
      player = next;
      moves++;
      changed = true;
      const key = nodeToKey(player);
      if (dots.delete(key)) score += 10;
      if (world.keys.some((k) => nodeEquals(k, player)) && !keys.has(key)) {
        keys.add(key);
        score += 100;
      }
      if (pellets.delete(key)) {
        score += 50;
        poweredUntil = time + 7000;
      }
      if (world.terrains.get(nodeToKey(entered)) === TerrainType.LAVA) {
        health = Math.max(0, health - 10);
        if (!health) status = 'LAVA';
      }
      nextMove = time + Math.floor(135 * weight);
      if (!status) collision(time);
      if (
        !status &&
        nodeEquals(player, world.goal) &&
        keys.size === world.keys.length &&
        (config.objective !== 'dots' || !dots.size)
      ) {
        status = 'COMPLETED';
        score += 500;
      }
    }
    if (!status && config.ghosts)
      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        if (time < enemy.nextMove) continue;
        if (time < enemy.respawnUntil) continue;
        const frightened = time < poweredUntil;
        const decision = planGhost(navigation, {
          position: enemy.pos,
          previous: enemy.previous,
          player,
          facing,
          teammate: enemies[1 - i].pos,
          index: i,
          time,
          frightened,
          rows: world.rows,
          cols: world.cols,
        });
        const next = decision.path[1];
        if (next) {
          const weight = navigation.getEdgeWeight(enemy.pos, next)!;
          enemy.previous = enemy.pos;
          enemy.pos = next;
          enemy.nextMove =
            time + Math.floor(340 * weight * (frightened ? 1.3 : 1));
          changed = true;
        } else enemy.nextMove = time + 340;
      }
    if (!status) collision(time);
    if (changed || status) snapshot(time);
    if (status) break;
  }
  status ??= 'TIMEOUT';
  if (!frames.length || frames[frames.length - 1].timeMs !== elapsedMs)
    snapshot(elapsedMs);
  return {
    id: `${batchId}-${round}-${agent.id}`,
    batchId,
    round,
    seed: world.seed,
    fieldSize: 2,
    modelVersion: 3,
    agent,
    objective: config.objective,
    ghosts: config.ghosts,
    status,
    score,
    elapsedMs,
    searchMs,
    nodesExpanded,
    searches,
    dotsCollected: totalDots - dots.size,
    totalDots,
    keysCollected: keys.size,
    totalKeys: world.keys.length,
    health,
    moves,
    ...(capture ? { frames } : {}),
  };
}

export function makeArenaWorld(seed: number): WorldData {
  return new MazeGenerator(25, 25, seed).generateWorld(0.1, 1, 2);
}
