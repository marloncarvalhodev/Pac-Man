import { solveMultiGoal } from '../../algorithms/MultiGoalSolver';
import { Node, NodeKey, nodeEquals } from '../../graph/GraphTypes';
import { AgentPerceptionData, AgentPlan, PlanningAlgorithm } from '../AgentTypes';
import { RiskGraphWrapper } from '../AgentPlanner';
import { IAgentStrategy, StrategyType } from './StrategyTypes';
import { GAME_SPEED_CONFIG } from '../../config/GameConfig';

/**
 * Estratégia MIN_TIME:
 * Prioriza o menor tempo estimado de conclusão do percurso.
 *
 * Fundamentação Matemática de Equivalência:
 * No motor físico do Pac-Man, o tempo de travessia delta_t(u, v) de uma transição entre células é dado por:
 *   delta_t(u, v) = w(u, v) * BASE_STEP_DELAY
 * onde w(u, v) é o peso da aresta (Normal=1.0, Gelo=0.3, Lama=4.0, Lava=8.0) e BASE_STEP_DELAY > 0 é constante.
 * Para qualquer caminho P, o tempo total é:
 *   T(P) = somatório delta_t(e) = BASE_STEP_DELAY * somatório w(e) = BASE_STEP_DELAY * Custo(P).
 * Como BASE_STEP_DELAY é escalar positivo invariante, argmin T(P) === argmin Custo(P).
 * Portanto, a minimização do tempo real de execução coincide matematicamente com o caminho ótimo no grafo ponderado.
 */
export class MinTimeStrategy implements IAgentStrategy {
  readonly type: StrategyType = 'MIN_TIME';
  readonly name = 'Menor Tempo';
  readonly description = 'Prioriza o menor tempo de conclusão estimado (isomórfico ao menor custo devido à proporcionalidade estrita tempo/peso).';

  // Delay base em milissegundos por unidade de peso do terreno centralizado em GAME_SPEED_CONFIG
  static readonly BASE_STEP_DELAY_MS: number = GAME_SPEED_CONFIG.PLAYER_BASE_DELAY_MS;

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

  /**
   * Calcula o tempo estimado em segundos para percorrer um determinado custo no grafo.
   */
  static estimateTimeSeconds(cost: number): number {
    return (cost * MinTimeStrategy.BASE_STEP_DELAY_MS) / 1000;
  }
}
