import { solveMultiGoal } from '../../algorithms/MultiGoalSolver';
import { aStar } from '../../algorithms/AStar';
import { Node, NodeKey, nodeEquals, nodeToKey, keyToNode } from '../../graph/GraphTypes';
import { AgentPerceptionData, AgentPlan, PlanningAlgorithm } from '../AgentTypes';
import { RiskGraphWrapper } from '../AgentPlanner';
import { IAgentStrategy, StrategyType } from './StrategyTypes';

/**
 * Estratégia MAX_SCORE:
 * Otimiza o ganho cumulativo de pontos no jogo, equilibrando:
 * - Orbes de Poder (Power Pellets): 50 pts + ativação de vulnerabilidade nos fantasmas.
 * - Caça a Fantasmas Vulneráveis: 200 pts por inimigo interceptado antes do término do efeito.
 * - Pac-Dots e Chaves: 10 pts por dot, 100 pts por chave.
 * - Bônus de Vitória: 1000 pts ao finalizar a partida na saída.
 *
 * Critérios de Encerramento e Equilíbrio de Risco:
 * - Se a vida estiver crítica (HP <= 25), encerra desvios de pontuação e corre para as chaves e saída.
 * - Quando as chaves forem obtidas e não houver alvos de alta pontuação próximos, encerra na saída para garantir o bônus de 1000 pts.
 */
export class MaxScoreStrategy implements IAgentStrategy {
  readonly type: StrategyType = 'MAX_SCORE';
  readonly name = 'Pontuação Máxima';
  readonly description = 'Busca a maior pontuação possível capturando orbes, caçando fantasmas vulneráveis e balanceando risco/recompensa.';

  plan(
    perception: AgentPerceptionData,
    algorithm: PlanningAlgorithm = 'A*',
    riskMap?: Map<NodeKey, number>
  ): AgentPlan | null {
    const {
      graph,
      currentPos,
      remainingKeys,
      goal,
      portalPairs,
      enemies,
      powerPellets,
      health = 100,
    } = perception;

    // Caso base: se todas as chaves foram recolhidas e já estamos na saída
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

    // 1. Critério de Salvaguarda: com vida baixa, protege o bônus de 1000 pts da vitória
    if (health <= 25) {
      return this.planDirectObjectives(searchGraph, graph, currentPos, remainingKeys, goal, portalPairs, algorithm);
    }

    const targetList: Node[] = [];

    // 2. Oportunidade: Fantasmas Vulneráveis próximos (200 pts cada)
    const vulnerableGhost = (enemies ?? []).find(
      (e) =>
        e.isVulnerable &&
        e.frightenedTimeRemaining > e.graphDistance * 0.7 + 1.2 &&
        e.graphDistance <= 8
    );

    if (vulnerableGhost) {
      targetList.push([vulnerableGhost.pos[0], vulnerableGhost.pos[1]]);
    }

    // 3. Orbes de Poder (50 pts + poder)
    if (powerPellets && powerPellets.size > 0) {
      // Ordena orbes de poder por distância heurística até a posição atual
      const sortedPellets = Array.from(powerPellets)
        .map(keyToNode)
        .sort((a, b) => {
          const distA = Math.abs(a[0] - currentPos[0]) + Math.abs(a[1] - currentPos[1]);
          const distB = Math.abs(b[0] - currentPos[0]) + Math.abs(b[1] - currentPos[1]);
          return distA - distB;
        });

      // Inclui até 2 orbes de poder mais promissoras no trajeto
      for (let i = 0; i < Math.min(2, sortedPellets.length); i++) {
        targetList.push(sortedPellets[i]);
      }
    }

    // 4. Se não há alvos especiais de alta pontuação e as chaves já foram coletadas, encerra
    if (targetList.length === 0 && remainingKeys.length === 0) {
      return this.planDirectObjectives(searchGraph, graph, currentPos, [], goal, portalPairs, algorithm);
    }

    // 5. Compõe os alvos prioritários com as chaves pendentes
    const combinedTargets: Node[] = [...targetList];
    for (const key of remainingKeys) {
      if (!combinedTargets.some((t) => nodeEquals(t, key))) {
        combinedTargets.push(key);
      }
    }

    const result = solveMultiGoal(searchGraph, currentPos, combinedTargets, goal, {
      algorithm,
      portals: portalPairs,
    });

    if (!result.found || result.path.length === 0) {
      // Fallback para objetivos diretos
      return this.planDirectObjectives(searchGraph, graph, currentPos, remainingKeys, goal, portalPairs, algorithm);
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

  private planDirectObjectives(
    searchGraph: any,
    baseGraph: any,
    currentPos: Node,
    keys: Node[],
    goal: Node,
    portals: [Node, Node][],
    algorithm: PlanningAlgorithm
  ): AgentPlan | null {
    const result = solveMultiGoal(searchGraph, currentPos, keys, goal, {
      algorithm,
      portals,
    });

    if (!result.found || result.path.length === 0) return null;

    let realCost = 0;
    for (let i = 0; i < result.path.length - 1; i++) {
      realCost += baseGraph.getEdgeWeight(result.path[i], result.path[i + 1]) ?? 1.0;
    }

    return {
      algorithm,
      fullPath: result.path,
      keyOrder: result.keyOrder ?? [],
      totalCost: realCost,
      totalNodesExpanded: result.totalNodesExpanded ?? result.nodesExpanded,
      visitedOrder: result.visitedOrder,
    };
  }
}
