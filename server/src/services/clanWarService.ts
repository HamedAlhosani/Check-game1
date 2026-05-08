import { v4 as uuidv4 } from 'uuid';
import {
  Clan, ClanScope, ClanWar, ClanWarSide,
  CLAN_WAR_PRIZE_PER_MEMBER, CLAN_WAR_TIE_PRIZE_PER_MEMBER, CLAN_WAR_MIN_MEMBERS,
} from '@check-game/shared';
import { clans, clanWars, users, saveClanWars, saveUsers } from '../data/store';

/**
 * Weekly Clan-War service. Two clans of comparable size are paired
 * Mon→Sun (UTC). Every Check win a clan member scores during that week
 * adds 1 point to their clan's war total. At week-end the higher-
 * scoring clan splits a coin prize across every member.
 *
 * Lazy ticking: every read that touches a war first calls
 * `tickWarIfExpired()` which closes/pays out an expired war and rolls
 * the next week's matchup. Plus a 1-hour safety setInterval kicks the
 * tick even when no one is actively reading. No node-cron dep.
 */

// ── Time / week helpers ─────────────────────────────────────────────────────

/** Returns the UTC Monday-midnight timestamp at-or-before `t`. */
function weekStartUtc(t: number): number {
  const d = new Date(t);
  // JS getUTCDay: Sunday=0, Monday=1, ..., Saturday=6
  const dow = d.getUTCDay();
  // Days since Monday (Mon→0, Sun→6)
  const offset = (dow + 6) % 7;
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - offset);
  return d.getTime();
}

/** ISO week key, e.g. "2026-W19". One war per pair per week. */
function weekKeyFor(weekStart: number): string {
  const d = new Date(weekStart);
  // Compute ISO week number — close enough for keying purposes; the
  // exact ISO algorithm uses Thursday as the pivot, but our weekStart
  // is always Monday so this matches.
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.getTime();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
  }
  const week = 1 + Math.ceil((firstThursday - target.getTime()) / 604800000);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// ── Side / matchmaking ──────────────────────────────────────────────────────

function buildSide(clan: Clan): ClanWarSide {
  return {
    clanId: clan.id,
    clanName: clan.name,
    clanTag: clan.tag,
    emblem: clan.emblem,
    memberCount: clan.members.length,
    score: 0,
  };
}

/** Find the closest-sized eligible rival for `clan` in the same scope. Returns
 *  null if no opponent is available (small/empty registry). */
function findRival(clan: Clan, scope: ClanScope): Clan | null {
  const candidates: Clan[] = [];
  for (const c of clans.values()) {
    const cScope = (c.scope === 'ludo' ? 'ludo' : 'check') as ClanScope;
    if (cScope !== scope) continue;
    if (c.id === clan.id) continue;
    if (!c.members || c.members.length < CLAN_WAR_MIN_MEMBERS) continue;
    candidates.push(c as Clan);
  }
  if (candidates.length === 0) return null;
  // Closest-size first; ties broken by the most-recently-active clan
  // (proxied by created-at since we don't track lastActive yet).
  candidates.sort((a, b) => {
    const ad = Math.abs(a.members.length - clan.members.length);
    const bd = Math.abs(b.members.length - clan.members.length);
    if (ad !== bd) return ad - bd;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
  return candidates[0];
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns the active war for `clanId`, creating one for this week if
 * none exists, and rolling forward / paying out if the prior week
 * already closed. Returns null only when there's literally no eligible
 * rival in the registry.
 */
export function getCurrentWar(clanId: string): ClanWar | null {
  const clan = clans.get(clanId) as Clan | undefined;
  if (!clan) return null;
  if (!clan.members || clan.members.length < CLAN_WAR_MIN_MEMBERS) return null;
  const scope: ClanScope = (clan.scope === 'ludo' ? 'ludo' : 'check');

  // Find any war this clan is in
  let war: ClanWar | null = null;
  for (const w of clanWars.values()) {
    if (w.clan1.clanId === clanId || w.clan2.clanId === clanId) {
      war = w as ClanWar;
      break;
    }
  }

  // Tick: if war exists but its week ended, settle and clear so a new
  // matchup can start.
  if (war && Date.now() >= war.weekEndsAt && war.outcome === 'pending') {
    settleWar(war);
  }

  // If the existing war already settled (paid out), don't auto-recreate
  // until a fresh tick — but for simplicity, we DO start the next week
  // immediately so members always have an active war to compete for.
  if (!war || war.outcome !== 'pending') {
    // Remove the settled record so we don't keep a stale pointer.
    if (war && war.outcome !== 'pending') {
      clanWars.delete(war.id);
    }
    war = startWar(clan, scope);
  }

  return war;
}

/** Adds 1 point to whichever side `uid`'s clan is on, if any. Called from
 *  recordGameResult after a Check win. */
export function creditClanWarWin(uid: string, scope: ClanScope = 'check'): void {
  const u: any = users.get(uid);
  if (!u) return;
  const clanIdField = scope === 'ludo' ? 'ludoClanId' : 'clanId';
  const myClanId = u[clanIdField];
  if (!myClanId) return;

  // Walk wars and find one this clan is part of (and still pending).
  for (const w of clanWars.values()) {
    if (w.outcome !== 'pending') continue;
    if (Date.now() >= w.weekEndsAt) continue;
    if (w.clan1.clanId === myClanId) { w.clan1.score++; saveClanWars(); return; }
    if (w.clan2.clanId === myClanId) { w.clan2.score++; saveClanWars(); return; }
  }
  // Not in a war yet → spin one up so this win counts forward
  getCurrentWar(myClanId);
  // Re-credit after spin-up
  for (const w of clanWars.values()) {
    if (w.outcome !== 'pending') continue;
    if (w.clan1.clanId === myClanId) { w.clan1.score++; saveClanWars(); return; }
    if (w.clan2.clanId === myClanId) { w.clan2.score++; saveClanWars(); return; }
  }
}

// ── Internal: war lifecycle ─────────────────────────────────────────────────

function startWar(clan: Clan, scope: ClanScope): ClanWar | null {
  const rival = findRival(clan, scope);
  if (!rival) return null;
  const start = weekStartUtc(Date.now());
  const war: ClanWar = {
    id: uuidv4(),
    weekKey: weekKeyFor(start),
    weekStartedAt: start,
    weekEndsAt: start + ONE_WEEK_MS,
    scope,
    clan1: buildSide(clan),
    clan2: buildSide(rival),
    outcome: 'pending',
    prizePerMember: 0,
  };
  clanWars.set(war.id, war);
  saveClanWars();
  return war;
}

function settleWar(war: ClanWar): void {
  const c1Score = war.clan1.score;
  const c2Score = war.clan2.score;
  let outcome: 'clan1' | 'clan2' | 'tie';
  let prizePerMember: number;
  if (c1Score > c2Score)      { outcome = 'clan1'; prizePerMember = CLAN_WAR_PRIZE_PER_MEMBER; }
  else if (c2Score > c1Score) { outcome = 'clan2'; prizePerMember = CLAN_WAR_PRIZE_PER_MEMBER; }
  else                        { outcome = 'tie';   prizePerMember = CLAN_WAR_TIE_PRIZE_PER_MEMBER; }
  war.outcome = outcome;
  war.prizePerMember = prizePerMember;

  const winners: string[] = [];
  if (outcome === 'tie') {
    const c1 = clans.get(war.clan1.clanId) as Clan | undefined;
    const c2 = clans.get(war.clan2.clanId) as Clan | undefined;
    for (const m of (c1?.members || [])) winners.push(m.uid);
    for (const m of (c2?.members || [])) winners.push(m.uid);
  } else {
    const winnerClan = clans.get(outcome === 'clan1' ? war.clan1.clanId : war.clan2.clanId) as Clan | undefined;
    for (const m of (winnerClan?.members || [])) winners.push(m.uid);
  }

  // Pay out coins to every winning member.
  for (const uid of winners) {
    const u: any = users.get(uid);
    if (!u) continue;
    u.coins = (u.coins || 0) + prizePerMember;
  }
  saveUsers();
  saveClanWars();
}

// ── Periodic safety tick ────────────────────────────────────────────────────
// Closes any expired wars even when no one is reading. Runs once per
// hour; cheap enough that we don't need a real cron.

let intervalHandle: NodeJS.Timeout | null = null;
export function startClanWarTicker(): void {
  if (intervalHandle) return;
  intervalHandle = setInterval(() => {
    const now = Date.now();
    for (const w of clanWars.values()) {
      if (w.outcome !== 'pending') continue;
      if (now >= w.weekEndsAt) settleWar(w);
    }
  }, 60 * 60 * 1000); // 1 hour
}
