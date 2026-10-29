/**
 * Algoritmo A* (A-Star) Ponderado com Heurística Admissível.
 * Avaliação: f(n) = g(n) + h(n)
 * Complexidade: O((|V| + |E|) log |V|)
 */

import { Graph } from '../graph/Graph';
import { Node, NodeKey, nodeToKey, keyToNode } from '../graph/GraphTypes';
import { PathfindingResult, HeuristicFunction } from './PathfindingTypes';
import { PriorityQueue } from './PriorityQueue';
import { weightedManhattan } from './Heuristics';

export interface AStarOptions {
  heuristic?: HeuristicFunction;
  portals?: Array<[Node, Node]>;
  minWeight?: number;
}

export function aStar(
  graph: Graph,
  start: Node,
  goal: Node,
  options: AStarOptions = {}
): PathfindingResult {
  const startTime = performance.now();

  const startKey = nodeToKey(start);
  const goalKey = nodeToKey(goal);

  const minWeight = options.minWeight ?? (options.portals && options.portals.length > 0 ? 0.3 : 1.0);
  const hFn: HeuristicFunction =
    options.heuristic ??
    ((u, v) => weightedManhattan(u, v, minWeight, options.portals));

  const gScore = new Map<NodeKey, number>();
  const fScore = new Map<NodeKey, number>();
  const cameFrom = new Map<NodeKey, NodeKey>();
  const settled = new Set<NodeKey>();
  const visitedOrder: Node[] = [];

  const pq = new PriorityQueue<NodeKey>();

  gScore.set(startKey, 0);
  const initialF = hFn(start, goal);
  fScore.set(startKey, initialF);
  pq.enqueue(startKey, initialF);

  while (!pq.isEmpty()) {
    const currentKey = pq.dequeue()!;

    if (settled.has(currentKey)) continue;
    settled.add(currentKey);
    visitedOrder.push(keyToNode(currentKey));

    if (currentKey === goalKey) {
      break;
    }

    const currentNode = keyToNode(currentKey);
    const currentG = gScore.get(currentKey)!;

    for (const { node: neighbor, weight } of graph.neighbors(currentNode)) {
      const neighborKey = nodeToKey(neighbor);
      const tentativeG = currentG + weight;
      const existingG = gScore.get(neighborKey) ?? Infinity;

      if (tentativeG < existingG) {
        cameFrom.set(neighborKey, currentKey);
        gScore.set(neighborKey, tentativeG);
        const fVal = tentativeG + hFn(neighbor, goal);
        fScore.set(neighborKey, fVal);
        pq.enqueue(neighborKey, fVal);
      }
    }
  }

  const elapsedMs = performance.now() - startTime;

  // Reconstrução do caminho
  const path: Node[] = [];
  let found = false;
  let totalCost = Infinity;

  if (startKey === goalKey) {
    path.push(start);
    found = true;
    totalCost = 0;
  } else if (cameFrom.has(goalKey)) {
    let curr: NodeKey | undefined = goalKey;
    while (curr) {
      path.push(keyToNode(curr));
      curr = cameFrom.get(curr);
    }
    path.reverse();
    found = true;
    totalCost = gScore.get(goalKey) ?? Infinity;
  }

  return {
    path,
    cost: totalCost,
    nodesExpanded: visitedOrder.length,
    visitedOrder,
    executionTimeMs: elapsedMs,
    algorithmName: 'A*',
    found,
  };
}
