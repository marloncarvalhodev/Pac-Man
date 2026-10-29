import { Node } from '../graph/GraphTypes';
import { TerrainType } from '../graph/Terrain';
import { PathfindingResult } from '../algorithms/PathfindingTypes';

export type GameStatus = 'READY' | 'PLAYING' | 'PAUSED' | 'WON' | 'LOST';

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
}
