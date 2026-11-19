import { Node, NodeKey, nodeEquals, nodeToKey } from '../graph/GraphTypes';
import { Graph, NeighborEdge } from '../graph/Graph';
import { AgentPerceptionData, AgentPlan, PlanningAlgorithm } from './AgentTypes';
import { StrategyType, getStrategy } from './strategies';

/**
 * Adaptador de Grafo não-destrutivo com penalidades dinâmicas de risco.
 * Preserva o grafo original intacto e adiciona penalidades virtuais w' = w + risk(v).
 */
export class RiskGraphWrapper extends Graph {
  constructor(
    private baseGraph: Graph,
    private riskMap: Map<NodeKey, number>
  ) {
    super();
  }

  override hasVertex(u: Node): boolean {
    return this.baseGraph.hasVertex(u);
  }

  override hasEdge(u: Node, v: Node): boolean {
    return this.baseGraph.hasEdge(u, v);
  }

  override getEdgeWeight(u: Node, v: Node): number | undefined {
    const baseW = this.baseGraph.getEdgeWeight(u, v);
    if (baseW === undefined) return undefined;
    const penalty = this.riskMap.get(nodeToKey(v)) ?? 0;
    return baseW + penalty;
  }

  override neighbors(u: Node): NeighborEdge[] {
    return this.baseGraph.neighbors(u).map((e) => {
      const penalty = this.riskMap.get(nodeToKey(e.node)) ?? 0;
      return {
        node: e.node,
        weight: e.weight + penalty,
      };
    });
  }

  override get vertices(): Node[] {
    return this.baseGraph.vertices;
  }

  override get order(): number {
    return this.baseGraph.order;
  }

  override get size(): number {
    return this.baseGraph.size;
  }

  override resolveStep(u: Node, dr: number, dc: number): Node | null {
    return this.baseGraph.resolveStep(u, dr, dc);
  }

  override transitionEntry(u: Node, v: Node): Node {
    return this.baseGraph.transitionEntry(u, v);
  }

  override transitionPoints(path: Node[]): Node[] {
    return this.baseGraph.transitionPoints(path);
  }
}

/**
 * Módulo de Planejamento do Agente Autônomo.
 * Orquestra o planejamento delegando para as estratégias modulares (MIN_COST, MIN_TIME, SURVIVAL, MAX_SCORE, FULL_CLEAR),
 * preservando a compatibilidade integral com a arquitetura existente.
 */
export class AgentPlanner {
  plan(
    perception: AgentPerceptionData,
    algorithm: PlanningAlgorithm = 'A*',
    riskMap?: Map<NodeKey, number>,
    strategyType: StrategyType = 'MIN_COST'
  ): AgentPlan | null {
    const strategy = getStrategy(strategyType);
    return strategy.plan(perception, algorithm, riskMap);
  }
}
