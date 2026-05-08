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
  isBot?: boolean;
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
  eliminationScore?: number;
  gameMode?: GameMode;
  /** Tutorial flag — server-side timers are disabled when true so the
   *  player can read on-screen coach bubbles at their own pace. */
  tutorial?: boolean;
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
  /** Consecutive Check wins. Drives the lobby/waiting-room 🔥 streak badge
   *  when ≥ 3. Resets to 0 on any loss. */
  currentStreak?: number;
}

export type GameMode = 'quick' | 'standard' | 'long';

/** Score threshold a player must reach to be eliminated, per game mode. */
export const ELIMINATION_SCORE: Record<GameMode, number> = {
  quick: 50,       // ~2-3 rounds, fast
  standard: 100,   // ~5 rounds, default
  long: 150,       // ~7-8 rounds, epic
};

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
  gameMode?: GameMode;
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
  // Progression — daily missions / achievements / level rewards
  dailyMissions?: { date: string; missions: { id: string; progress: number; claimed: boolean }[] };
  claimedAchievements?: string[];
  claimedLevelRewards?: number[];
  // Tournament stats — set by server when a tournament finishes
  tournamentStats?: {
    cupsWon: number;          // 1st place finishes
    podiums: number;          // top-3 finishes
    entered: number;          // total tournaments joined
    totalPrizeWon: number;    // lifetime tournament prize money
    bestPrize: number;        // single largest prize
    /** Last cup-win timestamp — used to show a 24h "champion" badge. */
    lastCupAt?: number | null;
  };
  /** Keys for opening treasure chests — earned from wins / missions. */
  keys?: number;
  /** Premium currency earned from rare achievements only — not buyable. */
  gems?: number;
  /** Ludo wallet — completely separate from Check's coins/gems. */
  ludoCoins?: number;
  /** Premium Ludo gems — earned only inside Ludo (tournaments, rare drops). */
  ludoGems?: number;
  /** Clan the user belongs to (null if none). */
  clanId?: string | null;
  /** Cached tag for the Check clan, used in name decorations. */
  clanTag?: string | null;
  /** Ludo clan slot — fully separate from Check. A player can sit in one
   *  Check clan and one Ludo clan at the same time. */
  ludoClanId?: string | null;
  ludoClanTag?: string | null;
}

export interface MatchPlayer {
  uid: string;
  displayName: string;
  avatarId: string;
  equippedFrame?: string;
  score: number;
}

/** One round of a Check match, captured for the replay/summary view. */
export interface MatchRound {
  roundNumber: number;
  checkCallerId: string | null;
  /** What happened to the CHECK caller's hand: lowest = win-bonus (-X),
   *  tied = pay raw hand, beaten = pay 2x hand. null when no CHECK was called. */
  checkOutcome: 'win' | 'tied' | 'beaten' | null;
  /** Round score delta per uid (negative = bonus, positive = penalty). */
  scores: Record<string, number>;
  /** Sum of card values in each player's hand at scoring time. */
  rawHandSums: Record<string, number>;
  /** Cumulative score per uid AFTER this round was applied. */
  cumulative: Record<string, number>;
  /** uids eliminated by this round (cumulative crossed the threshold). */
  eliminations: string[];
}

export interface MatchRecord {
  gameId: string;
  gameType: GameType;
  playedAt: number;
  players: MatchPlayer[];
  winnerId: string | null;
  // Optional, populated for Check matches with the per-round breakdown so
  // we can show a replay/summary in the history page.
  rounds?: MatchRound[];
  /** Wall-clock duration of the match (ms). */
  durationMs?: number;
  gameMode?: GameMode;
  eliminationScore?: number;
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
