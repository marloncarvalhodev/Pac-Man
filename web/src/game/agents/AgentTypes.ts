import { Node } from '../graph/GraphTypes';
import { Graph } from '../graph/Graph';
import { TerrainType } from '../graph/Terrain';
import { StrategyType, MatchMetrics } from './strategies/StrategyTypes';

export type { StrategyType, MatchMetrics };

/** Estados operacionais do ciclo de execução do agente */
export type AgentState = 'IDLE' | 'PLANNING' | 'MOVING' | 'PAUSED' | 'COMPLETED' | 'FAILED';

/** Modos de controle principais */
export type ControlMode = 'HUMAN' | 'AUTONOMOUS';

/** Modos de execução autônoma */
export type AutonomousMode = 'DEMO' | 'MVM';

/** Estados estratégicos de tomada de decisão do agente */
export type StrategicState = 'COLLECTING' | 'ESCAPING' | 'REPLANNING' | 'FINISHING';

/** Algoritmos de busca em grafos disponíveis */
export type PlanningAlgorithm = 'A*' | 'Dijkstra';

/** Percepção de um fantasma individual */
export interface EnemyPerception {
  id: 'red' | 'purple' | string;
  name: string;
  pos: Node;
  spawn: Node;
  facing: [number, number];
  path: Node[];
  isFrightened: boolean;
  frightenedTimeRemaining: number;
  graphDistance: number; // Distância topológica no grafo (arestas/custo)
  isVulnerable: boolean; // Vulnerável com tempo seguro restante (> limiar)
  dangerLevel: number; // Grau de ameaça normalizado [0, 1]
}

/** Percepção completa do ambiente pelo agente */
export interface AgentPerceptionData {
  currentPos: Node;
  graph: Graph;
  remainingKeys: Node[];
  allKeys: Node[];
  collectedKeys: Set<string>;
  goal: Node;
  portalPairs: [Node, Node][];
  terrains: Map<string, TerrainType>;
  enemies: EnemyPerception[];
  frightenedUntilTime: number;
  currentTime: number;
  pacDots?: Set<string>;
  powerPellets?: Set<string>;
  health?: number;
  score?: number;
  seed?: number;
}

/** Plano de rota estruturado gerado pelos algoritmos de busca */
export interface AgentPlan {
  algorithm: PlanningAlgorithm;
  fullPath: Node[];
  keyOrder: Node[];
  totalCost: number;
  totalNodesExpanded: number;
  visitedOrder: Node[];
  isRiskAware?: boolean;
}

/** Relatório de telemetria e status para interface e depuração */
export interface AgentStatusReport {
  controlMode: ControlMode;
  autonomousMode: AutonomousMode;
  state: AgentState;
  strategicState: StrategicState;
  algorithm: PlanningAlgorithm;
  strategy: StrategyType;
  matchMetrics: MatchMetrics;
  totalCost: number;
  totalNodesExpanded: number;
  nextTarget: Node | null;
  targetDescription: string;
  remainingObjectivesCount: number;
  currentStepIndex: number;
  totalSteps: number;
  isExperimentalNoGhosts: boolean;
  elapsedExecutionTimeSec: number;
  survivalTimeSec: number;
  realExecutionTimeSec?: number;
  simulationSpeed?: number;
  replanCount: number;
  mostDangerousEnemy: { name: string; distance: number; danger: number } | null;
  dangerNodesCount: number;
  isEscaping: boolean;
  escapePath: Node[];
}
