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

    // Olho do Pac-Man
    const eyeAngle = baseAngle + Math.PI / 2.3;
    const eyeDist = radius * 0.55;
    const ex = x + eyeDist * Math.cos(eyeAngle);
    const ey = y + eyeDist * Math.sin(eyeAngle);

    graphics.fillStyle(0x090d16, 1.0);
    graphics.fillCircle(ex, ey, Math.max(1.8, radius * 0.18));
  }

  /**
   * Renderiza o Minotauro Vermelho (Caçador Direto).
   */
  static drawMinotaur(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    radius: number,
    facing: [number, number],
    isFrightened: boolean,
    remainingFrightSec: number,
    time: number
  ): void {
    let bodyColor = 0xef5350; // Vermelho carmesim

    if (isFrightened) {
      bodyColor = 0x2563eb; // Azul royal
      if (remainingFrightSec < 2.0 && Math.floor(time / 200) % 2 === 0) {
        bodyColor = 0xf5f7fb; // Pisca em branco
      }
    }

    // Corpo do Minotauro
    graphics.fillStyle(bodyColor, 1.0);
    graphics.fillCircle(x, y, radius);

    if (!isFrightened) {
      // Chifres brancos estilizados
      graphics.fillStyle(0xffffff, 1.0);
      graphics.fillTriangle(
        x - radius,
        y,
        x - radius - radius * 0.28,
        y - 7,
        x - radius + 2,
        y - 3
      );
      graphics.fillTriangle(
        x + radius,
        y,
        x + radius + radius * 0.28,
        y - 7,
        x + radius - 2,
        y - 3
      );
    }

    graphics.lineStyle(1.2, isFrightened ? 0xb7e1ff : 0xffaaa2, 0.8);
    graphics.strokeCircle(x, y, radius * 0.91);

    // Olhos e pupilas
    const eyeOffsetX = 3.5;
    const eyeOffsetY = -2;
    const eyeRadius = 3;

    graphics.fillStyle(0xffffff, 1.0);
    graphics.fillCircle(x - eyeOffsetX, y + eyeOffsetY, eyeRadius);
    graphics.fillCircle(x + eyeOffsetX, y + eyeOffsetY, eyeRadius);

    const pupilColor = isFrightened ? 0x1e3a8a : 0x991b1b;
    const pupilDx = facing[1] * 1.2;
    const pupilDy = facing[0] * 1.2;

    graphics.fillStyle(pupilColor, 1.0);
    graphics.fillCircle(x - eyeOffsetX + pupilDx, y + eyeOffsetY + pupilDy, 1.5);
    graphics.fillCircle(x + eyeOffsetX + pupilDx, y + eyeOffsetY + pupilDy, 1.5);
  }

  /**
   * Renderiza o Fantasma Roxo (Espectro Emboscador).
   */
  static drawGhost(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    radius: number,
    facing: [number, number],
    isFrightened: boolean,
    remainingFrightSec: number,
    time: number
  ): void {
    let bodyColor = 0xa66bff; // Roxo neon

    if (isFrightened) {
      bodyColor = 0x2563eb; // Azul royal
      if (remainingFrightSec < 2.0 && Math.floor(time / 200) % 2 === 0) {
        bodyColor = 0xf5f7fb; // Pisca
      }
    }

    // Corpo arredondado superior com base ondulada
    graphics.fillStyle(bodyColor, 1.0);
    graphics.fillCircle(x, y - 2, radius);
    graphics.fillRect(x - radius, y - 2, radius * 2, radius * 0.9);

    // Ondulações na saia do fantasma
    const skirtStep = (radius * 2) / 3;
    for (let i = 0; i < 3; i++) {
      const wave = Math.sin(time * 0.006 + i * Math.PI / 2) * radius * 0.045;
      graphics.fillCircle(x - radius + skirtStep * i + skirtStep / 2, y + radius * 0.7 + wave, skirtStep / 2);
    }

    graphics.lineStyle(1.2, isFrightened ? 0xb7e1ff : 0xdac3ff, 0.8);
    graphics.beginPath();
    graphics.arc(x, y - 2, radius * 0.85, Math.PI * 1.1, Math.PI * 1.9, false);
    graphics.strokePath();

    // Olhos
    const eyeOffsetX = 3.5;
    const eyeOffsetY = -2.5;

    graphics.fillStyle(0xffffff, 1.0);
    graphics.fillCircle(x - eyeOffsetX, y + eyeOffsetY, 3);
    graphics.fillCircle(x + eyeOffsetX, y + eyeOffsetY, 3);

    const pupilColor = isFrightened ? 0x1e3a8a : 0x3b0764;
    const pupilDx = facing[1] * 1.2;
    const pupilDy = facing[0] * 1.2;

    graphics.fillStyle(pupilColor, 1.0);
    graphics.fillCircle(x - eyeOffsetX + pupilDx, y + eyeOffsetY + pupilDy, 1.5);
    graphics.fillCircle(x + eyeOffsetX + pupilDx, y + eyeOffsetY + pupilDy, 1.5);
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
