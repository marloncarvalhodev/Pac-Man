/**
 * Algoritmo de Dijkstra para Caminhos Mínimos em Grafos Ponderados G = (V, E, w).
 * Exploração uniforme e cega (isotrópica) via Min-Heap binário.
 * Complexidade: O((|V| + |E|) log |V|)
 */

import { Graph } from '../graph/Graph';
import { Node, NodeKey, nodeToKey, keyToNode } from '../graph/GraphTypes';
import { PathfindingResult } from './PathfindingTypes';
import { PriorityQueue } from './PriorityQueue';

export function dijkstra(graph: Graph, start: Node, goal: Node): PathfindingResult {
  const startTime = performance.now();

  const startKey = nodeToKey(start);
  const goalKey = nodeToKey(goal);

  const dist = new Map<NodeKey, number>();
  const cameFrom = new Map<NodeKey, NodeKey>();
  const settled = new Set<NodeKey>();
  const visitedOrder: Node[] = [];

  const pq = new PriorityQueue<NodeKey>();

  dist.set(startKey, 0);
  pq.enqueue(startKey, 0);

  while (!pq.isEmpty()) {
    const currentKey = pq.dequeue()!;

    if (settled.has(currentKey)) continue;
    settled.add(currentKey);
    visitedOrder.push(keyToNode(currentKey));

    if (currentKey === goalKey) {
      break;
    }

    const currentNode = keyToNode(currentKey);
    const currentDist = dist.get(currentKey)!;

    for (const { node: neighbor, weight } of graph.neighbors(currentNode)) {
      const neighborKey = nodeToKey(neighbor);
      const newCost = currentDist + weight;
      const existingDist = dist.get(neighborKey) ?? Infinity;

      if (newCost < existingDist) {
        dist.set(neighborKey, newCost);
        cameFrom.set(neighborKey, currentKey);
        pq.enqueue(neighborKey, newCost);
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
    totalCost = dist.get(goalKey) ?? Infinity;
  }

  return {
    path,
    cost: totalCost,
    nodesExpanded: visitedOrder.length,
    visitedOrder,
    executionTimeMs: elapsedMs,
    algorithmName: 'Dijkstra',
    found,
  };
}
