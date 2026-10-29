/**
 * Gerador de Labirintos e Mundos Ponderados baseado em Teoria dos Grafos.
 * Constrói Árvore Geradora via DFS (Recursive Backtracker) com abertura
 * controlada de ciclos, terrenos heterogêneos, portais não-planares e chaves.
 */

import { Node, NodeKey, nodeToKey, keyToNode } from './GraphTypes';
import { Graph } from './Graph';
import { TerrainType, TERRAIN_COSTS } from './Terrain';

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

export class MazeGenerator {
  public readonly rows: number;
  public readonly cols: number;
  private prng: PRNG;
  public readonly seed: number;

  constructor(rows = 25, cols = 25, seed?: number) {
    this.rows = rows % 2 !== 0 ? rows : rows + 1;
    this.cols = cols % 2 !== 0 ? cols : cols + 1;
    this.seed = seed ?? Math.floor(Math.random() * 1000000);
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

    // Constrói o Grafo G = (V, E, w)
    const graph = new Graph();
    for (const cell of openCells) {
      graph.addVertex(cell);
    }

    for (const u of openCells) {
      const [r, c] = u;
      const directions: Array<[number, number]> = [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ];
      for (const [dr, dc] of directions) {
        const v: Node = [r + dr, c + dc];
        const vKey = nodeToKey(v);
        if (terrains.has(vKey)) {
          const terrainV = terrains.get(vKey)!;
          const costV = TERRAIN_COSTS[terrainV];
          graph.addEdge(u, v, costV, false);
        }
      }
    }

    // Seleciona pares de Portais (Arestas Não-Planares com peso 1.0)
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
        // Remove dos candidatos
        const p1Key = nodeToKey(p1);
        const p2Key = nodeToKey(p2);
        const idx1 = candidatePortalCells.findIndex((c) => nodeToKey(c) === p1Key);
        if (idx1 >= 0) candidatePortalCells.splice(idx1, 1);
        const idx2 = candidatePortalCells.findIndex((c) => nodeToKey(c) === p2Key);
        if (idx2 >= 0) candidatePortalCells.splice(idx2, 1);

        // Aresta bidirecional de peso 1.0 no grafo
        graph.addEdge(p1, p2, 1.0, true);
      }
    }

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

    // Spawns dos Inimigos (1: Minotauro Vermelho, 2: Fantasma Roxo Emboscador)
    const reservedCells = new Set<NodeKey>([
      ...Array.from(reservedForPellets),
      ...powerPellets.map(nodeToKey),
    ]);

    const enemyCandidates = openCells.filter((c) => {
      const k = nodeToKey(c);
      return (
        !reservedCells.has(k) &&
        Math.abs(c[0] - startCell[0]) + Math.abs(c[1] - startCell[1]) >=
          Math.floor((this.rows + this.cols) / 3)
      );
    });

    const fallbackCandidates = openCells.filter(
      (c) => nodeToKey(c) !== nodeToKey(startCell)
    );

    const enemySpawn =
      enemyCandidates.length > 0
        ? this.prng.choice(enemyCandidates)
        : this.prng.choice(fallbackCandidates);

    const enemyCandidates2 = enemyCandidates.filter(
      (c) => nodeToKey(c) !== nodeToKey(enemySpawn)
    );
    const enemySpawn2 =
      enemyCandidates2.length > 0
        ? this.prng.choice(enemyCandidates2)
        : endCell;

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
