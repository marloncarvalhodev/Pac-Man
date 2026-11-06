import { Graph } from '../graph/Graph';
import { nodeToKey, type Node } from '../graph/GraphTypes';
import type { WorldData } from '../graph/MazeGenerator';
import { distanceField, planGhost } from './GhostAI';
import { transitionKey, type MovementModel } from './MovementModel';

/** A snapshot of danger, shared by the live planner and laboratory comparisons.
 * Distances follow directed movement edges, including automatic portals.
 * This is a risk estimate, not a guarantee against a moving adversary.
 */
export function buildThreatModel(
  world: WorldData,
  movement: MovementModel,
  player: Node,
  enemies: Node[],
  options: { time?: number; facing?: [number, number]; caution?: number;
    previous?: (Node | undefined)[]; pellets?: Set<string> } = {},
): { graph: Graph; distances: Map<string, number>; risk: Map<string, number> } {
  if (!enemies.length)
    return { graph: movement.graph, distances: new Map(), risk: new Map() };
  const projected = enemies.flatMap((position, index) => {
    const decision = planGhost(movement.graph, {
      position, previous: options.previous?.[index], player,
      facing: options.facing ?? [0, 1], teammate: enemies[1 - index],
      index, time: options.time ?? 0, frightened: false,
      rows: world.rows, cols: world.cols,
    });
    return decision.path.slice(1, 3);
  });
  const distances = distanceField(movement.graph, enemies);
  const predicted = distanceField(movement.graph, projected);
  const occupied = new Set(enemies.map(nodeToKey));
  const risk = new Map<string, number>();
  const graph = new Graph();
  for (const node of movement.graph.vertices) {
    const key = nodeToKey(node);
    risk.set(key, occupied.has(key) ? 1000 :
      Math.max(0, 5 - (distances.get(key) ?? Infinity)) * 8 +
      Math.max(0, 3 - (predicted.get(key) ?? Infinity)) * 4);
    graph.addVertex(node);
  }
  for (const from of movement.graph.vertices) {
    for (const edge of movement.graph.neighbors(from)) {
      const entry = movement.entries.get(transitionKey(from, edge.node)) ?? edge.node;
      // Entering a power pellet grants protection before collision is resolved.
      const penalty = options.pellets?.has(nodeToKey(edge.node)) ? 0 :
        Math.max(risk.get(nodeToKey(entry)) ?? 0, risk.get(nodeToKey(edge.node)) ?? 0);
      graph.addEdge(from, edge.node, edge.weight + penalty * (options.caution ?? 1), false);
    }
  }
  return { graph, distances, risk };
}
