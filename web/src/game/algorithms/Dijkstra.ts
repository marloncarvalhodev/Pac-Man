/**
 * Algoritmo de Dijkstra para Caminhos Mínimos em Grafos Ponderados G = (V, E, w).
 * Exploração uniforme e cega (isotrópica) via Min-Heap binário.
 * Complexidade: O((|V| + |E|) log |V|)
 */

import { Graph } from '../graph/Graph';
import { Node, NodeKey, nodeToKey, keyToNode } from '../graph/GraphTypes';
import { PathfindingResult } from './PathfindingTypes';
import { PriorityQueue } from './PriorityQueue';

interface DijkstraHeapItem {
  key: NodeKey;
  dist: number;
}

export function dijkstra(graph: Graph, start: Node, goal: Node): PathfindingResult {
  const startTime = performance.now();

  if (!graph.hasVertex(start) || !graph.hasVertex(goal)) {
    return {
      path: [],
      cost: Infinity,
      nodesExpanded: 0,
      visitedOrder: [],
      executionTimeMs: performance.now() - startTime,
      algorithmName: 'Dijkstra',
      found: false,
      moves: 0,
    };
  }

  const startKey = nodeToKey(start);
  const goalKey = nodeToKey(goal);

  if (startKey === goalKey) {
    return {
      path: [start],
      cost: 0,
      nodesExpanded: 1,
      visitedOrder: [start],
      executionTimeMs: performance.now() - startTime,
      algorithmName: 'Dijkstra',
      found: true,
      moves: 0,
    };
  }

  const dist = new Map<NodeKey, number>();
  const cameFrom = new Map<NodeKey, NodeKey>();
  const visitedOrder: Node[] = [];

  const pq = new PriorityQueue<DijkstraHeapItem>();

  dist.set(startKey, 0);
  pq.enqueue({ key: startKey, dist: 0 }, 0);

  while (!pq.isEmpty()) {
    const item = pq.dequeue()!;
    const currentKey = item.key;
    const currentDist = item.dist;

    if (currentDist !== dist.get(currentKey)) {
      continue;
    }

    const currentNode = keyToNode(currentKey);
    visitedOrder.push(currentNode);

    if (currentKey === goalKey) {
      break;
    }

    for (const { node: neighbor, weight } of graph.neighbors(currentNode)) {
      const neighborKey = nodeToKey(neighbor);
      const newCost = currentDist + weight;
      const existingDist = dist.get(neighborKey) ?? Infinity;

      if (newCost < existingDist) {
        dist.set(neighborKey, newCost);
        cameFrom.set(neighborKey, currentKey);
        pq.enqueue({ key: neighborKey, dist: newCost }, newCost);
      }
    }
  }

  const elapsedMs = performance.now() - startTime;

  // Reconstrução do caminho
  const path: Node[] = [];
  let found = false;
  let totalCost = Infinity;

  if (cameFrom.has(goalKey)) {
    let curr: NodeKey | undefined = goalKey;
    while (curr) {
      path.push(keyToNode(curr));
      if (curr === startKey) break;
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
    moves: Math.max(0, path.length - 1),
  };
}
