import { ARENA_HISTORY_KEY } from './types';
import type { ArenaResult, RankingMetric } from './types';
export interface ArenaRank {
  key: string;
  algorithm: ArenaResult['agent']['algorithm'];
  tactic: ArenaResult['agent']['tactic'];
  games: number;
  completed: number;
  score: number;
  time: number | null;
  searchMs: number;
  expanded: number;
  coverage: number;
}
export function completeRounds(results: ArenaResult[]): ArenaResult[] {
  const groups = new Map<string, ArenaResult[]>();
  for (const result of results) {
    const key = `${result.batchId}:${result.round}`;
    groups.set(key, [...(groups.get(key) ?? []), result]);
  }
  return [...groups.values()]
    .filter((g) => new Set(g.map((r) => r.agent.id)).size === g[0].fieldSize)
    .flat();
}
/** Positive means A wins; failures never win the time criterion by ending early. */
export function compareDuel(
  a: ArenaResult,
  b: ArenaResult,
  metric: RankingMetric,
): number {
  const completeA = Number(a.status === 'COMPLETED'),
    completeB = Number(b.status === 'COMPLETED');
  const coverageA = a.totalDots ? a.dotsCollected / a.totalDots : 1,
    coverageB = b.totalDots ? b.dotsCollected / b.totalDots : 1;
  const finishTime = completeA && completeB ? b.elapsedMs - a.elapsedMs : 0;
  return metric === 'time'
    ? completeA - completeB ||
        finishTime ||
        coverageA - coverageB ||
        a.score - b.score
    : a.score - b.score ||
        completeA - completeB ||
        finishTime;
}
export function rankResults(
  results: ArenaResult[],
  metric: RankingMetric,
): ArenaRank[] {
  const groups = new Map<string, ArenaResult[]>();
  for (const result of results) {
    const key = `${result.agent.algorithm}:${result.agent.tactic}`;
    groups.set(key, [...(groups.get(key) ?? []), result]);
  }
  return [...groups]
    .map(([key, games]) => {
      const finished = games.filter((g) => g.status === 'COMPLETED');
      const mean = (list: ArenaResult[], fn: (g: ArenaResult) => number) =>
        list.reduce((sum, g) => sum + fn(g), 0) / list.length;
      return {
        key,
        algorithm: games[0].agent.algorithm,
        tactic: games[0].agent.tactic,
        games: games.length,
        completed: finished.length,
        score: mean(games, (g) => g.score),
        time: finished.length ? mean(finished, (g) => g.elapsedMs) : null,
        searchMs: mean(games, (g) => g.searchMs),
        expanded: mean(games, (g) => g.nodesExpanded),
        coverage: mean(games, (g) =>
          g.totalDots ? g.dotsCollected / g.totalDots : 1,
        ),
      };
    })
    .sort((a, b) =>
      metric === 'score'
        ? b.score - a.score ||
          b.completed / b.games - a.completed / a.games ||
          (a.time ?? Infinity) - (b.time ?? Infinity) ||
          a.key.localeCompare(b.key)
        : b.completed / b.games - a.completed / a.games ||
          (a.time ?? Infinity) - (b.time ?? Infinity) ||
          b.coverage - a.coverage ||
          b.score - a.score ||
          a.key.localeCompare(b.key),
    );
}
export function sameRank(
  a: ArenaRank,
  b: ArenaRank,
  metric: RankingMetric,
): boolean {
  return metric === 'score'
    ? a.score === b.score &&
        a.completed / a.games === b.completed / b.games &&
        a.time === b.time
    : a.completed / a.games === b.completed / b.games &&
        a.time === b.time &&
        a.coverage === b.coverage &&
        a.score === b.score;
}
export function readArenaHistory(
  storage: Pick<Storage, 'getItem'> | undefined,
): ArenaResult[] {
  try {
    const value: unknown = JSON.parse(
      storage?.getItem(ARENA_HISTORY_KEY) ?? '[]',
    );
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (r): r is ArenaResult =>
          !!r &&
          typeof r === 'object' &&
          typeof r.id === 'string' &&
          typeof r.batchId === 'string' &&
          r.modelVersion === 3 &&
          Number.isInteger(r.fieldSize) &&
          r.fieldSize >= 2 &&
          r.fieldSize <= 6 &&
          Number.isFinite(r.seed) &&
          ['exit', 'dots'].includes(r.objective) &&
          typeof r.ghosts === 'boolean' &&
          ['Dijkstra', 'A*'].includes(r.agent?.algorithm) &&
          ['fast', 'collector', 'safe'].includes(r.agent?.tactic) &&
          ['COMPLETED', 'CAUGHT', 'LAVA', 'TIMEOUT', 'BLOCKED'].includes(
            r.status,
          ) &&
          [
            'score',
            'elapsedMs',
            'searchMs',
            'nodesExpanded',
            'dotsCollected',
            'totalDots',
          ].every((k) => Number.isFinite(r[k])),
      )
      .slice(-2000);
  } catch {
    return [];
  }
}
