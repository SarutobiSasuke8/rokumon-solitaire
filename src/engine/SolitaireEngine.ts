import { Card } from './Card';
import { Deck } from './Deck';
import { createSixSealsChallenge, SixSealsDeal } from './SixSealsDeals';

export type PileType = 'stock' | 'waste' | 'foundation' | 'tableau' | 'reserve';

export interface MoveLocation {
  type: PileType;
  index: number; // 0-3 for foundation, 0-6 for tableau, 0 for stock/waste
  cardIndex?: number;
}

export interface EngineStateSnapshot {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: Card[][];
  score: number;
  moves: number;
  seals?: SealState;
}

interface SealState {
  available: number;
  spent: number;
  milestones: number;
  reserve: Card | null;
}

const reserveLocation: MoveLocation = { type: 'reserve', index: 0 };
const sealRanks = [2, 4, 6, 8, 10];

export interface MoveHint {
  from: MoveLocation;
  to: MoveLocation;
}

export class SolitaireEngine {
  public stock: Card[] = [];
  public waste: Card[] = [];
  public foundations: Card[][] = [[], [], [], []];
  public tableau: Card[][] = [[], [], [], [], [], [], []];

  public drawMode: 1 | 3 = 1;
  public score = 0;
  public moves = 0;
  public gameWon = false;
  public elapsedTime = 0; // in seconds

  public sixSealsDeal: SixSealsDeal | null = null;
  public seals: SealState | null = null;

  private initialDeck: Card[] = [];
  private undoStack: EngineStateSnapshot[] = [];
  private redoStack: EngineStateSnapshot[] = [];

  constructor(drawMode: 1 | 3 = 1) {
    this.drawMode = drawMode;
    this.initGame();
  }

  public initGame(drawMode: 1 | 3 = this.drawMode): void {
    this.sixSealsDeal = null;
    this.drawMode = drawMode;
    this.initialDeck = Deck.shuffle(Deck.createStandardDeck());
    this.retryDeal();
  }

  public initSixSeals(deal: SixSealsDeal): void {
    this.sixSealsDeal = deal;
    this.drawMode = 1;
    if (deal === 'full') this.initialDeck = Deck.shuffle(Deck.createStandardDeck());
    this.retryDeal();
  }

  public retryDeal(): void {
    this.foundations = [[], [], [], []];
    this.tableau = [[], [], [], [], [], [], []];
    this.stock = [];
    this.waste = [];

    this.score = 0;
    this.moves = 0;
    this.gameWon = false;
    this.elapsedTime = 0;
    this.undoStack = [];
    this.redoStack = [];
    const challenge = this.sixSealsDeal !== null && this.sixSealsDeal !== 'full';
    this.seals = this.sixSealsDeal
      ? { available: 1, spent: 0, milestones: challenge ? sealRanks.length : 0, reserve: null }
      : null;

    if (this.sixSealsDeal !== null && this.sixSealsDeal !== 'full') {
      const { foundations, tableau } = createSixSealsChallenge(this.sixSealsDeal);
      this.foundations = foundations;
      this.tableau = tableau;
      return;
    }

    const deck = this.initialDeck.map(card => card.clone());
    // Deal to tableau (1 card in col 0, 2 in col 1, ..., 7 in col 6)
    let cardIdx = 0;
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const card = deck[cardIdx++];
        if (row === col) {
          card.faceUp = true;
        } else {
          card.faceUp = false;
        }
        this.tableau[col].push(card);
      }
    }

    // Remaining 24 cards go to stock (face down)
    while (cardIdx < deck.length) {
      const card = deck[cardIdx++];
      card.faceUp = false;
      this.stock.push(card);
    }
  }

  public takeSnapshot(): EngineStateSnapshot {
    return {
      stock: this.stock.map(c => c.clone()),
      waste: this.waste.map(c => c.clone()),
      foundations: this.foundations.map(f => f.map(c => c.clone())),
      tableau: this.tableau.map(t => t.map(c => c.clone())),
      score: this.score,
      moves: this.moves,
      seals: this.seals ? { ...this.seals, reserve: this.seals.reserve?.clone() ?? null } : undefined
    };
  }

  public restoreSnapshot(snapshot: EngineStateSnapshot): void {
    this.stock = snapshot.stock.map(c => c.clone());
    this.waste = snapshot.waste.map(c => c.clone());
    this.foundations = snapshot.foundations.map(f => f.map(c => c.clone()));
    this.tableau = snapshot.tableau.map(t => t.map(c => c.clone()));
    this.score = snapshot.score;
    this.moves = snapshot.moves;
    this.seals = snapshot.seals ? { ...snapshot.seals, reserve: snapshot.seals.reserve?.clone() ?? null } : null;
    this.gameWon = this.checkWinCondition();
  }

  private pushUndoState(): void {
    this.undoStack.push(this.takeSnapshot());
    this.redoStack = []; // clear redo on new move
  }

  public undo(): boolean {
    if (this.undoStack.length === 0) return false;
    const current = this.takeSnapshot();
    this.redoStack.push(current);

    const prev = this.undoStack.pop()!;
    this.restoreSnapshot(prev);
    return true;
  }

  public redo(): boolean {
    if (this.redoStack.length === 0) return false;
    const current = this.takeSnapshot();
    this.undoStack.push(current);

    const next = this.redoStack.pop()!;
    this.restoreSnapshot(next);
    return true;
  }

  public get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Draw stock card(s) to waste or recycle waste back to stock
   */
  public drawStock(): boolean {
    if (this.gameWon || (this.stock.length === 0 && this.waste.length === 0)) return false;

    this.pushUndoState();
    this.moves++;

    if (this.stock.length > 0) {
      const count = Math.min(this.drawMode, this.stock.length);
      for (let i = 0; i < count; i++) {
        const card = this.stock.pop()!;
        card.faceUp = true;
        this.waste.push(card);
      }
    } else {
      // Recycle waste back to stock
      while (this.waste.length > 0) {
        const card = this.waste.pop()!;
        card.faceUp = false;
        this.stock.push(card);
      }
    }
    return true;
  }

  /**
   * Check if a card can be placed on a foundation pile
   */
  public canMoveToFoundation(card: Card, foundationIndex: number): boolean {
    const pile = this.foundations[foundationIndex];
    if (pile.length === 0) {
      return card.rank === 1; // Ace only on empty foundation
    }
    const topCard = pile[pile.length - 1];
    return card.suit === topCard.suit && card.rank === topCard.rank + 1;
  }

  /**
   * Check if a card (or stack starting with card) can be placed on a tableau pile
   */
  public canMoveToTableau(card: Card, tableauIndex: number): boolean {
    const pile = this.tableau[tableauIndex];
    if (pile.length === 0) {
      return card.rank === 13; // King only on empty tableau
    }
    const topCard = pile[pile.length - 1];
    return card.color !== topCard.color && card.rank === topCard.rank - 1;
  }

  /**
   * Move cards between piles
   */
  public moveCards(from: MoveLocation, to: MoveLocation): boolean {
    if (!this.isValidMove(from, to)) return false;

    this.pushUndoState();
    this.moves++;

    const cardsToMove: Card[] = [];

    // Extract cards from source
    if (from.type === 'waste') {
      cardsToMove.push(this.waste.pop()!);
      if (to.type === 'foundation') this.score += 10;
      else if (to.type === 'tableau') this.score += 5;
    } else if (from.type === 'reserve' && this.seals?.reserve) {
      cardsToMove.push(this.seals.reserve);
      this.seals.reserve = null;
      if (to.type === 'foundation') this.score += 10;
      else if (to.type === 'tableau') this.score += 5;
    } else if (from.type === 'foundation') {
      cardsToMove.push(this.foundations[from.index].pop()!);
      if (to.type === 'tableau') this.score = Math.max(0, this.score - 15);
    } else if (from.type === 'tableau') {
      const sourceCol = this.tableau[from.index];
      const startIdx = from.cardIndex ?? (sourceCol.length - 1);
      const sliced = sourceCol.splice(startIdx);
      cardsToMove.push(...sliced);

      // Auto-flip revealed top card of tableau column
      if (sourceCol.length > 0 && !sourceCol[sourceCol.length - 1].faceUp) {
        sourceCol[sourceCol.length - 1].faceUp = true;
        this.score += 5; // Points for turning face down card
      }

      if (to.type === 'foundation') this.score += 10;
    }

    // Append cards to destination
    if (to.type === 'foundation') {
      this.foundations[to.index].push(...cardsToMove);
      this.awardSeals();
    } else if (to.type === 'tableau') {
      this.tableau[to.index].push(...cardsToMove);
    } else if (to.type === 'reserve' && this.seals) {
      this.seals.reserve = cardsToMove[0];
      this.seals.available--;
      this.seals.spent++;
    }

    this.gameWon = this.checkWinCondition();
    return true;
  }

  private awardSeals(): void {
    if (!this.seals) return;
    const lowestFoundation = Math.min(...this.foundations.map(pile => pile.length));
    while (this.seals.milestones < sealRanks.length && lowestFoundation >= sealRanks[this.seals.milestones]) {
      this.seals.milestones++;
      this.seals.available++;
    }
  }

  private get canUseReserve(): boolean {
    return this.seals !== null && this.seals.available > 0 && this.seals.reserve === null;
  }

  public isValidMove(from: MoveLocation, to: MoveLocation): boolean {
    if (this.gameWon || (from.type === to.type && from.index === to.index)) return false;
    let movingCards: Card[] = [];

    if (from.type === 'waste') {
      if (this.waste.length === 0) return false;
      movingCards = [this.waste[this.waste.length - 1]];
    } else if (from.type === 'reserve') {
      if (!this.seals?.reserve) return false;
      movingCards = [this.seals.reserve];
    } else if (from.type === 'foundation') {
      if (this.foundations[from.index].length === 0) return false;
      movingCards = [this.foundations[from.index][this.foundations[from.index].length - 1]];
    } else if (from.type === 'tableau') {
      const col = this.tableau[from.index];
      const startIdx = from.cardIndex ?? (col.length - 1);
      if (startIdx < 0 || startIdx >= col.length) return false;
      movingCards = col.slice(startIdx);
      if (movingCards.some(c => !c.faceUp)) return false; // cannot move hidden cards
    }

    if (movingCards.length === 0) return false;
    const baseCard = movingCards[0];

    if (to.type === 'reserve') {
      return this.canUseReserve && movingCards.length === 1 && (from.type === 'tableau' || from.type === 'waste');
    }
    if (to.type === 'foundation') {
      if (movingCards.length > 1) return false; // only 1 card at a time to foundation
      return this.canMoveToFoundation(baseCard, to.index);
    } else if (to.type === 'tableau') {
      return this.canMoveToTableau(baseCard, to.index);
    }

    return false;
  }

  /**
   * Attempt single tap auto-move: tries Foundations first, then Tableau
   */
  public tryAutoMove(from: MoveLocation): boolean {
    let card: Card | null = null;
    if (from.type === 'waste' && this.waste.length > 0) {
      card = this.waste[this.waste.length - 1];
    } else if (from.type === 'reserve') {
      card = this.seals?.reserve ?? null;
    } else if (from.type === 'tableau') {
      const col = this.tableau[from.index];
      const idx = from.cardIndex ?? (col.length - 1);
      if (idx >= 0 && idx < col.length && col[idx].faceUp) {
        card = col[idx];
      }
    }

    if (!card) return false;

    // Check Foundations
    for (let f = 0; f < 4; f++) {
      if (this.isValidMove(from, { type: 'foundation', index: f })) {
        return this.moveCards(from, { type: 'foundation', index: f });
      }
    }

    // Check Tableau (only move single card or stack to valid non-empty, or king to empty)
    for (let t = 0; t < 7; t++) {
      if (from.type === 'tableau' && from.index === t) continue;
      if (this.isValidMove(from, { type: 'tableau', index: t })) {
        return this.moveCards(from, { type: 'tableau', index: t });
      }
    }

    return false;
  }

  private findPlacement(from: MoveLocation, card: Card, count = 1): MoveHint | null {
    if (from.type !== 'foundation' && count === 1) {
      for (let index = 0; index < this.foundations.length; index++) {
        if (this.canMoveToFoundation(card, index)) return { from, to: { type: 'foundation', index } };
      }
    }

    for (let index = 0; index < this.tableau.length; index++) {
      if (from.type === 'tableau') {
        if (from.index === index) continue;
        // A whole King-led column moved into an empty slot only swaps two columns.
        if (from.cardIndex === 0 && this.tableau[index].length === 0) continue;
      }
      if (this.canMoveToTableau(card, index)) return { from, to: { type: 'tableau', index } };
    }
    return null;
  }

  public findHint(): MoveHint | null {
    if (this.gameWon) return null;

    const waste: MoveLocation = { type: 'waste', index: 0 };
    const topWaste = this.waste[this.waste.length - 1];
    if (topWaste) {
      const move = this.findPlacement(waste, topWaste);
      if (move) return move;
    }

    if (this.seals?.reserve) {
      const move = this.findPlacement(reserveLocation, this.seals.reserve);
      if (move) return move;
    }

    let rearrangement: MoveHint | null = null;
    for (const [index, column] of this.tableau.entries()) {
      for (const [cardIndex, card] of column.entries()) {
        if (!card.faceUp) continue;
        const move = this.findPlacement({ type: 'tableau', index, cardIndex }, card, column.length - cardIndex);
        if (!move) continue;
        const clearsOrReveals = cardIndex === 0 || !column[cardIndex - 1].faceUp;
        if (clearsOrReveals || move.to.type === 'foundation') return move;
        rearrangement ??= move;
      }
    }

    const drawOrder = [...this.stock].reverse();
    const recycleOrder = [...this.waste, ...drawOrder];
    // The recycled order repeats on subsequent passes until a card is played.
    // In Draw 3 only the last card of each group, including a short final group, is playable.
    for (const order of [drawOrder, recycleOrder]) {
      for (let offset = 0; offset < order.length; offset += this.drawMode) {
        const card = order[Math.min(offset + this.drawMode, order.length) - 1];
        if (this.findPlacement(waste, card)) return { from: { type: 'stock', index: 0 }, to: waste };
      }
    }

    if (this.canUseReserve) {
      // Prefer parking a card that turns over a hidden card, and never spend a seal automatically.
      const reveal = this.tableau.findIndex(column => column.length > 1 && !column[column.length - 2].faceUp);
      if (reveal >= 0) return { from: { type: 'tableau', index: reveal }, to: reserveLocation };
      if (topWaste) return { from: waste, to: reserveLocation };
      const occupied = this.tableau.findIndex(column => column.length > 0);
      if (occupied >= 0) return { from: { type: 'tableau', index: occupied }, to: reserveLocation };
      if (this.stock.length > 0) return { from: { type: 'stock', index: 0 }, to: waste };
    }

    if (rearrangement) return rearrangement;
    for (const [index, pile] of this.foundations.entries()) {
      const card = pile[pile.length - 1];
      if (!card) continue;
      const move = this.findPlacement({ type: 'foundation', index }, card);
      if (move) return move;
    }
    return null;
  }

  /**
   * Auto-complete is possible when no face-down cards remain in tableau and stock/waste are clear or solvable
   */
  public canAutoComplete(): boolean {
    if (this.gameWon) return false;

    // All tableau cards must be face up
    for (const col of this.tableau) {
      if (col.some(c => !c.faceUp)) return false;
    }

    // Stock & Waste should be empty for instant auto-finish (or all cards face-up)
    if (this.stock.some(c => !c.faceUp)) return false;

    return true;
  }

  /**
   * Moves 1 eligible card to foundation for auto-complete sweep
   */
  public executeAutoCompleteStep(): boolean {
    if (this.gameWon) return false;

    if (this.seals?.reserve) {
      const move = this.findPlacement(reserveLocation, this.seals.reserve);
      if (move?.to.type === 'foundation') return this.moveCards(move.from, move.to);
    }

    // Check waste first
    if (this.waste.length > 0) {
      const card = this.waste[this.waste.length - 1];
      for (let f = 0; f < 4; f++) {
        if (this.canMoveToFoundation(card, f)) {
          return this.moveCards({ type: 'waste', index: 0 }, { type: 'foundation', index: f });
        }
      }
    }

    // Check tableau
    for (let t = 0; t < 7; t++) {
      const col = this.tableau[t];
      if (col.length > 0) {
        const topCard = col[col.length - 1];
        for (let f = 0; f < 4; f++) {
          if (this.canMoveToFoundation(topCard, f)) {
            return this.moveCards({ type: 'tableau', index: t, cardIndex: col.length - 1 }, { type: 'foundation', index: f });
          }
        }
      }
    }

    return false;
  }

  public checkWinCondition(): boolean {
    const totalInFoundations = this.foundations.reduce((sum, f) => sum + f.length, 0);
    return totalInFoundations === 52;
  }
}
