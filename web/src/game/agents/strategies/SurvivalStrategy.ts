import { solveMultiGoal } from '../../algorithms/MultiGoalSolver';
import { aStar } from '../../algorithms/AStar';
import { Node, NodeKey, nodeEquals, nodeToKey, keyToNode } from '../../graph/GraphTypes';
import { TerrainType } from '../../graph/Terrain';
import { AgentPerceptionData, AgentPlan, PlanningAlgorithm } from '../AgentTypes';
import { RiskAssessment } from '../RiskAssessment';
import { RiskGraphWrapper } from '../AgentPlanner';
import { IAgentStrategy, StrategyType } from './StrategyTypes';

/**
 * Estratégia SURVIVAL:
 * Prioriza a integridade e segurança do Pac-Man, mitigando ativamente:
 * 1. Zonas de risco e perseguição por fantasmas (com raio ampliado de cautela).
 * 2. Terrenos de Lava com dano contínuo à saúde (-10 HP).
 * 3. Armadilhas e becos sem saída.
 *
 * Se houver ameaça iminente e Orbes de Poder (Power Pellets) disponíveis no labirinto,
 * a estratégia calcula um desvio seguro para ingerir a orbe antes de prosseguir com as chaves.
 */
export class SurvivalStrategy implements IAgentStrategy {
  readonly type: StrategyType = 'SURVIVAL';
  readonly name = 'Sobrevivência';
  readonly description = 'Prioriza segurança absoluta: evita lava e zonas de captura, usando orbes defensivas e rotas seguras até os objetivos.';

  private riskAssessment = new RiskAssessment();

  plan(
    perception: AgentPerceptionData,
    algorithm: PlanningAlgorithm = 'A*',
    passedRiskMap?: Map<NodeKey, number>
  ): AgentPlan | null {
    const { graph, currentPos, remainingKeys, goal, portalPairs, terrains, enemies, health, powerPellets } = perception;

    // Caso base: objetivos já concluídos na posição final
    if (remainingKeys.length === 0 && nodeEquals(currentPos, goal)) {
      return {
        algorithm,
        fullPath: [[currentPos[0], currentPos[1]]],
        keyOrder: [],
        totalCost: 0,
        totalNodesExpanded: 1,
        visitedOrder: [[currentPos[0], currentPos[1]]],
        isRiskAware: true,
      };
    }

    // 1. Construção do mapa de risco focado em sobrevivência
    const enhancedRiskMap = new Map<NodeKey, number>(passedRiskMap ?? []);

    // 1.1 Penalidade severa contra terrenos de LAVA (evita perda de HP)
    const currentHealth = health ?? 100;
    const lavaPenalty = currentHealth <= 30 ? 500.0 : currentHealth <= 60 ? 150.0 : 60.0;

    for (const [key, terrain] of terrains.entries()) {
      if (terrain === TerrainType.LAVA) {
        const cur = enhancedRiskMap.get(key) ?? 0;
        enhancedRiskMap.set(key, Math.max(cur, lavaPenalty));
      }
    }

    // 1.2 Penalidades aumentadas de proximidade de fantasmas
    if (enemies && enemies.length > 0) {
      const pacDistances = this.riskAssessment.computeTopologicalDistances(graph, currentPos);
      for (const enemy of enemies) {
        if (enemy.isVulnerable) continue;

        const enemyDistances = this.riskAssessment.computeTopologicalDistances(graph, enemy.pos);
        for (const [k, dist] of enemyDistances.entries()) {
          if (dist > 7) continue;

          let p = 0;
          if (dist === 0) p = 150.0;
          else if (dist === 1) p = 80.0;
          else if (dist === 2) p = 40.0;
          else if (dist === 3) p = 20.0;
          else if (dist === 4) p = 10.0;
          else if (dist === 5) p = 5.0;
          else p = 2.0;

          // Se a vida estiver baixa, dobra a aversão ao perigo
          if (currentHealth <= 40) p *= 2.0;

          const cur = enhancedRiskMap.get(k) ?? 0;
          enhancedRiskMap.set(k, Math.max(cur, p * enemy.dangerLevel));
        }
      }
    }

    const searchGraph = new RiskGraphWrapper(graph, enhancedRiskMap);

    // 2. Avaliação de Orbe de Poder Defensiva:
    // Se há inimigos perigosos próximos e orbes disponíveis, avalia coletar a orbe mais segura primeiro
    let objectivesToCollect = [...remainingKeys];
    const threateningEnemy = (enemies ?? []).find(
      (e) => !e.isVulnerable && e.dangerLevel > 0.1 && e.graphDistance <= 7
    );

    if (threateningEnemy && powerPellets && powerPellets.size > 0) {
      // Encontra a Power Pellet mais próxima e acessível
      let bestPellet: Node | null = null;
      let minPelletCost = Infinity;

      for (const pelletKey of powerPellets) {
        const pelletNode = keyToNode(pelletKey);
        // Verifica se a orbe não está dominada por um fantasma imediato
        const riskAtPellet = enhancedRiskMap.get(pelletKey) ?? 0;
        if (riskAtPellet > 60.0) continue;

        const res = aStar(searchGraph, currentPos, pelletNode, { portals: portalPairs });
        if (res.found && res.cost < minPelletCost) {
          minPelletCost = res.cost;
          bestPellet = pelletNode;
        }
      }

      if (bestPellet) {
        // Insere a orbe de poder como primeiro objetivo prioritário
        objectivesToCollect = [bestPellet, ...remainingKeys];
      }
    }

    // 3. Executa o MultiGoalSolver no grafo com pesos ponderados por segurança
    const result = solveMultiGoal(searchGraph, currentPos, objectivesToCollect, goal, {
      algorithm,
      portals: portalPairs,
    });

    if (!result.found || result.path.length === 0) {
      // Fallback de resiliência: se a rota ultra-segura foi bloqueada, relaxa para chaves diretas
      const fallbackResult = solveMultiGoal(searchGraph, currentPos, remainingKeys, goal, {
        algorithm,
        portals: portalPairs,
      });

      if (!fallbackResult.found || fallbackResult.path.length === 0) {
        return null;
      }

      let realCost = 0;
      for (let i = 0; i < fallbackResult.path.length - 1; i++) {
        realCost += graph.getEdgeWeight(fallbackResult.path[i], fallbackResult.path[i + 1]) ?? 1.0;
      }

      return {
        algorithm,
        fullPath: fallbackResult.path,
        keyOrder: fallbackResult.keyOrder ?? [],
        totalCost: realCost,
        totalNodesExpanded: fallbackResult.totalNodesExpanded ?? fallbackResult.nodesExpanded,
        visitedOrder: fallbackResult.visitedOrder,
        isRiskAware: true,
      };
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
      isRiskAware: true,
    };
  }
}
