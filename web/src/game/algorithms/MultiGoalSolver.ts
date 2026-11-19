/**
 * Multi-Goal Pathfinding (Caminho Composto para Coleta de Chaves e Destino Trancado).
 * Subproblema do Caixeiro Viajante (TSP) no Grafo Ponderado G = (V, E, w).
 */

import { Graph } from '../graph/Graph';
import { Node, nodeToKey, keyToNode, nodeEquals } from '../graph/GraphTypes';
import { PathfindingResult } from './PathfindingTypes';
import { dijkstra } from './Dijkstra';
import { aStar } from './AStar';

export interface MultiGoalOptions {
  algorithm?: 'Dijkstra' | 'A*';
  portals?: Array<[Node, Node]>;
  minWeight?: number;
}

export function solveMultiGoal(
  graph: Graph,
  start: Node,
  keys: Node[],
  goal: Node,
  options: MultiGoalOptions = {}
): PathfindingResult {
  const startTime = performance.now();
  const algorithm = options.algorithm ?? 'A*';

  // 1. Elimina chaves duplicadas e chaves já coletadas no vértice inicial
  const uniqueKeysMap = new Map<string, Node>();
  for (const k of keys) {
    const keyStr = nodeToKey(k);
    if (!nodeEquals(k, start) && !uniqueKeysMap.has(keyStr)) {
      uniqueKeysMap.set(keyStr, k);
    }
  }
  const uniqueKeys = Array.from(uniqueKeysMap.values());

  // 2. Cache de trajetos entre pares direcionados de objetivos
  const cache = new Map<string, PathfindingResult>();

  const singleSearch = (s: Node, g: Node): PathfindingResult => {
    const pairKey = `${nodeToKey(s)}->${nodeToKey(g)}`;
    if (!cache.has(pairKey)) {
      const res =
        algorithm === 'Dijkstra'
          ? dijkstra(graph, s, g)
          : aStar(graph, s, g, {
              portals: options.portals,
              minWeight: options.minWeight,
            });
      cache.set(pairKey, res);
    }
    return cache.get(pairKey)!;
  };

  // Caso base: sem chaves pendentes, busca rota direta ao destino
  if (uniqueKeys.length === 0) {
    const res = singleSearch(start, goal);
    const elapsedMs = performance.now() - startTime;
    return {
      ...res,
      executionTimeMs: elapsedMs,
      algorithmName: `${algorithm} (Direto)`,
      totalNodesExpanded: res.nodesExpanded,
      keyOrder: [],
      segments: res.found ? [res] : [],
    };
  }

  // 3. Enumeração exata com poda Branch-and-Bound para otimização do trajeto
  // Limites computacionais:
  // - Para m <= 8 chaves, o espaço de busca (<= 40.320 permutações) com matriz de distâncias
  //   em cache executa em tempo sub-segundo (< 10ms) sem risco de travamento da UI.
  // - A poda por limite superior (bestCost) descarta precocemente ramos subótimos.
  let bestTotalCost = Infinity;
  let bestSegments: PathfindingResult[] = [];

  const searchBranch = (
    currentPos: Node,
    remaining: Node[],
    accumulatedCost: number,
    currentSegments: PathfindingResult[]
  ) => {
    // Poda: se o custo acumulado já exceder a melhor rota conhecida, descarta o ramo
    if (accumulatedCost >= bestTotalCost) {
      return;
    }

    if (remaining.length === 0) {
      // Todos os objetivos intermediários visitados; busca rota final até a saída
      const finalSeg = singleSearch(currentPos, goal);
      if (!finalSeg.found) return;

      const totalCost = accumulatedCost + finalSeg.cost;
      if (totalCost < bestTotalCost) {
        bestTotalCost = totalCost;
        bestSegments = [...currentSegments, finalSeg];
      }
      return;
    }

    for (let i = 0; i < remaining.length; i++) {
      const nextTarget = remaining[i];
      const seg = singleSearch(currentPos, nextTarget);
      if (!seg.found) continue;

      const nextRemaining = [...remaining.slice(0, i), ...remaining.slice(i + 1)];
      searchBranch(
        nextTarget,
        nextRemaining,
        accumulatedCost + seg.cost,
        [...currentSegments, seg]
      );
    }
  };

  searchBranch(start, uniqueKeys, 0, []);

  // 4. Concatena os caminhos e vértices expandidos dos segmentos selecionados
  const fullPath: Node[] = [];
  const visitedOrder: Node[] = [];

  for (const seg of bestSegments) {
    if (fullPath.length > 0) {
      fullPath.push(...seg.path.slice(1));
    } else {
      fullPath.push(...seg.path);
    }
    visitedOrder.push(...seg.visitedOrder);
  }

  // 5. Contabilização real do esforço computacional:
  // totalNodesExpanded reflete todas as buscas realmente executadas no cache
  const totalWorkNodesExpanded = Array.from(cache.values()).reduce(
    (sum, r) => sum + r.nodesExpanded,
    0
  );

  // Ordem de primeira coleta de cada chave
  const encountered = new Set<string>();
  const keyOrder: Node[] = [];
  for (const node of fullPath) {
    const kStr = nodeToKey(node);
    if (uniqueKeysMap.has(kStr) && !encountered.has(kStr)) {
      encountered.add(kStr);
      keyOrder.push(node);
    }
  }

  const elapsedMs = performance.now() - startTime;

  return {
    path: fullPath,
    cost: bestTotalCost,
    nodesExpanded: totalWorkNodesExpanded,
    totalNodesExpanded: totalWorkNodesExpanded,
    visitedOrder,
    executionTimeMs: elapsedMs,
    algorithmName: `${algorithm} (Multi-Goal: ${uniqueKeys.length} Chaves)`,
    found: fullPath.length > 0 && Number.isFinite(bestTotalCost),
    moves: Math.max(0, fullPath.length - 1),
    keyOrder,
    segments: bestSegments,
  };
}
