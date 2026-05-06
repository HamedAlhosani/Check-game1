import { motion, AnimatePresence } from 'framer-motion';
import type { MatchRecord, MatchRound, GameMode } from '@check-game/shared';

interface Props {
  open: boolean;
  onClose: () => void;
  record: MatchRecord | null;
  myUid?: string;
  lang: string;
}

const AVATAR_EMOJIS: Record<string, string> = {
  avatar_1: '🦅', avatar_2: '🐪', avatar_3: '🌴', avatar_4: '⚔️',
  avatar_5: '🌙', avatar_6: '⭐', avatar_7: '🏜️', avatar_8: '🌊',
  avatar_9: '🦁', avatar_10: '🔥', avatar_11: '💎', avatar_12: '🎭',
  avatar_13: '⚔️', avatar_14: '⛵', avatar_15: '🧭', avatar_16: '🇦🇪',
  avatar_17: '👸', avatar_18: '🧕', avatar_19: '🤵', avatar_20: '👳', avatar_21: '👩', avatar_22: '🧓',
  avatar_23: '👩‍🎓', avatar_24: '👵', avatar_25: '👩‍🏫', avatar_26: '🧕', avatar_27: '👩‍⚕️', avatar_28: '👑',
};

const MODE_LABEL_AR: Record<GameMode, string> = { quick: '⚡ سريع', standard: '📊 عادي', long: '🏛️ طويل' };
const MODE_LABEL_EN: Record<GameMode, string> = { quick: '⚡ Quick',  standard: '📊 Standard', long: '🏛️ Long' };

function fmtDuration(ms?: number, lang: string = 'ar') {
  if (!ms || ms < 0) return '';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return lang === 'ar'
    ? `${m}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

export function ReplayModal({ open, onClose, record, myUid, lang }: Props) {
  if (!open || !record) return null;

  const playersByUid = Object.fromEntries(record.players.map(p => [p.uid, p]));
  const sortedPlayers = [...record.players].sort((a, b) => a.score - b.score);
  const rounds: MatchRound[] = record.rounds || [];
  const winner = playersByUid[record.winnerId || ''];
  const mode = record.gameMode || 'standard';
  const elimScore = record.eliminationScore || 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-3"
        style={{ background: 'rgba(0,0,0,0.75)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-lg rounded-3xl flex flex-col overflow-hidden"
          style={{
            maxHeight: '90vh',
            background: 'linear-gradient(180deg, #1A1408 0%, #0E0905 100%)',
            border: '1px solid rgba(201,168,76,0.35)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(201,168,76,0.18)',
            direction: lang === 'ar' ? 'rtl' : 'ltr',
          }}
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-3 border-b" style={{ borderColor: 'rgba(201,168,76,0.18)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 22 }}>📺</span>
                <h2 className="font-arabic font-bold" style={{ fontSize: 18, color: '#E8C97A' }}>
                  {lang === 'ar' ? 'إعادة المباراة' : 'Match Replay'}
                </h2>
              </div>
              <button onClick={onClose}
                className="rounded-lg w-8 h-8 flex items-center justify-center text-xl"
                style={{ color: 'rgba(245,230,200,0.5)', background: 'rgba(255,255,255,0.04)' }}
              >×</button>
            </div>

            <div className="flex items-center gap-2 flex-wrap font-arabic"
              style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.55)' }}>
              <span className="rounded-full px-2.5 py-0.5"
                style={{ background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.25)', color: '#E8C97A' }}>
                {(lang === 'ar' ? MODE_LABEL_AR : MODE_LABEL_EN)[mode]} · {elimScore} {lang === 'ar' ? 'نقطة' : 'pts'}
              </span>
              <span>·  {record.players.length} {lang === 'ar' ? 'لاعبين' : 'players'}</span>
              {record.durationMs ? <span>·  ⏱️ {fmtDuration(record.durationMs, lang)}</span> : null}
              {rounds.length ? <span>·  {rounds.length} {lang === 'ar' ? 'جولات' : 'rounds'}</span> : null}
            </div>

            {winner && (
              <div className="mt-3 rounded-xl px-3 py-2 flex items-center gap-2"
                style={{ background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.30)' }}>
                <span style={{ fontSize: 20 }}>🏆</span>
                <span className="font-arabic font-bold" style={{ fontSize: 13, color: '#E8C97A' }}>
                  {lang === 'ar' ? 'الفائز' : 'Winner'}: {winner.uid === myUid ? (lang === 'ar' ? 'أنت' : 'You') : winner.displayName}
                </span>
              </div>
            )}
          </div>

          {/* Body — scrollable */}
          <div className="flex-1 overflow-y-auto px-3 py-3">

            {/* Final scoreboard */}
            <Section title={lang === 'ar' ? 'النتيجة النهائية' : 'Final Scores'}>
              <div className="rounded-2xl p-2"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {sortedPlayers.map((p, i) => {
                  const isWinner = p.uid === record.winnerId;
                  const isMe = p.uid === myUid;
                  return (
                    <div key={p.uid} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                      style={{ background: isWinner ? 'rgba(201,168,76,0.10)' : 'transparent' }}>
                      <span className="font-mono shrink-0"
                        style={{ width: 18, fontSize: 11, color: 'rgba(245,230,200,0.4)' }}>{i + 1}.</span>
                      <span style={{ fontSize: 18 }}>{AVATAR_EMOJIS[p.avatarId] || '👤'}</span>
                      <span className="flex-1 font-arabic font-bold truncate"
                        style={{ fontSize: 12.5, color: isWinner ? '#E8C97A' : isMe ? 'rgba(201,168,76,0.8)' : 'rgba(245,230,200,0.7)' }}>
                        {isMe ? (lang === 'ar' ? 'أنت' : 'You') : p.displayName}
                        {isWinner && ' 🏆'}
                      </span>
                      <span className="font-mono shrink-0"
                        style={{ fontSize: 12, color: isWinner ? '#E8C97A' : 'rgba(245,230,200,0.65)' }}>
                        {p.score} {lang === 'ar' ? 'نقطة' : 'pts'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Section>

            {/* Per-round details */}
            {rounds.length > 0 && (
              <Section title={lang === 'ar' ? 'تفاصيل الجولات' : 'Round-by-Round'}>
                <div className="flex flex-col gap-2">
                  {rounds.map(r => (
                    <RoundCard
                      key={r.roundNumber}
                      round={r}
                      playersByUid={playersByUid}
                      myUid={myUid}
                      lang={lang}
                    />
                  ))}
                </div>
              </Section>
            )}

            {rounds.length === 0 && (
              <p className="text-center font-arabic py-4"
                style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.4)' }}>
                {lang === 'ar' ? 'لا توجد تفاصيل جولات لهذه المباراة' : 'No round details available for this match'}
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="font-arabic font-bold mb-2 px-1"
        style={{ fontSize: 12, color: 'rgba(201,168,76,0.85)', letterSpacing: 0.5 }}>{title}</h3>
      {children}
    </div>
  );
}

function RoundCard({
  round, playersByUid, myUid, lang,
}: {
  round: MatchRound;
  playersByUid: Record<string, { displayName: string; avatarId: string }>;
  myUid?: string;
  lang: string;
}) {
  const caller = round.checkCallerId ? playersByUid[round.checkCallerId] : null;
  const callerName = caller ? (round.checkCallerId === myUid ? (lang === 'ar' ? 'أنت' : 'You') : caller.displayName) : null;
  const outcomeLabel = (() => {
    if (!round.checkOutcome) return null;
    if (lang === 'ar') {
      return round.checkOutcome === 'win'
        ? '✅ كسب — صفر هذه الجولة'
        : round.checkOutcome === 'tied'
          ? '🟰 تعادل — دفع نقاطه'
          : '❌ خسر — دفع ضعف النقاط';
    }
    return round.checkOutcome === 'win'
      ? '✅ Won — 0 this round'
      : round.checkOutcome === 'tied'
        ? '🟰 Tied — paid hand'
        : '❌ Beaten — paid 2x';
  })();

  // Sort players in this round by their cumulative score (best first)
  const playersInRound = Object.entries(round.cumulative)
    .map(([uid, total]) => {
      const p = playersByUid[uid];
      return {
        uid,
        name: uid === myUid ? (lang === 'ar' ? 'أنت' : 'You') : (p?.displayName ?? '—'),
        avatarId: p?.avatarId ?? 'avatar_1',
        roundScore: round.scores[uid] ?? 0,
        handSum: round.rawHandSums[uid] ?? 0,
        cumulative: total,
        eliminated: round.eliminations.includes(uid),
        isMe: uid === myUid,
      };
    })
    .sort((a, b) => a.cumulative - b.cumulative);

  return (
    <div className="rounded-2xl p-3"
      style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.18)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-arabic font-bold" style={{ fontSize: 13, color: '#E8C97A' }}>
          📍 {lang === 'ar' ? `الجولة ${round.roundNumber}` : `Round ${round.roundNumber}`}
        </span>
        {caller && (
          <span className="font-arabic" style={{ fontSize: 10.5, color: 'rgba(245,230,200,0.55)' }}>
            ✋ CHECK: <span style={{ color: '#E8C97A', fontWeight: 700 }}>{callerName}</span>
          </span>
        )}
      </div>

      {outcomeLabel && (
        <div className="rounded-lg px-2.5 py-1 mb-2 font-arabic"
          style={{
            background: round.checkOutcome === 'win'
              ? 'rgba(80,200,120,0.10)'
              : round.checkOutcome === 'beaten'
                ? 'rgba(224,64,48,0.10)'
                : 'rgba(255,255,255,0.04)',
            border: `1px solid ${round.checkOutcome === 'win'
              ? 'rgba(80,200,120,0.30)'
              : round.checkOutcome === 'beaten'
                ? 'rgba(224,64,48,0.30)'
                : 'rgba(255,255,255,0.10)'}`,
            fontSize: 11,
            color: round.checkOutcome === 'win'
              ? 'rgba(80,200,120,0.95)'
              : round.checkOutcome === 'beaten'
                ? 'rgba(255,150,140,0.95)'
                : 'rgba(245,230,200,0.7)',
          }}>{outcomeLabel}</div>
      )}

      <div className="flex flex-col gap-1">
        {playersInRound.map(p => (
          <div key={p.uid} className="flex items-center gap-2 px-1.5 py-0.5">
            <span style={{ fontSize: 14, width: 18 }}>{AVATAR_EMOJIS[p.avatarId] || '👤'}</span>
            <span className="flex-1 font-arabic truncate"
              style={{ fontSize: 11.5, color: p.isMe ? '#E8C97A' : 'rgba(245,230,200,0.75)' }}>
              {p.name}
              {p.eliminated && (
                <span style={{ marginInlineStart: 4, fontSize: 10, color: '#E04030', fontWeight: 700 }}>
                  💥 {lang === 'ar' ? 'استبعد' : 'eliminated'}
                </span>
              )}
            </span>
            <span className="font-mono shrink-0"
              style={{ fontSize: 10, color: 'rgba(245,230,200,0.4)' }}>
              {lang === 'ar' ? 'يد' : 'hand'} {p.handSum}
            </span>
            <span className="font-mono shrink-0 rounded-full px-2"
              style={{
                fontSize: 10.5, lineHeight: '16px',
                color: p.roundScore === 0 ? '#80E0A0' : '#FFB68A',
                background: p.roundScore === 0 ? 'rgba(80,200,120,0.10)' : 'rgba(224,120,80,0.10)',
              }}>
              {p.roundScore === 0 ? '0' : `+${p.roundScore}`}
            </span>
            <span className="font-mono shrink-0"
              style={{ fontSize: 11, color: '#E8C97A', fontWeight: 700, minWidth: 28, textAlign: 'end' }}>
              {p.cumulative}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
