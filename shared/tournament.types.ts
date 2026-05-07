// ── Tournament types ─────────────────────────────────────────────────────────
// Single-elimination "cup" — host plays a series of Check matches, advancing
// when they win. V1 is solo + bots only: the host's matches use the real
// GameEngine, while bot-vs-bot matches in the same round are simulated.

import type { GameMode, GameType } from './game.types';

export type TournamentSize = 4 | 8;

export interface TournamentPlayer {
  uid: string;
  displayName: string;
  avatarId: string;
  equippedFrame?: string;
  isBot: boolean;
  /** Set when this player has lost a match in the bracket. */
  isEliminated: boolean;
  /** Bot difficulty used when simulating their off-screen matches. */
  botDifficulty?: 'easy' | 'medium' | 'hard';
}

export type TournamentMatchStatus = 'pending' | 'in_progress' | 'completed';

export interface TournamentMatch {
  /** Sequential match index (0..N-1). */
  matchNum: number;
  /** Bracket round, 1-indexed. For size=4: 1=semi, 2=final. For size=8: 1=quarter, 2=semi, 3=final. */
  round: number;
  /** Position within the round (used to pair winners into the next round). */
  slot: number;
  p1Uid: string | null;
  p2Uid: string | null;
  winnerUid: string | null;
  status: TournamentMatchStatus;
  /** GameEngine.gameId when status='in_progress' or 'completed'. */
  gameId: string | null;
  /** True if this match involves the host (i.e. the human user). */
  isHostMatch: boolean;
}

export type TournamentVisibility = 'public' | 'private';
/** Solo = host vs bots only. Online = real players (host can fill remaining seats with bots). */
export type TournamentKind = 'solo' | 'online';

export type PrizeSplit = 'winner_takes_all' | 'top3';

export interface TournamentState {
  id: string;
  hostUid: string;
  /** Which game's matches run inside this bracket — Check or Ludo. Legacy
   *  tournaments default to 'check' on read. */
  gameType?: GameType;
  /** "بطولة أحمد" or similar — used in the public list. */
  name: string;
  visibility: TournamentVisibility;
  kind: TournamentKind;
  /** Optional join code for private tournaments. */
  code: string | null;
  size: TournamentSize;
  difficulty: 'easy' | 'medium' | 'hard';
  matchLength: GameMode;
  status: 'waiting' | 'in_progress' | 'finished' | 'cancelled';
  players: TournamentPlayer[];
  bracket: TournamentMatch[];
  championUid: string | null;
  /** Coins each player pays to join (online only; 0 for solo bot cups). */
  entryFee: number;
  /** Total coins in the prize pool — entryFee * (joined humans) for online,
   *  or the fixed bot-cup prize for solo. */
  prizePool: number;
  /** How the pool gets split when the tournament finishes. */
  prizeSplit: PrizeSplit;
  /** Final prize amounts per podium position (1st, 2nd, 3rd). Set when finished. */
  prizesAwarded?: { uid: string; rank: number; amount: number }[];
  /** Item id awarded alongside coins (frame, card back, etc.). */
  prizeItemId?: string;
  prizeItemNameAr?: string;
  prizeItemNameEn?: string;
  createdAt: number;
  /** Wall-clock timestamp when status flipped from waiting → in_progress. */
  startedAt?: number;
  /** Match number the *current viewing player* should play next (null if none). */
  nextHostMatchNum: number | null;
  /** Wall-clock timestamp when the host's next match must be accepted by;
   *  if current time exceeds this, the player forfeits and the bracket advances. */
  forfeitAt?: number | null;
  /** When set, only members of this clan can join. Prize goes 70/30 winner/clan-bank. */
  clanOnlyId?: string | null;
  clanOnlyName?: string | null;
  clanOnlyTag?: string | null;
}

/** Compact view for the public tournament list. */
export interface TournamentSummary {
  id: string;
  hostUid: string;
  hostName: string;
  hostAvatarId: string;
  /** Game world this cup runs in — used to filter the Ludo vs Check lists. */
  gameType?: GameType;
  name: string;
  size: TournamentSize;
  difficulty: 'easy' | 'medium' | 'hard';
  matchLength: GameMode;
  status: 'waiting' | 'in_progress' | 'finished';
  players: number;            // joined count
  entryFee: number;
  prizePool: number;
  prizeSplit: PrizeSplit;
  createdAt: number;
  clanOnlyId?: string | null;
  clanOnlyTag?: string | null;
}

/** Number of matches in a single-elimination bracket of N players. */
export function matchesInBracket(size: TournamentSize): number {
  return size - 1;
}

/** Bracket rounds for a size: { round, matchesInRound, label } */
export function bracketRounds(size: TournamentSize): { round: number; count: number; labelAr: string; labelEn: string }[] {
  if (size === 4) {
    return [
      { round: 1, count: 2, labelAr: 'نصف النهائي', labelEn: 'Semifinal' },
      { round: 2, count: 1, labelAr: 'النهائي',    labelEn: 'Final' },
    ];
  }
  // size === 8
  return [
    { round: 1, count: 4, labelAr: 'ربع النهائي', labelEn: 'Quarterfinal' },
    { round: 2, count: 2, labelAr: 'نصف النهائي', labelEn: 'Semifinal' },
    { round: 3, count: 1, labelAr: 'النهائي',     labelEn: 'Final' },
  ];
}

/** Bot-cup prize: fixed value, no entry fee. Scales with size + difficulty. */
export function tournamentPrize(size: TournamentSize, difficulty: 'easy' | 'medium' | 'hard'): number {
  const sizeBonus = size === 8 ? 2 : 1;
  const diffBonus = difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1;
  return 1500 * sizeBonus * diffBonus; // 1500..18000
}

/** Available entry-fee tiers for online tournaments. */
export const ENTRY_FEE_TIERS = [50, 100, 250, 500, 1000, 2500, 5000, 10000] as const;
export type EntryFeeTier = typeof ENTRY_FEE_TIERS[number];

/** Total pool given fee + filled seats (not size). */
export function computePool(entryFee: number, filledSeats: number): number {
  return entryFee * filledSeats;
}

/** Distribute a pool across the podium according to the chosen split.
 *  Returns the prize for each rank (1st, 2nd, 3rd) — values may be 0. */
export function splitPrizePool(pool: number, split: PrizeSplit, size: TournamentSize): number[] {
  if (split === 'winner_takes_all' || size < 4) return [pool, 0, 0];
  // Top-3: 60 / 30 / 10. (8-player brackets give 4th place nothing.)
  const first  = Math.floor(pool * 0.60);
  const second = Math.floor(pool * 0.30);
  const third  = pool - first - second;
  return [first, second, third];
}

/** Suggested forfeit window (ms) — how long a player has to accept their
 *  next match before they auto-forfeit. */
export const FORFEIT_WINDOW_MS = 60_000;
