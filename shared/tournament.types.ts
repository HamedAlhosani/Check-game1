// ── Tournament types ─────────────────────────────────────────────────────────
// Single-elimination "cup" — host plays a series of Check matches, advancing
// when they win. V1 is solo + bots only: the host's matches use the real
// GameEngine, while bot-vs-bot matches in the same round are simulated.

import type { GameMode } from './game.types';

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

export interface TournamentState {
  id: string;
  hostUid: string;
  /** "بطولة أحمد" or similar — used in the public list. */
  name: string;
  visibility: TournamentVisibility;
  kind: TournamentKind;
  /** Optional join code for private tournaments. */
  code: string | null;
  size: TournamentSize;
  difficulty: 'easy' | 'medium' | 'hard';
  matchLength: GameMode;
  status: 'waiting' | 'in_progress' | 'finished';
  players: TournamentPlayer[];
  bracket: TournamentMatch[];
  championUid: string | null;
  /** Coins awarded to the champion. */
  prizeCoins: number;
  /** Item id awarded alongside coins (frame, card back, etc.). */
  prizeItemId?: string;
  prizeItemNameAr?: string;
  prizeItemNameEn?: string;
  createdAt: number;
  /** Match number the *current viewing player* should play next (null if none). */
  nextHostMatchNum: number | null;
}

/** Compact view for the public tournament list. */
export interface TournamentSummary {
  id: string;
  hostUid: string;
  hostName: string;
  hostAvatarId: string;
  name: string;
  size: TournamentSize;
  difficulty: 'easy' | 'medium' | 'hard';
  matchLength: GameMode;
  status: 'waiting' | 'in_progress' | 'finished';
  players: number;            // joined count
  prizeCoins: number;
  createdAt: number;
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

/** Coin prize awarded to the champion. */
export function tournamentPrize(size: TournamentSize, difficulty: 'easy' | 'medium' | 'hard'): number {
  const sizeBonus = size === 8 ? 2 : 1;
  const diffBonus = difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1;
  return 1500 * sizeBonus * diffBonus; // 1500..18000
}
