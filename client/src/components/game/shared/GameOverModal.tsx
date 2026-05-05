import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface Props {
  open: boolean;
  winnerId: string | null;
  finalScores: Record<string, number>;
  players: { uid: string; displayName: string; avatarId: string }[];
  currentUid?: string;
  onPlayAgain?: () => void;
}

const AV_COLORS = ['#C9A84C','#4A90D9','#50C878','#E74C3C','#9B59B6','#E67E22','#1ABC9C','#E91E63'];
function Av({ id, name, size = 48 }: { id: string; name: string; size?: number }) {
  const i = parseInt(id?.replace(/\D/g, '') || '1', 10) - 1;
  return (
    <div className="rounded-full border-2 border-gold/60 flex items-center justify-center font-bold text-white shrink-0"
      style={{ width: size, height: size, background: AV_COLORS[i % AV_COLORS.length], fontSize: Math.round(size * .37) }}>
      {name?.slice(0, 2) || '?'}
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 55 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 2.2 + Math.random() * 1.5,
    color: ['#C9A84C','#E8C97A','#4ade80','#f97316','#818cf8','#fb7185','#38bdf8'][i % 7],
    size: 5 + Math.random() * 7,
    rotate: Math.random() > 0.5 ? 720 : -720,
    drift: (Math.random() - 0.5) * 80,
  }));

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 200, overflow: 'hidden' }}>
      {pieces.map(p => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: -20,
            width: p.size,
            height: p.size * 0.55,
            background: p.color,
            borderRadius: 2,
          }}
          animate={{ y: '110vh', x: p.drift, rotate: p.rotate, opacity: [1, 1, 0] }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}

export function GameOverModal({ open, winnerId, finalScores, players, currentUid, onPlayAgain }: Props) {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (open) setTimeout(() => setShow(true), 100);
  }, [open]);

  if (!open) return null;

  const sorted = [...players].sort((a, b) => (finalScores[a.uid] ?? 0) - (finalScores[b.uid] ?? 0));
  const winner = players.find(p => p.uid === winnerId);
  const iAmWinner = winnerId === currentUid;
  const coinsEarned = iAmWinner ? 15 : 5;
  const xpEarned = iAmWinner ? 100 : 20;

  return (
    <AnimatePresence>
      {show && (
        <>
          <Confetti />
          <motion.div
            key="game-over"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[150] flex items-center justify-center"
            style={{ background: 'rgba(20,14,8,0.93)', backdropFilter: 'blur(10px)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', bounce: 0.35, delay: 0.15 }}
              className="rounded-3xl border border-gold/30 px-6 py-7 flex flex-col items-center gap-4"
              style={{
                background: 'linear-gradient(160deg, rgba(30,15,0,.99) 0%, rgba(20,14,8,.99) 100%)',
                minWidth: 320, maxWidth: 420, width: '90vw',
                boxShadow: '0 0 60px rgba(201,168,76,.18), 0 0 120px rgba(201,168,76,.08)',
              }}
            >
              {/* Trophy bounce */}
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', bounce: 0.6, delay: 0.3 }}
                style={{ fontSize: 64, lineHeight: 1 }}
              >
                🏆
              </motion.div>

              {/* Winner name */}
              {winner && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-col items-center gap-2"
                >
                  <Av id={winner.avatarId} name={winner.displayName} size={60} />
                  <p className="font-arabic font-bold text-2xl" style={{ color: '#E8C97A', textShadow: '0 0 20px rgba(201,168,76,.6)' }}>
                    {winner.displayName}
                  </p>
                  <p className="font-arabic text-lg text-gold/80">الفائز 🎉</p>
                </motion.div>
              )}

              {/* Coins + XP reward for current player */}
              {currentUid && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 }}
                  className="flex gap-4 rounded-2xl border border-gold/20 px-5 py-3"
                  style={{ background: 'rgba(201,168,76,.08)' }}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span style={{ fontSize: 22 }}>🪙</span>
                    <span className="text-gold font-bold" style={{ fontSize: 18 }}>+{coinsEarned}</span>
                    <span className="text-sand/50 font-arabic" style={{ fontSize: 10 }}>فلوس</span>
                  </div>
                  <div style={{ width: 1, background: 'rgba(201,168,76,.2)' }} />
                  <div className="flex flex-col items-center gap-0.5">
                    <span style={{ fontSize: 22 }}>⭐</span>
                    <span className="text-gold font-bold" style={{ fontSize: 18 }}>+{xpEarned}</span>
                    <span className="text-sand/50 font-arabic" style={{ fontSize: 10 }}>XP</span>
                  </div>
                </motion.div>
              )}

              {/* Final scores table */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="w-full space-y-1.5"
              >
                {sorted.map((p, i) => (
                  <div key={p.uid}
                    className="flex items-center gap-3 rounded-xl px-3 py-2"
                    style={{
                      background: p.uid === winnerId
                        ? 'rgba(201,168,76,.14)'
                        : p.uid === currentUid
                          ? 'rgba(255,255,255,.06)'
                          : 'rgba(255,255,255,.03)',
                      border: p.uid === winnerId
                        ? '1px solid rgba(201,168,76,.35)'
                        : '1px solid transparent',
                    }}
                  >
                    <span style={{ fontSize: 18, minWidth: 22, textAlign: 'center' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '4️⃣'}
                    </span>
                    <Av id={p.avatarId} name={p.displayName} size={30} />
                    <span className="flex-1 font-arabic text-sand-light truncate" style={{ fontSize: 13 }}>{p.displayName}</span>
                    <span className="font-bold" style={{ fontSize: 18, color: i === 0 ? '#E8C97A' : 'rgba(255,255,255,.6)' }}>
                      {finalScores[p.uid] ?? 0}
                    </span>
                  </div>
                ))}
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="flex gap-3 w-full"
              >
                {onPlayAgain && (
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: .96 }}
                    onClick={onPlayAgain}
                    className="flex-1 py-3 rounded-xl border border-gold/60 text-gold font-arabic font-bold bg-gold/12 hover:bg-gold/22 transition-all"
                    style={{ fontSize: 14 }}
                  >العب مرة أخرى</motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: .96 }}
                  onClick={() => navigate('/home')}
                  className="flex-1 py-3 rounded-xl border border-white/15 text-white/60 font-arabic bg-white/5 hover:bg-white/10 transition-all"
                  style={{ fontSize: 14 }}
                >القائمة الرئيسية</motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
