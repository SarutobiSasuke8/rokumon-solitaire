export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type CardColor = 'red' | 'black';

export interface CardState {
  id: string;
  suit: Suit;
  rank: number; // 1 (Ace) to 13 (King)
  faceUp: boolean;
}

export class Card implements CardState {
  public readonly id: string;
  public readonly suit: Suit;
  public readonly rank: number;
  public faceUp: boolean;

  constructor(suit: Suit, rank: number, faceUp = false, id?: string) {
    this.suit = suit;
    this.rank = rank;
    this.faceUp = faceUp;
    this.id = id || `${suit}_${rank}`;
  }

  get color(): CardColor {
    return this.suit === 'hearts' || this.suit === 'diamonds' ? 'red' : 'black';
  }

  get suitSymbol(): string {
    switch (this.suit) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
    }
  }

  get rankLabel(): string {
    switch (this.rank) {
      case 1: return 'A';
      case 11: return 'J';
      case 12: return 'Q';
      case 13: return 'K';
      default: return this.rank.toString();
    }
  }

  public clone(): Card {
    return new Card(this.suit, this.rank, this.faceUp, this.id);
  }
}
