import type { Graph } from '../graph/Graph';
import { nodeToKey, nodeEquals, type Node } from '../graph/GraphTypes';
import { aStar } from '../algorithms/AStar';
import { PriorityQueue } from '../algorithms/PriorityQueue';

export function distanceField(
  graph: Graph,
  sources: Node[],
): Map<string, number> {
  const distances = new Map<string, number>(),
    queue = new PriorityQueue<{ node: Node; cost: number }>();
  for (const node of sources) {
    distances.set(nodeToKey(node), 0);
    queue.enqueue({ node, cost: 0 }, 0);
  }
  while (!queue.isEmpty()) {
    const entry = queue.dequeue()!;
    if (entry.cost !== distances.get(nodeToKey(entry.node))) continue;
    for (const edge of graph.neighbors(entry.node)) {
      const key = nodeToKey(edge.node),
        cost = entry.cost + edge.weight;
      if (cost < (distances.get(key) ?? Infinity)) {
        distances.set(key, cost);
        queue.enqueue({ node: edge.node, cost }, cost);
      }
    }
  }
  return distances;
}
export function projectPlayer(
  graph: Graph,
  player: Node,
  facing: [number, number],
  steps = 4,
): Node {
  let current = player,
    previous: Node | undefined;
  for (let i = 0; i < steps; i++) {
    const edges = graph
      .neighbors(current)
      .filter((e) => !previous || !nodeEquals(e.node, previous));
    if (!edges.length) break;
    const straight = edges.find(
      (e) =>
        e.node[0] === current[0] + facing[0] &&
        e.node[1] === current[1] + facing[1],
    );
    const next =
      straight?.node ?? (edges.length === 1 ? edges[0].node : undefined);
    if (!next) break;
    previous = current;
    current = next;
  }
  return current;
}
export interface GhostContext {
  position: Node;
  previous?: Node;
  player: Node;
  facing: [number, number];
  teammate?: Node;
  index: number;
  time: number;
  frightened: boolean;
  rows: number;
  cols: number;
}
export function planGhost(
  graph: Graph,
  context: GhostContext,
): { path: Node[]; target: Node; mode: 'scatter' | 'chase' | 'frightened' } {
  const { position, player, previous, teammate } = context;
  const all = graph.neighbors(position);
  let legal = context.frightened
    ? all
    : all.filter((e) => !previous || !nodeEquals(e.node, previous));
  if (!legal.length) legal = all;
  const unreserved = legal.filter(
    (e) => !teammate || !nodeEquals(e.node, teammate),
  );
  if (unreserved.length) legal = unreserved;
  if (context.frightened) {
    const danger = distanceField(graph, [player]);
    const next = [...legal].sort(
      (a, b) =>
        (danger.get(nodeToKey(b.node)) ?? Infinity) -
        (danger.get(nodeToKey(a.node)) ?? Infinity),
    )[0]?.node;
    return {
      path: next ? [position, next] : [position],
      target: next ?? position,
      mode: 'frightened',
    };
  }
  const scatter = context.time % 24000 < 4000;
  const corner: Node =
    context.index === 0 ? [1, context.cols - 2] : [context.rows - 2, 1];
  let target = scatter
    ? graph.vertices.reduce(
        (best, node) =>
          Math.abs(node[0] - corner[0]) + Math.abs(node[1] - corner[1]) <
          Math.abs(best[0] - corner[0]) + Math.abs(best[1] - corner[1])
            ? node
            : best,
        position,
      )
    : context.index === 0
      ? player
      : projectPlayer(graph, player, context.facing);
  if (nodeEquals(target, position) && !scatter) target = player;
  const direct = aStar(graph, position, target);
  if (direct.path[1] && legal.some((e) => nodeEquals(e.node, direct.path[1])))
    return { path: direct.path, target, mode: scatter ? 'scatter' : 'chase' };
  let path: Node[] = [position],
    best = Infinity;
  for (const edge of legal) {
    const result = aStar(graph, edge.node, target);
    if (result.found && edge.weight + result.cost < best) {
      best = edge.weight + result.cost;
      path = [position, ...result.path];
    }
  }
  return { path, target, mode: scatter ? 'scatter' : 'chase' };
}
