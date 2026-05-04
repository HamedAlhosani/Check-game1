import { UserProfile, LeaderboardEntry, GameType, MatchRecord } from '@check-game/shared';
import { STORE_ITEMS, FREE_ITEMS, DEFAULT_EQUIPPED } from '@check-game/shared';
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

export function getLevelFromXp(xp: number): { level: number; title: string } {
  const level = Math.min(Math.floor(xp / 200) + 1, LEVEL_TITLES.length);
  return { level, title: LEVEL_TITLES[level - 1] };
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

function findUserByUsername(username: string): any | null {
  for (const [, u] of users) {
    if (u.username && u.username.toLowerCase() === username.toLowerCase()) return u;
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
  const { level, title } = getLevelFromXp(newXp);

  stats.totalGames += 1;
  stats.totalWins += isWinner ? 1 : 0;
  stats.currentStreak = isWinner ? stats.currentStreak + 1 : 0;
  if (isWinner) (stats as any)[`${gameType}Wins`] = ((stats as any)[`${gameType}Wins`] || 0) + 1;

  p.stats = stats;
  p.ranking = { level, xp: newXp, title };
  p.coins = (p.coins || 0) + coinsGain;
  saveUsers();

  updateLeaderboard(uid, p as UserProfile);
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

export async function sendFriendRequest(fromUid: string, toUsername: string): Promise<{ ok: boolean; error?: string }> {
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
    return { ok: true };
  }

  to.friendRequests.push(fromUid);
  saveUsers();
  return { ok: true };
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
    return { uid: f.uid, displayName: f.displayName, username: f.username || '', avatarId: f.avatarId, level: f.ranking?.level ?? 1, wins: f.stats?.totalWins ?? 0 };
  }).filter(Boolean);
}

export async function getFriendRequests(uid: string): Promise<any[]> {
  const me = users.get(uid);
  if (!me || !me.friendRequests) return [];
  return (me.friendRequests as string[]).map((fUid: string) => {
    const f = users.get(fUid);
    if (!f) return null;
    return { uid: f.uid, displayName: f.displayName, username: f.username || '', avatarId: f.avatarId, level: f.ranking?.level ?? 1 };
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
