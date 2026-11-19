import { solveMultiGoal } from '../../algorithms/MultiGoalSolver';
import { Node, NodeKey, nodeEquals } from '../../graph/GraphTypes';
import { AgentPerceptionData, AgentPlan, PlanningAlgorithm } from '../AgentTypes';
import { RiskGraphWrapper } from '../AgentPlanner';
import { IAgentStrategy, StrategyType } from './StrategyTypes';

/**
 * Estratégia MIN_COST:
 * Coleta as chaves e alcança a saída pelo menor custo acumulado do grafo ponderado G = (V, E, w),
 * utilizando o MultiGoalSolver para otimização exata sobre as ordens de coleta.
 */
export class MinCostStrategy implements IAgentStrategy {
  readonly type: StrategyType = 'MIN_COST';
  readonly name = 'Menor Custo';
  readonly description = 'Minimiza o custo ponderado total das arestas percorridas até coletar todas as chaves e alcançar a saída.';

  plan(
    perception: AgentPerceptionData,
    algorithm: PlanningAlgorithm = 'A*',
    riskMap?: Map<NodeKey, number>
  ): AgentPlan | null {
    const { graph, currentPos, remainingKeys, goal, portalPairs } = perception;

    if (remainingKeys.length === 0 && nodeEquals(currentPos, goal)) {
      return {
        algorithm,
        fullPath: [[currentPos[0], currentPos[1]]],
        keyOrder: [],
        totalCost: 0,
        totalNodesExpanded: 1,
        visitedOrder: [[currentPos[0], currentPos[1]]],
        isRiskAware: !!riskMap && riskMap.size > 0,
      };
    }

    const searchGraph =
      riskMap && riskMap.size > 0 ? new RiskGraphWrapper(graph, riskMap) : graph;

    const result = solveMultiGoal(searchGraph, currentPos, remainingKeys, goal, {
      algorithm,
      portals: portalPairs,
    });

    if (!result.found || result.path.length === 0) {
      return null;
    }

    // Calcula o custo matemático acumulado estritamente sobre o grafo físico
    let realCost = 0;
    for (let i = 0; i < result.path.length - 1; i++) {
      realCost += graph.getEdgeWeight(result.path[i], result.path[i + 1]) ?? 1.0;
    }

    return {
      algorithm,
      fullPath: result.path,
      keyOrder: result.keyOrder ?? [],
      totalCost: realCost,
      totalNodesExpanded: result.totalNodesExpanded ?? result.nodesExpanded,
      visitedOrder: result.visitedOrder,
      isRiskAware: !!riskMap && riskMap.size > 0,
    };
  }
}
