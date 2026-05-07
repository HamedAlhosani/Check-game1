import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { socketService } from '../../../services/socket.service';
import { SOCKET_EVENTS, RoomState, GameType } from '@check-game/shared';
import { soundService } from '../../../services/sound.service';
import { useUiStore } from '../../../store/uiStore';

const SAND = {
  gold: '#D9A441',
  goldLight: '#F6E6BE',
  goldDark: '#7A6303',
  cream: '#F4E4BE',
};

export type LudoConfigMode = 'bots' | 'online' | 'private';

interface Props {
  open: boolean;
  mode: LudoConfigMode;
  onClose: () => void;
  ludoCoins: number;
  lang: string;
}

const COIN_STEPS = [0, 10, 25, 50, 100, 250, 500, 1000];
const PLAYER_OPTIONS = [2, 3, 4];
const DIFFICULTIES = [
  { id: 'easy'   as const, ar: 'سهل',   en: 'Easy',   icon: '🌱' },
  { id: 'medium' as const, ar: 'متوسط', en: 'Medium', icon: '🔥' },
  { id: 'hard'   as const, ar: 'صعب',   en: 'Hard',   icon: '⚔️' },
];

const MODE_TITLE: Record<LudoConfigMode, { ar: string; en: string; icon: string; sub: { ar: string; en: string } }> = {
  bots:    { ar: 'ضد البوتات',  en: 'Vs Bots',       icon: '🤖', sub: { ar: 'اختر عدد البوتات وصعوبتهم', en: 'Pick bot count and difficulty' } },
  online:  { ar: 'أونلاين',      en: 'Online',        icon: '🌐', sub: { ar: 'اختر الرهان والعدد',         en: 'Pick bet and player count' } },
  private: { ar: 'غرفة خاصة',   en: 'Private Room',  icon: '🔒', sub: { ar: 'اختر الرهان والعدد',         en: 'Pick bet and player count' } },
};

/**
 * Stepper used for both bet and player count. Ludo-themed (sand + gold).
 */
function Stepper({
  label, value, onChange, options, format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  options: number[];
  format?: (v: number) => string;
}) {
  const idx = Math.max(0, options.indexOf(value));
  const dec = () => onChange(options[Math.max(0, idx - 1)]);
  const inc = () => onChange(options[Math.min(options.length - 1, idx + 1)]);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <p className="font-arabic" style={{ fontSize: 11, color: 'rgba(245,230,200,0.55)', letterSpacing: 1 }}>{label}</p>
      <div className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={dec}
          disabled={idx === 0}
          className="rounded-xl flex items-center justify-center disabled:opacity-30"
          style={{
            width: 38, height: 38,
            background: 'rgba(20,14,8,0.7)',
            border: `1.5px solid ${SAND.gold}55`,
            color: SAND.gold, fontSize: 22, lineHeight: 1, fontWeight: 700,
          }}
        >−</motion.button>
        <div className="font-bold font-mono"
          style={{
            minWidth: 80, textAlign: 'center',
            fontSize: 22, color: SAND.goldLight,
            textShadow: `0 0 12px ${SAND.gold}66`,
          }}>
          {format ? format(value) : value}
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={inc}
          disabled={idx === options.length - 1}
          className="rounded-xl flex items-center justify-center disabled:opacity-30"
          style={{
            width: 38, height: 38,
            background: 'rgba(20,14,8,0.7)',
            border: `1.5px solid ${SAND.gold}55`,
            color: SAND.gold, fontSize: 22, lineHeight: 1, fontWeight: 700,
          }}
        >+</motion.button>
      </div>
    </div>
  );
}

export function LudoConfigModal({ open, mode, onClose, ludoCoins, lang }: Props) {
  const isAr = lang === 'ar';
  const navigate = useNavigate();
  const { addToast } = useUiStore();

  const [bet, setBet] = useState(10);
  const [playerCount, setPlayerCount] = useState(4);
  const [botCount, setBotCount] = useState(3);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [busy, setBusy] = useState(false);
  const startedRef = useRef(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setBusy(false);
      startedRef.current = false;
    }
  }, [open]);

  // Auto-clamp bet if user can't afford it any more
  useEffect(() => {
    if (bet > ludoCoins) {
      const affordable = COIN_STEPS.filter(c => c <= ludoCoins);
      setBet(affordable.length ? affordable[affordable.length - 1] : 0);
    }
  }, [ludoCoins, bet]);

  const meta = MODE_TITLE[mode];
  const canAfford = bet <= ludoCoins;

  const handleStart = async () => {
    if (!canAfford || busy) return;
    setBusy(true);
    soundService.playClick();

    let socket;
    try {
      socket = await socketService.ensureReady(5000);
    } catch {
      setBusy(false);
      addToast(isAr ? 'تعذّر الاتصال بالخادم' : 'Could not reach server', 'error');
      return;
    }

    // The Check flow uses a two-step dance for bot rooms:
    //   1. CREATE_ROOM (server makes the room with bots in it)
    //   2. on LOBBY_ROOM_UPDATED → emit LOBBY_START_GAME (host trigger)
    //   3. on LOBBY_GAME_STARTING → navigate
    // Without step 2, bot games sit in 'waiting' forever — that's the
    // exact 'vs bots hangs' bug the user reported.
    let myRoomId: string | null = null;

    const onUpdated = (room: RoomState) => {
      if (myRoomId && room.roomId !== myRoomId) return;
      if (!myRoomId) myRoomId = room.roomId;
      if (mode === 'bots' && !startedRef.current) {
        // The server creates the room with the bots already inside, so as
        // soon as we see ROOM_UPDATED for our room, fire START.
        startedRef.current = true;
        socket.emit(SOCKET_EVENTS.LOBBY_START_GAME, { roomId: room.roomId });
      }
      // Online + Private: don't auto-start. Online matchmakes via the
      // public-room dedupe path; Private needs the host to invite friends.
    };

    const onStarting = (data: { gameId: string; gameType: GameType }) => {
      cleanup();
      onClose();
      navigate(`/game/${data.gameType}/${data.gameId}`);
    };

    const onError = (data: { message: string }) => {
      cleanup();
      addToast(data.message || (isAr ? 'حدث خطأ' : 'Error'), 'error');
      setBusy(false);
    };

    const cleanup = () => {
      socket.off(SOCKET_EVENTS.LOBBY_ROOM_UPDATED, onUpdated);
      socket.off(SOCKET_EVENTS.LOBBY_GAME_STARTING, onStarting);
      socket.off(SOCKET_EVENTS.LOBBY_ERROR, onError);
    };

    socket.on(SOCKET_EVENTS.LOBBY_ROOM_UPDATED, onUpdated);
    socket.on(SOCKET_EVENTS.LOBBY_GAME_STARTING, onStarting);
    socket.on(SOCKET_EVENTS.LOBBY_ERROR, onError);

    const baseName = mode === 'bots'
      ? 'لودو ضد البوت'
      : mode === 'online' ? 'غرفة لودو عامة' : 'غرفة لودو خاصة';

    if (mode === 'bots') {
      socket.emit(SOCKET_EVENTS.LOBBY_CREATE_ROOM, {
        name: baseName,
        type: 'private',
        botCount,
        botDifficulty: difficulty,
        gameType: 'ludo',
        maxPlayers: Math.min(4, botCount + 1),
        betAmount: bet,
      });
    } else if (mode === 'online') {
      socket.emit(SOCKET_EVENTS.LOBBY_CREATE_ROOM, {
        name: baseName,
        type: 'public',
        botCount: 0,
        botDifficulty: 'medium',
        gameType: 'ludo',
        maxPlayers: playerCount,
        betAmount: bet,
      });
    } else {
      socket.emit(SOCKET_EVENTS.LOBBY_CREATE_ROOM, {
        name: baseName,
        type: 'private',
        botCount: 0,
        botDifficulty: 'medium',
        gameType: 'ludo',
        maxPlayers: playerCount,
        betAmount: bet,
      });
    }

    // Failsafe — if nothing happens within 8s we assume the request died
    setTimeout(() => {
      if (!startedRef.current && mode !== 'bots') {
        // Online + Private leave the player in a pending lobby instead of
        // a hard timeout — for now we just close the modal so they can
        // retry. (Future: navigate to a /ludo/lobby/:roomId page.)
      }
      cleanup();
      setBusy(false);
    }, 8000);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="ludo-config-bg"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center px-4"
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
              background: `linear-gradient(180deg, #1F1810 0%, #14100A 100%)`,
              borderColor: `${SAND.gold}77`,
              boxShadow: `0 30px 80px rgba(0,0,0,0.85), 0 0 60px ${SAND.gold}33`,
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
              <span style={{ fontSize: 40, lineHeight: 1, filter: `drop-shadow(0 0 18px ${SAND.gold})` }}>{meta.icon}</span>
              <p className="font-arabic mt-2" style={{ fontSize: 11, letterSpacing: 4, color: `${SAND.gold}99` }}>
                {isAr ? '✦ لودو ✦' : '✦ LUDO ✦'}
              </p>
              <h2 className="font-arabic font-bold mt-1" style={{ fontSize: 22, color: SAND.cream }}>
                {isAr ? meta.ar : meta.en}
              </h2>
              <p className="font-arabic mt-0.5" style={{ fontSize: 12, color: 'rgba(245,230,200,0.5)' }}>
                {isAr ? meta.sub.ar : meta.sub.en}
              </p>
            </div>

            {/* Bet stepper — common to all modes */}
            <div className="rounded-2xl px-3 py-3 mb-3"
              style={{ background: 'rgba(217,164,65,0.06)', border: `1px solid ${SAND.gold}33` }}>
              <Stepper
                label={isAr ? `الرهان · رصيدك ${ludoCoins.toLocaleString()} 🪙` : `Bet · balance ${ludoCoins.toLocaleString()} 🪙`}
                value={bet}
                onChange={setBet}
                options={COIN_STEPS}
                format={v => v === 0 ? (isAr ? 'بدون رهان' : 'No bet') : `${v.toLocaleString()} 🪙`}
              />
              {!canAfford && (
                <p className="text-center font-arabic mt-2" style={{ fontSize: 11, color: '#FF8A65' }}>
                  {isAr ? 'الرصيد غير كافٍ' : 'Insufficient balance'}
                </p>
              )}
            </div>

            {/* Mode-specific options */}
            {mode === 'bots' ? (
              <>
                <div className="rounded-2xl px-3 py-3 mb-3"
                  style={{ background: 'rgba(217,164,65,0.06)', border: `1px solid ${SAND.gold}33` }}>
                  <Stepper
                    label={isAr ? 'عدد البوتات' : 'Number of bots'}
                    value={botCount}
                    onChange={setBotCount}
                    options={[1, 2, 3]}
                  />
                </div>

                {/* Difficulty cards */}
                <div className="rounded-2xl px-3 py-3 mb-3"
                  style={{ background: 'rgba(217,164,65,0.06)', border: `1px solid ${SAND.gold}33` }}>
                  <p className="font-arabic text-center mb-2" style={{ fontSize: 11, color: 'rgba(245,230,200,0.55)', letterSpacing: 1 }}>
                    {isAr ? 'الصعوبة' : 'Difficulty'}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {DIFFICULTIES.map(d => {
                      const sel = difficulty === d.id;
                      return (
                        <motion.button
                          key={d.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setDifficulty(d.id)}
                          className="rounded-xl flex flex-col items-center justify-center gap-1 py-2 transition-all"
                          style={{
                            background: sel ? `${SAND.gold}33` : 'rgba(255,255,255,0.025)',
                            border: `1.5px solid ${sel ? SAND.gold : 'rgba(255,255,255,0.08)'}`,
                            color: sel ? SAND.goldLight : 'rgba(245,230,200,0.55)',
                            boxShadow: sel ? `0 0 14px ${SAND.gold}55` : 'none',
                            cursor: 'pointer',
                          }}>
                          <span style={{ fontSize: 18 }}>{d.icon}</span>
                          <span className="font-arabic font-bold" style={{ fontSize: 11 }}>
                            {isAr ? d.ar : d.en}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl px-3 py-3 mb-3"
                style={{ background: 'rgba(217,164,65,0.06)', border: `1px solid ${SAND.gold}33` }}>
                <Stepper
                  label={isAr ? 'عدد اللاعبين' : 'Number of players'}
                  value={playerCount}
                  onChange={setPlayerCount}
                  options={PLAYER_OPTIONS}
                />
              </div>
            )}

            {/* Start button */}
            <motion.button
              whileHover={canAfford && !busy ? { scale: 1.02 } : {}}
              whileTap={canAfford && !busy ? { scale: 0.97 } : {}}
              disabled={!canAfford || busy}
              onClick={handleStart}
              className="w-full rounded-2xl font-arabic font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              style={{
                padding: '14px 20px',
                background: canAfford
                  ? `linear-gradient(135deg, ${SAND.goldLight} 0%, ${SAND.gold} 50%, ${SAND.goldDark} 100%)`
                  : 'rgba(255,255,255,0.04)',
                color: canAfford ? '#0E0905' : 'rgba(255,255,255,0.4)',
                fontSize: 16,
                letterSpacing: 1,
                boxShadow: canAfford ? `0 10px 28px rgba(0,0,0,0.5), 0 0 30px ${SAND.gold}66` : 'none',
                cursor: canAfford && !busy ? 'pointer' : 'not-allowed',
              }}
            >
              {busy
                ? (isAr ? 'جاري التحضير…' : 'Preparing…')
                : (mode === 'online' ? (isAr ? '🔍 ابحث عن خصوم' : '🔍 Find Opponents')
                                     : (isAr ? '▶ ابدأ المباراة' : '▶ Start Match'))}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
