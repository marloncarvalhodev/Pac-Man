import type Phaser from 'phaser';

/** Continuous arcade contours. Reads the maze without changing its topology. */
export class WallRenderer {
  static renderContinuousWalls(
    graphics: Phaser.GameObjects.Graphics,
    grid: number[][],
    rows: number,
    cols: number,
    cellSize: number,
    wallColor = 0x090d16,
    neonColor = 0x3478ff,
  ): void {
    graphics.clear();
    const inset = 2;
    const corner = Math.min(5, cellSize * 0.2);
    const isPath = (r: number, c: number) =>
      r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] === 0;
    graphics.fillStyle(wallColor, 1);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === 1)
          graphics.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
      }
    const contours = (width: number, alpha: number) => {
      graphics.lineStyle(width, neonColor, alpha);
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] !== 1) continue;
          const x = c * cellSize,
            y = r * cellSize;
          const north = isPath(r - 1, c),
            south = isPath(r + 1, c);
          const west = isPath(r, c - 1),
            east = isPath(r, c + 1);
          const low = inset + corner,
            high = cellSize - low;
          if (north)
            graphics.lineBetween(
              x + (west ? low : 0),
              y + inset,
              x + (east ? high : cellSize),
              y + inset,
            );
          if (south)
            graphics.lineBetween(
              x + (west ? low : 0),
              y + cellSize - inset,
              x + (east ? high : cellSize),
              y + cellSize - inset,
            );
          if (west)
            graphics.lineBetween(
              x + inset,
              y + (north ? low : 0),
              x + inset,
              y + (south ? high : cellSize),
            );
          if (east)
            graphics.lineBetween(
              x + cellSize - inset,
              y + (north ? low : 0),
              x + cellSize - inset,
              y + (south ? high : cellSize),
            );
          const arc = (
            cx: number,
            cy: number,
            from: number,
            to: number,
            radius = corner,
          ) => {
            graphics.beginPath();
            graphics.arc(cx, cy, radius, from, to, false);
            graphics.strokePath();
          };
          if (north && west) arc(x + low, y + low, Math.PI, Math.PI * 1.5);
          if (north && east) arc(x + high, y + low, Math.PI * 1.5, Math.PI * 2);
          if (south && west) arc(x + low, y + high, Math.PI * 0.5, Math.PI);
          if (south && east) arc(x + high, y + high, 0, Math.PI * 0.5);
          // Join inset edges around a concave corner shared by three wall cells.
          if (north && !west && grid[r - 1]?.[c - 1] === 1)
            arc(x, y, Math.PI * 0.5, Math.PI, inset);
          if (north && !east && grid[r - 1]?.[c + 1] === 1)
            arc(x + cellSize, y, 0, Math.PI * 0.5, inset);
          if (south && !west && grid[r + 1]?.[c - 1] === 1)
            arc(x, y + cellSize, Math.PI, Math.PI * 1.5, inset);
          if (south && !east && grid[r + 1]?.[c + 1] === 1)
            arc(x + cellSize, y + cellSize, Math.PI * 1.5, Math.PI * 2, inset);
        }
    };
    contours(5, 0.12);
    contours(1.8, 1);
    graphics.lineStyle(1.8, neonColor, 0.9);
    graphics.strokeRoundedRect(
      3,
      3,
      cols * cellSize - 6,
      rows * cellSize - 6,
      corner * 2,
    );
  }
}
