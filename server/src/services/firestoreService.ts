import { UserProfile, LeaderboardEntry, GameType, MatchRecord } from '@check-game/shared';
import { STORE_ITEMS, FREE_ITEMS, DEFAULT_EQUIPPED } from '@check-game/shared';
import {
  deriveLevel, rollDailyMissions,
  MISSION_POOL, ACHIEVEMENT_DEFS, LEVEL_REWARDS, AchievementStat,
  CHESTS, ChestTier,
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
  totalGames: 0, totalWins: 0, totalLosses: 0, currentStreak: 0,
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
  // Backfill totalLosses for users who played before the field existed.
  // totalGames is authoritative, so derive: losses = games - wins.
  const s = data.stats as any;
  if (s.totalLosses === undefined || s.totalLosses === null) {
    s.totalLosses = Math.max(0, (s.totalGames || 0) - (s.totalWins || 0));
    saveUsers();
  }
  if (data.coins === undefined) data.coins = 0;
  if ((data as any).gems === undefined) (data as any).gems = 0;
  // Ludo wallet is fully separate. New players get a 200-coin starter pot
  // so the bet/bot config menu has something to work with from day one.
  if ((data as any).ludoCoins === undefined) (data as any).ludoCoins = 200;
  if ((data as any).ludoGems === undefined) (data as any).ludoGems = 0;
  // Ludo clan slot is also separate from Check's clanId. New users start
  // in no Ludo clan; we just initialize the field so the API doesn't
  // return undefined.
  if ((data as any).ludoClanId === undefined) (data as any).ludoClanId = null;
  if ((data as any).ludoClanTag === undefined) (data as any).ludoClanTag = null;
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
  stats.totalLosses += isWinner ? 0 : 1;
  stats.currentStreak = isWinner ? stats.currentStreak + 1 : 0;
  if (isWinner) (stats as any)[`${gameType}Wins`] = ((stats as any)[`${gameType}Wins`] || 0) + 1;

  p.stats = stats;
  p.ranking = { level, xp: newXp, title };
  p.coins = (p.coins || 0) + coinsGain;
  // Treasure key drop: 1 key per win, 1 every 3 losses (so engagement
  // stays positive even on a losing streak).
  if (isWinner) {
    (p as any).keys = ((p as any).keys || 0) + 1;
  } else if (stats.totalGames % 3 === 0) {
    (p as any).keys = ((p as any).keys || 0) + 1;
  }

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

/** Ludo-wallet variant of purchaseItem. Spends ludoCoins instead of coins. */
export async function purchaseLudoItem(uid: string, itemId: string): Promise<{ ok: boolean; error?: string; ludoCoins?: number }> {
  const p = users.get(uid);
  if (!p) return { ok: false, error: 'User not found' };

  const item = STORE_ITEMS.find(i => i.id === itemId);
  if (!item) return { ok: false, error: 'Item not found' };

  const owned: string[] = p.ownedItems || [];
  if (owned.includes(itemId)) return { ok: false, error: 'Already owned' };

  const ludoCoins: number = (p as any).ludoCoins ?? 0;
  if (ludoCoins < item.price) return { ok: false, error: 'Not enough Ludo coins' };

  (p as any).ludoCoins = ludoCoins - item.price;
  p.ownedItems = [...owned, itemId];
  saveUsers();

  return { ok: true, ludoCoins: (p as any).ludoCoins };
}

/** Direct coin credit (used for tournament prizes etc.). Returns the new balance. */
export async function grantCoins(uid: string, amount: number): Promise<{ ok: boolean; coins?: number }> {
  const p = users.get(uid);
  if (!p) return { ok: false };
  p.coins = (p.coins || 0) + Math.max(0, Math.floor(amount));
  saveUsers();
  return { ok: true, coins: p.coins };
}

// ── Daily Lucky Wheel ─────────────────────────────────────────────────────
/**
 * Prize segments for the daily wheel. Weights are out of 100 — must sum to
 * 100 so the cumulative-distribution sampler below works correctly.
 * The 'item' segment grants a random gold/legendary item the user doesn't
 * already own; if they own everything in that tier, they get 10k coins.
 */
const WHEEL_PRIZES = [
  { id: 'coin50',   weight: 28, kind: 'coins' as const, coins: 50,    labelAr: '50 كوينز',     labelEn: '50 coins',    rarity: 'common' },
  { id: 'coin100',  weight: 22, kind: 'coins' as const, coins: 100,   labelAr: '100 كوينز',    labelEn: '100 coins',   rarity: 'common' },
  { id: 'coin250',  weight: 16, kind: 'coins' as const, coins: 250,   labelAr: '250 كوينز',    labelEn: '250 coins',   rarity: 'uncommon' },
  { id: 'coin500',  weight: 12, kind: 'coins' as const, coins: 500,   labelAr: '500 كوينز',    labelEn: '500 coins',   rarity: 'uncommon' },
  { id: 'coin1000', weight: 9,  kind: 'coins' as const, coins: 1000,  labelAr: '1,000 كوينز',  labelEn: '1,000 coins', rarity: 'rare' },
  { id: 'coin2500', weight: 6,  kind: 'coins' as const, coins: 2500,  labelAr: '2,500 كوينز',  labelEn: '2,500 coins', rarity: 'rare' },
  { id: 'coin5000', weight: 5,  kind: 'coins' as const, coins: 5000,  labelAr: '5,000 كوينز',  labelEn: '5,000 coins', rarity: 'epic' },
  { id: 'mystery',  weight: 2,  kind: 'item'  as const, coins: 0,     labelAr: '🎁 هدية أسطورية', labelEn: '🎁 Legendary item', rarity: 'legendary' },
];

export async function getWheelStatus(uid: string): Promise<{ canSpin: boolean; nextSpinAt: number | null; lastSpinAt: number | null; prizes: typeof WHEEL_PRIZES }> {
  const p = users.get(uid) as any;
  if (!p) return { canSpin: false, nextSpinAt: null, lastSpinAt: null, prizes: WHEEL_PRIZES };
  const last = p.wheelLastSpinAt || null;
  const cooldownMs = 24 * 60 * 60 * 1000;
  const nextAt = last ? last + cooldownMs : null;
  const canSpin = !last || (Date.now() >= last + cooldownMs);
  return { canSpin, nextSpinAt: nextAt, lastSpinAt: last, prizes: WHEEL_PRIZES };
}

export async function spinWheel(uid: string): Promise<{ ok: boolean; error?: string;
  prizeIndex?: number;
  prizeId?: string;
  coinsGranted?: number;
  itemGranted?: string;
  itemNameAr?: string;
  newCoinBalance?: number;
}> {
  const p = users.get(uid) as any;
  if (!p) return { ok: false, error: 'User not found' };
  const last = p.wheelLastSpinAt || 0;
  const cooldownMs = 24 * 60 * 60 * 1000;
  if (last && Date.now() < last + cooldownMs) {
    return { ok: false, error: 'Cooldown not finished' };
  }

  // Sample by cumulative weight
  const total = WHEEL_PRIZES.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  let prizeIndex = 0;
  for (let i = 0; i < WHEEL_PRIZES.length; i++) {
    r -= WHEEL_PRIZES[i].weight;
    if (r <= 0) { prizeIndex = i; break; }
  }
  const prize = WHEEL_PRIZES[prizeIndex];

  let coinsGranted = 0;
  let itemGranted: string | undefined;
  let itemNameAr: string | undefined;

  if (prize.kind === 'coins') {
    coinsGranted = prize.coins;
  } else {
    // 'item' — pick a random gold/legendary item they don't own. Fallback
    // to 10k coins if they own everything in that rarity.
    const owned: string[] = p.ownedItems || [];
    const candidates = STORE_ITEMS.filter(it =>
      (it.rarity === 'gold' || it.rarity === 'legendary') && !owned.includes(it.id)
    );
    if (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      itemGranted = pick.id;
      itemNameAr = pick.nameAr;
      p.ownedItems = [...owned, pick.id];
    } else {
      coinsGranted = 10000;
    }
  }

  if (coinsGranted > 0) p.coins = (p.coins || 0) + coinsGranted;
  p.wheelLastSpinAt = Date.now();
  saveUsers();

  return {
    ok: true, prizeIndex, prizeId: prize.id,
    coinsGranted, itemGranted, itemNameAr,
    newCoinBalance: p.coins,
  };
}

// ── Treasure Chests ───────────────────────────────────────────────────────
export async function openChest(uid: string, tier: ChestTier): Promise<{
  ok: boolean;
  error?: string;
  coins?: number;
  itemGranted?: string;
  itemNameAr?: string;
  itemRarity?: string;
  newKeyBalance?: number;
  newCoinBalance?: number;
}> {
  const p = users.get(uid) as any;
  if (!p) return { ok: false, error: 'User not found' };
  const def = CHESTS.find(c => c.tier === tier);
  if (!def) return { ok: false, error: 'Unknown chest' };
  const keys = p.keys || 0;
  if (keys < def.keyCost) return { ok: false, error: `Need ${def.keyCost} keys (you have ${keys})` };

  // Pay cost
  p.keys = keys - def.keyCost;

  // Roll coins
  const coins = Math.floor(def.minCoins + Math.random() * (def.maxCoins - def.minCoins + 1));
  p.coins = (p.coins || 0) + coins;

  // Roll item
  let itemGranted: string | undefined;
  let itemNameAr: string | undefined;
  let itemRarity: string | undefined;
  if (Math.random() < def.itemChance) {
    const owned: string[] = p.ownedItems || [];
    const candidates = STORE_ITEMS.filter(it =>
      def.itemRarities.includes(it.rarity as any) && !owned.includes(it.id)
    );
    if (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      p.ownedItems = [...owned, pick.id];
      itemGranted = pick.id;
      itemNameAr = pick.nameAr;
      itemRarity = pick.rarity;
    }
    // Fallback: if owned everything in tier, give bonus coins
    else {
      const bonus = Math.floor(def.minCoins * 1.5);
      p.coins += bonus;
    }
  }
  saveUsers();
  return {
    ok: true,
    coins, itemGranted, itemNameAr, itemRarity,
    newKeyBalance: p.keys, newCoinBalance: p.coins,
  };
}

export async function getChestStatus(uid: string): Promise<{ keys: number; chests: typeof CHESTS }> {
  const p = users.get(uid) as any;
  return { keys: p?.keys || 0, chests: CHESTS };
}

// ── Friend referral ───────────────────────────────────────────────────────
const REFERRAL_BONUS = 1000;

/** Returns the user's referral code, lazily generating one on first access. */
export async function getReferralCode(uid: string): Promise<string | null> {
  const p = users.get(uid) as any;
  if (!p) return null;
  if (!p.referralCode) {
    // Format: first 4 letters of displayName (transliterated to ASCII-ish) +
    // 4 random digits. Falls back to "PLAYER" if displayName is empty/Arabic.
    const base = (p.displayName || 'PLAYER')
      .toUpperCase()
      .replace(/[^A-Z]/g, '')   // strip non-Latin letters (Arabic)
      .slice(0, 4) || 'CHECK';
    let code: string;
    let attempts = 0;
    do {
      const digits = Math.floor(1000 + Math.random() * 9000);
      code = `${base}${digits}`;
      attempts++;
    } while (attempts < 10 && findUserByReferralCode(code));
    p.referralCode = code;
    saveUsers();
  }
  return p.referralCode;
}

function findUserByReferralCode(code: string): any | null {
  const want = code.toUpperCase();
  for (const u of users.values()) {
    if ((u as any).referralCode === want) return u;
  }
  return null;
}

/**
 * Redeem a friend's referral code. Both the redeemer and the inviter get
 * REFERRAL_BONUS coins. One-time per redeemer; cannot self-refer.
 */
export async function redeemReferral(redeemerUid: string, code: string): Promise<{ ok: boolean; error?: string; granted?: number; inviterUid?: string }> {
  const redeemer = users.get(redeemerUid) as any;
  if (!redeemer) return { ok: false, error: 'User not found' };
  if (redeemer.referredBy) return { ok: false, error: 'Already used a referral code' };
  const inviter = findUserByReferralCode(code.toUpperCase());
  if (!inviter)                       return { ok: false, error: 'Invalid code' };
  if (inviter.uid === redeemerUid)    return { ok: false, error: 'Cannot use your own code' };

  redeemer.referredBy = inviter.uid;
  redeemer.coins = (redeemer.coins || 0) + REFERRAL_BONUS;
  inviter.coins  = (inviter.coins  || 0) + REFERRAL_BONUS;
  inviter.referralsCount = ((inviter.referralsCount || 0) as number) + 1;
  saveUsers();
  return { ok: true, granted: REFERRAL_BONUS, inviterUid: inviter.uid };
}

/** Atomic coin deduction — fails (returns ok:false) if balance is insufficient. */
export async function deductCoins(uid: string, amount: number): Promise<{ ok: boolean; error?: string; coins?: number }> {
  const p = users.get(uid);
  if (!p) return { ok: false, error: 'User not found' };
  const cost = Math.max(0, Math.floor(amount));
  if ((p.coins || 0) < cost) return { ok: false, error: 'Not enough coins' };
  p.coins = (p.coins || 0) - cost;
  saveUsers();
  return { ok: true, coins: p.coins };
}

/** Ludo wallet — atomic deduction. Failure returns ok:false; never goes negative. */
export async function deductLudoCoins(uid: string, amount: number): Promise<{ ok: boolean; error?: string; ludoCoins?: number }> {
  const p: any = users.get(uid);
  if (!p) return { ok: false, error: 'User not found' };
  const cost = Math.max(0, Math.floor(amount));
  if ((p.ludoCoins || 0) < cost) return { ok: false, error: 'Not enough Ludo coins' };
  p.ludoCoins = (p.ludoCoins || 0) - cost;
  saveUsers();
  return { ok: true, ludoCoins: p.ludoCoins };
}

/** Direct Ludo-coin credit — used by Ludo tournament prizes. */
export async function grantLudoCoins(uid: string, amount: number): Promise<{ ok: boolean; ludoCoins?: number }> {
  const p: any = users.get(uid);
  if (!p) return { ok: false };
  p.ludoCoins = (p.ludoCoins || 0) + Math.max(0, Math.floor(amount));
  saveUsers();
  return { ok: true, ludoCoins: p.ludoCoins };
}

/** Update tournament-related stats on a profile. Idempotent-ish; merges with
 *  existing values. Used by the tournament engine when a cup finishes. */
export async function recordTournamentResult(uid: string, opts: {
  rank: number;       // final placement (1 = champion, 2 = runner-up, etc.)
  size: number;       // bracket size
  prize: number;      // coins awarded for this finish
}): Promise<void> {
  const p = users.get(uid) as any;
  if (!p) return;
  const stats = p.tournamentStats || { cupsWon: 0, podiums: 0, entered: 0, totalPrizeWon: 0, bestPrize: 0, lastCupAt: null };
  stats.entered      = (stats.entered || 0) + 1;
  if (opts.rank === 1)  { stats.cupsWon = (stats.cupsWon || 0) + 1; stats.lastCupAt = Date.now(); }
  if (opts.rank <= 3)   stats.podiums = (stats.podiums || 0) + 1;
  stats.totalPrizeWon  = (stats.totalPrizeWon || 0) + Math.max(0, opts.prize);
  stats.bestPrize      = Math.max(stats.bestPrize || 0, opts.prize);
  p.tournamentStats = stats;
  saveUsers();
}

/** Increment the entered counter without granting/recording a finish — used
 *  when a player joins a tournament so the stat reflects participation
 *  even if they don't make the podium. */
export async function recordTournamentEntered(uid: string): Promise<void> {
  const p = users.get(uid) as any;
  if (!p) return;
  const stats = p.tournamentStats || { cupsWon: 0, podiums: 0, entered: 0, totalPrizeWon: 0, bestPrize: 0, lastCupAt: null };
  stats.entered = (stats.entered || 0) + 1;
  p.tournamentStats = stats;
  saveUsers();
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

// 30-day calendar. Coins escalate each day; every 7th day flips to a
// milestone reward (frame, character, gem pack). Day 30 is the big one.
// Server picks the cosmetic IDs from items the user might not already own;
// the client just renders { coins, frame, kind, label } per day.
type DailyRewardItem = {
  coins: number;
  frame?: string | null;
  // 'milestone' marks the every-7-days rewards so the client can render
  // them with a different visual treatment.
  kind?: 'normal' | 'milestone' | 'grand';
  /** Optional one-time character grant on the legendary day. */
  characterId?: string;
  /** Bonus gems on milestone days. */
  gems?: number;
};

const DAILY_REWARDS: DailyRewardItem[] = [
  // Week 1 — gentle ramp + first frame on day 7
  { coins: 100,  kind: 'normal' },
  { coins: 200,  kind: 'normal' },
  { coins: 300,  kind: 'normal' },
  { coins: 400,  kind: 'normal' },
  { coins: 500,  kind: 'normal' },
  { coins: 600,  kind: 'normal' },
  { coins: 800,  frame: 'frame_desert', kind: 'milestone' },     // day 7

  // Week 2 — bigger pots + chest key on day 14 (gems stand-in)
  { coins: 700,  kind: 'normal' },
  { coins: 800,  kind: 'normal' },
  { coins: 900,  kind: 'normal' },
  { coins: 1000, kind: 'normal' },
  { coins: 1100, kind: 'normal' },
  { coins: 1200, kind: 'normal' },
  { coins: 1500, gems: 25, kind: 'milestone' },                  // day 14

  // Week 3 — silver-tier frame on day 21
  { coins: 1300, kind: 'normal' },
  { coins: 1400, kind: 'normal' },
  { coins: 1500, kind: 'normal' },
  { coins: 1600, kind: 'normal' },
  { coins: 1700, kind: 'normal' },
  { coins: 1800, kind: 'normal' },
  { coins: 2200, frame: 'frame_pearl', gems: 50, kind: 'milestone' },  // day 21

  // Week 4 — push to the legendary
  { coins: 2000, kind: 'normal' },
  { coins: 2200, kind: 'normal' },
  { coins: 2400, kind: 'normal' },
  { coins: 2600, kind: 'normal' },
  { coins: 2800, kind: 'normal' },
  { coins: 3000, kind: 'normal' },

  // Days 28-30 — finale
  { coins: 3500, gems: 100, kind: 'milestone' },                 // day 28
  { coins: 4500, kind: 'normal' },
  { coins: 7500, frame: 'frame_sultan', characterId: 'avatar_28', gems: 250, kind: 'grand' }, // day 30
];

function dayKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

// Cost of rescuing a broken streak with gems. Only applies when exactly
// one day was missed — anything wider and the player has to start over.
export const STREAK_FREEZE_COST = 50;

export async function getDailyReward(uid: string): Promise<{
  day: number;
  canClaim: boolean;
  lastClaimDay: string | null;
  rewards: typeof DAILY_REWARDS;
  streak: number;
  longestStreak: number;
  /** Streak that can still be rescued by paying STREAK_FREEZE_COST gems. */
  recoverableStreak: number;
  freezeCost: number;
}> {
  const p = users.get(uid) as any;
  if (!p) {
    return {
      day: 0, canClaim: false, lastClaimDay: null, rewards: DAILY_REWARDS,
      streak: 0, longestStreak: 0, recoverableStreak: 0, freezeCost: STREAK_FREEZE_COST,
    };
  }
  const today = dayKey();
  const yesterday = previousDayKey();
  const dayBefore = previousDayKey(2);
  const lastClaimDay: string | null = p.dailyLastClaimDay || null;
  let dayIdx: number = p.dailyDayIndex ?? 0;
  let streak: number = p.dailyStreak ?? 0;
  let recoverableStreak = 0;
  // If we missed a day, the streak resets the next time we look.
  if (lastClaimDay && lastClaimDay !== today && lastClaimDay !== yesterday) {
    // Offer a freeze ONLY when exactly one day was missed and the player
    // had something worth saving (>=2 day streak — saving a 1-day streak
    // for 50 gems is a bad deal we shouldn't let them make).
    if (lastClaimDay === dayBefore && streak >= 2) {
      recoverableStreak = streak;
    }
    dayIdx = 0;
    streak = 0;
  }
  const canClaim = lastClaimDay !== today;
  return {
    day: dayIdx,
    canClaim,
    lastClaimDay,
    rewards: DAILY_REWARDS,
    streak,
    longestStreak: p.dailyLongestStreak ?? streak,
    recoverableStreak,
    freezeCost: STREAK_FREEZE_COST,
  };
}

export async function freezeStreak(uid: string): Promise<{
  ok: boolean;
  error?: string;
  streak?: number;
  gems?: number;
}> {
  const p = users.get(uid) as any;
  if (!p) return { ok: false, error: 'User not found' };
  const today = dayKey();
  const yesterday = previousDayKey();
  const dayBefore = previousDayKey(2);
  const lastClaimDay: string | null = p.dailyLastClaimDay || null;
  const streak: number = p.dailyStreak ?? 0;

  if (!lastClaimDay) return { ok: false, error: 'No streak to save' };
  if (lastClaimDay === today || lastClaimDay === yesterday) {
    return { ok: false, error: 'Streak is already safe' };
  }
  if (lastClaimDay !== dayBefore) {
    return { ok: false, error: 'Streak is too old to recover' };
  }
  if (streak < 2) return { ok: false, error: 'No streak to save' };
  if ((p.gems || 0) < STREAK_FREEZE_COST) {
    return { ok: false, error: 'Not enough gems' };
  }

  p.gems = (p.gems || 0) - STREAK_FREEZE_COST;
  // Pretend the player claimed yesterday — storage keeps dailyStreak and
  // dailyDayIndex intact, so the next claim continues from where they left
  // off.
  p.dailyLastClaimDay = yesterday;
  saveUsers();
  return { ok: true, streak, gems: p.gems };
}

export async function claimDailyReward(uid: string): Promise<{
  ok: boolean;
  error?: string;
  coins?: number;
  granted?: DailyRewardItem;
  nextDay?: number;
  streak?: number;
  longestStreak?: number;
}> {
  const p = users.get(uid) as any;
  if (!p) return { ok: false, error: 'User not found' };
  const today = dayKey();
  const yesterday = previousDayKey();
  if (p.dailyLastClaimDay === today) return { ok: false, error: 'Already claimed today' };

  let dayIdx: number = p.dailyDayIndex ?? 0;
  let streak: number = p.dailyStreak ?? 0;
  // Streak only continues if we claimed yesterday. Anything else resets.
  if (!p.dailyLastClaimDay || p.dailyLastClaimDay !== yesterday) {
    dayIdx = 0;
    streak = 0;
  }
  if (dayIdx >= DAILY_REWARDS.length) dayIdx = 0;
  const reward = DAILY_REWARDS[dayIdx];

  // Coins
  p.coins = (p.coins || 0) + reward.coins;
  // Frame (avatar) — only granted once
  if (reward.frame) {
    const owned: string[] = p.ownedItems || [];
    if (!owned.includes(reward.frame)) p.ownedItems = [...owned, reward.frame];
  }
  // Gems on milestone days
  if (reward.gems) {
    p.gems = (p.gems || 0) + reward.gems;
  }
  // Character grant on the grand finale
  if (reward.characterId) {
    const owned: string[] = p.ownedItems || [];
    if (!owned.includes(reward.characterId)) p.ownedItems = [...owned, reward.characterId];
  }

  // Streak bookkeeping
  streak += 1;
  p.dailyStreak = streak;
  if (streak > (p.dailyLongestStreak ?? 0)) p.dailyLongestStreak = streak;

  p.dailyLastClaimDay = today;
  // After day 30, loop back to day 0 — the streak keeps counting upward
  // even past 30 (so 'longest streak' can show 60+).
  p.dailyDayIndex = (dayIdx + 1) % DAILY_REWARDS.length;

  saveUsers();
  return {
    ok: true,
    coins: p.coins,
    granted: reward,
    nextDay: p.dailyDayIndex,
    streak,
    longestStreak: p.dailyLongestStreak,
  };
}

function previousDayKey(offset = 1): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - offset);
  return dayKey(d);
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
