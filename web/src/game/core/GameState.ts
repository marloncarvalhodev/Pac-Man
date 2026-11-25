import { Node } from '../graph/GraphTypes';
import { TerrainType } from '../graph/Terrain';
import { PathfindingResult } from '../algorithms/PathfindingTypes';
import { ControlMode, AgentStatusReport } from '../agents/AgentTypes';

export type GameStatus = 'READY' | 'COUNTDOWN' | 'PLAYING' | 'PAUSED' | 'WON' | 'LOST' | 'TIMEOUT';

export interface VertexInspectionData {
  node: Node;
  key: string;
  terrain: TerrainType;
  terrainName: string;
  inDegree: number;
  outDegree: number;
  degree: number;
  isJunction: boolean;
  neighbors: Array<{
    node: Node;
    weight: number;
    terrain: TerrainType;
  }>;
}

export interface GameStateSnapshot {
  score: number;
  health: number;
  keysCollected: number;
  totalKeys: number;
  goalUnlocked: boolean;
  isFrightened: boolean;
  frightenedTimeRemaining: number;
  gameStatus: GameStatus;
  enemiesActive: boolean;
  aiPathActive: boolean;
  graphXRayActive: boolean;
  graphOrder: number;
  graphSize: number;
  dijkstraNodesRealtime: number;
  aStarNodesRealtime: number;
  heuristicGainPercent: number;
  solverResult: PathfindingResult | null;
  seed: number;
  controlMode: ControlMode;
  agentStatus: AgentStatusReport | null;
  showAgentVisuals: boolean;
  simulationSpeed?: number;
  countdownRemainingSec?: number;
  ghostGraceRemainingSec?: number;
  isGhostWaiting?: boolean;
}
