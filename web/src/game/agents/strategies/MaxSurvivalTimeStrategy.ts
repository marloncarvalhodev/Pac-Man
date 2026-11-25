import { aStar } from '../../algorithms/AStar';
import { Node, NodeKey, nodeEquals, nodeToKey, keyToNode } from '../../graph/GraphTypes';
import { TerrainType } from '../../graph/Terrain';
import { AgentPerceptionData, AgentPlan, PlanningAlgorithm } from '../AgentTypes';
import { RiskAssessment } from '../RiskAssessment';
import { RiskGraphWrapper } from '../AgentPlanner';
import { IAgentStrategy, StrategyType } from './StrategyTypes';

/**
 * Estratégia MAX_SURVIVAL_TIME:
 * Maximiza explicitamente o tempo de permanência no labirinto vivo.
 * Diferente de SURVIVAL (que busca chaves e saída em segurança), esta tática:
 * 1. NUNCA busca a saída prematuramente, evitando encerramento antecipado.
 * 2. Mantém evasão contínua em ciclos abertos de alta mobilidade longe dos inimigos.
 * 3. Penaliza veementemente Lava (-10 HP) e becos sem saída (nós com deg <= 1).
 * 4. Desvia ativamente para Power Pellets quando acuado por fantasmas.
 * 5. Coleta Pac-Dots oportunistas que estejam em zonas comprovadamente seguras.
 */
export class MaxSurvivalTimeStrategy implements IAgentStrategy {
  readonly type: StrategyType = 'MAX_SURVIVAL_TIME';
  readonly name = 'Permanência Máxima';
  readonly description = 'Evasão contínua para maximizar o tempo de vida na partida, evitando a saída e priorizando rotas seguras e orbes defensivas.';

  private riskAssessment = new RiskAssessment();

  plan(
    perception: AgentPerceptionData,
    algorithm: PlanningAlgorithm = 'A*',
    passedRiskMap?: Map<NodeKey, number>
  ): AgentPlan | null {
    const { graph, currentPos, portalPairs, terrains, enemies, health, powerPellets } = perception;

    // 1. Constrói mapa de risco ampliado
    const enhancedRiskMap = new Map<NodeKey, number>(passedRiskMap ?? []);

    // 1.1 Lava causa dano direto por permanência (-10 HP)
    for (const [key, terrain] of terrains.entries()) {
      if (terrain === TerrainType.LAVA) {
        enhancedRiskMap.set(key, 999.0);
      }
    }

    // 1.2 Penaliza nós de beco sem saída (grau <= 1) para não ser encurralado
    for (const v of graph.vertices) {
      const deg = graph.degree(v);
      if (deg <= 1) {
        const vKey = nodeToKey(v);
        const cur = enhancedRiskMap.get(vKey) ?? 0;
        enhancedRiskMap.set(vKey, Math.max(cur, 80.0));
      }
    }

    // 1.3 Campo de repulsão dos fantasmas
    if (enemies && enemies.length > 0) {
      for (const enemy of enemies) {
        if (enemy.isVulnerable) continue;
        const enemyDistances = this.riskAssessment.computeTopologicalDistances(graph, enemy.pos);
        for (const [k, dist] of enemyDistances.entries()) {
          if (dist > 8) continue;
          let p = 0;
          if (dist === 0) p = 250.0;
          else if (dist === 1) p = 120.0;
          else if (dist === 2) p = 60.0;
          else if (dist === 3) p = 30.0;
          else if (dist === 4) p = 15.0;
          else if (dist === 5) p = 8.0;
          else p = 3.0;

          const cur = enhancedRiskMap.get(k) ?? 0;
          enhancedRiskMap.set(k, Math.max(cur, p * enemy.dangerLevel));
        }
      }
    }

    const searchGraph = new RiskGraphWrapper(graph, enhancedRiskMap);

    // 2. Se há ameaça perigosa por perto e existe Power Pellet segura, desvia para a orbe
    const threateningEnemy = (enemies ?? []).find(
      (e) => !e.isVulnerable && e.dangerLevel > 0.1 && e.graphDistance <= 7
    );

    if (threateningEnemy && powerPellets && powerPellets.size > 0) {
      let bestPellet: Node | null = null;
      let minPelletCost = Infinity;

      for (const pelletKey of powerPellets) {
        const pelletRisk = enhancedRiskMap.get(pelletKey) ?? 0;
        if (pelletRisk > 70.0) continue;
        const pelletNode = keyToNode(pelletKey);
        const res = aStar(searchGraph, currentPos, pelletNode, { portals: portalPairs });
        if (res.found && res.cost < minPelletCost) {
          minPelletCost = res.cost;
          bestPellet = pelletNode;
        }
      }

      if (bestPellet) {
        const planToPellet = aStar(searchGraph, currentPos, bestPellet, { portals: portalPairs });
        if (planToPellet.found && planToPellet.path.length > 1) {
          let realCost = 0;
          for (let i = 0; i < planToPellet.path.length - 1; i++) {
            realCost += graph.getEdgeWeight(planToPellet.path[i], planToPellet.path[i + 1]) ?? 1.0;
          }
          return {
            algorithm,
            fullPath: planToPellet.path,
            keyOrder: [],
            totalCost: realCost,
            totalNodesExpanded: planToPellet.nodesExpanded,
            visitedOrder: planToPellet.visitedOrder,
            isRiskAware: true,
          };
        }
      }
    }

    // 3. Evasão Contínua / Manutenção de Posição Segura
    // Seleciona nós distantes de todos os fantasmas em zonas de alta conectividade (deg >= 2)
    const candidates = graph.vertices.filter((v) => {
      const vKey = nodeToKey(v);
      if (nodeEquals(v, currentPos)) return false;
      if (terrains.get(vKey) === TerrainType.LAVA) return false;
      if (graph.degree(v) < 2) return false;
      const risk = enhancedRiskMap.get(vKey) ?? 0;
      return risk < 20.0;
    });

    let bestTarget: Node | null = null;
    let bestScore = -Infinity;

    for (const candidate of candidates) {
      const dPlayer = Math.abs(candidate[0] - currentPos[0]) + Math.abs(candidate[1] - currentPos[1]);
      if (dPlayer < 3 || dPlayer > 12) continue; // Mantém horizontes locais alcançáveis

      // Distância aos inimigos mais próximos
      let minEnemyDist = Infinity;
      for (const enemy of (enemies ?? [])) {
        const dEnemy = Math.abs(candidate[0] - enemy.pos[0]) + Math.abs(candidate[1] - enemy.pos[1]);
        if (dEnemy < minEnemyDist) minEnemyDist = dEnemy;
      }

      // Pontuação: maximiza distância aos inimigos + grau topológico da célula
      const score = minEnemyDist * 3.0 + graph.degree(candidate) * 2.0 - dPlayer * 0.5;
      if (score > bestScore) {
        bestScore = score;
        bestTarget = candidate;
      }
    }

    // Se encontrou alvo de refúgio ideal, traça rota A*
    if (bestTarget) {
      const planToRefuge = aStar(searchGraph, currentPos, bestTarget, { portals: portalPairs });
      if (planToRefuge.found && planToRefuge.path.length > 1) {
        let realCost = 0;
        for (let i = 0; i < planToRefuge.path.length - 1; i++) {
          realCost += graph.getEdgeWeight(planToRefuge.path[i], planToRefuge.path[i + 1]) ?? 1.0;
        }
        return {
          algorithm,
          fullPath: planToRefuge.path,
          keyOrder: [],
          totalCost: realCost,
          totalNodesExpanded: planToRefuge.nodesExpanded,
          visitedOrder: planToRefuge.visitedOrder,
          isRiskAware: true,
        };
      }
    }

    // Fallback: se nenhum refúgio distante for viável, escolhe o vizinho imediato de menor risco
    const neighbors = graph.neighbors(currentPos);
    let safestNeighbor: Node | null = null;
    let minRisk = Infinity;

    for (const edge of neighbors) {
      const r = enhancedRiskMap.get(nodeToKey(edge.node)) ?? 0;
      if (r < minRisk) {
        minRisk = r;
        safestNeighbor = edge.node;
      }
    }

    if (safestNeighbor) {
      const weight = graph.getEdgeWeight(currentPos, safestNeighbor) ?? 1.0;
      return {
        algorithm,
        fullPath: [currentPos, safestNeighbor],
        keyOrder: [],
        totalCost: weight,
        totalNodesExpanded: 1,
        visitedOrder: [currentPos, safestNeighbor],
        isRiskAware: true,
      };
    }

    return null;
  }
}
