/**
 * Cena Interativa do Laboratório de Teoria dos Grafos (Phaser 3).
 * Oferece visualização em 3 modos (Labirinto, Grafo Puro, Sobreposição),
 * controle passo-a-passo (Step-by-Step) dos algoritmos Dijkstra e A*,
 * seleção interativa de Origem e Destino, e inspeção detalhada de nós.
 */

import Phaser from 'phaser';
import { EventBus } from '../core/EventBus';
import { MazeGenerator, WorldData } from '../graph/MazeGenerator';
import { Node, nodeToKey, keyToNode, nodeEquals } from '../graph/GraphTypes';
import { TerrainType, TERRAIN_COSTS } from '../graph/Terrain';
import { WallRenderer } from '../rendering/WallRenderer';
import { GraphRenderer } from '../rendering/GraphRenderer';
import { dijkstra } from '../algorithms/Dijkstra';
import { aStar } from '../algorithms/AStar';
import { solveMultiGoal } from '../algorithms/MultiGoalSolver';
import { PathfindingResult } from '../algorithms/PathfindingTypes';
import { VertexInspectionData } from '../core/GameState';

export type LabDisplayMode = 'MAZE' | 'GRAPH' | 'OVERLAY';

export class GraphLabScene extends Phaser.Scene {
  private world!: WorldData;
  private cellSize = 28;

  private wallGraphics!: Phaser.GameObjects.Graphics;
  private terrainGraphics!: Phaser.GameObjects.Graphics;
  private graphGraphics!: Phaser.GameObjects.Graphics;
  private searchGraphics!: Phaser.GameObjects.Graphics;
  private hoverGraphics!: Phaser.GameObjects.Graphics;

  private displayMode: LabDisplayMode = 'OVERLAY';
  private hoveredNode: Node | null = null;
  private selectedStartNode: Node | null = null;
  private selectedGoalNode: Node | null = null;

  // Animação Passo-a-Passo do Algoritmo
  private currentAlgorithm: 'Dijkstra' | 'A*' | 'Multi-Goal' = 'A*';
  private searchResult: PathfindingResult | null = null;
  private isPlaying = false;
  private currentStep = 0;
  private playbackSpeed = 5; // passos por frame
  private visitedKeys = new Set<string>();

  constructor() {
    super('GraphLabScene');
  }

  init(data: { seed?: number }): void {
    const generator = new MazeGenerator(25, 25, data.seed ?? 42);
    this.world = generator.generateWorld(0.1, 1, 2);
    this.selectedStartNode = [...this.world.start];
    this.selectedGoalNode = [...this.world.goal];
    this.resetSearch();
  }

  create(): void {
    this.terrainGraphics = this.add.graphics();
    this.wallGraphics = this.add.graphics();
    this.graphGraphics = this.add.graphics();
    this.searchGraphics = this.add.graphics();
    this.hoverGraphics = this.add.graphics();

    this.rebuildWalls();

    // Eventos recebidos do React
    EventBus.on('lab-set-mode', (mode: LabDisplayMode) => {
      this.displayMode = mode;
      this.renderStaticLayers();
    });

    EventBus.on('lab-select-algorithm', (algo: 'Dijkstra' | 'A*' | 'Multi-Goal') => {
      this.currentAlgorithm = algo;
      this.executeAlgorithm();
    });

    EventBus.on('lab-play', () => {
      this.isPlaying = true;
    });

    EventBus.on('lab-pause', () => {
      this.isPlaying = false;
    });

    EventBus.on('lab-step', () => {
      this.isPlaying = false;
      this.stepForward(1);
    });

    EventBus.on('lab-reset-search', () => {
      this.resetSearch();
    });

    EventBus.on('lab-set-speed', (speed: number) => {
      this.playbackSpeed = speed;
    });

    EventBus.on('lab-new-graph', (seed?: number) => {
      const generator = new MazeGenerator(25, 25, seed);
      this.world = generator.generateWorld(0.1, 1, 2);
      this.selectedStartNode = [...this.world.start];
      this.selectedGoalNode = [...this.world.goal];
      this.rebuildWalls();
      this.executeAlgorithm();
    });

    // Interatividade do mouse: clique para mudar Origem (botão esquerdo) ou Destino (Shift+clique)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const c = Math.floor(pointer.x / this.cellSize);
      const r = Math.floor(pointer.y / this.cellSize);
      if (r >= 0 && r < this.world.grid.length && c >= 0 && c < this.world.grid[0].length) {
        if (this.world.grid[r][c] === 0) {
          const clickedNode: Node = [r, c];
          if (pointer.event.shiftKey) {
            this.selectedGoalNode = clickedNode;
          } else {
            this.selectedStartNode = clickedNode;
          }
          this.executeAlgorithm();
        }
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const c = Math.floor(pointer.x / this.cellSize);
      const r = Math.floor(pointer.y / this.cellSize);
      if (r >= 0 && r < this.world.grid.length && c >= 0 && c < this.world.grid[0].length) {
        if (this.world.grid[r][c] === 0) {
          this.hoveredNode = [r, c];
          this.emitInspection(this.hoveredNode);
        } else {
          this.hoveredNode = null;
        }
      } else {
        this.hoveredNode = null;
      }
    });

    this.executeAlgorithm();
    EventBus.emit('current-scene-ready', this);
  }

  private rebuildWalls(): void {
    WallRenderer.renderContinuousWalls(
      this.wallGraphics,
      this.world.grid,
      this.world.grid.length,
      this.world.grid[0].length,
      this.cellSize
    );
    this.renderStaticLayers();
  }

  private renderStaticLayers(): void {
    this.terrainGraphics.clear();
    const half = this.cellSize / 2;

    // Se estiver no modo GRAPH puro, oculta paredes
    this.wallGraphics.setVisible(this.displayMode !== 'GRAPH');

    // Renderiza terrenos e portais
    if (this.displayMode !== 'GRAPH') {
      for (let r = 0; r < this.world.rows; r++) {
        for (let c = 0; c < this.world.cols; c++) {
          if (this.world.grid[r][c] === 0) {
            const key = `${r},${c}`;
            const terrain = this.world.terrains.get(key) ?? TerrainType.NORMAL;

            let col = 0x1e293b;
            if (terrain === TerrainType.BOOST) col = 0x00c3d7;
            if (terrain === TerrainType.MUD) col = 0x785230;
            if (terrain === TerrainType.LAVA) col = 0xdc3228;

            this.terrainGraphics.fillStyle(col, 0.85);
            this.terrainGraphics.fillRect(
              c * this.cellSize + 1,
              r * this.cellSize + 1,
              this.cellSize - 2,
              this.cellSize - 2
            );
          }
        }
      }

      // Portais
      for (const [p1, p2] of this.world.portalPairs) {
        for (const p of [p1, p2]) {
          this.terrainGraphics.lineStyle(2, 0xa66bff, 0.9);
          this.terrainGraphics.strokeCircle(p[1] * this.cellSize + half, p[0] * this.cellSize + half, 9);
        }
      }
    }
  }

  private executeAlgorithm(): void {
    if (!this.selectedStartNode || !this.selectedGoalNode) return;

    if (this.currentAlgorithm === 'Dijkstra') {
      this.searchResult = dijkstra(this.world.graph, this.selectedStartNode, this.selectedGoalNode);
    } else if (this.currentAlgorithm === 'A*') {
      this.searchResult = aStar(this.world.graph, this.selectedStartNode, this.selectedGoalNode, {
        portals: this.world.portalPairs,
        minWeight: 0.3,
      });
    } else {
      this.searchResult = solveMultiGoal(
        this.world.graph,
        this.selectedStartNode,
        this.world.keys,
        this.selectedGoalNode,
        {
          algorithm: 'A*',
          portals: this.world.portalPairs,
        }
      );
    }

    // Calcula também o comparativo simultâneo
    const compD = dijkstra(this.world.graph, this.selectedStartNode, this.selectedGoalNode);
    const compA = aStar(this.world.graph, this.selectedStartNode, this.selectedGoalNode, {
      portals: this.world.portalPairs,
      minWeight: 0.3,
    });

    EventBus.emit('lab-comparison-ready', {
      dijkstra: compD,
      astar: compA,
      gainPercent:
        compD.nodesExpanded > 0
          ? ((compD.nodesExpanded - compA.nodesExpanded) / compD.nodesExpanded) * 100.0
          : 0,
      activeResult: this.searchResult,
      algorithmName: this.currentAlgorithm,
    });

    this.resetSearch();
    this.isPlaying = true;
  }

  private resetSearch(): void {
    this.currentStep = 0;
    this.visitedKeys.clear();
    this.isPlaying = false;
    this.emitProgress();
  }

  private stepForward(count = 1): void {
    if (!this.searchResult) return;

    for (let i = 0; i < count; i++) {
      if (this.currentStep < this.searchResult.visitedOrder.length) {
        const node = this.searchResult.visitedOrder[this.currentStep];
        this.visitedKeys.add(nodeToKey(node));
        this.currentStep++;
      } else {
        this.isPlaying = false;
        break;
      }
    }
    this.emitProgress();
  }

  private emitProgress(): void {
    const total = this.searchResult?.visitedOrder.length ?? 0;
    EventBus.emit('lab-search-progress', {
      currentStep: this.currentStep,
      totalSteps: total,
      isFinished: this.currentStep >= total,
      isPlaying: this.isPlaying,
    });
  }

  private emitInspection(node: Node): void {
    const key = nodeToKey(node);
    const terrain = this.world.terrains.get(key) ?? TerrainType.NORMAL;
    const neighbors = this.world.graph.neighbors(node).map((n) => ({
      node: n.node,
      weight: n.weight,
      terrain: this.world.terrains.get(nodeToKey(n.node)) ?? TerrainType.NORMAL,
    }));

    const inspection: VertexInspectionData = {
      node,
      key,
      terrain,
      terrainName: terrain,
      inDegree: this.world.graph.inDegree(node),
      outDegree: this.world.graph.outDegree(node),
      degree: this.world.graph.degree(node),
      isJunction: this.world.graph.degree(node) >= 3,
      neighbors,
    };

    EventBus.emit('vertex-inspected', inspection);
  }

  update(): void {
    if (this.isPlaying && this.searchResult) {
      this.stepForward(this.playbackSpeed);
    }
    this.renderDynamicLayers();
  }

  private renderDynamicLayers(): void {
    const half = this.cellSize / 2;
    this.graphGraphics.clear();
    this.searchGraphics.clear();
    this.hoverGraphics.clear();

    // 1. Topologia do Grafo (se GRAPH ou OVERLAY)
    if (this.displayMode !== 'MAZE') {
      GraphRenderer.renderGraphXRay(
        this.graphGraphics,
        this.world.graph,
        this.world.terrains,
        this.cellSize,
        this.hoveredNode
      );
    }

    // 2. Nós Expandidos na busca animada
    this.searchGraphics.fillStyle(0x8061a6, 0.20);
    for (const key of this.visitedKeys) {
      const [r, c] = key.split(',').map(Number);
      this.searchGraphics.fillRect(
        c * this.cellSize + 2,
        r * this.cellSize + 2,
        this.cellSize - 4,
        this.cellSize - 4
      );
    }

    // O resultado registra ordem de expansão, não a fronteira completa.
    const nextNode = this.searchResult?.visitedOrder[this.currentStep];
    if (nextNode) {
      this.searchGraphics.lineStyle(2, 0x45d7e8, 1);
      this.searchGraphics.strokeCircle(nextNode[1] * this.cellSize + half, nextNode[0] * this.cellSize + half, 10);
    }

    // Mantém portais identificáveis também no modo de grafo puro.
    for (const pair of this.world.portalPairs) {
      for (const portal of pair) {
        this.hoverGraphics.lineStyle(2, 0xba8aff, 1);
        this.hoverGraphics.strokeCircle(portal[1] * this.cellSize + half, portal[0] * this.cellSize + half, 9);
      }
    }

    // 3. Caminho ótimo quando concluído
    if (this.searchResult && this.currentStep >= this.searchResult.visitedOrder.length) {
      const path = this.searchResult.path;
      if (path.length > 1) {
        this.searchGraphics.lineStyle(4, 0xffd43b, 1.0);
        for (let i = 0; i < path.length - 1; i++) {
          const u = path[i];
          const v = path[i + 1];
          if (Math.abs(u[0] - v[0]) + Math.abs(u[1] - v[1]) <= 1) {
            this.searchGraphics.lineBetween(
              u[1] * this.cellSize + half,
              u[0] * this.cellSize + half,
              v[1] * this.cellSize + half,
              v[0] * this.cellSize + half
            );
          } else {
            // Conexão de portal da rota, com cor própria.
            this.searchGraphics.lineStyle(2, 0xba8aff, 0.75);
            this.searchGraphics.lineBetween(u[1] * this.cellSize + half, u[0] * this.cellSize + half, v[1] * this.cellSize + half, v[0] * this.cellSize + half);
            this.searchGraphics.lineStyle(4, 0xffd43b, 1.0);
          }
        }
      }
    }

    // 4. Marcadores de Origem (S) e Destino (T)
    if (this.selectedStartNode) {
      const sx = this.selectedStartNode[1] * this.cellSize + half;
      const sy = this.selectedStartNode[0] * this.cellSize + half;
      this.hoverGraphics.fillStyle(0x22c55e, 1.0);
      this.hoverGraphics.fillCircle(sx, sy, 8);
      this.hoverGraphics.lineStyle(2, 0xffffff, 1.0);
      this.hoverGraphics.strokeCircle(sx, sy, 8);
    }

    if (this.selectedGoalNode) {
      const gx = this.selectedGoalNode[1] * this.cellSize + half;
      const gy = this.selectedGoalNode[0] * this.cellSize + half;
      this.hoverGraphics.fillStyle(0xef5350, 1.0);
      this.hoverGraphics.fillCircle(gx, gy, 8);
      this.hoverGraphics.lineStyle(2, 0xffffff, 1.0);
      this.hoverGraphics.strokeCircle(gx, gy, 8);
    }

    // 5. Destaca vértice inspecionado
    if (this.hoveredNode) {
      const hx = this.hoveredNode[1] * this.cellSize + half;
      const hy = this.hoveredNode[0] * this.cellSize + half;
      this.hoverGraphics.lineStyle(2, 0x38bdf8, 1.0);
      this.hoverGraphics.strokeCircle(hx, hy, 12);
    }
  }

  destroy(): void {
    EventBus.removeAllListeners();
  }
}
