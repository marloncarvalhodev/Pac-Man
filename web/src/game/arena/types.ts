import type { Node } from '../graph/GraphTypes';

export type ArenaAlgorithm = 'Dijkstra' | 'A*';
export type ArenaTactic = 'fast' | 'collector' | 'safe';
export type ArenaObjective = 'exit' | 'dots';
export type RankingMetric = 'time' | 'score';
export interface ArenaAgent {
  id: string;
  name: string;
  algorithm: ArenaAlgorithm;
  tactic: ArenaTactic;
}
export interface ArenaConfig {
  seed: number;
  rounds: number;
  objective: ArenaObjective;
  ghosts: boolean;
  agents: ArenaAgent[];
}
export type ArenaStatus =
  'COMPLETED' | 'CAUGHT' | 'LAVA' | 'TIMEOUT' | 'BLOCKED';
export interface ArenaFrame {
  timeMs: number;
  player: Node;
  facing: [number, number];
  enemies: Node[];
  score: number;
  health: number;
  keys: number;
  dots: number;
  powered: boolean;
}
export interface ArenaResult {
  id: string;
  batchId: string;
  round: number;
  seed: number;
  fieldSize: number;
  modelVersion: number;
  agent: ArenaAgent;
  objective: ArenaObjective;
  ghosts: boolean;
  status: ArenaStatus;
  score: number;
  elapsedMs: number;
  searchMs: number;
  nodesExpanded: number;
  searches: number;
  dotsCollected: number;
  totalDots: number;
  keysCollected: number;
  totalKeys: number;
  health: number;
  moves: number;
  frames?: ArenaFrame[];
}
export const TACTICS: Record<
  ArenaTactic,
  { name: string; description: string }
> = {
  fast: {
    name: 'Rota rápida',
    description:
      'Prioriza chaves e saída, recalculando para evitar fantasmas. Para coletar tudo, escolhe a próxima coleta pelo custo de rota.',
  },
  collector: {
    name: 'Coleta gulosa',
    description:
      'Busca todos os pontos antes da saída e reavalia a próxima coleta considerando o custo da rota e o risco dos fantasmas.',
  },
  safe: {
    name: 'Rota cautelosa',
    description:
      'Penaliza lava e proximidade dos fantasmas e procura poder quando há perigo. Pode percorrer uma rota maior.',
  },
};
export const STATUS_LABELS: Record<ArenaStatus, string> = {
  COMPLETED: 'Concluiu',
  CAUGHT: 'Capturado',
  LAVA: 'Sem vida',
  TIMEOUT: 'Tempo esgotado',
  BLOCKED: 'Sem rota',
};
export const ARENA_HISTORY_KEY = 'pacman-arena-v2';
