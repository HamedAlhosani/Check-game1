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
 * TutorialPage — interactive tutorial launcher. Instead of dumping a
 * wall of rules text, this page kicks off a real practice match against
 * 3 easy bots and flips the `check.tutorial` sessionStorage flag so the
 * TutorialCoach overlay (rendered by CheckBoard) walks the player
 * through each phase live, in-game.
 *
 * The launcher itself shows the *idea* of the game in 3 short bullets
 * + a single big "ابدأ التعلم" CTA. Everything else is taught hands-on.
 */
export function TutorialPage() {
  const lang = useLang();
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const [launching, setLaunching] = useState(false);
  const launchedRef = useRef(false);

  useEffect(() => {
    const sock = socketService.getSocket();
    if (!sock) return;

    const onRoomUpdated = (room: RoomState) => {
      // The server creates the room → we immediately start it. We're
      // hooked here only after the user clicked "ابدأ التعلم", so the
      // first room update we see is ours.
      if (!launchedRef.current) return;
      sock.emit(SOCKET_EVENTS.LOBBY_START_GAME, { roomId: room.roomId });
    };

    const onGameStarting = (data: { gameId: string; gameType: GameType }) => {
      if (!launchedRef.current) return;
      launchedRef.current = false;
      // Flip the flag right before navigating so CheckBoard mounts the
      // coach on its first render, not a tick later.
      try { sessionStorage.setItem('check.tutorial', '1'); } catch { /* noop */ }
      navigate(`/game/${data.gameType}/${data.gameId}`);
    };

    const onError = (data: { message: string }) => {
      launchedRef.current = false;
      setLaunching(false);
      addToast(data.message || (lang === 'ar' ? 'تعذّر بدء التعليم' : 'Could not start tutorial'), 'error');
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

  const handleStart = async () => {
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
    // 1 player + 3 easy bots, quick match — short enough to finish in
    // ~2 minutes so the player completes the full lesson loop.
    sock.emit(SOCKET_EVENTS.LOBBY_CREATE_ROOM, {
      name: 'لعبة تعليمية',
      type: 'private',
      botCount: 3,
      botDifficulty: 'easy',
      gameType: 'check',
      gameMode: 'quick',
      tutorial: true,
    });
  };

  return (
    <PageShell
      title={lang === 'ar' ? '🎓 تعلم اللعبة' : '🎓 Learn'}
      subtitle={lang === 'ar' ? 'جولة تجريبية مع شرح مباشر' : 'Live practice with on-screen coach'}
      lang={lang}
    >
      {/* Hero card */}
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
          🎓
        </div>
        <p className="font-arabic font-bold mb-1" style={{ fontSize: 22, color: '#FFE07A', textShadow: '0 0 14px rgba(255,224,122,0.45)' }}>
          {lang === 'ar' ? 'تعليم تفاعلي' : 'Interactive Tutorial'}
        </p>
        <p className="font-arabic" style={{ fontSize: 13, color: 'rgba(251,243,219,0.65)', lineHeight: 1.7 }}>
          {lang === 'ar'
            ? 'بدل ما تقرأ القوانين، راح تدخل لعبة حقيقية ضد ٣ بوتات سهلة. الفقاعات راح تشرح لك كل شي خطوة بخطوة وأنت تلعب.'
            : "Instead of reading rules, you'll enter a real game vs 3 easy bots. Pop-up bubbles explain each phase live, while you play."}
        </p>
      </motion.div>

      {/* What you'll learn — 3 quick bullets */}
      <div className="rounded-2xl p-4 mb-4 border" style={{ background: 'rgba(229,188,124,0.05)', borderColor: 'rgba(229,188,124,0.18)' }}>
        <p className="font-arabic font-bold mb-3" style={{ color: '#E8C97A', fontSize: 14 }}>
          {lang === 'ar' ? 'بنهاية الجولة راح تعرف:' : "By the end you'll know:"}
        </p>
        {[
          lang === 'ar' ? 'كيف تسحب وتستبدل وتحرق الأوراق' : 'How to draw, swap, and burn cards',
          lang === 'ar' ? 'متى تستخدم الكروت الخاصة (J, Q, K)' : 'When to use special cards (J, Q, K)',
          lang === 'ar' ? 'متى تضغط CHECK لتاخذ ٠ نقاط' : 'When to press CHECK to score 0',
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

      {/* Big CTA */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleStart}
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
          : (lang === 'ar' ? '🚀 ابدأ التعلم' : '🚀 Start Tutorial')}
      </motion.button>

      <p className="font-arabic text-center mt-3" style={{ fontSize: 11, color: 'rgba(251,243,219,0.35)' }}>
        {lang === 'ar' ? 'تقدر ترجع الرئيسية بعد ما تخلص الجولة' : 'You can return home after the round ends'}
      </p>

      {/* Optional: link to text-rules modal for players who DO want a quick read */}
      <button
        onClick={() => { soundService.playClick(); navigate('/home'); }}
        className="block mx-auto mt-5 font-arabic transition-all"
        style={{
          fontSize: 12,
          color: 'rgba(251,243,219,0.45)',
          textDecoration: 'underline',
          textDecorationColor: 'rgba(251,243,219,0.20)',
        }}
      >
        {lang === 'ar' ? '← الرجوع للرئيسية' : '← Back to home'}
      </button>
    </PageShell>
  );
}
