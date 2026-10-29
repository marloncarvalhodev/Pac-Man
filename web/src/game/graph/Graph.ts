/**
 * Representação formal de Grafo Ponderado G = (V, E, w).
 * Implementado via Listas de Adjacência (Hash Map) para consultas O(1).
 */

import { Node, NodeKey, nodeToKey, keyToNode } from './GraphTypes';

export interface NeighborEdge {
  node: Node;
  weight: number;
}

export class Graph {
  // Mapeamento: uKey -> { vKey: weight }
  private _adj: Map<NodeKey, Map<NodeKey, number>> = new Map();

  /**
   * Conjunto de vértices V do grafo.
   */
  get vertices(): Node[] {
    return Array.from(this._adj.keys()).map(keyToNode);
  }

  /**
   * Vértices como chaves serializadas.
   */
  get vertexKeys(): Set<NodeKey> {
    return new Set(this._adj.keys());
  }

  /**
   * Ordem do grafo |V| (número de vértices).
   */
  get order(): number {
    return this._adj.size;
  }

  /**
   * Tamanho do grafo |E| (total de conexões direcionadas ou pares).
   */
  get size(): number {
    let total = 0;
    for (const nbrs of this._adj.values()) {
      total += nbrs.size;
    }
    return Math.floor(total / 2);
  }

  /**
   * Adiciona um vértice u pertencente a V, caso ainda não exista.
   */
  addVertex(u: Node): void {
    const uKey = nodeToKey(u);
    if (!this._adj.has(uKey)) {
      this._adj.set(uKey, new Map());
    }
  }

  /**
   * Adiciona uma aresta e = (u, v) com peso w(e) ao grafo.
   */
  addEdge(u: Node, v: Node, weight = 1.0, bidirectional = true): void {
    this.addVertex(u);
    this.addVertex(v);

    const uKey = nodeToKey(u);
    const vKey = nodeToKey(v);

    this._adj.get(uKey)!.set(vKey, weight);

    if (bidirectional) {
      this._adj.get(vKey)!.set(uKey, weight);
    }
  }

  /**
   * Retorna os vizinhos de u e o peso associado da aresta.
   */
  neighbors(u: Node): NeighborEdge[] {
    const uKey = nodeToKey(u);
    const nbrMap = this._adj.get(uKey);
    if (!nbrMap) return [];

    const result: NeighborEdge[] = [];
    for (const [vKey, weight] of nbrMap.entries()) {
      result.push({
        node: keyToNode(vKey),
        weight,
      });
    }
    return result;
  }

  /**
   * Retorna o peso w(u, v) da aresta entre u e v, ou undefined se não existir.
   */
  getEdgeWeight(u: Node, v: Node): number | undefined {
    const uKey = nodeToKey(u);
    const vKey = nodeToKey(v);
    return this._adj.get(uKey)?.get(vKey);
  }

  /**
   * Grau de saída de um vértice (deg+(u)).
   */
  outDegree(u: Node): number {
    const uKey = nodeToKey(u);
    return this._adj.get(uKey)?.size ?? 0;
  }

  /**
   * Grau de entrada de um vértice (deg-(u)).
   */
  inDegree(u: Node): number {
    const uKey = nodeToKey(u);
    let count = 0;
    for (const nbrs of this._adj.values()) {
      if (nbrs.has(uKey)) count++;
    }
    return count;
  }

  /**
   * Grau geral deg(u).
   */
  degree(u: Node): number {
    return this.outDegree(u);
  }

  /**
   * Verifica se existe aresta de u para v em E.
   */
  hasEdge(u: Node, v: Node): boolean {
    const uKey = nodeToKey(u);
    const vKey = nodeToKey(v);
    return this._adj.get(uKey)?.has(vKey) ?? false;
  }

  /**
   * Limpa todos os vértices e arestas do grafo.
   */
  clear(): void {
    this._adj.clear();
  }

  /**
   * Retorna os vértices de bifurcação / cruzamento com grau >= 3.
   */
  getJunctions(): Node[] {
    return this.vertices.filter((v) => this.degree(v) >= 3);
  }

  /**
   * Algoritmo de Tarjan para encontrar Vértices de Articulação (Pontos de Corte).
   */
  getArticulationPoints(): Node[] {
    const visited = new Set<NodeKey>();
    const tin = new Map<NodeKey, number>();
    const low = new Map<NodeKey, number>();
    const isArticulation = new Set<NodeKey>();
    let timer = 0;

    const dfs = (uKey: NodeKey, pKey: NodeKey | null = null) => {
      visited.add(uKey);
      tin.set(uKey, timer);
      low.set(uKey, timer);
      timer++;
      let children = 0;

      const nbrs = this._adj.get(uKey);
      if (nbrs) {
        for (const toKey of nbrs.keys()) {
          if (toKey === pKey) continue;
          if (visited.has(toKey)) {
            low.set(uKey, Math.min(low.get(uKey)!, tin.get(toKey)!));
          } else {
            dfs(toKey, uKey);
            low.set(uKey, Math.min(low.get(uKey)!, low.get(toKey)!));
            if (low.get(toKey)! >= tin.get(uKey)! && pKey !== null) {
              isArticulation.add(uKey);
            }
            children++;
          }
        }
      }

      if (pKey === null && children > 1) {
        isArticulation.add(uKey);
      }
    };

    for (const vKey of this._adj.keys()) {
      if (!visited.has(vKey)) {
        dfs(vKey, null);
      }
    }

    return Array.from(isArticulation).map(keyToNode);
  }
}
