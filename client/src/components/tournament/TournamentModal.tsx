import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { socketService } from '../../services/socket.service';
import { soundService } from '../../services/sound.service';
import { useTournamentStore } from '../../store/tournamentStore';
import { useAuthStore } from '../../store/authStore';
import {
  SOCKET_EVENTS, ELIMINATION_SCORE,
  bracketRounds, tournamentPrize,
} from '@check-game/shared';
import type { TournamentSize, GameMode, TournamentMatch, TournamentState } from '@check-game/shared';

const AVATAR_EMOJIS: Record<string, string> = {
  avatar_1: '🦅', avatar_2: '🐪', avatar_3: '🌴', avatar_4: '⚔️',
  avatar_5: '🌙', avatar_6: '⭐', avatar_7: '🏜️', avatar_8: '🌊',
};

export function TournamentModal({ open, onClose, lang }: {
  open: boolean;
  onClose: () => void;
  lang: string;
}) {
  const { state, finished, setFinished, clear } = useTournamentStore();
  const navigate = useNavigate();

  // If we have neither setup nor active tournament, show setup; else bracket
  const view: 'setup' | 'bracket' | 'finished' =
    finished ? 'finished'
    : state ? 'bracket'
    : 'setup';

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-3"
        style={{ background: 'rgba(0,0,0,0.78)' }}
        onClick={view === 'setup' ? onClose : undefined}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-lg rounded-3xl flex flex-col overflow-hidden"
          style={{
            maxHeight: '92vh',
            background: 'linear-gradient(180deg, #1A1408 0%, #0E0905 100%)',
            border: '1px solid rgba(201,168,76,0.40)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 36px rgba(201,168,76,0.22)',
            direction: lang === 'ar' ? 'rtl' : 'ltr',
          }}
        >
          {view === 'setup'    && <SetupView lang={lang} onClose={onClose} navigate={navigate}/>}
          {view === 'bracket'  && state && <BracketView state={state} lang={lang} onClose={onClose} navigate={navigate}/>}
          {view === 'finished' && finished && (
            <FinishedView
              finished={finished}
              lang={lang}
              onClose={() => { setFinished(null); clear(); onClose(); }}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Setup ───────────────────────────────────────────────────────────────────
function SetupView({ lang, onClose, navigate }: { lang: string; onClose: () => void; navigate: (to: string) => void }) {
  const [size, setSize] = useState<TournamentSize>(4);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [matchLength, setMatchLength] = useState<GameMode>('quick');
  const [creating, setCreating] = useState(false);
  const setStateStore = useTournamentStore(s => s.setState);

  const prize = tournamentPrize(size, difficulty);

  function start() {
    if (creating) return;
    setCreating(true);
    soundService.playClick();
    const socket = socketService.getSocket();
    if (!socket) {
      setCreating(false);
      return;
    }
    socket.emit(SOCKET_EVENTS.TOURNAMENT_CREATE, { size, difficulty, matchLength });
    // The socket listeners in HomePage will pick up TOURNAMENT_STATE and
    // TOURNAMENT_MATCH_START, then navigate to the game. We just close the
    // setup view; the bracket will reopen automatically via store on return.
    void setStateStore; // referenced for future direct set if needed
    void navigate;      // not needed in setup; navigation happens from HomePage listener
  }

  return (
    <>
      <div className="px-5 pt-5 pb-3 border-b" style={{ borderColor: 'rgba(201,168,76,0.18)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 28 }}>🏆</span>
            <h2 className="font-arabic font-bold" style={{ fontSize: 20, color: '#E8C97A' }}>
              {lang === 'ar' ? 'كأس البطولة' : 'Tournament Cup'}
            </h2>
          </div>
          <button onClick={onClose}
            className="rounded-lg w-8 h-8 flex items-center justify-center text-xl"
            style={{ color: 'rgba(245,230,200,0.5)', background: 'rgba(255,255,255,0.04)' }}
          >×</button>
        </div>
        <p className="font-arabic" style={{ fontSize: 12, color: 'rgba(245,230,200,0.55)' }}>
          {lang === 'ar'
            ? 'اكسب 3 مباريات متتالية لتفوز بالكأس · بوتات في كل المراحل'
            : 'Win 3 matches in a row to take the cup · solo vs bots'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
        {/* Size */}
        <Picker
          title={lang === 'ar' ? 'حجم البطولة' : 'Bracket Size'}
          options={[
            { id: 4, label: '4', sub: lang === 'ar' ? 'مباراتين + نهائي' : '2 + final' },
            { id: 8, label: '8', sub: lang === 'ar' ? '7 مباريات' : '7 matches' },
          ]}
          value={size}
          onChange={(v) => setSize(v as TournamentSize)}
        />
        {/* Difficulty */}
        <Picker
          title={lang === 'ar' ? 'صعوبة البوتات' : 'Bot Difficulty'}
          options={[
            { id: 'easy',   label: lang === 'ar' ? '🌱 سهل'   : '🌱 Easy' },
            { id: 'medium', label: lang === 'ar' ? '⚖️ متوسط' : '⚖️ Medium' },
            { id: 'hard',   label: lang === 'ar' ? '🔥 صعب'   : '🔥 Hard' },
          ]}
          value={difficulty}
          onChange={(v) => setDifficulty(v as 'easy' | 'medium' | 'hard')}
        />
        {/* Match length */}
        <Picker
          title={lang === 'ar' ? 'طول كل مباراة' : 'Match Length'}
          options={[
            { id: 'quick',    label: '⚡',  sub: `${ELIMINATION_SCORE.quick} ${lang === 'ar' ? 'نقطة' : 'pts'}` },
            { id: 'standard', label: '📊',  sub: `${ELIMINATION_SCORE.standard} ${lang === 'ar' ? 'نقطة' : 'pts'}` },
            { id: 'long',     label: '🏛️', sub: `${ELIMINATION_SCORE.long} ${lang === 'ar' ? 'نقطة' : 'pts'}` },
          ]}
          value={matchLength}
          onChange={(v) => setMatchLength(v as GameMode)}
        />

        <div className="rounded-2xl p-3 flex items-center justify-between"
          style={{ background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.30)' }}>
          <span className="font-arabic" style={{ fontSize: 12, color: 'rgba(245,230,200,0.7)' }}>
            🏆 {lang === 'ar' ? 'جائزة الفوز بالكأس' : 'Cup Prize'}
          </span>
          <span className="font-mono font-bold" style={{ fontSize: 16, color: '#E8C97A' }}>
            🪙 {prize.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="px-5 pb-5 pt-2">
        <motion.button
          whileTap={{ scale: 0.97 }}
          disabled={creating}
          onClick={start}
          className="w-full rounded-2xl py-3 font-arabic font-bold disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #C9A84C, #A07830)',
            color: '#0E0905', fontSize: 15,
            boxShadow: '0 6px 20px rgba(201,168,76,0.45)',
          }}>
          {creating ? '...' : (lang === 'ar' ? 'ابدأ البطولة 🏆' : 'Start Tournament 🏆')}
        </motion.button>
      </div>
    </>
  );
}

function Picker({ title, options, value, onChange }: {
  title: string;
  options: { id: any; label: string; sub?: string }[];
  value: any;
  onChange: (v: any) => void;
}) {
  return (
    <div>
      <p className="font-arabic mb-2" style={{ fontSize: 12, color: 'rgba(245,230,200,0.55)' }}>{title}</p>
      <div className="flex gap-2">
        {options.map(o => {
          const sel = value === o.id;
          return (
            <motion.button
              key={String(o.id)}
              whileTap={{ scale: 0.94 }}
              onClick={() => { onChange(o.id); soundService.playClick(); }}
              className="flex-1 rounded-xl font-arabic font-bold transition-all"
              style={{
                padding: '8px 4px',
                background: sel ? 'rgba(201,168,76,0.20)' : 'rgba(255,255,255,0.04)',
                color: sel ? '#E8C97A' : 'rgba(245,230,200,0.55)',
                border: `1.5px solid ${sel ? 'rgba(201,168,76,0.7)' : 'rgba(255,255,255,0.08)'}`,
                boxShadow: sel ? '0 0 14px rgba(201,168,76,0.30)' : 'none',
                fontSize: 13,
                cursor: 'pointer',
              }}>
              <div>{o.label}</div>
              {o.sub && <div style={{ fontSize: 9.5, opacity: 0.7, marginTop: 2 }}>{o.sub}</div>}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ── Bracket ─────────────────────────────────────────────────────────────────
function BracketView({ state, lang, onClose, navigate }: {
  state: TournamentState;
  lang: string;
  onClose: () => void;
  navigate: (to: string) => void;
}) {
  const profile = useAuthStore(s => s.profile);
  const myUid = profile?.uid;
  const rounds = bracketRounds(state.size);

  const hostMatch = state.bracket.find(m => m.matchNum === state.nextHostMatchNum) || null;
  const hostEliminated = state.players.find(p => p.uid === myUid)?.isEliminated;
  const inProgressMatch = state.bracket.find(m => m.status === 'in_progress' && m.isHostMatch);

  function jumpToCurrentMatch() {
    if (!inProgressMatch?.gameId) return;
    soundService.playClick();
    navigate(`/game/check/${inProgressMatch.gameId}`);
  }

  function startNextMatch() {
    soundService.playClick();
    const socket = socketService.getSocket();
    socket?.emit(SOCKET_EVENTS.TOURNAMENT_NEXT_MATCH);
  }

  function leaveTournament() {
    if (!confirm(lang === 'ar' ? 'تركك البطولة سيوقفها. هل أنت متأكد؟' : 'Leaving will end the tournament. Continue?')) return;
    const socket = socketService.getSocket();
    socket?.emit(SOCKET_EVENTS.TOURNAMENT_LEAVE);
    useTournamentStore.getState().clear();
    onClose();
  }

  return (
    <>
      <div className="px-5 pt-5 pb-3 border-b" style={{ borderColor: 'rgba(201,168,76,0.18)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 26 }}>🏆</span>
            <div>
              <h2 className="font-arabic font-bold" style={{ fontSize: 18, color: '#E8C97A' }}>
                {lang === 'ar' ? 'البطولة' : 'Tournament'}
              </h2>
              <p className="font-arabic" style={{ fontSize: 11, color: 'rgba(245,230,200,0.45)' }}>
                {state.size === 4 ? '4' : '8'} {lang === 'ar' ? 'لاعبين' : 'players'}
                {' · '}🪙 {state.prizeCoins.toLocaleString()}
              </p>
            </div>
          </div>
          <button onClick={leaveTournament}
            className="rounded-lg px-3 py-1.5 font-arabic"
            style={{ color: 'rgba(255,150,140,0.85)', background: 'rgba(224,64,48,0.10)', border: '1px solid rgba(224,64,48,0.30)', fontSize: 11 }}
          >{lang === 'ar' ? 'مغادرة' : 'Leave'}</button>
        </div>

        {/* CTA banner */}
        {inProgressMatch ? (
          <button onClick={jumpToCurrentMatch}
            className="w-full mt-2 rounded-xl py-2.5 font-arabic font-bold flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #C9A84C, #A07830)',
              color: '#0E0905', fontSize: 13,
              boxShadow: '0 4px 16px rgba(201,168,76,0.40)',
            }}>
            ▶️ {lang === 'ar' ? 'العودة إلى المباراة' : 'Return to match'}
          </button>
        ) : hostEliminated ? (
          <div className="mt-2 rounded-xl py-2.5 px-3 font-arabic text-center"
            style={{
              background: 'rgba(224,64,48,0.10)', color: 'rgba(255,150,140,0.85)',
              border: '1px solid rgba(224,64,48,0.30)', fontSize: 12,
            }}>
            😔 {lang === 'ar' ? 'تم إقصاؤك — راقب البقية' : 'You were eliminated — watch the rest'}
          </div>
        ) : hostMatch ? (
          <button onClick={startNextMatch}
            className="w-full mt-2 rounded-xl py-2.5 font-arabic font-bold flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #C9A84C, #A07830)',
              color: '#0E0905', fontSize: 13,
              boxShadow: '0 4px 16px rgba(201,168,76,0.40)',
            }}>
            ▶️ {lang === 'ar' ? 'ابدأ المباراة التالية' : 'Start next match'}
          </button>
        ) : null}
      </div>

      {/* Bracket scroll area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-4">
        {rounds.map(rd => (
          <div key={rd.round}>
            <h3 className="font-arabic font-bold mb-2 px-1"
              style={{ fontSize: 12, color: 'rgba(201,168,76,0.85)' }}>
              {lang === 'ar' ? rd.labelAr : rd.labelEn}
            </h3>
            <div className="flex flex-col gap-2">
              {state.bracket.filter(m => m.round === rd.round).map(m => (
                <BracketMatchCard key={m.matchNum} match={m} state={state} myUid={myUid} lang={lang}/>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function BracketMatchCard({ match, state, myUid, lang }: {
  match: TournamentMatch;
  state: TournamentState;
  myUid?: string;
  lang: string;
}) {
  const playersByUid = Object.fromEntries(state.players.map(p => [p.uid, p]));
  const p1 = match.p1Uid ? playersByUid[match.p1Uid] : null;
  const p2 = match.p2Uid ? playersByUid[match.p2Uid] : null;
  const winnerUid = match.winnerUid;
  const isCurrent = match.status === 'in_progress';
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{
        background: isCurrent ? 'rgba(201,168,76,0.10)' : 'rgba(255,255,255,0.025)',
        border: `1px solid ${isCurrent ? 'rgba(201,168,76,0.55)' : 'rgba(255,255,255,0.06)'}`,
        boxShadow: isCurrent ? '0 0 14px rgba(201,168,76,0.18)' : 'none',
      }}>
      <Slot player={p1} winner={winnerUid === match.p1Uid} loser={!!winnerUid && winnerUid !== match.p1Uid} myUid={myUid} lang={lang}/>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }}/>
      <Slot player={p2} winner={winnerUid === match.p2Uid} loser={!!winnerUid && winnerUid !== match.p2Uid} myUid={myUid} lang={lang}/>
      {match.status === 'in_progress' && (
        <div className="px-3 py-1 font-arabic text-center"
          style={{ background: 'rgba(201,168,76,0.10)', fontSize: 9.5, color: '#E8C97A', letterSpacing: 0.5 }}>
          ▶ {lang === 'ar' ? 'قيد اللعب' : 'In progress'}
        </div>
      )}
    </div>
  );
}

function Slot({ player, winner, loser, myUid, lang }: {
  player: { uid: string; displayName: string; avatarId: string; isBot: boolean } | null;
  winner: boolean;
  loser: boolean;
  myUid?: string;
  lang: string;
}) {
  const isMe = player?.uid === myUid;
  const empty = !player;
  return (
    <div className="flex items-center gap-2 px-3 py-2"
      style={{
        background: winner ? 'rgba(201,168,76,0.10)' : 'transparent',
        opacity: loser ? 0.5 : 1,
      }}>
      <span style={{ fontSize: 18 }}>
        {empty ? '—' : (AVATAR_EMOJIS[player.avatarId] || '👤')}
      </span>
      <span className="flex-1 font-arabic truncate"
        style={{
          fontSize: 12.5,
          color: winner ? '#E8C97A' : isMe ? 'rgba(201,168,76,0.85)' : 'rgba(245,230,200,0.65)',
          fontWeight: winner || isMe ? 700 : 400,
        }}>
        {empty ? (lang === 'ar' ? 'في انتظار الفائز' : 'TBD')
          : isMe ? (lang === 'ar' ? 'أنت' : 'You')
          : player.displayName}
        {winner && ' ✓'}
      </span>
    </div>
  );
}

// ── Finished ────────────────────────────────────────────────────────────────
function FinishedView({ finished, lang, onClose }: {
  finished: { isHostChampion: boolean; prizeCoins: number };
  lang: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (finished.isHostChampion) soundService.playWin();
    else soundService.playError();
  }, [finished.isHostChampion]);

  return (
    <div className="px-6 py-8 flex flex-col items-center text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 18 }}
        style={{ fontSize: 80, marginBottom: 12 }}>
        {finished.isHostChampion ? '🏆' : '😔'}
      </motion.div>
      <h2 className="font-arabic font-bold mb-2"
        style={{ fontSize: 26, color: finished.isHostChampion ? '#E8C97A' : 'rgba(245,230,200,0.7)' }}>
        {finished.isHostChampion
          ? (lang === 'ar' ? 'بطل الكأس!' : 'Champion!')
          : (lang === 'ar' ? 'انتهت البطولة' : 'Tournament Over')}
      </h2>
      <p className="font-arabic mb-6" style={{ fontSize: 13, color: 'rgba(245,230,200,0.55)' }}>
        {finished.isHostChampion
          ? (lang === 'ar' ? 'فزت بكل المباريات — جائزتك بانتظارك' : 'You won every match — your prize awaits')
          : (lang === 'ar' ? 'حظ أوفر في المرة القادمة' : 'Better luck next time')}
      </p>

      {finished.isHostChampion && (
        <div className="rounded-2xl px-5 py-3 mb-6"
          style={{
            background: 'linear-gradient(135deg, rgba(201,168,76,0.20) 0%, rgba(120,80,20,0.10) 100%)',
            border: '1px solid rgba(201,168,76,0.50)',
            boxShadow: '0 0 24px rgba(201,168,76,0.30)',
          }}>
          <p className="font-arabic" style={{ fontSize: 11, color: 'rgba(245,230,200,0.55)' }}>
            {lang === 'ar' ? 'جائزة الكأس' : 'Cup Prize'}
          </p>
          <p className="font-bold font-mono" style={{ fontSize: 28, color: '#E8C97A' }}>
            🪙 +{finished.prizeCoins.toLocaleString()}
          </p>
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onClose}
        className="w-full rounded-2xl py-2.5 font-arabic font-bold"
        style={{
          background: 'linear-gradient(135deg, #C9A84C, #A07830)',
          color: '#0E0905', fontSize: 14,
        }}>
        {lang === 'ar' ? 'العودة للرئيسية' : 'Back to home'}
      </motion.button>
    </div>
  );
}
