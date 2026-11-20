import { runMatch, type ExperimentConfig } from './Experiment';

self.onmessage = ({ data }: MessageEvent<ExperimentConfig>) => {
  for (const seed of data.seeds)
    for (let repetition = 1; repetition <= data.repetitions; repetition++)
      for (const strategy of data.strategies)
        self.postMessage({ result: runMatch(data, seed, repetition, strategy) });
  self.postMessage({ done: true });
};
