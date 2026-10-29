/**
 * Definições de Tipos Matemáticos para Teoria dos Grafos.
 * Modelo formal: G = (V, E, w)
 */

export type Node = [number, number]; // [linha, coluna] em Z^2

export type NodeKey = string; // Serialização "linha,coluna" para Set/Map

export const nodeToKey = (node: Node): NodeKey => `${node[0]},${node[1]}`;

export const keyToNode = (key: NodeKey): Node => {
  const [r, c] = key.split(',').map(Number);
  return [r, c];
};

export const nodeEquals = (a: Node, b: Node): boolean => a[0] === b[0] && a[1] === b[1];

export const nodeDistanceManhattan = (a: Node, b: Node): number =>
  Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);

export const nodeDistanceEuclidean = (a: Node, b: Node): number =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);
