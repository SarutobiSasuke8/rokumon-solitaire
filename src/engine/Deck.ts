import { Card, Suit } from './Card';

export class Deck {
  public static createStandardDeck(): Card[] {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const cards: Card[] = [];

    for (const suit of suits) {
      for (let rank = 1; rank <= 13; rank++) {
        cards.push(new Card(suit, rank, false));
      }
    }
    return cards;
  }

  /**
   * Fisher-Yates shuffle algorithm
   */
  public static shuffle(cards: Card[]): Card[] {
    const shuffled = cards.map(c => c.clone());
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
