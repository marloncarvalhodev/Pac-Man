import { describe, expect, it, vi } from 'vitest';
vi.mock('phaser',()=>({default:{}}));
import { CharacterRenderer } from '../game/rendering/CharacterRenderer';

describe('orientação do Pac-Man',()=>{
  it.each([[0,1],[0,-1]])('mantém o olho acima do corpo ao mover em %j',(dr,dc)=>{
    const graphics={fillStyle:vi.fn(),beginPath:vi.fn(),moveTo:vi.fn(),lineTo:vi.fn(),closePath:vi.fn(),fillPath:vi.fn(),lineStyle:vi.fn(),arc:vi.fn(),strokePath:vi.fn(),fillCircle:vi.fn()};
    CharacterRenderer.drawPacMan(graphics as unknown as Parameters<typeof CharacterRenderer.drawPacMan>[0],100,100,10,[dr,dc],0,false);
    const eye=graphics.fillCircle.mock.calls.at(-1)!;
    expect(eye[1]).toBeLessThan(100);
    expect(Math.abs(eye[0]-100)).toBeLessThan(5);
  });
});
