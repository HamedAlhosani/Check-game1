// ── Clans (Guilds) ───────────────────────────────────────────────────────────
// V1 scope: create / join / leave / list. Each clan has a name + 3-5 char tag
// shown next to player names. No clan-vs-clan tournaments or clan chat yet —
// those layer on top of this data model later.

export type ClanRole = 'leader' | 'member';

export interface ClanMember {
  uid: string;
  displayName: string;
  avatarId: string;
  role: ClanRole;
  joinedAt: number;
  /** Wins contributed since joining the clan. */
  winsContributed: number;
}

export interface Clan {
  id: string;
  name: string;
  /** 3-5 letter tag rendered next to player names, like [FALC]. */
  tag: string;
  emblem: string;          // single emoji
  description: string;
  founderUid: string;
  leaderUid: string;
  members: ClanMember[];
  /** Sum of wins contributed by current members. */
  totalWins: number;
  /** Total games played by current members. */
  totalGames: number;
  createdAt: number;
  /** Soft cap; manager enforces. */
  memberLimit: number;
}

export interface ClanSummary {
  id: string;
  name: string;
  tag: string;
  emblem: string;
  description: string;
  memberCount: number;
  memberLimit: number;
  totalWins: number;
  createdAt: number;
}

export const DEFAULT_CLAN_LIMIT = 30;

export const CLAN_EMBLEMS = ['🦅', '🐪', '🌴', '⚔️', '🌙', '⭐', '🦁', '🔥', '💎', '🏛️', '🌊', '🏆'];
