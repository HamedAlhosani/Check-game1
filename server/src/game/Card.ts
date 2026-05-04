import { Card, Rank, Suit } from '@check-game/shared';

export function getCardValue(card: Card): number {
  const { rank, suit } = card;
  const isRed = suit === 'hearts' || suit === 'diamonds';

  if (rank === 'A') return 1;
  if (rank === '10') return isRed ? 0 : 10;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  return parseInt(rank, 10);
}

export function isSpecialCard(card: Card): 'K' | 'RED_Q' | 'J' | null {
  if (card.rank === 'K') return 'K';
  if (card.rank === 'Q' && (card.suit === 'hearts' || card.suit === 'diamonds')) return 'RED_Q';
  if (card.rank === 'J') return 'J';
  return null;
}

export function createCard(rank: Rank, suit: Suit): Card {
  return { id: `${rank}-${suit}`, rank, suit, isRevealed: false };
}
