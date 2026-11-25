import { StrategyType, IAgentStrategy, MatchMetrics } from './StrategyTypes';
import { MinCostStrategy } from './MinCostStrategy';
import { MinTimeStrategy } from './MinTimeStrategy';
import { SurvivalStrategy } from './SurvivalStrategy';
import { MaxSurvivalTimeStrategy } from './MaxSurvivalTimeStrategy';
import { MaxScoreStrategy } from './MaxScoreStrategy';
import { FullClearStrategy } from './FullClearStrategy';

export * from './StrategyTypes';
export { MinCostStrategy } from './MinCostStrategy';
export { MinTimeStrategy } from './MinTimeStrategy';
export { SurvivalStrategy } from './SurvivalStrategy';
export { MaxSurvivalTimeStrategy } from './MaxSurvivalTimeStrategy';
export { MaxScoreStrategy } from './MaxScoreStrategy';
export { FullClearStrategy } from './FullClearStrategy';

/**
 * Registro de instâncias singleton das estratégias de planejamento.
 */
export const STRATEGIES: Record<StrategyType, IAgentStrategy> = {
  MIN_COST: new MinCostStrategy(),
  MIN_TIME: new MinTimeStrategy(),
  SURVIVAL: new SurvivalStrategy(),
  MAX_SURVIVAL_TIME: new MaxSurvivalTimeStrategy(),
  MAX_SCORE: new MaxScoreStrategy(),
  FULL_CLEAR: new FullClearStrategy(),
};

/**
 * Retorna a implementação da estratégia para o tipo solicitado.
 */
export function getStrategy(type: StrategyType): IAgentStrategy {
  const strategy = STRATEGIES[type];
  if (!strategy) {
    return STRATEGIES.MIN_COST;
  }
  return strategy;
}
