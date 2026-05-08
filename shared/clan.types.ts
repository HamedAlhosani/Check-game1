// ── Clans (Guilds) ───────────────────────────────────────────────────────────
// V2: visibility-aware (open/private), application/invite flow, officer role.

export type ClanRole = 'leader' | 'officer' | 'member';
export type ClanVisibility = 'open' | 'private';
/** Which game's world a clan belongs to. Two parallel registries — a player
 *  can be in one Check clan and one Ludo clan independently. */
export type ClanScope = 'check' | 'ludo';

export interface ClanMember {
  uid: string;
  displayName: string;
  avatarId: string;
  role: ClanRole;
  joinedAt: number;
  /** Wins contributed since joining the clan. */
  winsContributed: number;
}

export interface ClanApplication {
  uid: string;
  displayName: string;
  avatarId: string;
  message: string;       // optional pitch from the applicant
  appliedAt: number;
}

export interface ClanInvite {
  /** UID of the player invited. */
  uid: string;
  invitedBy: string;     // officer/leader who sent the invite
  invitedAt: number;
}

export interface Clan {
  id: string;
  /** Game world this clan belongs to. Defaults to 'check' for back-compat
   *  with clans created before the split. */
  scope?: ClanScope;
  name: string;
  /** 2-5 letter tag rendered next to player names, like [FALC]. */
  tag: string;
  emblem: string;            // emoji or 'image:<url>' for custom uploads
  description: string;
  visibility: ClanVisibility; // open = anyone can apply | private = invite-only
  founderUid: string;
  leaderUid: string;
  members: ClanMember[];
  applications: ClanApplication[];
  invites: ClanInvite[];
  /** Sum of wins / games contributed by current members (recomputed on read). */
  totalWins: number;
  totalGames: number;
  createdAt: number;
  /** Soft cap; manager enforces. */
  memberLimit: number;
  /** Coins shared by the clan — funded by clan tournament prizes. */
  bank: number;
}

export interface ClanSummary {
  id: string;
  name: string;
  tag: string;
  emblem: string;
  description: string;
  visibility: ClanVisibility;
  memberCount: number;
  memberLimit: number;
  totalWins: number;
  bank: number;
  createdAt: number;
  /** Whether the viewer has a pending application to this clan. */
  appliedByMe?: boolean;
  /** Whether the viewer was invited to this clan. */
  invitedByMe?: boolean;
}

export const DEFAULT_CLAN_LIMIT = 30;
export const CLAN_CREATE_COST = 5000;

export const CLAN_EMBLEMS = ['🦅', '🐪', '🌴', '⚔️', '🌙', '⭐', '🦁', '🔥', '💎', '🏛️', '🌊', '🏆', '☄️', '🛡️', '👑', '⚡'];

// ── Clan Wars (weekly) ───────────────────────────────────────────────────────
// Two clans of comparable size are paired Mon→Sun (UTC). Every Check win a
// member scores during that week adds 1 point to their clan's war total.
// At week-end the higher-scoring clan splits a coin prize across ALL its
// members (active or not). Ties split the pot evenly between both clans.

/** Coin prize per member for a clan-war win. The pot is FIXED per member so
 *  bigger clans don't unfairly get bigger pots — this keeps small clans
 *  competitive. */
export const CLAN_WAR_PRIZE_PER_MEMBER = 200;
/** Tied clans both pay a smaller per-member consolation prize. */
export const CLAN_WAR_TIE_PRIZE_PER_MEMBER = 50;
/** Minimum members a clan needs to be eligible for matchmaking. */
export const CLAN_WAR_MIN_MEMBERS = 2;

export type ClanWarOutcome = 'pending' | 'clan1' | 'clan2' | 'tie';

export interface ClanWarSide {
  clanId: string;
  clanName: string;
  clanTag: string;
  emblem: string;
  memberCount: number;
  /** Points scored this week — sum of member Check wins. */
  score: number;
}

export interface ClanWar {
  id: string;
  /** ISO Monday→Sunday week key, e.g. "2026-W19". One war per pair per week. */
  weekKey: string;
  /** UTC midnight of Monday that started this week. */
  weekStartedAt: number;
  /** UTC midnight of next Monday — when the war auto-resolves. */
  weekEndsAt: number;
  scope: ClanScope;
  clan1: ClanWarSide;
  clan2: ClanWarSide;
  outcome: ClanWarOutcome;
  /** Coins paid per winning member when the war closed. 0 while pending. */
  prizePerMember: number;
}
