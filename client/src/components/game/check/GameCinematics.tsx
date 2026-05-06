import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundService } from '../../../services/sound.service';
import { useLang } from '../../../i18n/useT';

/**
 * Round-start cinematic — plays for ~2.5s when a new round begins.
 * Stage 1 (0-1.5s): cards fly out from the centre to each player position
 * Stage 2 (1.5-2.5s): big "CHECK!" announcement with the call voice
 * After: hands control back to the regular peek-phase UI
 */
export function RoundStartCinematic({ playerCount, onComplete }: {
  playerCount: number;
  onComplete: () => void;
}) {
  const lang = useLang();
  const [stage, setStage] = useState<'dealing' | 'announce'>('dealing');

  useEffect(() => {
    // Tiny shuffle sound at the start
    soundService.playCardDraw();
    const t1 = setTimeout(() => {
      setStage('announce');
      soundService.playCheckVoice();
    }, 1500);
    const t2 = setTimeout(() => onComplete(), 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  // Pre-compute per-player target positions on a ring around the screen
  const targets = useMemo(() => {
    const arr: { x: number; y: number }[] = [];
    const r = Math.min(window.innerWidth, window.innerHeight) * 0.32;
    for (let i = 0; i < playerCount; i++) {
      // Distribute starting from bottom (the "me" seat) going clockwise
      const angle = (i / playerCount) * Math.PI * 2 + Math.PI / 2;
      arr.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }
    return arr;
  }, [playerCount]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[55] pointer-events-none"
      style={{ background: stage === 'announce' ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.30)' }}
    >
      <AnimatePresence>
        {stage === 'dealing' && (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Centre source — the "deck" before it splits */}
            <motion.div
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: [1, 0.85, 1.1, 0.95], opacity: 1 }}
              transition={{ duration: 0.6 }}
              style={{
                position: 'absolute',
                width: 56, height: 84, borderRadius: 8,
                background: 'linear-gradient(145deg, #0E0830, #050218)',
                border: '2px solid rgba(232,201,122,0.85)',
                boxShadow: '0 0 28px rgba(232,201,122,0.55)',
                left: '50%', top: '50%', marginLeft: -28, marginTop: -42,
              }}/>

            {/* 4 cards × playerCount — all flying out */}
            {targets.map((t, i) => (
              Array.from({ length: 4 }).map((_, c) => (
                <motion.div
                  key={`p${i}-c${c}`}
                  initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 0.6 }}
                  animate={{
                    x: t.x, y: t.y,
                    opacity: [0, 1, 1, 0.4],
                    rotate: 540,
                    scale: [0.6, 1.1, 0.9, 0.6],
                  }}
                  transition={{ duration: 1.0, delay: 0.15 + c * 0.08 + i * 0.04, ease: 'easeOut' }}
                  className="absolute"
                  style={{
                    left: '50%', top: '50%',
                    width: 38, height: 56, borderRadius: 5,
                    marginLeft: -19, marginTop: -28,
                    background: 'linear-gradient(145deg, #0E0830, #050218)',
                    border: '1.5px solid rgba(232,201,122,0.65)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.55)',
                  }}/>
              ))
            ))}
          </div>
        )}

        {stage === 'announce' && (
          <motion.div
            initial={{ scale: 0.4, opacity: 0, y: 20 }}
            animate={{ scale: [0.4, 1.2, 1], opacity: 1, y: 0 }}
            exit={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="text-center">
              <div className="font-display"
                style={{
                  fontSize: 'clamp(56px, 14vw, 120px)',
                  fontWeight: 900,
                  color: '#FFE07A',
                  textShadow: '0 0 36px rgba(255,224,122,0.85), 0 0 70px rgba(255,224,122,0.45), 0 4px 14px rgba(0,0,0,0.6)',
                  letterSpacing: 8,
                  lineHeight: 1,
                }}>CHECK</div>
              <div className="font-arabic mt-2"
                style={{
                  fontSize: 'clamp(14px, 2.5vw, 20px)',
                  color: 'rgba(255,224,122,0.75)',
                  letterSpacing: 3,
                }}>
                {lang === 'ar' ? 'جولة جديدة' : 'New Round'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Reshuffle animation — plays when the deck runs out and gets reshuffled
 * from the discard pile. Cards swirl from where the discard sits back into
 * the deck slot, then a "shuffle" puff resolves into the fresh deck.
 */
export function ReshuffleAnimation({ onComplete }: { onComplete: () => void }) {
  const lang = useLang();
  useEffect(() => {
    soundService.playCardDraw();
    const t = setTimeout(() => onComplete(), 1800);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[55] pointer-events-none flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
    >
      {/* Cards spiraling from discard side toward deck side */}
      {Array.from({ length: 18 }).map((_, i) => {
        const angle = (i / 18) * Math.PI * 2;
        const radius = 110;
        return (
          <motion.div
            key={i}
            initial={{ x: 60, y: 0, opacity: 0, rotate: 0, scale: 0.8 }}
            animate={{
              x: [60, Math.cos(angle) * radius, -10],
              y: [0,  Math.sin(angle) * radius * 0.6, 0],
              opacity: [0, 1, 1, 0],
              rotate: [0, 360 + i * 20, 720],
              scale: [0.8, 1, 0.8],
            }}
            transition={{ duration: 1.5, delay: i * 0.04, ease: 'easeInOut' }}
            className="absolute"
            style={{
              width: 32, height: 48, borderRadius: 4,
              background: 'linear-gradient(145deg, #0E0830, #050218)',
              border: '1px solid rgba(232,201,122,0.55)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.55)',
            }}/>
        );
      })}

      {/* Banner */}
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="absolute"
        style={{ bottom: '30%' }}>
        <div className="rounded-2xl px-5 py-2.5 font-arabic font-bold flex items-center gap-2"
          style={{
            background: 'rgba(20,16,10,0.95)',
            border: '1.5px solid rgba(232,201,122,0.55)',
            color: '#FFE07A',
            boxShadow: '0 0 20px rgba(232,201,122,0.30)',
            fontSize: 14,
            letterSpacing: 0.5,
          }}>
          🔄 {lang === 'ar' ? 'جاري إعادة الخلط...' : 'Reshuffling...'}
        </div>
      </motion.div>
    </motion.div>
  );
}
