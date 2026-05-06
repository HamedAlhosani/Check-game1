import { v4 as uuidv4 } from 'uuid';
import { Clan, ClanSummary, ClanMember, DEFAULT_CLAN_LIMIT, CLAN_EMBLEMS } from '@check-game/shared';
import { clans, users, saveClans, saveUsers } from '../data/store';

const NAME_MIN = 3;
const NAME_MAX = 24;
const TAG_MIN = 2;
const TAG_MAX = 5;
const CREATE_COST = 5000;

function tagInUse(tag: string): boolean {
  const t = tag.toUpperCase();
  for (const c of clans.values()) if (c.tag === t) return true;
  return false;
}

function nameInUse(name: string): boolean {
  const n = name.trim().toLowerCase();
  for (const c of clans.values()) if ((c.name || '').trim().toLowerCase() === n) return true;
  return false;
}

function recomputeAggregates(clan: Clan): void {
  let wins = 0;
  let games = 0;
  for (const m of clan.members) {
    const u: any = users.get(m.uid);
    if (u?.stats) {
      wins  += u.stats.totalWins  || 0;
      games += u.stats.totalGames || 0;
    }
  }
  clan.totalWins  = wins;
  clan.totalGames = games;
}

function summary(clan: Clan): ClanSummary {
  return {
    id: clan.id,
    name: clan.name,
    tag: clan.tag,
    emblem: clan.emblem,
    description: clan.description,
    memberCount: clan.members.length,
    memberLimit: clan.memberLimit,
    totalWins: clan.totalWins,
    createdAt: clan.createdAt,
  };
}

export function listClans(): ClanSummary[] {
  for (const c of clans.values()) recomputeAggregates(c as Clan);
  saveClans();
  return Array.from(clans.values())
    .sort((a, b) => (b.totalWins || 0) - (a.totalWins || 0))
    .map(c => summary(c as Clan));
}

export function getClan(id: string): Clan | null {
  const c = clans.get(id);
  if (!c) return null;
  recomputeAggregates(c as Clan);
  saveClans();
  return c as Clan;
}

export function getMyClan(uid: string): Clan | null {
  const u: any = users.get(uid);
  if (!u?.clanId) return null;
  return getClan(u.clanId);
}

export async function createClan(opts: {
  founderUid: string;
  name: string;
  tag: string;
  emblem?: string;
  description?: string;
}): Promise<{ ok: boolean; error?: string; clan?: Clan }> {
  const founder: any = users.get(opts.founderUid);
  if (!founder) return { ok: false, error: 'User not found' };
  if (founder.clanId) return { ok: false, error: 'Already in a clan' };

  const name = opts.name.trim();
  const tag = opts.tag.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    return { ok: false, error: `اسم القبيلة يجب أن يكون بين ${NAME_MIN} و ${NAME_MAX} حرفاً` };
  }
  if (tag.length < TAG_MIN || tag.length > TAG_MAX) {
    return { ok: false, error: `الرمز يجب أن يكون بين ${TAG_MIN} و ${TAG_MAX} حروف لاتينية` };
  }
  if (nameInUse(name)) return { ok: false, error: 'اسم القبيلة مستخدم' };
  if (tagInUse(tag))   return { ok: false, error: 'الرمز مستخدم' };
  if ((founder.coins || 0) < CREATE_COST) {
    return { ok: false, error: `إنشاء القبيلة يكلف ${CREATE_COST} كوينز` };
  }

  founder.coins = (founder.coins || 0) - CREATE_COST;

  const id = uuidv4();
  const emblem = (opts.emblem && CLAN_EMBLEMS.includes(opts.emblem)) ? opts.emblem : CLAN_EMBLEMS[0];
  const clan: Clan = {
    id, name, tag, emblem,
    description: (opts.description || '').slice(0, 200),
    founderUid: opts.founderUid,
    leaderUid: opts.founderUid,
    members: [{
      uid: opts.founderUid,
      displayName: founder.displayName || 'لاعب',
      avatarId:    founder.avatarId    || 'avatar_1',
      role: 'leader',
      joinedAt: Date.now(),
      winsContributed: 0,
    }],
    totalWins: founder.stats?.totalWins  || 0,
    totalGames: founder.stats?.totalGames || 0,
    createdAt: Date.now(),
    memberLimit: DEFAULT_CLAN_LIMIT,
  };
  clans.set(id, clan);
  founder.clanId = id;
  founder.clanTag = tag;
  saveClans(); saveUsers();
  return { ok: true, clan };
}

export async function joinClan(uid: string, clanId: string): Promise<{ ok: boolean; error?: string; clan?: Clan }> {
  const u: any = users.get(uid);
  if (!u) return { ok: false, error: 'User not found' };
  if (u.clanId) return { ok: false, error: 'Already in a clan' };
  const c: any = clans.get(clanId);
  if (!c) return { ok: false, error: 'Clan not found' };
  if (c.members.length >= c.memberLimit) return { ok: false, error: 'القبيلة ممتلئة' };

  const member: ClanMember = {
    uid,
    displayName: u.displayName || 'لاعب',
    avatarId:    u.avatarId    || 'avatar_1',
    role: 'member',
    joinedAt: Date.now(),
    winsContributed: 0,
  };
  c.members.push(member);
  u.clanId = c.id;
  u.clanTag = c.tag;
  recomputeAggregates(c);
  saveClans(); saveUsers();
  return { ok: true, clan: c };
}

export async function leaveClan(uid: string): Promise<{ ok: boolean; error?: string; disbanded?: boolean }> {
  const u: any = users.get(uid);
  if (!u?.clanId) return { ok: false, error: 'Not in a clan' };
  const c: any = clans.get(u.clanId);
  if (!c) {
    u.clanId = null; u.clanTag = null; saveUsers();
    return { ok: true };
  }
  c.members = c.members.filter((m: ClanMember) => m.uid !== uid);
  u.clanId = null; u.clanTag = null;

  // Promote / disband
  let disbanded = false;
  if (c.members.length === 0) {
    clans.delete(c.id);
    disbanded = true;
  } else if (c.leaderUid === uid) {
    // Promote longest-tenured remaining member to leader.
    const newLeader = c.members.slice().sort((a: ClanMember, b: ClanMember) => a.joinedAt - b.joinedAt)[0];
    newLeader.role = 'leader';
    c.leaderUid = newLeader.uid;
  }

  saveClans(); saveUsers();
  return { ok: true, disbanded };
}
