import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../services/api.service';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { soundService } from '../../services/sound.service';
import { useLang } from '../../i18n/useT';
import { UserProfile } from '@check-game/shared';

interface DailyReward {
  coins: number;
  frame?: string | null;
  kind?: 'normal' | 'milestone' | 'grand';
  characterId?: string;
  gems?: number;
}
interface StatusResp {
  day: number;             // index 0..29 — the cell we're about to claim
  canClaim: boolean;
  lastClaimDay: string | null;
  rewards: DailyReward[];
  streak: number;
  longestStreak: number;
}
interface ClaimResp {
  ok: true;
  coins: number;
  granted: DailyReward;
  nextDay: number;
  streak: number;
  longestStreak: number;
  profile: UserProfile;
}

export function DailyRewardModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lang = useLang();
  const isAr = lang === 'ar';
  const { setProfile } = useAuthStore();
  const { addToast } = useUiStore();
  const [status, setStatus] = useState<StatusResp | null>(null);
  const [stage, setStage] = useState<'idle' | 'ad' | 'claiming' | 'done'>('idle');
  const [adSecs, setAdSecs] = useState(5);
  const [granted, setGranted] = useState<DailyReward | null>(null);
  const [claimedStreak, setClaimedStreak] = useState<number>(0);

  useEffect(() => {
    if (!open) return;
    setStage('idle');
    setGranted(null);
    apiClient.get<StatusResp>('/api/daily/status').then(setStatus).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (stage !== 'ad') return;
    setAdSecs(5);
    const t = setInterval(() => setAdSecs(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [stage]);

  useEffect(() => {
    if (stage !== 'ad' || adSecs > 0) return;
    (async () => {
      setStage('claiming');
      try {
        const res = await apiClient.post<ClaimResp>('/api/daily/claim', {});
        setGranted(res.granted);
        setClaimedStreak(res.streak);
        if (res.profile) setProfile(res.profile);
        soundService.playCoins();
        setStage('done');
      } catch (e: any) {
        addToast(e?.message || 'error', 'error');
        setStage('idle');
      }
    })();
  }, [adSecs, stage, addToast, setProfile]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="daily-bg"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(20,14,8,0.85)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, y: 20 }}
          onClick={e => e.stopPropagation()}
          className="relative rounded-3xl border border-gold/30 w-full"
          style={{
            background: 'linear-gradient(160deg, #241810 0%, #0E0905 100%)',
            maxWidth: 520,
            padding: '20px 18px',
            boxShadow: '0 20px 80px rgba(0,0,0,0.85), 0 0 50px rgba(201,168,76,0.12)',
            maxHeight: '92vh',
            overflowY: 'auto',
          }}>
          <button onClick={onClose}
            className="absolute top-3 left-3 text-sand/40 hover:text-sand text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5"
            aria-label={isAr ? 'إغلاق' : 'Close'}>×</button>

          {stage === 'idle' && status && (
            <CalendarView
              status={status}
              isAr={isAr}
              onClaim={() => setStage('ad')}
            />
          )}

          {stage === 'ad' && (
            <div className="text-center py-6">
              <div className="text-xs font-arabic text-sand/40 mb-2">{isAr ? 'إعلان' : 'Advertisement'}</div>
              <div className="rounded-2xl border border-white/10 mb-5 flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.04)', height: 200 }}>
                <div className="text-center">
                  <div className="text-5xl mb-2 animate-pulse">📺</div>
                  <p className="text-sand/60 font-arabic text-sm">{isAr ? 'إعلان تجريبي' : 'Test Ad'}</p>
                </div>
              </div>
              <div className="rounded-full inline-flex items-center justify-center font-bold text-2xl"
                style={{ width: 64, height: 64, background: 'rgba(201,168,76,0.12)', border: '2px solid #C9A84C', color: '#E8C97A' }}>
                {adSecs}
              </div>
              <p className="text-sand/50 font-arabic text-sm mt-3">
                {isAr ? `سيتم تسليم الهدية بعد ${adSecs} ث` : `Reward in ${adSecs}s`}
              </p>
            </div>
          )}

          {stage === 'claiming' && (
            <div className="text-center py-12">
              <div className="text-3xl mb-3 animate-spin">⏳</div>
              <p className="text-sand/60 font-arabic">{isAr ? 'جاري التحميل…' : 'Loading…'}</p>
            </div>
          )}

          {stage === 'done' && granted && (
            <DoneView granted={granted} isAr={isAr} streak={claimedStreak} onClose={onClose} />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Calendar — 30 cells laid out 5 × 6 ──────────────────────────────────────
function CalendarView({ status, isAr, onClaim }: { status: StatusResp; isAr: boolean; onClaim: () => void }) {
  return (
    <>
      <div className="text-center mb-3">
        <div className="text-4xl mb-1">🎁</div>
        <h2 className="font-arabic text-xl font-bold" style={{ color: '#E8C97A' }}>
          {isAr ? 'الهدية اليومية' : 'Daily Reward'}
        </h2>
        <p className="text-sand/50 font-arabic text-xs mt-0.5">
          {isAr ? '٣٠ يوم — كل يوم جائزة أكبر' : '30 days — each day a bigger prize'}
        </p>
      </div>

      {/* Streak banner */}
      <div className="rounded-2xl px-3 py-2.5 mb-4 flex items-center justify-between"
        style={{
          background: 'linear-gradient(135deg, rgba(232,144,58,0.15), rgba(201,168,76,0.05))',
          border: '1px solid rgba(232,144,58,0.35)',
        }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 22 }}>🔥</span>
          <div>
            <p className="font-arabic font-bold" style={{ fontSize: 13, color: '#E8903A' }}>
              {isAr ? `${status.streak} يوم متتالي` : `${status.streak}-day streak`}
            </p>
            <p className="font-arabic" style={{ fontSize: 10, color: 'rgba(245,230,200,0.5)' }}>
              {isAr ? `أطول سلسلة ${status.longestStreak}` : `longest ${status.longestStreak}`}
            </p>
          </div>
        </div>
        {!status.canClaim && (
          <span className="font-arabic rounded-md px-2 py-1"
            style={{ background: 'rgba(122,199,79,0.18)', color: '#7AC74F', fontSize: 10 }}>
            ✓ {isAr ? 'تم اليوم' : 'claimed'}
          </span>
        )}
      </div>

      {/* 30-day grid */}
      <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 mb-4">
        {status.rewards.map((r, i) => {
          const isClaimed = i < status.day;
          const isToday   = i === status.day && status.canClaim;
          const isLocked  = i > status.day || (i === status.day && !status.canClaim);
          const isGrand    = r.kind === 'grand';
          const isMilestone = r.kind === 'milestone' || isGrand;

          let bg = 'rgba(255,255,255,0.03)';
          let border = 'rgba(255,255,255,0.06)';
          let coinColor = 'rgba(245,230,200,0.45)';
          if (isToday) {
            bg = 'rgba(201,168,76,0.15)';
            border = '#C9A84C';
            coinColor = '#E8C97A';
          } else if (isClaimed) {
            bg = 'rgba(80,200,120,0.06)';
            border = 'rgba(80,200,120,0.30)';
            coinColor = '#7AC74F';
          } else if (isMilestone) {
            bg = isGrand
              ? 'linear-gradient(135deg, rgba(196,149,255,0.20), rgba(232,144,58,0.10))'
              : 'rgba(232,144,58,0.10)';
            border = isGrand ? 'rgba(196,149,255,0.55)' : 'rgba(232,144,58,0.40)';
            coinColor = isGrand ? '#C495FF' : '#E8903A';
          }

          return (
            <div key={i} className="rounded-xl p-1.5 text-center relative"
              style={{
                background: bg,
                border: `1.5px solid ${border}`,
                boxShadow: isToday ? '0 0 16px rgba(201,168,76,0.30)' : 'none',
                opacity: isLocked && !isMilestone ? 0.65 : 1,
                minHeight: 64,
                transition: 'all .2s',
              }}>
              <div className="font-arabic" style={{ fontSize: 8, color: 'rgba(245,230,200,0.4)', lineHeight: 1.1 }}>
                {isAr ? `يوم ${i + 1}` : `D${i + 1}`}
              </div>
              <div style={{ fontSize: isGrand ? 18 : isMilestone ? 16 : 14, lineHeight: 1.1, marginTop: 2 }}>
                {r.characterId ? '👑' : r.frame ? '🖼️' : r.gems ? '💎' : '🪙'}
              </div>
              <div className="font-bold font-mono"
                style={{ fontSize: 9, color: coinColor, lineHeight: 1.1, marginTop: 1 }}>
                {r.coins.toLocaleString()}
              </div>
              {r.gems && (
                <div className="font-mono"
                  style={{ fontSize: 8, color: '#9DD8E8', lineHeight: 1.1, marginTop: 1 }}>
                  +{r.gems}💎
                </div>
              )}
              {isClaimed && (
                <div className="absolute" style={{ top: 2, insetInlineEnd: 4, color: '#7AC74F', fontSize: 9 }}>✓</div>
              )}
              {isToday && (
                <div className="absolute -bottom-1 left-0 right-0 flex justify-center">
                  <span className="rounded-full" style={{
                    width: 6, height: 6, background: '#E8C97A',
                    boxShadow: '0 0 8px #E8C97A',
                    animation: 'pulse 1.4s ease-in-out infinite',
                  }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {status.canClaim ? (
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={onClaim}
          className="w-full py-3 rounded-xl font-arabic font-bold"
          style={{
            background: 'linear-gradient(135deg, #C9A84C, #8B6914)',
            color: '#0E0905',
            boxShadow: '0 0 20px rgba(201,168,76,0.35)',
          }}>
          {isAr ? `استلم جائزة اليوم ${status.day + 1}` : `Claim day ${status.day + 1} reward`}
        </motion.button>
      ) : (
        <div className="w-full py-3 rounded-xl text-center font-arabic text-sm"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(245,230,200,0.5)' }}>
          {isAr ? 'تم استلام هدية اليوم · ارجع غداً للحفاظ على السلسلة' : 'Today\'s claim done · come back tomorrow to keep the streak'}
        </div>
      )}
    </>
  );
}

// ─── Done view ───────────────────────────────────────────────────────────────
function DoneView({ granted, isAr, streak, onClose }: { granted: DailyReward; isAr: boolean; streak: number; onClose: () => void }) {
  const isMilestone = granted.kind === 'milestone' || granted.kind === 'grand';
  return (
    <div className="text-center py-4">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}
        className="text-7xl mb-3">
        {granted.kind === 'grand' ? '👑' : isMilestone ? '✨' : '🎉'}
      </motion.div>
      <h2 className="font-arabic font-bold text-2xl mb-1" style={{ color: '#E8C97A' }}>
        {isAr ? 'مبروك!' : 'Congrats!'}
      </h2>
      <p className="text-sand/60 font-arabic mb-4">
        {isAr ? `يوم ${streak} متتالي 🔥` : `${streak}-day streak 🔥`}
      </p>

      <div className="rounded-2xl border border-gold/30 p-4 mb-4 inline-flex flex-col items-center gap-2"
        style={{ background: 'rgba(201,168,76,0.08)', minWidth: 220 }}>
        <div className="flex items-center gap-2 text-2xl">
          <span>🪙</span>
          <span className="font-mono font-bold" style={{ color: '#E8C97A' }}>+{granted.coins.toLocaleString()}</span>
        </div>
        {granted.gems && (
          <div className="flex items-center gap-2 text-base font-arabic" style={{ color: '#9DD8E8' }}>
            <span>💎</span>
            <span>+{granted.gems} {isAr ? 'جوهرة' : 'gems'}</span>
          </div>
        )}
        {granted.frame && (
          <div className="flex items-center gap-2 text-base font-arabic" style={{ color: '#7AC74F' }}>
            <span>🖼️</span>
            <span>{isAr ? 'إطار جديد!' : 'New frame!'}</span>
          </div>
        )}
        {granted.characterId && (
          <div className="flex items-center gap-2 text-base font-arabic" style={{ color: '#C495FF' }}>
            <span>👑</span>
            <span>{isAr ? 'شخصية أسطورية!' : 'Legendary character!'}</span>
          </div>
        )}
      </div>

      <button onClick={onClose}
        className="w-full py-3 rounded-xl font-arabic font-bold"
        style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', color: '#E8C97A' }}>
        {isAr ? 'استمتع' : 'Awesome'}
      </button>
    </div>
  );
}
