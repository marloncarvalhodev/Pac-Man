import React from 'react';
import { PathfindingResult } from '../../game/algorithms/PathfindingTypes';
import styles from './Laboratory.module.css';

interface AlgorithmComparisonProps {
  dijkstraRes: PathfindingResult | null;
  astarRes: PathfindingResult | null;
  gainPercent: number;
}

export const AlgorithmComparison: React.FC<AlgorithmComparisonProps> = ({
  dijkstraRes,
  astarRes,
  gainPercent,
}) => {
  if (!dijkstraRes || !astarRes) {
    return (
      <div className={styles.comparisonPlaceholder}>
        <p>Aguardando execução dos algoritmos para comparação empírica...</p>
      </div>
    );
  }

  return (
    <div className={styles.comparisonCard}>
      <h4 className={styles.cardHeaderTitle}>Comparativo Científico: Dijkstra vs. A*</h4>
      <p className={styles.academicSubtitle}>
        Ensaios simultâneos sob o mesmo Grafo G = (V, E, w), Origem e Destino.
      </p>

      <table className={styles.comparisonTable}>
        <thead>
          <tr>
            <th>Métrica de Avaliação</th>
            <th>Dijkstra</th>
            <th>A*</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Custo Mínimo Ponderado</td>
            <td className={styles.valEqual}>{dijkstraRes.cost.toFixed(1)}</td>
            <td className={styles.valEqual}>{astarRes.cost.toFixed(1)}</td>
          </tr>
          <tr>
            <td>Nós Expandidos / Visitados</td>
            <td className={styles.valDijkstra}>{dijkstraRes.nodesExpanded} nós</td>
            <td className={styles.valAstar}>{astarRes.nodesExpanded} nós</td>
          </tr>
          <tr>
            <td>Tempo de execução</td>
            <td>{dijkstraRes.executionTimeMs.toFixed(2)} ms</td>
            <td>{astarRes.executionTimeMs.toFixed(2)} ms</td>
          </tr>
          <tr>
            <td>Comprimento da Rota</td>
            <td>{dijkstraRes.path.length} vértices</td>
            <td>{astarRes.path.length} vértices</td>
          </tr>
        </tbody>
      </table>

      <div className={styles.reductionBadge}>
        Redução de expansões: <strong>{gainPercent.toFixed(1)}%</strong>
      </div>

      <div className={styles.academicNote}>
        <p>
          <strong>Comparação:</strong> mesma origem e destino para ambos. O tempo varia entre execuções e menos expansões não garante menor tempo.</p>
      </div>
    </div>
  );
};
