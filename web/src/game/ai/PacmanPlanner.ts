import { Graph } from '../graph/Graph';
import {
  nodeToKey,
  nodeEquals,
  keyToNode,
  type Node,
} from '../graph/GraphTypes';
import type { WorldData } from '../graph/MazeGenerator';
import { TerrainType } from '../graph/Terrain';
import { searchNearestTarget } from '../algorithms/SearchEngine';
import { solveMultiGoal } from '../algorithms/MultiGoalSolver';
import type { PathfindingResult } from '../algorithms/PathfindingTypes';
import { buildThreatModel } from './ThreatModel';
import { transitionKey, type MovementModel } from './MovementModel';

export interface PlannerContext {
  position: Node;
  time?: number;
  facing?: [number, number];
  previous?: Node;
  keys: Set<string>;
  dots: Set<string>;
  pellets: Set<string>;
  enemies: Node[];
  enemyPrevious?: (Node | undefined)[];
  health: number;
  powered: boolean;
  collectAll: boolean;
  tactic: 'fast' | 'collector' | 'safe';
  algorithm: 'Dijkstra' | 'A*';
}
export function planPacmanRoute(
  world: WorldData,
  movement: MovementModel,
  context: PlannerContext,
): PathfindingResult {
  const { position, tactic } = context;
  const threat = context.powered ? [] : context.enemies;
  const threatModel = buildThreatModel(world, movement, position, threat, {
    time: context.time, facing: context.facing,
    previous: context.enemyPrevious, pellets: context.pellets,
    caution: tactic === 'safe' ? 2 : tactic === 'collector' ? 1 : 0.6,
  });
  const distances = threatModel.distances;
  let graph = threatModel.graph;
  if (tactic === 'safe' || context.health <= 10) {
    graph = new Graph();
    for (const from of movement.graph.vertices) {
      graph.addVertex(from);
      for (const edge of threatModel.graph.neighbors(from)) {
        const entry =
          movement.entries.get(transitionKey(from, edge.node)) ?? edge.node;
        const lava = world.terrains.get(nodeToKey(entry)) === TerrainType.LAVA;
        if (lava && context.health <= 10) continue;
        const risk = threatModel.risk.get(nodeToKey(edge.node)) ?? 0;
        const reversal =
          context.previous &&
          nodeEquals(from, position) &&
          nodeEquals(edge.node, context.previous)
            ? 2
            : 0;
        const deadEnd =
          tactic === 'safe' &&
          risk > 0 &&
          movement.graph.outDegree(edge.node) <= 1
            ? 20
            : 0;
        graph.addEdge(
          from,
          edge.node,
          edge.weight +
            (tactic === 'safe' && lava ? 30 : 0) +
            reversal +
            deadEnd,
          false,
        );
      }
    }
  }
  const missingKeys = world.keys.filter((k) => !context.keys.has(nodeToKey(k)));
  const needsDots = context.collectAll || tactic === 'collector';
  const closeDanger = (distances.get(nodeToKey(position)) ?? Infinity) <= 7;
  if (closeDanger && context.pellets.size) {
    const power = searchNearestTarget(
      graph,
      position,
      [...context.pellets].map(keyToNode),
      context.algorithm,
    );
    if (power.found) return power;
  }
  if (
    needsDots &&
    context.dots.size &&
    (tactic !== 'safe' || !missingKeys.length)
  )
    return searchNearestTarget(
      graph,
      position,
      [...context.dots].map(keyToNode),
      context.algorithm,
    );
  if (missingKeys.length)
    return solveMultiGoal(graph, position, missingKeys, world.goal, {
      algorithm: context.algorithm,
    });
  if (needsDots && context.dots.size)
    return searchNearestTarget(
      graph,
      position,
      [...context.dots].map(keyToNode),
      context.algorithm,
    );
  return searchNearestTarget(graph, position, [world.goal], context.algorithm);
}
