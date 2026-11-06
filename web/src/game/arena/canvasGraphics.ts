/** Small Canvas2D adapter for the existing Phaser artwork; no second game runtime. */
export class CanvasGraphics {
  constructor(private ctx: CanvasRenderingContext2D) {}
  clear() {
    this.ctx.clearRect(0, 0, 700, 700);
  }
  fillStyle(color: number, alpha = 1) {
    this.ctx.fillStyle = `rgba(${(color >> 16) & 255},${(color >> 8) & 255},${color & 255},${alpha})`;
  }
  lineStyle(width: number, color: number, alpha = 1) {
    this.ctx.lineWidth = width;
    this.ctx.strokeStyle = `rgba(${(color >> 16) & 255},${(color >> 8) & 255},${color & 255},${alpha})`;
  }
  beginPath() {
    this.ctx.beginPath();
  }
  closePath() {
    this.ctx.closePath();
  }
  moveTo(x: number, y: number) {
    this.ctx.moveTo(x, y);
  }
  lineTo(x: number, y: number) {
    this.ctx.lineTo(x, y);
  }
  arc(
    x: number,
    y: number,
    radius: number,
    start: number,
    end: number,
    anticlockwise = false,
  ) {
    this.ctx.arc(x, y, radius, start, end, anticlockwise);
  }
  fillPath() {
    this.ctx.fill();
  }
  strokePath() {
    this.ctx.stroke();
  }
  fillRect(x: number, y: number, w: number, h: number) {
    this.ctx.fillRect(x, y, w, h);
  }
  fillRoundedRect(x: number, y: number, w: number, h: number, radius: number) {
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, w, h, radius);
    this.ctx.fill();
  }
  strokeRoundedRect(
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
  ) {
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, w, h, radius);
    this.ctx.stroke();
  }
  fillCircle(x: number, y: number, radius: number) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }
  strokeCircle(x: number, y: number, radius: number) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.stroke();
  }
  fillEllipse(x: number, y: number, w: number, h: number) {
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }
  fillTriangle(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
  ) {
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.lineTo(x3, y3);
    this.ctx.closePath();
    this.ctx.fill();
  }
  lineBetween(x1: number, y1: number, x2: number, y2: number) {
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }
}
