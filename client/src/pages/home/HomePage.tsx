import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link, useLocation } from 'react-router-dom';
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
import { WheelModal } from '../../components/shared/WheelModal';
import { ChestsModal } from '../../components/shared/ChestsModal';
import { CharacterArt } from '../../components/shared/CharacterArt';
import { useTournamentStore } from '../../store/tournamentStore';
import { deriveLevel } from '@check-game/shared';
import type { GameMode as MatchLength, TournamentState } from '@check-game/shared';
import { ELIMINATION_SCORE } from '@check-game/shared';
import { FrameRing } from '../../components/shared/FrameRing';
import { apiClient } from '../../services/api.service';
import { FloatingDock, BentoTile, GlassCard, NeonStat } from '../../components/shared/PageShell';
import { Aurora } from '../../components/shared/Aurora';

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

// Wheel button for the top nav — pulses gold when a spin is available.
function WheelNavButton({ onOpen, lang }: { onOpen: () => void; lang: string }) {
  const [canSpin, setCanSpin] = useState<boolean | null>(null);
  useEffect(() => {
    apiClient.get<{ canSpin: boolean }>('/api/wheel/status')
      .then(r => setCanSpin(r.canSpin)).catch(() => setCanSpin(false));
  }, []);
  return (
    <motion.button
      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
      onClick={onOpen}
      className="relative rounded-xl flex items-center justify-center"
      title={lang === 'ar' ? 'عجلة الحظ' : 'Lucky Wheel'}
      style={{
        width: 36, height: 34,
        background: canSpin ? 'rgba(232,201,122,0.20)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${canSpin ? 'rgba(232,201,122,0.55)' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: canSpin ? '0 0 14px rgba(232,201,122,0.35)' : 'none',
        cursor: 'pointer',
      }}>
      <span style={{ fontSize: 18, lineHeight: 1 }}>{canSpin ? '🎡' : '🎰'}</span>
      {canSpin && (
        <span className="absolute rounded-full animate-pulse"
          style={{ top: -3, right: -3, width: 9, height: 9, background: '#FFE07A', border: '1.5px solid #14100A' }}/>
      )}
    </motion.button>
  );
}

// Prominent tournament CTA strip — sits below the profile card. Reads the
// active tournament from the store so it can show "back to your bracket"
// when the player has one in flight, and the public-list count from the
// last TOURNAMENT_LIST emit (kept on a window-level cache for cheapness).
function TournamentStrip({ lang, onOpen }: { lang: string; onOpen: () => void }) {
  const tournamentState = useTournamentStore(s => s.state);
  const active = tournamentState && tournamentState.status !== 'finished';
  const inProgress = active && tournamentState.status === 'in_progress';
  const subtitle = active
    ? (lang === 'ar'
        ? (inProgress ? '⏱ بطولة جارية — تابع التقدم' : '⏳ بطولة في الانتظار')
        : (inProgress ? '⏱ Tournament live — see progress' : '⏳ Tournament waiting'))
    : (lang === 'ar' ? 'اربح بطولات حقيقية وكسب جوائز' : 'Win real tournaments and earn prizes');

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.985 }}
      onClick={onOpen}
      className="w-full mb-5 rounded-2xl flex items-center gap-3 px-4 py-3 transition-all"
      style={{
        background: active
          ? 'linear-gradient(90deg, rgba(232,201,122,0.22) 0%, rgba(168,124,58,0.14) 100%)'
          : 'linear-gradient(90deg, rgba(232,201,122,0.14) 0%, rgba(168,124,58,0.06) 100%)',
        border: `1.5px solid ${active ? 'rgba(232,201,122,0.65)' : 'rgba(232,201,122,0.40)'}`,
        boxShadow: '0 4px 18px rgba(0,0,0,0.35), 0 0 22px rgba(232,201,122,0.20)',
        cursor: 'pointer',
      }}>
      {/* Trophy icon */}
      <div className="rounded-xl flex items-center justify-center shrink-0"
        style={{
          width: 44, height: 44,
          background: 'radial-gradient(circle at 30% 30%, rgba(255,224,122,0.45), rgba(168,124,58,0.20) 70%)',
          border: '1px solid rgba(232,201,122,0.55)',
          fontSize: 26,
        }}>🏆</div>

      <div className="flex-1 min-w-0 text-start">
        <div className="font-arabic font-bold flex items-center gap-2"
          style={{ fontSize: 15, color: '#FFE07A' }}>
          {lang === 'ar' ? 'البطولات' : 'Tournaments'}
          {active && (
            <motion.span
              animate={{ opacity: [1, 0.45, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              className="rounded-full font-bold"
              style={{
                background: '#E04030', color: '#fff',
                fontSize: 9.5, lineHeight: '15px',
                padding: '0 6px',
              }}>
              {lang === 'ar' ? 'نشطة' : 'live'}
            </motion.span>
          )}
        </div>
        <p className="font-arabic mt-0.5"
          style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.65)' }}>
          {subtitle}
        </p>
      </div>

      <span className="shrink-0" style={{ fontSize: 18, color: '#FFE07A' }}>
        {lang === 'ar' ? '‹' : '›'}
      </span>
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

// Single small stat chip used inside the profile banner.
function StatChip({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div className="rounded-xl flex flex-col items-center justify-center"
      style={{
        minWidth: 52, padding: '4px 8px',
        background: 'rgba(0,0,0,0.30)',
        border: '1px solid rgba(201,168,76,0.20)',
      }}>
      <span style={{ fontSize: 12, lineHeight: 1 }}>{icon}</span>
      <span className="font-bold" style={{ fontSize: 13, color: '#E8C97A', lineHeight: 1.05, marginTop: 1 }}>
        {value}
      </span>
      <span className="font-arabic" style={{ fontSize: 8.5, color: 'rgba(245,230,200,0.45)', lineHeight: 1, marginTop: 1 }}>
        {label}
      </span>
    </div>
  );
}

// ── Quick-actions triad ─────────────────────────────────────────────────────
// Replaces the old TournamentStrip + Rules/Clans button row with a single
// 3-tile band. New shape: square cards stacked vertically (icon on top,
// title centered) instead of a horizontal chevron strip. Tournaments
// shows a pulsing "live" pip when the user has an active bracket.
function QuickActionsTriad({
  lang, clanTag, onOpenTournaments, onOpenClans, onOpenRules,
}: {
  lang: string;
  clanTag?: string | null;
  onOpenTournaments: () => void;
  onOpenClans: () => void;
  onOpenRules: () => void;
}) {
  const tournamentState = useTournamentStore(s => s.state);
  const tournamentLive = !!tournamentState && tournamentState.status === 'in_progress';

  const tiles: {
    key: string;
    icon: string;
    title: string;
    sub: string;
    onClick: () => void;
    live?: boolean;
    accent: 'gold' | 'purple' | 'sand';
  }[] = [
    {
      key: 'tournaments',
      icon: '🏆',
      title: lang === 'ar' ? 'البطولات' : 'Tournaments',
      sub: tournamentLive
        ? (lang === 'ar' ? 'بطولة جارية' : 'Live now')
        : (lang === 'ar' ? 'اربح جوائز' : 'Win prizes'),
      onClick: onOpenTournaments,
      live: tournamentLive,
      accent: 'gold',
    },
    {
      key: 'clans',
      icon: '🏰',
      title: clanTag
        ? (lang === 'ar' ? `[${clanTag}]` : `[${clanTag}]`)
        : (lang === 'ar' ? 'القبائل' : 'Clans'),
      sub: clanTag
        ? (lang === 'ar' ? 'قبيلتك' : 'Your clan')
        : (lang === 'ar' ? 'انضم لقبيلة' : 'Join one'),
      onClick: onOpenClans,
      accent: 'purple',
    },
    {
      key: 'rules',
      icon: '📖',
      title: lang === 'ar' ? 'القوانين' : 'Rules',
      sub: lang === 'ar' ? 'كيف تلعب' : 'How to play',
      onClick: onOpenRules,
      accent: 'sand',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2.5 mb-5">
      {tiles.map(t => {
        const accent =
          t.accent === 'gold'   ? { bg1: 'rgba(232,201,122,0.18)', bg2: 'rgba(120,80,20,0.10)', border: 'rgba(232,201,122,0.55)', text: '#E8C97A', glow: 'rgba(232,201,122,0.25)' } :
          t.accent === 'purple' ? { bg1: 'rgba(196,149,255,0.16)', bg2: 'rgba(80,40,120,0.10)',  border: 'rgba(196,149,255,0.55)', text: '#C495FF', glow: 'rgba(196,149,255,0.20)' } :
                                  { bg1: 'rgba(245,230,200,0.10)', bg2: 'rgba(40,28,12,0.85)',   border: 'rgba(201,168,76,0.30)', text: 'rgba(245,230,200,0.85)', glow: 'rgba(0,0,0,0.30)' };
        return (
          <motion.button
            key={t.key}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={t.onClick}
            className="relative rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all"
            style={{
              padding: '14px 8px 12px',
              minHeight: 96,
              background: `linear-gradient(160deg, ${accent.bg1} 0%, ${accent.bg2} 100%)`,
              border: `1.5px solid ${accent.border}`,
              boxShadow: `0 4px 14px rgba(0,0,0,0.40), 0 0 18px ${accent.glow}`,
              cursor: 'pointer',
            }}>
            <div className="rounded-2xl flex items-center justify-center"
              style={{
                width: 44, height: 44,
                background: `radial-gradient(circle at 30% 30%, ${accent.bg1.replace('0.16','0.45').replace('0.18','0.45').replace('0.10','0.45')}, transparent 70%)`,
                border: `1px solid ${accent.border}`,
                fontSize: 24,
              }}>
              {t.icon}
            </div>
            <p className="font-arabic font-bold leading-none"
              style={{ fontSize: 12.5, color: accent.text }}>
              {t.title}
            </p>
            <p className="font-arabic leading-none"
              style={{ fontSize: 10, color: 'rgba(245,230,200,0.5)' }}>
              {t.sub}
            </p>
            {t.live && (
              <motion.span
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute rounded-full"
                style={{ top: 8, insetInlineEnd: 8, width: 8, height: 8, background: '#E04030', boxShadow: '0 0 6px #E04030' }}/>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

// ── Unified Rewards launcher ────────────────────────────────────────────────
// One button at the top right of the nav that bundles every "small reward"
// surface (Daily, Missions, Wheel, Chests) behind a single tap. The button
// shows a single combined badge — total number of things waiting to be
// claimed — so the player knows whether to open it without having to.
function RewardsLauncher({
  lang, keysCount,
  onOpenDaily, onOpenMissions, onOpenWheel, onOpenChests,
  // Used as a refetch trigger for missions.
  profileXp, profileWins, profileGames, profileStreak,
}: {
  lang: string;
  keysCount: number;
  onOpenDaily: () => void;
  onOpenMissions: () => void;
  onOpenWheel: () => void;
  onOpenChests: () => void;
  profileXp: number; profileWins: number; profileGames: number; profileStreak: number;
}) {
  const [open, setOpen] = useState(false);
  const [dailyClaimable, setDailyClaimable] = useState(false);
  const [wheelSpinnable, setWheelSpinnable] = useState(false);
  const [missionsClaimable, setMissionsClaimable] = useState(0);

  useEffect(() => {
    apiClient.get<{ canClaim: boolean }>('/api/daily/status')
      .then(r => setDailyClaimable(r.canClaim)).catch(() => {});
    apiClient.get<{ canSpin: boolean }>('/api/wheel/status')
      .then(r => setWheelSpinnable(r.canSpin)).catch(() => {});
  }, [open]);

  useEffect(() => {
    apiClient.get<{
      missions: { items: { complete: boolean; claimed: boolean }[] };
      achievements: { complete: boolean; claimed: boolean }[];
      levelRewards: { reached: boolean; claimed: boolean }[];
    }>('/api/progression').then(r => {
      const c =
        r.missions.items.filter(m => m.complete && !m.claimed).length +
        r.achievements.filter(x => x.complete && !x.claimed).length +
        r.levelRewards.filter(x => x.reached && !x.claimed).length;
      setMissionsClaimable(c);
    }).catch(() => {});
  }, [profileXp, profileWins, profileGames, profileStreak, open]);

  const totalReady =
    (dailyClaimable ? 1 : 0) +
    (wheelSpinnable ? 1 : 0) +
    missionsClaimable +
    keysCount;
  const hot = totalReady > 0;

  function fire(fn: () => void) {
    setOpen(false);
    // Defer one tick so the panel exit animation can start before the
    // target modal mounts on top.
    requestAnimationFrame(() => fn());
  }

  const rows: {
    key: string;
    icon: string;
    title: string;
    sub: string;
    onClick: () => void;
    hot: boolean;
    badge?: { text: string; tone: 'red' | 'gold' | 'purple' };
  }[] = [
    {
      key: 'daily',
      icon: '🎁',
      title: lang === 'ar' ? 'الهدية اليومية' : 'Daily Reward',
      sub: dailyClaimable
        ? (lang === 'ar' ? 'هديتك جاهزة الحين' : 'Your gift is waiting')
        : (lang === 'ar' ? 'ارجع غداً' : 'Come back tomorrow'),
      onClick: () => fire(onOpenDaily),
      hot: dailyClaimable,
      badge: dailyClaimable ? { text: lang === 'ar' ? 'جاهزة' : 'ready', tone: 'red' } : undefined,
    },
    {
      key: 'missions',
      icon: '🎯',
      title: lang === 'ar' ? 'المهام والإنجازات' : 'Missions & Achievements',
      sub: missionsClaimable > 0
        ? (lang === 'ar' ? `${missionsClaimable} جاهزة للاستلام` : `${missionsClaimable} ready to claim`)
        : (lang === 'ar' ? 'العب لتقدّم المهام' : 'Play to advance missions'),
      onClick: () => fire(onOpenMissions),
      hot: missionsClaimable > 0,
      badge: missionsClaimable > 0
        ? { text: `${missionsClaimable}`, tone: 'red' } : undefined,
    },
    {
      key: 'wheel',
      icon: '🎡',
      title: lang === 'ar' ? 'عجلة الحظ' : 'Lucky Wheel',
      sub: wheelSpinnable
        ? (lang === 'ar' ? 'لفّتك مجانية متاحة' : 'Free spin available')
        : (lang === 'ar' ? 'انتهت اللفّة، انتظر التالية' : 'No spins right now'),
      onClick: () => fire(onOpenWheel),
      hot: wheelSpinnable,
      badge: wheelSpinnable ? { text: lang === 'ar' ? 'لفّة' : 'spin', tone: 'gold' } : undefined,
    },
    {
      key: 'chests',
      icon: '🗝️',
      title: lang === 'ar' ? 'صناديق الكنز' : 'Treasure Chests',
      sub: keysCount > 0
        ? (lang === 'ar' ? `معك ${keysCount} مفتاح` : `${keysCount} key${keysCount > 1 ? 's' : ''}`)
        : (lang === 'ar' ? 'اربح مفاتيح من الألعاب' : 'Win keys from games'),
      onClick: () => fire(onOpenChests),
      hot: keysCount > 0,
      badge: keysCount > 0 ? { text: `${keysCount}`, tone: 'purple' } : undefined,
    },
  ];

  return (
    <>
      {/* Trigger — a single coin-shaped button. Pulse-glows when something
          is waiting; otherwise sits quietly in the nav row. */}
      <motion.button
        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
        onClick={() => setOpen(o => !o)}
        className="relative rounded-full flex items-center justify-center"
        title={lang === 'ar' ? 'الجوائز' : 'Rewards'}
        aria-label={lang === 'ar' ? 'الجوائز' : 'Rewards'}
        style={{
          width: 38, height: 38,
          background: hot
            ? 'radial-gradient(circle at 30% 30%, rgba(255,224,122,0.45), rgba(168,124,58,0.55) 70%)'
            : 'radial-gradient(circle at 30% 30%, rgba(201,168,76,0.20), rgba(60,40,16,0.45) 70%)',
          border: `1.5px solid ${hot ? 'rgba(255,224,122,0.85)' : 'rgba(201,168,76,0.40)'}`,
          boxShadow: hot
            ? '0 0 18px rgba(255,224,122,0.55), inset 0 -2px 6px rgba(0,0,0,0.45)'
            : 'inset 0 -2px 6px rgba(0,0,0,0.45)',
          cursor: 'pointer',
        }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>🎁</span>
        {totalReady > 0 && (
          <motion.span
            animate={{ scale: [1, 1.10, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute rounded-full font-bold flex items-center justify-center"
            style={{
              top: -4, insetInlineEnd: -4, minWidth: 18, height: 18, padding: '0 5px',
              background: '#E04030', color: '#fff', fontSize: 10, lineHeight: 1,
              border: '2px solid #14100A',
            }}>
            {totalReady}
          </motion.span>
        )}
      </motion.button>

      {/* Panel — portalled to document.body so the parent GlassCard's
          backdrop-filter doesn't trap it inside its containing block. */}
      {createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            key="rl-bg"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] flex items-start justify-center p-3"
            style={{ background: 'rgba(8,4,0,0.70)', backdropFilter: 'blur(6px)' }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: -18, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: -10, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              onClick={e => e.stopPropagation()}
              className="rounded-[28px] w-full"
              style={{
                background: 'linear-gradient(170deg, rgba(40,28,12,0.98) 0%, rgba(14,9,5,0.98) 100%)',
                border: '1.5px solid rgba(201,168,76,0.35)',
                boxShadow: '0 30px 80px rgba(0,0,0,0.85), 0 0 60px rgba(201,168,76,0.22)',
                maxWidth: 460,
                marginTop: 60,
                padding: 16,
              }}>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-arabic font-bold flex items-center gap-2"
                  style={{ fontSize: 15, color: '#E8C97A' }}>
                  <span style={{ fontSize: 18 }}>🎁</span>
                  {lang === 'ar' ? 'مركز الجوائز' : 'Rewards'}
                </h3>
                <button onClick={() => setOpen(false)}
                  className="text-sand/40 hover:text-sand text-xl w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5"
                  aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}>×</button>
              </div>

              <div className="flex flex-col gap-2">
                {rows.map(r => (
                  <motion.button
                    key={r.key}
                    whileHover={{ x: lang === 'ar' ? -3 : 3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={r.onClick}
                    className="rounded-2xl flex items-center gap-3 px-3 py-3 text-start transition-all"
                    style={{
                      background: r.hot
                        ? 'linear-gradient(90deg, rgba(232,201,122,0.20) 0%, rgba(40,28,12,0.85) 100%)'
                        : 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(20,16,10,0.85) 100%)',
                      border: `1.5px solid ${r.hot ? 'rgba(232,201,122,0.55)' : 'rgba(201,168,76,0.18)'}`,
                      boxShadow: r.hot ? '0 0 16px rgba(232,201,122,0.20)' : 'none',
                      cursor: 'pointer',
                    }}>
                    <div className="rounded-2xl flex items-center justify-center shrink-0"
                      style={{
                        width: 48, height: 48,
                        background: r.hot
                          ? 'radial-gradient(circle at 30% 30%, rgba(255,224,122,0.45), rgba(168,124,58,0.20) 70%)'
                          : 'rgba(0,0,0,0.30)',
                        border: `1px solid ${r.hot ? 'rgba(232,201,122,0.55)' : 'rgba(255,255,255,0.06)'}`,
                        fontSize: 24,
                      }}>
                      {r.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-arabic font-bold truncate"
                          style={{ fontSize: 13, color: r.hot ? '#E8C97A' : 'rgba(232,201,122,0.85)' }}>
                          {r.title}
                        </p>
                        {r.badge && (
                          <span className="rounded-full font-bold flex items-center justify-center"
                            style={{
                              fontSize: 9, lineHeight: 1, padding: '3px 6px',
                              background:
                                r.badge.tone === 'red'    ? '#E04030' :
                                r.badge.tone === 'gold'   ? '#E8C97A' :
                                                            '#C495FF',
                              color: r.badge.tone === 'gold' ? '#0E0905' : '#fff',
                            }}>
                            {r.badge.text}
                          </span>
                        )}
                      </div>
                      <p className="font-arabic mt-0.5 truncate"
                        style={{ fontSize: 11, color: 'rgba(245,230,200,0.55)' }}>
                        {r.sub}
                      </p>
                    </div>
                    <span className="shrink-0" style={{
                      fontSize: 18, color: r.hot ? '#E8C97A' : 'rgba(245,230,200,0.45)',
                    }}>{lang === 'ar' ? '‹' : '›'}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </>
  );
}

// ── Rewards Hub ──────────────────────────────────────────────────────────────
// All four "small reward" surfaces — Daily Reward, Missions, Wheel, Chests —
// gathered into one tile grid so the home page reads as one place to check
// for stuff to claim, instead of four scattered nav-bar pings + an in-card
// strip. Each tile pulses gold when there's something actionable behind it.
function RewardsHub({
  lang, keysCount,
  onOpenDaily, onOpenMissions, onOpenWheel, onOpenChests,
  // Used as a refetch trigger for the missions tile.
  profileXp, profileWins, profileGames, profileStreak,
}: {
  lang: string;
  keysCount: number;
  onOpenDaily: () => void;
  onOpenMissions: () => void;
  onOpenWheel: () => void;
  onOpenChests: () => void;
  profileXp: number; profileWins: number; profileGames: number; profileStreak: number;
}) {
  const [dailyClaimable, setDailyClaimable] = useState<boolean>(false);
  const [wheelSpinnable, setWheelSpinnable] = useState<boolean>(false);
  const [missionsClaimable, setMissionsClaimable] = useState<number>(0);

  useEffect(() => {
    apiClient.get<{ canClaim: boolean }>('/api/daily/status')
      .then(r => setDailyClaimable(r.canClaim)).catch(() => {});
    apiClient.get<{ canSpin: boolean }>('/api/wheel/status')
      .then(r => setWheelSpinnable(r.canSpin)).catch(() => {});
  }, []);

  // Missions claimable count refreshes whenever any profile activity changes.
  useEffect(() => {
    apiClient.get<{
      missions: { items: { complete: boolean; claimed: boolean }[] };
      achievements: { complete: boolean; claimed: boolean }[];
      levelRewards: { reached: boolean; claimed: boolean }[];
    }>('/api/progression').then(r => {
      const c =
        r.missions.items.filter(m => m.complete && !m.claimed).length +
        r.achievements.filter(x => x.complete && !x.claimed).length +
        r.levelRewards.filter(x => x.reached && !x.claimed).length;
      setMissionsClaimable(c);
    }).catch(() => {});
  }, [profileXp, profileWins, profileGames, profileStreak]);

  const tiles: {
    key: string;
    icon: string;
    label: string;
    onClick: () => void;
    hot: boolean;
    badge?: { text: string; tone: 'red' | 'gold' | 'purple' };
  }[] = [
    {
      key: 'daily',
      icon: dailyClaimable ? '🎁' : '📦',
      label: lang === 'ar' ? 'الهدية اليومية' : 'Daily',
      onClick: onOpenDaily,
      hot: dailyClaimable,
      badge: dailyClaimable ? { text: lang === 'ar' ? 'جاهزة' : 'ready', tone: 'red' } : undefined,
    },
    {
      key: 'missions',
      icon: '🎯',
      label: lang === 'ar' ? 'المهام' : 'Missions',
      onClick: onOpenMissions,
      hot: missionsClaimable > 0,
      badge: missionsClaimable > 0
        ? { text: `${missionsClaimable}`, tone: 'red' }
        : undefined,
    },
    {
      key: 'wheel',
      icon: wheelSpinnable ? '🎡' : '🎰',
      label: lang === 'ar' ? 'عجلة الحظ' : 'Wheel',
      onClick: onOpenWheel,
      hot: wheelSpinnable,
      badge: wheelSpinnable ? { text: lang === 'ar' ? 'لفّة' : 'spin', tone: 'gold' } : undefined,
    },
    {
      key: 'chests',
      icon: '🎁',
      label: lang === 'ar' ? 'الصناديق' : 'Chests',
      onClick: onOpenChests,
      hot: keysCount > 0,
      badge: keysCount > 0 ? { text: `${keysCount} 🗝️`, tone: 'purple' } : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
      {tiles.map(t => (
        <motion.button
          key={t.key}
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.96 }}
          onClick={t.onClick}
          className="relative rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all"
          style={{
            padding: '14px 10px 12px',
            background: t.hot
              ? 'linear-gradient(160deg, rgba(232,201,122,0.18) 0%, rgba(40,28,12,0.95) 100%)'
              : 'linear-gradient(160deg, rgba(255,255,255,0.05) 0%, rgba(20,16,10,0.85) 100%)',
            border: `1.5px solid ${t.hot ? 'rgba(232,201,122,0.55)' : 'rgba(201,168,76,0.18)'}`,
            boxShadow: t.hot
              ? '0 4px 16px rgba(0,0,0,0.45), 0 0 18px rgba(232,201,122,0.25)'
              : '0 2px 10px rgba(0,0,0,0.30)',
            cursor: 'pointer',
          }}>
          <div
            className="rounded-xl flex items-center justify-center"
            style={{
              width: 44, height: 44,
              background: t.hot
                ? 'radial-gradient(circle at 30% 30%, rgba(255,224,122,0.45), rgba(168,124,58,0.20) 70%)'
                : 'rgba(0,0,0,0.30)',
              border: `1px solid ${t.hot ? 'rgba(232,201,122,0.55)' : 'rgba(255,255,255,0.06)'}`,
              fontSize: 24,
            }}>
            {t.icon}
          </div>
          <p className="font-arabic font-bold"
            style={{ fontSize: 12, color: t.hot ? '#E8C97A' : 'rgba(245,230,200,0.78)', lineHeight: 1.1 }}>
            {t.label}
          </p>
          {t.badge && (
            <motion.span
              animate={t.badge.tone === 'red' ? { scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute rounded-full font-bold flex items-center justify-center"
              style={{
                top: 6, insetInlineEnd: 6,
                fontSize: 9, lineHeight: 1,
                padding: '3px 6px',
                background:
                  t.badge.tone === 'red'    ? '#E04030' :
                  t.badge.tone === 'gold'   ? '#E8C97A' :
                                              '#C495FF',
                color: t.badge.tone === 'gold' ? '#0E0905' : '#fff',
                border: '1.5px solid #14100A',
              }}>
              {t.badge.text}
            </motion.span>
          )}
        </motion.button>
      ))}
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
const AV_COLORS = ['#C9A84C','#4A90D9','#50C878','#E74C3C','#9B59B6','#E67E22','#1ABC9C','#E91E63'];
const HOME_AVATAR_EMOJIS: Record<string, string> = {
  avatar_1: '👳', avatar_2: '🧕', avatar_3: '👴', avatar_4: '🧔',
  avatar_5: '👩', avatar_6: '👨', avatar_7: '🧑', avatar_8: '👵',
  avatar_9: '🕌', avatar_10: '🏙️', avatar_11: '💎', avatar_12: '🌟',
  avatar_13: '⚔️', avatar_14: '⛵', avatar_15: '🧭', avatar_16: '🇦🇪',
  avatar_17: '👸', avatar_18: '🧕', avatar_19: '🤵', avatar_20: '👳', avatar_21: '👩', avatar_22: '🧓',
  avatar_23: '👩‍🎓', avatar_24: '👵', avatar_25: '👩‍🏫', avatar_26: '🧕', avatar_27: '👩‍⚕️', avatar_28: '👑',
};
function AvatarCircle({ id, name, size = 40, frameId }: { id: string; name: string; size?: number; frameId?: string }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} title={name}>
      <CharacterArt id={id} size={size}/>
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
// ── Game-kind picker: two prominent cards (Check vs Ludo) ────────────────────
// Lives at the top of the play area as the FIRST decision the player makes —
// "which game am I playing today?" — before any mode or config choices below.
const GAME_KIND_META: Record<GameType, { icon: string; ar: string; en: string; tagline: { ar: string; en: string }; accent: string; bg: string; glow: string }> = {
  check: {
    icon: '🃏',
    ar: 'تشيك', en: 'Check',
    tagline: { ar: 'لعبة الورق الإماراتية', en: 'Emirati card game' },
    accent: '#E8C97A',
    bg: 'linear-gradient(135deg, #2A1F12 0%, #14100A 100%)',
    glow: 'rgba(232,201,122,0.45)',
  },
  ludo: {
    icon: '🎲',
    ar: 'لودو', en: 'Ludo',
    tagline: { ar: 'سباق على الرمال', en: 'Race on the sands' },
    accent: '#D9A441',
    bg: 'linear-gradient(135deg, #2A1808 0%, #14100A 100%)',
    glow: 'rgba(217,164,65,0.45)',
  },
  domino:  { icon: '🁢', ar: 'دومنو', en: 'Domino', tagline: { ar: '', en: '' }, accent: '#9C8AFF', bg: '', glow: 'rgba(156,138,255,0.4)' },
  jackaro: { icon: '🂡', ar: 'جكارو', en: 'Jackaro', tagline: { ar: '', en: '' }, accent: '#FF8A65', bg: '', glow: 'rgba(255,138,101,0.4)' },
};

function GamePicker({ gameKind, onSelect, lang }: { gameKind: GameType; onSelect: (g: GameType) => void; lang: string }) {
  const order: GameType[] = ['check', 'ludo'];
  const isAr = lang === 'ar';
  return (
    <div className="flex flex-col gap-2">
      <p className="font-arabic text-center" style={{ fontSize: 11, color: 'rgba(245,230,200,0.45)', letterSpacing: 1 }}>
        {isAr ? 'اختر اللعبة' : 'Choose the game'}
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {order.map(g => {
          const isSel = gameKind === g;
          const m = GAME_KIND_META[g];
          return (
            <motion.button
              key={g}
              whileHover={!isSel ? { scale: 1.02, y: -1 } : {}}
              whileTap={{ scale: 0.97 }}
              onClick={() => { onSelect(g); soundService.playClick(); }}
              className="relative rounded-2xl font-arabic overflow-hidden transition-all"
              style={{
                padding: '14px 12px',
                background: isSel ? m.bg : 'rgba(255,255,255,0.025)',
                border: `2px solid ${isSel ? m.accent : 'rgba(255,255,255,0.08)'}`,
                boxShadow: isSel
                  ? `0 8px 24px rgba(0,0,0,0.5), 0 0 28px ${m.glow}, inset 0 1px 0 rgba(255,255,255,0.08)`
                  : '0 2px 6px rgba(0,0,0,0.25)',
                cursor: 'pointer',
              }}
            >
              {/* Glow halo behind icon */}
              {isSel && (
                <div className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 50% 30%, ${m.accent}22 0%, transparent 60%)`,
                  }} />
              )}
              <div className="relative flex flex-col items-center gap-1">
                <span style={{ fontSize: 32, lineHeight: 1, filter: isSel ? `drop-shadow(0 0 12px ${m.glow})` : 'none' }}>{m.icon}</span>
                <span className="font-bold" style={{ fontSize: 16, color: isSel ? m.accent : 'rgba(245,230,200,0.85)' }}>
                  {isAr ? m.ar : m.en}
                </span>
                <span style={{ fontSize: 10, color: isSel ? `${m.accent}AA` : 'rgba(245,230,200,0.35)' }}>
                  {isAr ? m.tagline.ar : m.tagline.en}
                </span>
              </div>
              {isSel && (
                <span className="absolute top-1.5 inset-inline-end-1.5"
                  style={{ insetInlineEnd: 6, top: 6, color: m.accent, fontSize: 11 }}>✓</span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function ModeChips({ mode, onSelect, lang }: { mode: GameMode; onSelect: (m: GameMode) => void; lang: string }) {
  const order: GameMode[] = ['online', 'private', 'bots'];
  return (
    <div
      className="grid grid-cols-3 gap-1 p-1"
      style={{
        background: 'linear-gradient(180deg, rgba(40,28,12,0.55), rgba(14,9,5,0.55))',
        border: '1px solid rgba(232,201,122,0.28)',
        borderRadius: 999,
        backdropFilter: 'blur(14px) saturate(120%)',
        WebkitBackdropFilter: 'blur(14px) saturate(120%)',
        boxShadow: '0 4px 18px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>
      {order.map(m => {
        const isSel = mode === m; const t = MODE_THEMES[m];
        return (
          <motion.button
            key={m}
            whileTap={{ scale: 0.95 }}
            onClick={() => { onSelect(m); soundService.playClick(); }}
            className="relative font-arabic font-bold flex items-center justify-center gap-1.5"
            style={{
              padding: '8px 6px',
              borderRadius: 999,
              background: isSel
                ? `radial-gradient(circle at 50% 35%, ${t.glow}, rgba(40,28,12,0.4) 75%)`
                : 'transparent',
              color: isSel ? t.accent : 'rgba(245,230,200,0.65)',
              fontSize: 11.5,
              cursor: 'pointer',
              transition: 'color .2s',
            }}>
            <span style={{ fontSize: 14 }}>{t.icon}</span>
            {t.label[lang === 'ar' ? 'ar' : 'en']}
            {isSel && (
              <motion.span
                layoutId="mode-chip-pip"
                className="absolute"
                style={{
                  bottom: 4, left: '50%', transform: 'translateX(-50%)',
                  width: 22, height: 2, borderRadius: 999,
                  background: t.accent,
                  boxShadow: `0 0 8px ${t.glow}`,
                }}
              />
            )}
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
    <div
      key={mode}
      className="relative overflow-hidden"
      style={{
        // Glass slab with the mode accent providing a soft tinted halo.
        background: `
          radial-gradient(ellipse 100% 60% at 50% 0%, ${t.glow} 0%, transparent 55%),
          linear-gradient(160deg, rgba(40,28,12,0.55) 0%, rgba(14,9,5,0.55) 100%)
        `,
        border: `1.5px solid ${t.accent}66`,
        backdropFilter: 'blur(16px) saturate(120%)',
        WebkitBackdropFilter: 'blur(16px) saturate(120%)',
        boxShadow: `0 18px 44px rgba(0,0,0,0.55), 0 0 36px ${t.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
        // Polygon-cut corners — the new shape language across the app.
        clipPath:
          'polygon(20px 0, calc(100% - 20px) 0, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0 calc(100% - 20px), 0 20px)',
      }}
    >
      {/* Top metallic sheen */}
      <span aria-hidden style={{
        position: 'absolute', top: 8, left: 24, right: 24, height: 1,
        background: `linear-gradient(90deg, transparent, ${t.glow}, transparent)`,
      }} />
      {/* Bottom metallic sheen */}
      <span aria-hidden style={{
        position: 'absolute', bottom: 8, left: 24, right: 24, height: 1,
        background: `linear-gradient(90deg, transparent, ${t.glow}, transparent)`,
        opacity: 0.6,
      }} />
      {/* Faint suit watermark */}
      <span aria-hidden="true" style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 280, lineHeight: 1, color: `${t.accent}10`, pointerEvents: 'none',
        fontFamily: 'Georgia, serif',
      }}>
        {t.suit}
      </span>
      <div className="relative" style={{ padding: '36px 22px 32px' }}>
        {children}
      </div>
    </div>
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
  const opts: { id: MatchLength; ar: string; en: string }[] = [
    { id: 'quick',    ar: 'سريع', en: 'Quick' },
    { id: 'standard', ar: 'عادي', en: 'Standard' },
    { id: 'long',     ar: 'طويل', en: 'Long' },
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
                padding: '10px 6px',
                background: sel ? `${accent}26` : 'rgba(255,255,255,0.04)',
                color: sel ? accent : 'rgba(245,230,200,0.55)',
                border: `1.5px solid ${sel ? `${accent}99` : 'rgba(255,255,255,0.08)'}`,
                boxShadow: sel ? `0 0 14px ${accent}55` : 'none',
                fontSize: 13, lineHeight: 1.25,
                cursor: 'pointer',
              }}>
              <div>{lang === 'ar' ? o.ar : o.en}</div>
              <div style={{ fontSize: 9.5, opacity: 0.75, marginTop: 2 }}>
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
  const isLudo = false; // Check-only on /home; Ludo lives behind /play-ludo.
  // Ludo only supports 2-4 colors. Cap player/bot counts when switching kinds
  // so a stale Check setting (e.g. 8 players) doesn't break room creation.
  const [playerCount, setPlayerCount] = useState(isLudo ? 4 : 4);
  const [coinAmount, setCoinAmount] = useState(50);
  const [botCount, setBotCount] = useState(isLudo ? 3 : 3);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [matchLength, setMatchLength] = useState<MatchLength>('standard');
  const theme = MODE_THEMES[mode];

  useEffect(() => {
    if (isLudo) {
      if (playerCount > 4) setPlayerCount(4);
      if (botCount > 3) setBotCount(3);
    }
  }, [isLudo]);

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

      {/* The giant playing card — no AnimatePresence/motion transition
          on the mode swap so flipping bots/private/online is truly
          instantaneous. The hover/idle inner micro-animations still
          run normally inside GiantPlayingCard. */}
      <div>
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
                  min={2} max={isLudo ? 4 : 10} accent={theme.accent} lang={lang}
                  label={lang === 'ar' ? 'عدد اللاعبين' : 'Players'} />
                <CoinStepper value={coinAmount} onChange={setCoinAmount}
                  accent={theme.accent} max={coins} lang={lang} />
                {!canAfford && (
                  <p className="text-red-400 font-arabic text-xs">
                    {lang === 'ar' ? 'كوينزك غير كافية!' : 'Not enough coins!'}
                  </p>
                )}
                {!isLudo && (
                  <MatchLengthPicker value={matchLength} onChange={setMatchLength} accent={theme.accent} lang={lang} />
                )}
              </>
            ) : (
              <>
                <PlayerStepper value={botCount} onChange={setBotCount}
                  min={1} max={isLudo ? 3 : 9} accent={theme.accent} lang={lang}
                  label={lang === 'ar' ? 'عدد البوتات' : 'Bots'} />
                <DifficultyCards value={difficulty} onChange={setDifficulty} lang={lang} />
                {!isLudo && (
                  <MatchLengthPicker value={matchLength} onChange={setMatchLength} accent={theme.accent} lang={lang} />
                )}
              </>
            )}
          </div>
        </GiantPlayingCard>
      </div>

      {/* Big neon CTA — polygon-cut, gradient fill, glowing edge ring,
          subtle moving sheen. Different shape from the standard
          rounded-rectangle button used everywhere else. */}
      <motion.button
        whileHover={isOk ? { scale: 1.02, y: -2 } : {}}
        whileTap={isOk ? { scale: 0.97 } : {}}
        onClick={handleCreate}
        disabled={!isOk}
        className="relative w-full font-arabic font-bold overflow-hidden"
        style={{
          padding: '20px 24px',
          fontSize: 20,
          letterSpacing: 2,
          background: isOk
            ? `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accent}DD 50%, ${theme.bg1} 100%)`
            : 'rgba(255,255,255,0.05)',
          color: isOk ? '#0E0905' : 'rgba(255,255,255,0.25)',
          border: `2px solid ${isOk ? theme.accent : 'rgba(255,255,255,0.08)'}`,
          boxShadow: isOk
            ? `0 16px 36px rgba(0,0,0,0.55), 0 0 36px ${theme.glow}, inset 0 -4px 14px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.18)`
            : 'none',
          cursor: isOk ? 'pointer' : 'not-allowed',
          textShadow: isOk ? '0 1px 2px rgba(0,0,0,0.25)' : 'none',
          // Polygon CTA so the button shape matches the new
          // BentoTile + GiantPlayingCard geometry.
          clipPath:
            'polygon(18px 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 18px 100%, 0 50%)',
        }}
      >
        {isOk && (
          <motion.span
            aria-hidden
            initial={{ x: '-120%' }}
            animate={{ x: '220%' }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute', top: 0, bottom: 0, width: '60%',
              background: 'linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.30) 50%, transparent 100%)',
            }}
          />
        )}
        <span className="relative z-10">▶ {ctaLabel}</span>
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
  const location = useLocation();
  const { profile } = useAuthStore();
  const { rooms, setRooms, currentRoom, setCurrentRoom } = useLobbyStore();
  const { addToast } = useUiStore();
  const [mode, setMode] = useState<GameMode>('bots');
  // /home is the Check-specific dashboard. Ludo has its own entry from the
  // landing-page game menu — we don't show the kind picker here anymore.
  const gameKind: GameType = 'check';
  const [showJoin, setShowJoin] = useState(false);
  const [searching, setSearching] = useState(false);
  const [botLoading, setBotLoading] = useState(false);
  const [searchRoomId, setSearchRoomId] = useState<string | null>(null);
  const [showDaily, setShowDaily] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [showWheel, setShowWheel] = useState(false);
  const [showChests, setShowChests] = useState(false);
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
    socket.on(SOCKET_EVENTS.TOURNAMENT_MATCH_START, (data: { gameId: string; gameType?: GameType }) => {
      navigate(`/game/${data.gameType || 'check'}/${data.gameId}`);
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
        gameType: gameKind,
        gameMode: cfg.matchLength,
      });
    } else if (cfg.type === 'private') {
      socket.emit(SOCKET_EVENTS.LOBBY_CREATE_ROOM, {
        name: `غرفة خاصة`,
        type: 'private',
        botCount: 0,
        botDifficulty: 'medium',
        gameType: gameKind,
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
        gameType: gameKind,
        betAmount: cfg.bet,
        maxPlayers: cfg.playerCount,
        gameMode: cfg.matchLength,
      });
      // Remember this config so Play-Again from a finished game can
      // re-enter matchmaking with the same settings.
      try {
        localStorage.setItem('check.lastMatchCfg', JSON.stringify({
          playerCount: cfg.playerCount,
          bet: cfg.bet,
          matchLength: cfg.matchLength,
        }));
      } catch {}
    }
  };

  // ── Auto-search after Play-Again ─────────────────────────────────────────
  // CheckBoard's Game-Over modal navigates here with state.autoPlay so the
  // user goes straight back into matchmaking without re-picking bet/players.
  // We pull the bet from localStorage (the last value the player chose); the
  // player count + match length come from the previous game's GameState.
  useEffect(() => {
    const ap = (location.state as any)?.autoPlay;
    if (!ap) return;
    // Clear the state so a back-button or page refresh doesn't re-trigger.
    navigate(location.pathname, { replace: true, state: null });
    let cfg: { playerCount: number; bet: number; matchLength: MatchLength };
    try {
      const last = JSON.parse(localStorage.getItem('check.lastMatchCfg') || 'null');
      cfg = {
        playerCount: ap.playerCount ?? last?.playerCount ?? 4,
        bet:         last?.bet ?? 50,
        matchLength: ap.matchLength ?? last?.matchLength ?? 'standard',
      };
    } catch {
      cfg = { playerCount: ap.playerCount ?? 4, bet: 50, matchLength: ap.matchLength ?? 'standard' };
    }
    // Cap bet at the player's current coin balance — otherwise the server
    // rejects the room and the user lands on Home with no feedback.
    const coinsNow = profile?.coins ?? 0;
    if (cfg.bet > coinsNow) {
      const tiers = [50, 100, 250, 500, 1000, 2500].filter(v => v <= coinsNow);
      cfg.bet = tiers.length ? tiers[tiers.length - 1] : 0;
    }
    setMode('online');
    handleCreate({ type: 'online', ...cfg });
  }, []);

  const coins = profile?.coins ?? 0;
  const level = profile?.ranking?.level ?? 1;
  const xp = profile?.ranking?.xp ?? 0;
  const wins = profile?.stats?.totalWins ?? 0;
  const games = profile?.stats?.totalGames ?? 0;

  return (
    <div className="min-h-screen relative" style={{ direction: dir, overflowX: 'hidden', paddingBottom: 96 }}>

      <Aurora />

      <div style={{ position: 'relative', zIndex: 1 }}>

      {/* ── Glass top bar — floating chrome above the aurora ── */}
      <div className="px-3 pt-3 mb-3">
        <GlassCard inner className="flex items-center justify-between gap-3" style={{ padding: '10px 12px' }}>
          {/* Left: language toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <LangToggle />
          </div>

          {/* Center: huge wordmark */}
          <Link to="/" className="flex flex-col items-center justify-center gap-0">
            <span className="font-display tracking-widest"
              style={{
                fontSize: 26, color: '#E8C97A',
                letterSpacing: '0.20em', lineHeight: 1,
                textShadow: '0 2px 12px rgba(232,201,122,0.45), 0 0 28px rgba(201,168,76,0.30)',
              }}>
              CHECK
            </span>
            {profile && (
              <span className="font-arabic mt-0.5" style={{ fontSize: 10, color: 'rgba(245,230,200,0.45)' }}>
                {lang === 'ar' ? `أهلاً, ${profile.displayName}` : `Hi, ${profile.displayName}`}
              </span>
            )}
          </Link>

          {/* Right: coin pill + rewards launcher (kept as floating circle) */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{
                background: 'linear-gradient(135deg, rgba(232,201,122,0.20), rgba(201,168,76,0.10))',
                border: '1.5px solid rgba(232,201,122,0.55)',
                boxShadow: 'inset 0 -2px 6px rgba(0,0,0,0.45), 0 0 12px rgba(232,201,122,0.20)',
              }}>
              <span style={{ fontSize: 14 }}>🪙</span>
              <span className="font-bold" style={{ fontSize: 12, color: '#E8C97A' }}>{coins.toLocaleString()}</span>
            </div>
            {profile && (
              <RewardsLauncher
                lang={lang}
                keysCount={(profile as any)?.keys || 0}
                onOpenDaily={() => setShowDaily(true)}
                onOpenMissions={() => { setProgressInitialTab('missions'); setShowProgress(true); }}
                onOpenWheel={() => setShowWheel(true)}
                onOpenChests={() => setShowChests(true)}
                profileXp={xp} profileWins={wins} profileGames={games}
                profileStreak={profile.stats?.currentStreak ?? 0}
              />
            )}
          </div>
        </GlassCard>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '8px 16px 24px' }}>

        {/* ── Hero — big avatar + huge gradient numerals for the player's
            three signature stats. Glassmorphism panel with the level
            badge floating off the avatar. */}
        {profile && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
            <GlassCard glow style={{ padding: '18px 16px 14px' }}>
              <div className="flex items-center gap-4 mb-4">
                <Link to="/profile" style={{ textDecoration: 'none' }} className="relative shrink-0">
                  <div className="rounded-full flex items-center justify-center"
                    style={{
                      width: 72, height: 72,
                      background: 'radial-gradient(circle at 30% 30%, rgba(232,201,122,0.55), rgba(40,28,12,0.55) 70%)',
                      border: '2px solid rgba(232,201,122,0.75)',
                      boxShadow: '0 0 22px rgba(232,201,122,0.45), inset 0 -3px 10px rgba(0,0,0,0.45)',
                      padding: 4,
                    }}>
                    <AvatarCircle id={profile.avatarId} name={profile.displayName} size={58} frameId={(profile.equippedItems as any)?.avatarFrame}/>
                  </div>
                  <div className="absolute rounded-full font-bold flex items-center justify-center"
                    style={{
                      bottom: -4, insetInlineEnd: -4, minWidth: 26, height: 26,
                      background: 'linear-gradient(135deg, #FFE9B0, #C9A84C)',
                      fontSize: 12, color: '#0E0905', fontWeight: 800,
                      border: '2px solid #14100A',
                      padding: '0 6px',
                      boxShadow: '0 0 14px rgba(232,201,122,0.65)',
                    }}>
                    {level}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <h2 className="font-display tracking-wider truncate"
                    style={{
                      fontSize: 22, color: '#FFE9B0',
                      letterSpacing: '0.06em', lineHeight: 1.05,
                      textShadow: '0 0 14px rgba(232,201,122,0.45)',
                    }}>{profile.displayName}</h2>
                  <p className="font-arabic truncate mt-1" style={{ fontSize: 11, color: 'rgba(245,230,200,0.55)' }}>
                    ⟡ {levelTitle(level, lang)}
                  </p>
                </div>
              </div>

              {/* Big neon numerals — three stats laid out as a triad. */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <NeonStat icon="🏆" value={wins}  label={lang === 'ar' ? 'فوز'   : 'wins'}    accent="gold"/>
                <NeonStat icon="🎮" value={games} label={lang === 'ar' ? 'لعبة'  : 'games'}   accent="cyan"/>
                <NeonStat icon="🔥" value={profile.stats?.currentStreak ?? 0} label={lang === 'ar' ? 'سلسلة' : 'streak'} accent="red"/>
              </div>

              <XpBar xp={xp} lang={lang} onClick={() => { setProgressInitialTab('levels'); setShowProgress(true); }}/>
            </GlassCard>
          </motion.div>
        )}

        {/* Quick-actions hex tiles — true polygon shapes, full-width grid */}
        {profile && !currentRoom && (
          <div className="grid grid-cols-3 gap-2.5 mb-5">
            <BentoTile
              icon="🏆"
              title={lang === 'ar' ? 'البطولات' : 'Cups'}
              sub={lang === 'ar' ? 'اربح جوائز' : 'Win prizes'}
              accent="gold"
              onClick={() => { soundService.playClick(); navigate('/tournaments'); }}
            />
            <BentoTile
              icon="🏰"
              title={profile?.clanTag ? `[${profile.clanTag}]` : (lang === 'ar' ? 'القبائل' : 'Clans')}
              sub={profile?.clanTag ? (lang === 'ar' ? 'قبيلتك' : 'Your clan') : (lang === 'ar' ? 'انضم' : 'Join')}
              accent="purple"
              onClick={() => { soundService.playClick(); navigate('/clans'); }}
            />
            <BentoTile
              icon="📖"
              title={lang === 'ar' ? 'القوانين' : 'Rules'}
              sub={lang === 'ar' ? 'كيف تلعب' : 'How to play'}
              accent="green"
              onClick={() => setShowRules(true)}
            />
          </div>
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

      </div>

      <JoinPrivateModal open={showJoin} onClose={() => setShowJoin(false)} onBeforeJoin={() => { pendingModeRef.current = 'private'; }}/>
      <DailyRewardModal open={showDaily} onClose={() => setShowDaily(false)}/>
      <RulesModal open={showRules} onClose={() => setShowRules(false)}/>
      <ProgressionModal open={showProgress} onClose={() => setShowProgress(false)} lang={lang} initialTab={progressInitialTab}/>
      <WheelModal open={showWheel} onClose={() => setShowWheel(false)} lang={lang}/>
      <ChestsModal open={showChests} onClose={() => setShowChests(false)} lang={lang}/>

      {searching && <SearchingModal onCancel={handleCancelSearch} lang={lang}/>}
      {botLoading && <BotLoadingOverlay lang={lang}/>}

      <FloatingDock lang={lang} />
    </div>
  );
}

