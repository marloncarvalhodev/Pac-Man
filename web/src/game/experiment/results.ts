import { ENGINE_VERSION, MAP, type ExperimentResult } from './Experiment';

// Keep older results intact under their original key; rules changed in engine 2.
const KEY = 'pacman-experiments-v2';
export const percent = (r: ExperimentResult) => r.initial.dots ? 100 * r.dots / r.initial.dots : 100;

export function readHistory(): ExperimentResult[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(data) ? data.filter(validResult) : [];
  } catch { return []; }
}

function validResult(value: unknown): value is ExperimentResult {
  if (!value || typeof value !== 'object') return false;
  const r = value as ExperimentResult;
  return typeof r.id === 'string' && typeof r.batch === 'string' &&
    typeof r.date === 'string' && Number.isFinite(Date.parse(r.date)) && r.engine === ENGINE_VERSION &&
    r.map?.rows === MAP.rows && r.map?.cols === MAP.cols && r.map?.loops === MAP.loops &&
    r.map?.keys === MAP.keys && r.map?.portals === MAP.portals &&
    ['MIN_COST', 'MIN_TIME', 'SURVIVAL', 'MAX_SURVIVAL_TIME', 'MAX_SCORE', 'FULL_CLEAR'].includes(r.strategy) &&
    ['Dijkstra', 'A*'].includes(r.algorithm) && ['DEMO', 'MVM'].includes(r.mode) &&
    ['exit', 'dots', 'survival', 'score', 'time'].includes(r.objective) &&
    ['WON', 'LOST', 'TIMEOUT', 'BLOCKED', 'ERROR'].includes(r.outcome) &&
    Number.isSafeInteger(r.seed) && Number.isFinite(r.limitMs) && r.limitMs > 0 &&
    [r.score, r.cost, r.simulatedMs, r.processingMs, r.decisionMs, r.dots, r.initial?.dots,
      r.replans, r.expanded, r.moves].every(n => Number.isFinite(n) && n >= 0) &&
    r.dots <= r.initial.dots && r.simulatedMs <= r.limitMs && r.timeScale === 1;
}

export function saveHistory(previous: ExperimentResult[], incoming: ExperimentResult[]) {
  const unique = new Map(previous.map(r => [r.id, r]));
  for (const r of incoming) if (validResult(r)) unique.set(r.id, r);
  const next = [...unique.values()];
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export const clearHistory = () => localStorage.removeItem(KEY);
export const mean = (values: number[]) => values.length
  ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
export function median(values: number[]) {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : mean(ordered.slice(Math.max(0, middle - 1), middle + 1));
}
