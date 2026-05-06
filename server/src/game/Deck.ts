import { Card, Rank, Suit } from '@check-game/shared';
import { createCard } from './Card';

const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

/**
 * Deck count rule (per user spec):
 *  - 2-4 players → 1 deck (13 cards per suit, 52 total)
 *  - 5+ players → 2 decks (26 cards per suit, 104 total — like 'baloot')
 */
export function decksNeededFor(playerCount: number): number {
  return playerCount >= 5 ? 2 : 1;
}

export class Deck {
  private drawPile: Card[] = [];
  private discardPile: Card[] = [];
  private numDecks: number;

  constructor(numDecks = 1) {
    this.numDecks = Math.max(1, numDecks);
    this.reset();
  }

  reset(): void {
    this.drawPile = [];
    this.discardPile = [];
    for (let d = 0; d < this.numDecks; d++) {
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          this.drawPile.push(createCard(rank, suit));
        }
      }
    }
    this.shuffle();
  }

  private shuffle(): void {
    for (let i = this.drawPile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.drawPile[i], this.drawPile[j]] = [this.drawPile[j], this.drawPile[i]];
    }
  }

  draw(): Card | null {
    if (this.drawPile.length === 0) {
      if (this.discardPile.length <= 1) return null;
      const top = this.discardPile.pop()!;
      this.drawPile = this.discardPile.splice(0);
      this.discardPile = [top];
      this.shuffle();
    }
    return this.drawPile.pop() || null;
  }

  discard(card: Card): void {
    this.discardPile.push({ ...card, isRevealed: true });
  }

  peekDiscard(): Card | null {
    return this.discardPile[this.discardPile.length - 1] || null;
  }

  takeDiscard(): Card | null {
    return this.discardPile.pop() || null;
  }

  get drawCount(): number {
    return this.drawPile.length;
  }
}
