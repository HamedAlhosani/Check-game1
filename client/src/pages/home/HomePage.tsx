import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SOCKET_EVENTS, RoomState, GameType } from '@check-game/shared';
import { socketService } from '../../services/socket.service';
import { useAuthStore } from '../../store/authStore';
import { useLobbyStore } from '../../store/lobbyStore';
import { useUiStore } from '../../store/uiStore';
import { WaitingRoom } from '../../components/lobby/WaitingRoom';
import { JoinPrivateModal } from '../../components/lobby/JoinPrivateModal';
import { soundService } from '../../services/sound.service';
import { useT, useLang } from '../../i18n/useT';
import { LangToggle } from '../../components/shared/LangToggle';
import { DailyRewardModal } from '../../components/shared/DailyRewardModal';
import { RulesModal } from '../../components/shared/RulesModal';
import { ProgressionModal } from '../../components/shared/ProgressionModal';
import { useTournamentStore } from '../../store/tournamentStore';
import { deriveLevel } from '@check-game/shared';
import type { GameMode as MatchLength, TournamentState } from '@check-game/shared';
import { ELIMINATION_SCORE } from '@check-game/shared';
import { FrameRing } from '../../components/shared/FrameRing';
import { apiClient } from '../../services/api.service';

type GameMode = 'online' | 'private' | 'bots';

function DailyRewardNavButton({ onOpen, lang }: { onOpen: () => void; lang: string }) {
  const [canClaim, setCanClaim] = useState<boolean | null>(null);
  useEffect(() => {
    apiClient.get<{ canClaim: boolean }>('/api/daily/status').then(r => setCanClaim(r.canClaim)).catch(() => setCanClaim(false));
  }, []);
  return (
    <motion.button
      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
      onClick={onOpen}
      className="relative rounded-xl flex items-center justify-center"
      title={lang === 'ar' ? 'الهدية اليومية' : 'Daily Reward'}
      style={{
        width: 36,
        height: 34,
        background: canClaim ? 'rgba(201,168,76,0.18)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${canClaim ? 'rgba(201,168,76,0.55)' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: canClaim ? '0 0 14px rgba(201,168,76,0.35)' : 'none',
        cursor: 'pointer',
      }}>
      <span style={{ fontSize: 18, lineHeight: 1 }}>{canClaim ? '🎁' : '📦'}</span>
      {canClaim && (
        <span className="absolute rounded-full animate-pulse"
          style={{ top: -3, right: -3, width: 9, height: 9, background: '#E04030', border: '1.5px solid #14100A' }} />
      )}
    </motion.button>
  );
}

// Full-width strip below the XP bar — shows mission progress + claim count,
// taps to open the ProgressionModal. Re-fetches whenever any user activity
// (xp, wins, games, streak) changes so a finished mission lights up at once.
function MissionsStrip({ onOpen, lang, profileXp, profileWins, profileGames, profileStreak }: {
  onOpen: () => void;
  lang: string;
  profileXp: number; profileWins: number; profileGames: number; profileStreak: number;
}) {
  const [stats, setStats] = useState<{ done: number; total: number; claimable: number } | null>(null);
  useEffect(() => {
    apiClient.get<{
      missions: { items: { complete: boolean; claimed: boolean }[] };
      achievements: { complete: boolean; claimed: boolean }[];
      levelRewards: { reached: boolean; claimed: boolean }[];
    }>('/api/progression').then(r => {
      const total = r.missions.items.length;
      const done = r.missions.items.filter(m => m.complete).length;
      const claimable =
        r.missions.items.filter(m => m.complete && !m.claimed).length +
        r.achievements.filter(x => x.complete && !x.claimed).length +
        r.levelRewards.filter(x => x.reached && !x.claimed).length;
      setStats({ done, total, claimable });
    }).catch(() => setStats({ done: 0, total: 3, claimable: 0 }));
  }, [profileXp, profileWins, profileGames, profileStreak]);

  const claimable = stats?.claimable ?? 0;
  const done = stats?.done ?? 0;
  const total = stats?.total ?? 3;
  const hot = claimable > 0;

  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={onOpen}
      className="w-full mt-3 rounded-xl flex items-center gap-3 px-3 py-2.5 transition-all"
      style={{
        background: hot
          ? 'linear-gradient(90deg, rgba(201,168,76,0.18) 0%, rgba(201,168,76,0.08) 100%)'
          : 'linear-gradient(90deg, rgba(201,168,76,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        border: `1px solid ${hot ? 'rgba(201,168,76,0.55)' : 'rgba(201,168,76,0.18)'}`,
        boxShadow: hot ? '0 0 16px rgba(201,168,76,0.30)' : 'none',
        cursor: 'pointer',
      }}>
      {/* Icon */}
      <div className="rounded-lg flex items-center justify-center shrink-0"
        style={{
          width: 32, height: 32,
          background: hot ? 'rgba(201,168,76,0.25)' : 'rgba(0,0,0,0.20)',
          border: '1px solid rgba(201,168,76,0.25)',
          fontSize: 18,
        }}>🎯</div>

      {/* Title + progress */}
      <div className="flex-1 min-w-0 text-start">
        <div className="font-arabic font-bold flex items-center gap-2"
          style={{ fontSize: 12.5, color: hot ? '#E8C97A' : 'rgba(232,201,122,0.85)' }}>
          {lang === 'ar' ? 'المهام والإنجازات' : 'Missions & Achievements'}
          {claimable > 0 && (
            <motion.span
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              className="rounded-full font-bold"
              style={{
                background: '#E04030', color: '#fff',
                fontSize: 10, lineHeight: '16px',
                minWidth: 18, height: 16, padding: '0 5px',
              }}>
              {claimable} {lang === 'ar' ? 'جاهزة' : 'ready'}
            </motion.span>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          {/* Mini progress bar for daily missions */}
          <div className="flex-1" style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{
              width: `${(done / Math.max(1, total)) * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #8B6914, #E8C97A)',
              transition: 'width .35s ease',
            }}/>
          </div>
          <span className="font-mono shrink-0"
            style={{ fontSize: 9.5, color: 'rgba(245,230,200,0.5)' }}>
            {done}/{total} {lang === 'ar' ? 'مهام اليوم' : 'today'}
          </span>
        </div>
      </div>

      {/* Chevron */}
      <span className="shrink-0" style={{
        fontSize: 16, color: hot ? '#E8C97A' : 'rgba(245,230,200,0.45)',
      }}>{lang === 'ar' ? '‹' : '›'}</span>
    </motion.button>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
const AV_COLORS = ['#C9A84C','#4A90D9','#50C878','#E74C3C','#9B59B6','#E67E22','#1ABC9C','#E91E63'];
const HOME_AVATAR_EMOJIS: Record<string, string> = {
  avatar_1: '👳', avatar_2: '🧕', avatar_3: '👴', avatar_4: '🧔',
  avatar_5: '👩', avatar_6: '👨', avatar_7: '🧑', avatar_8: '👵',
  avatar_9: '🕌', avatar_10: '🏙️', avatar_11: '💎', avatar_12: '🌟',
};
function AvatarCircle({ id, name, size = 40, frameId }: { id: string; name: string; size?: number; frameId?: string }) {
  const i = parseInt(id?.replace(/\D/g, '') || '1', 10) - 1;
  const emoji = HOME_AVATAR_EMOJIS[id];
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="rounded-full flex items-center justify-center font-bold text-white"
        style={{ width: size, height: size, background: AV_COLORS[i % AV_COLORS.length], fontSize: emoji ? size * 0.52 : size * 0.36 }}>
        {emoji || name?.slice(0, 2) || '?'}
      </div>
      <FrameRing frameId={frameId} size={size}/>
    </div>
  );
}

// ── Level title ────────────────────────────────────────────────────────────────
const TITLES_AR = ['مبتدئ الصحراء','مسافر الرمال','فارس النخيل','حارس الواحة','سيد الورق',
                   'بطل الإمارات','شيخ اللعبة','أمير الطاولة','سلطان الأوراق','سلطان الرياح'];
const TITLES_EN = ['Desert Beginner','Sand Traveler','Palm Knight','Oasis Guard','Card Master',
                   'UAE Champion','Game Sheikh','Table Prince','Card Sultan','Wind Sultan'];
function levelTitle(level: number, lang: string) {
  const t = lang === 'ar' ? TITLES_AR : TITLES_EN;
  return t[Math.min(level - 1, t.length - 1)] || t[0];
}

// ── XP bar ────────────────────────────────────────────────────────────────────
function XpBar({ xp, lang, onClick }: { xp: number; lang?: string; onClick?: () => void }) {
  const { xpInLevel, xpForNextLevel } = deriveLevel(xp);
  const pct = Math.min(100, (xpInLevel / Math.max(1, xpForNextLevel)) * 100);
  return (
    <div onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
      }}>
      <div style={{ height: 6, borderRadius: 4, background: 'rgba(201,168,76,0.12)', overflow: 'hidden', width: '100%', border: '1px solid rgba(201,168,76,0.15)' }}>
        <div style={{ width: `${Math.max(2, pct)}%`, height: '100%', background: 'linear-gradient(90deg, #8B6914, #E8C97A, #FFE07A)', borderRadius: 4, transition: 'width .5s ease', boxShadow: '0 0 8px rgba(232,201,122,0.5)' }}/>
      </div>
      <span className="font-mono"
        style={{
          fontSize: 9, color: 'rgba(245,230,200,0.5)',
          marginTop: 2, display: 'block',
        }}>
        {xpInLevel.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP
        {onClick && <span style={{ marginInlineStart: 6, color: 'rgba(201,168,76,0.6)' }}>
          · {lang === 'ar' ? 'اضغط للتقدم' : 'tap for progress'}
        </span>}
      </span>
    </div>
  );
}

// ── Mode themes (rich, card-game inspired) ───────────────────────────────────
type ModeTheme = {
  bg1: string; bg2: string; accent: string; glow: string; suit: string;
  rank: string;   // big watermark "rank" letter
  label: { ar: string; en: string };
  tagline: { ar: string; en: string };
  icon: string;
};
const MODE_THEMES: Record<GameMode, ModeTheme> = {
  // Aurora teal — feels global / live / connected
  online:  { bg1: '#0F4C5C', bg2: '#04181E', accent: '#5EEAD4', glow: 'rgba(94,234,212,0.6)',  suit: '♠', rank: 'O', icon: '🌍',
             label: { ar: 'أونلاين',  en: 'Online'  }, tagline: { ar: 'العب مع لاعبين حول العالم', en: 'Worldwide players' } },
  // Imperial violet — exclusive, royal
  private: { bg1: '#4C1D95', bg2: '#170435', accent: '#C495FF', glow: 'rgba(196,149,255,0.55)', suit: '♥', rank: 'P', icon: '🔒',
             label: { ar: 'غرفة خاصة', en: 'Private' }, tagline: { ar: 'غرفة لك ولأصدقائك',         en: 'Just you and friends' } },
  // Phoenix amber — warm / arena / training fire
  bots:    { bg1: '#6B2D0E', bg2: '#1F0905', accent: '#FCA85B', glow: 'rgba(252,168,91,0.55)',  suit: '♣', rank: 'B', icon: '🤖',
             label: { ar: 'بوتات',    en: 'Bots'    }, tagline: { ar: 'تدرب أو تحدى البوتات',        en: 'Train or duel bots' } },
};

// ── Tiny mode chip-switcher used INSIDE the giant card ───────────────────────
function ModeChips({ mode, onSelect, lang }: { mode: GameMode; onSelect: (m: GameMode) => void; lang: string }) {
  const order: GameMode[] = ['online', 'private', 'bots'];
  return (
    <div className="flex gap-2 justify-center">
      {order.map(m => {
        const isSel = mode === m; const t = MODE_THEMES[m];
        return (
          <motion.button key={m} whileTap={{ scale: 0.92 }} onClick={() => { onSelect(m); soundService.playClick(); }}
            className="rounded-full font-arabic font-bold flex items-center gap-1.5"
            style={{
              padding: isSel ? '6px 14px' : '5px 11px',
              background: isSel ? `${t.accent}` : 'rgba(255,255,255,0.07)',
              color: isSel ? '#0E0905' : 'rgba(245,230,200,0.7)',
              border: `1.5px solid ${isSel ? t.accent : 'rgba(255,255,255,0.12)'}`,
              boxShadow: isSel ? `0 0 16px ${t.glow}` : 'none',
              fontSize: 11, transition: 'all .2s', cursor: 'pointer',
            }}>
            <span style={{ fontSize: 13 }}>{t.icon}</span>
            {t.label[lang === 'ar' ? 'ar' : 'en']}
          </motion.button>
        );
      })}
    </div>
  );
}

// ── Avatar stepper: − [4 / 10  👤👤👤👤·····] + ──────────────────────────────
const SEAT_COLORS = ['#C9A84C','#4A90D9','#50C878','#E74C3C','#9B59B6','#E67E22','#1ABC9C','#E91E63','#3DB7B7','#FF6B7A'];
function PlayerStepper({ value, onChange, min, max, accent, lang, label }: {
  value: number; onChange: (n: number) => void; min: number; max: number;
  accent: string; lang: string; label: string;
}) {
  const dec = () => { if (value > min) { onChange(value - 1); soundService.playClick(); } };
  const inc = () => { if (value < max) { onChange(value + 1); soundService.playClick(); } };
  return (
    <div className="w-full flex flex-col items-center gap-3">
      <span className="font-arabic" style={{ fontSize: 12, color: 'rgba(245,230,200,0.55)' }}>{label}</span>

      {/* Stepper row */}
      <div className="flex items-center gap-3 w-full" style={{ maxWidth: 280 }}>
        <motion.button whileTap={{ scale: 0.88 }} onClick={dec}
          disabled={value <= min}
          className="rounded-2xl flex items-center justify-center font-bold shrink-0"
          style={{
            width: 52, height: 52,
            background: value > min ? `${accent}26` : 'rgba(255,255,255,0.04)',
            color: value > min ? accent : 'rgba(255,255,255,0.2)',
            border: `2px solid ${value > min ? `${accent}66` : 'rgba(255,255,255,0.08)'}`,
            fontSize: 28, cursor: value > min ? 'pointer' : 'not-allowed',
            boxShadow: value > min ? `0 0 14px ${accent}33` : 'none',
          }}>−</motion.button>

        {/* Center number */}
        <div className="flex-1 flex flex-col items-center rounded-2xl py-2"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${accent}1F 0%, transparent 70%)`,
            border: `1px solid ${accent}44`,
          }}>
          <motion.span key={value}
            initial={{ scale: 0.6, opacity: 0, y: -6 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 20 }}
            className="font-bold font-mono leading-none"
            style={{ fontSize: 44, color: accent, textShadow: `0 0 18px ${accent}AA` }}>
            {value}
          </motion.span>
          <span className="font-arabic" style={{ fontSize: 10, color: 'rgba(245,230,200,0.4)', marginTop: 2 }}>
            {lang === 'ar' ? `من ${max}` : `of ${max}`}
          </span>
        </div>

        <motion.button whileTap={{ scale: 0.88 }} onClick={inc}
          disabled={value >= max}
          className="rounded-2xl flex items-center justify-center font-bold shrink-0"
          style={{
            width: 52, height: 52,
            background: value < max ? `${accent}26` : 'rgba(255,255,255,0.04)',
            color: value < max ? accent : 'rgba(255,255,255,0.2)',
            border: `2px solid ${value < max ? `${accent}66` : 'rgba(255,255,255,0.08)'}`,
            fontSize: 28, cursor: value < max ? 'pointer' : 'not-allowed',
            boxShadow: value < max ? `0 0 14px ${accent}33` : 'none',
          }}>+</motion.button>
      </div>

      {/* Avatar row — visual fill of the chosen player count */}
      <div className="flex gap-1.5 justify-center flex-wrap">
        {Array.from({ length: max }).map((_, i) => {
          const filled = i < value;
          const inRange = i + 1 >= min;
          return (
            <motion.button key={i}
              whileTap={inRange ? { scale: 0.85 } : {}}
              whileHover={inRange ? { scale: 1.15, y: -2 } : {}}
              onClick={() => { if (inRange) { onChange(i + 1); soundService.playClick(); } }}
              disabled={!inRange}
              className="rounded-full flex items-center justify-center font-bold"
              style={{
                width: 26, height: 26,
                background: filled ? SEAT_COLORS[i % SEAT_COLORS.length] : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${filled ? '#fff5' : 'rgba(255,255,255,0.10)'}`,
                color: '#fff', fontSize: 11,
                opacity: filled ? 1 : 0.4,
                cursor: inRange ? 'pointer' : 'not-allowed',
                boxShadow: filled ? `0 2px 6px rgba(0,0,0,0.35)` : 'none',
                transition: 'opacity .15s, background .15s',
              }}>
              {filled ? '👤' : ''}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ── Coin steps — discrete ladder of values the player walks up/down ─────────
const COIN_STEPS = [
  50, 150, 500, 1000, 2000, 3500, 5000, 8000, 12000, 15000,
  18000, 21000, 25000, 30000, 35000, 40000, 45000, 50000,
];
// Kept for backwards-compat in PlayBox useEffect (auto-clamp logic)
const CHIP_COLORS = COIN_STEPS.map(val => ({ val }));

function nearestStepIndex(v: number): number {
  let best = 0; let bestDiff = Infinity;
  for (let i = 0; i < COIN_STEPS.length; i++) {
    const d = Math.abs(COIN_STEPS[i] - v);
    if (d < bestDiff) { bestDiff = d; best = i; }
  }
  return best;
}

function CoinStepper({ value, onChange, accent, max, lang }: {
  value: number; onChange: (v: number) => void; accent: string; max: number; lang: string;
}) {
  const idx = nearestStepIndex(value);
  // Largest affordable step index
  const maxIdx = (() => {
    let m = -1;
    for (let i = 0; i < COIN_STEPS.length; i++) if (COIN_STEPS[i] <= max) m = i;
    return m;
  })();
  const dec = () => {
    if (idx <= 0) return;
    onChange(COIN_STEPS[idx - 1]); soundService.playClick();
  };
  const inc = () => {
    if (idx >= COIN_STEPS.length - 1) return;
    if (idx + 1 > maxIdx) return;
    onChange(COIN_STEPS[idx + 1]); soundService.playClick();
  };
  const canDec = idx > 0;
  const canInc = idx < COIN_STEPS.length - 1 && idx + 1 <= maxIdx;
  // Progress fraction for the bottom bar
  const pct = ((idx + 1) / COIN_STEPS.length) * 100;

  return (
    <div className="w-full flex flex-col items-center gap-3">
      <span className="font-arabic" style={{ fontSize: 12, color: 'rgba(245,230,200,0.55)' }}>
        {lang === 'ar' ? 'الكوينز للعبة' : 'Coins for game'}
      </span>

      {/* Stepper row — same look as PlayerStepper for consistency */}
      <div className="flex items-center gap-3 w-full" style={{ maxWidth: 320 }}>
        <motion.button whileTap={{ scale: 0.88 }} onClick={dec}
          disabled={!canDec}
          className="rounded-2xl flex items-center justify-center font-bold shrink-0"
          style={{
            width: 52, height: 52,
            background: canDec ? `${accent}26` : 'rgba(255,255,255,0.04)',
            color: canDec ? accent : 'rgba(255,255,255,0.2)',
            border: `2px solid ${canDec ? `${accent}66` : 'rgba(255,255,255,0.08)'}`,
            fontSize: 28, cursor: canDec ? 'pointer' : 'not-allowed',
            boxShadow: canDec ? `0 0 14px ${accent}33` : 'none',
          }}>−</motion.button>

        <div className="flex-1 flex flex-col items-center rounded-2xl py-2 px-3"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${accent}1F 0%, transparent 70%)`,
            border: `1px solid ${accent}44`,
          }}>
          <motion.div key={value}
            initial={{ scale: 0.7, opacity: 0, y: -6 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className="font-bold font-mono flex items-baseline gap-1.5"
            style={{ fontSize: 28, color: accent, lineHeight: 1, textShadow: `0 0 14px ${accent}88` }}>
            {value.toLocaleString()}
            <span style={{ fontSize: 18 }}>🪙</span>
          </motion.div>
          <span className="font-arabic mt-1" style={{ fontSize: 10, color: 'rgba(245,230,200,0.4)' }}>
            {lang === 'ar' ? `مستوى ${idx + 1} من ${COIN_STEPS.length}` : `step ${idx + 1} of ${COIN_STEPS.length}`}
          </span>
        </div>

        <motion.button whileTap={{ scale: 0.88 }} onClick={inc}
          disabled={!canInc}
          className="rounded-2xl flex items-center justify-center font-bold shrink-0"
          style={{
            width: 52, height: 52,
            background: canInc ? `${accent}26` : 'rgba(255,255,255,0.04)',
            color: canInc ? accent : 'rgba(255,255,255,0.2)',
            border: `2px solid ${canInc ? `${accent}66` : 'rgba(255,255,255,0.08)'}`,
            fontSize: 28, cursor: canInc ? 'pointer' : 'not-allowed',
            boxShadow: canInc ? `0 0 14px ${accent}33` : 'none',
          }}>+</motion.button>
      </div>

      {/* Progress bar showing where on the ladder we are */}
      <div className="w-full" style={{ maxWidth: 320 }}>
        <div className="rounded-full overflow-hidden"
          style={{ height: 6, background: 'rgba(255,255,255,0.06)' }}>
          <motion.div animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            style={{ height: '100%', background: `linear-gradient(90deg, ${accent}AA, ${accent})`,
                     boxShadow: `0 0 10px ${accent}77` }}/>
        </div>
        <div className="flex justify-between font-mono mt-1" style={{ fontSize: 9, color: 'rgba(245,230,200,0.35)' }}>
          <span>50</span><span>50K</span>
        </div>
      </div>
    </div>
  );
}

// ── DifficultyCards — 3 big text-only buttons ────────────────────────────────
function DifficultyCards({ value, onChange, lang }: {
  value: 'easy' | 'medium' | 'hard'; onChange: (d: 'easy'|'medium'|'hard') => void; lang: string;
}) {
  const opts = [
    { v: 'easy' as const,   ar: 'سهل',   en: 'Easy',   color: '#7AE08A' },
    { v: 'medium' as const, ar: 'متوسط', en: 'Medium', color: '#E8C97A' },
    { v: 'hard' as const,   ar: 'صعب',   en: 'Hard',   color: '#E04030' },
  ];
  return (
    <div className="w-full flex flex-col gap-2 items-center">
      <span className="font-arabic" style={{ fontSize: 12, color: 'rgba(245,230,200,0.55)' }}>
        {lang === 'ar' ? 'مستوى البوتات' : 'Bot difficulty'}
      </span>
      <div className="grid grid-cols-3 gap-2.5 w-full" style={{ maxWidth: 320 }}>
        {opts.map(o => {
          const sel = value === o.v;
          return (
            <motion.button key={o.v}
              whileTap={{ scale: 0.96 }}
              whileHover={{ y: -2 }}
              onClick={() => { onChange(o.v); soundService.playClick(); }}
              className="rounded-2xl flex items-center justify-center transition-all"
              style={{
                padding: '18px 8px',
                background: sel ? `linear-gradient(160deg, ${o.color}40, ${o.color}15)` : 'rgba(255,255,255,0.05)',
                border: `2px solid ${sel ? o.color : 'rgba(255,255,255,0.10)'}`,
                boxShadow: sel ? `0 0 22px ${o.color}66` : 'none',
                cursor: 'pointer',
              }}
            >
              <span className="font-arabic font-bold" style={{
                fontSize: 20,
                color: sel ? o.color : 'rgba(245,230,200,0.85)',
                textShadow: sel ? `0 0 12px ${o.color}99` : 'none',
                letterSpacing: 1,
              }}>
                {lang === 'ar' ? o.ar : o.en}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ── Giant playing-card frame: corner ranks + suit watermark + central artwork ─
function GiantPlayingCard({ mode, children }: { mode: GameMode; children: React.ReactNode }) {
  const t = MODE_THEMES[mode];
  return (
    <motion.div
      key={mode}
      initial={{ opacity: 0, rotateY: -22, scale: 0.94 }}
      animate={{ opacity: 1, rotateY: 0, scale: 1 }}
      exit={{ opacity: 0, rotateY: 22, scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 240, damping: 26 }}
      className="relative rounded-[28px] overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.10) 0%, transparent 55%),
          linear-gradient(165deg, ${t.bg1} 0%, ${t.bg2} 100%)
        `,
        border: `3px solid ${t.accent}`,
        boxShadow: `0 24px 60px rgba(0,0,0,0.7), 0 0 50px ${t.glow}, inset 0 1px 0 rgba(255,255,255,0.10), inset 0 0 0 6px ${t.bg2}`,
        // Slight 3D tilt on hover via parent
      }}
    >
      {/* Inner border (real-card 'pip line') */}
      <div className="absolute pointer-events-none rounded-[20px]"
        style={{ inset: 14, border: `1px solid ${t.accent}33` }} />

      {/* Big faint suit watermark BEHIND the content */}
      <span aria-hidden="true" style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 280, lineHeight: 1, color: `${t.accent}10`, pointerEvents: 'none',
        fontFamily: 'Georgia, serif',
      }}>
        {t.suit}
      </span>

      {/* Geometric Emirati arabesque accents — top + bottom edge ribbons */}
      <svg style={{ position: 'absolute', top: 0, insetInlineStart: 0, insetInlineEnd: 0, width: '100%', height: 14, pointerEvents: 'none', opacity: 0.45 }} viewBox="0 0 200 14" preserveAspectRatio="none">
        <path d="M0 7 L8 0 L16 7 L24 0 L32 7 L40 0 L48 7 L56 0 L64 7 L72 0 L80 7 L88 0 L96 7 L104 0 L112 7 L120 0 L128 7 L136 0 L144 7 L152 0 L160 7 L168 0 L176 7 L184 0 L192 7 L200 0"
          stroke={t.accent} strokeWidth="0.5" fill="none" />
      </svg>
      <svg style={{ position: 'absolute', bottom: 0, insetInlineStart: 0, insetInlineEnd: 0, width: '100%', height: 14, pointerEvents: 'none', opacity: 0.45, transform: 'scaleY(-1)' }} viewBox="0 0 200 14" preserveAspectRatio="none">
        <path d="M0 7 L8 0 L16 7 L24 0 L32 7 L40 0 L48 7 L56 0 L64 7 L72 0 L80 7 L88 0 L96 7 L104 0 L112 7 L120 0 L128 7 L136 0 L144 7 L152 0 L160 7 L168 0 L176 7 L184 0 L192 7 L200 0"
          stroke={t.accent} strokeWidth="0.5" fill="none" />
      </svg>

      {/* Content */}
      <div className="relative" style={{ padding: '48px 22px 48px' }}>
        {children}
      </div>
    </motion.div>
  );
}

// ── PlayBox — the giant playing-card hero with everything inside ────────────
// ── Match-length picker (Quick / Standard / Long) ─────────────────────────
// Sets the elimination score threshold. Compact pill row that fits inside
// the giant card next to player/coin steppers.
function MatchLengthPicker({ value, onChange, accent, lang }: {
  value: MatchLength;
  onChange: (m: MatchLength) => void;
  accent: string;
  lang: string;
}) {
  const opts: { id: MatchLength; emoji: string; ar: string; en: string }[] = [
    { id: 'quick',    emoji: '⚡', ar: 'سريع', en: 'Quick' },
    { id: 'standard', emoji: '📊', ar: 'عادي', en: 'Standard' },
    { id: 'long',     emoji: '🏛️', ar: 'طويل', en: 'Long' },
  ];
  return (
    <div className="w-full flex flex-col items-center gap-2">
      <span className="font-arabic" style={{ fontSize: 12, color: 'rgba(245,230,200,0.55)' }}>
        {lang === 'ar' ? 'طول المباراة' : 'Match Length'}
      </span>
      <div className="flex gap-2 w-full" style={{ maxWidth: 320 }}>
        {opts.map(o => {
          const sel = value === o.id;
          return (
            <motion.button
              key={o.id}
              whileTap={{ scale: 0.94 }}
              onClick={() => { onChange(o.id); soundService.playClick(); }}
              className="flex-1 rounded-xl font-arabic font-bold transition-all"
              style={{
                padding: '8px 4px',
                background: sel ? `${accent}26` : 'rgba(255,255,255,0.04)',
                color: sel ? accent : 'rgba(245,230,200,0.55)',
                border: `1.5px solid ${sel ? `${accent}99` : 'rgba(255,255,255,0.08)'}`,
                boxShadow: sel ? `0 0 14px ${accent}55` : 'none',
                fontSize: 11.5, lineHeight: 1.25,
                cursor: 'pointer',
              }}>
              <div style={{ fontSize: 16, marginBottom: 2 }}>{o.emoji}</div>
              {lang === 'ar' ? o.ar : o.en}
              <div style={{ fontSize: 9, opacity: 0.75, marginTop: 1 }}>
                {ELIMINATION_SCORE[o.id]} {lang === 'ar' ? 'نقطة' : 'pts'}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function PlayBox({ mode, setMode, coins, onCreate, lang }: {
  mode: GameMode;
  setMode: (m: GameMode) => void;
  coins: number;
  onCreate: (cfg: any) => void;
  lang: string;
}) {
  const [playerCount, setPlayerCount] = useState(4);
  const [coinAmount, setCoinAmount] = useState(50);
  const [botCount, setBotCount] = useState(3);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [matchLength, setMatchLength] = useState<MatchLength>('standard');
  const theme = MODE_THEMES[mode];

  useEffect(() => {
    if (coinAmount > coins) {
      const affordable = CHIP_COLORS.filter(c => c.val <= coins).map(c => c.val);
      setCoinAmount(affordable.length ? affordable[affordable.length - 1] : 50);
    }
  }, [coins]);

  const canAfford = coinAmount <= coins;
  const isOk = mode === 'bots' || canAfford;

  const handleCreate = () => {
    if (!isOk) return;
    soundService.playClick();
    if (mode === 'bots') {
      onCreate({ type: 'bots', botCount, difficulty, bet: 0, matchLength });
    } else {
      onCreate({ type: mode, playerCount, bet: coinAmount, matchLength });
    }
  };

  const ctaLabel = mode === 'online'
    ? (lang === 'ar' ? 'ابحث عن لعبة' : 'Find a Game')
    : mode === 'private'
      ? (lang === 'ar' ? 'أنشئ غرفة خاصة' : 'Create Private Room')
      : (lang === 'ar' ? 'ابدأ اللعبة' : 'Start Game');

  return (
    <div className="flex flex-col items-stretch gap-4">
      {/* Mode switcher ABOVE the giant card */}
      <ModeChips mode={mode} onSelect={setMode} lang={lang} />

      {/* The giant playing card */}
      <AnimatePresence mode="wait">
        <GiantPlayingCard mode={mode} key={mode}>
          {/* Mode badge + title */}
          <div className="flex flex-col items-center mb-5">
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              className="rounded-full flex items-center justify-center mb-3"
              style={{
                width: 78, height: 78,
                background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.25), transparent 55%), ${theme.bg2}`,
                border: `2px solid ${theme.accent}`,
                boxShadow: `0 0 26px ${theme.glow}, inset 0 -10px 22px rgba(0,0,0,0.5)`,
                fontSize: 38, lineHeight: 1,
              }}>
              {theme.icon}
            </motion.div>
            <p className="font-arabic font-bold" style={{ fontSize: 24, color: '#fff', textShadow: `0 2px 14px ${theme.glow}` }}>
              {theme.label[lang === 'ar' ? 'ar' : 'en']}
            </p>
            <p className="font-arabic mt-0.5" style={{ fontSize: 12, color: `${theme.accent}CC` }}>
              {theme.tagline[lang === 'ar' ? 'ar' : 'en']}
            </p>
          </div>

          {/* The configuration zone — varies by mode */}
          <div className="flex flex-col items-center gap-6">
            {mode !== 'bots' ? (
              <>
                <PlayerStepper value={playerCount} onChange={setPlayerCount}
                  min={2} max={10} accent={theme.accent} lang={lang}
                  label={lang === 'ar' ? 'عدد اللاعبين' : 'Players'} />
                <CoinStepper value={coinAmount} onChange={setCoinAmount}
                  accent={theme.accent} max={coins} lang={lang} />
                {!canAfford && (
                  <p className="text-red-400 font-arabic text-xs">
                    {lang === 'ar' ? 'كوينزك غير كافية!' : 'Not enough coins!'}
                  </p>
                )}
                <MatchLengthPicker value={matchLength} onChange={setMatchLength} accent={theme.accent} lang={lang} />
              </>
            ) : (
              <>
                <PlayerStepper value={botCount} onChange={setBotCount}
                  min={1} max={9} accent={theme.accent} lang={lang}
                  label={lang === 'ar' ? 'عدد البوتات' : 'Bots'} />
                <DifficultyCards value={difficulty} onChange={setDifficulty} lang={lang} />
                <MatchLengthPicker value={matchLength} onChange={setMatchLength} accent={theme.accent} lang={lang} />
              </>
            )}
          </div>
        </GiantPlayingCard>
      </AnimatePresence>

      {/* Bottom: huge play button */}
      <motion.button
        whileHover={isOk ? { scale: 1.02, y: -2 } : {}}
        whileTap={isOk ? { scale: 0.97 } : {}}
        onClick={handleCreate}
        disabled={!isOk}
        className="w-full font-arabic font-bold rounded-2xl"
        style={{
          padding: '18px 24px',
          fontSize: 19,
          letterSpacing: 1.5,
          background: isOk
            ? `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accent}DD 50%, ${theme.bg1} 100%)`
            : 'rgba(255,255,255,0.05)',
          color: isOk ? '#0E0905' : 'rgba(255,255,255,0.25)',
          border: `2px solid ${isOk ? theme.accent : 'rgba(255,255,255,0.08)'}`,
          boxShadow: isOk
            ? `0 12px 32px rgba(0,0,0,0.5), 0 0 28px ${theme.glow}`
            : 'none',
          cursor: isOk ? 'pointer' : 'not-allowed',
          textShadow: isOk ? '0 1px 2px rgba(0,0,0,0.25)' : 'none',
        }}
      >
        ▶ {ctaLabel}
      </motion.button>
    </div>
  );
}

// ── Searching Modal (online matchmaking) ──────────────────────────────────────
function SearchingModal({ onCancel, lang }: { onCancel: () => void; lang: string }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(20,14,8,0.88)', backdropFilter: 'blur(8px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6 rounded-3xl p-10 border"
        style={{ background: 'rgba(20,16,10,0.97)', borderColor: 'rgba(201,168,76,0.2)', minWidth: 300 }}
      >
        {/* Pulsing rings */}
        <div className="relative flex items-center justify-center" style={{ width: 90, height: 90 }}>
          {[1, 1.6, 2.2].map((scale, i) => (
            <motion.div
              key={i}
              animate={{ scale: [scale, scale + 0.3, scale], opacity: [0.4, 0.1, 0.4] }}
              transition={{ duration: 2, delay: i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute rounded-full border"
              style={{ width: 44, height: 44, borderColor: 'rgba(201,168,76,0.5)' }}
            />
          ))}
          <span style={{ fontSize: 32, position: 'relative', zIndex: 1 }}>🌍</span>
        </div>

        <div className="text-center">
          <p className="font-arabic font-bold text-lg mb-1" style={{ color: '#E8C97A' }}>
            {lang === 'ar' ? 'جاري البحث عن لاعبين...' : 'Searching for players...'}
          </p>
          <p className="font-arabic text-sm" style={{ color: 'rgba(245,230,200,0.4)' }}>
            {lang === 'ar' ? 'سيبدأ المباراة بمجرد اكتمال اللاعبين' : 'Match starts once players are found'}
          </p>
        </div>

        {/* Timer */}
        <div className="rounded-2xl px-8 py-3 border" style={{ background: 'rgba(201,168,76,0.06)', borderColor: 'rgba(201,168,76,0.15)' }}>
          <p className="font-mono text-3xl font-bold" style={{ color: '#C9A84C', letterSpacing: 4 }}>
            {mm}:{ss}
          </p>
        </div>

        <button
          onClick={onCancel}
          className="font-arabic text-sm px-6 py-2 rounded-xl transition-all border"
          style={{ background: 'rgba(196,92,58,0.08)', borderColor: 'rgba(196,92,58,0.3)', color: '#E07040' }}>
          {lang === 'ar' ? 'إلغاء البحث' : 'Cancel Search'}
        </button>
      </motion.div>
    </div>
  );
}

// ── Bot loading overlay ───────────────────────────────────────────────────────
function BotLoadingOverlay({ lang }: { lang: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(20,14,8,0.88)', backdropFilter: 'blur(8px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6 rounded-3xl p-10 border"
        style={{ background: 'rgba(20,16,10,0.97)', borderColor: 'rgba(201,168,76,0.2)', minWidth: 280 }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          style={{ width: 56, height: 56, borderRadius: '50%', border: '3px solid rgba(201,168,76,0.15)', borderTopColor: '#C9A84C' }}
        />
        <div className="text-center">
          <p className="font-arabic font-bold text-lg mb-1" style={{ color: '#E8C97A' }}>
            {lang === 'ar' ? '🤖 جاري تحضير اللعبة...' : '🤖 Preparing the game...'}
          </p>
          <p className="font-arabic text-sm" style={{ color: 'rgba(245,230,200,0.4)' }}>
            {lang === 'ar' ? 'ستبدأ اللعبة خلال لحظات' : 'Game will start in a moment'}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main HomePage ─────────────────────────────────────────────────────────────
export function HomePage() {
  const t = useT();
  const lang = useLang();
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { rooms, setRooms, currentRoom, setCurrentRoom } = useLobbyStore();
  const { addToast } = useUiStore();
  const [mode, setMode] = useState<GameMode>('bots');
  const [showJoin, setShowJoin] = useState(false);
  const [searching, setSearching] = useState(false);
  const [botLoading, setBotLoading] = useState(false);
  const [searchRoomId, setSearchRoomId] = useState<string | null>(null);
  const [showDaily, setShowDaily] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [progressInitialTab, setProgressInitialTab] = useState<'missions' | 'achievements' | 'levels'>('missions');
  const setTournamentState = useTournamentStore(s => s.setState);
  const setTournamentFinished = useTournamentStore(s => s.setFinished);
  const tournamentState = useTournamentStore(s => s.state);
  const tournamentFinished = useTournamentStore(s => s.finished);
  const pendingModeRef = useRef<GameMode>('bots');

  useEffect(() => {
    // Always ensure a socket instance exists — connect() is idempotent
    const socket = socketService.connect();
    socket.on(SOCKET_EVENTS.LOBBY_ROOM_LIST, (data: RoomState[]) => setRooms(data));
    socket.on(SOCKET_EVENTS.LOBBY_ROOM_UPDATED, (room: RoomState) => {
      if (pendingModeRef.current === 'bots') {
        setBotLoading(true);
        setSearchRoomId(room.roomId);
        socket.emit(SOCKET_EVENTS.LOBBY_START_GAME, { roomId: room.roomId });
      } else if (pendingModeRef.current === 'online') {
        setSearching(true);
        setSearchRoomId(room.roomId);
      } else {
        setCurrentRoom(room);
      }
    });
    socket.on(SOCKET_EVENTS.LOBBY_GAME_STARTING, (data: { gameId: string; gameType: GameType }) => {
      setCurrentRoom(null);
      setSearching(false);
      setBotLoading(false);
      setSearchRoomId(null);
      soundService.playTurnStart();
      navigate(`/game/${data.gameType}/${data.gameId}`);
    });
    socket.on(SOCKET_EVENTS.LOBBY_ERROR, (data: { message: string }) => {
      setSearching(false);
      setBotLoading(false);
      addToast(data.message, 'error');
      soundService.playError();
    });
    socket.on(SOCKET_EVENTS.LOBBY_KICKED, (data: { message: string }) => {
      setCurrentRoom(null);
      addToast(data.message, 'error');
    });
    socket.on(SOCKET_EVENTS.LOBBY_INVITE_RECEIVED, (data: { roomCode: string; inviterName: string; roomName: string }) => {
      addToast(
        `${data.inviterName} دعاك: ${data.roomName}`,
        'success',
        10000,
        {
          label: 'انضم ←',
          onClick: () => {
            pendingModeRef.current = 'private';
            socket.emit(SOCKET_EVENTS.LOBBY_JOIN_PRIVATE, { code: data.roomCode });
          },
        }
      );
    });

    // ── Tournament socket subscriptions ───────────────────────────────────
    // Light versions only — the dedicated /tournaments page handles
    // STATE/FINISHED. We only listen for MATCH_START here so a player
    // sitting on /home gets pulled into their match when it begins.
    socket.on(SOCKET_EVENTS.TOURNAMENT_STATE, (state: TournamentState) => {
      setTournamentState(state);
    });
    socket.on(SOCKET_EVENTS.TOURNAMENT_MATCH_START, (data: { gameId: string }) => {
      navigate(`/game/check/${data.gameId}`);
    });
    socket.on(SOCKET_EVENTS.TOURNAMENT_FINISHED, (data: { isHostChampion: boolean; prizeCoins: number; championUid: string | null; tournamentId: string }) => {
      setTournamentFinished(data);
    });
    socket.on(SOCKET_EVENTS.TOURNAMENT_ERROR, (data: { message: string }) => {
      addToast(data.message || 'Tournament error', 'error');
    });
    socket.emit(SOCKET_EVENTS.TOURNAMENT_SUBSCRIBE);

    return () => {
      socket.off(SOCKET_EVENTS.LOBBY_ROOM_LIST);
      socket.off(SOCKET_EVENTS.LOBBY_ROOM_UPDATED);
      socket.off(SOCKET_EVENTS.LOBBY_GAME_STARTING);
      socket.off(SOCKET_EVENTS.LOBBY_ERROR);
      socket.off(SOCKET_EVENTS.LOBBY_KICKED);
      socket.off(SOCKET_EVENTS.LOBBY_INVITE_RECEIVED);
      socket.off(SOCKET_EVENTS.TOURNAMENT_STATE);
      socket.off(SOCKET_EVENTS.TOURNAMENT_MATCH_START);
      socket.off(SOCKET_EVENTS.TOURNAMENT_FINISHED);
      socket.off(SOCKET_EVENTS.TOURNAMENT_ERROR);
    };
  }, []);

  // If a tournament is active and the player just returned to /home (e.g.
  // after a match), gently nudge them to the dedicated tournaments page.
  useEffect(() => {
    if (tournamentState && tournamentState.status !== 'finished' && !tournamentFinished) {
      if (!searching && !botLoading) {
        addToast(
          lang === 'ar' ? 'لديك بطولة جارية — افتح صفحة البطولات' : 'Tournament in progress — open the Tournaments page',
          'info', 6000,
          { label: lang === 'ar' ? 'افتح ←' : 'Open ←', onClick: () => navigate('/tournaments') },
        );
      }
    }
  }, [tournamentState?.id, tournamentState?.nextHostMatchNum]);

  function handleCancelSearch() {
    const socket = socketService.getSocket();
    if (socket && searchRoomId) {
      socket.emit(SOCKET_EVENTS.LOBBY_LEAVE_ROOM, { roomId: searchRoomId });
    }
    setSearching(false);
    setSearchRoomId(null);
  }

  const handleCreate = async (cfg: any) => {
    pendingModeRef.current = cfg.type === 'bots' ? 'bots' : cfg.type === 'private' ? 'private' : 'online';

    // Show a quick spinner if we have to wait for the socket to reconnect
    // (e.g. user clicked Start right after leaving a previous game).
    if (!socketService.isReady()) {
      if (cfg.type === 'bots') setBotLoading(true);
      else if (cfg.type === 'online') setSearching(true);
    }

    let socket;
    try {
      socket = await socketService.ensureReady(5000);
    } catch {
      setBotLoading(false);
      setSearching(false);
      addToast(lang === 'ar' ? 'تعذّر الاتصال بالخادم — حاول مرة أخرى' : 'Could not reach server — please retry', 'error');
      return;
    }

    if (cfg.type === 'bots') {
      socket.emit(SOCKET_EVENTS.LOBBY_CREATE_ROOM, {
        name: `لعبة بوتات`,
        type: 'private',
        botCount: cfg.botCount,
        botDifficulty: cfg.difficulty,
        gameType: 'check',
        gameMode: cfg.matchLength,
      });
    } else if (cfg.type === 'private') {
      socket.emit(SOCKET_EVENTS.LOBBY_CREATE_ROOM, {
        name: `غرفة خاصة`,
        type: 'private',
        botCount: 0,
        botDifficulty: 'medium',
        gameType: 'check',
        betAmount: cfg.bet,
        maxPlayers: cfg.playerCount,
        gameMode: cfg.matchLength,
      });
    } else {
      socket.emit(SOCKET_EVENTS.LOBBY_CREATE_ROOM, {
        name: `غرفة عامة`,
        type: 'public',
        botCount: 0,
        botDifficulty: 'medium',
        gameType: 'check',
        betAmount: cfg.bet,
        maxPlayers: cfg.playerCount,
        gameMode: cfg.matchLength,
      });
    }
  };

  const coins = profile?.coins ?? 0;
  const level = profile?.ranking?.level ?? 1;
  const xp = profile?.ranking?.xp ?? 0;
  const wins = profile?.stats?.totalWins ?? 0;
  const games = profile?.stats?.totalGames ?? 0;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #1A1408 0%, #14100A 50%, #0E0905 100%)', direction: dir, overflowX: 'hidden' }} className="pb-16 sm:pb-0">

      {/* ── Top nav bar ── */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-4 py-2.5"
        style={{ background: 'rgba(20,16,10,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(201,168,76,0.12)' }}>
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src="/assets/og-image.png" alt="Check"
            style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 0 14px rgba(201,168,76,0.35)', border: '1px solid rgba(201,168,76,0.4)' }}/>
          <span className="font-display tracking-widest hidden sm:inline" style={{ fontSize: 18, color: '#C9A84C', textShadow: '0 0 16px rgba(201,168,76,0.4)' }}>CHECK</span>
        </Link>
        <div className="flex items-center gap-2">
          <LangToggle />
          {/* Daily reward — moved out of the games area into the top nav */}
          <DailyRewardNavButton onOpen={() => setShowDaily(true)} lang={lang} />
          {/* Coins */}
          <div className="flex items-center gap-1.5 rounded-xl px-3 py-1.5"
            style={{ background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.25)' }}>
            <span style={{ fontSize: 15 }}>🪙</span>
            <span className="font-bold" style={{ fontSize: 13, color: '#E8C97A' }}>{coins.toLocaleString()}</span>
          </div>
          {/* Desktop nav links — hidden on mobile */}
          <div className="hidden sm:flex items-center gap-2">
            <Link to="/" className="rounded-xl px-2.5 py-1.5 transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(245,230,200,0.6)', fontSize: 12 }}>
              🏠 {lang === 'ar' ? 'الصفحة الرئيسية' : 'Home'}
            </Link>
            <Link to="/store" className="rounded-xl px-2.5 py-1.5 transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(245,230,200,0.6)', fontSize: 12 }}>
              🏪 {lang === 'ar' ? 'المتجر' : 'Store'}
            </Link>
            <Link to="/friends" className="rounded-xl px-2.5 py-1.5 transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(245,230,200,0.6)', fontSize: 12 }}>
              👥 {lang === 'ar' ? 'أصدقاء' : 'Friends'}
            </Link>
            <Link to="/history" className="rounded-xl px-2.5 py-1.5 transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(245,230,200,0.6)', fontSize: 12 }}>
              📋 {lang === 'ar' ? 'سجل' : 'History'}
            </Link>
            <Link to="/leaderboard" className="rounded-xl px-2.5 py-1.5 transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(245,230,200,0.6)', fontSize: 12 }}>
              🏆 {lang === 'ar' ? 'التصنيف' : 'Ranks'}
            </Link>
            <Link to="/profile">
              {profile && <AvatarCircle id={profile.avatarId} name={profile.displayName} size={32} frameId={(profile.equippedItems as any)?.avatarFrame}/>}
            </Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 40px' }}>

        {/* ── Profile card ── */}
        {profile && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4 mb-5"
            style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.10) 0%, rgba(16,10,30,0.95) 100%)', border: '1px solid rgba(201,168,76,0.2)', boxShadow: '0 0 24px rgba(201,168,76,0.08)' }}
          >
            <div className="flex items-center gap-4">
              <Link to="/profile" style={{ textDecoration: 'none' }}>
                <div className="relative">
                  <AvatarCircle id={profile.avatarId} name={profile.displayName} size={52} frameId={(profile.equippedItems as any)?.avatarFrame}/>
                  <div className="absolute -bottom-0.5 -right-0.5 rounded-full px-1.5"
                    style={{ background: '#C9A84C', fontSize: 9, color: '#0E0905', fontWeight: 800, lineHeight: '16px' }}>
                    {level}
                  </div>
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <h2 className="font-arabic font-bold truncate" style={{ fontSize: 17, color: '#E8C97A' }}>{profile.displayName}</h2>
                  <span className="font-arabic" style={{ fontSize: 11, color: 'rgba(201,168,76,0.55)' }}>{levelTitle(level, lang)}</span>
                </div>
                <div className="flex gap-4 my-1.5">
                  <span className="font-arabic text-xs" style={{ color: 'rgba(245,230,200,0.4)' }}>
                    <span style={{ color: '#C9A84C', fontWeight: 700 }}>{wins}</span> {t('wins')}
                  </span>
                  <span className="font-arabic text-xs" style={{ color: 'rgba(245,230,200,0.4)' }}>
                    <span style={{ color: '#C9A84C', fontWeight: 700 }}>{games}</span> {t('games')}
                  </span>
                  <span className="font-arabic text-xs" style={{ color: 'rgba(245,230,200,0.4)' }}>
                    🔥 <span style={{ color: '#C9A84C', fontWeight: 700 }}>{profile.stats?.currentStreak ?? 0}</span>
                  </span>
                </div>
                <XpBar xp={xp} lang={lang} onClick={() => { setProgressInitialTab('levels'); setShowProgress(true); }}/>
              </div>
            </div>

            {/* Missions strip — sits below the XP bar, full width */}
            <MissionsStrip
              onOpen={() => { setProgressInitialTab('missions'); setShowProgress(true); }}
              lang={lang}
              profileXp={xp} profileWins={wins} profileGames={games}
              profileStreak={profile.stats?.currentStreak ?? 0}
            />
          </motion.div>
        )}

        {currentRoom ? (
          <WaitingRoom room={currentRoom} onLeave={() => setCurrentRoom(null)} />
        ) : (
          <>
            {/* ── Game title ── */}
            <div className="text-center mb-5">
              <div className="flex items-center justify-center gap-3 mb-1">
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.3))' }}/>
                <span className="font-display tracking-widest" style={{ fontSize: 22, color: '#C9A84C' }}>CHECK</span>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(201,168,76,0.3))' }}/>
              </div>
              <p className="font-arabic" style={{ fontSize: 12, color: 'rgba(245,230,200,0.3)' }}>{t('home_subtitle')}</p>
            </div>

            {/* ── Single morphing PlayBox (tabs + visual config + CTA) ── */}
            <PlayBox mode={mode} setMode={setMode} coins={coins} onCreate={handleCreate} lang={lang} />

            {/* ── Rules + Tournament + Join private room actions ── */}
            <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={() => setShowRules(true)}
                className="font-arabic font-bold rounded-xl px-4 py-2.5 flex items-center gap-2 transition-all"
                style={{
                  background: 'linear-gradient(135deg, rgba(201,168,76,0.18) 0%, rgba(120,80,20,0.12) 100%)',
                  border: '1.5px solid rgba(201,168,76,0.55)',
                  color: '#E8C97A',
                  fontSize: 14,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.35), 0 0 16px rgba(201,168,76,0.2)',
                }}>
                📖 {lang === 'ar' ? 'القوانين' : 'Rules'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={() => { soundService.playClick(); navigate('/tournaments'); }}
                className="font-arabic font-bold rounded-xl px-4 py-2.5 flex items-center gap-2 transition-all"
                style={{
                  background: 'linear-gradient(135deg, rgba(232,201,122,0.22) 0%, rgba(168,124,58,0.14) 100%)',
                  border: '1.5px solid rgba(232,201,122,0.65)',
                  color: '#FFE07A',
                  fontSize: 14,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.35), 0 0 18px rgba(232,201,122,0.30)',
                }}>
                🏆 {lang === 'ar' ? 'البطولات' : 'Tournaments'}
              </motion.button>
              {mode === 'private' && (
                <button onClick={() => setShowJoin(true)}
                  className="font-arabic text-sm transition-all"
                  style={{ color: 'rgba(245,230,200,0.45)', textDecoration: 'underline', textDecorationColor: 'rgba(245,230,200,0.2)' }}>
                  🔑 {lang === 'ar' ? 'انضم بكود غرفة خاصة' : 'Join with room code'}
                </button>
              )}
            </div>

          </>
        )}
      </div>

      <JoinPrivateModal open={showJoin} onClose={() => setShowJoin(false)} onBeforeJoin={() => { pendingModeRef.current = 'private'; }}/>
      <DailyRewardModal open={showDaily} onClose={() => setShowDaily(false)}/>
      <RulesModal open={showRules} onClose={() => setShowRules(false)}/>
      <ProgressionModal open={showProgress} onClose={() => setShowProgress(false)} lang={lang} initialTab={progressInitialTab}/>

      {searching && <SearchingModal onCancel={handleCancelSearch} lang={lang}/>}
      {botLoading && <BotLoadingOverlay lang={lang}/>}

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex sm:hidden items-center border-t"
        style={{ background: 'rgba(20,16,10,0.97)', backdropFilter: 'blur(12px)', borderColor: 'rgba(201,168,76,0.15)', height: 56 }}>
        {[
          { to: '/home', icon: '🏠', label: lang === 'ar' ? 'الرئيسية' : 'Home' },
          { to: '/store', icon: '🏪', label: lang === 'ar' ? 'المتجر' : 'Store' },
          { to: '/leaderboard', icon: '🏆', label: lang === 'ar' ? 'التصنيف' : 'Rank' },
          { to: '/friends', icon: '👥', label: lang === 'ar' ? 'أصدقاء' : 'Friends' },
          { to: '/profile', icon: '👤', label: lang === 'ar' ? 'حسابي' : 'Profile' },
        ].map(item => (
          <Link key={item.to} to={item.to}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all"
            style={{ color: 'rgba(245,230,200,0.5)', fontSize: 10 }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span className="font-arabic">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

