import { JacaroCard, JacaroRank, JacaroSuit } from '@check-game/shared';
import { getCardPoints } from './JacaroDeck';

const RANK_ORDER: JacaroRank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export interface MeldValidation {
  valid: boolean;
  type: 'set' | 'run';
  reason?: string;
}

export function validateMeld(cards: JacaroCard[]): MeldValidation {
  if (cards.length < 3) return { valid: false, type: 'set', reason: 'أقل من 3 أوراق' };

  const nonJokers = cards.filter(c => !c.isJoker);
  const jokerCount = cards.length - nonJokers.length;

  // Try set: same rank, different suits
  if (isValidSet(cards, nonJokers, jokerCount)) {
    return { valid: true, type: 'set' };
  }

  // Try run: consecutive same suit
  if (isValidRun(cards, nonJokers, jokerCount)) {
    return { valid: true, type: 'run' };
  }

  return { valid: false, type: 'set', reason: 'مجموعة غير صالحة' };
}

function isValidSet(cards: JacaroCard[], nonJokers: JacaroCard[], jokerCount: number): boolean {
  if (nonJokers.length === 0) return false;
  const rank = nonJokers[0].rank;
  if (!nonJokers.every(c => c.rank === rank)) return false;

  // All same rank, check suits are unique
  const suits = nonJokers.map(c => c.suit).filter(Boolean) as JacaroSuit[];
  const uniqueSuits = new Set(suits);
  if (uniqueSuits.size !== suits.length) return false; // duplicate suit

  return cards.length <= 4 + jokerCount; // max 4 suits + jokers
}

function isValidRun(cards: JacaroCard[], nonJokers: JacaroCard[], jokerCount: number): boolean {
  if (nonJokers.length === 0) return false;
  const suit = nonJokers[0].suit;
  if (!nonJokers.every(c => c.suit === suit)) return false;

  // Sort non-jokers by rank order
  const sorted = [...nonJokers].sort(
    (a, b) => RANK_ORDER.indexOf(a.rank as JacaroRank) - RANK_ORDER.indexOf(b.rank as JacaroRank)
  );

  // Check that with jokers filling gaps, we can form consecutive sequence
  let gaps = 0;
  for (let i = 1; i < sorted.length; i++) {
    const diff = RANK_ORDER.indexOf(sorted[i].rank as JacaroRank) - RANK_ORDER.indexOf(sorted[i - 1].rank as JacaroRank);
    if (diff <= 0) return false; // duplicates
    gaps += diff - 1;
  }

  return gaps <= jokerCount;
}

export function canExtendMeld(meld: { type: 'set' | 'run'; cards: JacaroCard[] }, card: JacaroCard): boolean {
  if (card.isJoker) return true;

  if (meld.type === 'set') {
    const existingRank = meld.cards.find(c => !c.isJoker)?.rank;
    if (card.rank !== existingRank) return false;
    const usedSuits = new Set(meld.cards.filter(c => !c.isJoker && c.suit).map(c => c.suit));
    return !usedSuits.has(card.suit);
  }

  // Run extension
  const nonJokers = meld.cards.filter(c => !c.isJoker);
  const suit = nonJokers[0]?.suit;
  if (card.suit !== suit) return false;

  const ranks = nonJokers.map(c => RANK_ORDER.indexOf(c.rank as JacaroRank)).sort((a, b) => a - b);
  const min = ranks[0];
  const max = ranks[ranks.length - 1];
  const cardIdx = RANK_ORDER.indexOf(card.rank as JacaroRank);

  return cardIdx === min - 1 || cardIdx === max + 1;
}

export function calculateMeldPoints(cards: JacaroCard[]): number {
  return cards.filter(c => !c.isJoker).reduce((s, c) => s + getCardPoints(c), 0);
}

export function calculateHandPenalty(cards: JacaroCard[]): number {
  return cards.reduce((s, c) => s + getCardPoints(c), 0);
}
