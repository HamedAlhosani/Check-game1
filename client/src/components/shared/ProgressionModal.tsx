import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../services/api.service';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { soundService } from '../../services/sound.service';
import type { UserProfile } from '@check-game/shared';

interface MissionItem {
  id: string;
  emoji: string;
  labelAr: string;
  labelEn: string;
  target: number;
  rewardCoins: number;
  progress: number;
  claimed: boolean;
  complete: boolean;
}
interface AchievementItem {
  id: string;
  emoji: string;
  labelAr: string; labelEn: string;
  descAr: string;  descEn: string;
  target: number;
  rewardCoins: number;
  progress: number;
  complete: boolean;
  claimed: boolean;
}
interface LevelRewardItem {
  level: number;
  rewardCoins: number;
  rewardItemId?: string;
  rewardItemNameAr?: string;
  rewardItemNameEn?: string;
  reached: boolean;
  claimed: boolean;
}
interface ProgressionData {
  missions: { date: string; items: MissionItem[] };
  achievements: AchievementItem[];
  levelRewards: LevelRewardItem[];
  level: number;
  xp: number;
  xpInLevel: number;
  xpForNextLevel: number;
}

type Tab = 'missions' | 'achievements' | 'levels';

export function ProgressionModal({ open, onClose, lang, initialTab = 'missions' }: {
  open: boolean;
  onClose: () => void;
  lang: string;
  initialTab?: Tab;
}) {
  const [data, setData] = useState<ProgressionData | null>(null);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [busy, setBusy] = useState<string | null>(null);
  const { setProfile } = useAuthStore();
  const { addToast } = useUiStore();

  const refresh = useCallback(async () => {
    try {
      const d = await apiClient.get<ProgressionData>('/api/progression');
      setData(d);
    } catch {
      // silent — modal will stay empty
    }
  }, []);

  useEffect(() => { if (open) { setTab(initialTab); refresh(); } }, [open, initialTab, refresh]);

  async function claim(path: string, body: any, key: string) {
    if (busy) return;
    setBusy(key);
    soundService.playClick();
    try {
      const res = await apiClient.post<{ profile: UserProfile; granted: number; itemGranted?: string }>(path, body);
      if (res?.profile) setProfile(res.profile);
      soundService.playCoins();
      addToast(
        lang === 'ar'
          ? `+${res.granted.toLocaleString()} كوينز 🪙${res.itemGranted ? ' + عنصر جديد ✨' : ''}`
          : `+${res.granted.toLocaleString()} coins 🪙${res.itemGranted ? ' + new item ✨' : ''}`,
        'success'
      );
      await refresh();
    } catch (e: any) {
      soundService.playError();
      addToast(e?.message || 'error', 'error');
    } finally {
      setBusy(null);
    }
  }

  if (!open) return null;

  const claimableMissions     = data?.missions.items.filter(m => m.complete && !m.claimed).length ?? 0;
  const claimableAchievements = data?.achievements.filter(a => a.complete && !a.claimed).length ?? 0;
  const claimableLevels       = data?.levelRewards.filter(r => r.reached && !r.claimed).length ?? 0;

  const tabs: { id: Tab; label: string; emoji: string; badge: number }[] = [
    { id: 'missions',     emoji: '🎯', badge: claimableMissions,     label: lang === 'ar' ? 'المهام'     : 'Missions' },
    { id: 'achievements', emoji: '🏆', badge: claimableAchievements, label: lang === 'ar' ? 'الإنجازات' : 'Achievements' },
    { id: 'levels',       emoji: '⭐', badge: claimableLevels,       label: lang === 'ar' ? 'المستويات' : 'Levels' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-3"
        style={{ background: 'rgba(0,0,0,0.72)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-lg rounded-3xl flex flex-col overflow-hidden"
          style={{
            maxHeight: '88vh',
            background: 'linear-gradient(180deg, #1A1408 0%, #0E0905 100%)',
            border: '1px solid rgba(201,168,76,0.35)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(201,168,76,0.18)',
          }}
        >
          {/* Header — level + XP bar */}
          <div className="px-5 pt-5 pb-3" style={{ borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 22 }}>📈</span>
                <h2 className="font-arabic font-bold" style={{ fontSize: 18, color: '#E8C97A' }}>
                  {lang === 'ar' ? 'تقدّمك' : 'Your Progress'}
                </h2>
              </div>
              <button onClick={onClose}
                className="rounded-lg w-8 h-8 flex items-center justify-center text-xl"
                style={{ color: 'rgba(245,230,200,0.5)', background: 'rgba(255,255,255,0.04)' }}
              >×</button>
            </div>

            {data && (
              <>
                <div className="flex items-baseline justify-between mb-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold" style={{ fontSize: 22, color: '#C9A84C' }}>
                      {lang === 'ar' ? 'لفل' : 'LVL'} {data.level}
                    </span>
                  </div>
                  <span className="font-mono" style={{ fontSize: 12, color: 'rgba(245,230,200,0.55)' }}>
                    {data.xpInLevel.toLocaleString()} / {data.xpForNextLevel.toLocaleString()} XP
                  </span>
                </div>
                <div style={{
                  height: 10, borderRadius: 6,
                  background: 'rgba(201,168,76,0.12)',
                  border: '1px solid rgba(201,168,76,0.18)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${Math.max(2, Math.min(100, (data.xpInLevel / Math.max(1, data.xpForNextLevel)) * 100))}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #8B6914, #E8C97A, #FFE07A)',
                    boxShadow: '0 0 12px rgba(232,201,122,0.55)',
                    transition: 'width .4s ease',
                  }}/>
                </div>
              </>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 px-3 pt-3 pb-2" style={{ borderBottom: '1px solid rgba(201,168,76,0.10)' }}>
            {tabs.map(tb => {
              const active = tab === tb.id;
              return (
                <button
                  key={tb.id}
                  onClick={() => { setTab(tb.id); soundService.playClick(); }}
                  className="relative flex-1 rounded-xl py-2 text-sm font-arabic font-bold transition-all"
                  style={{
                    background: active ? 'rgba(201,168,76,0.18)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${active ? 'rgba(201,168,76,0.55)' : 'rgba(255,255,255,0.06)'}`,
                    color: active ? '#E8C97A' : 'rgba(245,230,200,0.5)',
                    boxShadow: active ? '0 0 12px rgba(201,168,76,0.20)' : 'none',
                  }}
                >
                  <span style={{ marginInlineEnd: 4 }}>{tb.emoji}</span>{tb.label}
                  {tb.badge > 0 && (
                    <span className="absolute -top-1 -right-1 rounded-full font-bold"
                      style={{
                        minWidth: 18, height: 18, padding: '0 5px',
                        background: '#E04030', color: '#fff',
                        fontSize: 10, lineHeight: '18px',
                        border: '2px solid #1A1408',
                      }}>{tb.badge}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-3 py-3" style={{ minHeight: 200 }}>
            {!data ? (
              <div className="text-center py-10 font-arabic" style={{ color: 'rgba(245,230,200,0.4)', fontSize: 13 }}>
                {lang === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}
              </div>
            ) : tab === 'missions' ? (
              <div className="flex flex-col gap-2">
                <p className="text-center font-arabic mb-1"
                  style={{ fontSize: 11, color: 'rgba(245,230,200,0.4)' }}>
                  {lang === 'ar' ? '✨ مهام جديدة كل يوم — العب وحقق المهام واربح كوينز' : '✨ Fresh missions daily — play, complete, earn coins'}
                </p>
                {data.missions.items.map(m => (
                  <ProgressRow
                    key={m.id}
                    emoji={m.emoji}
                    title={lang === 'ar' ? m.labelAr : m.labelEn}
                    progress={m.progress}
                    target={m.target}
                    rewardCoins={m.rewardCoins}
                    complete={m.complete}
                    claimed={m.claimed}
                    busy={busy === `m_${m.id}`}
                    onClaim={() => claim('/api/progression/missions/claim', { id: m.id }, `m_${m.id}`)}
                    lang={lang}
                  />
                ))}
              </div>
            ) : tab === 'achievements' ? (
              <div className="flex flex-col gap-2">
                {data.achievements.map(a => (
                  <ProgressRow
                    key={a.id}
                    emoji={a.emoji}
                    title={lang === 'ar' ? a.labelAr : a.labelEn}
                    subtitle={lang === 'ar' ? a.descAr : a.descEn}
                    progress={a.progress}
                    target={a.target}
                    rewardCoins={a.rewardCoins}
                    complete={a.complete}
                    claimed={a.claimed}
                    busy={busy === `a_${a.id}`}
                    onClaim={() => claim('/api/progression/achievements/claim', { id: a.id }, `a_${a.id}`)}
                    lang={lang}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-center font-arabic mb-1"
                  style={{ fontSize: 11, color: 'rgba(245,230,200,0.4)' }}>
                  {lang === 'ar' ? '⭐ لكل مستوى مكافأة — اربح XP من المباريات' : '⭐ Each level has a reward — earn XP from matches'}
                </p>
                {data.levelRewards.map(r => (
                  <LevelRow
                    key={r.level}
                    item={r}
                    currentLevel={data.level}
                    busy={busy === `l_${r.level}`}
                    onClaim={() => claim('/api/progression/levels/claim', { level: r.level }, `l_${r.level}`)}
                    lang={lang}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Single mission/achievement row with bar + claim ─────────────────────────
function ProgressRow({
  emoji, title, subtitle, progress, target, rewardCoins,
  complete, claimed, busy, onClaim, lang,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
  progress: number;
  target: number;
  rewardCoins: number;
  complete: boolean;
  claimed: boolean;
  busy: boolean;
  onClaim: () => void;
  lang: string;
}) {
  const pct = Math.min(100, (progress / Math.max(1, target)) * 100);
  return (
    <div className="rounded-2xl p-3 flex items-center gap-3"
      style={{
        background: claimed
          ? 'rgba(80,200,120,0.05)'
          : complete
            ? 'rgba(201,168,76,0.10)'
            : 'rgba(255,255,255,0.03)',
        border: `1px solid ${claimed ? 'rgba(80,200,120,0.25)' : complete ? 'rgba(201,168,76,0.45)' : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      <div className="flex items-center justify-center rounded-xl shrink-0"
        style={{
          width: 44, height: 44,
          fontSize: 24,
          background: claimed ? 'rgba(80,200,120,0.15)' : 'rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>{emoji}</div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <p className="font-arabic font-bold truncate"
            style={{ fontSize: 13, color: claimed ? 'rgba(80,200,120,0.85)' : '#E8C97A' }}>
            {title}
          </p>
          <span className="font-mono shrink-0"
            style={{ fontSize: 10, color: 'rgba(245,230,200,0.45)' }}>
            {progress}/{target}
          </span>
        </div>
        {subtitle && (
          <p className="font-arabic mb-1 truncate"
            style={{ fontSize: 10, color: 'rgba(245,230,200,0.4)' }}>
            {subtitle}
          </p>
        )}
        <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
          <div style={{
            width: `${pct}%`,
            height: '100%',
            background: claimed
              ? 'linear-gradient(90deg, #4A8E60, #80E0A0)'
              : complete
                ? 'linear-gradient(90deg, #8B6914, #E8C97A, #FFE07A)'
                : 'linear-gradient(90deg, #6B4A14, #A07830)',
            transition: 'width .35s ease',
          }}/>
        </div>
      </div>

      <div className="shrink-0">
        {claimed ? (
          <div className="rounded-lg px-2.5 py-1.5 font-arabic font-bold"
            style={{ background: 'rgba(80,200,120,0.1)', color: 'rgba(80,200,120,0.85)', fontSize: 11, border: '1px solid rgba(80,200,120,0.3)' }}>
            ✓ {lang === 'ar' ? 'استلمت' : 'Claimed'}
          </div>
        ) : complete ? (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onClaim}
            disabled={busy}
            className="rounded-lg px-3 py-1.5 font-arabic font-bold flex items-center gap-1 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #C9A84C, #A07830)',
              color: '#0E0905',
              fontSize: 11,
              boxShadow: '0 0 14px rgba(201,168,76,0.45)',
            }}>
            {busy ? '...' : <>🪙 {rewardCoins.toLocaleString()}</>}
          </motion.button>
        ) : (
          <div className="font-arabic flex items-center gap-1"
            style={{ fontSize: 11, color: 'rgba(201,168,76,0.55)' }}>
            🪙 {rewardCoins.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Level reward row — shows item too ───────────────────────────────────────
function LevelRow({
  item, currentLevel, busy, onClaim, lang,
}: {
  item: LevelRewardItem;
  currentLevel: number;
  busy: boolean;
  onClaim: () => void;
  lang: string;
}) {
  const itemName = lang === 'ar' ? item.rewardItemNameAr : item.rewardItemNameEn;
  return (
    <div className="rounded-2xl p-3 flex items-center gap-3"
      style={{
        background: item.claimed
          ? 'rgba(80,200,120,0.05)'
          : item.reached
            ? 'rgba(201,168,76,0.10)'
            : 'rgba(255,255,255,0.025)',
        border: `1px solid ${item.claimed ? 'rgba(80,200,120,0.25)' : item.reached ? 'rgba(201,168,76,0.45)' : 'rgba(255,255,255,0.05)'}`,
        opacity: !item.reached ? 0.7 : 1,
      }}
    >
      <div className="flex items-center justify-center rounded-xl shrink-0 font-bold"
        style={{
          width: 44, height: 44,
          fontSize: 16,
          background: item.reached ? 'linear-gradient(135deg, #C9A84C, #6B4A14)' : 'rgba(0,0,0,0.3)',
          color: item.reached ? '#0E0905' : 'rgba(245,230,200,0.4)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: item.reached && !item.claimed ? '0 0 12px rgba(201,168,76,0.4)' : 'none',
        }}>{item.level}</div>

      <div className="flex-1 min-w-0">
        <p className="font-arabic font-bold truncate"
          style={{ fontSize: 13, color: item.claimed ? 'rgba(80,200,120,0.85)' : '#E8C97A' }}>
          {lang === 'ar' ? `مستوى ${item.level}` : `Level ${item.level}`}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-arabic" style={{ fontSize: 11, color: 'rgba(245,230,200,0.65)' }}>
            🪙 {item.rewardCoins.toLocaleString()}
          </span>
          {itemName && (
            <span className="font-arabic" style={{ fontSize: 11, color: 'rgba(196,149,255,0.85)' }}>
              + ✨ {itemName}
            </span>
          )}
        </div>
      </div>

      <div className="shrink-0">
        {item.claimed ? (
          <div className="rounded-lg px-2.5 py-1.5 font-arabic font-bold"
            style={{ background: 'rgba(80,200,120,0.1)', color: 'rgba(80,200,120,0.85)', fontSize: 11, border: '1px solid rgba(80,200,120,0.3)' }}>
            ✓ {lang === 'ar' ? 'استلمت' : 'Claimed'}
          </div>
        ) : item.reached ? (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onClaim}
            disabled={busy}
            className="rounded-lg px-3 py-1.5 font-arabic font-bold disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #C9A84C, #A07830)',
              color: '#0E0905',
              fontSize: 11,
              boxShadow: '0 0 14px rgba(201,168,76,0.45)',
            }}>
            {busy ? '...' : (lang === 'ar' ? 'استلام' : 'Claim')}
          </motion.button>
        ) : (
          <div className="font-arabic" style={{ fontSize: 10, color: 'rgba(245,230,200,0.4)' }}>
            🔒 {lang === 'ar' ? `لفل ${item.level}` : `LVL ${item.level}`}
          </div>
        )}
      </div>
    </div>
  );
}
