import { describe, it, expect } from 'vitest';
import { runMatch, type ExperimentConfig } from '../game/experiment/Experiment';
import { median } from '../game/experiment/results';
import { SCORE } from '../game/config/MatchRules';

const config: ExperimentConfig = { id: 'regression', seeds: [42, 73, 101], repetitions: 2,
  strategies: ['MIN_COST', 'MIN_TIME', 'SURVIVAL', 'MAX_SCORE', 'FULL_CLEAR'],
  algorithm: 'A*', mode: 'DEMO', objective: 'exit', limitMs: 180000 };

describe('Arena experimental', () => {
  it('reproduz a trajetória agregada em MVM sem reutilizar estado', () => {
    const mvm = { ...config, mode: 'MVM' as const };
    const stable = ({ id, repetition, processingMs, decisionMs, date, ...r }: ReturnType<typeof runMatch>) => r;
    const a = runMatch(mvm, 42, 1, 'MIN_COST');
    runMatch(mvm, 73, 1, 'SURVIVAL');
    expect(stable(runMatch(mvm, 42, 2, 'MIN_COST'))).toEqual(stable(a));
    expect(a.initial.ghosts).toHaveLength(2);
    expect(a.outcome).not.toBe('ERROR');
  });
  it('só registra vitória de coleta completa com todos os pontos físicos', () => {
    const r = runMatch({ ...config, objective: 'dots' }, 101, 1, 'FULL_CLEAR');
    expect(r.outcome).toBe('WON');
    expect(r.dots).toBe(r.initial.dots);
    expect(r.dots).toBeGreaterThan(0);
    expect(r.score).toBeGreaterThanOrEqual(r.dots * SCORE.dot + SCORE.victory);
  });
  it('mede a dispersão de tempos sem atribuir valores a amostras vazias', () => {
    expect(median([])).toBeNull();
    expect(median([9, 3, 5, 7])).toBe(6);
  });
  it('executa as cinco estratégias em três mapas com duas repetições', () => {
    const mvm = { ...config, mode: 'MVM' as const };
    for (const strategy of mvm.strategies) {
      const results = mvm.seeds.flatMap(seed => [1, 2].map(rep => runMatch(mvm, seed, rep, strategy)));
      expect(results.every(r => r.outcome !== 'ERROR')).toBe(true);
      const wins = results.filter(r => r.outcome === 'WON');
      console.log(strategy, results.map(r => r.outcome).join(','), 'mediana(s)',
        median(wins.map(r => r.simulatedMs / 1000)), 'faixa(s)',
        wins.length ? [Math.min(...wins.map(r => r.simulatedMs)), Math.max(...wins.map(r => r.simulatedMs))].map(n => n / 1000).join('–') : '—');
    }
  }, 60000);
});
