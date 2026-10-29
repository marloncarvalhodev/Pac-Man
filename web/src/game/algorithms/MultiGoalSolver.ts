/**
 * Multi-Goal Pathfinding (Caminho Composto para Coleta de Chaves e Destino Trancado).
 * Subproblema do Caixeiro Viajante (TSP) no Grafo Ponderado G = (V, E, w).
 */

import { Graph } from '../graph/Graph';
import { Node } from '../graph/GraphTypes';
import { PathfindingResult } from './PathfindingTypes';
import { dijkstra } from './Dijkstra';
import { aStar } from './AStar';

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutations(remaining)) {
      result.push([current, ...p]);
    }
  }
  return result;
}

export interface MultiGoalOptions {
  algorithm?: 'Dijkstra' | 'A*';
  portals?: Array<[Node, Node]>;
}

export function solveMultiGoal(
  graph: Graph,
  start: Node,
  keys: Node[],
  goal: Node,
  options: MultiGoalOptions = {}
): PathfindingResult {
  const startTime = performance.now();
  const algorithm = options.algorithm ?? 'A*';

  const singleSearch = (s: Node, g: Node): PathfindingResult => {
    if (algorithm === 'Dijkstra') {
      return dijkstra(graph, s, g);
    }
    return aStar(graph, s, g, { portals: options.portals });
  };

  // Caso base: sem chaves pendentes, vai direto ao destino
  if (keys.length === 0) {
    const res = singleSearch(start, goal);
    return {
      ...res,
      algorithmName: `${algorithm} (Direto)`,
    };
  }

  let bestTotalCost = Infinity;
  let bestFullPath: Node[] = [];
  let bestPermutation: Node[] = [];

  const keyPerms = permutations(keys);

  for (const perm of keyPerms) {
    const waypoints = [start, ...perm, goal];
    let currentPermCost = 0;
    const currentPermPath: Node[] = [];
    let possible = true;

    for (let i = 0; i < waypoints.length - 1; i++) {
      const subRes = singleSearch(waypoints[i], waypoints[i + 1]);
      if (!subRes.found) {
        possible = false;
        break;
      }
      currentPermCost += subRes.cost;
      if (currentPermPath.length > 0) {
        currentPermPath.push(...subRes.path.slice(1));
      } else {
        currentPermPath.push(...subRes.path);
      }
    }

    if (possible && currentPermCost < bestTotalCost) {
      bestTotalCost = currentPermCost;
      bestFullPath = currentPermPath;
      bestPermutation = perm;
    }
  }

  // Compila os nós expandidos na ordem da melhor rota
  const combinedVisitedOrder: Node[] = [];
  let totalNodesExpanded = 0;

  if (bestFullPath.length > 0) {
    const optimalWaypoints = [start, ...bestPermutation, goal];
    for (let i = 0; i < optimalWaypoints.length - 1; i++) {
      const subRes = singleSearch(optimalWaypoints[i], optimalWaypoints[i + 1]);
      combinedVisitedOrder.push(...subRes.visitedOrder);
      totalNodesExpanded += subRes.nodesExpanded;
    }
  }

  const elapsedMs = performance.now() - startTime;

  return {
    path: bestFullPath,
    cost: bestTotalCost,
    nodesExpanded: totalNodesExpanded,
    visitedOrder: combinedVisitedOrder,
    executionTimeMs: elapsedMs,
    algorithmName: `${algorithm} (Multi-Goal: ${keys.length} Chaves)`,
    found: bestFullPath.length > 0 && bestTotalCost < Infinity,
  };
}
