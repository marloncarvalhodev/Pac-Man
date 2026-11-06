import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { WallRenderer } from '../game/rendering/WallRenderer';
import { MazeGenerator } from '../game/graph/MazeGenerator';

describe('continuous arcade wall artwork', () => {
  it('closes every line/arc join without changing the maze', () => {
    const { grid, rows, cols } = new MazeGenerator(17, 17, 42).generateWorld();
    const original = JSON.stringify(grid);
    const endpoints = new Map<string, number>();
    let strongContour = false;
    const point = (x: number, y: number) => {
      const key = `${x.toFixed(4)},${y.toFixed(4)}`;
      endpoints.set(key, (endpoints.get(key) ?? 0) + 1);
    };
    const graphics = {
      clear() {},
      fillStyle() {},
      fillRect() {},
      beginPath() {},
      strokePath() {},
      strokeRoundedRect() {},
      lineStyle(_width: number, _color: number, alpha: number) {
        strongContour = alpha === 1;
      },
      lineBetween(x1: number, y1: number, x2: number, y2: number) {
        if (strongContour) {
          point(x1, y1);
          point(x2, y2);
        }
      },
      arc(x: number, y: number, radius: number, from: number, to: number) {
        if (strongContour) {
          point(x + radius * Math.cos(from), y + radius * Math.sin(from));
          point(x + radius * Math.cos(to), y + radius * Math.sin(to));
        }
      },
    } as unknown as Phaser.GameObjects.Graphics;
    WallRenderer.renderContinuousWalls(graphics, grid, rows, cols, 28);
    expect(endpoints.size).toBeGreaterThan(0);
    expect([...endpoints.entries()].filter(([, count]) => count !== 2)).toEqual(
      [],
    );
    expect(JSON.stringify(grid)).toBe(original);
  });
});
