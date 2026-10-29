/**
 * Funções Heurísticas para o Algoritmo A*.
 */

import { Node } from '../graph/GraphTypes';

export const manhattanDistance = (u: Node, v: Node): number => {
  return Math.abs(u[0] - v[0]) + Math.abs(u[1] - v[1]);
};

export const euclideanDistance = (u: Node, v: Node): number => {
  return Math.hypot(u[0] - v[0], u[1] - v[1]);
};

/**
 * Heurística Admissível e Consistente para Grafos Ponderados com Portais Não-Planares.
 * Como o peso mínimo no grid é minWeight (ex: 0.3 na esteira), a menor distância
 * direta possível é minWeight * d_M(u, v).
 * Se existirem portais (peso 1.0), calcula a cota inferior passando pelo atalho.
 */
export const weightedManhattan = (
  u: Node,
  v: Node,
  minWeight = 0.3,
  portals?: Array<[Node, Node]>
): number => {
  const direct = minWeight * (Math.abs(u[0] - v[0]) + Math.abs(u[1] - v[1]));
  if (!portals || portals.length === 0) {
    return direct;
  }

  let best = direct;
  for (const [p1, p2] of portals) {
    // Cota passando por p1 -> p2
    const costP1P2 =
      minWeight * (Math.abs(u[0] - p1[0]) + Math.abs(u[1] - p1[1])) +
      1.0 +
      minWeight * (Math.abs(p2[0] - v[0]) + Math.abs(p2[1] - v[1]));

    // Cota passando por p2 -> p1
    const costP2P1 =
      minWeight * (Math.abs(u[0] - p2[0]) + Math.abs(u[1] - p2[1])) +
      1.0 +
      minWeight * (Math.abs(p1[0] - v[0]) + Math.abs(p1[1] - v[1]));

    if (costP1P2 < best) best = costP1P2;
    if (costP2P1 < best) best = costP2P1;
  }

  return best;
};
