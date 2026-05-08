import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState, SOCKET_EVENTS } from '@check-game/shared';
import { soundService } from '../../../services/sound.service';
import { socketService } from '../../../services/socket.service';

/**
 * TutorialCoach — interactive in-game guide that watches the live
 * GameState and pops a context-aware bubble at every teachable moment
 * (peek, your first turn, drawn card, special cards, burn window,
 * CHECK unlock, reveal, round-over, game-over).
 *
 * Server-side timers are disabled while the tutorial flag is set on
 * GameState, so the player can read every step at their own pace.
 *
 * Design choices:
 *   - Bubble position varies per step: peek at TOP so the bottom-2
 *     hand cards stay visible underneath; turn prompts at BOTTOM
 *     where they don't cover the table.
 *   - "تخطي التعليم" button on every bubble for players who'd rather
 *     just play normally.
 *   - When the peek bubble is dismissed, we emit GAME_PEEK_COMPLETE
 *     so the round actually advances.
 *   - Each step appears at most once per match.
 */

interface Props {
  gameState: GameState;
  meUid: string | null;
  drawnCard: { rank: string; suit: string } | null;
}

type Anchor = 'top' | 'bottom';

interface Step {
  id: string;
  title: string;
  body: string;
  /** True when this step matches the current state. */
  match: (g: GameState, isMyTurn: boolean, drawnCard: Props['drawnCard']) => boolean;
  /** Auto-dismiss as soon as `match` returns false again (good for
   *  "your turn" prompts). Otherwise stays until "فهمت" tapped. */
  autoHide?: boolean;
  /** Where on screen the bubble should sit. */
  anchor?: Anchor;
  emphasize?: 'low' | 'mid' | 'high';
  /** Side-effect when the player taps "فهمت" — e.g. emit peek_complete. */
  onAcknowledge?: (gameId: string) => void;
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    title: '👋 أهلاً بك في التعليم',
    body:
      'هذي لعبة تجريبية ضد ٣ بوتات سهلة. الوقت متوقّف خلال التعليم — خذ راحتك في القراءة. ' +
      'كل فقاعة تشرح لحظة وحدة من اللعبة. اقرأها بهدوء ثم اضغط "فهمت".',
    match: (g) => g.phase === 'PEEK_PHASE' || g.phase === 'DEALING',
    anchor: 'top',
    emphasize: 'high',
  },
  {
    id: 'peek',
    title: '👀 احفظ كروتك السفلية',
    body:
      'تشوف الكرتين السفليتين فقط — احفظ أرقامهما وألوانهما زين. ' +
      'الكرتين العلويتين راح يظلّون مخفيين حتى عنك. ' +
      'لما تخلّص حفظ، اضغط "فهمت" وراح تبدأ اللعبة.',
    match: (g) => g.phase === 'PEEK_PHASE',
    anchor: 'top',
    emphasize: 'high',
    onAcknowledge: (gameId) => {
      const sock = socketService.getSocket();
      if (sock) sock.emit(SOCKET_EVENTS.GAME_PEEK_COMPLETE, { gameId });
    },
  },
  {
    id: 'wait_others',
    title: '⏳ بدأت اللعبة',
    body:
      'البوتات راح يلعبون أول. شوف كيف يسحبون من الكومة، يستبدلون، ويرمون في المرمى. ' +
      'دورك راح يجي بعد لفّة وحدة.',
    match: (g, isMyTurn) => g.phase === 'PLAYING' && !isMyTurn && !!g.discardTop,
    anchor: 'bottom',
  },
  {
    id: 'my_first_turn',
    title: '🎯 دورك! اختار وحدة من ٣ خيارات',
    body:
      '١. اضغط على كومة السحب (وسط الطاولة) → تسحب ورقة جديدة\n' +
      '٢. اضغط على آخر ورقة في المرمى → تستبدلها بكرت من إيدك\n' +
      '٣. اضغط على كرت من إيدك بنفس رقم آخر ورقة في المرمى → تحرقه مباشرة\n\n' +
      'جرّب الخيار الأول هالمرة (السحب).',
    match: (g, isMyTurn, drawn) => g.phase === 'PLAYING' && isMyTurn && !drawn,
    anchor: 'bottom',
    emphasize: 'high',
  },
  {
    id: 'drawn_card',
    title: '🃏 سحبت ورقة',
    body:
      'هذي ورقتك المسحوبة. تقدر:\n' +
      '• اضغط على وحد من كروتك المخفية لتستبدلها (الكرت اللي يطلع منك يروح للمرمى مكشوف)\n' +
      '• أو ارمها مباشرة في المرمى بدون استبدال (لو ما عجبتك)',
    match: (g, isMyTurn, drawn) => g.phase === 'PLAYING' && isMyTurn && !!drawn,
    anchor: 'bottom',
    emphasize: 'mid',
  },
  {
    id: 'special_j',
    title: '🔄 سحبت J — كرت خاص!',
    body:
      'تقدر تختار أي ورقة من إيدك وتبادلها مع أي ورقة من خصم — بدون ما تشوف وجه أي وحدة. ' +
      'سلاح قوي ضد لاعب تشكّ إن عنده كرت قوي.',
    match: (g) => g.phase === 'SPECIAL_J',
    anchor: 'bottom',
    emphasize: 'high',
  },
  {
    id: 'special_q',
    title: '👁️ سحبت Q الحمراء',
    body:
      'تختار وحدة من كروتك المخفية وتكشفها لنفسك فقط — ما حد ثاني يشوفها. ' +
      'أحسن استخدام: اكشف وحد من الكرتين العلويين عشان تعرف رقمه.',
    match: (g) => g.phase === 'SPECIAL_Q',
    anchor: 'bottom',
    emphasize: 'high',
  },
  {
    id: 'king',
    title: '🃏 سحبت K (الملك)',
    body:
      'السيرفر سحب لك ورقتين! اختار وحدة تستبدلها بكرت من إيدك، والثانية تنرمي للمرمى. ' +
      'فرصة مزدوجة في دور واحد.',
    match: (g) => g.phase === 'KING_CHOICE',
    anchor: 'bottom',
    emphasize: 'high',
  },
  {
    id: 'burn_window',
    title: '🔥 نافذة الحرق',
    body:
      'لو فاكر إن في إيدك كرت بنفس رقم آخر ورقة في المرمى، اضغط عليه الحين! ' +
      'عدد كروتك يصير ٣ بدل ٤. بس انتبه: حرق غلط = +١ كرت عقوبة.',
    match: (g) => g.phase === 'BURN_WINDOW',
    autoHide: true,
    anchor: 'bottom',
    emphasize: 'mid',
  },
  {
    id: 'check_unlocked',
    title: '🏆 الحين تقدر تضغط CHECK',
    body:
      'بعد ٤ لفات كاملة، زر CHECK فُتح. اضغطه فقط لو متأكد إن إيدك أقل وحدة على الطاولة. ' +
      'لو في حد أقل منك، نقاطك تتضاعف ×٢.',
    match: (g, isMyTurn) =>
      g.phase === 'PLAYING' && isMyTurn && g.dealTurnCount >= g.players.length * 4,
    anchor: 'bottom',
    emphasize: 'high',
  },
  {
    id: 'check_called',
    title: '🚨 ضُغط CHECK',
    body:
      'في لاعب ضغط CHECK. كل لاعب راح ياخذ دور أخير وحيد، وبعدها الكل يكشف أوراقه ' +
      'وتُحسب النقاط.',
    match: (g) => g.phase === 'CHECK_CALLED',
    anchor: 'bottom',
  },
  {
    id: 'reveal',
    title: '🎴 الكشف',
    body:
      'الكل يكشف أوراقه الحين. صاحب CHECK لو كان فعلاً الأقل: ٠ نقاط له. ' +
      'غير كذا: نقاطه تتضاعف ×٢ كعقوبة.',
    match: (g) => g.phase === 'REVEAL' || g.phase === 'SCORING',
    anchor: 'bottom',
  },
  {
    id: 'round_over',
    title: '📊 خلصت الجولة',
    body:
      'هذي نتائج الجولة. النقاط تتراكم. أول لاعب يوصل ١٠٠ نقطة (أو ٥٠ في الجولة السريعة) ' +
      'يطلع. آخر لاعب يبقى = الفائز 🏆',
    match: (g) => g.phase === 'ROUND_OVER',
    anchor: 'bottom',
  },
  {
    id: 'game_over',
    title: '🎓 خلّصت التعليم!',
    body:
      'ممتاز! الحين عرفت كيف اللعبة. ارجع للرئيسية وجرّب لعبة عادية ضد بوتات أو ' +
      'لاعبين حقيقيين. حظ موفق!',
    match: (g) => g.phase === 'GAME_OVER',
    anchor: 'bottom',
    emphasize: 'high',
  },
];

export function TutorialCoach({ gameState, meUid, drawnCard }: Props) {
  const navigate = useNavigate();
  const [seenIds, setSeenIds] = useState<Set<string>>(() => new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [skipped, setSkipped] = useState(false);

  const isMyTurn = !!meUid && gameState.currentTurnUid === meUid;

  const currentStep = useMemo<Step | null>(() => {
    if (skipped) return null;
    for (const s of STEPS) {
      if (dismissedIds.has(s.id)) continue;
      if (s.match(gameState, isMyTurn, drawnCard)) return s;
    }
    return null;
  }, [gameState, isMyTurn, drawnCard, dismissedIds, skipped]);

  // Mark a step seen the moment it appears + ping a soft chime so the
  // player notices a new lesson popped.
  const lastSeenRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentStep) return;
    if (lastSeenRef.current === currentStep.id) return;
    lastSeenRef.current = currentStep.id;
    if (!seenIds.has(currentStep.id)) {
      setSeenIds(prev => new Set(prev).add(currentStep.id));
      soundService.playClick();
    }
  }, [currentStep, seenIds]);

  // autoHide step: silently mark dismissed once the matching state ends
  // so the same lesson doesn't pop again later (e.g. peek bubble after
  // the peek phase ends, or burn window after the window closes).
  useEffect(() => {
    for (const s of STEPS) {
      if (!s.autoHide) continue;
      if (dismissedIds.has(s.id)) continue;
      if (!seenIds.has(s.id)) continue;
      if (!s.match(gameState, isMyTurn, drawnCard)) {
        setDismissedIds(prev => new Set(prev).add(s.id));
      }
    }
  }, [gameState, isMyTurn, drawnCard, seenIds, dismissedIds]);

  // Clear the tutorial flag at game-over so the next match the player
  // creates is a normal game.
  useEffect(() => {
    if (gameState.phase === 'GAME_OVER') {
      try { sessionStorage.removeItem('check.tutorial'); } catch { /* noop */ }
    }
  }, [gameState.phase]);

  const handleAcknowledge = () => {
    if (!currentStep) return;
    soundService.playClick();
    currentStep.onAcknowledge?.(gameState.gameId);
    setDismissedIds(prev => new Set(prev).add(currentStep.id));
  };

  const handleSkip = () => {
    soundService.playClick();
    try { sessionStorage.removeItem('check.tutorial'); } catch { /* noop */ }
    setSkipped(true);
  };

  if (!currentStep) return null;

  const accent =
    currentStep.emphasize === 'high' ? '#FFE07A' :
    currentStep.emphasize === 'mid'  ? '#E5BC7C' :
                                       '#C9A84C';
  const isFinal = currentStep.id === 'game_over';
  const anchor = currentStep.anchor || 'bottom';
  const seenCount = seenIds.size;
  const totalSteps = STEPS.length;
  const progressPct = Math.min(100, Math.round((seenCount / totalSteps) * 100));

  // Anchor positioning. On peek phase the bubble must NOT cover the
  // bottom-2 cards or the player can't see what to memorize.
  const positionStyle: React.CSSProperties = anchor === 'top'
    ? { top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }
    : { bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' };

  return (
    <div
      className="fixed inset-x-0 z-50 pointer-events-none flex justify-center px-3"
      style={positionStyle}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, y: anchor === 'top' ? -20 : 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: anchor === 'top' ? -16 : 16, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          className="pointer-events-auto rounded-3xl border relative overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, #2A1C0E 0%, #0E0905 100%)',
            borderColor: `${accent}AA`,
            boxShadow: `0 14px 44px rgba(0,0,0,0.75), 0 0 28px ${accent}66`,
            padding: '14px 16px 14px',
            maxWidth: 'min(94vw, 480px)',
            width: '100%',
          }}
        >
          {/* Subtle top sheen line */}
          <span aria-hidden style={{
            position: 'absolute', top: 8, left: 24, right: 24, height: 1,
            background: `linear-gradient(90deg, transparent, ${accent}88, transparent)`,
          }} />

          {/* Progress bar */}
          <div className="absolute" style={{ top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.05)' }}>
            <motion.div
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              style={{
                height: '100%',
                background: `linear-gradient(90deg, ${accent}, #A07338)`,
                boxShadow: `0 0 6px ${accent}99`,
              }}
            />
          </div>

          <div className="flex items-start gap-2.5 mb-2 mt-1">
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              className="rounded-full flex items-center justify-center shrink-0"
              style={{
                width: 42, height: 42,
                background: `radial-gradient(circle at 30% 30%, ${accent}AA, ${accent}33 70%)`,
                border: `2px solid ${accent}`,
                fontSize: 22, lineHeight: 1,
                boxShadow: `0 0 12px ${accent}66`,
              }}
            >
              🎓
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="font-arabic font-bold leading-tight" style={{ color: accent, fontSize: 15.5 }}>
                {currentStep.title}
              </p>
              <p className="font-arabic mt-0.5" style={{ fontSize: 10, color: 'rgba(251,243,219,0.50)' }}>
                {`الفقاعة ${seenCount} من ${totalSteps} • تعليم تفاعلي • بدون وقت`}
              </p>
            </div>
          </div>

          <p
            className="font-arabic whitespace-pre-line"
            style={{ color: 'rgba(251,243,219,0.94)', fontSize: 14, lineHeight: 1.85 }}
          >
            {currentStep.body}
          </p>

          <div className="flex gap-2 mt-3.5">
            {!currentStep.autoHide && !isFinal && (
              <button
                onClick={handleAcknowledge}
                className="flex-1 py-2 rounded-xl font-arabic font-bold transition-all"
                style={{
                  background: `linear-gradient(135deg, ${accent}, #A07338)`,
                  color: '#100A05',
                  border: `1.5px solid ${accent}`,
                  fontSize: 14,
                  boxShadow: `0 0 14px ${accent}55`,
                  cursor: 'pointer',
                }}
              >
                ✓ فهمت
              </button>
            )}
            {isFinal && (
              <button
                onClick={() => {
                  soundService.playClick();
                  try { sessionStorage.removeItem('check.tutorial'); } catch { /* noop */ }
                  navigate('/home');
                }}
                className="flex-1 py-2.5 rounded-xl font-arabic font-bold transition-all"
                style={{
                  background: `linear-gradient(135deg, ${accent}, #A07338)`,
                  color: '#100A05',
                  border: `1.5px solid ${accent}`,
                  fontSize: 15,
                  boxShadow: `0 0 16px ${accent}66`,
                  cursor: 'pointer',
                }}
              >
                🏠 رجوع للرئيسية
              </button>
            )}
            {!isFinal && (
              <button
                onClick={handleSkip}
                className="px-3 py-2 rounded-xl font-arabic transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: 'rgba(251,243,219,0.55)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
                title="أخفي كل الفقاعات وكمّل اللعب لحالك"
              >
                تخطّي
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Returns true when the tutorial overlay should mount. We mount when
 *  EITHER the local sessionStorage launcher flag is set, OR the
 *  GameState carries the server-side tutorial flag (so the coach
 *  survives a refresh mid-tutorial-game). */
export function isTutorialActive(gameTutorialFlag?: boolean): boolean {
  if (gameTutorialFlag) return true;
  try { return sessionStorage.getItem('check.tutorial') === '1'; } catch { return false; }
}
