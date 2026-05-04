export type GameType = 'check' | 'ludo' | 'domino' | 'jackaro';

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  id: string;
  rank: Rank;
  suit: Suit;
  isRevealed: boolean;
}

export type CardPosition = 0 | 1 | 2 | 3 | 4 | 5;

export interface PlayerGameState {
  uid: string;
  displayName: string;
  avatarId: string;
  cards: (Card | null)[];
  cardCount: number;
  isTurn: boolean;
  hasCalledCheck: boolean;
  isEliminated: boolean;
  cumulativeScore: number;
  seatIndex: number;
  level?: number;
  equippedFrame?: string;
}

export type GamePhase =
  | 'WAITING'
  | 'DEALING'
  | 'PEEK_PHASE'
  | 'PLAYING'
  | 'BURN_WINDOW'
  | 'SPECIAL_J'
  | 'SPECIAL_Q'
  | 'KING_CHOICE'
  | 'CHECK_CALLED'
  | 'REVEAL'
  | 'SCORING'
  | 'ROUND_OVER'
  | 'GAME_OVER';

export interface GameState {
  gameId: string;
  roomId: string;
  phase: GamePhase;
  currentTurnUid: string;
  players: PlayerGameState[];
  deckCount: number;
  discardTop: Card | null;
  roundNumber: number;
  checkCallerId: string | null;
  turnsAfterCheck: number;
  lastDiscardFromKing: boolean;
  peekPhaseEndAt: number | null;
  turnEndAt: number | null;
  burnWindowUid: string | null;
  burnWindowEndAt: number | null;
  specialActionUid: string | null;
  dealTurnCount: number;
}

export interface RoundScore {
  [uid: string]: number;
}

export interface RoomPlayer {
  uid: string;
  displayName: string;
  avatarId: string;
  isBot: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard';
  isReady: boolean;
  isHost: boolean;
  equippedFrame?: string;
}

export interface RoomState {
  roomId: string;
  name: string;
  type: 'public' | 'private';
  code: string | null;
  hostUid: string;
  status: 'waiting' | 'in_progress' | 'finished';
  players: RoomPlayer[];
  createdAt: number;
  gameId: string | null;
  gameType: GameType;
  maxPlayers: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  username: string;
  email: string;
  avatarId: string;
  hasSeenRules: boolean;
  createdAt: number;
  coins: number;
  ownedItems: string[];
  equippedItems: {
    character?: string;
    avatarFrame: string;
    cardBack: string;
    diceSkin: string;
    boardTheme: string;
  };
  stats: {
    totalGames: number;
    totalWins: number;
    currentStreak: number;
    checkWins: number;
    ludoWins: number;
    dominoWins: number;
    jacaroWins: number;
  };
  ranking: {
    level: number;
    xp: number;
    title: string;
  };
  friends?: string[];
  friendRequests?: string[];
}

export interface MatchPlayer {
  uid: string;
  displayName: string;
  avatarId: string;
  score: number;
}

export interface MatchRecord {
  gameId: string;
  gameType: GameType;
  playedAt: number;
  players: MatchPlayer[];
  winnerId: string | null;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  avatarId: string;
  level: number;
  xp: number;
  wins: number;
  gamesPlayed: number;
  winRate: number;
  checkWins: number;
  ludoWins: number;
  dominoWins: number;
  jacaroWins: number;
}
