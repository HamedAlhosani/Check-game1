import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { socketService } from '../../services/socket.service';
import { SOCKET_EVENTS, GameType } from '@check-game/shared';
import { soundService } from '../../services/sound.service';

type LudoMode = 'bots' | 'online' | 'private';
type Step = 'pick-game' | 'ludo-setup';

interface Props {
  open: boolean;
  onClose: () => void;
  lang: string;
}

/**
 * Two-step game launcher.
 *  1. "Choose your game" — shows Check and Ludo as equals.
 *  2. Picking Check     → navigates to /home (Check's existing dashboard).
 *     Picking Ludo      → swaps to a Ludo-only setup (vs Bot / Online / Private)
 *                         and creates the room directly so /home stays
 *                         Check-only.
 */
export function GameMenuModal({ open, onClose, lang }: Props) {
  const isAr = lang === 'ar';
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('pick-game');
  const [busy, setBusy] = useState(false);

  const reset = () => { setStep('pick-game'); setBusy(false); };
  const handleClose = () => { reset(); onClose(); };

  const pickGame = (g: GameType) => {
    soundService.playClick();
    if (g === 'check') {
      onClose();
      navigate('/home');
      reset();
      return;
    }
    setStep('ludo-setup');
  };

  const launchLudo = async (m: LudoMode) => {
    if (busy) return;
    setBusy(true);
    soundService.playClick();
    let socket;
    try {
      socket = await socketService.ensureReady(5000);
    } catch {
      setBusy(false);
      return;
    }

    // One-time listener: as soon as the server starts the game, navigate.
    const onStarting = (data: { gameId: string; gameType: GameType }) => {
      socket.off(SOCKET_EVENTS.LOBBY_GAME_STARTING, onStarting);
      handleClose();
      navigate(`/game/${data.gameType}/${data.gameId}`);
    };
    socket.on(SOCKET_EVENTS.LOBBY_GAME_STARTING, onStarting);

    if (m === 'bots') {
      socket.emit(SOCKET_EVENTS.LOBBY_CREATE_ROOM, {
        name: 'لودو ضد البوت',
        type: 'private',
        botCount: 3,
        botDifficulty: 'medium',
        gameType: 'ludo',
        maxPlayers: 4,
      });
    } else if (m === 'online') {
      socket.emit(SOCKET_EVENTS.LOBBY_CREATE_ROOM, {
        name: 'غرفة لودو عامة',
        type: 'public',
        botCount: 0,
        botDifficulty: 'medium',
        gameType: 'ludo',
        maxPlayers: 4,
      });
    } else {
      socket.emit(SOCKET_EVENTS.LOBBY_CREATE_ROOM, {
        name: 'غرفة لودو خاصة',
        type: 'private',
        botCount: 0,
        botDifficulty: 'medium',
        gameType: 'ludo',
        maxPlayers: 4,
      });
    }

    // Failsafe — clear the listener after 8s if nothing arrives so we don't
    // accidentally jump out of a future game.
    setTimeout(() => {
      socket.off(SOCKET_EVENTS.LOBBY_GAME_STARTING, onStarting);
      setBusy(false);
    }, 8000);
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
          onClick={handleClose}
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
              onClick={handleClose}
              aria-label={isAr ? 'إغلاق' : 'Close'}
              className="absolute top-3 left-3 w-8 h-8 rounded-lg flex items-center justify-center text-sand/55 hover:text-sand-light hover:bg-white/5 active:scale-90 transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>

            {step === 'pick-game' && (
              <>
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
              </>
            )}

            {step === 'ludo-setup' && (
              <>
                <button
                  onClick={() => setStep('pick-game')}
                  className="absolute top-3 right-3 px-2.5 py-1 rounded-lg font-arabic flex items-center gap-1 text-sand/60 hover:text-sand-light hover:bg-white/5 transition"
                  style={{ fontSize: 12 }}
                  aria-label={isAr ? 'رجوع' : 'Back'}
                >
                  <span style={{ fontSize: 13 }}>{isAr ? '→' : '←'}</span>
                  {isAr ? 'رجوع' : 'Back'}
                </button>

                <div className="text-center mb-5">
                  <p className="font-arabic" style={{ fontSize: 11, letterSpacing: 4, color: 'rgba(217,164,65,0.65)' }}>
                    {isAr ? '✦ لودو ✦' : '✦ LUDO ✦'}
                  </p>
                  <h2 className="font-arabic font-bold mt-1" style={{ fontSize: 22, color: '#F6E6BE' }}>
                    {isAr ? 'اختر طريقة اللعب' : 'Choose how to play'}
                  </h2>
                </div>

                <div className="flex flex-col gap-2.5">
                  {([
                    { mode: 'bots'    as LudoMode, icon: '🤖', label: { ar: 'ضد البوتات', en: 'Vs Bots' },     sub: { ar: '٣ بوتات · ابدأ فوراً', en: '3 bots · instant start' } },
                    { mode: 'online'  as LudoMode, icon: '🌐', label: { ar: 'أونلاين',     en: 'Online' },      sub: { ar: 'ابحث عن خصوم', en: 'Match with players' } },
                    { mode: 'private' as LudoMode, icon: '🔒', label: { ar: 'غرفة خاصة',  en: 'Private Room' }, sub: { ar: 'العب مع أصدقائك', en: 'Play with friends' } },
                  ]).map(opt => (
                    <motion.button
                      key={opt.mode}
                      whileHover={{ scale: 1.015, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={busy}
                      onClick={() => launchLudo(opt.mode)}
                      className="rounded-2xl text-start flex items-center gap-3 disabled:opacity-50"
                      style={{
                        padding: '14px 16px',
                        background: 'linear-gradient(135deg, rgba(217,164,65,0.12) 0%, rgba(20,14,8,0.85) 100%)',
                        border: '1.5px solid rgba(217,164,65,0.40)',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                        cursor: busy ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <span style={{ fontSize: 28, lineHeight: 1 }}>{opt.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-arabic font-bold" style={{ fontSize: 15, color: '#F6E6BE' }}>
                          {isAr ? opt.label.ar : opt.label.en}
                        </p>
                        <p className="font-arabic" style={{ fontSize: 11, color: 'rgba(245,230,200,0.55)' }}>
                          {isAr ? opt.sub.ar : opt.sub.en}
                        </p>
                      </div>
                      <span style={{ color: '#D9A441', fontSize: 16 }}>{isAr ? '←' : '→'}</span>
                    </motion.button>
                  ))}
                </div>

                {busy && (
                  <p className="text-center font-arabic mt-3 animate-pulse" style={{ fontSize: 12, color: 'rgba(217,164,65,0.7)' }}>
                    {isAr ? 'جاري التحضير…' : 'Preparing…'}
                  </p>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
