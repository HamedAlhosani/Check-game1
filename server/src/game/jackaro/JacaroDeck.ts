import { JacaroCard, JacaroRank, JacaroSuit } from '@check-game/shared';

const SUITS: JacaroSuit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: JacaroRank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function buildJacaroDeck(): JacaroCard[] {
  const cards: JacaroCard[] = [];

  for (let deck = 0; deck < 2; deck++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({
          id: `${rank}-${suit}-${deck}`,
          rank,
          suit,
          isJoker: false,
          deckIndex: deck as 0 | 1,
        });
      }
    }
    // 2 jokers per deck
    cards.push({ id: `joker-red-${deck}`, rank: 'JOKER', suit: null, isJoker: true, deckIndex: deck as 0 | 1 });
    cards.push({ id: `joker-black-${deck}`, rank: 'JOKER', suit: null, isJoker: true, deckIndex: deck as 0 | 1 });
  }

  return shuffle(cards);
}

export function getCardPoints(card: JacaroCard): number {
  if (card.isJoker) return 25;
  const rank = card.rank as JacaroRank;
  if (rank === 'A') return 1;
  if (['2', '3', '4', '5', '6', '7', '8', '9'].includes(rank)) return parseInt(rank);
  if (rank === '10') return 10;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  return 0;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
