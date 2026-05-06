import { v4 as uuidv4 } from 'uuid';
import {
  Clan, ClanSummary, ClanMember, ClanApplication, ClanRole, ClanVisibility,
  DEFAULT_CLAN_LIMIT, CLAN_EMBLEMS, CLAN_CREATE_COST,
} from '@check-game/shared';
import { clans, users, saveClans, saveUsers } from '../data/store';

const NAME_MIN = 3, NAME_MAX = 24;
const TAG_MIN = 2,  TAG_MAX = 5;

function tagInUse(tag: string, exceptId?: string): boolean {
  const t = tag.toUpperCase();
  for (const c of clans.values()) if (c.tag === t && c.id !== exceptId) return true;
  return false;
}
function nameInUse(name: string, exceptId?: string): boolean {
  const n = name.trim().toLowerCase();
  for (const c of clans.values()) if ((c.name || '').trim().toLowerCase() === n && c.id !== exceptId) return true;
  return false;
}
function recomputeAggregates(clan: Clan): void {
  let wins = 0, games = 0;
  for (const m of clan.members) {
    const u: any = users.get(m.uid);
    if (u?.stats) { wins += u.stats.totalWins || 0; games += u.stats.totalGames || 0; }
  }
  clan.totalWins  = wins;
  clan.totalGames = games;
}
function summary(clan: Clan, viewerUid?: string): ClanSummary {
  return {
    id: clan.id, name: clan.name, tag: clan.tag, emblem: clan.emblem,
    description: clan.description,
    visibility: clan.visibility,
    memberCount: clan.members.length,
    memberLimit: clan.memberLimit,
    totalWins: clan.totalWins,
    bank: clan.bank || 0,
    createdAt: clan.createdAt,
    appliedByMe: !!viewerUid && (clan.applications || []).some(a => a.uid === viewerUid),
    invitedByMe: !!viewerUid && (clan.invites || []).some(i => i.uid === viewerUid),
  };
}
function ensureFields(c: any): Clan {
  if (!c.applications) c.applications = [];
  if (!c.invites)      c.invites      = [];
  if (!c.visibility)   c.visibility   = 'open';
  if (!c.bank)         c.bank         = 0;
  return c as Clan;
}
function isOfficer(c: Clan, uid: string): boolean {
  const m = c.members.find(x => x.uid === uid);
  return !!m && (m.role === 'leader' || m.role === 'officer');
}

// ── Read ────────────────────────────────────────────────────────────────────
export function listClans(viewerUid?: string): ClanSummary[] {
  for (const c of clans.values()) { ensureFields(c); recomputeAggregates(c as Clan); }
  saveClans();
  return Array.from(clans.values())
    .sort((a, b) => (b.totalWins || 0) - (a.totalWins || 0))
    .map(c => summary(c as Clan, viewerUid));
}

export function getClan(id: string): Clan | null {
  const c = clans.get(id);
  if (!c) return null;
  ensureFields(c);
  recomputeAggregates(c as Clan);
  saveClans();
  return c as Clan;
}

export function getMyClan(uid: string): Clan | null {
  const u: any = users.get(uid);
  if (!u?.clanId) return null;
  return getClan(u.clanId);
}

export function getMyInvites(uid: string): ClanSummary[] {
  const out: ClanSummary[] = [];
  for (const c of clans.values()) {
    ensureFields(c);
    if ((c.invites || []).some((i: any) => i.uid === uid)) {
      recomputeAggregates(c as Clan);
      out.push(summary(c as Clan, uid));
    }
  }
  return out;
}

// ── Create / edit / delete ─────────────────────────────────────────────────
export async function createClan(opts: {
  founderUid: string;
  name: string;
  tag: string;
  emblem?: string;
  description?: string;
  visibility?: ClanVisibility;
}): Promise<{ ok: boolean; error?: string; clan?: Clan }> {
  const founder: any = users.get(opts.founderUid);
  if (!founder)            return { ok: false, error: 'User not found' };
  if (founder.clanId)      return { ok: false, error: 'Already in a clan' };

  const name = opts.name.trim();
  const tag  = opts.tag.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (name.length < NAME_MIN || name.length > NAME_MAX) return { ok: false, error: `الاسم بين ${NAME_MIN}-${NAME_MAX} حرفاً` };
  if (tag.length < TAG_MIN || tag.length > TAG_MAX)     return { ok: false, error: `الرمز بين ${TAG_MIN}-${TAG_MAX} حروف` };
  if (nameInUse(name))                                   return { ok: false, error: 'الاسم مستخدم' };
  if (tagInUse(tag))                                     return { ok: false, error: 'الرمز مستخدم' };
  if ((founder.coins || 0) < CLAN_CREATE_COST)           return { ok: false, error: `تحتاج ${CLAN_CREATE_COST} كوينز` };

  founder.coins = (founder.coins || 0) - CLAN_CREATE_COST;

  const id = uuidv4();
  const emblem = opts.emblem && (CLAN_EMBLEMS.includes(opts.emblem) || opts.emblem.startsWith('image:'))
    ? opts.emblem : CLAN_EMBLEMS[0];
  const clan: Clan = {
    id, name, tag, emblem,
    description: (opts.description || '').slice(0, 200),
    visibility: opts.visibility === 'private' ? 'private' : 'open',
    founderUid: opts.founderUid,
    leaderUid:  opts.founderUid,
    members: [{
      uid: opts.founderUid,
      displayName: founder.displayName || 'لاعب',
      avatarId:    founder.avatarId    || 'avatar_1',
      role: 'leader',
      joinedAt: Date.now(),
      winsContributed: 0,
    }],
    applications: [],
    invites: [],
    totalWins:  founder.stats?.totalWins  || 0,
    totalGames: founder.stats?.totalGames || 0,
    createdAt: Date.now(),
    memberLimit: DEFAULT_CLAN_LIMIT,
    bank: 0,
  };
  clans.set(id, clan);
  founder.clanId = id;
  founder.clanTag = tag;
  saveClans(); saveUsers();
  return { ok: true, clan };
}

export async function editClan(uid: string, clanId: string, patch: {
  name?: string; emblem?: string; description?: string; visibility?: ClanVisibility;
}): Promise<{ ok: boolean; error?: string; clan?: Clan }> {
  const c = clans.get(clanId);
  if (!c) return { ok: false, error: 'Clan not found' };
  ensureFields(c);
  if (c.leaderUid !== uid) return { ok: false, error: 'Only the leader can edit' };

  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (name.length < NAME_MIN || name.length > NAME_MAX) return { ok: false, error: `الاسم بين ${NAME_MIN}-${NAME_MAX}` };
    if (nameInUse(name, clanId)) return { ok: false, error: 'الاسم مستخدم' };
    c.name = name;
  }
  if (patch.emblem !== undefined) {
    if (!(CLAN_EMBLEMS.includes(patch.emblem) || patch.emblem.startsWith('image:'))) {
      return { ok: false, error: 'Invalid emblem' };
    }
    c.emblem = patch.emblem;
  }
  if (patch.description !== undefined) c.description = patch.description.slice(0, 200);
  if (patch.visibility !== undefined)  c.visibility  = patch.visibility === 'private' ? 'private' : 'open';
  saveClans();
  return { ok: true, clan: c as Clan };
}

export async function deleteClan(uid: string, clanId: string): Promise<{ ok: boolean; error?: string }> {
  const c = clans.get(clanId);
  if (!c) return { ok: false, error: 'Clan not found' };
  if ((c as any).leaderUid !== uid) return { ok: false, error: 'Only the leader can delete' };
  // Clear clanId on all members
  for (const m of (c as any).members as ClanMember[]) {
    const u: any = users.get(m.uid);
    if (u) { u.clanId = null; u.clanTag = null; }
  }
  clans.delete(clanId);
  saveClans(); saveUsers();
  return { ok: true };
}

// ── Member operations ──────────────────────────────────────────────────────
function addMember(c: Clan, uid: string): { ok: boolean; error?: string } {
  if (c.members.length >= c.memberLimit) return { ok: false, error: 'القبيلة ممتلئة' };
  const u: any = users.get(uid);
  if (!u) return { ok: false, error: 'User not found' };
  if (u.clanId) return { ok: false, error: 'اللاعب في قبيلة' };
  c.members.push({
    uid, displayName: u.displayName || 'لاعب', avatarId: u.avatarId || 'avatar_1',
    role: 'member', joinedAt: Date.now(), winsContributed: 0,
  });
  u.clanId = c.id;
  u.clanTag = c.tag;
  // Strip any leftover invites or applications for this user
  c.invites      = c.invites.filter(i => i.uid !== uid);
  c.applications = c.applications.filter(a => a.uid !== uid);
  return { ok: true };
}

export async function applyToClan(uid: string, clanId: string, message?: string): Promise<{ ok: boolean; error?: string; autoAccepted?: boolean }> {
  const u: any = users.get(uid);
  if (!u) return { ok: false, error: 'User not found' };
  if (u.clanId) return { ok: false, error: 'Already in a clan' };
  const c = clans.get(clanId);
  if (!c) return { ok: false, error: 'Clan not found' };
  ensureFields(c);
  if ((c as any).members.length >= (c as any).memberLimit) return { ok: false, error: 'القبيلة ممتلئة' };
  // Already invited → just accept
  const inv = (c as any).invites.find((i: any) => i.uid === uid);
  if (inv) {
    const r = addMember(c as Clan, uid);
    if (r.ok) saveClans(), saveUsers();
    return { ok: r.ok, error: r.error, autoAccepted: r.ok };
  }
  // Open clan → still goes through approval (user wanted leader to gate everything)
  if ((c as any).applications.find((a: any) => a.uid === uid)) {
    return { ok: false, error: 'لديك طلب قائم' };
  }
  (c as any).applications.push({
    uid, displayName: u.displayName || 'لاعب', avatarId: u.avatarId || 'avatar_1',
    message: (message || '').slice(0, 140), appliedAt: Date.now(),
  });
  saveClans();
  return { ok: true };
}

export async function acceptApplication(actorUid: string, clanId: string, applicantUid: string): Promise<{ ok: boolean; error?: string }> {
  const c = clans.get(clanId); if (!c) return { ok: false, error: 'Clan not found' };
  ensureFields(c);
  if (!isOfficer(c as Clan, actorUid)) return { ok: false, error: 'Only officers can accept' };
  const idx = (c as any).applications.findIndex((a: any) => a.uid === applicantUid);
  if (idx < 0) return { ok: false, error: 'No such application' };
  (c as any).applications.splice(idx, 1);
  const r = addMember(c as Clan, applicantUid);
  if (!r.ok) return r;
  saveClans(); saveUsers();
  return { ok: true };
}

export async function rejectApplication(actorUid: string, clanId: string, applicantUid: string): Promise<{ ok: boolean; error?: string }> {
  const c = clans.get(clanId); if (!c) return { ok: false, error: 'Clan not found' };
  ensureFields(c);
  if (!isOfficer(c as Clan, actorUid)) return { ok: false, error: 'Only officers can reject' };
  (c as any).applications = (c as any).applications.filter((a: any) => a.uid !== applicantUid);
  saveClans();
  return { ok: true };
}

export async function inviteToClan(actorUid: string, clanId: string, targetUid: string): Promise<{ ok: boolean; error?: string }> {
  const c = clans.get(clanId); if (!c) return { ok: false, error: 'Clan not found' };
  ensureFields(c);
  if (!isOfficer(c as Clan, actorUid)) return { ok: false, error: 'Only officers can invite' };
  const u: any = users.get(targetUid);
  if (!u) return { ok: false, error: 'User not found' };
  if (u.clanId) return { ok: false, error: 'اللاعب في قبيلة' };
  if ((c as any).members.find((m: any) => m.uid === targetUid)) return { ok: false, error: 'عضو بالفعل' };
  if ((c as any).invites.find((i: any) => i.uid === targetUid)) return { ok: false, error: 'تمت دعوته من قبل' };
  (c as any).invites.push({ uid: targetUid, invitedBy: actorUid, invitedAt: Date.now() });
  saveClans();
  return { ok: true };
}

export async function declineInvite(uid: string, clanId: string): Promise<{ ok: boolean }> {
  const c = clans.get(clanId);
  if (c) {
    ensureFields(c);
    (c as any).invites = (c as any).invites.filter((i: any) => i.uid !== uid);
    saveClans();
  }
  return { ok: true };
}

export async function acceptInvite(uid: string, clanId: string): Promise<{ ok: boolean; error?: string }> {
  const u: any = users.get(uid);
  if (!u) return { ok: false, error: 'User not found' };
  if (u.clanId) return { ok: false, error: 'Already in a clan' };
  const c = clans.get(clanId);
  if (!c) return { ok: false, error: 'Clan not found' };
  ensureFields(c);
  const inv = (c as any).invites.find((i: any) => i.uid === uid);
  if (!inv) return { ok: false, error: 'No invite found' };
  const r = addMember(c as Clan, uid);
  if (!r.ok) return r;
  saveClans(); saveUsers();
  return { ok: true };
}

export async function kickMember(actorUid: string, clanId: string, targetUid: string): Promise<{ ok: boolean; error?: string }> {
  const c = clans.get(clanId); if (!c) return { ok: false, error: 'Clan not found' };
  ensureFields(c);
  if (!isOfficer(c as Clan, actorUid)) return { ok: false, error: 'Only officers can kick' };
  if (targetUid === (c as any).leaderUid)            return { ok: false, error: 'Cannot kick the leader' };
  // Officers can kick members but not other officers — only leader can.
  const target = (c as any).members.find((m: any) => m.uid === targetUid);
  if (!target) return { ok: false, error: 'Not a member' };
  if (target.role === 'officer' && (c as any).leaderUid !== actorUid) {
    return { ok: false, error: 'Officers can\'t kick other officers' };
  }
  (c as any).members = (c as any).members.filter((m: any) => m.uid !== targetUid);
  const u: any = users.get(targetUid);
  if (u) { u.clanId = null; u.clanTag = null; }
  saveClans(); saveUsers();
  return { ok: true };
}

export async function setRole(actorUid: string, clanId: string, targetUid: string, role: ClanRole): Promise<{ ok: boolean; error?: string }> {
  const c = clans.get(clanId); if (!c) return { ok: false, error: 'Clan not found' };
  ensureFields(c);
  if ((c as any).leaderUid !== actorUid) return { ok: false, error: 'Only the leader can change roles' };
  if (targetUid === (c as any).leaderUid) return { ok: false, error: 'Leader role can\'t be re-assigned here' };
  const target = (c as any).members.find((m: any) => m.uid === targetUid);
  if (!target) return { ok: false, error: 'Not a member' };
  if (role !== 'member' && role !== 'officer') return { ok: false, error: 'Invalid role' };
  target.role = role;
  saveClans();
  return { ok: true };
}

export async function transferLeader(actorUid: string, clanId: string, newLeaderUid: string): Promise<{ ok: boolean; error?: string }> {
  const c = clans.get(clanId); if (!c) return { ok: false, error: 'Clan not found' };
  ensureFields(c);
  if ((c as any).leaderUid !== actorUid) return { ok: false, error: 'Only the leader can transfer' };
  const target = (c as any).members.find((m: any) => m.uid === newLeaderUid);
  if (!target) return { ok: false, error: 'Not a member' };
  // Demote old leader
  const old = (c as any).members.find((m: any) => m.uid === actorUid);
  if (old) old.role = 'member';
  target.role = 'leader';
  (c as any).leaderUid = newLeaderUid;
  saveClans();
  return { ok: true };
}

export async function leaveClan(uid: string): Promise<{ ok: boolean; error?: string; disbanded?: boolean }> {
  const u: any = users.get(uid);
  if (!u?.clanId) return { ok: false, error: 'Not in a clan' };
  const c = clans.get(u.clanId);
  if (!c) {
    u.clanId = null; u.clanTag = null; saveUsers();
    return { ok: true };
  }
  ensureFields(c);
  (c as any).members = (c as any).members.filter((m: any) => m.uid !== uid);
  u.clanId = null; u.clanTag = null;

  let disbanded = false;
  if ((c as any).members.length === 0) {
    clans.delete((c as any).id);
    disbanded = true;
  } else if ((c as any).leaderUid === uid) {
    // Promote longest-tenured remaining member, prefer existing officers.
    const officers = (c as any).members.filter((m: ClanMember) => m.role === 'officer');
    const list = officers.length > 0 ? officers : (c as any).members;
    const newLeader = list.slice().sort((a: ClanMember, b: ClanMember) => a.joinedAt - b.joinedAt)[0];
    newLeader.role = 'leader';
    (c as any).leaderUid = newLeader.uid;
  }
  saveClans(); saveUsers();
  return { ok: true, disbanded };
}

/** Add coins to the clan bank — used by clan tournaments. */
export async function depositToClanBank(clanId: string, amount: number): Promise<void> {
  const c = clans.get(clanId);
  if (!c) return;
  ensureFields(c);
  (c as any).bank = ((c as any).bank || 0) + Math.max(0, Math.floor(amount));
  saveClans();
}
