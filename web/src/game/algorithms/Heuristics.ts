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
  portals?: Array<[Node, Node]>,
): number => {
  const weight = Math.max(0, minWeight),
    nodes = [u, v, ...(portals ?? []).flat()];
  const d = nodes.map((a) =>
    nodes.map((b) => weight * manhattanDistance(a, b)),
  );
  for (let i = 0; i < (portals?.length ?? 0); i++) {
    const a = 2 + i * 2,
      b = a + 1;
    d[a][b] = Math.min(d[a][b], 1);
    d[b][a] = Math.min(d[b][a], 1);
  }
  for (let k = 0; k < nodes.length; k++)
    for (let i = 0; i < nodes.length; i++)
      for (let j = 0; j < nodes.length; j++)
        d[i][j] = Math.min(d[i][j], d[i][k] + d[k][j]);
  return d[0][1];
};
