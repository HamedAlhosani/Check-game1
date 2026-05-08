import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState } from '@check-game/shared';
import { soundService } from '../../../services/sound.service';

/**
 * TutorialCoach — interactive in-game guide that watches the live
 * GameState and pops a context-aware speech bubble at every new
 * teachable moment (peek phase, your first turn, drawn card, burn
 * window, CHECK unlock, etc). Each step is dismissed by either:
 *   1. The player advancing the game state (auto-dismiss), or
 *   2. Tapping "فهمت" on the bubble.
 *
 * Once a step has been shown, it does not re-appear in this match —
 * the player should learn each lesson exactly once.
 *
 * Activated by the sessionStorage flag `check.tutorial`, set by
 * the TutorialPage launcher when the player creates the practice
 * bot game. Cleared automatically when the match ends.
 */

interface Props {
  gameState: GameState;
  meUid: string | null;
  drawnCard: { rank: string; suit: string } | null;
}

interface Step {
  id: string;
  title: string;
  body: string;
  /** True when this step matches the current state. */
  match: (g: GameState, isMyTurn: boolean, drawnCard: Props['drawnCard']) => boolean;
  /**
   * If true the bubble auto-hides as soon as `match` returns false again
   * (good for "your turn" prompts). If false the bubble stays until the
   * player explicitly taps "فهمت".
   */
  autoHide?: boolean;
  emphasize?: 'low' | 'mid' | 'high';
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    title: '👋 أهلاً بك في التعليم',
    body: 'هذي لعبة تجريبية ضد ٣ بوتات سهلة. راح أوريك كل شي خطوة بخطوة. اقفل الفقاعات لما تنتهي قراءتها.',
    match: (g) => g.phase === 'PEEK_PHASE' || g.phase === 'DEALING',
    emphasize: 'high',
  },
  {
    id: 'peek',
    title: '👀 احفظ كروتك السفلية',
    body: 'الكرتين السفليتين انكشفتا لك ١٠ ثوان فقط. حاول تحفظ أرقامهما وألوانهما. الكرتين العلويين راح يبقون مخفيين عنك.',
    match: (g) => g.phase === 'PEEK_PHASE',
    autoHide: true,
    emphasize: 'high',
  },
  {
    id: 'wait_others',
    title: '⏳ بدأت اللعبة',
    body: 'اللعبة بدأت. خل البوتات يلعبون أول، شوف كيف يسحبون ويرمون. دورك راح يجي بسرعة.',
    match: (g, isMyTurn) => g.phase === 'PLAYING' && !isMyTurn && !!g.discardTop,
  },
  {
    id: 'my_first_turn',
    title: '🎯 دورك! اختار وحدة من ٣',
    body: 'الحين دورك. عندك ٣ خيارات:\n• اضغط على كومة السحب (وسط الطاولة) → تسحب ورقة جديدة\n• اضغط على آخر ورقة في المرمى → تستبدلها بكرت من إيدك\n• اضغط على كرت من إيدك بنفس رقم آخر ورقة في المرمى → تحرقه مباشرة',
    match: (g, isMyTurn, drawn) => g.phase === 'PLAYING' && isMyTurn && !drawn,
    emphasize: 'high',
  },
  {
    id: 'drawn_card',
    title: '🃏 سحبت ورقة',
    body: 'هذي ورقتك المسحوبة. عندك خياران:\n• اضغط على وحد من كروتك المخفية لتستبدلها (الكرت اللي طلع منك يروح المرمى مكشوف)\n• أو ارمها مباشرة في المرمى بدون استبدال',
    match: (g, isMyTurn, drawn) => g.phase === 'PLAYING' && isMyTurn && !!drawn,
    emphasize: 'mid',
  },
  {
    id: 'special_j',
    title: '🔄 سحبت J',
    body: 'هذي ورقة خاصة! تقدر تختار أي ورقة من إيدك وتبادلها مع أي ورقة من خصم — بدون ما تشوف وجه أي وحدة. سلاح قوي!',
    match: (g) => g.phase === 'SPECIAL_J',
    emphasize: 'high',
  },
  {
    id: 'special_q',
    title: '👁️ سحبت Q الحمراء',
    body: 'تقدر تختار وحدة من كروتك المخفية وتكشفها لنفسك فقط. أحسن استخدام: اكشف وحد من الكرتين العلويين عشان تعرف رقمه.',
    match: (g) => g.phase === 'SPECIAL_Q',
    emphasize: 'high',
  },
  {
    id: 'king',
    title: '🃏 سحبت K (الملك)',
    body: 'السيرفر سحب لك ورقتين! اختار وحدة تستبدلها بكرت من إيدك، والثانية تنرمي للمرمى. فرصة مزدوجة في دور واحد.',
    match: (g) => g.phase === 'KING_CHOICE',
    emphasize: 'high',
  },
  {
    id: 'burn_window',
    title: '🔥 نافذة الحرق',
    body: 'لو فاكر إن في إيدك كرت بنفس رقم آخر ورقة في المرمى، اضغط عليه الحين وراح ينحرق. عدد كروتك يصير ٣ بدل ٤! بس انتبه: حرق غلط = +١ كرت عقوبة.',
    match: (g) => g.phase === 'BURN_WINDOW',
    autoHide: true,
    emphasize: 'mid',
  },
  {
    id: 'check_unlocked',
    title: '🏆 الحين تقدر تضغط CHECK',
    body: 'بعد ٤ لفات كاملة، زر CHECK فُتح. اضغطه فقط لو متأكد إن إيدك أقل وحدة على الطاولة! لو في حد أقل منك، نقاطك تتضاعف ×٢.',
    match: (g, isMyTurn) => g.phase === 'PLAYING' && isMyTurn && g.dealTurnCount >= g.players.length * 4,
    emphasize: 'high',
  },
  {
    id: 'check_called',
    title: '🚨 ضُغط CHECK',
    body: 'في لاعب ضغط CHECK. كل لاعب راح ياخذ دور أخير وحيد، وبعدها الكل يكشف أوراقه ويحسب نقاطه.',
    match: (g) => g.phase === 'CHECK_CALLED',
  },
  {
    id: 'reveal',
    title: '🎴 الكشف',
    body: 'الكل يكشف أوراقه الحين. اللي عنده أقل مجموع يفوز بالجولة. لو صاحب CHECK كان فعلاً الأقل: ياخذ ٠ نقاط. غير كذا: نقاطه تتضاعف ×٢.',
    match: (g) => g.phase === 'REVEAL' || g.phase === 'SCORING',
  },
  {
    id: 'round_over',
    title: '📊 خلصت الجولة',
    body: 'هذي نتائج الجولة. اللاعبين تتراكم نقاطهم. أول لاعب يوصل ١٠٠ نقطة يطلع. آخر لاعب يبقى = الفائز 🏆',
    match: (g) => g.phase === 'ROUND_OVER',
  },
  {
    id: 'game_over',
    title: '🎓 خلّصت التعليم!',
    body: 'ممتاز! شفت كيف تصير اللعبة. الحين تقدر ترجع الرئيسية وتلعب لعبة عادية ضد بوتات أو لاعبين حقيقيين. حظ موفق!',
    match: (g) => g.phase === 'GAME_OVER',
    emphasize: 'high',
  },
];

export function TutorialCoach({ gameState, meUid, drawnCard }: Props) {
  const navigate = useNavigate();
  const [seenIds, setSeenIds] = useState<Set<string>>(() => new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());

  // Bot turns can fly past too quickly to read — pin the very first
  // "wait_others" bubble for a couple of seconds even if a turn change
  // technically resolves it.
  const showStartedAtRef = useRef<number>(0);

  const isMyTurn = !!meUid && gameState.currentTurnUid === meUid;

  const currentStep = useMemo<Step | null>(() => {
    for (const s of STEPS) {
      if (dismissedIds.has(s.id)) continue;
      if (s.match(gameState, isMyTurn, drawnCard)) return s;
    }
    return null;
  }, [gameState, isMyTurn, drawnCard, dismissedIds]);

  // Mark a step as seen the moment it appears (so we know the player
  // got at least a flash of every lesson). autoHide steps fade with
  // the underlying state; persistent steps stay until "فهمت" tapped.
  useEffect(() => {
    if (!currentStep) return;
    if (!seenIds.has(currentStep.id)) {
      setSeenIds(prev => {
        const next = new Set(prev);
        next.add(currentStep.id);
        return next;
      });
      showStartedAtRef.current = Date.now();
      soundService.playClick();
    }
  }, [currentStep, seenIds]);

  // autoHide step: silently mark dismissed once the matching state ends
  // so the same lesson doesn't pop again later (e.g. peek bubble after
  // the peek phase ends).
  useEffect(() => {
    for (const s of STEPS) {
      if (!s.autoHide) continue;
      if (dismissedIds.has(s.id)) continue;
      if (!seenIds.has(s.id)) continue;
      if (!s.match(gameState, isMyTurn, drawnCard)) {
        setDismissedIds(prev => {
          const next = new Set(prev);
          next.add(s.id);
          return next;
        });
      }
    }
  }, [gameState, isMyTurn, drawnCard, seenIds, dismissedIds]);

  // Clear the tutorial flag when the match ends so the player goes
  // back to a normal game next time.
  useEffect(() => {
    if (gameState.phase === 'GAME_OVER') {
      try { sessionStorage.removeItem('check.tutorial'); } catch { /* noop */ }
    }
  }, [gameState.phase]);

  if (!currentStep) return null;

  const accent =
    currentStep.emphasize === 'high' ? '#FFE07A' :
    currentStep.emphasize === 'mid'  ? '#E5BC7C' :
                                       '#C9A84C';

  const isFinal = currentStep.id === 'game_over';

  return (
    <div
      className="fixed inset-x-0 z-50 pointer-events-none flex justify-center"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          className="pointer-events-auto rounded-2xl border"
          style={{
            background: 'linear-gradient(160deg, #2A1C0E 0%, #0E0905 100%)',
            borderColor: `${accent}AA`,
            boxShadow: `0 12px 40px rgba(0,0,0,0.75), 0 0 24px ${accent}55`,
            padding: '14px 16px 12px',
            maxWidth: 'min(94vw, 460px)',
            width: '100%',
            margin: '0 8px',
          }}
        >
          <div className="flex items-start gap-2 mb-1.5">
            <div
              className="rounded-full flex items-center justify-center shrink-0"
              style={{
                width: 36, height: 36,
                background: `radial-gradient(circle at 30% 30%, ${accent}88, ${accent}22 70%)`,
                border: `1.5px solid ${accent}`,
                fontSize: 20,
              }}
            >
              🎓
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-arabic font-bold leading-tight" style={{ color: accent, fontSize: 14.5 }}>
                {currentStep.title}
              </p>
              <p className="font-arabic mt-0.5" style={{ fontSize: 9.5, color: 'rgba(251,243,219,0.45)' }}>
                {`الفقاعة ${seenIds.size} من ${STEPS.length} • تعليم تفاعلي`}
              </p>
            </div>
          </div>

          <p
            className="font-arabic whitespace-pre-line"
            style={{ color: 'rgba(251,243,219,0.92)', fontSize: 13.5, lineHeight: 1.7 }}
          >
            {currentStep.body}
          </p>

          <div className="flex gap-2 mt-3">
            {!currentStep.autoHide && !isFinal && (
              <button
                onClick={() => {
                  soundService.playClick();
                  setDismissedIds(prev => {
                    const next = new Set(prev);
                    next.add(currentStep.id);
                    return next;
                  });
                }}
                className="flex-1 py-1.5 rounded-lg font-arabic font-bold transition-all"
                style={{
                  background: `linear-gradient(135deg, ${accent}, #A07338)`,
                  color: '#100A05',
                  border: `1px solid ${accent}`,
                  fontSize: 13,
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
                className="flex-1 py-2 rounded-lg font-arabic font-bold transition-all"
                style={{
                  background: `linear-gradient(135deg, ${accent}, #A07338)`,
                  color: '#100A05',
                  border: `1px solid ${accent}`,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                🏠 رجوع للرئيسية
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Returns true when the tutorial overlay should mount (sessionStorage flag set). */
export function isTutorialActive(): boolean {
  try { return sessionStorage.getItem('check.tutorial') === '1'; } catch { return false; }
}
