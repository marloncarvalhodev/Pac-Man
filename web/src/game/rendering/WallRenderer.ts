/**
 * Renderizador de Paredes Contínuas estilo Modern Arcade.
 * Identifica a adjacência das células de parede e corredores livres,
 * gerando contornos contínuos, suaves e iluminados com azul elétrico (#3478FF).
 */

import Phaser from 'phaser';

export class WallRenderer {
  /**
   * Renderiza as paredes contínuas em um Phaser.GameObjects.Graphics.
   */
  static renderContinuousWalls(
    graphics: Phaser.GameObjects.Graphics,
    grid: number[][],
    rows: number,
    cols: number,
    cellSize: number,
    wallColor = 0x090d16,
    neonColor = 0x3478ff
  ): void {
    graphics.clear();

    const half = cellSize / 2;
    const cornerRadius = 4;

    // 1. Preenchimento de fundo escuro para todos os blocos de parede
    graphics.fillStyle(wallColor, 1.0);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === 1) {
          graphics.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
      }
    }

    // 2. Traçado dos contornos contínuos neon que fazem fronteira com corredores livres
    graphics.lineStyle(2.5, neonColor, 0.95);

    const isPath = (r: number, c: number): boolean => {
      if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
      return grid[r][c] === 0;
    };

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === 1) {
          const x = c * cellSize;
          const y = r * cellSize;

          const nPath = isPath(r - 1, c);
          const sPath = isPath(r + 1, c);
          const wPath = isPath(r, c - 1);
          const ePath = isPath(r, c + 1);

          // Borda Norte
          if (nPath) {
            const x1 = wPath ? x + cornerRadius : x;
            const x2 = ePath ? x + cellSize - cornerRadius : x + cellSize;
            graphics.strokeLineShape(new Phaser.Geom.Line(x1, y + 1.5, x2, y + 1.5));
          }

          // Borda Sul
          if (sPath) {
            const x1 = wPath ? x + cornerRadius : x;
            const x2 = ePath ? x + cellSize - cornerRadius : x + cellSize;
            graphics.strokeLineShape(
              new Phaser.Geom.Line(x1, y + cellSize - 1.5, x2, y + cellSize - 1.5)
            );
          }

          // Borda Oeste
          if (wPath) {
            const y1 = nPath ? y + cornerRadius : y;
            const y2 = sPath ? y + cellSize - cornerRadius : y + cellSize;
            graphics.strokeLineShape(new Phaser.Geom.Line(x + 1.5, y1, x + 1.5, y2));
          }

          // Borda Leste
          if (ePath) {
            const y1 = nPath ? y + cornerRadius : y;
            const y2 = sPath ? y + cellSize - cornerRadius : y + cellSize;
            graphics.strokeLineShape(
              new Phaser.Geom.Line(x + cellSize - 1.5, y1, x + cellSize - 1.5, y2)
            );
          }

          // Cantos externos curvos entre bordas adjacentes
          if (nPath && wPath) {
            graphics.strokeCircle(x + cornerRadius + 1.5, y + cornerRadius + 1.5, cornerRadius);
          }
          if (nPath && ePath) {
            graphics.strokeCircle(x + cellSize - cornerRadius - 1.5, y + cornerRadius + 1.5, cornerRadius);
          }
          if (sPath && wPath) {
            graphics.strokeCircle(x + cornerRadius + 1.5, y + cellSize - cornerRadius - 1.5, cornerRadius);
          }
          if (sPath && ePath) {
            graphics.strokeCircle(x + cellSize - cornerRadius - 1.5, y + cellSize - cornerRadius - 1.5, cornerRadius);
          }
        }
      }
    }
  }
}
