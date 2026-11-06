import type Phaser from 'phaser';

/** Arcade artwork only. Logical positions, hitboxes and AI belong to the scenes. */
export class CharacterRenderer {
  private static readonly motionPreference =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

  static drawPacMan(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    radius: number,
    facing: [number, number],
    time: number,
    isMoving: boolean,
  ): void {
    const [dr, dc] = facing;
    const angle = Math.atan2(dr, dc);
    const movingMouth = isMoving && !this.motionPreference?.matches;
    const mouth = movingMouth
      ? 0.12 + 0.65 * Math.abs(Math.sin(time * 0.014))
      : 0.2;
    // The silhouette remains inside the supplied drawing radius.
    graphics.fillStyle(0x060a13, 0.65);
    graphics.fillCircle(x, y + radius * 0.12, radius);
    graphics.fillStyle(0xffdf32, 1);
    graphics.beginPath();
    graphics.moveTo(x, y);
    for (let i = 0; i <= 32; i++) {
      const a = angle + mouth + ((Math.PI * 2 - mouth * 2) * i) / 32;
      graphics.lineTo(x + radius * Math.cos(a), y + radius * Math.sin(a));
    }
    graphics.closePath();
    graphics.fillPath();
    graphics.lineStyle(Math.max(0.7, radius * 0.07), 0xffb820, 0.85);
    graphics.strokePath();
    graphics.lineStyle(Math.max(1, radius * 0.11), 0xfff4a8, 0.65);
    graphics.beginPath();
    graphics.arc(
      x,
      y,
      radius * 0.74,
      angle + Math.PI * 0.8,
      angle + Math.PI * 1.2,
      false,
    );
    graphics.strokePath();
    const eyeX = x + (dc ? dc * radius * 0.12 : radius * 0.38);
    const eyeY = y + (dc ? -radius * 0.42 : dr * radius * 0.12);
    graphics.fillStyle(0x151b28, 1);
    graphics.fillCircle(eyeX, eyeY, Math.max(1.2, radius * 0.135));
  }

  private static drawSpecter(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    radius: number,
    facing: [number, number],
    frightened: boolean,
    remaining: number,
    time: number,
    color: number,
    horned: boolean,
  ): void {
    const visualTime = this.motionPreference?.matches ? 0 : time;
    const flash =
      frightened && remaining < 2 && Math.floor(visualTime / 400) % 2 === 1;
    const body = frightened ? (flash ? 0xf0f5ff : 0x284bd8) : color;
    const centerY = y + Math.sin(visualTime * 0.006) * radius * 0.035;
    const bottom = centerY + radius * 0.83;
    graphics.fillStyle(0x030711, 0.6);
    graphics.fillEllipse(x, y + radius * 0.95, radius * 1.7, radius * 0.3);
    graphics.fillStyle(body, 1);
    graphics.beginPath();
    graphics.moveTo(x - radius, bottom);
    graphics.lineTo(x - radius, centerY);
    graphics.arc(x, centerY, radius, Math.PI, Math.PI * 2, false);
    graphics.lineTo(x + radius, bottom);
    const segments = 6;
    const phase = Math.floor(visualTime / 160) % 2;
    for (let i = 1; i <= segments; i++) {
      const scallop = (i + phase) % 2 === 0 ? 0.82 : 0.52;
      graphics.lineTo(
        x + radius - (radius * 2 * i) / segments,
        centerY + radius * scallop,
      );
    }
    graphics.closePath();
    graphics.fillPath();
    graphics.lineStyle(
      Math.max(0.65, radius * 0.06),
      frightened ? 0xbedaff : 0xffffff,
      0.3,
    );
    graphics.beginPath();
    graphics.arc(
      x,
      centerY,
      radius * 0.82,
      Math.PI * 1.08,
      Math.PI * 1.76,
      false,
    );
    graphics.strokePath();
    if (horned && !frightened) {
      graphics.fillStyle(0xffefdc, 1);
      graphics.fillTriangle(
        x - radius * 0.8,
        centerY - radius * 0.35,
        x - radius * 0.96,
        centerY - radius * 1.02,
        x - radius * 0.38,
        centerY - radius * 0.65,
      );
      graphics.fillTriangle(
        x + radius * 0.8,
        centerY - radius * 0.35,
        x + radius * 0.96,
        centerY - radius * 1.02,
        x + radius * 0.38,
        centerY - radius * 0.65,
      );
    }
    const eyeY = centerY - radius * 0.12;
    if (frightened) {
      graphics.fillStyle(flash ? 0xe5404c : 0xffecbd, 1);
      graphics.fillCircle(x - radius * 0.35, eyeY, radius * 0.13);
      graphics.fillCircle(x + radius * 0.35, eyeY, radius * 0.13);
      graphics.lineStyle(
        Math.max(1, radius * 0.1),
        flash ? 0xe5404c : 0xffecbd,
        1,
      );
      graphics.beginPath();
      for (let i = 0; i < 6; i++) {
        const px = x - radius * 0.5 + i * radius * 0.2;
        const py = centerY + radius * (0.34 + (i % 2) * 0.14);
        if (i === 0) graphics.moveTo(px, py);
        else graphics.lineTo(px, py);
      }
      graphics.strokePath();
      return;
    }
    for (const side of [-1, 1]) {
      const eyeX = x + side * radius * 0.36;
      graphics.fillStyle(0xffffff, 1);
      graphics.fillEllipse(eyeX, eyeY, radius * 0.53, radius * 0.67);
      graphics.fillStyle(0x173b96, 1);
      graphics.fillEllipse(
        eyeX + facing[1] * radius * 0.115,
        eyeY + facing[0] * radius * 0.115,
        radius * 0.27,
        radius * 0.34,
      );
      graphics.fillStyle(0x93caff, 0.9);
      graphics.fillCircle(
        eyeX + facing[1] * radius * 0.115 - radius * 0.04,
        eyeY + facing[0] * radius * 0.115 - radius * 0.08,
        radius * 0.055,
      );
    }
  }

  static drawMinotaur(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    radius: number,
    facing: [number, number],
    isFrightened: boolean,
    remainingFrightSec: number,
    time: number,
  ): void {
    this.drawSpecter(
      graphics,
      x,
      y,
      radius,
      facing,
      isFrightened,
      remainingFrightSec,
      time,
      0xff4b59,
      true,
    );
  }

  static drawGhost(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    radius: number,
    facing: [number, number],
    isFrightened: boolean,
    remainingFrightSec: number,
    time: number,
  ): void {
    this.drawSpecter(
      graphics,
      x,
      y,
      radius,
      facing,
      isFrightened,
      remainingFrightSec,
      time,
      0xb08aff,
      false,
    );
  }

  /**
   * Desenha um Cadeado Fechado no destino trancado.
   */
  static drawLock(
    graphics: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    size: number,
  ): void {
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
    pulse: number,
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
    pulse: number,
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
    pulse: number,
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
    pulse: number,
  ): void {
    const rOut = Math.floor(cellSize * (0.35 + 0.12 * pulse));
    const rIn = Math.max(2, Math.floor(rOut * 0.5));
    graphics.lineStyle(2, colorNum, 0.95);
    graphics.strokeCircle(cx, cy, rOut);
    graphics.fillStyle(0xffffff, 0.9);
    graphics.fillCircle(cx, cy, rIn);
  }
}
