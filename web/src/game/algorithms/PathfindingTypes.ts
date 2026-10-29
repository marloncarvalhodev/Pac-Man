/**
 * Estruturas de dados para algoritmos de busca e análise empírica.
 */

import { Node } from '../graph/GraphTypes';

export interface PathfindingResult {
  path: Node[];
  cost: number;
  nodesExpanded: number;
  visitedOrder: Node[];
  executionTimeMs: number;
  algorithmName: string;
  found: boolean;
}

export type HeuristicFunction = (u: Node, v: Node) => number;
