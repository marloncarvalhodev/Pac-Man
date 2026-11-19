import { Node, NodeKey } from '../../graph/GraphTypes';
import { AgentPerceptionData, AgentPlan, PlanningAlgorithm } from '../AgentTypes';

/**
 * Tipos de estratégias de inteligência para o Pac-Man Autônomo.
 */
export type StrategyType = 'MIN_COST' | 'MIN_TIME' | 'SURVIVAL' | 'MAX_SCORE' | 'FULL_CLEAR';

/**
 * Métricas reais coletadas por partida para análise e depuração.
 */
export interface MatchMetrics {
  strategy: StrategyType;
  algorithm: PlanningAlgorithm;
  seed: number;
  time: number; // Tempo simulado decorrido na partida (em segundos, invariante para benchmarks)
  simulatedTime: number; // Tempo simulado explícito (em segundos)
  realTime: number; // Tempo real de relógio decorrido (em segundos)
  simulationSpeed?: number; // Fator de escala de simulação ativo (ex: 0.5, 1.0, 2.0)
  traversedCost: number; // Custo acumulado real percorrido no grafo físico
  score: number; // Pontuação obtida na partida
  pacDots: number; // Total de Pac-Dots coletados
  keys: number; // Total de chaves coletadas
  moves: number; // Quantidade de passos físicos executados
  nodesExpanded: number; // Total cumulativo de nós expandidos pelos algoritmos de busca
  replanCount: number; // Quantidade de replanejamentos executados
  outcome: 'IN_PROGRESS' | 'WON' | 'LOST'; // Resultado final da partida
}

/**
 * Interface comum para estratégias modulares de planejamento do agente autônomo.
 */
export interface IAgentStrategy {
  readonly type: StrategyType;
  readonly name: string;
  readonly description: string;

  /**
   * Constrói o plano de rotas e objetivos do agente com base na estratégia adotada.
   */
  plan(
    perception: AgentPerceptionData,
    algorithm: PlanningAlgorithm,
    riskMap?: Map<NodeKey, number>
  ): AgentPlan | null;
}
