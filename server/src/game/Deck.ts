import { Card, Rank, Suit } from '@check-game/shared';
import { createCard } from './Card';

const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

const SINGLE_DECK_SIZE = 52;
// Aim for at least this many cards in the draw pile right after dealing 4
// cards per player, so deck depth feels consistent regardless of player count.
const TARGET_POST_DEAL_DECK = 44;

/**
 * For N players (each dealt 4 cards) we want ≥ TARGET_POST_DEAL_DECK left
 * in the draw pile. Use as many shuffled 52-card decks as needed to satisfy
 * 4*N + 44 ≤ 52*decks.
 */
export function decksNeededFor(playerCount: number): number {
  const cardsAfterDeal = playerCount * 4 + TARGET_POST_DEAL_DECK;
  return Math.max(1, Math.ceil(cardsAfterDeal / SINGLE_DECK_SIZE));
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
