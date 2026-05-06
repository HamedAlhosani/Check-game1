import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SOCKET_EVENTS, RoomState, GameType } from '@check-game/shared';
import { socketService } from '../../services/socket.service';
import { useAuthStore } from '../../store/authStore';
import { useLobbyStore } from '../../store/lobbyStore';
import { useUiStore } from '../../store/uiStore';
import { WaitingRoom } from '../../components/lobby/WaitingRoom';
import { JoinPrivateModal } from '../../components/lobby/JoinPrivateModal';
import { soundService } from '../../services/sound.service';
import { useT, useLang } from '../../i18n/useT';
import { LangToggle } from '../../components/shared/LangToggle';
import { DailyRewardModal } from '../../components/shared/DailyRewardModal';
import { FrameRing } from '../../components/shared/FrameRing';
import { apiClient } from '../../services/api.service';

type GameMode = 'online' | 'private' | 'bots';

function DailyRewardNavButton({ onOpen, lang }: { onOpen: () => void; lang: string }) {
  const [canClaim, setCanClaim] = useState<boolean | null>(null);
  useEffect(() => {
    apiClient.get<{ canClaim: boolean }>('/api/daily/status').then(r => setCanClaim(r.canClaim)).catch(() => setCanClaim(false));
  }, []);
  return (
    <motion.button
      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
      onClick={onOpen}
      className="relative rounded-xl flex items-center justify-center"
      title={lang === 'ar' ? 'الهدية اليومية' : 'Daily Reward'}
      style={{
        width: 36,
        height: 34,
        background: canClaim ? 'rgba(201,168,76,0.18)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${canClaim ? 'rgba(201,168,76,0.55)' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: canClaim ? '0 0 14px rgba(201,168,76,0.35)' : 'none',
        cursor: 'pointer',
      }}>
      <span style={{ fontSize: 18, lineHeight: 1 }}>{canClaim ? '🎁' : '📦'}</span>
      {canClaim && (
        <span className="absolute rounded-full animate-pulse"
          style={{ top: -3, right: -3, width: 9, height: 9, background: '#E04030', border: '1.5px solid #14100A' }} />
      )}
    </motion.button>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
const AV_COLORS = ['#C9A84C','#4A90D9','#50C878','#E74C3C','#9B59B6','#E67E22','#1ABC9C','#E91E63'];
const HOME_AVATAR_EMOJIS: Record<string, string> = {
  avatar_1: '👳', avatar_2: '🧕', avatar_3: '👴', avatar_4: '🧔',
  avatar_5: '👩', avatar_6: '👨', avatar_7: '🧑', avatar_8: '👵',
  avatar_9: '🕌', avatar_10: '🏙️', avatar_11: '💎', avatar_12: '🌟',
};
function AvatarCircle({ id, name, size = 40, frameId }: { id: string; name: string; size?: number; frameId?: string }) {
  const i = parseInt(id?.replace(/\D/g, '') || '1', 10) - 1;
  const emoji = HOME_AVATAR_EMOJIS[id];
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="rounded-full flex items-center justify-center font-bold text-white"
        style={{ width: size, height: size, background: AV_COLORS[i % AV_COLORS.length], fontSize: emoji ? size * 0.52 : size * 0.36 }}>
        {emoji || name?.slice(0, 2) || '?'}
      </div>
      <FrameRing frameId={frameId} size={size}/>
    </div>
  );
}

// ── Level title ────────────────────────────────────────────────────────────────
const TITLES_AR = ['مبتدئ الصحراء','مسافر الرمال','فارس النخيل','حارس الواحة','سيد الورق',
                   'بطل الإمارات','شيخ اللعبة','أمير الطاولة','سلطان الأوراق','سلطان الرياح'];
const TITLES_EN = ['Desert Beginner','Sand Traveler','Palm Knight','Oasis Guard','Card Master',
                   'UAE Champion','Game Sheikh','Table Prince','Card Sultan','Wind Sultan'];
function levelTitle(level: number, lang: string) {
  const t = lang === 'ar' ? TITLES_AR : TITLES_EN;
  return t[Math.min(level - 1, t.length - 1)] || t[0];
}

// ── XP bar ────────────────────────────────────────────────────────────────────
function XpBar({ xp }: { xp: number }) {
  const pct = Math.min(100, (xp % 200) / 2);
  return (
    <div style={{ height: 5, borderRadius: 3, background: 'rgba(201,168,76,0.12)', overflow: 'hidden', width: '100%' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #8B6914, #E8C97A)', borderRadius: 3, transition: 'width .6s ease', boxShadow: '0 0 6px rgba(201,168,76,0.4)' }}/>
    </div>
  );
}

// ── Mode card ─────────────────────────────────────────────────────────────────
function ModeCard({ icon, title, sub, selected, onClick, color }: {
  icon: string; title: string; sub: string; selected: boolean; onClick: () => void; color: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-2xl px-4 py-5 transition-all"
      style={{
        background: selected ? `rgba(${color},0.12)` : 'rgba(255,255,255,0.04)',
        border: `1.5px solid ${selected ? `rgba(${color},0.55)` : 'rgba(255,255,255,0.07)'}`,
        boxShadow: selected ? `0 0 24px rgba(${color},0.18)` : 'none',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 36 }}>{icon}</span>
      <p className="font-arabic font-bold" style={{ fontSize: 15, color: selected ? `rgb(${color})` : 'rgba(245,230,200,0.8)' }}>{title}</p>
      <p className="font-arabic" style={{ fontSize: 11, color: 'rgba(245,230,200,0.4)', textAlign: 'center' }}>{sub}</p>
    </motion.button>
  );
}

// ── Slider ────────────────────────────────────────────────────────────────────
function NumSlider({ label, value, min, max, step = 1, onChange, unit = '', formatValue }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string;
  formatValue?: (v: number) => string;
}) {
  const fmt = formatValue || ((v: number) => `${v}${unit}`);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="font-arabic text-sm" style={{ color: 'rgba(245,230,200,0.6)' }}>{label}</span>
        <span className="font-bold" style={{ color: '#E8C97A', fontSize: 15 }}>{fmt(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-gold" style={{ accentColor: '#C9A84C' }}/>
      <div className="flex justify-between" style={{ fontSize: 10, color: 'rgba(245,230,200,0.25)' }}>
        <span>{fmt(min)}</span><span>{fmt(max)}</span>
      </div>
    </div>
  );
}

// ── Config panel ──────────────────────────────────────────────────────────────
function ConfigPanel({ mode, coins, onCreate }: {
  mode: GameMode;
  coins: number;
  onCreate: (cfg: any) => void;
}) {
  const t = useT();
  const lang = useLang();
  const [playerCount, setPlayerCount] = useState(4);
  const [coinAmount, setCoinAmount] = useState(50);
  const [botCount, setBotCount] = useState(3);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const canAfford = coinAmount <= coins;

  const handleCreate = () => {
    if (mode !== 'bots' && !canAfford) return;
    soundService.playClick();
    if (mode === 'bots') {
      onCreate({ type: 'bots', botCount, difficulty, bet: 0 });
    } else {
      onCreate({ type: mode, playerCount, bet: coinAmount });
    }
  };

  const playersLabel = lang === 'ar' ? 'عدد اللاعبين' : 'Players';
  const coinsLabel = lang === 'ar' ? 'كوينز' : 'Coins';
  const botsLabel = lang === 'ar' ? 'عدد البوتات' : 'Number of Bots';
  const diffLabel = lang === 'ar' ? 'مستوى البوتات' : 'Bot Difficulty';

  return (
    <motion.div
      key={mode}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.15)' }}
    >
      {mode !== 'bots' ? (
        <>
          <NumSlider label={playersLabel} value={playerCount} min={2} max={10} onChange={setPlayerCount}/>
          <div className="flex flex-col gap-1.5">
            <NumSlider
              label={coinsLabel}
              value={coinAmount}
              min={50}
              max={50000}
              step={50}
              onChange={setCoinAmount}
              formatValue={v => `${v.toLocaleString()} 🪙`}
            />
            {!canAfford && (
              <p className="text-red-400 font-arabic text-xs">
                {lang === 'ar' ? 'كوينزك غير كافية!' : 'Not enough coins!'}
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <NumSlider label={botsLabel} value={botCount} min={1} max={10} onChange={setBotCount}/>
          <div className="flex flex-col gap-1.5">
            <span className="font-arabic text-sm" style={{ color: 'rgba(245,230,200,0.6)' }}>{diffLabel}</span>
            <div className="grid grid-cols-3 gap-2">
              {(['easy','medium','hard'] as const).map(d => (
                <button key={d} onClick={() => setDifficulty(d)}
                  className="py-2 rounded-xl font-arabic text-sm transition-all"
                  style={{
                    background: difficulty === d ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${difficulty === d ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    color: difficulty === d ? '#E8C97A' : 'rgba(245,230,200,0.45)',
                  }}>
                  {d === 'easy' ? t('easy') : d === 'medium' ? t('medium') : t('hard')}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <motion.button
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        onClick={handleCreate}
        disabled={mode !== 'bots' && !canAfford}
        className="w-full py-3 rounded-xl font-arabic font-bold text-base transition-all"
        style={{
          background: (mode === 'bots' || canAfford) ? 'linear-gradient(135deg, #C9A84C, #8B6914)' : 'rgba(255,255,255,0.06)',
          color: (mode === 'bots' || canAfford) ? '#0E0905' : 'rgba(255,255,255,0.25)',
          boxShadow: (mode === 'bots' || canAfford) ? '0 0 20px rgba(201,168,76,0.3)' : 'none',
          cursor: (mode === 'bots' || canAfford) ? 'pointer' : 'not-allowed',
        }}>
        {mode === 'online'
          ? (lang === 'ar' ? 'ابحث عن لعبة' : 'Find a Game')
          : mode === 'private'
            ? (lang === 'ar' ? 'إنشاء غرفة خاصة' : 'Create Private Room')
            : (lang === 'ar' ? 'ابدأ اللعبة' : 'Start Game')}
      </motion.button>
    </motion.div>
  );
}

// ── Searching Modal (online matchmaking) ──────────────────────────────────────
function SearchingModal({ onCancel, lang }: { onCancel: () => void; lang: string }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(20,14,8,0.88)', backdropFilter: 'blur(8px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6 rounded-3xl p-10 border"
        style={{ background: 'rgba(20,16,10,0.97)', borderColor: 'rgba(201,168,76,0.2)', minWidth: 300 }}
      >
        {/* Pulsing rings */}
        <div className="relative flex items-center justify-center" style={{ width: 90, height: 90 }}>
          {[1, 1.6, 2.2].map((scale, i) => (
            <motion.div
              key={i}
              animate={{ scale: [scale, scale + 0.3, scale], opacity: [0.4, 0.1, 0.4] }}
              transition={{ duration: 2, delay: i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute rounded-full border"
              style={{ width: 44, height: 44, borderColor: 'rgba(201,168,76,0.5)' }}
            />
          ))}
          <span style={{ fontSize: 32, position: 'relative', zIndex: 1 }}>🌍</span>
        </div>

        <div className="text-center">
          <p className="font-arabic font-bold text-lg mb-1" style={{ color: '#E8C97A' }}>
            {lang === 'ar' ? 'جاري البحث عن لاعبين...' : 'Searching for players...'}
          </p>
          <p className="font-arabic text-sm" style={{ color: 'rgba(245,230,200,0.4)' }}>
            {lang === 'ar' ? 'سيبدأ المباراة بمجرد اكتمال اللاعبين' : 'Match starts once players are found'}
          </p>
        </div>

        {/* Timer */}
        <div className="rounded-2xl px-8 py-3 border" style={{ background: 'rgba(201,168,76,0.06)', borderColor: 'rgba(201,168,76,0.15)' }}>
          <p className="font-mono text-3xl font-bold" style={{ color: '#C9A84C', letterSpacing: 4 }}>
            {mm}:{ss}
          </p>
        </div>

        <button
          onClick={onCancel}
          className="font-arabic text-sm px-6 py-2 rounded-xl transition-all border"
          style={{ background: 'rgba(196,92,58,0.08)', borderColor: 'rgba(196,92,58,0.3)', color: '#E07040' }}>
          {lang === 'ar' ? 'إلغاء البحث' : 'Cancel Search'}
        </button>
      </motion.div>
    </div>
  );
}

// ── Bot loading overlay ───────────────────────────────────────────────────────
function BotLoadingOverlay({ lang }: { lang: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(20,14,8,0.88)', backdropFilter: 'blur(8px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6 rounded-3xl p-10 border"
        style={{ background: 'rgba(20,16,10,0.97)', borderColor: 'rgba(201,168,76,0.2)', minWidth: 280 }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          style={{ width: 56, height: 56, borderRadius: '50%', border: '3px solid rgba(201,168,76,0.15)', borderTopColor: '#C9A84C' }}
        />
        <div className="text-center">
          <p className="font-arabic font-bold text-lg mb-1" style={{ color: '#E8C97A' }}>
            {lang === 'ar' ? '🤖 جاري تحضير اللعبة...' : '🤖 Preparing the game...'}
          </p>
          <p className="font-arabic text-sm" style={{ color: 'rgba(245,230,200,0.4)' }}>
            {lang === 'ar' ? 'ستبدأ اللعبة خلال لحظات' : 'Game will start in a moment'}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main HomePage ─────────────────────────────────────────────────────────────
export function HomePage() {
  const t = useT();
  const lang = useLang();
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { rooms, setRooms, currentRoom, setCurrentRoom } = useLobbyStore();
  const { addToast } = useUiStore();
  const [mode, setMode] = useState<GameMode>('bots');
  const [showJoin, setShowJoin] = useState(false);
  const [searching, setSearching] = useState(false);
  const [botLoading, setBotLoading] = useState(false);
  const [searchRoomId, setSearchRoomId] = useState<string | null>(null);
  const [showDaily, setShowDaily] = useState(false);
  const pendingModeRef = useRef<GameMode>('bots');

  useEffect(() => {
    // Always ensure a socket instance exists — connect() is idempotent
    const socket = socketService.connect();
    socket.on(SOCKET_EVENTS.LOBBY_ROOM_LIST, (data: RoomState[]) => setRooms(data));
    socket.on(SOCKET_EVENTS.LOBBY_ROOM_UPDATED, (room: RoomState) => {
      if (pendingModeRef.current === 'bots') {
        setBotLoading(true);
        setSearchRoomId(room.roomId);
        socket.emit(SOCKET_EVENTS.LOBBY_START_GAME, { roomId: room.roomId });
      } else if (pendingModeRef.current === 'online') {
        setSearching(true);
        setSearchRoomId(room.roomId);
      } else {
        setCurrentRoom(room);
      }
    });
    socket.on(SOCKET_EVENTS.LOBBY_GAME_STARTING, (data: { gameId: string; gameType: GameType }) => {
      setCurrentRoom(null);
      setSearching(false);
      setBotLoading(false);
      setSearchRoomId(null);
      soundService.playTurnStart();
      navigate(`/game/${data.gameType}/${data.gameId}`);
    });
    socket.on(SOCKET_EVENTS.LOBBY_ERROR, (data: { message: string }) => {
      setSearching(false);
      setBotLoading(false);
      addToast(data.message, 'error');
      soundService.playError();
    });
    socket.on(SOCKET_EVENTS.LOBBY_KICKED, (data: { message: string }) => {
      setCurrentRoom(null);
      addToast(data.message, 'error');
    });
    socket.on(SOCKET_EVENTS.LOBBY_INVITE_RECEIVED, (data: { roomCode: string; inviterName: string; roomName: string }) => {
      addToast(
        `${data.inviterName} دعاك: ${data.roomName}`,
        'success',
        10000,
        {
          label: 'انضم ←',
          onClick: () => {
            pendingModeRef.current = 'private';
            socket.emit(SOCKET_EVENTS.LOBBY_JOIN_PRIVATE, { code: data.roomCode });
          },
        }
      );
    });
    return () => {
      socket.off(SOCKET_EVENTS.LOBBY_ROOM_LIST);
      socket.off(SOCKET_EVENTS.LOBBY_ROOM_UPDATED);
      socket.off(SOCKET_EVENTS.LOBBY_GAME_STARTING);
      socket.off(SOCKET_EVENTS.LOBBY_ERROR);
      socket.off(SOCKET_EVENTS.LOBBY_KICKED);
      socket.off(SOCKET_EVENTS.LOBBY_INVITE_RECEIVED);
    };
  }, []);

  function handleCancelSearch() {
    const socket = socketService.getSocket();
    if (socket && searchRoomId) {
      socket.emit(SOCKET_EVENTS.LOBBY_LEAVE_ROOM, { roomId: searchRoomId });
    }
    setSearching(false);
    setSearchRoomId(null);
  }

  const handleCreate = async (cfg: any) => {
    pendingModeRef.current = cfg.type === 'bots' ? 'bots' : cfg.type === 'private' ? 'private' : 'online';

    // Show a quick spinner if we have to wait for the socket to reconnect
    // (e.g. user clicked Start right after leaving a previous game).
    if (!socketService.isReady()) {
      if (cfg.type === 'bots') setBotLoading(true);
      else if (cfg.type === 'online') setSearching(true);
    }

    let socket;
    try {
      socket = await socketService.ensureReady(5000);
    } catch {
      setBotLoading(false);
      setSearching(false);
      addToast(lang === 'ar' ? 'تعذّر الاتصال بالخادم — حاول مرة أخرى' : 'Could not reach server — please retry', 'error');
      return;
    }

    if (cfg.type === 'bots') {
      socket.emit(SOCKET_EVENTS.LOBBY_CREATE_ROOM, {
        name: `لعبة بوتات`,
        type: 'private',
        botCount: cfg.botCount,
        botDifficulty: cfg.difficulty,
        gameType: 'check',
      });
    } else if (cfg.type === 'private') {
      socket.emit(SOCKET_EVENTS.LOBBY_CREATE_ROOM, {
        name: `غرفة خاصة`,
        type: 'private',
        botCount: 0,
        botDifficulty: 'medium',
        gameType: 'check',
        betAmount: cfg.bet,
        maxPlayers: cfg.playerCount,
      });
    } else {
      socket.emit(SOCKET_EVENTS.LOBBY_CREATE_ROOM, {
        name: `غرفة عامة`,
        type: 'public',
        botCount: 0,
        botDifficulty: 'medium',
        gameType: 'check',
        betAmount: cfg.bet,
        maxPlayers: cfg.playerCount,
      });
    }
  };

  const coins = profile?.coins ?? 0;
  const level = profile?.ranking?.level ?? 1;
  const xp = profile?.ranking?.xp ?? 0;
  const wins = profile?.stats?.totalWins ?? 0;
  const games = profile?.stats?.totalGames ?? 0;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #1A1408 0%, #14100A 50%, #0E0905 100%)', direction: dir, overflowX: 'hidden' }} className="pb-16 sm:pb-0">

      {/* ── Top nav bar ── */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-4 py-2.5"
        style={{ background: 'rgba(20,16,10,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(201,168,76,0.12)' }}>
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src="/assets/og-image.png" alt="Check"
            style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 0 14px rgba(201,168,76,0.35)', border: '1px solid rgba(201,168,76,0.4)' }}/>
          <span className="font-display tracking-widest hidden sm:inline" style={{ fontSize: 18, color: '#C9A84C', textShadow: '0 0 16px rgba(201,168,76,0.4)' }}>CHECK</span>
        </Link>
        <div className="flex items-center gap-2">
          <LangToggle />
          {/* Daily reward — moved out of the games area into the top nav */}
          <DailyRewardNavButton onOpen={() => setShowDaily(true)} lang={lang} />
          {/* Coins */}
          <div className="flex items-center gap-1.5 rounded-xl px-3 py-1.5"
            style={{ background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.25)' }}>
            <span style={{ fontSize: 15 }}>🪙</span>
            <span className="font-bold" style={{ fontSize: 13, color: '#E8C97A' }}>{coins.toLocaleString()}</span>
          </div>
          {/* Desktop nav links — hidden on mobile */}
          <div className="hidden sm:flex items-center gap-2">
            <Link to="/" className="rounded-xl px-2.5 py-1.5 transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(245,230,200,0.6)', fontSize: 12 }}>
              🏠 {lang === 'ar' ? 'الصفحة الرئيسية' : 'Home'}
            </Link>
            <Link to="/store" className="rounded-xl px-2.5 py-1.5 transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(245,230,200,0.6)', fontSize: 12 }}>
              🏪 {lang === 'ar' ? 'المتجر' : 'Store'}
            </Link>
            <Link to="/friends" className="rounded-xl px-2.5 py-1.5 transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(245,230,200,0.6)', fontSize: 12 }}>
              👥 {lang === 'ar' ? 'أصدقاء' : 'Friends'}
            </Link>
            <Link to="/history" className="rounded-xl px-2.5 py-1.5 transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(245,230,200,0.6)', fontSize: 12 }}>
              📋 {lang === 'ar' ? 'سجل' : 'History'}
            </Link>
            <Link to="/leaderboard" className="rounded-xl px-2.5 py-1.5 transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(245,230,200,0.6)', fontSize: 12 }}>
              🏆 {lang === 'ar' ? 'التصنيف' : 'Ranks'}
            </Link>
            <Link to="/profile">
              {profile && <AvatarCircle id={profile.avatarId} name={profile.displayName} size={32} frameId={(profile.equippedItems as any)?.avatarFrame}/>}
            </Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 40px' }}>

        {/* ── Profile card ── */}
        {profile && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4 mb-5 flex items-center gap-4"
            style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.10) 0%, rgba(16,10,30,0.95) 100%)', border: '1px solid rgba(201,168,76,0.2)', boxShadow: '0 0 24px rgba(201,168,76,0.08)' }}
          >
            <Link to="/profile" style={{ textDecoration: 'none' }}>
              <div className="relative">
                <AvatarCircle id={profile.avatarId} name={profile.displayName} size={52} frameId={(profile.equippedItems as any)?.avatarFrame}/>
                <div className="absolute -bottom-0.5 -right-0.5 rounded-full px-1.5"
                  style={{ background: '#C9A84C', fontSize: 9, color: '#0E0905', fontWeight: 800, lineHeight: '16px' }}>
                  {level}
                </div>
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <h2 className="font-arabic font-bold truncate" style={{ fontSize: 17, color: '#E8C97A' }}>{profile.displayName}</h2>
                <span className="font-arabic" style={{ fontSize: 11, color: 'rgba(201,168,76,0.55)' }}>{levelTitle(level, lang)}</span>
              </div>
              <div className="flex gap-4 my-1.5">
                <span className="font-arabic text-xs" style={{ color: 'rgba(245,230,200,0.4)' }}>
                  <span style={{ color: '#C9A84C', fontWeight: 700 }}>{wins}</span> {t('wins')}
                </span>
                <span className="font-arabic text-xs" style={{ color: 'rgba(245,230,200,0.4)' }}>
                  <span style={{ color: '#C9A84C', fontWeight: 700 }}>{games}</span> {t('games')}
                </span>
                <span className="font-arabic text-xs" style={{ color: 'rgba(245,230,200,0.4)' }}>
                  🔥 <span style={{ color: '#C9A84C', fontWeight: 700 }}>{profile.stats?.currentStreak ?? 0}</span>
                </span>
              </div>
              <XpBar xp={xp}/>
            </div>
          </motion.div>
        )}

        {currentRoom ? (
          <WaitingRoom room={currentRoom} onLeave={() => setCurrentRoom(null)} />
        ) : (
          <>
            {/* ── Game title ── */}
            <div className="text-center mb-5">
              <div className="flex items-center justify-center gap-3 mb-1">
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.3))' }}/>
                <span className="font-display tracking-widest" style={{ fontSize: 22, color: '#C9A84C' }}>CHECK</span>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(201,168,76,0.3))' }}/>
              </div>
              <p className="font-arabic" style={{ fontSize: 12, color: 'rgba(245,230,200,0.3)' }}>{t('home_subtitle')}</p>
            </div>

            {/* ── Mode cards ── */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <ModeCard icon="🌍" title={t('mode_online')} sub={t('mode_online_desc')}
                selected={mode === 'online'} color="80,160,220"
                onClick={() => { setMode('online'); soundService.playClick(); }}/>
              <ModeCard icon="🔒" title={t('mode_private')} sub={t('mode_private_desc')}
                selected={mode === 'private'} color="232,144,58"
                onClick={() => { setMode('private'); soundService.playClick(); }}/>
              <ModeCard icon="🤖" title={t('mode_bot')} sub={t('mode_bot_desc')}
                selected={mode === 'bots'} color="80,200,120"
                onClick={() => { setMode('bots'); soundService.playClick(); }}/>
            </div>

            {/* ── Config panel ── */}
            <AnimatePresence mode="wait">
              <ConfigPanel key={mode} mode={mode} coins={coins} onCreate={handleCreate}/>
            </AnimatePresence>

            {/* ── Join private room link — only in private mode ── */}
            {mode === 'private' && (
              <div className="mt-3 text-center">
                <button onClick={() => setShowJoin(true)}
                  className="font-arabic text-sm transition-all"
                  style={{ color: 'rgba(245,230,200,0.35)', textDecoration: 'underline', textDecorationColor: 'rgba(245,230,200,0.15)' }}>
                  🔑 {lang === 'ar' ? 'انضم بكود غرفة خاصة' : 'Join with room code'}
                </button>
              </div>
            )}

          </>
        )}
      </div>

      <JoinPrivateModal open={showJoin} onClose={() => setShowJoin(false)} onBeforeJoin={() => { pendingModeRef.current = 'private'; }}/>
      <DailyRewardModal open={showDaily} onClose={() => setShowDaily(false)}/>

      {searching && <SearchingModal onCancel={handleCancelSearch} lang={lang}/>}
      {botLoading && <BotLoadingOverlay lang={lang}/>}

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex sm:hidden items-center border-t"
        style={{ background: 'rgba(20,16,10,0.97)', backdropFilter: 'blur(12px)', borderColor: 'rgba(201,168,76,0.15)', height: 56 }}>
        {[
          { to: '/home', icon: '🏠', label: lang === 'ar' ? 'الرئيسية' : 'Home' },
          { to: '/store', icon: '🏪', label: lang === 'ar' ? 'المتجر' : 'Store' },
          { to: '/leaderboard', icon: '🏆', label: lang === 'ar' ? 'التصنيف' : 'Rank' },
          { to: '/friends', icon: '👥', label: lang === 'ar' ? 'أصدقاء' : 'Friends' },
          { to: '/profile', icon: '👤', label: lang === 'ar' ? 'حسابي' : 'Profile' },
        ].map(item => (
          <Link key={item.to} to={item.to}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all"
            style={{ color: 'rgba(245,230,200,0.5)', fontSize: 10 }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span className="font-arabic">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

