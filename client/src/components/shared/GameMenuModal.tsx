import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { GameType } from '@check-game/shared';
import { soundService } from '../../services/sound.service';

interface Props {
  open: boolean;
  onClose: () => void;
  lang: string;
}

/**
 * One-step game launcher. Each card jumps to that game's dedicated home:
 *   Check → /home    (existing Check dashboard, kept untouched)
 *   Ludo  → /ludo    (new dedicated Ludo home — own theme, store, etc.)
 */
export function GameMenuModal({ open, onClose, lang }: Props) {
  const isAr = lang === 'ar';
  const navigate = useNavigate();

  const pickGame = (g: GameType) => {
    soundService.playClick();
    onClose();
    navigate(g === 'ludo' ? '/ludo' : '/home');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="game-menu-bg"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] flex items-center justify-center px-4"
          style={{ background: 'rgba(8,4,2,0.88)', backdropFilter: 'blur(10px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl border overflow-hidden"
            style={{
              direction: isAr ? 'rtl' : 'ltr',
              background: 'linear-gradient(180deg, #1F1810 0%, #14100A 100%)',
              borderColor: 'rgba(201,168,76,0.40)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.85), 0 0 60px rgba(201,168,76,0.18)',
              padding: '20px 18px 22px',
            }}
          >
            <button
              onClick={onClose}
              aria-label={isAr ? 'إغلاق' : 'Close'}
              className="absolute top-3 left-3 w-8 h-8 rounded-lg flex items-center justify-center text-sand/55 hover:text-sand-light hover:bg-white/5 active:scale-90 transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>

            <div className="text-center mb-5">
              <p className="font-arabic" style={{ fontSize: 11, letterSpacing: 4, color: 'rgba(201,168,76,0.55)' }}>
                {isAr ? '✦ اختر اللعبة ✦' : '✦ CHOOSE YOUR GAME ✦'}
              </p>
              <h2 className="font-arabic font-bold mt-1" style={{ fontSize: 24, color: '#E8C97A' }}>
                {isAr ? 'يلا نلعب' : 'Let\'s Play'}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Check card */}
              <motion.button
                whileHover={{ scale: 1.025, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => pickGame('check')}
                className="relative rounded-2xl overflow-hidden text-start"
                style={{
                  padding: '16px 14px 14px',
                  background: 'linear-gradient(135deg, #2A1F12 0%, #14100A 100%)',
                  border: '2px solid #E8C97A',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 28px rgba(232,201,122,0.30), inset 0 1px 0 rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                }}
              >
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'radial-gradient(circle at 50% 25%, rgba(232,201,122,0.18) 0%, transparent 65%)' }} />
                <div className="relative flex flex-col items-center text-center gap-1">
                  <span style={{ fontSize: 38, lineHeight: 1, filter: 'drop-shadow(0 0 14px rgba(232,201,122,0.5))' }}>🃏</span>
                  <span className="font-display tracking-widest" style={{ fontSize: 22, color: '#E8C97A', letterSpacing: '0.16em' }}>CHECK</span>
                  <span className="font-arabic" style={{ fontSize: 10, color: 'rgba(232,201,122,0.6)' }}>
                    {isAr ? 'لعبة الورق الإماراتية' : 'Emirati card game'}
                  </span>
                  <span className="font-arabic mt-1" style={{ fontSize: 11, color: 'rgba(245,230,200,0.55)' }}>
                    {isAr ? 'اجمع أقل النقاط · ١-١٠ لاعبين' : 'Lowest score wins · 1-10 players'}
                  </span>
                </div>
              </motion.button>

              {/* Ludo card */}
              <motion.button
                whileHover={{ scale: 1.025, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => pickGame('ludo')}
                className="relative rounded-2xl overflow-hidden text-start"
                style={{
                  padding: '16px 14px 14px',
                  background: 'linear-gradient(135deg, #2A1808 0%, #14100A 100%)',
                  border: '2px solid #D9A441',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 28px rgba(217,164,65,0.30), inset 0 1px 0 rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                }}
              >
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'radial-gradient(circle at 50% 25%, rgba(217,164,65,0.20) 0%, transparent 65%)' }} />
                <div className="relative flex flex-col items-center text-center gap-1">
                  <span style={{ fontSize: 38, lineHeight: 1, filter: 'drop-shadow(0 0 14px rgba(217,164,65,0.55))' }}>🎲</span>
                  <span className="font-display tracking-widest" style={{ fontSize: 22, color: '#F6E6BE', letterSpacing: '0.16em' }}>LUDO</span>
                  <span className="font-arabic" style={{ fontSize: 10, color: 'rgba(217,164,65,0.7)' }}>
                    {isAr ? 'سباق على الرمال' : 'Race on the sands'}
                  </span>
                  <span className="font-arabic mt-1" style={{ fontSize: 11, color: 'rgba(245,230,200,0.55)' }}>
                    {isAr ? 'أوصل قطعك للهدف · ٢-٤ لاعبين' : 'Race your tokens · 2-4 players'}
                  </span>
                </div>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
