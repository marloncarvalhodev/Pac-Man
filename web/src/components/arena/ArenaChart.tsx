import React, { useEffect, useState } from 'react';
import type { ArenaResult } from '../../game/arena/types';
import { STATUS_LABELS, TACTICS } from '../../game/arena/types';
import styles from '../../pages/ArenaPage.module.css';

export const SERIES_COLORS = [
  '#ffdf32',
  '#7ee8f7',
  '#ff9bc9',
  '#ffae55',
  '#a895ff',
  '#78e2ae',
];
export function ArenaChart({ results }: { results: ArenaResult[] }) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const media = matchMedia('(max-width:760px)');
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const width = compact ? 500 : 800,
    plotWidth = width - 105,
    right = width - 35;
  const keys = [
    ...new Set(results.map((r) => `${r.agent.algorithm}:${r.agent.tactic}`)),
  ];
  const maxTime = Math.max(1, ...results.map((r) => r.elapsedMs / 1000));
  const maxScore = Math.max(100, ...results.map((r) => r.score));
  return (
    <section className={styles.chartSection} aria-labelledby="chart-title">
      <div className={styles.sectionHead}>
        <div>
          <h2 id="chart-title">Tempo × pontuação</h2>
          <p>
            Cada marca representa uma partida. Círculo: concluiu. Cruz: não
            concluiu.
          </p>
        </div>
      </div>
      <div className={styles.chartBox}>
        <svg
          viewBox={`0 0 ${width} 350`}
          role="img"
          aria-label={`Dispersão do tempo simulado versus pontuação de ${results.length} partidas. Valores detalhados na tabela abaixo.`}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line
                x1={70}
                x2={right}
                y1={290 - t * 240}
                y2={290 - t * 240}
                stroke="#263154"
              />
              <text
                x={58}
                y={295 - t * 240}
                textAnchor="end"
                fill="#c0caf9"
                fontSize={compact ? 16 : 12}
              >
                {Math.round(maxScore * t)}
              </text>
              <text
                x={70 + t * plotWidth}
                y={315}
                textAnchor="middle"
                fill="#c0caf9"
                fontSize={compact ? 16 : 12}
              >
                {(maxTime * t).toFixed(1)}
              </text>
            </g>
          ))}
          <line x1={70} x2={70} y1={50} y2={290} stroke="#4d65a8" />
          <line x1={70} x2={right} y1={290} y2={290} stroke="#4d65a8" />
          <text x={70} y={24} fill="#f6f7ff" fontSize={compact ? 18 : 13}>
            Pontuação
          </text>
          <text
            x={right}
            y={342}
            textAnchor="end"
            fill="#f6f7ff"
            fontSize={compact ? 18 : 13}
          >
            Tempo simulado (s)
          </text>
          {results.map((r) => {
            const x = 70 + (r.elapsedMs / 1000 / maxTime) * plotWidth,
              y = 290 - (r.score / maxScore) * 240;
            const color =
              SERIES_COLORS[
                keys.indexOf(`${r.agent.algorithm}:${r.agent.tactic}`) %
                  SERIES_COLORS.length
              ];
            const label = `${r.agent.algorithm}, ${TACTICS[r.agent.tactic].name}, mapa ${r.seed}: ${r.score} pontos em ${(r.elapsedMs / 1000).toFixed(2)} segundos, ${STATUS_LABELS[r.status]}`;
            return (
              <g key={r.id} tabIndex={0} role="img" aria-label={label}>
                <title>{label}</title>
                {r.status === 'COMPLETED' ? (
                  <circle
                    cx={x}
                    cy={y}
                    r={5}
                    fill={color}
                    fillOpacity={0.6}
                    stroke={color}
                  />
                ) : (
                  <path
                    d={`M${x - 4},${y - 4}l8,8m0,-8l-8,8`}
                    stroke={color}
                    strokeWidth={2}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <ul className={styles.chartLegend}>
        {keys.map((key, i) => {
          const r = results.find(
            (r) => `${r.agent.algorithm}:${r.agent.tactic}` === key,
          )!;
          return (
            <li key={key}>
              <i style={{ background: SERIES_COLORS[i] }} />
              {r.agent.algorithm} · {TACTICS[r.agent.tactic].name}
            </li>
          );
        })}
      </ul>
      <p className={styles.note}>
        Uma captura precoce pode produzir um tempo baixo. Por isso, a
        classificação por tempo prioriza a taxa de conclusão, e só compara o
        tempo das partidas concluídas.
      </p>
    </section>
  );
}
