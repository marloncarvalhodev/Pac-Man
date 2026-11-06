import { Graph } from '../graph/Graph';
import { nodeToKey, type Node } from '../graph/GraphTypes';
import type { WorldData } from '../graph/MazeGenerator';
export interface MovementModel {
  graph: Graph;
  entries: Map<string, Node>;
}
export const transitionKey = (from: Node, to: Node) =>
  `${nodeToKey(from)}>${nodeToKey(to)}`;
/** One edge is one legal orthogonal input, including automatic teleport on entry. */
export function createMovementModel(world: WorldData): MovementModel {
  const graph = new Graph(),
    entries = new Map<string, Node>(),
    portals = new Map<string, Node>();
  for (const [a, b] of world.portalPairs) {
    portals.set(nodeToKey(a), b);
    portals.set(nodeToKey(b), a);
  }
  for (const node of world.graph.vertices) {
    graph.addVertex(node);
    for (const edge of world.graph.neighbors(node)) {
      if (
        Math.abs(node[0] - edge.node[0]) + Math.abs(node[1] - edge.node[1]) !==
        1
      )
        continue;
      const destination = portals.get(nodeToKey(edge.node)) ?? edge.node;
      const existing = graph.getEdgeWeight(node, destination);
      if (existing !== undefined && existing <= edge.weight) continue;
      graph.addEdge(node, destination, edge.weight, false);
      entries.set(transitionKey(node, destination), edge.node);
    }
  }
  return { graph, entries };
}
