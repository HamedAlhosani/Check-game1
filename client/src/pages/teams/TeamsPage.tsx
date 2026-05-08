import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { socketService } from '../../services/socket.service';
import { soundService } from '../../services/sound.service';
import { useUiStore } from '../../store/uiStore';
import { useLobbyStore } from '../../store/lobbyStore';
import { SOCKET_EVENTS, RoomState, GameType } from '@check-game/shared';
import { PageShell } from '../../components/shared/PageShell';
import { useLang } from '../../i18n/useT';
import { WaitingRoom } from '../../components/lobby/WaitingRoom';

/**
 * TeamsPage — dedicated /teams page for 2v2 Team mode. Three flows:
 *
 *   • Online   — public matchmaking. Server pairs into a 2v2 room with
 *                random partners + opponents until 4 are seated. Auto-
 *                starts when full.
 *   • Friend   — private room with a shareable code. Friend joins via
 *                code, host can fill empty seats with bots and start.
 *                Mounts the same WaitingRoom component /home uses for
 *                its private flow.
 *   • Bots     — instant 1 + 3-bot quick match. Easy partner, medium
 *                opponents.
 *
 * All three create a Check room with teamMode='2v2', maxPlayers=4. The
 * engine alternates seat assignment to put partners diagonally opposite,
 * routes scoring through calculateTeamRoundScores, and ends the match
 * the moment one team is fully eliminated.
 */

type Mode = 'pick' | 'searching';

export function TeamsPage() {
  const lang = useLang();
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const { currentRoom, setCurrentRoom } = useLobbyStore();
  const [mode, setMode] = useState<Mode>('pick');
  const [busy, setBusy] = useState(false);
  // Whether the next room create came from this page; gates our own
  // global socket listeners so we don't react to creates by /home.
  const launchedRef = useRef<'online' | 'friend' | 'bots' | null>(null);

  useEffect(() => {
    const sock = socketService.getSocket();
    if (!sock) return;

    const onRoomUpdated = (room: RoomState) => {
      // Only react to OUR room creates — /home has its own listener and
      // we don't want to cross-fire.
      if (!launchedRef.current) return;
      if (room.teamMode !== '2v2') return;
      if (launchedRef.current === 'bots') {
        // Bots flow: server created the room → start immediately.
        sock.emit(SOCKET_EVENTS.LOBBY_START_GAME, { roomId: room.roomId });
        return;
      }
      // Online + Friend: surface the room to the user.
      setCurrentRoom(room);
      if (launchedRef.current === 'online') {
        // Public match: keep showing the searching UI until LOBBY_GAME_STARTING.
        setMode('searching');
      }
    };
    const onGameStarting = (data: { gameId: string; gameType: GameType }) => {
      if (!launchedRef.current) return;
      launchedRef.current = null;
      setCurrentRoom(null);
      navigate(`/game/${data.gameType}/${data.gameId}`);
    };
    const onError = (data: { message: string }) => {
      launchedRef.current = null;
      setBusy(false);
      setMode('pick');
      setCurrentRoom(null);
      addToast(data.message || (lang === 'ar' ? 'تعذّر بدء المباراة' : 'Could not start match'), 'error');
    };
    const onKicked = () => {
      setCurrentRoom(null);
      setMode('pick');
      addToast(lang === 'ar' ? 'تم إخراجك من الغرفة' : 'You were kicked', 'info');
    };

    sock.on(SOCKET_EVENTS.LOBBY_ROOM_UPDATED, onRoomUpdated);
    sock.on(SOCKET_EVENTS.LOBBY_GAME_STARTING, onGameStarting);
    sock.on(SOCKET_EVENTS.LOBBY_ERROR, onError);
    sock.on(SOCKET_EVENTS.LOBBY_KICKED, onKicked);
    return () => {
      sock.off(SOCKET_EVENTS.LOBBY_ROOM_UPDATED, onRoomUpdated);
      sock.off(SOCKET_EVENTS.LOBBY_GAME_STARTING, onGameStarting);
      sock.off(SOCKET_EVENTS.LOBBY_ERROR, onError);
      sock.off(SOCKET_EVENTS.LOBBY_KICKED, onKicked);
    };
  }, [navigate, addToast, lang, setCurrentRoom]);

  // Clean up the lobby state if the user navigates away mid-search.
  useEffect(() => {
    return () => { setCurrentRoom(null); };
  }, [setCurrentRoom]);

  async function ensureSocket() {
    try {
      return await socketService.ensureReady(5000);
    } catch {
      addToast(lang === 'ar' ? 'تعذّر الاتصال بالخادم' : 'Connection failed', 'error');
      return null;
    }
  }

  async function startVsBots() {
    if (busy) return;
    setBusy(true);
    soundService.playClick();
    const sock = await ensureSocket();
    if (!sock) { setBusy(false); return; }
    launchedRef.current = 'bots';
    sock.emit(SOCKET_EVENTS.LOBBY_CREATE_ROOM, {
      name: 'فريق ٢ ضد ٢',
      type: 'private',
      botCount: 3,
      botDifficulty: 'medium',
      gameType: 'check',
      gameMode: 'quick',
      teamMode: '2v2',
      maxPlayers: 4,
    });
  }

  async function startOnline() {
    if (busy) return;
    setBusy(true);
    soundService.playClick();
    const sock = await ensureSocket();
    if (!sock) { setBusy(false); return; }
    launchedRef.current = 'online';
    setMode('searching');
    sock.emit(SOCKET_EVENTS.LOBBY_CREATE_ROOM, {
      name: 'فريق ٢ ضد ٢ — أونلاين',
      type: 'public',
      botCount: 0,
      botDifficulty: 'medium',
      gameType: 'check',
      gameMode: 'quick',
      teamMode: '2v2',
      maxPlayers: 4,
    });
  }

  async function startWithFriend() {
    if (busy) return;
    setBusy(true);
    soundService.playClick();
    const sock = await ensureSocket();
    if (!sock) { setBusy(false); return; }
    launchedRef.current = 'friend';
    sock.emit(SOCKET_EVENTS.LOBBY_CREATE_ROOM, {
      name: 'فريق ٢ ضد ٢ — خاص',
      type: 'private',
      botCount: 0,
      botDifficulty: 'medium',
      gameType: 'check',
      gameMode: 'quick',
      teamMode: '2v2',
      maxPlayers: 4,
    });
  }

  function cancelSearch() {
    soundService.playClick();
    const sock = socketService.getSocket();
    if (sock && currentRoom) {
      sock.emit(SOCKET_EVENTS.LOBBY_LEAVE_ROOM, { roomId: currentRoom.roomId });
    }
    launchedRef.current = null;
    setCurrentRoom(null);
    setBusy(false);
    setMode('pick');
  }

  // ── RENDER ────────────────────────────────────────────────────────────────

  // Active private room → render full WaitingRoom (code, invites, bot fill,
  // start). Same component the /home private flow uses, so we get all of
  // its features for free (kick, ready, fill-with-bots, friend invite).
  if (currentRoom && currentRoom.code && launchedRef.current === 'friend') {
    return (
      <PageShell
        title={lang === 'ar' ? '🤝 غرفة الفريق' : '🤝 Team Room'}
        subtitle={lang === 'ar' ? 'شارك الكود مع شريكك' : 'Share the code with your partner'}
        lang={lang}
        back="/teams"
      >
        <WaitingRoom
          room={currentRoom}
          onLeave={() => {
            launchedRef.current = null;
            setCurrentRoom(null);
            setMode('pick');
          }}
        />
      </PageShell>
    );
  }

  // Online matchmaking → searching spinner.
  if (mode === 'searching') {
    return (
      <PageShell
        title={lang === 'ar' ? '🤝 فريقك' : '🤝 Teams'}
        subtitle={lang === 'ar' ? 'البحث عن لاعبين' : 'Searching players'}
        lang={lang}
        back="/teams"
      >
        <SearchingPanel
          lang={lang}
          playerCount={currentRoom?.players.filter(p => !p.isBot).length || 1}
          onCancel={cancelSearch}
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title={lang === 'ar' ? '🤝 فريقك' : '🤝 Teams'}
      subtitle={lang === 'ar' ? 'العب ٢ ضد ٢ — شارك مصير شريكك' : '2v2 — your fate ties to your partner'}
      lang={lang}
    >
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl p-5 mb-4 border text-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #2A1C0E 0%, #0E0905 100%)',
          borderColor: 'rgba(229,188,124,0.40)',
          boxShadow: '0 12px 38px rgba(0,0,0,0.65), 0 0 26px rgba(229,188,124,0.20)',
        }}
      >
        <div
          className="rounded-full mx-auto mb-2 flex items-center justify-center"
          style={{
            width: 72, height: 72,
            background: 'radial-gradient(circle at 30% 28%, rgba(255,255,255,0.30), transparent 55%), #3A2516',
            border: '2px solid rgba(255,224,122,0.85)',
            boxShadow: '0 0 28px rgba(255,224,122,0.45), inset 0 -10px 22px rgba(0,0,0,0.45)',
            fontSize: 36, lineHeight: 1,
          }}
        >
          🤝
        </div>
        <p className="font-arabic font-bold mb-0.5" style={{ fontSize: 20, color: '#FFE07A', textShadow: '0 0 14px rgba(255,224,122,0.45)' }}>
          {lang === 'ar' ? 'وضع الفرق ٢ ضد ٢' : '2v2 Teams Mode'}
        </p>
        <p className="font-arabic" style={{ fontSize: 12.5, color: 'rgba(251,243,219,0.65)', lineHeight: 1.65 }}>
          {lang === 'ar'
            ? 'فريقين، كل فريق فيه لاعبين. النقاط تتجمع للفريق. CHECK يقارن مجاميع الفريقين.'
            : 'Two teams of two. Hands stack within a team. CHECK compares team totals.'}
        </p>
      </motion.div>

      {/* Three big mode buttons */}
      <div className="flex flex-col gap-2.5 mb-4">
        <ModeButton
          icon="🌍"
          title={lang === 'ar' ? 'أونلاين — مباراة سريعة' : 'Online — Quick Match'}
          sub={lang === 'ar' ? 'لاعبين عشوائيين، يبدأ لما تكتمل ٤ لاعبين' : 'Random players, auto-starts at 4'}
          tone="cyan"
          busy={busy}
          onClick={startOnline}
        />
        <ModeButton
          icon="👥"
          title={lang === 'ar' ? 'مع صديق' : 'With a Friend'}
          sub={lang === 'ar' ? 'غرفة خاصة بكود — صديقك ينضم وتكمّلون ببوتات' : 'Private room with code — fill remaining seats with bots'}
          tone="purple"
          busy={busy}
          onClick={startWithFriend}
        />
        <ModeButton
          icon="🤖"
          title={lang === 'ar' ? 'ضد البوتات' : 'Vs Bots'}
          sub={lang === 'ar' ? 'شريك بوت سهل، خصمين متوسطين — يبدأ فوراً' : 'Easy bot partner, medium opponents — instant'}
          tone="amber"
          busy={busy}
          onClick={startVsBots}
        />
      </div>

      <p className="font-arabic text-center" style={{ fontSize: 11, color: 'rgba(251,243,219,0.40)' }}>
        {lang === 'ar' ? 'كل الأوضاع تستخدم جولة سريعة (٥٠ نقطة)' : 'All modes use quick match (50 pts cap)'}
      </p>
    </PageShell>
  );
}

// ── Helper components ─────────────────────────────────────────────────────

function ModeButton({ icon, title, sub, tone, busy, onClick }: {
  icon: string;
  title: string;
  sub: string;
  tone: 'cyan' | 'purple' | 'amber';
  busy: boolean;
  onClick: () => void;
}) {
  const palette =
    tone === 'cyan'   ? { bg: 'rgba(122,180,255,0.10)', border: 'rgba(122,180,255,0.45)', text: '#9DC4FF', glow: 'rgba(122,180,255,0.25)' } :
    tone === 'purple' ? { bg: 'rgba(196,149,255,0.10)', border: 'rgba(196,149,255,0.45)', text: '#C495FF', glow: 'rgba(196,149,255,0.25)' } :
                        { bg: 'rgba(255,140,40,0.10)',  border: 'rgba(255,140,40,0.45)',  text: '#FFB347', glow: 'rgba(255,140,40,0.25)' };
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={busy}
      className="rounded-2xl border flex items-center gap-3 transition-all disabled:opacity-50"
      style={{
        padding: '14px 16px',
        background: palette.bg,
        borderColor: palette.border,
        boxShadow: `0 4px 14px rgba(0,0,0,0.40), 0 0 16px ${palette.glow}`,
        cursor: busy ? 'wait' : 'pointer',
      }}
    >
      <div
        className="rounded-xl flex items-center justify-center shrink-0"
        style={{
          width: 48, height: 48,
          background: `radial-gradient(circle at 30% 30%, ${palette.glow.replace('0.25', '0.55')}, transparent 70%)`,
          border: `1px solid ${palette.border}`,
          fontSize: 26, lineHeight: 1,
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0 text-start">
        <p className="font-arabic font-bold" style={{ fontSize: 15, color: palette.text }}>{title}</p>
        <p className="font-arabic mt-0.5" style={{ fontSize: 11.5, color: 'rgba(251,243,219,0.55)', lineHeight: 1.5 }}>{sub}</p>
      </div>
      <span style={{ fontSize: 22, color: palette.text, opacity: 0.7 }}>‹</span>
    </motion.button>
  );
}

function SearchingPanel({ lang, playerCount, onCancel }: { lang: string; playerCount: number; onCancel: () => void }) {
  return (
    <div className="rounded-3xl p-6 text-center border"
      style={{
        background: 'linear-gradient(160deg, #2A1C0E 0%, #0E0905 100%)',
        borderColor: 'rgba(122,180,255,0.45)',
        boxShadow: '0 12px 38px rgba(0,0,0,0.65), 0 0 26px rgba(122,180,255,0.25)',
      }}>
      <motion.div
        animate={{ scale: [1, 1.10, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        className="rounded-full mx-auto mb-4 flex items-center justify-center"
        style={{
          width: 88, height: 88,
          background: 'radial-gradient(circle at 30% 28%, rgba(180,220,255,0.35), transparent 60%), #16243A',
          border: '2px solid rgba(122,180,255,0.85)',
          boxShadow: '0 0 30px rgba(122,180,255,0.45), inset 0 -10px 22px rgba(0,0,0,0.40)',
          fontSize: 42, lineHeight: 1,
        }}>
        🌍
      </motion.div>
      <p className="font-arabic font-bold mb-1" style={{ fontSize: 20, color: '#9DC4FF' }}>
        {lang === 'ar' ? 'البحث عن لاعبين...' : 'Searching players...'}
      </p>
      <p className="font-arabic mb-5" style={{ fontSize: 13, color: 'rgba(251,243,219,0.60)' }}>
        {lang === 'ar'
          ? `${playerCount}/4 لاعبين — اللعبة تبدأ لما تكتمل`
          : `${playerCount}/4 players — match starts when full`}
      </p>
      <div className="flex gap-1.5 justify-center mb-5">
        {[0, 1, 2, 3].map(i => (
          <motion.div
            key={i}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
            className="rounded-full"
            style={{
              width: 12, height: 12,
              background: i < playerCount ? '#7AC74F' : 'rgba(122,180,255,0.65)',
              boxShadow: i < playerCount ? '0 0 8px rgba(122,199,79,0.7)' : '0 0 8px rgba(122,180,255,0.5)',
            }}
          />
        ))}
      </div>
      <button
        onClick={onCancel}
        className="px-6 py-2 rounded-xl font-arabic font-bold transition-all"
        style={{
          background: 'rgba(196,92,58,0.10)',
          border: '1px solid rgba(196,92,58,0.40)',
          color: '#E07040',
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        {lang === 'ar' ? 'إلغاء البحث' : 'Cancel search'}
      </button>
    </div>
  );
}
