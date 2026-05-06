import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../services/api.service';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { soundService } from '../../services/sound.service';
import { Confetti } from './Confetti';
import type { UserProfile, ChestDef, ChestTier } from '@check-game/shared';

interface OpenResult {
  coins: number;
  itemGranted?: string;
  itemNameAr?: string;
  itemRarity?: string;
  newKeyBalance: number;
  newCoinBalance: number;
  profile: UserProfile;
}

const TIER_THEME: Record<ChestTier, { fill: string; border: string; glow: string; shine: string }> = {
  wooden: { fill: '#5C3A1F', border: '#8B6233', glow: 'rgba(139,98,51,0.4)',  shine: '#C49A66' },
  silver: { fill: '#3A4452', border: '#9AA8B8', glow: 'rgba(154,168,184,0.5)', shine: '#E8EEF7' },
  gold:   { fill: '#5A4A18', border: '#FFE07A', glow: 'rgba(255,224,122,0.55)', shine: '#FFF1B0' },
  dragon: { fill: '#3A1F4A', border: '#C495FF', glow: 'rgba(196,149,255,0.65)', shine: '#E2C2FF' },
};

export function ChestsModal({ open, onClose, lang }: { open: boolean; onClose: () => void; lang: string }) {
  const [chests, setChests] = useState<ChestDef[]>([]);
  const [keys, setKeys] = useState(0);
  const [busy, setBusy] = useState<ChestTier | null>(null);
  const [result, setResult] = useState<OpenResult | null>(null);
  const [openedTier, setOpenedTier] = useState<ChestTier | null>(null);
  const { setProfile } = useAuthStore();
  const { addToast } = useUiStore();

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setOpenedTier(null);
    apiClient.get<{ keys: number; chests: ChestDef[] }>('/api/chests').then(r => {
      setKeys(r.keys);
      setChests(r.chests);
    }).catch(() => null);
  }, [open]);

  async function openChest(tier: ChestTier) {
    if (busy) return;
    setBusy(tier);
    setOpenedTier(tier);
    soundService.playClick();
    try {
      const res = await apiClient.post<OpenResult>('/api/chests/open', { tier });
      // Animate the chest opening for ~1.5s before revealing
      setTimeout(() => {
        setResult(res);
        setKeys(res.newKeyBalance);
        if (res.profile) setProfile(res.profile);
        if (res.itemGranted) soundService.playWin();
        else                  soundService.playCoins();
      }, 1500);
      // Also clear busy after the animation
      setTimeout(() => setBusy(null), 1500);
    } catch (e: any) {
      setBusy(null);
      setOpenedTier(null);
      soundService.playError();
      addToast(e?.message || 'Open failed', 'error');
    }
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-3"
        style={{ background: 'rgba(0,0,0,0.78)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-md rounded-3xl overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse at top, #2A1A0E 0%, #14100A 50%, #0E0905 100%)',
            border: '1px solid rgba(232,201,122,0.40)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 36px rgba(232,201,122,0.20)',
            direction: lang === 'ar' ? 'rtl' : 'ltr',
            maxHeight: '92vh',
          }}>
          {result?.itemRarity === 'legendary' && <Confetti count={70}/>}

          {/* Header */}
          <div className="relative px-5 pt-5 pb-3 border-b text-center"
            style={{ borderColor: 'rgba(201,168,76,0.18)' }}>
            <button onClick={onClose}
              className="absolute top-3 left-3 rounded-lg w-8 h-8 flex items-center justify-center text-xl"
              style={{ color: 'rgba(245,230,200,0.55)', background: 'rgba(255,255,255,0.04)' }}>×</button>
            <h2 className="font-arabic font-bold flex items-center justify-center gap-2"
              style={{ fontSize: 20, color: '#FFE07A' }}>
              🎁 {lang === 'ar' ? 'صناديق الكنز' : 'Treasure Chests'}
            </h2>
            <p className="font-arabic mt-1" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.55)' }}>
              {lang === 'ar' ? 'تكسب 🔑 من كل فوز · استبدلها بصناديق' : 'Earn 🔑 from wins · spend them on chests'}
            </p>
            {/* Key balance */}
            <div className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5"
              style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.40)' }}>
              <span style={{ fontSize: 16 }}>🔑</span>
              <span className="font-mono font-bold" style={{ fontSize: 15, color: '#FFE07A' }}>{keys}</span>
              <span className="font-arabic" style={{ fontSize: 10, color: 'rgba(245,230,200,0.55)' }}>
                {lang === 'ar' ? 'مفتاح' : 'keys'}
              </span>
            </div>
          </div>

          {/* Body — chest grid OR reveal */}
          <div className="px-4 py-4 overflow-y-auto" style={{ maxHeight: '60vh' }}>
            {result && openedTier ? (
              <RevealView tier={openedTier} result={result} lang={lang} onAgain={() => { setResult(null); setOpenedTier(null); }}/>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {chests.map(c => (
                  <ChestCard key={c.tier} chest={c} keys={keys} busy={busy === c.tier} opening={openedTier === c.tier} lang={lang}
                    onOpen={() => openChest(c.tier)}/>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ChestCard({ chest, keys, busy, opening, lang, onOpen }: {
  chest: ChestDef;
  keys: number;
  busy: boolean;
  opening: boolean;
  lang: string;
  onOpen: () => void;
}) {
  const theme = TIER_THEME[chest.tier];
  const cant = keys < chest.keyCost;
  return (
    <div className="rounded-2xl p-3 flex flex-col items-center text-center relative"
      style={{
        background: `linear-gradient(160deg, ${theme.fill}55, ${theme.fill}22)`,
        border: `1.5px solid ${theme.border}66`,
        boxShadow: `0 0 18px ${theme.glow}`,
      }}>
      <motion.div
        animate={opening ? { rotate: [-5, 5, -5, 5, 0], scale: [1, 1.05, 1.1, 1.15, 1.2] } : { y: [0, -3, 0] }}
        transition={opening ? { duration: 1.5, ease: 'easeInOut' } : { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ fontSize: 60, lineHeight: 1, marginBottom: 6 }}>
        {chest.emoji}
      </motion.div>
      <p className="font-arabic font-bold" style={{ fontSize: 13, color: theme.shine }}>
        {lang === 'ar' ? chest.labelAr : chest.labelEn}
      </p>
      <p className="font-arabic mt-1 mb-2.5" style={{ fontSize: 9.5, color: 'rgba(245,230,200,0.55)' }}>
        🪙 {chest.minCoins.toLocaleString()}–{chest.maxCoins.toLocaleString()}
        {chest.itemChance > 0 && (
          <span style={{ marginInlineStart: 4 }}>
            · {Math.round(chest.itemChance * 100)}% 🎁
          </span>
        )}
      </p>
      <motion.button whileTap={{ scale: 0.94 }} onClick={onOpen}
        disabled={cant || busy}
        className="w-full rounded-lg py-1.5 font-arabic font-bold disabled:opacity-50"
        style={{
          background: cant ? 'rgba(255,255,255,0.04)' : `linear-gradient(135deg, ${theme.shine}, ${theme.border})`,
          color: cant ? 'rgba(245,230,200,0.45)' : '#0E0905',
          border: `1px solid ${theme.border}99`,
          fontSize: 11,
        }}>
        {opening ? '✨ ...' : `🔑 ${chest.keyCost}`}
      </motion.button>
    </div>
  );
}

function RevealView({ tier, result, lang, onAgain }: {
  tier: ChestTier;
  result: OpenResult;
  lang: string;
  onAgain: () => void;
}) {
  const theme = TIER_THEME[tier];
  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 240, damping: 18 }}
      className="text-center py-4">
      <div style={{ fontSize: 80, marginBottom: 8 }}>✨ {tier === 'dragon' ? '🐉' : tier === 'gold' ? '🥇' : tier === 'silver' ? '🥈' : '🪵'} ✨</div>
      <h3 className="font-arabic font-bold mb-3" style={{ fontSize: 18, color: theme.shine }}>
        {lang === 'ar' ? 'مبروك! حصلت على' : 'Congrats! You got'}
      </h3>
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="rounded-2xl px-4 py-3"
          style={{ background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.30)' }}>
          <div className="font-mono font-bold" style={{ fontSize: 24, color: '#FFE07A' }}>
            🪙 +{result.coins.toLocaleString()}
          </div>
        </div>
      </div>
      {result.itemGranted && (
        <div className="rounded-2xl px-4 py-3 mb-4 inline-block"
          style={{ background: 'rgba(196,149,255,0.10)', border: '1px solid rgba(196,149,255,0.40)' }}>
          <p className="font-arabic" style={{ fontSize: 11, color: 'rgba(245,230,200,0.55)' }}>
            ✨ {lang === 'ar' ? 'عنصر جديد' : 'New item'}
          </p>
          <p className="font-arabic font-bold" style={{ fontSize: 16, color: '#C495FF' }}>
            🎁 {result.itemNameAr || result.itemGranted}
          </p>
        </div>
      )}
      <div className="flex gap-2 justify-center mt-4">
        <button onClick={onAgain}
          className="rounded-xl px-5 py-2 font-arabic font-bold"
          style={{ background: 'linear-gradient(135deg, #C9A84C, #A07830)', color: '#0E0905', fontSize: 13 }}>
          {lang === 'ar' ? 'افتح صندوق آخر' : 'Open another'}
        </button>
      </div>
    </motion.div>
  );
}
