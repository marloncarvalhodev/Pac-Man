import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ExperimentCharts } from '../components/ExperimentCharts';
import type { ExperimentResult } from '../game/experiment/Experiment';

const row = (changes: Partial<ExperimentResult> = {}): ExperimentResult => ({
  id:'one',batch:'batch',engine:1,date:'2026-11-20T00:00:00Z',seed:42,repetition:1,
  map:{rows:25,cols:25,loops:.1,portals:1,keys:2},strategy:'MIN_COST',algorithm:'A*',
  mode:'MVM',objective:'exit',timeScale:1,limitMs:120000,outcome:'LOST',reason:'Captura',
  initial:{player:[1,1],ghosts:[[5,5]],health:100,dots:100},simulatedMs:20000,
  processingMs:2,decisionMs:1,cost:50,score:100,dots:10,moves:20,expanded:100,replans:2,
  ...changes,
});
describe('interpretação dos gráficos experimentais', () => {
  it('não trata um resultado parcial de uma única estratégia como empate', () => {
    const html=renderToStaticMarkup(<ExperimentCharts results={[row({outcome:'WON'})]}/>);
    expect(html).toContain('Apenas uma estratégia possui resultados');
    expect(html).not.toContain('empataram');
  });
  it('calcula taxa usando todas as partidas e limita a conclusão ao lote', () => {
    const html=renderToStaticMarkup(<ExperimentCharts results={[
      row({outcome:'WON'}),row(),row({strategy:'SURVIVAL',outcome:'WON'}),
      row({strategy:'SURVIVAL',outcome:'WON',repetition:2}),
    ]}/>);
    expect(html).toContain('50%');expect(html).toContain('100%');
    expect(html).toContain('Sobrevivência teve o maior valor neste lote');
    expect(html).toContain('não demonstra superioridade em outros mapas');
  });
  it('não interpreta ausência de vitórias como conclusão de tempo zero', () => {
    const html=renderToStaticMarkup(<ExperimentCharts results={[
      row(),row({strategy:'SURVIVAL',outcome:'TIMEOUT'}),
    ]}/>);
    expect(html).toContain('Nenhuma estratégia venceu neste lote');
    expect(html).toContain('Não há tempo de conclusão para comparar');
    expect(html).toContain('Amostra curta');
  });
  it('explicita empates sem eleger uma estratégia arbitrária', () => {
    const html=renderToStaticMarkup(<ExperimentCharts results={[
      row({outcome:'WON'}),row({strategy:'SURVIVAL',outcome:'WON'}),
    ]}/>);
    expect(html).toContain('As estratégias empataram nesta medida');
    expect(html).not.toContain('teve o maior valor');
    for(const outcome of ['Vitória','Derrota','Tempo excedido','Rota inviável','Erro técnico']) expect(html).toContain(outcome);
  });
});
