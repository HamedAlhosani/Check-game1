import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { socketService } from '../../services/socket.service';
import { soundService } from '../../services/sound.service';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { useTournamentStore } from '../../store/tournamentStore';
import { useLang } from '../../i18n/useT';
import { LangToggle } from '../../components/shared/LangToggle';
import {
  SOCKET_EVENTS, ELIMINATION_SCORE, tournamentPrize, bracketRounds,
} from '@check-game/shared';
import type {
  TournamentSize, GameMode, TournamentSummary,
  TournamentState, TournamentMatch, TournamentVisibility,
} from '@check-game/shared';

const AVATAR_EMOJIS: Record<string, string> = {
  avatar_1: '🦅', avatar_2: '🐪', avatar_3: '🌴', avatar_4: '⚔️',
  avatar_5: '🌙', avatar_6: '⭐', avatar_7: '🏜️', avatar_8: '🌊',
  avatar_9: '🦁', avatar_10: '🔥', avatar_11: '💎', avatar_12: '🎭',
};

type Tab = 'browse' | 'mine' | 'create';

export function TournamentsPage() {
  const lang = useLang();
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { addToast } = useUiStore();
  const { state: myTournament, setState, finished, setFinished, clear } = useTournamentStore();
  const [tab, setTab] = useState<Tab>('browse');
  const [list, setList] = useState<TournamentSummary[]>([]);
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    const socket = socketService.connect();
    socket.on(SOCKET_EVENTS.TOURNAMENT_LIST, (data: TournamentSummary[]) => setList(data));
    socket.on(SOCKET_EVENTS.TOURNAMENT_STATE, (s: TournamentState) => setState(s));
    socket.on(SOCKET_EVENTS.TOURNAMENT_MATCH_START, (data: { gameId: string }) => {
      navigate(`/game/check/${data.gameId}`);
    });
    socket.on(SOCKET_EVENTS.TOURNAMENT_FINISHED, (data: any) => setFinished(data));
    socket.on(SOCKET_EVENTS.TOURNAMENT_ERROR, (data: { message: string }) => {
      soundService.playError();
      addToast(data.message, 'error');
    });
    socket.emit(SOCKET_EVENTS.TOURNAMENT_LIST_REQUEST);
    socket.emit(SOCKET_EVENTS.TOURNAMENT_SUBSCRIBE);
    return () => {
      socket.off(SOCKET_EVENTS.TOURNAMENT_LIST);
      socket.off(SOCKET_EVENTS.TOURNAMENT_STATE);
      socket.off(SOCKET_EVENTS.TOURNAMENT_MATCH_START);
      socket.off(SOCKET_EVENTS.TOURNAMENT_FINISHED);
      socket.off(SOCKET_EVENTS.TOURNAMENT_ERROR);
    };
  }, [navigate]);

  // If you have an active tournament, jump to the bracket tab automatically.
  useEffect(() => {
    if (myTournament && myTournament.status !== 'finished') setTab('mine');
  }, [myTournament?.id]);

  function joinPublic(t: TournamentSummary) {
    soundService.playClick();
    socketService.getSocket()?.emit(SOCKET_EVENTS.TOURNAMENT_JOIN, { tournamentId: t.id });
  }

  function joinByCode() {
    if (!joinCode.trim()) return;
    socketService.getSocket()?.emit(SOCKET_EVENTS.TOURNAMENT_JOIN_CODE, { code: joinCode.trim().toUpperCase() });
    setJoinCode('');
  }

  return (
    <div className="min-h-screen pb-16 sm:pb-0" style={{ background: 'linear-gradient(180deg, #14100A 0%, #0E0905 100%)', direction: dir }}>
      {/* Header */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: 'rgba(20,16,10,0.95)', backdropFilter: 'blur(12px)', borderColor: 'rgba(201,168,76,0.15)' }}>
        <button onClick={() => navigate('/home')}
          className="flex items-center gap-2"
          style={{ color: 'rgba(245,230,200,0.55)' }}>
          <span style={{ fontSize: 20 }}>{lang === 'ar' ? '←' : '→'}</span>
          <span className="font-arabic">{lang === 'ar' ? 'الرئيسية' : 'Home'}</span>
        </button>
        <h1 className="font-display tracking-widest" style={{ fontSize: 18, color: '#E8C97A' }}>
          🏆 {lang === 'ar' ? 'البطولات' : 'TOURNAMENTS'}
        </h1>
        <LangToggle />
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {/* Tabs */}
        <div className="flex gap-1.5 mb-5">
          <TabButton label={lang === 'ar' ? '🌐 تصفّح' : '🌐 Browse'}  active={tab === 'browse'} onClick={() => setTab('browse')}/>
          <TabButton label={lang === 'ar' ? '🏆 بطولتي' : '🏆 Mine'}    active={tab === 'mine'}   onClick={() => setTab('mine')}    badge={myTournament ? '●' : undefined}/>
          <TabButton label={lang === 'ar' ? '➕ أنشئ' : '➕ Create'}   active={tab === 'create'} onClick={() => setTab('create')}/>
        </div>

        {/* Browse tab */}
        {tab === 'browse' && (
          <div>
            {/* Join by code */}
            <div className="rounded-2xl p-4 mb-4"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(201,168,76,0.20)' }}>
              <p className="font-arabic mb-2" style={{ fontSize: 13, color: 'rgba(245,230,200,0.65)' }}>
                🔑 {lang === 'ar' ? 'انضم بكود بطولة خاصة' : 'Join a private tournament'}
              </p>
              <div className="flex gap-2">
                <input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder={lang === 'ar' ? 'الكود' : 'Code'}
                  className="flex-1 px-3 py-2 rounded-lg font-mono"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(201,168,76,0.25)',
                    color: '#E8C97A', fontSize: 14, letterSpacing: 2,
                  }}/>
                <motion.button whileTap={{ scale: 0.96 }} onClick={joinByCode}
                  className="rounded-lg px-4 font-arabic font-bold"
                  style={{ background: 'rgba(201,168,76,0.18)', color: '#E8C97A', border: '1px solid rgba(201,168,76,0.45)' }}>
                  {lang === 'ar' ? 'انضم' : 'Join'}
                </motion.button>
              </div>
            </div>

            {/* List */}
            <p className="font-arabic mb-3" style={{ fontSize: 12, color: 'rgba(245,230,200,0.5)' }}>
              {lang === 'ar' ? `${list.length} بطولة عامة متاحة` : `${list.length} public tournaments available`}
            </p>
            {list.length === 0 ? (
              <div className="text-center py-12 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(201,168,76,0.18)' }}>
                <p style={{ fontSize: 32, marginBottom: 8 }}>🏆</p>
                <p className="font-arabic" style={{ fontSize: 13, color: 'rgba(245,230,200,0.5)' }}>
                  {lang === 'ar' ? 'لا بطولات الآن — أنشئ واحدة!' : 'No tournaments yet — create one!'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {list.map(t => (
                  <SummaryCard key={t.id} t={t} lang={lang} onJoin={() => joinPublic(t)} myUid={profile?.uid}/>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mine tab */}
        {tab === 'mine' && (
          <MineTab
            tournament={myTournament}
            finished={finished}
            myUid={profile?.uid}
            lang={lang}
            navigate={navigate}
            onClear={() => { setFinished(null); clear(); }}
          />
        )}

        {/* Create tab */}
        {tab === 'create' && (
          <CreateTab lang={lang} onCreated={() => setTab('mine')}/>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function TabButton({ label, active, onClick, badge }: { label: string; active: boolean; onClick: () => void; badge?: string }) {
  return (
    <button onClick={onClick}
      className="relative flex-1 rounded-xl py-2.5 font-arabic font-bold transition-all"
      style={{
        background: active ? 'rgba(201,168,76,0.20)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? 'rgba(201,168,76,0.55)' : 'rgba(255,255,255,0.06)'}`,
        color: active ? '#E8C97A' : 'rgba(245,230,200,0.5)',
        boxShadow: active ? '0 0 12px rgba(201,168,76,0.20)' : 'none',
        fontSize: 13,
      }}>
      {label}
      {badge && (
        <span className="absolute -top-1 -right-1 rounded-full"
          style={{ width: 8, height: 8, background: '#E04030', border: '1.5px solid #14100A' }}/>
      )}
    </button>
  );
}

function SummaryCard({ t, lang, onJoin, myUid }: { t: TournamentSummary; lang: string; onJoin: () => void; myUid?: string }) {
  const isMine = t.hostUid === myUid;
  const fillPct = (t.players / t.size) * 100;
  const modeLabel = t.matchLength === 'quick' ? '⚡' : t.matchLength === 'long' ? '🏛️' : '📊';
  return (
    <div className="rounded-2xl p-3 flex items-center gap-3"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${t.status === 'in_progress' ? 'rgba(232,201,122,0.45)' : 'rgba(201,168,76,0.20)'}`,
      }}>
      <div className="flex items-center justify-center rounded-xl shrink-0"
        style={{ width: 44, height: 44, background: 'rgba(0,0,0,0.25)', fontSize: 22 }}>
        {AVATAR_EMOJIS[t.hostAvatarId] || '👤'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-arabic font-bold truncate" style={{ fontSize: 13, color: '#E8C97A' }}>
          {t.name}
        </p>
        <div className="flex items-center gap-2 flex-wrap mt-0.5 font-arabic"
          style={{ fontSize: 10.5, color: 'rgba(245,230,200,0.55)' }}>
          <span>👥 {t.size}</span>
          <span>{modeLabel} {ELIMINATION_SCORE[t.matchLength]}{lang === 'ar' ? 'ن' : 'p'}</span>
          <span>🪙 {t.prizeCoins.toLocaleString()}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex-1" style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{
              width: `${fillPct}%`, height: '100%',
              background: 'linear-gradient(90deg, #8B6914, #E8C97A)',
              transition: 'width .3s ease',
            }}/>
          </div>
          <span className="font-mono shrink-0" style={{ fontSize: 9.5, color: 'rgba(245,230,200,0.5)' }}>
            {t.players}/{t.size}
          </span>
        </div>
      </div>
      {t.status === 'waiting' && !isMine ? (
        <motion.button whileTap={{ scale: 0.96 }} onClick={onJoin}
          className="shrink-0 rounded-lg px-3 py-1.5 font-arabic font-bold"
          style={{
            background: 'linear-gradient(135deg, #C9A84C, #A07830)',
            color: '#0E0905', fontSize: 11,
          }}>
          {lang === 'ar' ? 'انضم' : 'Join'}
        </motion.button>
      ) : t.status === 'in_progress' ? (
        <span className="shrink-0 rounded-lg px-2.5 py-1 font-arabic"
          style={{ background: 'rgba(232,201,122,0.10)', color: '#E8C97A', fontSize: 10.5 }}>
          {lang === 'ar' ? 'قيد اللعب' : 'In progress'}
        </span>
      ) : (
        <span className="shrink-0 rounded-lg px-2.5 py-1 font-arabic"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(245,230,200,0.4)', fontSize: 10.5 }}>
          {isMine ? (lang === 'ar' ? 'بطولتك' : 'Yours') : (lang === 'ar' ? 'منتظر' : 'Waiting')}
        </span>
      )}
    </div>
  );
}

// ── Create tab ──────────────────────────────────────────────────────────────
function CreateTab({ lang, onCreated }: { lang: string; onCreated: () => void }) {
  const [size, setSize] = useState<TournamentSize>(4);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [matchLength, setMatchLength] = useState<GameMode>('standard');
  const [visibility, setVisibility] = useState<TournamentVisibility>('public');
  const [name, setName] = useState('');
  const prize = tournamentPrize(size, difficulty);

  function create() {
    soundService.playClick();
    const socket = socketService.getSocket();
    if (!socket) return;
    socket.emit(SOCKET_EVENTS.TOURNAMENT_CREATE, {
      kind: 'online',
      visibility, name: name.trim() || undefined,
      size, difficulty, matchLength,
    });
    onCreated();
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(201,168,76,0.20)' }}>
      <h2 className="font-arabic font-bold mb-1" style={{ fontSize: 16, color: '#E8C97A' }}>
        {lang === 'ar' ? 'بطولة أونلاين جديدة' : 'New Online Tournament'}
      </h2>
      <p className="font-arabic mb-4" style={{ fontSize: 11, color: 'rgba(245,230,200,0.55)' }}>
        {lang === 'ar' ? 'لاعبون حقيقيون · تظهر في القائمة العامة' : 'Real players · listed publicly'}
      </p>

      <div className="flex flex-col gap-4">
        {/* Name */}
        <div>
          <p className="font-arabic mb-1.5" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.55)' }}>
            {lang === 'ar' ? 'اسم البطولة' : 'Tournament name'}
          </p>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={lang === 'ar' ? 'بطولتي (اختياري)' : 'My tournament (optional)'}
            className="w-full px-3 py-2 rounded-lg font-arabic"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(201,168,76,0.20)',
              color: '#E8C97A', fontSize: 13,
            }}/>
        </div>

        <PickerRow title={lang === 'ar' ? 'حجم البطولة' : 'Bracket Size'}
          options={[
            { id: 4, label: '4', sub: lang === 'ar' ? '3 مباريات' : '3 matches' },
            { id: 8, label: '8', sub: lang === 'ar' ? '7 مباريات' : '7 matches' },
          ]}
          value={size} onChange={v => setSize(v as TournamentSize)}/>
        <PickerRow title={lang === 'ar' ? 'الرؤية' : 'Visibility'}
          options={[
            { id: 'public',  label: lang === 'ar' ? '🌐 عامة'  : '🌐 Public',  sub: lang === 'ar' ? 'في القائمة' : 'In the list' },
            { id: 'private', label: lang === 'ar' ? '🔒 خاصة' : '🔒 Private', sub: lang === 'ar' ? 'بكود فقط'  : 'Code only' },
          ]}
          value={visibility} onChange={v => setVisibility(v as TournamentVisibility)}/>
        <PickerRow title={lang === 'ar' ? 'صعوبة البوتات (لو ملأت بهم)' : 'Bot fill difficulty'}
          options={[
            { id: 'easy',   label: '🌱 ' + (lang === 'ar' ? 'سهل'   : 'Easy') },
            { id: 'medium', label: '⚖️ ' + (lang === 'ar' ? 'متوسط' : 'Medium') },
            { id: 'hard',   label: '🔥 ' + (lang === 'ar' ? 'صعب'   : 'Hard') },
          ]}
          value={difficulty} onChange={v => setDifficulty(v as 'easy' | 'medium' | 'hard')}/>
        <PickerRow title={lang === 'ar' ? 'طول كل مباراة' : 'Match Length'}
          options={[
            { id: 'quick',    label: '⚡',  sub: `${ELIMINATION_SCORE.quick}${lang === 'ar' ? 'ن' : 'p'}` },
            { id: 'standard', label: '📊',  sub: `${ELIMINATION_SCORE.standard}${lang === 'ar' ? 'ن' : 'p'}` },
            { id: 'long',     label: '🏛️', sub: `${ELIMINATION_SCORE.long}${lang === 'ar' ? 'ن' : 'p'}` },
          ]}
          value={matchLength} onChange={v => setMatchLength(v as GameMode)}/>

        <div className="rounded-xl p-3 flex items-center justify-between"
          style={{ background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.30)' }}>
          <span className="font-arabic" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.7)' }}>
            🏆 {lang === 'ar' ? 'جائزة البطل' : 'Champion Prize'}
          </span>
          <span className="font-mono font-bold" style={{ fontSize: 16, color: '#E8C97A' }}>
            🪙 {prize.toLocaleString()}
          </span>
        </div>

        <motion.button whileTap={{ scale: 0.97 }} onClick={create}
          className="rounded-2xl py-3 font-arabic font-bold"
          style={{
            background: 'linear-gradient(135deg, #C9A84C, #A07830)',
            color: '#0E0905', fontSize: 14,
            boxShadow: '0 6px 20px rgba(201,168,76,0.45)',
          }}>
          🏆 {lang === 'ar' ? 'أنشئ البطولة' : 'Create Tournament'}
        </motion.button>
      </div>
    </div>
  );
}

function PickerRow({ title, options, value, onChange }: {
  title: string;
  options: { id: any; label: string; sub?: string }[];
  value: any;
  onChange: (v: any) => void;
}) {
  return (
    <div>
      <p className="font-arabic mb-1.5" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.55)' }}>{title}</p>
      <div className="flex gap-2">
        {options.map(o => {
          const sel = value === o.id;
          return (
            <motion.button key={String(o.id)} whileTap={{ scale: 0.94 }}
              onClick={() => { onChange(o.id); soundService.playClick(); }}
              className="flex-1 rounded-xl font-arabic font-bold"
              style={{
                padding: '8px 4px',
                background: sel ? 'rgba(201,168,76,0.20)' : 'rgba(255,255,255,0.04)',
                color: sel ? '#E8C97A' : 'rgba(245,230,200,0.55)',
                border: `1.5px solid ${sel ? 'rgba(201,168,76,0.7)' : 'rgba(255,255,255,0.08)'}`,
                fontSize: 12,
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

// ── Mine tab — bracket + actions ────────────────────────────────────────────
function MineTab({ tournament, finished, myUid, lang, navigate, onClear }: {
  tournament: TournamentState | null;
  finished: any;
  myUid?: string;
  lang: string;
  navigate: (to: string) => void;
  onClear: () => void;
}) {
  if (finished) {
    return (
      <div className="rounded-2xl p-6 text-center"
        style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.40)' }}>
        <div style={{ fontSize: 64, marginBottom: 10 }}>{finished.isHostChampion ? '🏆' : '😔'}</div>
        <h2 className="font-arabic font-bold mb-1" style={{ fontSize: 22, color: '#E8C97A' }}>
          {finished.isHostChampion
            ? (lang === 'ar' ? 'بطل الكأس!' : 'Champion!')
            : (lang === 'ar' ? 'انتهت البطولة' : 'Tournament Over')}
        </h2>
        {finished.isHostChampion && (
          <p className="font-mono font-bold mt-3 mb-4" style={{ fontSize: 24, color: '#E8C97A' }}>
            🪙 +{(finished.prizeCoins || 0).toLocaleString()}
          </p>
        )}
        <button onClick={onClear}
          className="rounded-xl px-5 py-2 font-arabic font-bold"
          style={{ background: 'linear-gradient(135deg, #C9A84C, #A07830)', color: '#0E0905', fontSize: 13 }}>
          {lang === 'ar' ? 'إخفاء' : 'Dismiss'}
        </button>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="text-center py-12 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(201,168,76,0.18)' }}>
        <p style={{ fontSize: 36, marginBottom: 8 }}>🪑</p>
        <p className="font-arabic" style={{ fontSize: 13, color: 'rgba(245,230,200,0.55)' }}>
          {lang === 'ar' ? 'لست في أي بطولة الآن' : 'Not in any tournament right now'}
        </p>
        <p className="font-arabic mt-2" style={{ fontSize: 11, color: 'rgba(245,230,200,0.35)' }}>
          {lang === 'ar' ? 'انضم من تبويب التصفّح أو أنشئ واحدة' : 'Join from Browse or Create one'}
        </p>
      </div>
    );
  }

  const isHost = tournament.hostUid === myUid;
  const me = tournament.players.find(p => p.uid === myUid);
  const eliminated = me?.isEliminated;

  function startTournament() {
    soundService.playClick();
    socketService.getSocket()?.emit(SOCKET_EVENTS.TOURNAMENT_START, { tournamentId: tournament!.id });
  }
  function fillBots() {
    socketService.getSocket()?.emit(SOCKET_EVENTS.TOURNAMENT_FILL_BOTS, { tournamentId: tournament!.id });
  }
  function leave() {
    if (!confirm(lang === 'ar' ? 'متأكد تبا تغادر؟' : 'Leave the tournament?')) return;
    socketService.getSocket()?.emit(SOCKET_EVENTS.TOURNAMENT_LEAVE, { tournamentId: tournament!.id });
    onClear();
  }
  function startNextMatch() {
    socketService.getSocket()?.emit(SOCKET_EVENTS.TOURNAMENT_NEXT_MATCH, { tournamentId: tournament!.id });
  }
  function returnToMatch() {
    const m = tournament!.bracket.find(x => x.status === 'in_progress' && (x.p1Uid === myUid || x.p2Uid === myUid));
    if (m?.gameId) navigate(`/game/check/${m.gameId}`);
  }
  const inProgress = tournament.bracket.find(x => x.status === 'in_progress' && (x.p1Uid === myUid || x.p2Uid === myUid));

  return (
    <div>
      {/* Header card */}
      <div className="rounded-2xl p-4 mb-4"
        style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.30)' }}>
        <div className="flex items-baseline gap-2 mb-1">
          <h2 className="font-arabic font-bold" style={{ fontSize: 16, color: '#E8C97A' }}>{tournament.name}</h2>
          {tournament.code && (
            <span className="font-mono rounded px-2 py-0.5"
              style={{ background: 'rgba(201,168,76,0.15)', color: '#E8C97A', fontSize: 10, letterSpacing: 1.5 }}>
              {tournament.code}
            </span>
          )}
        </div>
        <p className="font-arabic" style={{ fontSize: 11, color: 'rgba(245,230,200,0.55)' }}>
          🪙 {tournament.prizeCoins.toLocaleString()} · 👥 {tournament.players.length}/{tournament.size}
          {' · '}{tournament.matchLength === 'quick' ? '⚡' : tournament.matchLength === 'long' ? '🏛️' : '📊'} {ELIMINATION_SCORE[tournament.matchLength]}{lang === 'ar' ? 'ن' : 'p'}
        </p>

        {/* CTA */}
        {tournament.status === 'waiting' ? (
          <div className="mt-3 flex flex-col gap-2">
            {isHost && (
              <>
                <motion.button whileTap={{ scale: 0.96 }} onClick={startTournament}
                  disabled={tournament.players.length < tournament.size}
                  className="rounded-xl py-2 font-arabic font-bold disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #C9A84C, #A07830)',
                    color: '#0E0905', fontSize: 13,
                  }}>
                  ▶️ {lang === 'ar'
                    ? (tournament.players.length < tournament.size ? `بانتظار ${tournament.size - tournament.players.length} لاعبين` : 'ابدأ البطولة')
                    : (tournament.players.length < tournament.size ? `Waiting for ${tournament.size - tournament.players.length} players` : 'Start Tournament')}
                </motion.button>
                {tournament.players.length < tournament.size && (
                  <button onClick={fillBots}
                    className="rounded-xl py-1.5 font-arabic"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.30)', color: 'rgba(232,201,122,0.85)', fontSize: 11.5 }}>
                    🤖 {lang === 'ar' ? 'املأ الباقي بوتات' : 'Fill remaining seats with bots'}
                  </button>
                )}
              </>
            )}
            <button onClick={leave}
              className="rounded-xl py-1.5 font-arabic"
              style={{ background: 'rgba(224,64,48,0.08)', border: '1px solid rgba(224,64,48,0.30)', color: 'rgba(255,150,140,0.85)', fontSize: 11.5 }}>
              {lang === 'ar' ? 'مغادرة' : 'Leave'}
            </button>
          </div>
        ) : inProgress ? (
          <motion.button whileTap={{ scale: 0.96 }} onClick={returnToMatch}
            className="mt-3 w-full rounded-xl py-2 font-arabic font-bold"
            style={{ background: 'linear-gradient(135deg, #C9A84C, #A07830)', color: '#0E0905', fontSize: 13 }}>
            ▶️ {lang === 'ar' ? 'العودة إلى المباراة' : 'Return to match'}
          </motion.button>
        ) : eliminated ? (
          <p className="mt-3 rounded-xl py-2 px-3 font-arabic text-center"
            style={{ background: 'rgba(224,64,48,0.10)', color: 'rgba(255,150,140,0.85)', border: '1px solid rgba(224,64,48,0.30)', fontSize: 12 }}>
            😔 {lang === 'ar' ? 'تم إقصاؤك — راقب البقية' : 'You were eliminated — watch the rest'}
          </p>
        ) : tournament.nextHostMatchNum != null ? (
          <motion.button whileTap={{ scale: 0.96 }} onClick={startNextMatch}
            className="mt-3 w-full rounded-xl py-2 font-arabic font-bold"
            style={{ background: 'linear-gradient(135deg, #C9A84C, #A07830)', color: '#0E0905', fontSize: 13 }}>
            ▶️ {lang === 'ar' ? 'ابدأ مباراتك التالية' : 'Start your next match'}
          </motion.button>
        ) : (
          <p className="mt-3 rounded-xl py-2 px-3 font-arabic text-center"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(245,230,200,0.55)', fontSize: 12 }}>
            ⏳ {lang === 'ar' ? 'بانتظار باقي المباريات' : 'Waiting for other matches'}
          </p>
        )}
      </div>

      {/* Players (waiting) or Bracket (in progress) */}
      {tournament.status === 'waiting' ? (
        <div>
          <h3 className="font-arabic font-bold mb-2 px-1" style={{ fontSize: 12, color: 'rgba(201,168,76,0.85)' }}>
            {lang === 'ar' ? `اللاعبون (${tournament.players.length}/${tournament.size})` : `Players (${tournament.players.length}/${tournament.size})`}
          </h3>
          <div className="flex flex-col gap-1.5">
            {tournament.players.map(p => (
              <div key={p.uid} className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 18 }}>{AVATAR_EMOJIS[p.avatarId] || '👤'}</span>
                <span className="font-arabic flex-1 truncate" style={{ fontSize: 12.5, color: '#E8C97A' }}>
                  {p.uid === myUid ? (lang === 'ar' ? 'أنت' : 'You') : p.displayName}
                  {p.uid === tournament.hostUid && <span style={{ marginInlineStart: 6, fontSize: 9.5, color: 'rgba(245,230,200,0.5)' }}>👑 host</span>}
                  {p.isBot && <span style={{ marginInlineStart: 6, fontSize: 9.5, color: 'rgba(245,230,200,0.5)' }}>🤖</span>}
                </span>
              </div>
            ))}
            {Array.from({ length: tournament.size - tournament.players.length }).map((_, i) => (
              <div key={`empty-${i}`} className="flex items-center gap-2 rounded-xl px-3 py-2 font-arabic"
                style={{ background: 'rgba(255,255,255,0.015)', border: '1px dashed rgba(255,255,255,0.08)', color: 'rgba(245,230,200,0.3)', fontSize: 12 }}>
                — {lang === 'ar' ? 'مقعد فارغ' : 'Empty seat'}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <BracketView tournament={tournament} myUid={myUid} lang={lang}/>
      )}
    </div>
  );
}

function BracketView({ tournament, myUid, lang }: { tournament: TournamentState; myUid?: string; lang: string }) {
  const rounds = bracketRounds(tournament.size);
  const playersByUid = Object.fromEntries(tournament.players.map(p => [p.uid, p]));
  return (
    <div className="flex flex-col gap-4">
      {rounds.map(rd => (
        <div key={rd.round}>
          <h3 className="font-arabic font-bold mb-2 px-1" style={{ fontSize: 12, color: 'rgba(201,168,76,0.85)' }}>
            {lang === 'ar' ? rd.labelAr : rd.labelEn}
          </h3>
          <div className="flex flex-col gap-2">
            {tournament.bracket.filter(m => m.round === rd.round).map(m => (
              <BracketCard key={m.matchNum} match={m} playersByUid={playersByUid as any} myUid={myUid} lang={lang}/>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BracketCard({ match, playersByUid, myUid, lang }: {
  match: TournamentMatch;
  playersByUid: Record<string, any>;
  myUid?: string;
  lang: string;
}) {
  const p1 = match.p1Uid ? playersByUid[match.p1Uid] : null;
  const p2 = match.p2Uid ? playersByUid[match.p2Uid] : null;
  const isCurrent = match.status === 'in_progress';
  const winnerUid = match.winnerUid;
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{
        background: isCurrent ? 'rgba(232,201,122,0.10)' : 'rgba(255,255,255,0.025)',
        border: `1px solid ${isCurrent ? 'rgba(232,201,122,0.55)' : 'rgba(255,255,255,0.06)'}`,
      }}>
      <Slot p={p1} winner={winnerUid === match.p1Uid} loser={!!winnerUid && winnerUid !== match.p1Uid} myUid={myUid} lang={lang}/>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }}/>
      <Slot p={p2} winner={winnerUid === match.p2Uid} loser={!!winnerUid && winnerUid !== match.p2Uid} myUid={myUid} lang={lang}/>
      {isCurrent && (
        <div className="px-3 py-1 font-arabic text-center"
          style={{ background: 'rgba(232,201,122,0.10)', fontSize: 9.5, color: '#E8C97A', letterSpacing: 0.5 }}>
          ▶ {lang === 'ar' ? 'قيد اللعب' : 'In progress'}
        </div>
      )}
    </div>
  );
}

function Slot({ p, winner, loser, myUid, lang }: { p: any; winner: boolean; loser: boolean; myUid?: string; lang: string }) {
  const isMe = p?.uid === myUid;
  const empty = !p;
  return (
    <div className="flex items-center gap-2 px-3 py-2"
      style={{ background: winner ? 'rgba(201,168,76,0.10)' : 'transparent', opacity: loser ? 0.5 : 1 }}>
      <span style={{ fontSize: 18 }}>{empty ? '—' : (AVATAR_EMOJIS[p.avatarId] || '👤')}</span>
      <span className="flex-1 font-arabic truncate"
        style={{
          fontSize: 12.5,
          color: winner ? '#E8C97A' : isMe ? 'rgba(201,168,76,0.85)' : 'rgba(245,230,200,0.65)',
          fontWeight: winner || isMe ? 700 : 400,
        }}>
        {empty ? (lang === 'ar' ? 'في انتظار الفائز' : 'TBD')
          : isMe ? (lang === 'ar' ? 'أنت' : 'You')
          : p.displayName}
        {winner && ' ✓'}
      </span>
    </div>
  );
}
