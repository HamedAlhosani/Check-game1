import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { socketService } from '../../services/socket.service';
import { soundService } from '../../services/sound.service';
import { useUiStore } from '../../store/uiStore';
import { SOCKET_EVENTS, RoomState, GameType } from '@check-game/shared';
import { PageShell } from '../../components/shared/PageShell';
import { useLang } from '../../i18n/useT';

/**
 * TeamsPage — dedicated /teams page (intentionally separate from /home's
 * Bots/Online/Private chooser). For now, the only mode is "2v2 vs bots":
 * 1 human + 1 easy-bot teammate, against 2 medium-bot opponents. Online
 * matchmaking with a friend partner is planned but not in this drop.
 *
 * Flow on Start:
 *   1. emit LOBBY_CREATE_ROOM with teamMode='2v2', botCount=3, gameMode='quick'
 *   2. server creates the room → sends LOBBY_ROOM_UPDATED
 *   3. we LOBBY_START_GAME the room
 *   4. server emits LOBBY_GAME_STARTING → we navigate to /game/check/:id
 *   5. CheckBoard renders; the engine routes scoring through the team-aware
 *      scorer, so partners share their CHECK fate.
 */
export function TeamsPage() {
  const lang = useLang();
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const [launching, setLaunching] = useState(false);
  const launchedRef = useRef(false);

  useEffect(() => {
    const sock = socketService.getSocket();
    if (!sock) return;

    const onRoomUpdated = (room: RoomState) => {
      if (!launchedRef.current) return;
      sock.emit(SOCKET_EVENTS.LOBBY_START_GAME, { roomId: room.roomId });
    };
    const onGameStarting = (data: { gameId: string; gameType: GameType }) => {
      if (!launchedRef.current) return;
      launchedRef.current = false;
      navigate(`/game/${data.gameType}/${data.gameId}`);
    };
    const onError = (data: { message: string }) => {
      launchedRef.current = false;
      setLaunching(false);
      addToast(data.message || (lang === 'ar' ? 'تعذّر بدء المباراة' : 'Could not start match'), 'error');
    };

    sock.on(SOCKET_EVENTS.LOBBY_ROOM_UPDATED, onRoomUpdated);
    sock.on(SOCKET_EVENTS.LOBBY_GAME_STARTING, onGameStarting);
    sock.on(SOCKET_EVENTS.LOBBY_ERROR, onError);
    return () => {
      sock.off(SOCKET_EVENTS.LOBBY_ROOM_UPDATED, onRoomUpdated);
      sock.off(SOCKET_EVENTS.LOBBY_GAME_STARTING, onGameStarting);
      sock.off(SOCKET_EVENTS.LOBBY_ERROR, onError);
    };
  }, [navigate, addToast, lang]);

  const handleStartVsBots = async () => {
    if (launching) return;
    setLaunching(true);
    soundService.playClick();
    let sock;
    try {
      sock = await socketService.ensureReady(5000);
    } catch {
      setLaunching(false);
      addToast(lang === 'ar' ? 'تعذّر الاتصال بالخادم' : 'Connection failed', 'error');
      return;
    }
    launchedRef.current = true;
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
  };

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
        className="rounded-3xl p-6 mb-4 border text-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #2A1C0E 0%, #0E0905 100%)',
          borderColor: 'rgba(229,188,124,0.40)',
          boxShadow: '0 12px 38px rgba(0,0,0,0.65), 0 0 26px rgba(229,188,124,0.20)',
        }}
      >
        <div
          className="rounded-full mx-auto mb-3 flex items-center justify-center"
          style={{
            width: 84, height: 84,
            background: 'radial-gradient(circle at 30% 28%, rgba(255,255,255,0.30), transparent 55%), #3A2516',
            border: '2px solid rgba(255,224,122,0.85)',
            boxShadow: '0 0 28px rgba(255,224,122,0.45), inset 0 -10px 22px rgba(0,0,0,0.45)',
            fontSize: 42, lineHeight: 1,
          }}
        >
          🤝
        </div>
        <p className="font-arabic font-bold mb-1" style={{ fontSize: 22, color: '#FFE07A', textShadow: '0 0 14px rgba(255,224,122,0.45)' }}>
          {lang === 'ar' ? 'وضع الفرق ٢ ضد ٢' : '2v2 Teams Mode'}
        </p>
        <p className="font-arabic" style={{ fontSize: 13, color: 'rgba(251,243,219,0.65)', lineHeight: 1.7 }}>
          {lang === 'ar'
            ? 'كل فريق فيه لاعبين، النقاط تتجمع للفريق ككل. لو شريكك حصل أعلى نقاط، أنت تتأثر معاه. لو فريقك ضرب CHECK وكنتو الأقل ككل: ٠ نقاط للفريق.'
            : 'Two players per team, scores stack for the team. If your partner racks up points, you share them. If your team CHECKs and is alone-lowest: 0 for both of you.'}
        </p>
      </motion.div>

      {/* What you'll do — 3 quick bullets */}
      <div className="rounded-2xl p-4 mb-4 border" style={{ background: 'rgba(229,188,124,0.05)', borderColor: 'rgba(229,188,124,0.18)' }}>
        <p className="font-arabic font-bold mb-3" style={{ color: '#E8C97A', fontSize: 14 }}>
          {lang === 'ar' ? 'وش يفرّق ٢ ضد ٢ عن العادي:' : 'What changes vs solo:'}
        </p>
        {[
          lang === 'ar' ? 'فريقك يجلس قطريّاً — مقعد ١+٣ ضد ٢+٤' : 'Partners sit diagonally — seats 1+3 vs 2+4',
          lang === 'ar' ? 'النقاط تتجمع للفريق: مجموع يدك + يد شريكك' : 'Scores stack: your hand sum + partner\'s hand sum',
          lang === 'ar' ? 'CHECK يقارن مجموع الفريقين، مب اللاعبين' : 'CHECK compares team totals, not individual hands',
        ].map((line, i) => (
          <div key={i} className="flex items-start gap-2.5 mb-1.5">
            <span
              className="rounded-full flex items-center justify-center font-bold shrink-0"
              style={{
                width: 22, height: 22,
                background: 'rgba(229,188,124,0.18)',
                border: '1px solid rgba(229,188,124,0.45)',
                color: '#E8C97A',
                fontSize: 11,
              }}
            >
              {i + 1}
            </span>
            <span className="font-arabic" style={{ fontSize: 13.5, color: 'rgba(251,243,219,0.85)', lineHeight: 1.7 }}>
              {line}
            </span>
          </div>
        ))}
      </div>

      {/* Start CTA */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleStartVsBots}
        disabled={launching}
        className="w-full font-arabic font-bold transition-all"
        style={{
          padding: '16px 24px',
          borderRadius: 18,
          background: launching
            ? 'rgba(229,188,124,0.30)'
            : 'linear-gradient(135deg, #FFE07A 0%, #C9A84C 50%, #A07338 100%)',
          color: '#100A05',
          fontSize: 18,
          border: '2px solid rgba(255,224,122,0.85)',
          boxShadow: launching
            ? 'none'
            : '0 8px 24px rgba(0,0,0,0.55), 0 0 30px rgba(255,224,122,0.45)',
          cursor: launching ? 'wait' : 'pointer',
        }}
      >
        {launching
          ? (lang === 'ar' ? 'جاري التحضير...' : 'Preparing...')
          : (lang === 'ar' ? '🤖 العب مع شريك بوت' : '🤖 Play with a bot partner')}
      </motion.button>

      <p className="font-arabic text-center mt-3" style={{ fontSize: 11, color: 'rgba(251,243,219,0.35)' }}>
        {lang === 'ar' ? 'شريكك بوت سهل، الخصوم بوتات متوسطين' : 'Easy bot partner, medium bot opponents'}
      </p>

      {/* Soon banner */}
      <div className="rounded-xl p-3 mt-5 border" style={{ background: 'rgba(122,180,255,0.06)', borderColor: 'rgba(122,180,255,0.25)' }}>
        <p className="font-arabic text-center" style={{ fontSize: 12, color: '#9DC4FF' }}>
          🚧 {lang === 'ar' ? 'قادم قريباً: العب مع صديق + مباراة سريعة أونلاين' : 'Coming soon: play with a friend + quick online match'}
        </p>
      </div>
    </PageShell>
  );
}
