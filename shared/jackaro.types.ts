export type JacaroSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type JacaroRank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface JacaroCard {
  id: string; // e.g. 'A-hearts-0' or 'joker-0'
  rank: JacaroRank | 'JOKER';
  suit: JacaroSuit | null;
  isJoker: boolean;
  deckIndex: 0 | 1;
}

export interface JacaroMeld {
  id: string;
  type: 'set' | 'run';
  cards: JacaroCard[];
  ownerId: string;
}

export interface JacaroPlayerState {
  uid: string;
  displayName: string;
  avatarId: string;
  cardCount: number;
  hasOpenedMeld: boolean;
  isTurn: boolean;
  cumulativeScore: number;
  isEliminated: boolean;
  hasDrawn: boolean;
}

export interface JacaroGameState {
  gameId: string;
  roomId: string;
  phase: 'WAITING' | 'PLAYING' | 'ROUND_OVER' | 'GAME_OVER';
  players: JacaroPlayerState[];
  tableMelds: JacaroMeld[];
  deckCount: number;
  discardTop: JacaroCard | null;
  currentTurnUid: string;
  turnEndAt: number | null;
  roundNumber: number;
  scores: Record<string, number>;
  winnerId: string | null;
}
