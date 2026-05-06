import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../services/api.service';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { soundService } from '../../services/sound.service';
import { Confetti } from './Confetti';
import type { UserProfile } from '@check-game/shared';

interface PrizeDef {
  id: string;
  weight: number;
  kind: 'coins' | 'item';
  coins: number;
  labelAr: string;
  labelEn: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}
interface WheelStatus {
  canSpin: boolean;
  nextSpinAt: number | null;
  lastSpinAt: number | null;
  prizes: PrizeDef[];
}
interface SpinResult {
  prizeIndex: number;
  prizeId: string;
  coinsGranted: number;
  itemGranted?: string;
  itemNameAr?: string;
  newCoinBalance: number;
  profile: UserProfile;
}

const RARITY_COLOR: Record<string, { fill: string; stroke: string; glow: string }> = {
  common:    { fill: '#3A2A12', stroke: '#7A5A24', glow: 'rgba(122,90,36,0.4)' },
  uncommon:  { fill: '#1F4030', stroke: '#3A8060', glow: 'rgba(58,128,96,0.5)' },
  rare:      { fill: '#1F2A55', stroke: '#5070C0', glow: 'rgba(80,112,192,0.5)' },
  epic:      { fill: '#3A1F55', stroke: '#9858C0', glow: 'rgba(152,88,192,0.55)' },
  legendary: { fill: '#5A4A18', stroke: '#FFE07A', glow: 'rgba(255,224,122,0.7)' },
};

export function WheelModal({ open, onClose, lang }: { open: boolean; onClose: () => void; lang: string }) {
  const [status, setStatus] = useState<WheelStatus | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [rotation, setRotation] = useState(0);
  const [now, setNow] = useState(Date.now());
  const { setProfile } = useAuthStore();
  const { addToast } = useUiStore();
  const lockRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setRotation(0);
    apiClient.get<WheelStatus>('/api/wheel/status').then(setStatus).catch(() => null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open]);

  async function spin() {
    if (lockRef.current || spinning || !status?.canSpin) return;
    lockRef.current = true;
    setSpinning(true);
    soundService.playClick();
    try {
      const res = await apiClient.post<SpinResult>('/api/wheel/spin', {});
      if (res?.profile) setProfile(res.profile);

      // Compute landing rotation. Pointer is at the top (12 o'clock).
      // Each segment is 360/N degrees. We want the centre of segment i to
      // align under the pointer → wheel rotates by -(i * segDeg) in the
      // unit circle, but our SVG rotates clockwise so flip the sign.
      const N = status.prizes.length;
      const segDeg = 360 / N;
      const i = res.prizeIndex;
      // Land i centred under top: rotate the wheel so segment-i's center
      // lands at angle 0. If segments are drawn starting at -90° (top),
      // segment i's centre is at (-90 + segDeg*i + segDeg/2). To bring
      // that to -90 (top), we subtract (segDeg*i + segDeg/2).
      // Add 5 full extra spins for drama.
      const landing = - (segDeg * i + segDeg / 2);
      const target = 5 * 360 + landing + (Math.random() * 6 - 3); // ±3° jitter
      setRotation(target);

      // After the spin animation finishes, reveal the prize.
      setTimeout(() => {
        setResult(res);
        setSpinning(false);
        lockRef.current = false;
        if (res.itemGranted) soundService.playWin();
        else                  soundService.playCoins();
        // Refresh status (now in cooldown)
        apiClient.get<WheelStatus>('/api/wheel/status').then(setStatus).catch(() => null);
      }, 4200);
    } catch (e: any) {
      lockRef.current = false;
      setSpinning(false);
      soundService.playError();
      addToast(e?.message || 'Spin failed', 'error');
    }
  }

  if (!open) return null;

  const remainingMs = status?.nextSpinAt ? Math.max(0, status.nextSpinAt - now) : 0;

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
            border: '1px solid rgba(232,201,122,0.45)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(232,201,122,0.20)',
            direction: lang === 'ar' ? 'rtl' : 'ltr',
          }}>
          {result?.itemGranted && <Confetti count={70}/>}

          {/* Header */}
          <div className="relative px-5 pt-5 pb-2 text-center" style={{ zIndex: 6 }}>
            <button onClick={onClose}
              className="absolute top-3 left-3 rounded-lg w-8 h-8 flex items-center justify-center text-xl"
              style={{ color: 'rgba(245,230,200,0.55)', background: 'rgba(255,255,255,0.04)' }}>×</button>
            <h2 className="font-arabic font-bold flex items-center justify-center gap-2"
              style={{ fontSize: 22, color: '#FFE07A' }}>
              🎡 {lang === 'ar' ? 'عجلة الحظ اليومية' : 'Daily Lucky Wheel'}
            </h2>
            <p className="font-arabic mt-1" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.55)' }}>
              {lang === 'ar' ? 'دورة واحدة كل 24 ساعة — جوائز عشوائية' : 'One spin every 24h — random prizes'}
            </p>
          </div>

          {/* Wheel */}
          <div className="relative flex items-center justify-center py-4" style={{ zIndex: 6 }}>
            <Wheel rotation={rotation} prizes={status?.prizes ?? []} highlightIndex={result?.prizeIndex ?? null}/>
          </div>

          {/* CTA / status */}
          <div className="relative px-5 pb-5 text-center" style={{ zIndex: 6 }}>
            {result ? (
              <div>
                <p className="font-arabic mb-2" style={{ fontSize: 12, color: 'rgba(245,230,200,0.55)' }}>
                  {lang === 'ar' ? 'فزت بـ' : 'You won'}
                </p>
                <p className="font-arabic font-bold mb-3" style={{ fontSize: 22, color: '#FFE07A' }}>
                  {result.itemGranted
                    ? (lang === 'ar' ? `🎁 ${result.itemNameAr || 'هدية أسطورية'}` : '🎁 Legendary item')
                    : `🪙 +${result.coinsGranted.toLocaleString()}`}
                </p>
                <button onClick={onClose}
                  className="w-full rounded-xl py-2.5 font-arabic font-bold"
                  style={{ background: 'linear-gradient(135deg, #C9A84C, #A07830)', color: '#0E0905', fontSize: 13 }}>
                  {lang === 'ar' ? 'تمام' : 'Done'}
                </button>
              </div>
            ) : status?.canSpin ? (
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                disabled={spinning}
                onClick={spin}
                className="w-full rounded-2xl py-3 font-arabic font-bold disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #FFE07A, #C9A84C 50%, #8B6914)',
                  color: '#0E0905', fontSize: 15,
                  boxShadow: '0 6px 22px rgba(232,201,122,0.45)',
                }}>
                {spinning ? (lang === 'ar' ? '🎰 يدور...' : '🎰 Spinning...') : (lang === 'ar' ? '🎯 دوّر العجلة!' : '🎯 SPIN!')}
              </motion.button>
            ) : (
              <div className="rounded-2xl py-3 px-4 font-arabic"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(245,230,200,0.55)',
                  fontSize: 13,
                }}>
                ⏳ {lang === 'ar' ? `العجلة جاهزة بعد ${formatRemaining(remainingMs, lang)}` : `Wheel ready in ${formatRemaining(remainingMs, lang)}`}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function formatRemaining(ms: number, lang: string): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return lang === 'ar' ? `${h}س ${m}د` : `${h}h ${m}m`;
  if (m > 0) return lang === 'ar' ? `${m}د ${s}ث` : `${m}m ${s}s`;
  return lang === 'ar' ? `${s}ث` : `${s}s`;
}

// ── The actual wheel SVG ────────────────────────────────────────────────────
function Wheel({ rotation, prizes, highlightIndex }: { rotation: number; prizes: PrizeDef[]; highlightIndex: number | null }) {
  const SIZE = 280;
  const R = SIZE / 2;
  const N = prizes.length || 8;
  const segDeg = 360 / N;
  if (prizes.length === 0) return <div style={{ width: SIZE, height: SIZE }}/>;
  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE + 20 }}>
      {/* Pointer arrow at the top */}
      <svg width={28} height={20}
        style={{ position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
        <polygon points="14,20 0,0 28,0" fill="#FFE07A" stroke="#8B6914" strokeWidth="1.5"/>
      </svg>

      <motion.svg
        width={SIZE} height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        animate={{ rotate: rotation }}
        transition={{ duration: 4, ease: [0.18, 0.7, 0.2, 1.02] }}
        style={{ display: 'block' }}
      >
        {/* Outer rim */}
        <circle cx={R} cy={R} r={R - 2} fill="none" stroke="#8B6914" strokeWidth="3"/>

        {/* Segments */}
        {prizes.map((p, i) => {
          const start = (i * segDeg - 90) * Math.PI / 180;
          const end   = ((i + 1) * segDeg - 90) * Math.PI / 180;
          const x1 = R + (R - 6) * Math.cos(start);
          const y1 = R + (R - 6) * Math.sin(start);
          const x2 = R + (R - 6) * Math.cos(end);
          const y2 = R + (R - 6) * Math.sin(end);
          const colour = RARITY_COLOR[p.rarity] || RARITY_COLOR.common;
          const isWin = highlightIndex === i;
          // Path: arc from (x1,y1) to (x2,y2) via large-arc-flag=0
          const path = `M ${R} ${R} L ${x1} ${y1} A ${R - 6} ${R - 6} 0 0 1 ${x2} ${y2} Z`;
          // Label position: middle of the segment, ~70% out
          const midAngle = (i * segDeg + segDeg / 2 - 90) * Math.PI / 180;
          const lx = R + (R * 0.62) * Math.cos(midAngle);
          const ly = R + (R * 0.62) * Math.sin(midAngle);
          // Rotate label so it reads from centre outwards
          const labelRot = i * segDeg + segDeg / 2 + 90;
          return (
            <g key={p.id}>
              <path d={path} fill={colour.fill} stroke={colour.stroke} strokeWidth={isWin ? 2.5 : 1.2}
                style={isWin ? { filter: `drop-shadow(0 0 12px ${colour.glow})` } : undefined}/>
              {/* Label — emoji or coin amount */}
              <text x={lx} y={ly}
                textAnchor="middle" dominantBaseline="central"
                transform={`rotate(${labelRot}, ${lx}, ${ly})`}
                fill="#FFE07A" fontSize={p.kind === 'item' ? 22 : 14} fontFamily="ui-monospace, Menlo, monospace"
                fontWeight="bold">
                {p.kind === 'item' ? '🎁' : p.coins >= 1000 ? `${p.coins / 1000}k` : p.coins}
              </text>
              {/* Tiny coin icon next to text for non-item prizes */}
              {p.kind === 'coins' && (
                <text x={lx} y={ly + 14}
                  textAnchor="middle" dominantBaseline="central"
                  transform={`rotate(${labelRot}, ${lx}, ${ly + 14})`}
                  fontSize="10" opacity="0.85">🪙</text>
              )}
            </g>
          );
        })}

        {/* Hub */}
        <circle cx={R} cy={R} r={20} fill="#1A1408" stroke="#FFE07A" strokeWidth="2"/>
        <text x={R} y={R} textAnchor="middle" dominantBaseline="central" fontSize="20">🎡</text>
      </motion.svg>
    </div>
  );
}
