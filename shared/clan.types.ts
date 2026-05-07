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
