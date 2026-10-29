import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: { Scene: class { constructor(_key: string) {} } } }));
vi.mock('../game/core/EventBus', () => ({ EventBus: { emit: vi.fn() } }));

import { GameScene } from '../game/scenes/GameScene';

describe('visibilidade das rotas no Arcade', () => {
  it('inicia desativada e alterna sem alterar posição ou caminho dos inimigos', () => {
    const scene = new GameScene() as unknown as {
      showAIPath: boolean;
      redEnemy: { pos: number[]; path: number[][] };
      purpleEnemy: { pos: number[]; path: number[][] };
      emitGameState: () => void;
      toggleAIPath: () => void;
    };
    scene.emitGameState = vi.fn();
    scene.redEnemy.pos = [3, 4];
    scene.redEnemy.path = [[3, 4], [3, 5]];
    scene.purpleEnemy.pos = [6, 7];
    scene.purpleEnemy.path = [[6, 7], [6, 8]];
    const before = JSON.stringify([scene.redEnemy, scene.purpleEnemy]);
    expect(scene.showAIPath).toBe(false);
    scene.toggleAIPath();
    expect(scene.showAIPath).toBe(true);
    scene.toggleAIPath();
    expect(scene.showAIPath).toBe(false);
    expect(JSON.stringify([scene.redEnemy, scene.purpleEnemy])).toBe(before);
    expect(scene.emitGameState).toHaveBeenCalledTimes(2);
  });
});
