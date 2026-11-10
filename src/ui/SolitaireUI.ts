import { SolitaireEngine, MoveLocation, MoveHint } from '../engine/SolitaireEngine';
import { Card } from '../engine/Card';
import { CardRenderer, CardBackStyle } from '../gfx/CardRenderer';
import { WinAnimation } from '../gfx/WinAnimation';
import { SoundSynth } from '../engine/SoundSynth';
import { SixSealsDeal } from '../engine/SixSealsDeals';

interface PileCoords {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GameStats {
  played: number;
  won: number;
  bestTime: number | null; // seconds
  fewestMoves: number | null;
  currentStreak: number;
}

export class SolitaireUI {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private fxCanvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stockAction = document.querySelector<HTMLButtonElement>('#stock-action')!;
  private hintStatus = document.getElementById('hint-status')!;
  private lossOverlay = document.getElementById('loss-overlay')!;
  private reserveLabel = document.getElementById('reserve-label')!;
  private sealsStatus = document.getElementById('seals-status')!;

  private engine: SolitaireEngine;
  private soundSynth: SoundSynth;
  private winAnimation: WinAnimation;

  // Geometry
  private cardWidth = 80;
  private cardHeight = 112;
  private cardSpacing = 16;
  private tableauY = 160;
  private cardOffsetY = 24; // Vertical stack offset in tableau
  private layoutStackLength = 0;

  private stockCoords: PileCoords = { x: 0, y: 0, w: 0, h: 0 };
  private wasteCoords: PileCoords = { x: 0, y: 0, w: 0, h: 0 };
  private reserveCoords: PileCoords = { x: 0, y: 0, w: 0, h: 0 };
  private foundationCoords: PileCoords[] = [];
  private tableauCoords: PileCoords[] = [];

  // Interaction & Drag State
  private isDragging = false;
  private dragCards: Card[] = [];
  private dragOrigin: MoveLocation | null = null;
  private dragPos = { x: 0, y: 0 };
  private dragOffset = { x: 0, y: 0 };

  // Double tap / Click timing
  private lastTapTime = 0;
  private lastTapLocation: MoveLocation | null = null;

  // Game Loop & Timer
  private timerId: number | null = null;
  private isAutoFinishing = false;
  private hint: MoveHint | null = null;
  private availableHint: MoveHint | null = null;
  private gameLost = false;
  private winRecorded = false;
  private hintTimeoutId: number | null = null;

  // Settings & Theme
  private cardBackStyle: CardBackStyle = 'classic';
  private stats: GameStats = { played: 0, won: 0, bestTime: null, fewestMoves: null, currentStreak: 0 };

  constructor(
    container: HTMLElement,
    canvas: HTMLCanvasElement,
    fxCanvas: HTMLCanvasElement,
    engine: SolitaireEngine,
    soundSynth: SoundSynth
  ) {
    this.container = container;
    this.canvas = canvas;
    this.fxCanvas = fxCanvas;
    this.ctx = canvas.getContext('2d')!;
    this.engine = engine;
    this.soundSynth = soundSynth;
    this.winAnimation = new WinAnimation(fxCanvas);

    this.loadStats();
    this.initLayout();
    this.bindEvents();
    this.startTimer();
    this.checkGameStatus();
    this.render();
    void CardRenderer.loadClassicDeck().then(() => this.render());
  }

  private initLayout(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    this.fxCanvas.width = Math.round(w * dpr);
    this.fxCanvas.height = Math.round(h * dpr);
    this.fxCanvas.style.width = `${w}px`;
    this.fxCanvas.style.height = `${h}px`;

    this.ctx.scale(dpr, dpr);

    // Calculate responsive card dimensions
    // 7 columns + 8 margins = total width
    const totalMargins = 8;
    this.cardSpacing = Math.max(8, Math.min(20, Math.floor(w / 40)));
    const topY = Math.max(12, Math.floor(h * 0.02));
    const rowGap = Math.max(12, Math.floor(h * 0.03));
    const stackLength = Math.max(1, ...this.engine.tableau.map(column => column.length));
    this.layoutStackLength = stackLength;
    // Keep card sizes stable as columns grow; compress their vertical spacing instead.
    const heightLimit = Math.floor((h - topY - rowGap) / ((2 + 6 * 0.26) * 1.4));
    this.cardWidth = Math.max(24, Math.min(100, heightLimit, Math.floor((w - this.cardSpacing * totalMargins) / 7)));
    this.cardHeight = Math.floor(this.cardWidth * 1.4);
    this.cardOffsetY = Math.max(16, Math.floor(this.cardHeight * 0.26));
    if (stackLength > 1) {
      this.cardOffsetY = Math.max(4, Math.min(this.cardOffsetY, Math.floor((h - topY - rowGap - 2 * this.cardHeight) / (stackLength - 1))));
    }

    const startX = Math.floor((w - (7 * this.cardWidth + 6 * this.cardSpacing)) / 2);

    // Top row: Stock (col 0), Waste (col 1), Spacer (col 2), Foundations (col 3..6)
    this.stockCoords = { x: startX, y: topY, w: this.cardWidth, h: this.cardHeight };
    Object.assign(this.stockAction.style, {
      left: `${startX}px`, top: `${topY}px`, width: `${this.cardWidth}px`, height: `${this.cardHeight}px`
    });
    this.wasteCoords = { x: startX + this.cardWidth + this.cardSpacing, y: topY, w: this.cardWidth, h: this.cardHeight };

    this.reserveCoords = { ...this.stockCoords, x: startX + 2 * (this.cardWidth + this.cardSpacing) };
    const reserve = this.reserveCoords;
    Object.assign(this.reserveLabel.style, {
      left: reserve.x + 'px', top: reserve.y + 'px', width: reserve.w + 'px', height: reserve.h + 'px'
    });

    this.foundationCoords = [];
    for (let f = 0; f < 4; f++) {
      const fX = startX + (3 + f) * (this.cardWidth + this.cardSpacing);
      this.foundationCoords.push({ x: fX, y: topY, w: this.cardWidth, h: this.cardHeight });
    }

    // Tableau row
    this.tableauY = topY + this.cardHeight + rowGap;
    this.tableauCoords = [];
    for (let t = 0; t < 7; t++) {
      const tX = startX + t * (this.cardWidth + this.cardSpacing);
      this.tableauCoords.push({ x: tX, y: this.tableauY, w: this.cardWidth, h: this.cardHeight });
    }

    CardRenderer.clearCache();
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => {
      this.initLayout();
      this.render();
    });

    // Pointer events (handles Mouse & Touch seamlessly!)
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', () => this.finishDrag());
    this.stockAction.addEventListener('click', () => this.drawStock());
    this.lossOverlay.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      const buttons = [...this.lossOverlay.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
      const edge = event.shiftKey ? buttons[0] : buttons[buttons.length - 1];
      if (document.activeElement !== edge) return;
      event.preventDefault();
      (event.shiftKey ? buttons[buttons.length - 1] : buttons[0]).focus();
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.defaultPrevented || document.querySelector('.modal-backdrop:not(.hidden)')) return;
      if (e.target instanceof HTMLElement && e.target.closest('input, select, textarea, [contenteditable]')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.redo();
      } else if (e.key.toLowerCase() === 'h') {
        this.showHint();
      } else if (e.key.toLowerCase() === 'a') {
        this.startAutoComplete();
      } else if (e.key.toLowerCase() === 'n') {
        this.newGame();
      } else if (e.code === 'Space' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        this.drawStock();
      }
    });
  }

  private drawStock(): void {
    if (this.gameLost || this.isAutoFinishing || !this.engine.drawStock()) return;
    this.soundSynth.playCardFlip();
    this.checkGameStatus();
    this.render();
  }

  private getPointerPos(e: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private hitTest(pos: { x: number; y: number }): { location: MoveLocation; card?: Card; coords: PileCoords } | null {
    // Check Stock
    if (this.isInside(pos, this.stockCoords)) {
      return { location: { type: 'stock', index: 0 }, coords: this.stockCoords };
    }

    // Check Waste
    const wasteBox = this.topWasteCoords();
    if (wasteBox && this.isInside(pos, wasteBox)) {
      const topCard = this.engine.waste[this.engine.waste.length - 1];
      return { location: { type: 'waste', index: 0 }, card: topCard, coords: wasteBox };
    }

    if (this.engine.seals && this.isInside(pos, this.reserveCoords)) {
      return {
        location: { type: 'reserve', index: 0 },
        card: this.engine.seals.reserve ?? undefined,
        coords: this.reserveCoords
      };
    }

    // Check Foundations
    for (let f = 0; f < 4; f++) {
      const fc = this.foundationCoords[f];
      if (this.isInside(pos, fc)) {
        const pile = this.engine.foundations[f];
        const card = pile.length > 0 ? pile[pile.length - 1] : undefined;
        return { location: { type: 'foundation', index: f }, card, coords: fc };
      }
    }

    // Check Tableau
    for (let t = 0; t < 7; t++) {
      const tc = this.tableauCoords[t];
      const col = this.engine.tableau[t];

      if (col.length === 0) {
        if (this.isInside(pos, tc)) {
          return { location: { type: 'tableau', index: t }, coords: tc };
        }
      } else {
        // Search cards from top to bottom
        for (let i = col.length - 1; i >= 0; i--) {
          const cardY = tc.y + i * this.cardOffsetY;
          const cardBox: PileCoords = {
            x: tc.x,
            y: cardY,
            w: this.cardWidth,
            h: i === col.length - 1 ? this.cardHeight : this.cardOffsetY
          };
          if (this.isInside(pos, cardBox)) {
            return {
              location: { type: 'tableau', index: t, cardIndex: i },
              card: col[i],
              coords: { x: tc.x, y: cardY, w: this.cardWidth, h: this.cardHeight }
            };
          }
        }
      }
    }

    return null;
  }

  private isInside(pos: { x: number; y: number }, rect: PileCoords): boolean {
    return pos.x >= rect.x && pos.x <= rect.x + rect.w && pos.y >= rect.y && pos.y <= rect.y + rect.h;
  }

  private onPointerDown = (e: PointerEvent): void => {
    e.preventDefault();
    if (this.engine.gameWon || this.gameLost || this.isAutoFinishing) return;

    const pos = this.getPointerPos(e);
    const hit = this.hitTest(pos);
    if (!hit) return;

    const now = Date.now();
    const isDoubleTap = now - this.lastTapTime < 300 && this.isSameLocation(this.lastTapLocation, hit.location);
    this.lastTapTime = now;
    this.lastTapLocation = hit.location;

    // Single / Double tap auto move
    if (isDoubleTap || (hit.card && hit.card.faceUp)) {
      if (isDoubleTap) {
        if (this.engine.tryAutoMove(hit.location)) {
          this.soundSynth.playCardPlace();
          this.checkGameStatus();
          this.render();
          return;
        }
      }
    }

    // Start dragging cards
    if (hit.location.type === 'waste' && this.engine.waste.length > 0) {
      const card = this.engine.waste[this.engine.waste.length - 1];
      this.startDrag([card], hit.location, pos, hit.coords, e.pointerId);
    } else if ((hit.location.type === 'foundation' || hit.location.type === 'reserve') && hit.card) {
      this.startDrag([hit.card], hit.location, pos, hit.coords, e.pointerId);
    } else if (hit.location.type === 'tableau') {
      const col = this.engine.tableau[hit.location.index];
      const startIdx = hit.location.cardIndex ?? (col.length - 1);
      if (startIdx >= 0 && startIdx < col.length && col[startIdx].faceUp) {
        const dragStack = col.slice(startIdx);
        this.startDrag(dragStack, hit.location, pos, hit.coords, e.pointerId);
      }
    }
  };

  private startDrag(cards: Card[], location: MoveLocation, pos: { x: number; y: number }, coords: PileCoords, pointerId: number): void {
    this.isDragging = true;
    this.dragCards = cards;
    this.dragOrigin = location;
    this.dragOffset = { x: pos.x - coords.x, y: pos.y - coords.y };
    this.dragPos = { x: pos.x, y: pos.y };
    this.canvas.setPointerCapture(pointerId);
    this.render();
  }

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isDragging) return;
    this.dragPos = this.getPointerPos(e);
    this.render();
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.isDragging || !this.dragOrigin) return;

    const pos = this.getPointerPos(e);
    const hit = this.hitTest(pos);
    let success = false;

    if (hit && hit.location) {
      success = this.engine.moveCards(this.dragOrigin, hit.location);
    }

    if (success) {
      this.soundSynth.playCardPlace();
      this.checkGameStatus();
    } else {
      // Tap auto-move fallback on drop failure
      if (this.dragCards.length === 1 && this.engine.tryAutoMove(this.dragOrigin)) {
        this.soundSynth.playCardPlace();
        this.checkGameStatus();
      } else {
        this.soundSynth.playInvalidMove();
      }
    }

    this.finishDrag();
  };

  private finishDrag(): void {
    this.isDragging = false;
    this.dragCards = [];
    this.dragOrigin = null;
    this.render();
  }

  private isSameLocation(a: MoveLocation | null, b: MoveLocation | null): boolean {
    if (!a || !b) return false;
    return a.type === b.type && a.index === b.index && a.cardIndex === b.cardIndex;
  }

  public newGame(drawMode?: 1 | 3): void {
    if (drawMode === undefined && this.engine.sixSealsDeal) {
      this.newSixSealsDeal(this.engine.sixSealsDeal);
      return;
    }
    this.engine.initGame(drawMode);
    this.startDeal();
  }

  public newSixSealsDeal(deal: SixSealsDeal): void {
    this.engine.initSixSeals(deal);
    this.startDeal();
  }

  public retryDeal(): void {
    this.engine.retryDeal();
    this.startDeal();
  }

  private startDeal(): void {
    this.winAnimation.stop();
    this.winRecorded = false;
    this.isAutoFinishing = false;
    this.lastTapLocation = null;
    this.soundSynth.playCardFlip();
    this.loadStats();
    this.stats.played++;
    this.saveStats();
    this.updateStatsModalUI();

    document.getElementById('win-overlay')?.classList.add('hidden');
    this.initLayout();
    this.checkGameStatus();
    this.finishDrag();
  }

  public undo(): void {
    if (this.engine.undo()) {
      this.isAutoFinishing = false;
      this.soundSynth.playCardFlip();
      this.checkGameStatus();
      this.render();
    }
  }

  public redo(): void {
    if (this.engine.redo()) {
      this.isAutoFinishing = false;
      this.soundSynth.playCardFlip();
      this.checkGameStatus();
      this.render();
    }
  }

  public showHint(): void {
    if (this.engine.gameWon || this.gameLost || this.isAutoFinishing) return;
    this.clearHint();
    this.hint = this.availableHint;
    if (!this.hint) return;

    if (this.hint.to.type === 'reserve') {
      this.hintStatus.textContent = 'Spend a seal by dragging the highlighted card to the reserve.';
    } else if (this.hint.from.type === 'stock') {
      this.hintStatus.textContent = this.engine.stock.length > 0 ? 'Draw to reach a playable card.' : 'Recycle to reach a playable card.';
    } else {
      this.hintStatus.textContent = 'Move the highlighted card or stack to the highlighted pile.';
    }
    this.render();
    this.hintTimeoutId = window.setTimeout(() => {
      this.clearHint();
      this.render();
    }, 3500);
  }

  private clearHint(): void {
    if (this.hintTimeoutId !== null) clearTimeout(this.hintTimeoutId);
    this.hintTimeoutId = null;
    this.hint = null;
    this.hintStatus.textContent = '';
  }

  public startAutoComplete(): void {
    if (this.gameLost || !this.engine.canAutoComplete() || this.isAutoFinishing) return;
    this.clearHint();
    this.isAutoFinishing = true;

    const step = () => {
      if (!this.isAutoFinishing) return;
      const moved = this.engine.executeAutoCompleteStep();
      if (moved) {
        this.soundSynth.playCardPlace();
        this.render();
        if (this.engine.gameWon) {
          this.isAutoFinishing = false;
          this.checkGameStatus();
        } else {
          setTimeout(step, 80);
        }
      } else {
        this.isAutoFinishing = false;
        this.checkGameStatus();
        this.render();
      }
    };
    step();
  }

  private checkGameStatus(): void {
    this.clearHint();
    this.availableHint = this.engine.findHint();

    const wasLost = this.gameLost;
    this.gameLost = !this.engine.gameWon && this.availableHint === null;
    this.lossOverlay.classList.toggle('hidden', !this.gameLost);
    const undoLoss = document.querySelector<HTMLButtonElement>('#btn-loss-undo')!;
    undoLoss.disabled = !this.engine.canUndo;
    if (this.gameLost && !wasLost) {
      (undoLoss.disabled ? document.getElementById('btn-loss-retry') : undoLoss)?.focus();
    } else if (wasLost && !this.gameLost && this.lossOverlay.contains(document.activeElement)) {
      document.getElementById('btn-hint')?.focus();
    }

    document.getElementById('btn-auto-finish')?.classList.toggle('hidden', this.gameLost || !this.engine.canAutoComplete());
    if (!this.engine.gameWon) {
      this.winAnimation.stop();
      document.getElementById('win-overlay')?.classList.add('hidden');
      return;
    }

    this.soundSynth.playWinFanfare();
    this.winAnimation.start(this.engine.foundations, this.foundationCoords, this.cardBackStyle);

    if (!this.winRecorded) {
      this.winRecorded = true;
      this.stats.won++;
      this.stats.currentStreak++;
      if (this.stats.bestTime === null || this.engine.elapsedTime < this.stats.bestTime) {
        this.stats.bestTime = this.engine.elapsedTime;
      }
      if (this.stats.fewestMoves === null || this.engine.moves < this.stats.fewestMoves) {
        this.stats.fewestMoves = this.engine.moves;
      }
      this.saveStats();
      this.updateStatsModalUI();
    }

    const winBanner = document.getElementById('win-overlay');
    const winSummary = document.getElementById('win-summary');
    if (winBanner && winSummary) {
      const timeStr = this.formatTime(this.engine.elapsedTime);
      const mode = this.engine.seals ? 'Six Seals' : 'Classic Klondike';
      const result = this.engine.seals ? ' Seals spent: ' + this.engine.seals.spent + '.' : '';
      winSummary.innerText = 'You completed ' + mode + ' in ' + timeStr + ' with ' + this.engine.moves + ' moves!' + result;
      winBanner.classList.remove('hidden');
    }
  }

  private startTimer(): void {
    if (this.timerId !== null) clearInterval(this.timerId);
    this.timerId = window.setInterval(() => {
      if (this.engine.moves > 0 && !this.engine.gameWon && !this.gameLost) {
        this.engine.elapsedTime++;
        this.updateHUD();
      }
    }, 1000);
  }

  private updateHUD(): void {
    const scoreEl = document.getElementById('score-display');
    const movesEl = document.getElementById('moves-display');
    const timeEl = document.getElementById('time-display');

    if (scoreEl) scoreEl.innerText = this.engine.score.toString();
    if (movesEl) movesEl.innerText = this.engine.moves.toString();
    if (timeEl) timeEl.innerText = this.formatTime(this.engine.elapsedTime);
  }

  private formatTime(sec: number): string {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  public setCardBackStyle(style: CardBackStyle): void {
    this.cardBackStyle = style;
    CardRenderer.clearCache();
    this.render();
  }

  // --- Rendering Loop ---
  public render(): void {
    if (Math.max(1, ...this.engine.tableau.map(column => column.length)) !== this.layoutStackLength) {
      this.initLayout();
    }
    this.updateHUD();
    this.ctx.clearRect(0, 0, this.canvas.width / (window.devicePixelRatio || 1), this.canvas.height / (window.devicePixelRatio || 1));

    // 1. Draw Stock Pile
    const canDraw = this.engine.stock.length > 0;
    const canRecycle = !canDraw && this.engine.waste.length > 0;
    const stockLabel = canDraw ? 'Draw from stock' : canRecycle ? 'Recycle waste' : 'Stock empty';
    this.stockAction.disabled = this.gameLost || this.engine.gameWon || this.isAutoFinishing || (!canDraw && !canRecycle);
    this.stockAction.setAttribute('aria-label', stockLabel);
    this.stockAction.title = stockLabel;
    this.stockAction.textContent = canRecycle ? '↻' : '';
    this.drawPilePlaceholder(this.stockCoords);
    if (this.engine.stock.length > 0) {
      const topCard = this.engine.stock[this.engine.stock.length - 1];
      this.drawCard(topCard, this.stockCoords.x, this.stockCoords.y);
    }

    // 2. Draw Waste Pile
    this.drawPilePlaceholder(this.wasteCoords);
    if (this.engine.waste.length > 0) {
      // Draw waste cards (show slight offset for draw 3)
      const countToShow = this.wasteFanCount();
      const startIdx = this.engine.waste.length - countToShow;

      for (let i = startIdx; i < this.engine.waste.length; i++) {
        const card = this.engine.waste[i];
        if (this.isDragging && this.dragOrigin?.type === 'waste' && i === this.engine.waste.length - 1) continue;
        const offsetX = (i - startIdx) * Math.max(12, Math.floor(this.cardWidth * 0.22));
        this.drawCard(card, this.wasteCoords.x + offsetX, this.wasteCoords.y);
      }
    }

    const seals = this.engine.seals;
    this.reserveLabel.classList.toggle('hidden', !seals || seals.reserve !== null);
    if (seals) {
      this.drawPilePlaceholder(this.reserveCoords);
      this.reserveLabel.classList.toggle('reserve-empty', seals.available === 0);
      if (seals.reserve && !(this.isDragging && this.dragOrigin?.type === 'reserve')) {
        this.drawCard(seals.reserve, this.reserveCoords.x, this.reserveCoords.y);
      }
      const text = 'Seals: ' + seals.available + ' left · ' + seals.spent + ' spent';
      if (this.sealsStatus.textContent !== text) this.sealsStatus.textContent = text;
    }

    // 3. Draw Foundations
    for (let f = 0; f < 4; f++) {
      const fc = this.foundationCoords[f];
      const suitSymbols = ['♥', '♦', '♣', '♠'];
      this.drawPilePlaceholder(fc, suitSymbols[f]);

      const pile = this.engine.foundations[f];
      if (pile.length > 0) {
        const topCard = pile[pile.length - 1];
        if (!(this.isDragging && this.dragOrigin?.type === 'foundation' && this.dragOrigin.index === f)) {
          this.drawCard(topCard, fc.x, fc.y);
        }
      }
    }

    // 4. Draw Tableau
    for (let t = 0; t < 7; t++) {
      const tc = this.tableauCoords[t];
      this.drawPilePlaceholder(tc, 'K');

      const col = this.engine.tableau[t];
      for (let i = 0; i < col.length; i++) {
        // Skip cards currently being dragged
        if (this.isDragging && this.dragOrigin?.type === 'tableau' && this.dragOrigin.index === t && i >= (this.dragOrigin.cardIndex ?? 0)) {
          continue;
        }

        const card = col[i];
        const cardY = tc.y + i * this.cardOffsetY;
        this.drawCard(card, tc.x, cardY);
      }
    }

    // 5. Draw Hint Highlights
    if (this.hint) {
      this.drawHintHighlight();
    }

    // 6. Draw Dragging Stack
    if (this.isDragging && this.dragCards.length > 0) {
      const startX = this.dragPos.x - this.dragOffset.x;
      const startY = this.dragPos.y - this.dragOffset.y;

      for (let i = 0; i < this.dragCards.length; i++) {
        const card = this.dragCards[i];
        const cardY = startY + i * this.cardOffsetY;
        this.drawCard(card, startX, cardY, true);
      }
    }
  }

  private wasteFanCount(): number {
    return Math.min(this.engine.drawMode, this.engine.waste.length);
  }

  private topWasteCoords(): PileCoords | null {
    const count = this.wasteFanCount();
    if (count === 0) return null;
    const x = this.wasteCoords.x + (count - 1) * Math.max(12, Math.floor(this.cardWidth * 0.22));
    return { ...this.wasteCoords, x };
  }

  private drawCard(card: Card, x: number, y: number, isShadow = false): void {
    const cardCanvas = CardRenderer.getCardCanvas(card, this.cardWidth, this.cardHeight, this.cardBackStyle);

    if (isShadow) {
      this.ctx.save();
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      this.ctx.shadowBlur = 16;
      this.ctx.shadowOffsetY = 8;
      this.ctx.drawImage(cardCanvas, Math.round(x), Math.round(y), this.cardWidth, this.cardHeight);
      this.ctx.restore();
    } else {
      this.ctx.drawImage(cardCanvas, Math.round(x), Math.round(y), this.cardWidth, this.cardHeight);
    }
  }

  private drawPilePlaceholder(coords: PileCoords, label = ''): void {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.roundRect(coords.x, coords.y, coords.w, coords.h, coords.w * 0.08);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.fill();
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.stroke();

    if (label) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      this.ctx.font = `600 ${Math.round(coords.w * 0.35)}px "Outfit", sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(label, coords.x + coords.w / 2, coords.y + coords.h / 2);
    }
    this.ctx.restore();
  }

  private drawHintHighlight(): void {
    if (!this.hint) return;
    const { from, to } = this.hint;

    const fromCoords = this.getCoordsForLocation(from);
    const toCoords = this.getCoordsForLocation(to);

    this.ctx.save();
    [fromCoords, toCoords].forEach(c => {
      if (c) {
        this.ctx.beginPath();
        this.ctx.roundRect(c.x - 3, c.y - 3, c.w + 6, c.h + 6, c.w * 0.1);
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#f59e0b';
        this.ctx.stroke();
      }
    });
    this.ctx.restore();
  }

  private getCoordsForLocation(loc: MoveLocation): PileCoords | null {
    if (loc.type === 'stock') return this.stockCoords;
    if (loc.type === 'reserve') return this.reserveCoords;
    if (loc.type === 'waste') return this.topWasteCoords() ?? this.wasteCoords;
    if (loc.type === 'foundation') return this.foundationCoords[loc.index];
    if (loc.type === 'tableau') {
      const tc = this.tableauCoords[loc.index];
      const col = this.engine.tableau[loc.index];
      const idx = loc.cardIndex ?? Math.max(0, col.length - 1);
      return { x: tc.x, y: tc.y + idx * this.cardOffsetY, w: tc.w, h: tc.h };
    }
    return null;
  }

  // --- Persistence & Stats ---
  private get statsKey(): string {
    return this.engine.sixSealsDeal ? 'solitaire_stats_six_seals_' + this.engine.sixSealsDeal : 'solitaire_stats';
  }

  private loadStats(): void {
    this.stats = { played: 0, won: 0, bestTime: null, fewestMoves: null, currentStreak: 0 };
    try {
      const data = localStorage.getItem(this.statsKey);
      if (data) this.stats = JSON.parse(data);
    } catch {
      // Fallback defaults
    }
  }

  private saveStats(): void {
    try {
      localStorage.setItem(this.statsKey, JSON.stringify(this.stats));
    } catch {
      // Storage unavailable
    }
  }

  public updateStatsModalUI(): void {
    const title = document.getElementById('stats-title');
    if (title) title.textContent = this.engine.seals ? 'Six Seals statistics' : 'Classic Klondike statistics';
    const pEl = document.getElementById('stat-played');
    const wEl = document.getElementById('stat-won');
    const wrEl = document.getElementById('stat-winrate');
    const btEl = document.getElementById('stat-best-time');
    const fmEl = document.getElementById('stat-fewest-moves');
    const stEl = document.getElementById('stat-streak');

    if (pEl) pEl.innerText = this.stats.played.toString();
    if (wEl) wEl.innerText = this.stats.won.toString();
    if (wrEl) {
      const rate = this.stats.played > 0 ? Math.round((this.stats.won / this.stats.played) * 100) : 0;
      wrEl.innerText = `${rate}%`;
    }
    if (btEl) btEl.innerText = this.stats.bestTime !== null ? this.formatTime(this.stats.bestTime) : '--:--';
    if (fmEl) fmEl.innerText = this.stats.fewestMoves !== null ? this.stats.fewestMoves.toString() : '--';
    if (stEl) stEl.innerText = this.stats.currentStreak.toString();
  }

  public resetStats(): void {
    this.stats = { played: 0, won: 0, bestTime: null, fewestMoves: null, currentStreak: 0 };
    this.saveStats();
    this.updateStatsModalUI();
  }
}
