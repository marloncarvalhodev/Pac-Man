import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../game/core/EventBus', () => ({ EventBus: { emit: vi.fn() } }));
import { AlgorithmComparison } from '../components/laboratory/AlgorithmComparison';
import { SearchControls } from '../components/laboratory/SearchControls';
import { PathfindingResult } from '../game/algorithms/PathfindingTypes';
const result = (nodesExpanded: number, cost = 3): PathfindingResult => ({ path: [[0,0],[0,1]], cost, nodesExpanded, visitedOrder: [], executionTimeMs: 1, algorithmName: 'test', found: true });
describe('interface do laboratório', () => {
  it('identifica visualização e algoritmo selecionados com estados acessíveis', () => {
    const html = renderToStaticMarkup(<SearchControls algorithm="A*" displayMode="MAZE" isPlaying={false} currentStep={0} totalSteps={3} onSelectAlgorithm={() => {}} onSelectDisplayMode={() => {}}/>);
    expect(html).toMatch(/aria-pressed="true"[^>]*>A\*/);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Labirinto/);
    expect(html).toContain('Próximo passo');
  });
  it('descreve aumento de expansões e mantém redução negativa', () => {
    const html = renderToStaticMarkup(<AlgorithmComparison dijkstraRes={result(10)} astarRes={result(12)} activeResult={result(12)} algorithm="A*" gainPercent={-20}/>);
    expect(html).toContain('A* expandiu mais vértices');
    expect(html).toContain('-20.0%');
    expect(html).toContain('1.00 ms');
  });
  it('não informa custo para caminho inexistente', () => {
    const missing = {...result(1), found: false, cost: Infinity};
    const html = renderToStaticMarkup(<AlgorithmComparison dijkstraRes={missing} astarRes={missing} activeResult={missing} algorithm="A*" gainPercent={0}/>);
    expect(html).toContain('Sem caminho');
    expect(html).toContain('Nenhum dos algoritmos encontrou caminho');
    expect(html).not.toContain('Infinity');
  });
});
