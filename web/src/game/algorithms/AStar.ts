/**
 * Algoritmo A* (A-Star) Ponderado com Heurística Admissível.
 * Avaliação: f(n) = g(n) + h(n)
 * Complexidade: O((|V| + |E|) log |V|)
 */

import { Graph } from '../graph/Graph';
import { Node, NodeKey, nodeToKey, keyToNode } from '../graph/GraphTypes';
import { PathfindingResult, HeuristicFunction } from './PathfindingTypes';
import { PriorityQueue } from './PriorityQueue';
import { graphManhattanScale, consistentManhattan } from './Heuristics';

export interface AStarOptions {
  heuristic?: HeuristicFunction;
  portals?: Array<[Node, Node]>;
  minWeight?: number;
}

interface AStarHeapItem {
  key: NodeKey;
  g: number;
  f: number;
}

export function aStar(
  graph: Graph,
  start: Node,
  goal: Node,
  options: AStarOptions = {}
): PathfindingResult {
  const startTime = performance.now();

  if (!graph.hasVertex(start) || !graph.hasVertex(goal)) {
    return {
      path: [],
      cost: Infinity,
      nodesExpanded: 0,
      visitedOrder: [],
      executionTimeMs: performance.now() - startTime,
      algorithmName: 'A*',
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
      algorithmName: 'A*',
      found: true,
      moves: 0,
    };
  }

  const scale = graphManhattanScale(graph, options.minWeight);
  const hFn: HeuristicFunction =
    options.heuristic ?? ((u, v) => consistentManhattan(u, v, scale));

  const gScore = new Map<NodeKey, number>();
  const cameFrom = new Map<NodeKey, NodeKey>();
  const visitedOrder: Node[] = [];

  const pq = new PriorityQueue<AStarHeapItem>();

  gScore.set(startKey, 0);
  const initialF = hFn(start, goal);
  pq.enqueue({ key: startKey, g: 0, f: initialF }, initialF);

  while (!pq.isEmpty()) {
    const item = pq.dequeue()!;
    const currentKey = item.key;
    const currentG = item.g;

    // Descarta entradas obsoletas do heap e permite reabertura de nós
    if (currentG !== gScore.get(currentKey)) {
      continue;
    }

    const currentNode = keyToNode(currentKey);
    visitedOrder.push(currentNode);

    if (currentKey === goalKey) {
      break;
    }

    for (const { node: neighbor, weight } of graph.neighbors(currentNode)) {
      const neighborKey = nodeToKey(neighbor);
      const tentativeG = currentG + weight;
      const existingG = gScore.get(neighborKey) ?? Infinity;

      if (tentativeG < existingG) {
        cameFrom.set(neighborKey, currentKey);
        gScore.set(neighborKey, tentativeG);
        const fVal = tentativeG + hFn(neighbor, goal);
        pq.enqueue({ key: neighborKey, g: tentativeG, f: fVal }, fVal);
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
    moves: Math.max(0, path.length - 1),
  };
}
