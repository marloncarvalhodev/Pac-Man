import { Graph } from '../graph/Graph';
import { nodeToKey, keyToNode, type Node } from '../graph/GraphTypes';
import { PriorityQueue } from './PriorityQueue';
import type { HeuristicFunction, PathfindingResult } from './PathfindingTypes';

interface Geometry {
  revision: number;
  minWeight: number;
  shortcuts: { from: Node; to: Node; weight: number }[];
}
const geometry = new WeakMap<Graph, Geometry>();
const manhattan = (a: Node, b: Node) =>
  Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
function graphGeometry(graph: Graph): Geometry {
  const cached = geometry.get(graph);
  if (cached?.revision === graph.revision) return cached;
  let minWeight = Infinity;
  const shortcuts: Geometry['shortcuts'] = [];
  for (const from of graph.vertices)
    for (const edge of graph.neighbors(from)) {
      minWeight = Math.min(minWeight, edge.weight);
      if (manhattan(from, edge.node) > 1)
        shortcuts.push({ from, to: edge.node, weight: edge.weight });
    }
  const value = {
    revision: graph.revision,
    minWeight: Number.isFinite(minWeight) ? minWeight : 0,
    shortcuts,
  };
  geometry.set(graph, value);
  return value;
}
/** Relaxed grid with every directed shortcut: portal chains remain admissible. */
export function makeGraphHeuristic(
  graph: Graph,
  goals: Node[],
  requestedWeight?: number,
): (node: Node) => number {
  const data = graphGeometry(graph);
  const weight = Math.max(
    0,
    Math.min(data.minWeight, requestedWeight ?? data.minWeight),
  );
  const endpoints = [
    ...new Map(
      data.shortcuts.flatMap((e) => [
        [nodeToKey(e.from), e.from] as const,
        [nodeToKey(e.to), e.to] as const,
      ]),
    ).values(),
  ];
  if (endpoints.length > 32) {
    const ratio = data.shortcuts.reduce(
      (value, e) => Math.min(value, e.weight / manhattan(e.from, e.to)),
      weight,
    );
    return (node) =>
      Math.min(...goals.map((goal) => ratio * manhattan(node, goal)));
  }
  const distances = endpoints.map((a) =>
    endpoints.map((b) => weight * manhattan(a, b)),
  );
  const indices = new Map(endpoints.map((node, i) => [nodeToKey(node), i]));
  for (const edge of data.shortcuts) {
    const i = indices.get(nodeToKey(edge.from))!,
      j = indices.get(nodeToKey(edge.to))!;
    distances[i][j] = Math.min(distances[i][j], edge.weight);
  }
  for (let k = 0; k < endpoints.length; k++)
    for (let i = 0; i < endpoints.length; i++)
      for (let j = 0; j < endpoints.length; j++)
        distances[i][j] = Math.min(
          distances[i][j],
          distances[i][k] + distances[k][j],
        );
  const remaining = endpoints.map((_, i) =>
    Math.min(
      ...goals.flatMap((goal) =>
        endpoints.map(
          (end, j) => distances[i][j] + weight * manhattan(end, goal),
        ),
      ),
    ),
  );
  const cache = new Map<string, number>();
  return (node) => {
    const key = nodeToKey(node),
      found = cache.get(key);
    if (found !== undefined) return found;
    let value = Math.min(
      ...goals.map((goal) => weight * manhattan(node, goal)),
    );
    endpoints.forEach((end, i) => {
      value = Math.min(value, weight * manhattan(node, end) + remaining[i]);
    });
    cache.set(key, value);
    return value;
  };
}
export interface SearchOptions {
  heuristic?: HeuristicFunction;
  minWeight?: number;
  recordFrontier?: boolean;
}
export function searchGraph(
  graph: Graph,
  start: Node,
  goals: Node[],
  algorithm: 'Dijkstra' | 'A*',
  options: SearchOptions = {},
): PathfindingResult {
  const began = performance.now(),
    vertices = graph.vertexKeys,
    startKey = nodeToKey(start);
  const targets = goals.filter((goal) => vertices.has(nodeToKey(goal))),
    targetKeys = new Set(targets.map(nodeToKey));
  const visitedOrder: Node[] = [],
    frontierOrder: Node[][] | undefined = options.recordFrontier
      ? []
      : undefined;
  let frontierPeak = 0,
    relaxations = 0,
    reopened = 0,
    reached: string | undefined;
  const distances = new Map<string, number>(),
    parents = new Map<string, string>(),
    closed = new Set<string>(),
    open = new Set<string>();
  const result = (): PathfindingResult => {
    const path: Node[] = [];
    if (reached !== undefined) {
      let key: string | undefined = reached;
      while (key !== undefined) {
        path.push(keyToNode(key));
        key = parents.get(key);
      }
      path.reverse();
    }
    return {
      path,
      cost: reached === undefined ? Infinity : distances.get(reached)!,
      found: reached !== undefined,
      visitedOrder,
      nodesExpanded: visitedOrder.length,
      executionTimeMs: performance.now() - began,
      algorithmName: algorithm,
      frontierPeak,
      relaxations,
      reopened,
      ...(frontierOrder ? { frontierOrder } : {}),
    };
  };
  if (!vertices.has(startKey) || !targets.length) return result();
  const automatic =
    algorithm === 'A*' && !options.heuristic
      ? makeGraphHeuristic(graph, targets, options.minWeight)
      : () => 0;
  const heuristic = (node: Node) =>
    options.heuristic && algorithm === 'A*'
      ? Math.max(
          0,
          Math.min(...targets.map((goal) => options.heuristic!(node, goal))),
        )
      : automatic(node);
  const queue = new PriorityQueue<{ key: string; g: number }>();
  distances.set(startKey, 0);
  open.add(startKey);
  queue.enqueue({ key: startKey, g: 0 }, heuristic(start));
  frontierPeak = 1;
  while (!queue.isEmpty()) {
    const current = queue.dequeue()!;
    if (current.g !== distances.get(current.key) || closed.has(current.key))
      continue;
    open.delete(current.key);
    closed.add(current.key);
    visitedOrder.push(keyToNode(current.key));
    if (targetKeys.has(current.key)) {
      reached = current.key;
      frontierOrder?.push([...open].map(keyToNode));
      break;
    }
    for (const edge of graph.neighbors(keyToNode(current.key))) {
      const key = nodeToKey(edge.node),
        g = current.g + edge.weight;
      if (g >= (distances.get(key) ?? Infinity)) continue;
      if (closed.delete(key)) reopened++;
      distances.set(key, g);
      parents.set(key, current.key);
      open.add(key);
      relaxations++;
      queue.enqueue({ key, g }, g + heuristic(edge.node));
    }
    frontierPeak = Math.max(frontierPeak, open.size);
    frontierOrder?.push([...open].map(keyToNode));
  }
  return result();
}
export const searchNearestTarget = searchGraph;
