import confetti from 'canvas-confetti';
import { Card } from '../engine/Card';
import { CardRenderer, CardBackStyle } from './CardRenderer';

interface BouncingCard {
  card: Card;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  canvas: HTMLCanvasElement;
}

export class WinAnimation {
  private fxCanvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animId: number | null = null;
  private activeCards: BouncingCard[] = [];
  private cardQueue: { card: Card; startX: number; startY: number; w: number; h: number }[] = [];
  private isRunning = false;
  private backStyle: CardBackStyle = 'classic';
  private frameCount = 0;

  constructor(fxCanvas: HTMLCanvasElement) {
    this.fxCanvas = fxCanvas;
    this.ctx = fxCanvas.getContext('2d', { willReadFrequently: false })!;
  }

  public start(
    foundations: Card[][],
    foundationCoords: { x: number; y: number; w: number; h: number }[],
    backStyle: CardBackStyle
  ): void {
    this.stop();
    this.isRunning = true;
    this.backStyle = backStyle;
    this.frameCount = 0;

    // Clear canvas once at start
    this.ctx.clearRect(0, 0, this.fxCanvas.width, this.fxCanvas.height);

    // Flatten foundation cards into sequence
    this.cardQueue = [];
    for (let f = 0; f < 4; f++) {
      const pile = foundations[f];
      const coords = foundationCoords[f];
      if (!coords || pile.length === 0) continue;

      for (let i = pile.length - 1; i >= 0; i--) {
        this.cardQueue.push({
          card: pile[i],
          startX: coords.x,
          startY: coords.y,
          w: coords.w,
          h: coords.h
        });
      }
    }

    // Trigger initial burst confetti
    this.fireConfetti();

    // Start animation loop
    this.loop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    this.activeCards = [];
    this.cardQueue = [];
    this.ctx.clearRect(0, 0, this.fxCanvas.width, this.fxCanvas.height);
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    this.frameCount++;

    // Spawn next card from queue periodically
    if (this.cardQueue.length > 0 && this.frameCount % 8 === 0) {
      const item = this.cardQueue.shift()!;
      const cardCanvas = CardRenderer.getCardCanvas(item.card, item.w, item.h, this.backStyle, false);

      const vx = (Math.random() - 0.5) * 12;
      const vy = -3 - Math.random() * 8;

      this.activeCards.push({
        card: item.card,
        x: item.startX,
        y: item.startY,
        vx: vx !== 0 ? vx : 4,
        vy,
        w: item.w,
        h: item.h,
        canvas: cardCanvas
      });
    }

    const gravity = 0.55;
    const canvasWidth = this.fxCanvas.width;
    const canvasHeight = this.fxCanvas.height;

    // Update & draw active cards leaving permanent bounce trails
    for (let i = 0; i < this.activeCards.length; i++) {
      const c = this.activeCards[i];

      c.x += c.vx;
      c.y += c.vy;
      c.vy += gravity;

      // Bounce off bottom
      if (c.y + c.h >= canvasHeight) {
        c.y = canvasHeight - c.h;
        c.vy = -c.vy * 0.82; // Bounce damping
      }

      // Draw card stamp on FX canvas (trail effect!)
      this.ctx.drawImage(c.canvas, Math.round(c.x), Math.round(c.y), Math.round(c.w), Math.round(c.h));
    }

    // Remove cards that bounced off left/right edges
    this.activeCards = this.activeCards.filter(c => c.x + c.w > -100 && c.x < canvasWidth + 100);

    if (this.cardQueue.length > 0 || this.activeCards.length > 0) {
      this.animId = requestAnimationFrame(this.loop);
    }
  };

  private fireConfetti(): void {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }
}
