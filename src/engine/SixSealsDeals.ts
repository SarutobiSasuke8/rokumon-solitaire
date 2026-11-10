import { Card, Suit } from './Card';

export type SixSealsDeal = 'full' | 'spend' | 'save' | 'skip';
type Court = readonly [Suit, number];

const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

function courtColumn(suit: Suit): Court[] {
  return [[suit, 13], [suit, 12], [suit, 11]];
}

// Columns are bottom to top. Only the last card starts face up.
const challenges: Record<Exclude<SixSealsDeal, 'full'>, Court[][]> = {
  spend: [[...courtColumn('spades'), ...courtColumn('diamonds'), ...courtColumn('clubs'),
    ['hearts', 13], ['hearts', 11], ['hearts', 12]]],
  save: [[...courtColumn('hearts'), ...courtColumn('diamonds'),
    ['clubs', 13], ['clubs', 12], ['spades', 13], ['spades', 11], ['spades', 12], ['clubs', 11]]],
  skip: suits.map(courtColumn),
};

export function isSixSealsDeal(value: string): value is SixSealsDeal {
  return value === 'full' || Object.prototype.hasOwnProperty.call(challenges, value);
}

export function createSixSealsChallenge(deal: Exclude<SixSealsDeal, 'full'>) {
  const columns = challenges[deal];
  return {
    foundations: suits.map(suit => Array.from({ length: 10 }, (_, index) => new Card(suit, index + 1, true))),
    tableau: Array.from({ length: 7 }, (_, index) => {
      const column = columns[index] ?? [];
      return column.map(([suit, rank], i) => new Card(suit, rank, i === column.length - 1));
    }),
  };
}
