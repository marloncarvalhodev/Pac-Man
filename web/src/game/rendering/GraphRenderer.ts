/**
 * Renderizador de Visualização Espacial de Grafos e Rotas da IA.
 */

import Phaser from 'phaser';
import { Graph } from '../graph/Graph';
import { Node, nodeToKey } from '../graph/GraphTypes';
import { TerrainType, TERRAIN_COSTS } from '../graph/Terrain';

export class GraphRenderer {
  /**
   * Renderiza a visualização no modo "Raio-X do Grafo" (topologia explícita).
   */
  static renderGraphXRay(
    graphics: Phaser.GameObjects.Graphics,
    graph: Graph,
    terrains: Map<string, TerrainType>,
    cellSize: number,
    hoveredNode: Node | null = null
  ): void {
    const half = cellSize / 2;

    // 1. Arestas
    graphics.lineStyle(1.5, 0x36d5ed, 0.45);
    const drawnEdges = new Set<string>();

    for (const u of graph.vertices) {
      const uKey = nodeToKey(u);
      const uPt = [u[1] * cellSize + half, u[0] * cellSize + half];

      for (const { node: v } of graph.neighbors(u)) {
        const vKey = nodeToKey(v);
        const edgeId = [uKey, vKey].sort().join('--');

        if (!drawnEdges.has(edgeId)) {
          drawnEdges.add(edgeId);
          // Apenas arestas no grid (diretas)
          if (Math.abs(u[0] - v[0]) + Math.abs(u[1] - v[1]) === 1) {
            const vPt = [v[1] * cellSize + half, v[0] * cellSize + half];
            graphics.lineBetween(uPt[0], uPt[1], vPt[0], vPt[1]);
          }
        }
      }
    }

    // 2. Vértices
    for (const v of graph.vertices) {
      const vKey = nodeToKey(v);
      const cx = v[1] * cellSize + half;
      const cy = v[0] * cellSize + half;
      const deg = graph.degree(v);

      const isHovered = hoveredNode && hoveredNode[0] === v[0] && hoveredNode[1] === v[1];

      if (isHovered) {
        graphics.fillStyle(0xffd43b, 1.0);
        graphics.fillCircle(cx, cy, 6);
        graphics.lineStyle(2, 0xffffff, 1.0);
        graphics.strokeCircle(cx, cy, 10);
      } else {
        graphics.fillStyle(0x7dd3fc, 0.9);
        graphics.fillCircle(cx, cy, 3);

        // Vértices de bifurcação / decisão tática (grau >= 3)
        if (deg >= 3) {
          graphics.lineStyle(1.5, 0xffd43b, 0.85);
          graphics.strokeCircle(cx, cy, 7);
        }
      }
    }
  }

  /**
   * Renderiza a rota ótima calculada pelo Solver.
   */
  static renderSolutionPath(
    graphics: Phaser.GameObjects.Graphics,
    path: Node[],
    cellSize: number,
    visitedNodes: Set<string>
  ): void {
    const half = cellSize / 2;

    // Nós visitados durante a busca
    graphics.fillStyle(0x9333ea, 0.35);
    for (const key of visitedNodes) {
      const [r, c] = key.split(',').map(Number);
      graphics.fillRect(c * cellSize + 2, r * cellSize + 2, cellSize - 4, cellSize - 4);
    }

    // Linha do caminho ótimo
    if (path.length > 1) {
      graphics.lineStyle(4, 0xffd43b, 0.95);
      for (let i = 0; i < path.length - 1; i++) {
        const u = path[i];
        const v = path[i + 1];

        // Salta portais
        if (Math.abs(u[0] - v[0]) + Math.abs(u[1] - v[1]) <= 1) {
          graphics.lineBetween(
            u[1] * cellSize + half,
            u[0] * cellSize + half,
            v[1] * cellSize + half,
            v[0] * cellSize + half
          );
          graphics.fillStyle(0xffffff, 1.0);
          graphics.fillCircle(u[1] * cellSize + half, u[0] * cellSize + half, 3);
        } else {
          // Feixe tracejado de teletransporte
          graphics.lineStyle(2, 0xf472b6, 0.85);
          graphics.lineBetween(
            u[1] * cellSize + half,
            u[0] * cellSize + half,
            v[1] * cellSize + half,
            v[0] * cellSize + half
          );
          graphics.lineStyle(4, 0xffd43b, 0.95);
        }
      }
    }
  }

  /**
   * Renderiza a rota da IA dos inimigos até seus alvos.
   */
  static renderAIRoutes(
    graphics: Phaser.GameObjects.Graphics,
    redPath: Node[],
    purplePath: Node[],
    ambushTarget: Node | null,
    cellSize: number
  ): void {
    const half = cellSize / 2;

    // Rota Minotauro (Vermelha)
    if (redPath.length > 1) {
      graphics.lineStyle(2, 0xef5350, 0.7);
      for (let i = 0; i < redPath.length - 1; i++) {
        const u = redPath[i];
        const v = redPath[i + 1];
        if (Math.abs(u[0] - v[0]) + Math.abs(u[1] - v[1]) <= 1) {
          graphics.lineBetween(
            u[1] * cellSize + half,
            u[0] * cellSize + half,
            v[1] * cellSize + half,
            v[0] * cellSize + half
          );
          graphics.fillStyle(0xef5350, 0.9);
          graphics.fillCircle(u[1] * cellSize + half, u[0] * cellSize + half, 2);
        }
      }
    }

    // Rota Fantasma Roxo (Roxa/Magenta)
    if (purplePath.length > 1) {
      graphics.lineStyle(2, 0xa66bff, 0.7);
      for (let i = 0; i < purplePath.length - 1; i++) {
        const u = purplePath[i];
        const v = purplePath[i + 1];
        if (Math.abs(u[0] - v[0]) + Math.abs(u[1] - v[1]) <= 1) {
          graphics.lineBetween(
            u[1] * cellSize + half,
            u[0] * cellSize + half,
            v[1] * cellSize + half,
            v[0] * cellSize + half
          );
          graphics.fillStyle(0xa66bff, 0.9);
          graphics.fillCircle(u[1] * cellSize + half, u[0] * cellSize + half, 2);
        }
      }
    }

    // Marcador da Mira do Fantasma Emboscador
    if (ambushTarget) {
      const tx = ambushTarget[1] * cellSize + half;
      const ty = ambushTarget[0] * cellSize + half;

      graphics.lineStyle(2, 0xc084fc, 0.9);
      graphics.lineBetween(tx - 5, ty - 5, tx + 5, ty + 5);
      graphics.lineBetween(tx - 5, ty + 5, tx + 5, ty - 5);
      graphics.strokeCircle(tx, ty, 8);
    }
  }
}
