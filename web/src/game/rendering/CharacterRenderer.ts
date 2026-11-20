/**
 * Renderizador de Personagens, Inimigos e Colecionáveis.
 */

import Phaser from 'phaser';
import { Node } from '../graph/GraphTypes';

export class CharacterRenderer {
  /**
   * Renderiza o Pac-Man com animação de boca e olhos orientados.
   */
  static drawPacMan(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    radius: number,
    facing: [number, number],
    time: number,
    isMoving: boolean
  ): void {
    const [dr, dc] = facing;
    const baseAngle = Math.atan2(dr, dc);
    const mouthAmp = isMoving ? 0.65 : 0.15;
    const mouthRad = 0.08 + mouthAmp * Math.abs(Math.sin(time * 0.012));

    graphics.fillStyle(0xffd43b, 1.0);
    graphics.beginPath();
    graphics.moveTo(x, y);

    const steps = 24;
    const startA = baseAngle + mouthRad;
    const endA = baseAngle + 2 * Math.PI - mouthRad;

    for (let i = 0; i <= steps; i++) {
      const a = startA + (endA - startA) * (i / steps);
      graphics.lineTo(x + radius * Math.cos(a), y + radius * Math.sin(a));
    }
    graphics.closePath();
    graphics.fillPath();

    // Sombreamento sutil acompanha a forma sem alterar o centro lógico.
    graphics.lineStyle(1.2, 0xffe995, 0.75);
    graphics.beginPath();
    graphics.arc(x, y, radius * 0.88, baseAngle + mouthRad + 0.2, baseAngle + Math.PI * 1.35, false);
    graphics.strokePath();

    // Keep the eye above horizontal movement instead of mirroring it underneath.
    const ex = x + radius * (dc !== 0 ? dc * 0.12 : 0.5);
    const ey = y + radius * (dc !== 0 ? -0.52 : dr * 0.12);

    graphics.fillStyle(0x090d16, 1.0);
    graphics.fillCircle(ex, ey, Math.max(1.8, radius * 0.18));
  }

  private static reducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Classic rounded ghosts with directional eyes and an animated scalloped hem. */
  private static drawClassicGhost(
    graphics: Phaser.GameObjects.Graphics, x: number, y: number, radius: number,
    facing: [number, number], frightened: boolean, remaining: number, time: number,
    color: number,
  ): void {
    const clock = this.reducedMotion ? 0 : time;
    const cy = y + Math.sin(clock * 0.006) * radius * 0.035;
    const warning = frightened && remaining < 2 && Math.floor(clock / 350) % 2 === 1;
    graphics.fillStyle(frightened ? (warning ? 0xf1edff : 0x3157d8) : color, 1);
    graphics.beginPath();
    graphics.moveTo(x - radius, cy + radius * 0.8);
    graphics.lineTo(x - radius, cy);
    graphics.arc(x, cy, radius, Math.PI, Math.PI * 2, false);
    graphics.lineTo(x + radius, cy + radius * 0.8);
    const phase = Math.floor(clock / 180) % 2;
    for (let i = 1; i <= 6; i++) {
      graphics.lineTo(x + radius - i * radius / 3,
        cy + radius * ((i + phase) % 2 ? 0.52 : 0.8));
    }
    graphics.closePath(); graphics.fillPath();
    if (frightened) {
      graphics.fillStyle(warning ? 0x3157d8 : 0xffe7d0, 1);
      for (const side of [-1, 1]) graphics.fillCircle(x + side * radius * 0.35, cy - radius * 0.1, radius * 0.12);
      graphics.lineStyle(Math.max(1, radius * 0.1), warning ? 0x3157d8 : 0xffe7d0, 1);
      graphics.beginPath();
      for (let i = 0; i < 5; i++) {
        const px = x - radius * 0.45 + i * radius * 0.225;
        const py = cy + radius * (i % 2 ? 0.25 : 0.4);
        if (!i) graphics.moveTo(px, py); else graphics.lineTo(px, py);
      }
      graphics.strokePath();
      return;
    }
    for (const side of [-1, 1]) {
      const ex = x + side * radius * 0.38;
      graphics.fillStyle(0xffffff, 1);
      graphics.fillEllipse(ex, cy - radius * 0.16, radius * 0.57, radius * 0.76);
      graphics.fillStyle(0x173b96, 1);
      graphics.fillEllipse(ex + facing[1] * radius * 0.13,
        cy - radius * 0.13 + facing[0] * radius * 0.16, radius * 0.27, radius * 0.38);
    }
  }

  static drawMinotaur(
    graphics: Phaser.GameObjects.Graphics, x: number, y: number, radius: number,
    facing: [number, number], isFrightened: boolean, remainingFrightSec: number, time: number,
  ): void {
    this.drawClassicGhost(graphics, x, y, radius, facing, isFrightened,
      remainingFrightSec, time, 0xff4b59);
  }

  static drawGhost(
    graphics: Phaser.GameObjects.Graphics, x: number, y: number, radius: number,
    facing: [number, number], isFrightened: boolean, remainingFrightSec: number, time: number,
  ): void {
    this.drawClassicGhost(graphics, x, y, radius, facing, isFrightened,
      remainingFrightSec, time, 0xb08aff);
  }

  /**
   * Desenha um Cadeado Fechado no destino trancado.
   */
  static drawLock(graphics: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number): void {
    // Fundo vermelho
    graphics.fillStyle(0xb91c1c, 1.0);
    graphics.fillRoundedRect(cx - size / 2, cy - size / 2, size, size, 4);
    graphics.lineStyle(1.5, 0xf87171, 0.9);
    graphics.strokeRoundedRect(cx - size / 2, cy - size / 2, size, size, 4);

    // Corpo dourado do cadeado
    const w = 12;
    const h = 9;
    graphics.fillStyle(0xffd43b, 1.0);
    graphics.fillRoundedRect(cx - w / 2, cy - 1, w, h, 2);

    // Alça do cadeado
    graphics.lineStyle(2, 0xffd43b, 1.0);
    graphics.beginPath();
    graphics.arc(cx, cy - 1, 4.5, Math.PI, 0, false);
    graphics.strokePath();

    // Fechadura
    graphics.fillStyle(0x090d16, 1.0);
    graphics.fillCircle(cx, cy + 3, 1.8);
  }

  /**
   * Desenha o Portal Aberto Verde no destino destrancado.
   */
  static drawExitPortal(
    graphics: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    size: number,
    pulse: number
  ): void {
    graphics.fillStyle(0x15803d, 1.0);
    graphics.fillRoundedRect(cx - size / 2, cy - size / 2, size, size, 5);
    graphics.lineStyle(2, 0x43d9a3, 1.0);
    graphics.strokeRoundedRect(cx - size / 2, cy - size / 2, size, size, 5);

    const rStar = Math.floor((size / 2) * (0.65 + 0.25 * pulse));
    graphics.fillStyle(0xffffff, 1.0);
    graphics.fillCircle(cx, cy, Math.max(2, rStar * 0.45));
    graphics.lineStyle(2, 0x86efac, 0.9);
    graphics.strokeCircle(cx, cy, rStar);
  }

  /**
   * Desenha a Chave Dourada Colecionável.
   */
  static drawKey(
    graphics: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    cellSize: number,
    pulse: number
  ): void {
    const radius = Math.floor(cellSize * 0.22 * (0.85 + 0.2 * pulse));
    graphics.fillStyle(0xffd43b, 1.0);
    graphics.fillCircle(cx, cy - 3, radius);
    graphics.fillStyle(0x090d16, 1.0);
    graphics.fillCircle(cx, cy - 3, Math.max(1, radius / 2));

    graphics.lineStyle(2, 0xffd43b, 1.0);
    graphics.lineBetween(cx, cy - 3, cx, cy + 7);
    graphics.lineBetween(cx, cy + 3, cx + 3, cy + 3);
    graphics.lineBetween(cx, cy + 6, cx + 3, cy + 6);
  }

  /**
   * Desenha o Orbe de Poder (Power Pellet).
   */
  static drawPowerPellet(
    graphics: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    cellSize: number,
    pulse: number
  ): void {
    const rOut = Math.floor(cellSize * 0.28 * (0.8 + 0.3 * pulse));
    graphics.fillStyle(0x36d5ed, 1.0);
    graphics.fillCircle(cx, cy, rOut);
    graphics.fillStyle(0xffffff, 1.0);
    graphics.fillCircle(cx, cy, Math.max(2, rOut * 0.5));
  }

  /**
   * Desenha o Portal de teleporte não local.
   */
  static drawPortal(
    graphics: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    cellSize: number,
    colorNum: number,
    pulse: number
  ): void {
    const rOut = Math.floor(cellSize * (0.35 + 0.12 * pulse));
    const rIn = Math.max(2, Math.floor(rOut * 0.5));
    graphics.lineStyle(2, colorNum, 0.95);
    graphics.strokeCircle(cx, cy, rOut);
    graphics.fillStyle(0xffffff, 0.9);
    graphics.fillCircle(cx, cy, rIn);
  }
}
