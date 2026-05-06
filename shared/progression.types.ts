// ── Progression: levels, daily missions, achievements ─────────────────────────
// Single source of truth for everything XP / level / missions / achievements
// related. The server rolls daily missions and tracks claims against this;
// the client renders progress against this.

// ── Level curve ──────────────────────────────────────────────────────────────
// Total XP needed to *reach* level L. Curve is gentle early then steepens, so
// the first ~10 levels feel fast and 30+ stays a long-term goal.
//   L2: 100   L3: 300   L4: 600   L5: 1000   L10: 4500   L20: 19000   L50: 122500
export function xpToReach(level: number): number {
  if (level <= 1) return 0;
  return 50 * level * (level - 1);
}

/** Given lifetime XP, return current level + progress within the current level. */
export function deriveLevel(xp: number): {
  level: number;
  xpInLevel: number;       // XP earned past the start of current level
  xpForNextLevel: number;  // XP needed to climb one more level
  pct: number;             // 0..1 progress in current level
} {
  let level = 1;
  while (xpToReach(level + 1) <= xp && level < 200) level++;
  const start = xpToReach(level);
  const next  = xpToReach(level + 1);
  const xpInLevel = xp - start;
  const xpForNextLevel = next - start;
  return {
    level,
    xpInLevel,
    xpForNextLevel,
    pct: xpForNextLevel > 0 ? xpInLevel / xpForNextLevel : 1,
  };
}

// ── Per-level rewards (claimed once when reached) ────────────────────────────
export interface LevelReward {
  level: number;
  rewardCoins: number;
  rewardItemId?: string;        // item granted (optional)
  rewardItemNameAr?: string;    // human label for the item
  rewardItemNameEn?: string;
}

export const LEVEL_REWARDS: LevelReward[] = [
  { level: 2,  rewardCoins: 150 },
  { level: 3,  rewardCoins: 250 },
  { level: 4,  rewardCoins: 350 },
  { level: 5,  rewardCoins: 600,   rewardItemId: 'frame_desert',  rewardItemNameAr: 'إطار الصحراء',  rewardItemNameEn: 'Desert Frame' },
  { level: 7,  rewardCoins: 800 },
  { level: 10, rewardCoins: 1500,  rewardItemId: 'card_arabian',  rewardItemNameAr: 'كرت عربي',      rewardItemNameEn: 'Arabian Cards' },
  { level: 12, rewardCoins: 1800 },
  { level: 15, rewardCoins: 2500,  rewardItemId: 'avatar_5',      rewardItemNameAr: 'صياد الليل',    rewardItemNameEn: 'Night Hunter' },
  { level: 18, rewardCoins: 3000 },
  { level: 20, rewardCoins: 5000,  rewardItemId: 'frame_sultan',  rewardItemNameAr: 'إطار السلطان',  rewardItemNameEn: 'Sultan Frame' },
  { level: 25, rewardCoins: 7500 },
  { level: 30, rewardCoins: 10000, rewardItemId: 'board_royal',   rewardItemNameAr: 'طاولة ملكية',   rewardItemNameEn: 'Royal Table' },
  { level: 35, rewardCoins: 15000 },
  { level: 40, rewardCoins: 25000, rewardItemId: 'frame_royal',   rewardItemNameAr: 'إطار التاج',    rewardItemNameEn: 'Crown Frame' },
  { level: 45, rewardCoins: 35000 },
  { level: 50, rewardCoins: 60000, rewardItemId: 'card_galaxy',   rewardItemNameAr: 'كرت المجرّة',   rewardItemNameEn: 'Galaxy Cards' },
];

// ── Daily missions ───────────────────────────────────────────────────────────
// Mission types map directly to events the server emits at the end of a match.
//   'play'   — bumped +1 every game played
//   'win'    — bumped +1 every game won
//   'streak' — set to max(current, currentStreak) every win (snapshot of streak)
export type MissionType = 'play' | 'win' | 'streak';

export interface MissionDef {
  id: string;
  type: MissionType;
  target: number;
  rewardCoins: number;
  labelAr: string;
  labelEn: string;
  emoji: string;
}

export const MISSION_POOL: MissionDef[] = [
  { id: 'm_play_3',   type: 'play',   target: 3, rewardCoins: 200,  emoji: '🎮', labelAr: 'العب 3 مباريات',          labelEn: 'Play 3 matches' },
  { id: 'm_play_5',   type: 'play',   target: 5, rewardCoins: 400,  emoji: '🎮', labelAr: 'العب 5 مباريات',          labelEn: 'Play 5 matches' },
  { id: 'm_play_8',   type: 'play',   target: 8, rewardCoins: 700,  emoji: '🎮', labelAr: 'العب 8 مباريات',          labelEn: 'Play 8 matches' },
  { id: 'm_win_1',    type: 'win',    target: 1, rewardCoins: 300,  emoji: '🏆', labelAr: 'اكسب مباراة واحدة',        labelEn: 'Win 1 match' },
  { id: 'm_win_2',    type: 'win',    target: 2, rewardCoins: 600,  emoji: '🏆', labelAr: 'اكسب مباراتين',            labelEn: 'Win 2 matches' },
  { id: 'm_win_3',    type: 'win',    target: 3, rewardCoins: 1000, emoji: '🏆', labelAr: 'اكسب 3 مباريات',           labelEn: 'Win 3 matches' },
  { id: 'm_streak_2', type: 'streak', target: 2, rewardCoins: 500,  emoji: '🔥', labelAr: 'اكسب مباراتين متتاليتين',  labelEn: 'Win 2 in a row' },
  { id: 'm_streak_3', type: 'streak', target: 3, rewardCoins: 900,  emoji: '🔥', labelAr: 'اكسب 3 مباريات متتالية',   labelEn: 'Win 3 in a row' },
];

export const DAILY_MISSION_COUNT = 3;

export interface PlayerMission {
  id: string;
  progress: number;
  claimed: boolean;
}

export interface DailyMissionsState {
  date: string;             // 'YYYY-MM-DD' (UTC)
  missions: PlayerMission[];
}

// Deterministic mission roll — same uid + same date always returns the same
// 3 missions, even after server restarts. Lets the client refresh safely.
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function rollDailyMissions(uid: string, date: string): PlayerMission[] {
  const h = hashStr(uid + ':' + date);
  const pool = MISSION_POOL.slice();
  const picked: MissionDef[] = [];
  for (let i = 0; i < DAILY_MISSION_COUNT && pool.length > 0; i++) {
    const idx = (h + i * 31 + (i * i * 7)) % pool.length;
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked.map(m => ({ id: m.id, progress: 0, claimed: false }));
}

// ── Achievements (lifetime, one-time claim) ──────────────────────────────────
// Tracked against a stat path on the user profile. The server reads the stat,
// compares to target, and lets the user claim if reached.
export type AchievementStat =
  | 'totalGames' | 'totalWins' | 'currentStreak'
  | 'checkWins' | 'level';

export interface AchievementDef {
  id: string;
  stat: AchievementStat;
  target: number;
  rewardCoins: number;
  labelAr: string;
  labelEn: string;
  descAr: string;
  descEn: string;
  emoji: string;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // Wins
  { id: 'a_first_win',  stat: 'totalWins',     target: 1,   rewardCoins: 200,   emoji: '🥇', labelAr: 'الفوز الأول',        labelEn: 'First Win',         descAr: 'اكسب أول مباراة',          descEn: 'Win your first match' },
  { id: 'a_wins_10',    stat: 'totalWins',     target: 10,  rewardCoins: 800,   emoji: '🏆', labelAr: 'بطل ناشئ',            labelEn: 'Rising Champion',   descAr: 'اكسب 10 مباريات',          descEn: 'Win 10 matches' },
  { id: 'a_wins_50',    stat: 'totalWins',     target: 50,  rewardCoins: 3000,  emoji: '👑', labelAr: 'بطل محترف',           labelEn: 'Pro Champion',      descAr: 'اكسب 50 مباراة',           descEn: 'Win 50 matches' },
  { id: 'a_wins_100',   stat: 'totalWins',     target: 100, rewardCoins: 7500,  emoji: '💎', labelAr: 'أسطورة',              labelEn: 'Legend',            descAr: 'اكسب 100 مباراة',          descEn: 'Win 100 matches' },
  { id: 'a_wins_500',   stat: 'totalWins',     target: 500, rewardCoins: 40000, emoji: '⭐', labelAr: 'سيد العرش',           labelEn: 'Throne Master',     descAr: 'اكسب 500 مباراة',          descEn: 'Win 500 matches' },
  // Games played
  { id: 'a_play_10',    stat: 'totalGames',    target: 10,  rewardCoins: 300,   emoji: '🎮', labelAr: 'مولع باللعبة',        labelEn: 'Hooked',            descAr: 'العب 10 مباريات',          descEn: 'Play 10 matches' },
  { id: 'a_play_50',    stat: 'totalGames',    target: 50,  rewardCoins: 1500,  emoji: '🎯', labelAr: 'مدمن جلسات',          labelEn: 'Regular',           descAr: 'العب 50 مباراة',           descEn: 'Play 50 matches' },
  { id: 'a_play_200',   stat: 'totalGames',    target: 200, rewardCoins: 5000,  emoji: '🃏', labelAr: 'لاعب متمرس',          labelEn: 'Veteran',           descAr: 'العب 200 مباراة',          descEn: 'Play 200 matches' },
  { id: 'a_play_1000',  stat: 'totalGames',    target: 1000, rewardCoins: 25000, emoji: '🎲', labelAr: 'موسوعة الكروت',     labelEn: 'Card Encyclopedia', descAr: 'العب 1000 مباراة',         descEn: 'Play 1000 matches' },
  // Streaks
  { id: 'a_streak_3',   stat: 'currentStreak', target: 3,   rewardCoins: 600,   emoji: '🔥', labelAr: 'حار',                  labelEn: 'On Fire',           descAr: 'اكسب 3 مباريات متتالية',   descEn: 'Win 3 in a row' },
  { id: 'a_streak_5',   stat: 'currentStreak', target: 5,   rewardCoins: 1500,  emoji: '🔥', labelAr: 'متوهّج',              labelEn: 'Blazing',           descAr: 'اكسب 5 مباريات متتالية',   descEn: 'Win 5 in a row' },
  { id: 'a_streak_10',  stat: 'currentStreak', target: 10,  rewardCoins: 5000,  emoji: '☄️', labelAr: 'لا يُهزم',             labelEn: 'Untouchable',       descAr: 'اكسب 10 مباريات متتالية',  descEn: 'Win 10 in a row' },
  // Levels
  { id: 'a_level_5',    stat: 'level',         target: 5,   rewardCoins: 500,   emoji: '⬆️', labelAr: 'بداية الرحلة',        labelEn: 'Climbing',          descAr: 'وصلت لمستوى 5',            descEn: 'Reach level 5' },
  { id: 'a_level_10',   stat: 'level',         target: 10,  rewardCoins: 1500,  emoji: '⬆️', labelAr: 'صاعد',                 labelEn: 'On the Rise',       descAr: 'وصلت لمستوى 10',           descEn: 'Reach level 10' },
  { id: 'a_level_25',   stat: 'level',         target: 25,  rewardCoins: 7500,  emoji: '🎖️', labelAr: 'محترف',                labelEn: 'Pro',               descAr: 'وصلت لمستوى 25',           descEn: 'Reach level 25' },
  { id: 'a_level_50',   stat: 'level',         target: 50,  rewardCoins: 30000, emoji: '🌟', labelAr: 'أسطوري',               labelEn: 'Legendary',         descAr: 'وصلت لمستوى 50',           descEn: 'Reach level 50' },
];
