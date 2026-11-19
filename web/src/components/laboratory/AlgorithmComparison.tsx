import React from 'react';
import { PathfindingResult } from '../../game/algorithms/PathfindingTypes';
import styles from './Laboratory.module.css';
interface Props { dijkstraRes: PathfindingResult | null; astarRes: PathfindingResult | null; activeResult: PathfindingResult | null; algorithm: string; gainPercent: number }
export const AlgorithmComparison: React.FC<Props> = ({ dijkstraRes: d, astarRes: a, activeResult: active, algorithm, gainPercent }) => {
  const value = (result: PathfindingResult, key: 'cost' | 'nodesExpanded' | 'executionTimeMs' | 'path') => key === 'cost' ? (result.found ? result.cost.toFixed(1) : '—') : key === 'path' ? (result.found ? String(result.path.length) : '—') : key === 'executionTimeMs' ? `${result.executionTimeMs.toFixed(2)} ms` : String(result.nodesExpanded);
  let interpretation = '';
  if (d && a) {
    const costs = !d.found && !a.found ? 'Nenhum dos algoritmos encontrou caminho.' : d.found && a.found ? (Math.abs(d.cost - a.cost) < 1e-8 ? 'Os dois algoritmos encontraram o mesmo custo mínimo.' : 'Os custos encontrados foram diferentes.') : 'Somente um dos algoritmos encontrou caminho.';
    const expansions = a.nodesExpanded < d.nodesExpanded ? 'A* expandiu menos vértices.' : a.nodesExpanded > d.nodesExpanded ? 'A* expandiu mais vértices.' : 'Ambos expandiram a mesma quantidade de vértices.';
    interpretation = `${costs} ${expansions}`;
  }
  return <aside className={styles.results}><h2>Resultados da busca</h2><div className={styles.mainResult}><span>Custo encontrado</span><strong>{active ? (active.found ? active.cost.toFixed(1) : 'Sem caminho') : '—'}</strong><p>{active?.found ? active.path.length : '—'} vértices no caminho · {algorithm === 'Multi-Goal' ? 'Multiobjetivo' : algorithm}</p></div><h3>Dijkstra × A*</h3>{d && a ? <><table className={styles.comparison}><thead><tr><th>Métrica</th><th>Dijkstra</th><th>A*</th></tr></thead><tbody>{([['Custo','cost'],['Expandidos','nodesExpanded'],['Tempo','executionTimeMs'],['Comprimento','path']] as const).map(([label,key]) => <tr key={key}><th scope="row">{label}</th><td>{value(d,key)}</td><td>{value(a,key)}</td></tr>)}</tbody></table><p className={styles.interpretation}>{interpretation} O tempo de processamento pode variar entre execuções.</p><p className={gainPercent > 0 ? styles.positive : styles.reduction}>Redução de expansões: <strong>{gainPercent.toFixed(1)}%</strong></p><p className={styles.note}>Comparação entre a origem e o destino selecionados, sem incluir as chaves.</p></> : <p className={styles.note}>Aguardando resultados da busca.</p>}</aside>;
};
