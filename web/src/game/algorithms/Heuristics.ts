/**
 * Funções Heurísticas para o Algoritmo A*.
 */

import { Node, nodeEquals } from '../graph/GraphTypes';
import { Graph } from '../graph/Graph';

export const manhattanDistance = (u: Node, v: Node): number => {
  return Math.abs(u[0] - v[0]) + Math.abs(u[1] - v[1]);
};

export const euclideanDistance = (u: Node, v: Node): number => {
  return Math.hypot(u[0] - v[0], u[1] - v[1]);
};

/**
 * Calcula a escala alfa = min w(u, v) / L1(u, v) sobre todos os arcos não laço do grafo.
 * Pela desigualdade triangular da métrica L1:
 * alfa * L1(u, alvo) <= w(u, v) + alfa * L1(v, alvo).
 * Portanto, h(u) = alfa * L1(u, alvo) é estritamente consistente (monótona) e admissível,
 * mesmo com atalhos, múltiplos portais e custos assimétricos.
 */
export function graphManhattanScale(graph: Graph, minWeight?: number): number {
  let scale = Infinity;

  for (const u of graph.vertices) {
    for (const { node: v, weight } of graph.neighbors(u)) {
      if (!nodeEquals(u, v)) {
        const d = manhattanDistance(u, v);
        if (d > 0) {
          const ratio = weight / d;
          if (ratio < scale) {
            scale = ratio;
          }
        }
      }
    }
  }

  if (!Number.isFinite(scale)) {
    scale = 0.0;
  }

  if (minWeight !== undefined) {
    if (!Number.isFinite(minWeight) || minWeight < 0) {
      throw new Error('Escala heurística deve ser finita e não negativa');
    }
    scale = Math.min(scale, minWeight);
  }

  return scale;
}

/**
 * Heurística consistente baseada na escala do grafo.
 */
export const consistentManhattan = (u: Node, v: Node, scale: number): number => {
  return scale * manhattanDistance(u, v);
};

/**
 * Heurística para grid ponderado ortogonal.
 * Quando há portais e o grafo não é fornecido para extrair a escala, utiliza cota segura 0.0
 * para evitar superestimar distâncias reais com múltiplos atalhos encadeados.
 */
export const weightedManhattan = (
  u: Node,
  v: Node,
  minWeight = 0.3,
  portals?: Array<[Node, Node]>
): number => {
  if (portals && portals.length > 0) {
    return 0.0;
  }
  return minWeight * manhattanDistance(u, v);
};
