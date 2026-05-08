import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { socketService } from '../../services/socket.service';
import { soundService } from '../../services/sound.service';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { useTournamentStore } from '../../store/tournamentStore';
import { useLang } from '../../i18n/useT';
import { PageShell } from '../../components/shared/PageShell';
import { Confetti } from '../../components/shared/Confetti';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { apiClient } from '../../services/api.service';
import {
  SOCKET_EVENTS, ELIMINATION_SCORE,
  tournamentPrize, bracketRounds, splitPrizePool, computePool,
  ENTRY_FEE_TIERS, FORFEIT_WINDOW_MS,
} from '@check-game/shared';
import type {
  TournamentSize, GameMode, TournamentSummary,
  TournamentState, TournamentMatch, TournamentVisibility, PrizeSplit,
  UserProfile,
} from '@check-game/shared';

const AVATAR_EMOJIS: Record<string, string> = {
  avatar_1: '🦅', avatar_2: '🐪', avatar_3: '🌴', avatar_4: '⚔️',
  avatar_5: '🌙', avatar_6: '⭐', avatar_7: '🏜️', avatar_8: '🌊',
  avatar_9: '🦁', avatar_10: '🔥', avatar_11: '💎', avatar_12: '🎭',
  avatar_13: '⚔️', avatar_14: '⛵', avatar_15: '🧭', avatar_16: '🇦🇪',
  avatar_17: '👸', avatar_18: '🧕', avatar_19: '🤵', avatar_20: '👳', avatar_21: '👩', avatar_22: '🧓',
  avatar_23: '👩‍🎓', avatar_24: '👵', avatar_25: '👩‍🏫', avatar_26: '🧕', avatar_27: '👩‍⚕️', avatar_28: '👑',
};

type Tab = 'bots' | 'online' | 'mine';

export function TournamentsPage() {
  const lang = useLang();
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const navigate = useNavigate();
  const { profile, setProfile } = useAuthStore();
  const { addToast } = useUiStore();
  const { state: myTournament, setState, finished, setFinished, clear } = useTournamentStore();
  const [tab, setTab] = useState<Tab>('online');
  const [list, setList] = useState<TournamentSummary[]>([]);

  useEffect(() => {
    const socket = socketService.connect();
    socket.on(SOCKET_EVENTS.TOURNAMENT_LIST, (data: TournamentSummary[]) => setList(data));
    socket.on(SOCKET_EVENTS.TOURNAMENT_STATE, (s: TournamentState) => setState(s));
    socket.on(SOCKET_EVENTS.TOURNAMENT_MATCH_START, (data: { gameId: string }) => {
      navigate(`/game/check/${data.gameId}`);
    });
    socket.on(SOCKET_EVENTS.TOURNAMENT_FINISHED, (data: any) => {
      setFinished(data);
      // Refresh profile so the coin balance + tournament stats update.
      apiClient.get<UserProfile>('/api/profile').then(p => setProfile(p)).catch(() => null);
    });
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

  useEffect(() => {
    if (myTournament && myTournament.status !== 'finished') setTab('mine');
  }, [myTournament?.id]);

  const tStats = (profile as any)?.tournamentStats || { cupsWon: 0, podiums: 0, totalPrizeWon: 0 };
  const isCurrentChampion = tStats.lastCupAt && (Date.now() - tStats.lastCupAt) < 24 * 60 * 60 * 1000;

  return (
    <PageShell
      title={`🏆 ${lang === 'ar' ? 'البطولات' : 'TOURNAMENTS'}`}
      lang={lang}
      maxWidth={760}
    >
      <div className="pb-16 sm:pb-0">
        {/* Stats banner — own tournament wins, podiums, total prize money */}
        <div className="rounded-2xl p-4 mb-4"
          style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.08), rgba(120,80,20,0.04))', border: '1px solid rgba(201,168,76,0.20)' }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-arabic font-bold flex items-center gap-2" style={{ fontSize: 14, color: '#E8C97A' }}>
                {isCurrentChampion ? '👑' : '🏆'} {profile?.displayName || (lang === 'ar' ? 'أنت' : 'You')}
                {isCurrentChampion && (
                  <motion.span
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                    className="rounded-full px-2 py-0.5 font-arabic font-bold"
                    style={{ background: 'rgba(232,201,122,0.20)', color: '#FFE07A', fontSize: 10 }}>
                    {lang === 'ar' ? 'بطل اليوم' : 'Champion'}
                  </motion.span>
                )}
              </p>
              <p className="font-arabic mt-0.5" style={{ fontSize: 11, color: 'rgba(245,230,200,0.55)' }}>
                💰 {(profile?.coins ?? 0).toLocaleString()} {lang === 'ar' ? 'كوينز' : 'coins'}
              </p>
            </div>
            <div className="flex gap-3">
              <Stat label={lang === 'ar' ? 'كؤوس' : 'Cups'}    value={tStats.cupsWon || 0}    accent="#E8C97A"/>
              <Stat label={lang === 'ar' ? 'منصات' : 'Podiums'} value={tStats.podiums || 0}   accent="#C495FF"/>
              <Stat label={lang === 'ar' ? 'جوائز' : 'Earned'}  value={(tStats.totalPrizeWon || 0).toLocaleString()} accent="#80E0A0" suffix="🪙"/>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-5">
          <TabButton label={lang === 'ar' ? '🤖 بوتات' : '🤖 Bots'}   active={tab === 'bots'}   onClick={() => setTab('bots')}/>
          <TabButton label={lang === 'ar' ? '🌐 أونلاين' : '🌐 Online'} active={tab === 'online'} onClick={() => setTab('online')}/>
          <TabButton label={lang === 'ar' ? '🏆 بطولتي' : '🏆 Mine'}    active={tab === 'mine'}   onClick={() => setTab('mine')} badge={myTournament ? '●' : undefined}/>
        </div>

        {tab === 'bots'   && <BotsTab lang={lang}/>}
        {tab === 'online' && <OnlineTab lang={lang} list={list} myUid={profile?.uid} coins={profile?.coins ?? 0}/>}
        {tab === 'mine'   && (
          <MineTab
            tournament={myTournament}
            finished={finished}
            myUid={profile?.uid}
            lang={lang}
            navigate={navigate}
            onClear={() => { setFinished(null); clear(); }}
          />
        )}
      </div>
    </PageShell>
  );
}

function Stat({ label, value, accent, suffix }: { label: string; value: any; accent: string; suffix?: string }) {
  return (
    <div className="text-center">
      <div className="font-bold font-mono" style={{ fontSize: 16, color: accent }}>
        {value} {suffix}
      </div>
      <div className="font-arabic" style={{ fontSize: 9.5, color: 'rgba(245,230,200,0.45)' }}>{label}</div>
    </div>
  );
}

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

// ── Bots tab — instant solo cup setup ────────────────────────────────────────
function BotsTab({ lang }: { lang: string }) {
  const [size, setSize] = useState<TournamentSize>(4);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [matchLength, setMatchLength] = useState<GameMode>('quick');
  const prize = tournamentPrize(size, difficulty);

  function start() {
    soundService.playClick();
    socketService.getSocket()?.emit(SOCKET_EVENTS.TOURNAMENT_CREATE, {
      kind: 'solo', size, difficulty, matchLength,
    });
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(201,168,76,0.20)' }}>
      <div className="flex items-center gap-2 mb-1">
        <span style={{ fontSize: 26 }}>🤖</span>
        <h2 className="font-arabic font-bold" style={{ fontSize: 17, color: '#E8C97A' }}>
          {lang === 'ar' ? 'كأس البوتات' : 'Bots Cup'}
        </h2>
      </div>
      <p className="font-arabic mb-4" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.55)' }}>
        {lang === 'ar'
          ? 'بطولة ضد البوتات — بدون رسوم دخول، بدء فوري'
          : 'Tournament vs bots — no entry fee, instant start'}
      </p>

      <div className="flex flex-col gap-4">
        <PickerRow title={lang === 'ar' ? 'حجم البطولة' : 'Bracket Size'}
          options={[
            { id: 4, label: '4', sub: lang === 'ar' ? '3 مباريات' : '3 matches' },
            { id: 8, label: '8', sub: lang === 'ar' ? '7 مباريات' : '7 matches' },
          ]}
          value={size} onChange={v => setSize(v as TournamentSize)}/>
        <PickerRow title={lang === 'ar' ? 'صعوبة البوتات' : 'Bot Difficulty'}
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

        <PrizeBanner label={lang === 'ar' ? 'جائزة الفوز بالكأس' : 'Cup Prize'} amount={prize}/>

        <motion.button whileTap={{ scale: 0.97 }} onClick={start}
          className="rounded-2xl py-3 font-arabic font-bold"
          style={{
            background: 'linear-gradient(135deg, #C9A84C, #A07830)',
            color: '#0E0905', fontSize: 14,
            boxShadow: '0 6px 20px rgba(201,168,76,0.45)',
          }}>
          🤖 {lang === 'ar' ? 'ابدأ كأس البوتات' : 'Start Bots Cup'}
        </motion.button>
      </div>
    </div>
  );
}

// ── Online tab — browse + create ─────────────────────────────────────────────
function OnlineTab({ lang, list, myUid, coins }: { lang: string; list: TournamentSummary[]; myUid?: string; coins: number }) {
  const [view, setView] = useState<'browse' | 'create'>('browse');
  const [joinCode, setJoinCode] = useState('');

  function joinPublic(t: TournamentSummary) {
    if (coins < t.entryFee) {
      soundService.playError();
      return;
    }
    soundService.playClick();
    socketService.getSocket()?.emit(SOCKET_EVENTS.TOURNAMENT_JOIN, { tournamentId: t.id });
  }
  function joinByCode() {
    if (!joinCode.trim()) return;
    socketService.getSocket()?.emit(SOCKET_EVENTS.TOURNAMENT_JOIN_CODE, { code: joinCode.trim().toUpperCase() });
    setJoinCode('');
  }

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-1.5 mb-4">
        <SubTab label={lang === 'ar' ? '🌐 تصفّح' : '🌐 Browse'} active={view === 'browse'} onClick={() => setView('browse')}/>
        <SubTab label={lang === 'ar' ? '➕ أنشئ' : '➕ Create'} active={view === 'create'} onClick={() => setView('create')}/>
      </div>

      {view === 'browse' ? (
        <>
          {/* Join by code */}
          <div className="rounded-2xl p-3 mb-4"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(201,168,76,0.20)' }}>
            <p className="font-arabic mb-1.5" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.55)' }}>
              🔑 {lang === 'ar' ? 'بكود بطولة خاصة' : 'Private tournament code'}
            </p>
            <div className="flex gap-2">
              <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder={lang === 'ar' ? 'الكود' : 'Code'}
                className="flex-1 px-3 py-2 rounded-lg font-mono"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.25)', color: '#E8C97A', fontSize: 13, letterSpacing: 2 }}/>
              <motion.button whileTap={{ scale: 0.96 }} onClick={joinByCode}
                className="rounded-lg px-4 font-arabic font-bold"
                style={{ background: 'rgba(201,168,76,0.18)', color: '#E8C97A', border: '1px solid rgba(201,168,76,0.45)', fontSize: 13 }}>
                {lang === 'ar' ? 'انضم' : 'Join'}
              </motion.button>
            </div>
          </div>

          <p className="font-arabic mb-3 px-1" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.5)' }}>
            {lang === 'ar' ? `${list.length} بطولة عامة` : `${list.length} public tournaments`}
          </p>
          {list.length === 0 ? (
            <div className="text-center py-12 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(201,168,76,0.18)' }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>🏆</p>
              <p className="font-arabic" style={{ fontSize: 13, color: 'rgba(245,230,200,0.5)' }}>
                {lang === 'ar' ? 'لا بطولات الآن — أنشئ واحدة!' : 'No tournaments — create one!'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {list.map(t => (
                <SummaryCard key={t.id} t={t} lang={lang} onJoin={() => joinPublic(t)} myUid={myUid} coins={coins}/>
              ))}
            </div>
          )}
        </>
      ) : (
        <CreateOnlineForm lang={lang} coins={coins} onCreated={() => setView('browse')}/>
      )}
    </div>
  );
}

function SubTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex-1 rounded-lg py-1.5 font-arabic"
      style={{
        background: active ? 'rgba(201,168,76,0.12)' : 'transparent',
        border: `1px solid ${active ? 'rgba(201,168,76,0.40)' : 'rgba(255,255,255,0.06)'}`,
        color: active ? '#E8C97A' : 'rgba(245,230,200,0.5)', fontSize: 12,
      }}>{label}</button>
  );
}

function SummaryCard({ t, lang, onJoin, myUid, coins }: { t: TournamentSummary; lang: string; onJoin: () => void; myUid?: string; coins: number }) {
  const isMine = t.hostUid === myUid;
  const fillPct = (t.players / t.size) * 100;
  const modeLabel = t.matchLength === 'quick' ? '⚡' : t.matchLength === 'long' ? '🏛️' : '📊';
  const cantAfford = coins < t.entryFee;
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
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className="font-arabic font-bold truncate" style={{ fontSize: 13, color: '#E8C97A' }}>{t.name}</p>
          {t.clanOnlyTag && (
            <span className="font-arabic rounded px-1.5"
              style={{ fontSize: 9.5, background: 'rgba(196,149,255,0.15)', color: '#C495FF', letterSpacing: 0.5 }}>
              🏰 [{t.clanOnlyTag}]
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-0.5 font-arabic"
          style={{ fontSize: 10.5, color: 'rgba(245,230,200,0.55)' }}>
          <span>👥 {t.size}</span>
          <span>{modeLabel}</span>
          <span>🪙 <b style={{ color: '#E8C97A' }}>{t.prizePool.toLocaleString()}</b> {lang === 'ar' ? 'جائزة' : 'pool'}</span>
          {t.entryFee > 0 && <span style={{ color: 'rgba(255,180,140,0.85)' }}>💸 {t.entryFee.toLocaleString()}</span>}
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
          disabled={cantAfford}
          className="shrink-0 rounded-lg px-3 py-1.5 font-arabic font-bold disabled:opacity-50"
          style={{
            background: cantAfford ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #C9A84C, #A07830)',
            color: cantAfford ? 'rgba(245,230,200,0.4)' : '#0E0905', fontSize: 11,
          }}>
          {cantAfford
            ? (lang === 'ar' ? 'لا يكفي' : 'Need more')
            : (lang === 'ar' ? 'انضم' : 'Join')}
        </motion.button>
      ) : t.status === 'in_progress' ? (
        <span className="shrink-0 rounded-lg px-2.5 py-1 font-arabic"
          style={{ background: 'rgba(232,201,122,0.10)', color: '#E8C97A', fontSize: 10.5 }}>
          {lang === 'ar' ? 'قيد اللعب' : 'Live'}
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

// ── Create online form ──────────────────────────────────────────────────────
function CreateOnlineForm({ lang, coins, onCreated }: { lang: string; coins: number; onCreated: () => void }) {
  const profile = useAuthStore(s => s.profile);
  const myClanTag = (profile as any)?.clanTag as string | null | undefined;
  const [size, setSize] = useState<TournamentSize>(4);
  const [matchLength, setMatchLength] = useState<GameMode>('standard');
  const [visibility, setVisibility] = useState<TournamentVisibility>('public');
  const [name, setName] = useState('');
  const [entryFee, setEntryFee] = useState<number>(100);
  const [prizeSplit, setPrizeSplit] = useState<PrizeSplit>('winner_takes_all');
  const [clanOnly, setClanOnly] = useState(false);
  const cantAfford = coins < entryFee;

  const projectedPool = computePool(entryFee, size);
  const splits = splitPrizePool(projectedPool, prizeSplit, size);

  function create() {
    if (cantAfford) return;
    soundService.playClick();
    socketService.getSocket()?.emit(SOCKET_EVENTS.TOURNAMENT_CREATE, {
      kind: 'online',
      visibility, name: name.trim() || undefined,
      size, matchLength, entryFee, prizeSplit,
      difficulty: 'medium',
      clanOnly,
    });
    onCreated();
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(201,168,76,0.20)' }}>
      <div className="flex items-center gap-2 mb-1">
        <span style={{ fontSize: 26 }}>🌐</span>
        <h2 className="font-arabic font-bold" style={{ fontSize: 17, color: '#E8C97A' }}>
          {lang === 'ar' ? 'بطولة أونلاين جديدة' : 'New Online Tournament'}
        </h2>
      </div>
      <p className="font-arabic mb-4" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.55)' }}>
        {lang === 'ar' ? 'كل لاعب يدفع رسوم دخول · الجائزة من المجموع' : 'Every player pays entry · prize comes from the pot'}
      </p>

      <div className="flex flex-col gap-4">
        <div>
          <p className="font-arabic mb-1.5" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.55)' }}>
            {lang === 'ar' ? 'اسم البطولة' : 'Tournament name'}
          </p>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder={lang === 'ar' ? 'بطولتي (اختياري)' : 'My tournament (optional)'}
            className="w-full px-3 py-2 rounded-lg font-arabic"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.20)', color: '#E8C97A', fontSize: 13 }}/>
        </div>

        <PickerRow title={lang === 'ar' ? 'حجم البطولة' : 'Bracket Size'}
          options={[
            { id: 4, label: '4', sub: lang === 'ar' ? '3 مباريات' : '3 matches' },
            { id: 8, label: '8', sub: lang === 'ar' ? '7 مباريات' : '7 matches' },
          ]}
          value={size} onChange={v => setSize(v as TournamentSize)}/>

        {/* Entry fee tier picker */}
        <div>
          <p className="font-arabic mb-1.5" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.55)' }}>
            💸 {lang === 'ar' ? `رسوم الدخول (لديك ${coins.toLocaleString()})` : `Entry fee (you have ${coins.toLocaleString()})`}
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {ENTRY_FEE_TIERS.map(fee => {
              const sel = entryFee === fee;
              const cant = coins < fee;
              return (
                <motion.button key={fee} whileTap={{ scale: 0.93 }}
                  onClick={() => { setEntryFee(fee); soundService.playClick(); }}
                  disabled={cant}
                  className="rounded-xl py-2 font-mono font-bold disabled:opacity-40"
                  style={{
                    background: sel ? 'rgba(201,168,76,0.20)' : 'rgba(255,255,255,0.04)',
                    color: sel ? '#E8C97A' : 'rgba(245,230,200,0.55)',
                    border: `1.5px solid ${sel ? 'rgba(201,168,76,0.65)' : 'rgba(255,255,255,0.08)'}`,
                    fontSize: 11.5,
                  }}>
                  🪙 {fee >= 1000 ? `${fee/1000}k` : fee}
                </motion.button>
              );
            })}
          </div>
        </div>

        <PickerRow title={lang === 'ar' ? 'الرؤية' : 'Visibility'}
          options={[
            { id: 'public',  label: lang === 'ar' ? '🌐 عامة'  : '🌐 Public',  sub: lang === 'ar' ? 'في القائمة' : 'In list' },
            { id: 'private', label: lang === 'ar' ? '🔒 خاصة' : '🔒 Private', sub: lang === 'ar' ? 'بكود فقط'  : 'Code only' },
          ]}
          value={visibility} onChange={v => setVisibility(v as TournamentVisibility)}/>
        <PickerRow title={lang === 'ar' ? 'طول كل مباراة' : 'Match Length'}
          options={[
            { id: 'quick',    label: '⚡',  sub: `${ELIMINATION_SCORE.quick}${lang === 'ar' ? 'ن' : 'p'}` },
            { id: 'standard', label: '📊',  sub: `${ELIMINATION_SCORE.standard}${lang === 'ar' ? 'ن' : 'p'}` },
            { id: 'long',     label: '🏛️', sub: `${ELIMINATION_SCORE.long}${lang === 'ar' ? 'ن' : 'p'}` },
          ]}
          value={matchLength} onChange={v => setMatchLength(v as GameMode)}/>
        <PickerRow title={lang === 'ar' ? 'توزيع الجائزة' : 'Prize Split'}
          options={[
            { id: 'winner_takes_all', label: lang === 'ar' ? '🏆 الكل للأول' : '🏆 Winner all',  sub: '100%' },
            { id: 'top3',             label: lang === 'ar' ? '🥇🥈🥉 توب 3'  : '🥇🥈🥉 Top 3', sub: '60/30/10' },
          ]}
          value={prizeSplit} onChange={v => setPrizeSplit(v as PrizeSplit)}/>

        {/* Clan-only toggle — only available if the player is in a clan */}
        {myClanTag && (
          <button onClick={() => { setClanOnly(c => !c); soundService.playClick(); }}
            className="w-full rounded-xl py-2.5 px-3 font-arabic flex items-center justify-between"
            style={{
              background: clanOnly ? 'rgba(196,149,255,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1.5px solid ${clanOnly ? 'rgba(196,149,255,0.55)' : 'rgba(255,255,255,0.08)'}`,
              color: clanOnly ? '#C495FF' : 'rgba(245,230,200,0.65)',
            }}>
            <span style={{ fontSize: 12.5 }}>
              🏰 {lang === 'ar' ? `بطولة قبيلتي [${myClanTag}] فقط` : `Clan-only tournament [${myClanTag}]`}
              <div style={{ fontSize: 9.5, opacity: 0.7, marginTop: 2 }}>
                {lang === 'ar' ? '70% للفائز، 30% لخزنة القبيلة' : '70% to winner, 30% to clan bank'}
              </div>
            </span>
            <span style={{
              width: 36, height: 20, borderRadius: 10, position: 'relative',
              background: clanOnly ? 'rgba(196,149,255,0.40)' : 'rgba(255,255,255,0.10)',
              transition: 'background .2s',
            }}>
              <span style={{
                position: 'absolute', top: 2, [clanOnly ? 'right' : 'left']: 2,
                width: 16, height: 16, borderRadius: 8, background: '#fff',
                transition: 'all .2s',
              }}/>
            </span>
          </button>
        )}

        {/* Live prize pool projection */}
        <div className="rounded-xl p-3"
          style={{ background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.30)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="font-arabic" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.7)' }}>
              🏆 {lang === 'ar' ? 'الجائزة الكاملة لما تمتلئ' : 'Full prize pool when full'}
            </span>
            <span className="font-mono font-bold" style={{ fontSize: 18, color: '#E8C97A' }}>
              🪙 {projectedPool.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-1.5 font-arabic" style={{ fontSize: 10.5, color: 'rgba(245,230,200,0.6)' }}>
            <span>🥇 {splits[0].toLocaleString()}</span>
            {splits[1] > 0 && <span>🥈 {splits[1].toLocaleString()}</span>}
            {splits[2] > 0 && <span>🥉 {splits[2].toLocaleString()}</span>}
          </div>
        </div>

        <motion.button whileTap={{ scale: 0.97 }} onClick={create}
          disabled={cantAfford}
          className="rounded-2xl py-3 font-arabic font-bold disabled:opacity-50"
          style={{
            background: cantAfford ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #C9A84C, #A07830)',
            color: cantAfford ? 'rgba(245,230,200,0.4)' : '#0E0905',
            fontSize: 14,
            boxShadow: cantAfford ? 'none' : '0 6px 20px rgba(201,168,76,0.45)',
          }}>
          {cantAfford
            ? (lang === 'ar' ? 'كوينزك أقل من الرسوم' : 'Not enough coins for entry')
            : (lang === 'ar' ? `أنشئ (تدفع ${entryFee.toLocaleString()} 🪙)` : `Create (pay ${entryFee.toLocaleString()} 🪙)`)}
        </motion.button>
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
  if (finished) return <FinishedCard finished={finished} lang={lang} onClear={onClear}/>;
  if (!tournament) {
    return (
      <div className="text-center py-12 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(201,168,76,0.18)' }}>
        <p style={{ fontSize: 36, marginBottom: 8 }}>🪑</p>
        <p className="font-arabic" style={{ fontSize: 13, color: 'rgba(245,230,200,0.55)' }}>
          {lang === 'ar' ? 'لست في أي بطولة الآن' : 'Not in any tournament right now'}
        </p>
      </div>
    );
  }
  return <ActiveTournament tournament={tournament} myUid={myUid} lang={lang} navigate={navigate} onClear={onClear}/>;
}

function ActiveTournament({ tournament, myUid, lang, navigate, onClear }: {
  tournament: TournamentState;
  myUid?: string;
  lang: string;
  navigate: (to: string) => void;
  onClear: () => void;
}) {
  const isHost = tournament.hostUid === myUid;
  const me = tournament.players.find(p => p.uid === myUid);
  const eliminated = me?.isEliminated;
  const [confirmLeave, setConfirmLeave] = useState(false);

  function startTournament() { soundService.playClick(); socketService.getSocket()?.emit(SOCKET_EVENTS.TOURNAMENT_START, { tournamentId: tournament.id }); }
  function fillBots()        { socketService.getSocket()?.emit(SOCKET_EVENTS.TOURNAMENT_FILL_BOTS, { tournamentId: tournament.id }); }
  function leave()           { setConfirmLeave(true); }
  function confirmedLeave() {
    setConfirmLeave(false);
    socketService.getSocket()?.emit(SOCKET_EVENTS.TOURNAMENT_LEAVE, { tournamentId: tournament.id });
    onClear();
  }
  // Refund language differs by phase — use the right copy in the modal.
  const willRefund = tournament.status === 'waiting' && tournament.entryFee > 0;
  function startNextMatch() { socketService.getSocket()?.emit(SOCKET_EVENTS.TOURNAMENT_NEXT_MATCH, { tournamentId: tournament.id }); }
  function returnToMatch() {
    const m = tournament.bracket.find(x => x.status === 'in_progress' && (x.p1Uid === myUid || x.p2Uid === myUid));
    if (m?.gameId) navigate(`/game/check/${m.gameId}`);
  }
  const inProgress = tournament.bracket.find(x => x.status === 'in_progress' && (x.p1Uid === myUid || x.p2Uid === myUid));
  const splits = splitPrizePool(tournament.prizePool, tournament.prizeSplit, tournament.size);

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
          👥 {tournament.players.length}/{tournament.size}
          {' · '}{tournament.matchLength === 'quick' ? '⚡' : tournament.matchLength === 'long' ? '🏛️' : '📊'} {ELIMINATION_SCORE[tournament.matchLength]}{lang === 'ar' ? 'ن' : 'p'}
          {tournament.entryFee > 0 && <> {' · '}💸 {tournament.entryFee.toLocaleString()}</>}
        </p>

        {/* Prize pool — big & bright */}
        <div className="rounded-xl p-3 mt-3"
          style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.35)' }}>
          <div className="flex items-baseline justify-between">
            <span className="font-arabic" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.65)' }}>
              🏆 {lang === 'ar' ? 'مجموع الجوائز' : 'Total Prize Pool'}
            </span>
            <span className="font-mono font-bold" style={{ fontSize: 22, color: '#E8C97A' }}>
              🪙 {tournament.prizePool.toLocaleString()}
            </span>
          </div>
          {tournament.prizeSplit === 'top3' && tournament.size >= 4 && (
            <div className="flex items-center justify-between gap-2 mt-2 font-arabic"
              style={{ fontSize: 10.5, color: 'rgba(245,230,200,0.6)' }}>
              <span>🥇 {splits[0].toLocaleString()}</span>
              <span>🥈 {splits[1].toLocaleString()}</span>
              {splits[2] > 0 && <span>🥉 {splits[2].toLocaleString()}</span>}
            </div>
          )}
        </div>

        {/* CTAs */}
        {tournament.status === 'waiting' ? (
          <div className="mt-3 flex flex-col gap-2">
            {isHost && (
              <>
                <motion.button whileTap={{ scale: 0.96 }} onClick={startTournament}
                  disabled={tournament.players.length < tournament.size}
                  className="rounded-xl py-2 font-arabic font-bold disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #C9A84C, #A07830)', color: '#0E0905', fontSize: 13 }}>
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
              {lang === 'ar' ? `مغادرة${tournament.entryFee > 0 ? ' (تُسترد الرسوم)' : ''}` : `Leave${tournament.entryFee > 0 ? ' (refunded)' : ''}`}
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
            😔 {lang === 'ar' ? 'تم إقصاؤك — راقب البقية' : 'You were eliminated'}
          </p>
        ) : tournament.nextHostMatchNum != null ? (
          <ForfeitCountdown tournament={tournament} onStart={startNextMatch} lang={lang}/>
        ) : (
          <p className="mt-3 rounded-xl py-2 px-3 font-arabic text-center"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(245,230,200,0.55)', fontSize: 12 }}>
            ⏳ {lang === 'ar' ? 'بانتظار باقي المباريات' : 'Waiting for other matches'}
          </p>
        )}
      </div>

      {tournament.status === 'waiting' ? (
        <PlayersList tournament={tournament} myUid={myUid} lang={lang}/>
      ) : (
        <BracketView tournament={tournament} myUid={myUid} lang={lang}/>
      )}

      {/* Leave-tournament confirmation — replaces window.confirm so we
          don't drop the browser's native dialog over the game UI. */}
      <ConfirmModal
        open={confirmLeave}
        title={lang === 'ar' ? 'مغادرة البطولة' : 'Leave Tournament'}
        message={
          willRefund
            ? (lang === 'ar'
                ? `سوف تسترد رسوم الدخول (${tournament.entryFee.toLocaleString()} 🪙). متأكد؟`
                : `Your entry fee (${tournament.entryFee.toLocaleString()} 🪙) will be refunded. Continue?`)
            : (lang === 'ar'
                ? 'لن تسترد الرسوم بعد بدء البطولة. متأكد تبا تغادر؟'
                : 'Entry fee not refunded once the tournament started. Leave anyway?')
        }
        confirmLabel={lang === 'ar' ? 'مغادرة' : 'Leave'}
        cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
        tone="danger"
        lang={lang}
        onConfirm={confirmedLeave}
        onCancel={() => setConfirmLeave(false)}
      />
    </div>
  );
}

function ForfeitCountdown({ tournament, onStart, lang }: { tournament: TournamentState; onStart: () => void; lang: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const remaining = tournament.forfeitAt ? Math.max(0, Math.floor((tournament.forfeitAt - now) / 1000)) : null;
  const showTimer = remaining != null && remaining < FORFEIT_WINDOW_MS / 1000;
  return (
    <motion.button whileTap={{ scale: 0.96 }} onClick={onStart}
      className="mt-3 w-full rounded-xl py-2 font-arabic font-bold flex items-center justify-center gap-2"
      style={{ background: 'linear-gradient(135deg, #C9A84C, #A07830)', color: '#0E0905', fontSize: 13 }}>
      ▶️ {lang === 'ar' ? 'ابدأ مباراتك التالية' : 'Start your next match'}
      {showTimer && remaining! > 0 && (
        <span className="rounded-full px-2 py-0.5 font-mono"
          style={{ background: 'rgba(20,16,10,0.30)', color: '#0E0905', fontSize: 10 }}>
          ⏱ {remaining}s
        </span>
      )}
    </motion.button>
  );
}

function PlayersList({ tournament, myUid, lang }: { tournament: TournamentState; myUid?: string; lang: string }) {
  return (
    <div>
      <h3 className="font-arabic font-bold mb-2 px-1" style={{ fontSize: 12, color: 'rgba(201,168,76,0.85)' }}>
        {lang === 'ar' ? `اللاعبون (${tournament.players.length}/${tournament.size})` : `Players (${tournament.players.length}/${tournament.size})`}
      </h3>
      <div className="flex flex-col gap-1.5">
        <AnimatePresence>
          {tournament.players.map(p => (
            <motion.div
              key={p.uid}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 18 }}>{AVATAR_EMOJIS[p.avatarId] || '👤'}</span>
              <span className="font-arabic flex-1 truncate" style={{ fontSize: 12.5, color: '#E8C97A' }}>
                {p.uid === myUid ? (lang === 'ar' ? 'أنت' : 'You') : p.displayName}
                {p.uid === tournament.hostUid && <span style={{ marginInlineStart: 6, fontSize: 9.5, color: 'rgba(245,230,200,0.5)' }}>👑</span>}
                {p.isBot && <span style={{ marginInlineStart: 6, fontSize: 9.5, color: 'rgba(245,230,200,0.5)' }}>🤖</span>}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        {Array.from({ length: tournament.size - tournament.players.length }).map((_, i) => (
          <div key={`empty-${i}`} className="flex items-center gap-2 rounded-xl px-3 py-2 font-arabic"
            style={{ background: 'rgba(255,255,255,0.015)', border: '1px dashed rgba(255,255,255,0.08)', color: 'rgba(245,230,200,0.3)', fontSize: 12 }}>
            — {lang === 'ar' ? 'مقعد فارغ' : 'Empty seat'}
          </div>
        ))}
      </div>
    </div>
  );
}

function BracketView({ tournament, myUid, lang }: { tournament: TournamentState; myUid?: string; lang: string }) {
  const rounds = bracketRounds(tournament.size);
  const playersByUid = Object.fromEntries(tournament.players.map(p => [p.uid, p]));
  const liveCount = tournament.bracket.filter(m => m.status === 'in_progress').length;
  return (
    <div className="flex flex-col gap-4">
      {liveCount > 0 && (
        <div className="rounded-xl px-3 py-2 font-arabic flex items-center gap-2"
          style={{ background: 'rgba(232,201,122,0.10)', border: '1px solid rgba(232,201,122,0.30)', fontSize: 11.5, color: '#E8C97A' }}>
          <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.4, repeat: Infinity }}>🔴</motion.span>
          {lang === 'ar' ? `${liveCount} ${liveCount === 1 ? 'مباراة قيد اللعب الآن' : 'مباريات قيد اللعب الآن'}` : `${liveCount} match${liveCount === 1 ? '' : 'es'} live now`}
        </div>
      )}
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
        <div className="px-3 py-1 font-arabic text-center flex items-center justify-center gap-1"
          style={{ background: 'rgba(232,201,122,0.10)', fontSize: 9.5, color: '#E8C97A', letterSpacing: 0.5 }}>
          <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>🔴</motion.span>
          {lang === 'ar' ? 'قيد اللعب' : 'Live'}
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

// ── Finished card with confetti for the champion ────────────────────────────
function FinishedCard({ finished, lang, onClear }: { finished: any; lang: string; onClear: () => void }) {
  const isChampion = finished.isHostChampion;
  const rank = finished.myRank;
  useEffect(() => {
    if (isChampion) soundService.playWin();
    else if (rank && rank <= 3) soundService.playClick();
  }, [isChampion, rank]);

  return (
    <div className="relative rounded-2xl p-6 text-center overflow-hidden"
      style={{
        background: isChampion
          ? 'linear-gradient(135deg, rgba(232,201,122,0.18) 0%, rgba(168,124,58,0.10) 100%)'
          : 'rgba(255,255,255,0.025)',
        border: `1px solid ${isChampion ? 'rgba(232,201,122,0.55)' : 'rgba(201,168,76,0.20)'}`,
        boxShadow: isChampion ? '0 0 36px rgba(232,201,122,0.30)' : 'none',
      }}>
      {isChampion && <Confetti count={80}/>}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 18 }}
        style={{ fontSize: 76, marginBottom: 8, position: 'relative', zIndex: 6 }}>
        {isChampion ? '🏆' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🎖️'}
      </motion.div>
      <h2 className="font-arabic font-bold mb-1" style={{ fontSize: 24, color: '#E8C97A', position: 'relative', zIndex: 6 }}>
        {isChampion ? (lang === 'ar' ? 'بطل الكأس!' : 'Champion!')
          : rank === 2 ? (lang === 'ar' ? 'وصيف البطل' : 'Runner-up')
          : rank === 3 ? (lang === 'ar' ? 'المركز الثالث' : 'Third place')
          : (lang === 'ar' ? 'انتهت البطولة' : 'Tournament over')}
      </h2>
      {finished.prizeCoins > 0 && (
        <div className="rounded-2xl px-5 py-3 mb-4 inline-block"
          style={{
            background: 'rgba(201,168,76,0.12)',
            border: '1px solid rgba(201,168,76,0.40)',
            position: 'relative', zIndex: 6,
          }}>
          <p className="font-arabic" style={{ fontSize: 11, color: 'rgba(245,230,200,0.55)' }}>
            {lang === 'ar' ? 'أُضيفت إلى رصيدك' : 'Added to your balance'}
          </p>
          <p className="font-bold font-mono" style={{ fontSize: 26, color: '#E8C97A' }}>
            🪙 +{finished.prizeCoins.toLocaleString()}
          </p>
        </div>
      )}
      <div style={{ position: 'relative', zIndex: 6 }}>
        <button onClick={onClear}
          className="rounded-xl px-5 py-2 font-arabic font-bold"
          style={{ background: 'linear-gradient(135deg, #C9A84C, #A07830)', color: '#0E0905', fontSize: 13 }}>
          {lang === 'ar' ? 'إخفاء' : 'Dismiss'}
        </button>
      </div>
    </div>
  );
}

// ── Shared ──────────────────────────────────────────────────────────────────
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

function PrizeBanner({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="rounded-xl p-3 flex items-center justify-between"
      style={{ background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.30)' }}>
      <span className="font-arabic" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.7)' }}>🏆 {label}</span>
      <span className="font-mono font-bold" style={{ fontSize: 18, color: '#E8C97A' }}>
        🪙 {amount.toLocaleString()}
      </span>
    </div>
  );
}
