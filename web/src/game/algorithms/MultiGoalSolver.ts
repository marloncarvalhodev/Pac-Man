import type { Graph } from '../graph/Graph';
import { nodeToKey, type Node } from '../graph/GraphTypes';
import type { PathfindingResult } from './PathfindingTypes';
import { searchGraph } from './SearchEngine';
export interface MultiGoalOptions {
  algorithm?: 'Dijkstra' | 'A*';
  portals?: Array<[Node, Node]>;
  recordFrontier?: boolean;
}
/** Held–Karp DP over cached directed shortest paths. Exact up to 12 distinct intermediate goals. */
export function solveMultiGoal(
  graph: Graph,
  start: Node,
  keys: Node[],
  goal: Node,
  options: MultiGoalOptions = {},
): PathfindingResult {
  const began = performance.now(),
    algorithm = options.algorithm ?? 'A*';
  const unique = [
    ...new Map(
      keys
        .filter(
          (k) =>
            nodeToKey(k) !== nodeToKey(start) &&
            nodeToKey(k) !== nodeToKey(goal),
        )
        .map((k) => [nodeToKey(k), k]),
    ).values(),
  ];
  const points = [start, ...unique, goal],
    n = unique.length,
    memo = new Map<string, PathfindingResult>(),
    visitedOrder: Node[] = [],
    frontierOrder: Node[][] = [];
  let expanded = 0,
    frontierPeak = 0,
    relaxations = 0,
    reopened = 0;
  const get = (i: number, j: number) => {
    const key = i + ':' + j;
    let result = memo.get(key);
    if (!result) {
      result = searchGraph(graph, points[i], [points[j]], algorithm, {
        recordFrontier: options.recordFrontier,
      });
      memo.set(key, result);
      expanded += result.nodesExpanded;
      visitedOrder.push(...result.visitedOrder);
      if (result.frontierOrder) frontierOrder.push(...result.frontierOrder);
      frontierPeak = Math.max(frontierPeak, result.frontierPeak ?? 0);
      relaxations += result.relaxations ?? 0;
      reopened += result.reopened ?? 0;
    }
    return result;
  };
  let order: number[] = [],
    cost = Infinity,
    exact = n <= 12;
  if (n === 0) {
    cost = get(0, 1).cost;
    order = [0, 1];
  } else if (exact) {
    const size = 1 << n,
      dp = Array.from({ length: size }, () =>
        new Float64Array(n).fill(Infinity),
      ),
      prev = Array.from({ length: size }, () => new Int16Array(n).fill(-1));
    for (let i = 0; i < n; i++) dp[1 << i][i] = get(0, i + 1).cost;
    for (let mask = 1; mask < size; mask++)
      for (let last = 0; last < n; last++)
        if (Number.isFinite(dp[mask][last]))
          for (let next = 0; next < n; next++)
            if (!(mask & (1 << next))) {
              const nextMask = mask | (1 << next),
                value = dp[mask][last] + get(last + 1, next + 1).cost;
              if (value < dp[nextMask][next]) {
                dp[nextMask][next] = value;
                prev[nextMask][next] = last;
              }
            }
    let last = -1;
    for (let i = 0; i < n; i++) {
      const value = dp[size - 1][i] + get(i + 1, n + 1).cost;
      if (value < cost) {
        cost = value;
        last = i;
      }
    }
    if (last >= 0) {
      let mask = size - 1;
      const reverse: number[] = [];
      while (last >= 0) {
        reverse.push(last + 1);
        const before = prev[mask][last];
        mask ^= 1 << last;
        last = before;
      }
      order = [0, ...reverse.reverse(), n + 1];
    }
  } else {
    const pending = new Set(unique.map((_, i) => i + 1));
    let current = 0;
    order = [0];
    cost = 0;
    while (pending.size) {
      let best = -1,
        bestCost = Infinity;
      for (const target of pending) {
        const value = get(current, target).cost;
        if (value < bestCost) {
          bestCost = value;
          best = target;
        }
      }
      if (best < 0) {
        cost = Infinity;
        break;
      }
      cost += bestCost;
      order.push(best);
      pending.delete(best);
      current = best;
    }
    cost += get(current, n + 1).cost;
    order.push(n + 1);
  }
  const path: Node[] = [];
  if (Number.isFinite(cost))
    for (let i = 0; i < order.length - 1; i++) {
      const leg = get(order[i], order[i + 1]);
      path.push(...(path.length ? leg.path.slice(1) : leg.path));
    }
  return {
    path,
    cost,
    found: Number.isFinite(cost) && path.length > 0,
    nodesExpanded: expanded,
    visitedOrder,
    executionTimeMs: performance.now() - began,
    algorithmName:
      algorithm +
      ' (Multi-Goal ' +
      (exact ? 'exato' : 'guloso') +
      ': ' +
      n +
      ')',
    frontierPeak,
    relaxations,
    reopened,
    ...(options.recordFrontier ? { frontierOrder } : {}),
  };
}
