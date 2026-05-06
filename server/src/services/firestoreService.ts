import { UserProfile, LeaderboardEntry, GameType, MatchRecord } from '@check-game/shared';
import { STORE_ITEMS, FREE_ITEMS, DEFAULT_EQUIPPED } from '@check-game/shared';
import {
  deriveLevel, rollDailyMissions,
  MISSION_POOL, ACHIEVEMENT_DEFS, LEVEL_REWARDS, AchievementStat,
} from '@check-game/shared';
import { users, leaderboard, history, saveUsers, saveLeaderboard, saveHistory } from '../data/store';

const XP_PER_WIN = 100;
const XP_PER_GAME = 20;
const COINS_PER_WIN = 15;
const COINS_PER_GAME = 5;

const LEVEL_TITLES = [
  'مبتدئ الصحراء', 'رحالة الرمال', 'صياد اللؤلؤ', 'تاجر الواحة',
  'فارس النخيل', 'شاعر الأمسيات', 'ربان الظبوط', 'صقار الجبال',
  'أمير الدهناء', 'سلطان الرياح', 'حكيم الصحراء',
];

function titleForLevel(level: number): string {
  return LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)] || LEVEL_TITLES[0];
}

/** @deprecated kept for callers that still want the old flat-curve label only. */
export function getLevelFromXp(xp: number): { level: number; title: string } {
  const { level } = deriveLevel(xp);
  return { level, title: titleForLevel(level) };
}

const defaultStats = {
  totalGames: 0, totalWins: 0, currentStreak: 0,
  checkWins: 0, ludoWins: 0, dominoWins: 0, jacaroWins: 0,
};

const defaultEquipped = { ...DEFAULT_EQUIPPED };

function generateUsername(displayName: string): string {
  const base = displayName.trim().replace(/\s+/g, '_').slice(0, 20);
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base}#${suffix}`;
}

function findUserByUsername(query: string): any | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  // Strip a leading '#' if the user typed e.g. "#4523"
  const stripped = q.startsWith('#') ? q.slice(1) : q;

  // 1) Exact full-username match (e.g. "ahmed#4523")
  for (const [, u] of users) {
    if (u.username && u.username.toLowerCase() === q) return u;
  }

  // 2) Match by digits-only suffix (e.g. user typed just "4523" or "#4523")
  if (/^\d{3,8}$/.test(stripped)) {
    const matches: any[] = [];
    for (const [, u] of users) {
      if (!u.username) continue;
      const suffix = (u.username.split('#')[1] || '').toLowerCase();
      if (suffix === stripped) matches.push(u);
    }
    // Only succeed if a single user owns this number suffix
    if (matches.length === 1) return matches[0];
  }

  return null;
}

export async function createUserProfile(uid: string, displayName: string, email: string): Promise<void> {
  const profile: UserProfile = {
    uid, displayName, username: generateUsername(displayName), email,
    avatarId: 'avatar_1',
    hasSeenRules: false,
    createdAt: Date.now(),
    coins: 100,
    ownedItems: [...FREE_ITEMS],
    equippedItems: { ...defaultEquipped },
    stats: { ...defaultStats },
    ranking: { level: 1, xp: 0, title: LEVEL_TITLES[0] },
    friends: [],
    friendRequests: [],
  };
  users.set(uid, profile);
  saveUsers();
  updateLeaderboard(uid, profile);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const data = users.get(uid);
  if (!data) return null;
  if (!data.stats?.checkWins) data.stats = { ...defaultStats, ...data.stats };
  if (data.coins === undefined) data.coins = 0;
  if (!data.ownedItems) data.ownedItems = [...FREE_ITEMS];
  if (!data.equippedItems) data.equippedItems = { ...defaultEquipped };
  if (!data.username) { data.username = generateUsername(data.displayName); saveUsers(); }
  if (!data.friends) data.friends = [];
  if (!data.friendRequests) data.friendRequests = [];
  return data as UserProfile;
}

export async function markRulesSeen(uid: string): Promise<void> {
  const p = users.get(uid);
  if (p) { p.hasSeenRules = true; saveUsers(); }
}

export async function updateProfileName(uid: string, displayName: string): Promise<void> {
  const p = users.get(uid);
  if (p) { p.displayName = displayName; saveUsers(); }
  const lb = leaderboard.get(uid);
  if (lb) { lb.displayName = displayName; saveLeaderboard(); }
}

export async function updateProfileAvatar(uid: string, avatarId: string): Promise<void> {
  const p = users.get(uid);
  if (p) { p.avatarId = avatarId; saveUsers(); }
  const lb = leaderboard.get(uid);
  if (lb) { lb.avatarId = avatarId; saveLeaderboard(); }
}

export async function recordGameResult(uid: string, isWinner: boolean, gameType: GameType = 'check'): Promise<void> {
  const p = users.get(uid);
  if (!p) return;

  const stats = { ...defaultStats, ...p.stats };
  const xpGain = isWinner ? XP_PER_WIN : XP_PER_GAME;
  const coinsGain = isWinner ? COINS_PER_WIN : COINS_PER_GAME;
  const newXp = p.ranking.xp + xpGain;
  const { level } = deriveLevel(newXp);
  const title = titleForLevel(level);

  stats.totalGames += 1;
  stats.totalWins += isWinner ? 1 : 0;
  stats.currentStreak = isWinner ? stats.currentStreak + 1 : 0;
  if (isWinner) (stats as any)[`${gameType}Wins`] = ((stats as any)[`${gameType}Wins`] || 0) + 1;

  p.stats = stats;
  p.ranking = { level, xp: newXp, title };
  p.coins = (p.coins || 0) + coinsGain;

  // ── Daily mission progress ────────────────────────────────────────────────
  const today = todayKey();
  const dm = ensureDailyMissions(p, uid, today);
  for (const m of dm.missions) {
    const def = MISSION_POOL.find(d => d.id === m.id);
    if (!def || m.claimed) continue;
    if (def.type === 'play') {
      m.progress = Math.min(def.target, m.progress + 1);
    } else if (def.type === 'win' && isWinner) {
      m.progress = Math.min(def.target, m.progress + 1);
    } else if (def.type === 'streak') {
      // Snapshot the (possibly newly bumped) streak so a single win can
      // satisfy a streak mission if it puts the player at >= target.
      m.progress = Math.min(def.target, Math.max(m.progress, stats.currentStreak));
    }
  }

  saveUsers();
  updateLeaderboard(uid, p as UserProfile);
}

// ── Daily missions ───────────────────────────────────────────────────────────
function todayKey(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Returns today's daily-mission state, rolling a fresh set on date change. */
function ensureDailyMissions(p: any, uid: string, today: string) {
  if (!p.dailyMissions || p.dailyMissions.date !== today) {
    p.dailyMissions = { date: today, missions: rollDailyMissions(uid, today) };
  }
  return p.dailyMissions;
}

export async function getProgression(uid: string): Promise<{
  missions: any;
  achievements: any[];
  levelRewards: any[];
  level: number;
  xp: number;
  xpInLevel: number;
  xpForNextLevel: number;
} | null> {
  const p = users.get(uid) as any;
  if (!p) return null;
  const today = todayKey();
  const dm = ensureDailyMissions(p, uid, today);

  // Mission view enriched with their definition
  const missions = {
    date: dm.date,
    items: dm.missions.map((m: any) => {
      const def = MISSION_POOL.find(d => d.id === m.id)!;
      return {
        id: m.id,
        emoji: def.emoji, labelAr: def.labelAr, labelEn: def.labelEn,
        target: def.target, rewardCoins: def.rewardCoins,
        progress: m.progress, claimed: m.claimed,
        complete: m.progress >= def.target,
      };
    }),
  };

  const xp = p.ranking?.xp ?? 0;
  const lvl = deriveLevel(xp);

  // Achievements: compute current value for each, mark complete/claimed
  const claimedAch: string[] = p.claimedAchievements || [];
  const achievements = ACHIEVEMENT_DEFS.map(def => {
    const cur = readStat(p, def.stat, lvl.level);
    return {
      id: def.id,
      emoji: def.emoji, labelAr: def.labelAr, labelEn: def.labelEn,
      descAr: def.descAr, descEn: def.descEn,
      target: def.target, rewardCoins: def.rewardCoins,
      progress: Math.min(cur, def.target),
      complete: cur >= def.target,
      claimed: claimedAch.includes(def.id),
    };
  });

  // Level rewards: claimable if level reached & not yet claimed
  const claimedLvl: number[] = p.claimedLevelRewards || [];
  const levelRewards = LEVEL_REWARDS.map(r => ({
    ...r,
    reached: lvl.level >= r.level,
    claimed: claimedLvl.includes(r.level),
  }));

  return {
    missions, achievements, levelRewards,
    level: lvl.level, xp,
    xpInLevel: lvl.xpInLevel, xpForNextLevel: lvl.xpForNextLevel,
  };
}

function readStat(p: any, stat: AchievementStat, level: number): number {
  if (stat === 'level') return level;
  return Number(p.stats?.[stat] ?? 0);
}

export async function claimMission(uid: string, missionId: string): Promise<{ ok: boolean; error?: string; coins?: number; granted?: number }> {
  const p = users.get(uid) as any;
  if (!p) return { ok: false, error: 'User not found' };
  const today = todayKey();
  const dm = ensureDailyMissions(p, uid, today);
  const m = dm.missions.find((x: any) => x.id === missionId);
  if (!m) return { ok: false, error: 'Mission not in today\'s set' };
  const def = MISSION_POOL.find(d => d.id === missionId);
  if (!def) return { ok: false, error: 'Unknown mission' };
  if (m.claimed) return { ok: false, error: 'Already claimed' };
  if (m.progress < def.target) return { ok: false, error: 'Mission not complete' };
  m.claimed = true;
  p.coins = (p.coins || 0) + def.rewardCoins;
  saveUsers();
  return { ok: true, coins: p.coins, granted: def.rewardCoins };
}

export async function claimAchievement(uid: string, achievementId: string): Promise<{ ok: boolean; error?: string; coins?: number; granted?: number }> {
  const p = users.get(uid) as any;
  if (!p) return { ok: false, error: 'User not found' };
  const def = ACHIEVEMENT_DEFS.find(d => d.id === achievementId);
  if (!def) return { ok: false, error: 'Unknown achievement' };
  const claimed: string[] = p.claimedAchievements || [];
  if (claimed.includes(achievementId)) return { ok: false, error: 'Already claimed' };
  const xp = p.ranking?.xp ?? 0;
  const lvl = deriveLevel(xp).level;
  const cur = readStat(p, def.stat, lvl);
  if (cur < def.target) return { ok: false, error: 'Not yet completed' };
  p.claimedAchievements = [...claimed, achievementId];
  p.coins = (p.coins || 0) + def.rewardCoins;
  saveUsers();
  return { ok: true, coins: p.coins, granted: def.rewardCoins };
}

export async function claimLevelReward(uid: string, level: number): Promise<{ ok: boolean; error?: string; coins?: number; granted?: number; itemGranted?: string }> {
  const p = users.get(uid) as any;
  if (!p) return { ok: false, error: 'User not found' };
  const reward = LEVEL_REWARDS.find(r => r.level === level);
  if (!reward) return { ok: false, error: 'No reward at that level' };
  const claimed: number[] = p.claimedLevelRewards || [];
  if (claimed.includes(level)) return { ok: false, error: 'Already claimed' };
  const xp = p.ranking?.xp ?? 0;
  const cur = deriveLevel(xp).level;
  if (cur < level) return { ok: false, error: 'Level not yet reached' };
  p.claimedLevelRewards = [...claimed, level];
  p.coins = (p.coins || 0) + reward.rewardCoins;
  let itemGranted: string | undefined;
  if (reward.rewardItemId) {
    const owned: string[] = p.ownedItems || [];
    if (!owned.includes(reward.rewardItemId)) {
      p.ownedItems = [...owned, reward.rewardItemId];
      itemGranted = reward.rewardItemId;
    }
  }
  saveUsers();
  return { ok: true, coins: p.coins, granted: reward.rewardCoins, itemGranted };
}

export async function purchaseItem(uid: string, itemId: string): Promise<{ ok: boolean; error?: string; coins?: number }> {
  const p = users.get(uid);
  if (!p) return { ok: false, error: 'User not found' };

  const item = STORE_ITEMS.find(i => i.id === itemId);
  if (!item) return { ok: false, error: 'Item not found' };

  const owned: string[] = p.ownedItems || [];
  if (owned.includes(itemId)) return { ok: false, error: 'Already owned' };

  const coins: number = p.coins || 0;
  if (coins < item.price) return { ok: false, error: 'Not enough coins' };

  p.coins = coins - item.price;
  p.ownedItems = [...owned, itemId];
  saveUsers();

  return { ok: true, coins: p.coins };
}

/** Direct coin credit (used for tournament prizes etc.). Returns the new balance. */
export async function grantCoins(uid: string, amount: number): Promise<{ ok: boolean; coins?: number }> {
  const p = users.get(uid);
  if (!p) return { ok: false };
  p.coins = (p.coins || 0) + Math.max(0, Math.floor(amount));
  saveUsers();
  return { ok: true, coins: p.coins };
}

export async function rechargeCoins(uid: string, packageId: string): Promise<{ ok: boolean; error?: string; coins?: number; granted?: number }> {
  const PACKAGES: Record<string, number> = {
    pkg_100:   100,
    pkg_500:   550,
    pkg_1000: 1150,
    pkg_3000: 3500,
    pkg_5000: 6000,
    pkg_10000:13000,
  };
  const granted = PACKAGES[packageId];
  if (!granted) return { ok: false, error: 'Unknown package' };
  const p = users.get(uid);
  if (!p) return { ok: false, error: 'User not found' };
  p.coins = (p.coins || 0) + granted;
  saveUsers();
  return { ok: true, coins: p.coins, granted };
}

const DAILY_REWARDS = [
  { coins: 100, frame: null },
  { coins: 200, frame: null },
  { coins: 300, frame: null },
  { coins: 500, frame: 'frame_desert' },
  { coins: 700, frame: null },
  { coins: 1000, frame: null },
  { coins: 2000, frame: 'frame_sultan' },
];

function dayKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

export async function getDailyReward(uid: string): Promise<{ day: number; canClaim: boolean; lastClaimDay: string | null; rewards: typeof DAILY_REWARDS }> {
  const p = users.get(uid) as any;
  if (!p) return { day: 0, canClaim: false, lastClaimDay: null, rewards: DAILY_REWARDS };
  const today = dayKey();
  const lastClaimDay: string | null = p.dailyLastClaimDay || null;
  const dayIdx: number = p.dailyDayIndex ?? 0;
  const canClaim = lastClaimDay !== today;
  return { day: dayIdx, canClaim, lastClaimDay, rewards: DAILY_REWARDS };
}

export async function claimDailyReward(uid: string): Promise<{ ok: boolean; error?: string; coins?: number; granted?: { coins: number; frame: string | null }; nextDay?: number }> {
  const p = users.get(uid) as any;
  if (!p) return { ok: false, error: 'User not found' };
  const today = dayKey();
  const yesterday = (() => { const d = new Date(); d.setUTCDate(d.getUTCDate() - 1); return dayKey(d); })();
  if (p.dailyLastClaimDay === today) return { ok: false, error: 'Already claimed today' };

  let dayIdx: number = p.dailyDayIndex ?? 0;
  if (p.dailyLastClaimDay && p.dailyLastClaimDay !== yesterday) {
    dayIdx = 0;
  }
  if (dayIdx >= DAILY_REWARDS.length) dayIdx = 0;
  const reward = DAILY_REWARDS[dayIdx];

  p.coins = (p.coins || 0) + reward.coins;
  if (reward.frame) {
    const owned: string[] = p.ownedItems || [];
    if (!owned.includes(reward.frame)) p.ownedItems = [...owned, reward.frame];
  }
  p.dailyLastClaimDay = today;
  p.dailyDayIndex = (dayIdx + 1) % DAILY_REWARDS.length;
  saveUsers();
  return { ok: true, coins: p.coins, granted: reward, nextDay: p.dailyDayIndex };
}

export async function equipItem(uid: string, itemId: string): Promise<{ ok: boolean; error?: string }> {
  const p = users.get(uid);
  if (!p) return { ok: false, error: 'User not found' };

  const item = STORE_ITEMS.find(i => i.id === itemId);
  if (!item) return { ok: false, error: 'Item not found' };

  const owned: string[] = p.ownedItems || [];
  if (!owned.includes(itemId) && item.price > 0) return { ok: false, error: 'Not owned' };

  if (!p.equippedItems) p.equippedItems = { ...defaultEquipped };
  p.equippedItems[item.category] = itemId;
  if (item.category === 'character') p.avatarId = itemId;
  saveUsers();

  return { ok: true };
}

function updateLeaderboard(uid: string, profile: UserProfile): void {
  const stats = { ...defaultStats, ...profile.stats };
  const entry: LeaderboardEntry = {
    uid,
    displayName: profile.displayName,
    avatarId: profile.avatarId,
    level: profile.ranking.level,
    xp: profile.ranking.xp,
    wins: stats.totalWins,
    gamesPlayed: stats.totalGames,
    winRate: stats.totalGames > 0 ? Math.round((stats.totalWins / stats.totalGames) * 100) : 0,
    checkWins: stats.checkWins || 0,
    ludoWins: stats.ludoWins || 0,
    dominoWins: stats.dominoWins || 0,
    jacaroWins: stats.jacaroWins || 0,
  };
  leaderboard.set(uid, entry);
  saveLeaderboard();
}

export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  return Array.from(leaderboard.values())
    .sort((a, b) => b.xp - a.xp)
    .slice(0, limit);
}

// ── Friends ────────────────────────────────────────────────────────────────────

export async function sendFriendRequest(fromUid: string, toUsername: string): Promise<{ ok: boolean; error?: string; recipientUid?: string; mutual?: boolean }> {
  const from = users.get(fromUid);
  if (!from) return { ok: false, error: 'User not found' };

  const to = findUserByUsername(toUsername);
  if (!to) return { ok: false, error: 'Username not found' };
  if (to.uid === fromUid) return { ok: false, error: 'Cannot add yourself' };

  if (!from.friends) from.friends = [];
  if (!from.friendRequests) from.friendRequests = [];
  if (!to.friends) to.friends = [];
  if (!to.friendRequests) to.friendRequests = [];

  if (from.friends.includes(to.uid)) return { ok: false, error: 'Already friends' };
  if (to.friendRequests.includes(fromUid)) return { ok: false, error: 'Request already sent' };

  // If they already sent us a request, auto-accept (mutual)
  if (from.friendRequests.includes(to.uid)) {
    from.friendRequests = from.friendRequests.filter((u: string) => u !== to.uid);
    from.friends.push(to.uid);
    to.friends.push(fromUid);
    saveUsers();
    return { ok: true, recipientUid: to.uid, mutual: true };
  }

  to.friendRequests.push(fromUid);
  saveUsers();
  return { ok: true, recipientUid: to.uid };
}

export async function acceptFriendRequest(uid: string, friendUid: string): Promise<{ ok: boolean; error?: string }> {
  const me = users.get(uid);
  const friend = users.get(friendUid);
  if (!me || !friend) return { ok: false, error: 'User not found' };

  if (!me.friendRequests?.includes(friendUid)) return { ok: false, error: 'No pending request' };

  me.friendRequests = (me.friendRequests || []).filter((u: string) => u !== friendUid);
  if (!me.friends) me.friends = [];
  if (!friend.friends) friend.friends = [];
  me.friends.push(friendUid);
  friend.friends.push(uid);
  saveUsers();
  return { ok: true };
}

export async function declineOrRemoveFriend(uid: string, otherUid: string): Promise<{ ok: boolean }> {
  const me = users.get(uid);
  const other = users.get(otherUid);
  if (!me) return { ok: false };

  me.friendRequests = (me.friendRequests || []).filter((u: string) => u !== otherUid);
  me.friends = (me.friends || []).filter((u: string) => u !== otherUid);
  if (other) {
    other.friends = (other.friends || []).filter((u: string) => u !== uid);
    other.friendRequests = (other.friendRequests || []).filter((u: string) => u !== uid);
  }
  saveUsers();
  return { ok: true };
}

export async function getFriendsList(uid: string): Promise<any[]> {
  const me = users.get(uid);
  if (!me || !me.friends) return [];
  return (me.friends as string[]).map((fUid: string) => {
    const f = users.get(fUid);
    if (!f) return null;
    return {
      uid: f.uid,
      displayName: f.displayName,
      username: f.username || '',
      avatarId: f.avatarId,
      equippedFrame: f.equippedItems?.avatarFrame || 'frame_default',
      level: f.ranking?.level ?? 1,
      wins: f.stats?.totalWins ?? 0,
    };
  }).filter(Boolean);
}

export async function getFriendRequests(uid: string): Promise<any[]> {
  const me = users.get(uid);
  if (!me || !me.friendRequests) return [];
  return (me.friendRequests as string[]).map((fUid: string) => {
    const f = users.get(fUid);
    if (!f) return null;
    return {
      uid: f.uid,
      displayName: f.displayName,
      username: f.username || '',
      avatarId: f.avatarId,
      equippedFrame: f.equippedItems?.avatarFrame || 'frame_default',
      level: f.ranking?.level ?? 1,
    };
  }).filter(Boolean);
}

// ── Match History ──────────────────────────────────────────────────────────────

export async function saveMatchHistory(record: MatchRecord): Promise<void> {
  history.unshift(record);
  if (history.length > 1000) history.splice(1000);
  saveHistory();
}

export async function getUserHistory(uid: string, limit = 20): Promise<MatchRecord[]> {
  return history
    .filter(r => r.players?.some((p: any) => p.uid === uid))
    .slice(0, limit);
}
