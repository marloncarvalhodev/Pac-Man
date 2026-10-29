import React from 'react';
import { VertexInspectionData } from '../../game/core/GameState';
import styles from './Laboratory.module.css';

interface VertexInspectorProps {
  data: VertexInspectionData | null;
}

export const VertexInspector: React.FC<VertexInspectorProps> = ({ data }) => {
  if (!data) {
    return (
      <div className={styles.inspectorEmpty}>
        <p>Passe o mouse ou clique em qualquer célula do labirinto para inspecionar as propriedades formais do vértice no grafo.</p>
      </div>
    );
  }

  return (
    <div className={styles.inspectorCard}>
      <div className={styles.inspectorHeader}>
        <div>
          <span className={styles.inspectorTag}>Vértice v ∈ V</span>
          <h4 className={styles.inspectorCoord}>({data.node[0]}, {data.node[1]})</h4>
        </div>
        <span
          className={styles.terrainBadge}
          style={{
            background:
              data.terrain === 'BOOST'
                ? 'var(--terrain-boost)'
                : data.terrain === 'MUD'
                ? 'var(--terrain-mud)'
                : data.terrain === 'LAVA'
                ? 'var(--terrain-lava)'
                : 'var(--terrain-normal)',
          }}
        >
          {data.terrain}
        </span>
      </div>

      <div className={styles.degreesGrid}>
        <div className={styles.degreeItem}>
          <span className={styles.degNum}>{data.outDegree}</span>
          <span className={styles.degLabel}>Grau Saída deg⁺(v)</span>
        </div>
        <div className={styles.degreeItem}>
          <span className={styles.degNum}>{data.inDegree}</span>
          <span className={styles.degLabel}>Grau Entrada deg⁻(v)</span>
        </div>
        <div className={styles.degreeItem}>
          <span className={styles.degNum}>{data.isJunction ? 'SIM' : 'NÃO'}</span>
          <span className={styles.degLabel}>Cruzamento (deg ≥ 3)</span>
        </div>
      </div>

      <div className={styles.neighborsSection}>
        <h5 className={styles.sectionSub}>Arestas Incidentes e Vizinhos N(v):</h5>
        <div className={styles.neighborsList}>
          {data.neighbors.map((nbr, idx) => (
            <div key={idx} className={styles.neighborItem}>
              <span className={styles.nbrCoord}>({nbr.node[0]}, {nbr.node[1]})</span>
              <span className={styles.nbrArrow}>→</span>
              <span className={styles.nbrWeight}>peso w: {nbr.weight.toFixed(1)}</span>
              <span className={styles.nbrTerrain}>({nbr.terrain})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
