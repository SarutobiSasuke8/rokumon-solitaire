import { Card } from '../engine/Card';

export type CardBackStyle = 'classic' | 'red' | 'gold' | 'green' | 'cyber' | 'obsidian';

export class CardRenderer {
  private static cache: Map<string, HTMLCanvasElement> = new Map();
  private static classicFaces = new Map<string, HTMLImageElement>();
  private static classicLoad: Promise<boolean> | null = null;

  /** Load a complete deck atomically; retain procedural rendering on failure. */
  public static loadClassicDeck(assetBase = document.baseURI): Promise<boolean> {
    if (!this.classicLoad) {
      this.classicLoad = Promise.all(
        (['hearts', 'diamonds', 'clubs', 'spades'] as const).flatMap(suit =>
          Array.from({ length: 13 }, (_, i) => {
            const rank = i + 1;
            const label = rank === 1 ? 'A' : rank === 10 ? 'T' : rank === 11 ? 'J' : rank === 12 ? 'Q' : rank === 13 ? 'K' : String(rank);
            const file = `classic-${label}${suit[0].toUpperCase()}.svg`;
            return new Promise<[string, HTMLImageElement]>((resolve, reject) => {
              const image = new Image();
              image.onload = () => resolve([`${suit}_${rank}`, image]);
              image.onerror = () => reject(new Error(`Unable to load ${file}`));
              image.src = new URL(file, assetBase).href;
            });
          })
        )
      ).then(faces => {
        this.classicFaces = new Map(faces);
        this.clearCache();
        return true;
      }).catch(error => {
        console.warn('Classic deck unavailable; using procedural cards.', error);
        return false;
      });
    }
    return this.classicLoad;
  }

  /**
   * Render or retrieve cached canvas representation of a card
   */
  public static getCardCanvas(
    card: Card,
    width: number,
    height: number,
    backStyle: CardBackStyle = 'classic',
    isHighDPI = true
  ): HTMLCanvasElement {
    const scale = isHighDPI ? (window.devicePixelRatio || 1) : 1;
    const cacheKey = card.faceUp ? `${card.id}_${width}_${height}_${scale}` : `back_${backStyle}_${width}_${height}_${scale}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);

    const borderRadius = width * 0.08;

    if (!card.faceUp) {
      this.drawCardBack(ctx, width, height, borderRadius, backStyle);
    } else {
      this.drawCardFront(ctx, card, width, height, borderRadius);
    }

    this.cache.set(cacheKey, canvas);
    return canvas;
  }

  public static clearCache(): void {
    this.cache.clear();
  }

  private static drawCardBase(ctx: CanvasRenderingContext2D, w: number, h: number, r: number, fillColor: string): void {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, r);
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Subtle inner bevel highlight
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(1, 1, w - 2, h - 2, r * 0.9);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  private static drawCardFront(ctx: CanvasRenderingContext2D, card: Card, w: number, h: number, r: number): void {
    const face = this.classicFaces.get(`${card.suit}_${card.rank}`);
    if (face) {
      ctx.drawImage(face, 0, 0, w, h);
      return;
    }
    // Rich paper gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#f4f6f8');

    this.drawCardBase(ctx, w, h, r, '#ffffff');

    // Fill gradient
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, r);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    const isRed = card.color === 'red';
    const textColor = isRed ? '#d32f2f' : '#111827';
    const suitSymbol = card.suitSymbol;
    const rankLabel = card.rankLabel;

    // Faint center suit watermark underlay for rich visual depth
    if (card.rank <= 10 && card.rank > 1) {
      ctx.save();
      ctx.fillStyle = isRed ? 'rgba(211, 47, 47, 0.05)' : 'rgba(17, 24, 39, 0.04)';
      const watermarkSize = Math.round(w * 0.65);
      ctx.font = `${watermarkSize}px "Outfit", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(suitSymbol, w / 2, h / 2);
      ctx.restore();
    }

    // Corner Top-Left Rank & Suit
    ctx.fillStyle = textColor;
    const fontSize = Math.round(w * 0.22);
    ctx.font = `700 ${fontSize}px "Outfit", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const marginX = w * 0.16;
    const marginY = h * 0.08;

    ctx.fillText(rankLabel, marginX, marginY);

    const suitFontSize = Math.round(w * 0.18);
    ctx.font = `${suitFontSize}px "Outfit", sans-serif`;
    ctx.fillText(suitSymbol, marginX, marginY + fontSize * 0.95);

    // Corner Bottom-Right upside down
    ctx.save();
    ctx.translate(w, h);
    ctx.rotate(Math.PI);
    ctx.font = `700 ${fontSize}px "Outfit", sans-serif`;
    ctx.fillText(rankLabel, marginX, marginY);
    ctx.font = `${suitFontSize}px "Outfit", sans-serif`;
    ctx.fillText(suitSymbol, marginX, marginY + fontSize * 0.95);
    ctx.restore();

    // Center Suit/Face Illustration
    if (card.rank >= 11 && card.rank <= 13) {
      this.drawFaceCardArt(ctx, card, w, h, r, isRed);
    } else if (card.rank === 1) {
      // Ace Large Center Suit Symbol
      const aceSuitSize = Math.round(w * 0.46);
      ctx.font = `${aceSuitSize}px "Outfit", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(suitSymbol, w / 2, h / 2);
    } else {
      // Pip layouts for 2-10
      this.drawCardPips(ctx, card, w, h);
    }
  }

  private static drawFaceCardArt(ctx: CanvasRenderingContext2D, card: Card, w: number, h: number, r: number, isRed: boolean): void {
    const boxW = w * 0.52;
    const boxH = h * 0.58;
    const boxX = (w - boxW) / 2;
    const boxY = (h - boxH) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, r * 0.5);
    ctx.fillStyle = isRed ? '#fff5f5' : '#f5f7ff';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = isRed ? '#e57373' : '#7986cb';
    ctx.stroke();

    // Large Face Card Crown/Silhouette
    ctx.fillStyle = isRed ? '#d32f2f' : '#283593';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const faceFont = Math.round(w * 0.32);
    ctx.font = `800 ${faceFont}px "Outfit", sans-serif`;
    ctx.fillText(card.rankLabel, w / 2, h / 2 - h * 0.05);

    const suitFont = Math.round(w * 0.24);
    ctx.font = `${suitFont}px "Outfit", sans-serif`;
    ctx.fillText(card.suitSymbol, w / 2, h / 2 + h * 0.15);

    ctx.restore();
  }

  private static drawCardPips(ctx: CanvasRenderingContext2D, card: Card, w: number, h: number): void {
    const pipSize = Math.round(w * 0.22);
    ctx.font = `${pipSize}px "Outfit", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const cx = w / 2;
    const cy = h / 2;
    const topY = h * 0.28;
    const botY = h * 0.72;

    switch (card.rank) {
      case 2:
        ctx.fillText(card.suitSymbol, cx, topY);
        ctx.fillText(card.suitSymbol, cx, botY);
        break;
      case 3:
        ctx.fillText(card.suitSymbol, cx, topY);
        ctx.fillText(card.suitSymbol, cx, cy);
        ctx.fillText(card.suitSymbol, cx, botY);
        break;
      case 4:
        ctx.fillText(card.suitSymbol, cx - w * 0.16, topY);
        ctx.fillText(card.suitSymbol, cx + w * 0.16, topY);
        ctx.fillText(card.suitSymbol, cx - w * 0.16, botY);
        ctx.fillText(card.suitSymbol, cx + w * 0.16, botY);
        break;
      case 5:
        ctx.fillText(card.suitSymbol, cx - w * 0.16, topY);
        ctx.fillText(card.suitSymbol, cx + w * 0.16, topY);
        ctx.fillText(card.suitSymbol, cx, cy);
        ctx.fillText(card.suitSymbol, cx - w * 0.16, botY);
        ctx.fillText(card.suitSymbol, cx + w * 0.16, botY);
        break;
      default:
        ctx.fillText(card.suitSymbol, cx - w * 0.16, topY);
        ctx.fillText(card.suitSymbol, cx + w * 0.16, topY);
        ctx.fillText(card.suitSymbol, cx, cy);
        ctx.fillText(card.suitSymbol, cx - w * 0.16, botY);
        ctx.fillText(card.suitSymbol, cx + w * 0.16, botY);
        break;
    }
  }

  private static drawCardBack(ctx: CanvasRenderingContext2D, w: number, h: number, r: number, style: CardBackStyle): void {
    let mainColor = '#1e3a8a';
    let patternColor = '#3b82f6';
    let borderColor = '#ffffff';

    if (style === 'red') {
      mainColor = '#991b1b';
      patternColor = '#ef4444';
      borderColor = '#fef08a';
    } else if (style === 'gold') {
      mainColor = '#854d0e';
      patternColor = '#eab308';
      borderColor = '#fef08a';
    } else if (style === 'green') {
      mainColor = '#065f46';
      patternColor = '#10b981';
      borderColor = '#a7f3d0';
    } else if (style === 'cyber') {
      mainColor = '#831843';
      patternColor = '#ec4899';
      borderColor = '#06b6d4';
    } else if (style === 'obsidian') {
      mainColor = '#111827';
      patternColor = '#374151';
      borderColor = '#9ca3af';
    }

    this.drawCardBase(ctx, w, h, r, mainColor);

    const pad = w * 0.08;
    const innerW = w - pad * 2;
    const innerH = h - pad * 2;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(pad, pad, innerW, innerH, r * 0.6);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Geometric pattern fill
    ctx.clip();
    ctx.fillStyle = patternColor;
    ctx.globalAlpha = 0.28;

    const step = w * 0.15;
    for (let x = -h; x < w + h; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + step / 2, 0);
      ctx.lineTo(x + step / 2 + h, h);
      ctx.lineTo(x + h, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}
