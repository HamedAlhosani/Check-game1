import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../services/api.service';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { soundService } from '../../services/sound.service';
import { useLang } from '../../i18n/useT';
import { UserProfile } from '@check-game/shared';

interface DailyReward { coins: number; frame: string | null; }
interface StatusResp { day: number; canClaim: boolean; lastClaimDay: string | null; rewards: DailyReward[]; }
interface ClaimResp { ok: true; coins: number; granted: DailyReward; nextDay: number; profile: UserProfile; }

export function DailyRewardModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lang = useLang();
  const isAr = lang === 'ar';
  const { setProfile } = useAuthStore();
  const { addToast } = useUiStore();
  const [status, setStatus] = useState<StatusResp | null>(null);
  const [stage, setStage] = useState<'idle' | 'ad' | 'claiming' | 'done'>('idle');
  const [adSecs, setAdSecs] = useState(5);
  const [granted, setGranted] = useState<DailyReward | null>(null);

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
          style={{ background: 'linear-gradient(160deg, #241810 0%, #0E0905 100%)', maxWidth: 460, padding: '24px 22px', boxShadow: '0 20px 80px rgba(0,0,0,0.85), 0 0 50px rgba(201,168,76,0.12)' }}
        >
          <button onClick={onClose} className="absolute top-3 left-3 text-sand/40 hover:text-sand text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5">×</button>

          {stage === 'idle' && status && (
            <>
              <div className="text-center mb-5">
                <div className="text-5xl mb-2">🎁</div>
                <h2 className="font-arabic text-2xl font-bold" style={{ color: '#E8C97A' }}>
                  {isAr ? 'الهدية اليومية' : 'Daily Reward'}
                </h2>
                <p className="text-sand/50 font-arabic text-sm mt-1">
                  {isAr ? 'ادخل كل يوم واستلم هدية مجانية' : 'Log in daily to claim a free reward'}
                </p>
              </div>

              <div className="grid grid-cols-7 gap-1.5 mb-5">
                {status.rewards.map((r, i) => {
                  const isClaimed = i < status.day;
                  const isToday = i === status.day && status.canClaim;
                  return (
                    <div key={i} className="flex flex-col items-center rounded-xl border p-1.5"
                      style={{
                        borderColor: isToday ? '#C9A84C' : isClaimed ? 'rgba(80,200,120,0.4)' : 'rgba(255,255,255,0.08)',
                        background: isToday ? 'rgba(201,168,76,0.12)' : isClaimed ? 'rgba(80,200,120,0.05)' : 'rgba(255,255,255,0.025)',
                        boxShadow: isToday ? '0 0 16px rgba(201,168,76,0.25)' : 'none',
                      }}>
                      <div className="text-[9px] font-arabic" style={{ color: isToday ? '#E8C97A' : 'rgba(245,230,200,0.4)' }}>
                        {isAr ? `يوم ${i + 1}` : `D${i + 1}`}
                      </div>
                      <div className="text-base">{r.frame ? '🖼️' : '🪙'}</div>
                      <div className="text-[10px] font-bold font-mono" style={{ color: isToday ? '#E8C97A' : isClaimed ? '#7AE08A' : 'rgba(245,230,200,0.4)' }}>
                        {r.frame ? '+' : r.coins}
                      </div>
                      {isClaimed && <div className="text-[8px] text-emerald-400">✓</div>}
                    </div>
                  );
                })}
              </div>

              {status.canClaim ? (
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setStage('ad')}
                  className="w-full py-3.5 rounded-xl font-arabic font-bold"
                  style={{ background: 'linear-gradient(135deg, #C9A84C, #8B6914)', color: '#0E0905', boxShadow: '0 0 20px rgba(201,168,76,0.35)' }}>
                  {isAr ? 'شاهد إعلاناً واستلم الهدية' : 'Watch Ad & Claim'}
                </motion.button>
              ) : (
                <div className="w-full py-3 rounded-xl text-center font-arabic text-sm"
                  style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(245,230,200,0.5)' }}>
                  {isAr ? 'تم استلام هدية اليوم · ارجع غداً' : 'Today\'s reward claimed · come back tomorrow'}
                </div>
              )}
            </>
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
            <div className="text-center py-6">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}
                className="text-7xl mb-3">🎉</motion.div>
              <h2 className="font-arabic font-bold text-2xl mb-1" style={{ color: '#E8C97A' }}>
                {isAr ? 'مبروك!' : 'Congrats!'}
              </h2>
              <p className="text-sand/60 font-arabic mb-4">
                {isAr ? 'هديتك اليومية:' : 'Your daily reward:'}
              </p>
              <div className="rounded-2xl border border-gold/30 p-5 mb-5 inline-flex flex-col items-center gap-2"
                style={{ background: 'rgba(201,168,76,0.08)' }}>
                <div className="flex items-center gap-2 text-3xl">
                  <span>🪙</span>
                  <span className="font-mono font-bold" style={{ color: '#E8C97A' }}>+{granted.coins}</span>
                </div>
                {granted.frame && (
                  <div className="flex items-center gap-2 text-base font-arabic mt-1" style={{ color: '#7AE08A' }}>
                    <span>🖼️</span>
                    <span>{isAr ? 'إطار جديد!' : 'New frame!'}</span>
                  </div>
                )}
              </div>
              <button onClick={onClose}
                className="w-full py-3 rounded-xl font-arabic font-bold"
                style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', color: '#E8C97A' }}>
                {isAr ? 'استمتع' : 'Awesome'}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
