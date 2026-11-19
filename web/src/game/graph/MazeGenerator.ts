/**
 * Gerador de Labirintos e Mundos Ponderados baseado em Teoria dos Grafos.
 * Constrói Árvore Geradora via DFS (Recursive Backtracker) com abertura
 * controlada de ciclos, terrenos heterogêneos, portais não-planares e chaves.
 */

import { Node, NodeKey, nodeToKey, keyToNode } from './GraphTypes';
import { Graph } from './Graph';
import { TerrainType, TERRAIN_COSTS } from './Terrain';
import { PriorityQueue } from '../algorithms/PriorityQueue';
import { GAME_SPEED_CONFIG } from '../config/GameConfig';

export interface WorldData {
  rows: number;
  cols: number;
  grid: number[][]; // 1 = Parede, 0 = Caminho livre
  graph: Graph;
  start: Node;
  goal: Node;
  terrains: Map<NodeKey, TerrainType>;
  portalPairs: Array<[Node, Node]>;
  keys: Node[];
  powerPellets: Node[];
  enemySpawn: Node;
  enemySpawn2: Node;
  seed: number;
}

/**
 * PRNG pseudo-aleatório baseado em Mulberry32 para geração determinística e reproduzível.
 */
export class PRNG {
  private s: number;

  constructor(seed: number) {
    this.s = seed | 0;
    if (this.s === 0) this.s = 1337;
  }

  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(min + this.next() * (max - min + 1));
  }

  choice<T>(items: T[]): T {
    const idx = this.nextInt(0, items.length - 1);
    return items[idx];
  }
}

/**
 * Constrói o grafo de movimento onde cada arco representa um comando físico.
 * Entrar na célula do portal resulta em salto para a outra extremidade.
 * O custo é o do terreno da célula de entrada.
 */
export function buildMovementGraph(
  terrains: Map<NodeKey, TerrainType>,
  portalPairs: Array<[Node, Node]>
): Graph {
  const portals = new Map<NodeKey, Node>();
  for (const [a, b] of portalPairs) {
    const aKey = nodeToKey(a);
    const bKey = nodeToKey(b);
    if (
      aKey === bKey ||
      !terrains.has(aKey) ||
      !terrains.has(bKey) ||
      portals.has(aKey) ||
      portals.has(bKey)
    ) {
      throw new Error('Extremidades de portais devem ser transitáveis e únicas');
    }
    portals.set(aKey, b);
    portals.set(bKey, a);
  }

  const graph = new Graph();
  for (const key of terrains.keys()) {
    graph.addVertex(keyToNode(key));
  }

  const directions: Array<[number, number]> = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ];

  for (const u of graph.vertices) {
    const [r, c] = u;
    for (const [dr, dc] of directions) {
      const entry: Node = [r + dr, c + dc];
      const entryKey = nodeToKey(entry);
      if (terrains.has(entryKey)) {
        const dest = portals.get(entryKey) ?? entry;
        const terrain = terrains.get(entryKey)!;
        const cost = TERRAIN_COSTS[terrain];
        graph.addStep(u, entry, dest);
        graph.addEdge(u, dest, cost, false);
        graph.setEntry(u, dest, entry);
      }
    }
  }

  return graph;
}

/**
 * Valida conectividade forte do grafo a partir e em direção ao vértice inicial.
 */
export function isGraphStronglyConnected(
  graph: Graph,
  openCells: Node[],
  startCell: Node
): boolean {
  if (openCells.length === 0) return true;

  // 1. Busca direta (todos os vértices alcançáveis a partir de startCell)
  const forwardSeen = new Set<NodeKey>([nodeToKey(startCell)]);
  const forwardStack: Node[] = [startCell];
  while (forwardStack.length > 0) {
    const curr = forwardStack.pop()!;
    for (const { node: nbr } of graph.neighbors(curr)) {
      const nKey = nodeToKey(nbr);
      if (!forwardSeen.has(nKey)) {
        forwardSeen.add(nKey);
        forwardStack.push(nbr);
      }
    }
  }
  if (forwardSeen.size !== openCells.length) return false;

  // 2. Busca reversa (todos os vértices conseguem alcançar startCell)
  const reverseAdj = new Map<NodeKey, NodeKey[]>();
  for (const c of openCells) {
    reverseAdj.set(nodeToKey(c), []);
  }
  for (const u of openCells) {
    const uKey = nodeToKey(u);
    for (const { node: v } of graph.neighbors(u)) {
      reverseAdj.get(nodeToKey(v))?.push(uKey);
    }
  }

  const reverseSeen = new Set<NodeKey>([nodeToKey(startCell)]);
  const reverseStack: NodeKey[] = [nodeToKey(startCell)];
  while (reverseStack.length > 0) {
    const currKey = reverseStack.pop()!;
    const preds = reverseAdj.get(currKey) ?? [];
    for (const pKey of preds) {
      if (!reverseSeen.has(pKey)) {
        reverseSeen.add(pKey);
        reverseStack.push(pKey);
      }
    }
  }

  return reverseSeen.size === openCells.length;
}

/**
 * Computa o custo mínimo ponderado do caminho mais curto de todos os vértices
 * em direção a um nó destino no grafo direcionado com suporte a portais.
 * Utiliza o algoritmo de Dijkstra na versão reversa (transposta) com Min-Heap.
 */
export function computeWeightedShortestPathsTo(
  graph: Graph,
  destination: Node
): Map<NodeKey, number> {
  const dist = new Map<NodeKey, number>();
  const pq = new PriorityQueue<{ key: NodeKey; dist: number }>();
  const destKey = nodeToKey(destination);

  // Mapeia predecessores: se u -> v com peso w, v possui aresta incidente de u
  const reverseAdj = new Map<NodeKey, Array<{ from: NodeKey; weight: number }>>();
  for (const u of graph.vertices) {
    const uKey = nodeToKey(u);
    for (const { node: v, weight } of graph.neighbors(u)) {
      const vKey = nodeToKey(v);
      let list = reverseAdj.get(vKey);
      if (!list) {
        list = [];
        reverseAdj.set(vKey, list);
      }
      list.push({ from: uKey, weight });
    }
  }

  dist.set(destKey, 0);
  pq.enqueue({ key: destKey, dist: 0 }, 0);

  while (!pq.isEmpty()) {
    const item = pq.dequeue()!;
    const currentDist = item.dist;
    if (currentDist !== dist.get(item.key)) continue;

    const predecessors = reverseAdj.get(item.key) ?? [];
    for (const { from, weight } of predecessors) {
      const tentative = currentDist + weight;
      if (tentative < (dist.get(from) ?? Infinity)) {
        dist.set(from, tentative);
        pq.enqueue({ key: from, dist: tentative }, tentative);
      }
    }
  }

  return dist;
}

/**
 * Computa o tempo mínimo estimado em milissegundos para um fantasma deslocar-se
 * de um ponto de origem 'from' até o destino 'to', considerando o caminho ótimo ponderado.
 */
export function computeGhostReachTimeMs(
  graph: Graph,
  from: Node,
  to: Node,
  ghostBaseDelay = GAME_SPEED_CONFIG.GHOST_BASE_DELAY_MS
): number {
  const dists = computeWeightedShortestPathsTo(graph, to);
  const cost = dists.get(nodeToKey(from)) ?? Infinity;
  return cost * ghostBaseDelay;
}

export class MazeGenerator {
  public readonly rows: number;
  public readonly cols: number;
  private prng: PRNG;
  public readonly seed: number;

  constructor(rows = 25, cols = 25, seed?: number) {
    this.rows = rows % 2 !== 0 ? rows : rows + 1;
    this.cols = cols % 2 !== 0 ? cols : cols + 1;
    this.seed =
      typeof seed === 'number' && Number.isFinite(seed)
        ? seed
        : Math.floor(Math.random() * 1000000) + 1;
    this.prng = new PRNG(this.seed);
  }

  /**
   * Gera a matriz de paredes (1) e corredores (0) via DFS Recursive Backtracker.
   */
  private carveMaze(extraLoopsRatio: number): number[][] {
    const grid: number[][] = Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => 1)
    );

    const startCell: Node = [1, 1];
    grid[startCell[0]][startCell[1]] = 0;

    const stack: Node[] = [startCell];
    const visited = new Set<NodeKey>([nodeToKey(startCell)]);
    const directions: Array<[number, number]> = [
      [-2, 0],
      [2, 0],
      [0, -2],
      [0, 2],
    ];

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const [r, c] = current;

      const unvisited: Array<{ neighbor: Node; wall: Node }> = [];
      for (const [dr, dc] of directions) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 1 && nr < this.rows - 1 && nc >= 1 && nc < this.cols - 1) {
          const neighbor: Node = [nr, nc];
          if (!visited.has(nodeToKey(neighbor))) {
            const wall: Node = [r + dr / 2, c + dc / 2];
            unvisited.push({ neighbor, wall });
          }
        }
      }

      if (unvisited.length > 0) {
        const selected = this.prng.choice(unvisited);
        grid[selected.wall[0]][selected.wall[1]] = 0;
        grid[selected.neighbor[0]][selected.neighbor[1]] = 0;
        visited.add(nodeToKey(selected.neighbor));
        stack.push(selected.neighbor);
      } else {
        stack.pop();
      }
    }

    // Adiciona ciclos controlados removendo paredes internas para enriquecer as rotas
    if (extraLoopsRatio > 0.0) {
      for (let r = 1; r < this.rows - 1; r++) {
        for (let c = 1; c < this.cols - 1; c++) {
          if (grid[r][c] === 1) {
            const isHDivider =
              grid[r][c - 1] === 0 &&
              grid[r][c + 1] === 0 &&
              grid[r - 1][c] === 1 &&
              grid[r + 1][c] === 1;
            const isVDivider =
              grid[r - 1][c] === 0 &&
              grid[r + 1][c] === 0 &&
              grid[r][c - 1] === 1 &&
              grid[r][c + 1] === 1;

            if ((isHDivider || isVDivider) && this.prng.next() < extraLoopsRatio) {
              grid[r][c] = 0;
            }
          }
        }
      }
    }

    return grid;
  }

  /**
   * Constrói o mundo completo com terrenos, portais e objetivos.
   */
  generateWorld(
    extraLoopsRatio = 0.10,
    numPortalPairs = 1,
    numKeys = 2
  ): WorldData {
    const grid = this.carveMaze(extraLoopsRatio);
    const startCell: Node = [1, 1];
    const endCell: Node = [this.rows - 2, this.cols - 2];
    grid[startCell[0]][startCell[1]] = 0;
    grid[endCell[0]][endCell[1]] = 0;

    // Todas as células livres
    const openCells: Node[] = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (grid[r][c] === 0) {
          openCells.push([r, c]);
        }
      }
    }

    // Mapa de terrenos
    const terrains = new Map<NodeKey, TerrainType>();
    for (const cell of openCells) {
      terrains.set(nodeToKey(cell), TerrainType.NORMAL);
    }

    // Clusters de Lama (MUD) - peso 4.0
    const numMudClusters = Math.max(2, Math.floor((this.rows * this.cols) / 180));
    for (let i = 0; i < numMudClusters; i++) {
      const seedCell = this.prng.choice(openCells);
      if (nodeToKey(seedCell) === nodeToKey(startCell) || nodeToKey(seedCell) === nodeToKey(endCell)) continue;
      let curr = seedCell;
      const clusterSize = this.prng.nextInt(3, 7);
      for (let s = 0; s < clusterSize; s++) {
        terrains.set(nodeToKey(curr), TerrainType.MUD);
        const [r, c] = curr;
        const nbrs: Node[] = [
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1],
        ].filter((n) => terrains.has(nodeToKey(n as Node))) as Node[];
        if (nbrs.length > 0) {
          curr = this.prng.choice(nbrs);
        }
      }
    }

    // Poças de Lava (LAVA) - peso 8.0
    const numLavaPools = Math.max(2, Math.floor((this.rows * this.cols) / 220));
    for (let i = 0; i < numLavaPools; i++) {
      const seedCell = this.prng.choice(openCells);
      if (nodeToKey(seedCell) === nodeToKey(startCell) || nodeToKey(seedCell) === nodeToKey(endCell)) continue;
      let curr = seedCell;
      const poolSize = this.prng.nextInt(2, 4);
      for (let s = 0; s < poolSize; s++) {
        if (nodeToKey(curr) !== nodeToKey(startCell) && nodeToKey(curr) !== nodeToKey(endCell)) {
          terrains.set(nodeToKey(curr), TerrainType.LAVA);
        }
        const [r, c] = curr;
        const nbrs: Node[] = [
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1],
        ].filter(
          (n) =>
            terrains.has(nodeToKey(n as Node)) &&
            nodeToKey(n as Node) !== nodeToKey(startCell) &&
            nodeToKey(n as Node) !== nodeToKey(endCell)
        ) as Node[];
        if (nbrs.length > 0) {
          curr = this.prng.choice(nbrs);
        }
      }
    }

    // Esteiras de Aceleração (BOOST) - peso 0.3
    const numBoostStrips = Math.max(2, Math.floor((this.rows * this.cols) / 200));
    for (let i = 0; i < numBoostStrips; i++) {
      const seedCell = this.prng.choice(openCells);
      const [dr, dc] = this.prng.choice([
        [0, 1],
        [1, 0],
      ]);
      let curr = seedCell;
      const stripLen = this.prng.nextInt(2, 5);
      for (let s = 0; s < stripLen; s++) {
        const key = nodeToKey(curr);
        if (
          terrains.has(key) &&
          key !== nodeToKey(startCell) &&
          key !== nodeToKey(endCell) &&
          terrains.get(key) !== TerrainType.LAVA
        ) {
          terrains.set(key, TerrainType.BOOST);
        }
        const nextC: Node = [curr[0] + dr, curr[1] + dc];
        if (terrains.has(nodeToKey(nextC))) {
          curr = nextC;
        } else {
          break;
        }
      }
    }

    // Garante que start e goal sejam pisos normais
    terrains.set(nodeToKey(startCell), TerrainType.NORMAL);
    terrains.set(nodeToKey(endCell), TerrainType.NORMAL);

    // Seleciona pares de Portais (Conexões Não Locais)
    // Entrar no piso do portal custa 1.0 e termina na outra extremidade
    const candidatePortalCells = openCells.filter((c) => {
      const k = nodeToKey(c);
      return (
        k !== nodeToKey(startCell) &&
        k !== nodeToKey(endCell) &&
        terrains.get(k) === TerrainType.NORMAL
      );
    });

    const portalPairs: Array<[Node, Node]> = [];
    const minPortalDist = Math.floor((this.rows + this.cols) / 3);

    for (let i = 0; i < numPortalPairs; i++) {
      if (candidatePortalCells.length < 4) break;
      const p1 = this.prng.choice(candidatePortalCells);
      const distant = candidatePortalCells.filter(
        (c) => Math.abs(c[0] - p1[0]) + Math.abs(c[1] - p1[1]) >= minPortalDist
      );
      if (distant.length > 0) {
        const p2 = this.prng.choice(distant);
        portalPairs.push([p1, p2]);

        // Testa conectividade forte: portais não podem isolar nenhuma região do grafo
        const candidateGraph = buildMovementGraph(terrains, portalPairs);
        if (!isGraphStronglyConnected(candidateGraph, openCells, startCell)) {
          portalPairs.pop();
          continue;
        }

        // Remove dos candidatos
        const p1Key = nodeToKey(p1);
        const p2Key = nodeToKey(p2);
        const idx1 = candidatePortalCells.findIndex((c) => nodeToKey(c) === p1Key);
        if (idx1 >= 0) candidatePortalCells.splice(idx1, 1);
        const idx2 = candidatePortalCells.findIndex((c) => nodeToKey(c) === p2Key);
        if (idx2 >= 0) candidatePortalCells.splice(idx2, 1);
      }
    }

    // Grafo G = (V, E, w) com transições de movimento consistentes
    const graph = buildMovementGraph(terrains, portalPairs);

    // Chaves Colecionáveis Douradas
    const portalNodes = new Set<NodeKey>();
    for (const [p1, p2] of portalPairs) {
      portalNodes.add(nodeToKey(p1));
      portalNodes.add(nodeToKey(p2));
    }

    const candidateKeys = openCells.filter((c) => {
      const k = nodeToKey(c);
      return (
        k !== nodeToKey(startCell) &&
        k !== nodeToKey(endCell) &&
        !portalNodes.has(k) &&
        terrains.get(k) !== TerrainType.LAVA &&
        Math.abs(c[0] - startCell[0]) + Math.abs(c[1] - startCell[1]) >= 4
      );
    });

    const keys: Node[] = [];
    const toSpawnKeys = Math.min(numKeys, candidateKeys.length);
    for (let k = 0; k < toSpawnKeys; k++) {
      const picked = this.prng.choice(candidateKeys);
      keys.push(picked);
      const pKey = nodeToKey(picked);
      const idx = candidateKeys.findIndex((c) => nodeToKey(c) === pKey);
      if (idx >= 0) candidateKeys.splice(idx, 1);
    }

    // Orbes de Poder (Power Pellets) em cantos estratégicos (Nordeste e Sudoeste)
    const reservedForPellets = new Set<NodeKey>([
      ...keys.map(nodeToKey),
      ...Array.from(portalNodes),
      nodeToKey(startCell),
      nodeToKey(endCell),
    ]);

    const cornerNE: Node = [1, this.cols - 2];
    const cornerSW: Node = [this.rows - 2, 1];

    const findClosestOpen = (target: Node): Node => {
      const sorted = openCells
        .filter(
          (c) =>
            !reservedForPellets.has(nodeToKey(c)) &&
            terrains.get(nodeToKey(c)) !== TerrainType.LAVA
        )
        .sort((a, b) => {
          const dA = Math.abs(a[0] - target[0]) + Math.abs(a[1] - target[1]);
          const dB = Math.abs(b[0] - target[0]) + Math.abs(b[1] - target[1]);
          return dA - dB;
        });
      return sorted[0] ?? target;
    };

    const pellet1 = findClosestOpen(cornerNE);
    reservedForPellets.add(nodeToKey(pellet1));
    const pellet2 = findClosestOpen(cornerSW);
    reservedForPellets.add(nodeToKey(pellet2));
    const powerPellets: Node[] = [pellet1, pellet2];

    // Spawns dos Inimigos (1: Fantasma Vermelho Perseguidor, 2: Fantasma Roxo Interceptor)
    // Avalia a distância topológica E o tempo mínimo ponderado até o início (startCell),
    // levando em conta pesos de terrenos (Lava, Mud, Boost), portais e velocidade dos fantasmas.
    const topoDistFromStart = new Map<NodeKey, number>();
    const bfsQueue: Node[] = [startCell];
    topoDistFromStart.set(nodeToKey(startCell), 0);

    while (bfsQueue.length > 0) {
      const curr = bfsQueue.shift()!;
      const d = topoDistFromStart.get(nodeToKey(curr))!;
      for (const { node: nbr } of graph.neighbors(curr)) {
        const nKey = nodeToKey(nbr);
        if (!topoDistFromStart.has(nKey)) {
          topoDistFromStart.set(nKey, d + 1);
          bfsQueue.push(nbr);
        }
      }
    }

    // Calcula os custos mínimos ponderados reais de cada célula em direção a startCell via Dijkstra reverso
    const weightedDistToStart = computeWeightedShortestPathsTo(graph, startCell);

    const maxHops = Math.max(...Array.from(topoDistFromStart.values()));
    const validWeightedCosts = Array.from(weightedDistToStart.values()).filter(Number.isFinite);
    const maxWeightedCost = validWeightedCosts.length > 0 ? Math.max(...validWeightedCosts) : 20;
    const maxReachTimeMs = maxWeightedCost * GAME_SPEED_CONFIG.GHOST_BASE_DELAY_MS;

    // Critérios combinados:
    // 1. Distância topológica mínima em arestas (BFS): 12 a 20 arestas
    // 2. Tempo mínimo ponderado de percurso: pelo menos 3500ms (até 5500ms)
    let minSafeHops = Math.max(12, Math.min(20, Math.floor(maxHops * 0.50)));
    let minSafeTimeMs = Math.max(3500, Math.min(5500, Math.floor(maxReachTimeMs * 0.45)));

    const reservedCells = new Set<NodeKey>([
      ...Array.from(reservedForPellets),
      ...powerPellets.map(nodeToKey),
    ]);

    const getSafeCandidates = (hopThreshold: number, timeThresholdMs: number): Node[] =>
      openCells.filter((c) => {
        const k = nodeToKey(c);
        const hops = topoDistFromStart.get(k) ?? 0;
        const weightedCost = weightedDistToStart.get(k) ?? 0;
        const reachTimeMs = weightedCost * GAME_SPEED_CONFIG.GHOST_BASE_DELAY_MS;

        return (
          !reservedCells.has(k) &&
          terrains.get(k) === TerrainType.NORMAL &&
          hops >= hopThreshold &&
          reachTimeMs >= timeThresholdMs
        );
      });

    let safeCandidates = getSafeCandidates(minSafeHops, minSafeTimeMs);
    while (safeCandidates.length < 2 && (minSafeTimeMs > 2500 || minSafeHops > 8)) {
      if (minSafeTimeMs > 2500) minSafeTimeMs -= 250;
      if (minSafeHops > 8) minSafeHops -= 1;
      safeCandidates = getSafeCandidates(minSafeHops, minSafeTimeMs);
    }

    if (safeCandidates.length === 0) {
      safeCandidates = openCells.filter((c) => {
        const k = nodeToKey(c);
        return !reservedCells.has(k) && terrains.get(k) === TerrainType.NORMAL;
      });
    }

    const enemySpawn = this.prng.choice(safeCandidates);

    // Spawns do Fantasma Roxo:
    // Garante segurança com relação ao Pac-Man E separação mútua (topológica e temporal ponderada) do Fantasma Vermelho
    const weightedDistFromEnemy1 = computeWeightedShortestPathsTo(graph, enemySpawn);
    const topoDistFromEnemy1 = new Map<NodeKey, number>();
    const bfsQueueE1: Node[] = [enemySpawn];
    topoDistFromEnemy1.set(nodeToKey(enemySpawn), 0);

    while (bfsQueueE1.length > 0) {
      const curr = bfsQueueE1.shift()!;
      const d = topoDistFromEnemy1.get(nodeToKey(curr))!;
      for (const { node: nbr } of graph.neighbors(curr)) {
        const nKey = nodeToKey(nbr);
        if (!topoDistFromEnemy1.has(nKey)) {
          topoDistFromEnemy1.set(nKey, d + 1);
          bfsQueueE1.push(nbr);
        }
      }
    }

    // Separação mútua entre os dois fantasmas: pelo menos 8 arestas e 1800ms ponderados
    const MIN_SEPARATION_HOPS = 8;
    const MIN_SEPARATION_TIME_MS = 1800;

    const enemyCandidates2 = safeCandidates.filter((c) => {
      const k = nodeToKey(c);
      const hops = topoDistFromEnemy1.get(k) ?? 0;
      const weightedCost = weightedDistFromEnemy1.get(k) ?? 0;
      const sepTimeMs = weightedCost * GAME_SPEED_CONFIG.GHOST_BASE_DELAY_MS;

      return (
        k !== nodeToKey(enemySpawn) &&
        hops >= MIN_SEPARATION_HOPS &&
        sepTimeMs >= MIN_SEPARATION_TIME_MS
      );
    });

    let enemySpawn2: Node;
    if (enemyCandidates2.length > 0) {
      enemySpawn2 = this.prng.choice(enemyCandidates2);
    } else {
      const sortedBySeparation = safeCandidates
        .filter((c) => nodeToKey(c) !== nodeToKey(enemySpawn))
        .sort((a, b) => {
          const wA = (weightedDistFromEnemy1.get(nodeToKey(a)) ?? 0) * GAME_SPEED_CONFIG.GHOST_BASE_DELAY_MS;
          const wB = (weightedDistFromEnemy1.get(nodeToKey(b)) ?? 0) * GAME_SPEED_CONFIG.GHOST_BASE_DELAY_MS;
          return wB - wA;
        });
      enemySpawn2 = sortedBySeparation[0] ?? endCell;
    }

    return {
      rows: this.rows,
      cols: this.cols,
      grid,
      graph,
      start: startCell,
      goal: endCell,
      terrains,
      portalPairs,
      keys,
      powerPellets,
      enemySpawn,
      enemySpawn2,
      seed: this.seed,
    };
  }
}
