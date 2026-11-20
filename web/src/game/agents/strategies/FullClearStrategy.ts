import { dijkstra } from '../../algorithms/Dijkstra';
import { aStar } from '../../algorithms/AStar';
import { solveMultiGoal } from '../../algorithms/MultiGoalSolver';
import { Node, NodeKey, nodeEquals, nodeToKey, keyToNode } from '../../graph/GraphTypes';
import { AgentPerceptionData, AgentPlan, PlanningAlgorithm } from '../AgentTypes';
import { RiskGraphWrapper } from '../AgentPlanner';
import { IAgentStrategy, StrategyType } from './StrategyTypes';

/**
 * Estratégia FULL_CLEAR:
 * Objetiva coletar 100% dos Pac-Dots e todas as chaves antes de concluir a partida na saída.
 *
 * Eficiência Computacional (Anti-Fatorial):
 * Em vez de explorar permutações de N! (completamente inviável para 50~150 dots),
 * adota uma heurística gulosa de Vizinho Mais Próximo com Absorção de Corredor (Path Absorption):
 * 1. A partir da posição atual, seleciona o cluster/dot mais próximo via métrica de grafo.
 * 2. Ao traçar o segmento ótimo com A*, absorve e remove todos os dots atravessados no caminho.
 * 3. Repete o processo em tempo polinomial O(K * (|V| + |E| log |V|)) onde K << N.
 * 4. Após esgotar os Pac-Dots, assegura a coleta das chaves pendentes e finaliza na saída trancada.
 */
export class FullClearStrategy implements IAgentStrategy {
  readonly type: StrategyType = 'FULL_CLEAR';
  readonly name = 'Limpeza Total';
  readonly description = 'Roteamento com absorção de corredores para coletar todos os Pac-Dots e chaves antes de alcançar a saída.';

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
      pacDots,
    } = perception;

    const searchGraph =
      riskMap && riskMap.size > 0 ? new RiskGraphWrapper(graph, riskMap) : graph;

    // Se não há dots restantes informados ou todos já foram consumidos
    if (!pacDots || pacDots.size === 0) {
      const result = solveMultiGoal(searchGraph, currentPos, remainingKeys, goal, {
        algorithm,
        portals: portalPairs,
      });

      if (!result.found || result.path.length === 0) return null;

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

    // Conjunto de trabalho de dots pendentes
    const unvisitedDots = new Set<string>(pacDots);
    const unvisitedKeys = new Set<string>(remainingKeys.map(nodeToKey));

    let current: Node = [currentPos[0], currentPos[1]];
    const fullPath: Node[] = [current];
    const visitedOrder: Node[] = [];
    let totalNodesExpanded = 0;

    // Remove eventuais itens já situados na posição inicial
    unvisitedDots.delete(nodeToKey(current));
    unvisitedKeys.delete(nodeToKey(current));

    // Limite de segurança de iterações para evitar loops em grafos desconexos
    let iterations = 0;
    const maxIterations = 250;

    while (unvisitedDots.size > 0 && iterations < maxIterations) {
      iterations++;

      // Encontra o dot não visitado com menor distância Manhattan preliminar
      let bestDotNode: Node | null = null;
      let minManhattan = Infinity;

      for (const dotKey of unvisitedDots) {
        const dotNode = keyToNode(dotKey);
        const dist = Math.abs(dotNode[0] - current[0]) + Math.abs(dotNode[1] - current[1]);
        if (dist < minManhattan) {
          minManhattan = dist;
          bestDotNode = dotNode;
        }
      }

      if (!bestDotNode) break;

      // Traça o segmento até o dot escolhido via A*
      const segmentResult = algorithm === 'Dijkstra'
        ? dijkstra(searchGraph, current, bestDotNode)
        : aStar(searchGraph, current, bestDotNode, { portals: portalPairs });
      if (!segmentResult.found || segmentResult.path.length <= 1) {
        return null;
      }

      totalNodesExpanded += segmentResult.nodesExpanded;
      visitedOrder.push(...segmentResult.visitedOrder);

      // Concatena o caminho e absorve todos os dots e chaves no trajeto
      for (let i = 1; i < segmentResult.path.length; i++) {
        const node = segmentResult.path[i];
        fullPath.push(node);
        const k = nodeToKey(node);
        unvisitedDots.delete(k);
        unvisitedKeys.delete(k);
      }

      current = segmentResult.path[segmentResult.path.length - 1];
    }

    if (unvisitedDots.size > 0) return null;

    // Após recolher todos os dots, coleta as chaves restantes.
    const remainingKeyNodes: Node[] = Array.from(unvisitedKeys).map(keyToNode);

    if (remainingKeyNodes.length > 0 || !nodeEquals(current, goal)) {
      const finalResult = solveMultiGoal(searchGraph, current, remainingKeyNodes, goal, {
        algorithm,
        portals: portalPairs,
      });

      if (!finalResult.found) return null;
      if (finalResult.path.length > 1) {
        totalNodesExpanded += finalResult.totalNodesExpanded ?? finalResult.nodesExpanded;
        visitedOrder.push(...finalResult.visitedOrder);

        for (let i = 1; i < finalResult.path.length; i++) {
          fullPath.push(finalResult.path[i]);
        }
      }
    }

    // Calcula o custo real sobre o grafo físico
    let realCost = 0;
    for (let i = 0; i < fullPath.length - 1; i++) {
      realCost += graph.getEdgeWeight(fullPath[i], fullPath[i + 1]) ?? 1.0;
    }

    return {
      algorithm,
      fullPath,
      keyOrder: remainingKeys,
      totalCost: realCost,
      totalNodesExpanded,
      visitedOrder,
      isRiskAware: !!riskMap && riskMap.size > 0,
    };
  }
}
