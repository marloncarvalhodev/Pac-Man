import { makeArenaWorld, simulateAgent } from './simulation';
import type { ArenaConfig } from './types';

self.onmessage = (
  event: MessageEvent<{ config: ArenaConfig; batchId: string }>,
) => {
  try {
    const { config, batchId } = event.data;
    for (let round = 1; round <= config.rounds; round++) {
      const world = makeArenaWorld((config.seed + round - 1) >>> 0);
      // Reverse order every round so the same agent does not always get cold-cache timing.
      const agents = round % 2 ? config.agents : [...config.agents].reverse();
      for (const agent of agents) {
        const result = simulateAgent(
          world,
          agent,
          config,
          batchId,
          round,
          round === 1 && config.agents.indexOf(agent) < 2,
        );
        result.fieldSize = config.agents.length;
        self.postMessage({ type: 'result', result });
      }
    }
    self.postMessage({ type: 'done' });
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Falha na simulação.',
    });
  }
};
