import React, { useMemo, useState } from 'react';
import { Route, Eye, EyeOff } from 'lucide-react';
import { MazeGenerator } from '../../game/graph/MazeGenerator';
import { dijkstra } from '../../game/algorithms/Dijkstra';
import { nodeToKey } from '../../game/graph/GraphTypes';
import styles from './MazePreview.module.css';

export const MazePreview: React.FC = () => {
  const [showRoute, setShowRoute] = useState(true);
  const { world, result } = useMemo(() => {
    const world = new MazeGenerator(17, 17, 42).generateWorld(0.15, 0, 2);
    return { world, result: dijkstra(world.graph, world.start, world.goal) };
  }, []);
  const points = result.path
    .map(([row, col]) => `${col * 24 + 12},${row * 24 + 12}`)
    .join(' ');

  return (
    <figure className={styles.preview}>
      <div className={styles.toolbar}>
        <span>
          <Route size={15} /> Um caminho possível
        </span>
        <button
          onClick={() => setShowRoute((value) => !value)}
          aria-pressed={showRoute}
          aria-label={
            showRoute
              ? 'Ocultar caminho da prévia'
              : 'Mostrar caminho da prévia'
          }
        >
          {showRoute ? <Eye size={15} /> : <EyeOff size={15} />}
          <span>{showRoute ? 'Ocultar rota' : 'Mostrar rota'}</span>
        </button>
      </div>
      <svg
        viewBox="0 0 408 408"
        className={styles.maze}
        role="img"
        aria-label={`Prévia de um labirinto gerado com a semente 42. ${showRoute ? 'A linha amarela mostra o caminho calculado por Dijkstra.' : 'O caminho calculado está oculto.'}`}
      >
        {world.grid.flatMap((row, r) =>
          row.map((wall, c) =>
            wall ? (
              <rect
                key={`${r}-${c}`}
                x={c * 24 + 3}
                y={r * 24 + 3}
                width="18"
                height="18"
                rx="4"
                className={styles.wall}
              />
            ) : (
              <circle
                key={`${r}-${c}`}
                cx={c * 24 + 12}
                cy={r * 24 + 12}
                r="1.6"
                className={styles.dot}
              />
            ),
          ),
        )}
        {showRoute && (
          <polyline
            key={points}
            className={styles.route}
            points={points}
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {world.keys.map((node) => (
          <rect
            key={nodeToKey(node)}
            x={node[1] * 24 + 8}
            y={node[0] * 24 + 8}
            width="8"
            height="8"
            rx="2"
            fill="#ffda55"
          />
        ))}
        <circle
          cx={world.start[1] * 24 + 12}
          cy={world.start[0] * 24 + 12}
          r="7"
          fill="#ffda55"
        />
        <circle
          cx={world.goal[1] * 24 + 12}
          cy={world.goal[0] * 24 + 12}
          r="7"
          fill="#75dfb0"
        />
      </svg>
      <div className={styles.metrics}>
        <span>
          <i />
          Dijkstra <b>custo {result.cost.toFixed(1)}</b>
        </span>
        <span>{world.graph.order} vértices</span>
        <span>semente 42</span>
      </div>
      <figcaption>
        VISUALIZAÇÃO ILUSTRATIVA{' '}
        <span>Mapa gerado pelo projeto · origem até a saída</span>
      </figcaption>
    </figure>
  );
};
