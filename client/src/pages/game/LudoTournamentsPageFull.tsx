import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../../i18n/useT';
import { LangToggle } from '../../components/shared/LangToggle';
import { LudoPageBackground } from '../../components/game/ludo/BoardEmblems';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { socketService } from '../../services/socket.service';
import {
  SOCKET_EVENTS, TournamentSummary, TournamentState, TournamentSize,
  GameType, tournamentPrize, ENTRY_FEE_TIERS,
} from '@check-game/shared';
import { soundService } from '../../services/sound.service';
import { CharacterArt } from '../../components/shared/CharacterArt';

const SAND = {
  bg1: '#0E0905',
  panel: '#14100A',
  gold: '#D9A441',
  goldLight: '#F6E6BE',
  goldDark: '#7A6303',
  cream: '#F4E4BE',
};

type Tab = 'browse' | 'create' | 'mine';

/**
 * Functional Ludo tournaments page. Mirrors the Check tournaments flow
 * (browse public cups, create solo or online, join, view bracket) but
 * scoped to gameType:'ludo' so matches run on LudoEngine.
 */
export function LudoTournamentsPageFull() {
  const lang = useLang();
  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { addToast } = useUiStore();

  const [tab, setTab] = useState<Tab>('browse');
  const [summaries, setSummaries] = useState<TournamentSummary[]>([]);
  const [myState, setMyState] = useState<TournamentState | null>(null);

  // Socket subscriptions
  useEffect(() => {
    const sock = socketService.connect();

    const onList = (list: TournamentSummary[]) => setSummaries(list || []);
    const onState = (state: TournamentState) => {
      // Only adopt Ludo states — Check tournaments share the same event
      if (state?.gameType === 'ludo') setMyState(state);
    };
    const onFinished = () => setMyState(null);
    const onError = (data: { message?: string }) =>
      addToast(data?.message || (isAr ? 'حدث خطأ' : 'Error'), 'error');
    const onMatch = (data: { gameId: string; gameType?: GameType }) => {
      if (data.gameType === 'ludo') {
        navigate(`/game/ludo/${data.gameId}`);
      }
    };

    sock.on(SOCKET_EVENTS.LUDO_TOURNAMENT_LIST, onList);
    sock.on(SOCKET_EVENTS.TOURNAMENT_STATE, onState);
    sock.on(SOCKET_EVENTS.TOURNAMENT_FINISHED, onFinished);
    sock.on(SOCKET_EVENTS.TOURNAMENT_ERROR, onError);
    sock.on(SOCKET_EVENTS.TOURNAMENT_MATCH_START, onMatch);
    // Ask the server to push the latest list immediately
    sock.emit(SOCKET_EVENTS.TOURNAMENT_LIST_REQUEST);
    sock.emit(SOCKET_EVENTS.TOURNAMENT_SUBSCRIBE);

    return () => {
      sock.off(SOCKET_EVENTS.LUDO_TOURNAMENT_LIST, onList);
      sock.off(SOCKET_EVENTS.TOURNAMENT_STATE, onState);
      sock.off(SOCKET_EVENTS.TOURNAMENT_FINISHED, onFinished);
      sock.off(SOCKET_EVENTS.TOURNAMENT_ERROR, onError);
      sock.off(SOCKET_EVENTS.TOURNAMENT_MATCH_START, onMatch);
    };
  }, [addToast, isAr, navigate]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const startSolo = (size: TournamentSize) => {
    soundService.playClick();
    const sock = socketService.getSocket();
    sock?.emit(SOCKET_EVENTS.TOURNAMENT_CREATE, {
      kind: 'solo',
      visibility: 'private',
      size,
      // Bots always play at medium — no exposed difficulty selector. The
      // user explicitly asked for one consistent bot level.
      difficulty: 'medium',
      matchLength: 'quick',
      gameType: 'ludo' as GameType,
    });
    setTab('mine');
  };

  const createOnline = (entryFee: number, size: TournamentSize) => {
    soundService.playClick();
    const sock = socketService.getSocket();
    sock?.emit(SOCKET_EVENTS.TOURNAMENT_CREATE, {
      kind: 'online',
      visibility: 'public',
      size,
      difficulty: 'medium',
      matchLength: 'standard',
      entryFee,
      prizeSplit: size === 8 ? 'top3' : 'winner_takes_all',
      gameType: 'ludo' as GameType,
    });
    setTab('mine');
  };

  const createClan = (entryFee: number, size: TournamentSize) => {
    soundService.playClick();
    const sock = socketService.getSocket();
    sock?.emit(SOCKET_EVENTS.TOURNAMENT_CREATE, {
      kind: 'online',
      visibility: 'public',
      size,
      difficulty: 'medium',
      matchLength: 'standard',
      entryFee,
      prizeSplit: 'winner_takes_all', // 70/30 winner/clan-bank
      clanOnly: true,
      gameType: 'ludo' as GameType,
    });
    setTab('mine');
  };

  const join = (id: string) => {
    soundService.playClick();
    const sock = socketService.getSocket();
    sock?.emit(SOCKET_EVENTS.TOURNAMENT_JOIN, { tournamentId: id });
  };

  const leave = () => {
    if (!myState) return;
    const sock = socketService.getSocket();
    sock?.emit(SOCKET_EVENTS.TOURNAMENT_LEAVE, { tournamentId: myState.id });
    setMyState(null);
  };

  const fillBots = () => {
    if (!myState) return;
    const sock = socketService.getSocket();
    sock?.emit(SOCKET_EVENTS.TOURNAMENT_FILL_BOTS, { tournamentId: myState.id });
  };

  const startNow = () => {
    if (!myState) return;
    const sock = socketService.getSocket();
    sock?.emit(SOCKET_EVENTS.TOURNAMENT_START, { tournamentId: myState.id });
  };

  const playNextMatch = () => {
    if (!myState || myState.nextHostMatchNum == null) return;
    const sock = socketService.getSocket();
    sock?.emit(SOCKET_EVENTS.TOURNAMENT_NEXT_MATCH, { tournamentId: myState.id });
  };

  return (
    <div className="min-h-screen relative pb-12" style={{ background: SAND.bg1, direction: dir }}>
      <LudoPageBackground />

      <nav className="sticky top-0 z-30 flex items-center justify-between px-3 py-2.5"
        style={{ background: '#0E0905', borderBottom: `1.5px solid ${SAND.gold}55`, boxShadow: '0 4px 18px rgba(0,0,0,0.5)' }}>
        <button onClick={() => navigate('/ludo')}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/5 transition">
          <span style={{ fontSize: 18, color: SAND.gold }}>{isAr ? '→' : '←'}</span>
          <span className="font-arabic" style={{ fontSize: 12, color: SAND.cream }}>{isAr ? 'لودو' : 'Ludo'}</span>
        </button>
        <span className="font-display tracking-widest flex items-center gap-1.5"
          style={{ fontSize: 14, color: SAND.gold }}>
          <span style={{ fontSize: 16 }}>🎯</span>
          {isAr ? 'بطولات لودو' : 'LUDO TOURNAMENTS'}
        </span>
        <LangToggle />
      </nav>

      <main className="relative z-10 max-w-2xl mx-auto px-3 pt-4">
        {/* Tabs */}
        <div className="flex gap-1.5 mb-4">
          <TabBtn label={isAr ? '🌍 عامة' : '🌍 Public'}     active={tab === 'browse'} onClick={() => setTab('browse')} />
          <TabBtn label={isAr ? '⚡ بطولتي' : '⚡ Mine'}       active={tab === 'mine'}   onClick={() => setTab('mine')} hasDot={!!myState} />
          <TabBtn label={isAr ? '➕ إنشاء' : '➕ Create'}    active={tab === 'create'} onClick={() => setTab('create')} />
        </div>

        <AnimatePresence mode="wait">
          {tab === 'browse' && (
            <motion.div key="browse" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <BrowseTab list={summaries} myState={myState} isAr={isAr} onJoin={join} />
            </motion.div>
          )}
          {tab === 'create' && (
            <motion.div key="create" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <CreateTab isAr={isAr} myCoins={(profile as any)?.ludoCoins ?? 0}
                ludoClanId={(profile as any)?.ludoClanId ?? null}
                ludoClanTag={(profile as any)?.ludoClanTag ?? null}
                hasActive={!!myState}
                onSolo={startSolo} onOnline={createOnline} onClan={createClan} />
            </motion.div>
          )}
          {tab === 'mine' && (
            <motion.div key="mine" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <MineTab state={myState} myUid={profile?.uid} isAr={isAr}
                onStart={startNow} onFillBots={fillBots} onLeave={leave} onPlay={playNextMatch} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ─── Tab button ─────────────────────────────────────────────────────────────
function TabBtn({ label, active, onClick, hasDot }: { label: string; active: boolean; onClick: () => void; hasDot?: boolean }) {
  return (
    <button onClick={onClick}
      className="relative flex-1 rounded-xl py-2.5 font-arabic font-bold"
      style={{
        background: active ? `linear-gradient(135deg, ${SAND.goldLight}, ${SAND.gold})` : SAND.panel,
        border: `1.5px solid ${active ? SAND.gold : `${SAND.gold}33`}`,
        color: active ? '#0E0905' : 'rgba(245,230,200,0.55)',
        boxShadow: active ? `0 0 16px ${SAND.gold}55` : 'none',
        fontSize: 13, cursor: 'pointer',
      }}>
      {label}
      {hasDot && <span className="absolute -top-1 -right-1 rounded-full" style={{ width: 8, height: 8, background: '#7AC74F', boxShadow: '0 0 6px #7AC74F' }} />}
    </button>
  );
}

// ─── Browse ─────────────────────────────────────────────────────────────────
function BrowseTab({ list, myState, isAr, onJoin }: {
  list: TournamentSummary[]; myState: TournamentState | null; isAr: boolean;
  onJoin: (id: string) => void;
}) {
  if (list.length === 0) {
    return (
      <div className="rounded-2xl p-7 text-center"
        style={{ background: SAND.panel, border: `1.5px dashed ${SAND.gold}55` }}>
        <span style={{ fontSize: 40 }}>🏜️</span>
        <p className="font-arabic font-bold mt-2" style={{ fontSize: 14, color: SAND.cream }}>
          {isAr ? 'ما فيه بطولات لودو نشطة الحين' : 'No active Ludo tournaments yet'}
        </p>
        <p className="font-arabic mt-1" style={{ fontSize: 11, color: 'rgba(245,230,200,0.45)' }}>
          {isAr ? 'افتح تبويب "إنشاء" لتبدأ كأس' : 'Open the "Create" tab to start a cup'}
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {list.map(t => {
        const inThisOne = myState?.id === t.id;
        const full = t.players >= t.size;
        return (
          <div key={t.id} className="rounded-xl px-3 py-2.5 flex items-center gap-3"
            style={{ background: SAND.panel, border: `1.5px solid ${SAND.gold}33` }}>
            <span style={{ fontSize: 28 }}>🎯</span>
            <div className="flex-1 min-w-0">
              <p className="font-arabic font-bold truncate" style={{ fontSize: 13, color: SAND.cream }}>
                {t.name}
              </p>
              <div className="flex items-center gap-2 mt-0.5" style={{ fontSize: 10 }}>
                <span className="font-mono" style={{ color: 'rgba(245,230,200,0.55)' }}>👥 {t.players}/{t.size}</span>
                <span className="font-mono" style={{ color: SAND.gold }}>🪙 {t.entryFee} → {t.prizePool}</span>
                {t.status === 'in_progress' && (
                  <span className="font-arabic" style={{ color: '#7AC74F' }}>· {isAr ? 'يلعب' : 'live'}</span>
                )}
              </div>
            </div>
            {inThisOne ? (
              <span className="font-arabic rounded-md px-2 py-1" style={{ background: `${SAND.gold}22`, color: SAND.gold, fontSize: 10 }}>
                {isAr ? 'بطولتك' : 'Yours'}
              </span>
            ) : full || t.status === 'in_progress' ? (
              <span className="font-arabic rounded-md px-2 py-1" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(245,230,200,0.55)', fontSize: 10 }}>
                {isAr ? 'مغلقة' : 'Closed'}
              </span>
            ) : (
              <button onClick={() => onJoin(t.id)}
                className="rounded-lg px-3 py-1.5 font-arabic font-bold"
                style={{
                  background: `linear-gradient(135deg, ${SAND.goldLight}, ${SAND.gold})`,
                  color: '#0E0905', fontSize: 11, cursor: 'pointer',
                }}>
                {isAr ? 'انضم' : 'Join'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Create ─────────────────────────────────────────────────────────────────
function CreateTab({ isAr, myCoins, ludoClanId, ludoClanTag, hasActive, onSolo, onOnline, onClan }: {
  isAr: boolean; myCoins: number;
  ludoClanId: string | null; ludoClanTag: string | null;
  hasActive: boolean;
  onSolo: (size: TournamentSize) => void;
  onOnline: (fee: number, size: TournamentSize) => void;
  onClan: (fee: number, size: TournamentSize) => void;
}) {
  const [soloSize, setSoloSize] = useState<TournamentSize>(4);
  const [onlineSize, setOnlineSize] = useState<TournamentSize>(4);
  const [onlineFee, setOnlineFee] = useState<number>(50);
  const [clanSize, setClanSize] = useState<TournamentSize>(4);
  const [clanFee, setClanFee] = useState<number>(100);

  if (hasActive) {
    return (
      <div className="rounded-2xl p-5 text-center"
        style={{ background: SAND.panel, border: `1.5px dashed ${SAND.gold}55` }}>
        <span style={{ fontSize: 40 }}>⚡</span>
        <p className="font-arabic font-bold mt-2" style={{ fontSize: 14, color: SAND.cream }}>
          {isAr ? 'عندك بطولة نشطة' : 'You already have an active tournament'}
        </p>
        <p className="font-arabic mt-1" style={{ fontSize: 11, color: 'rgba(245,230,200,0.5)' }}>
          {isAr ? 'افتح تبويب "بطولتي" لمواصلتها' : 'Switch to the "Mine" tab to continue'}
        </p>
      </div>
    );
  }

  // Solo cups use a fixed prize (no difficulty multiplier — bots always
  // play medium). Pass 'medium' to tournamentPrize for the same value.
  const soloPrize = tournamentPrize(soloSize, 'medium');

  return (
    <div className="space-y-3">
      {/* ── Solo cup vs bots ── */}
      <div className="rounded-2xl p-4"
        style={{ background: SAND.panel, border: `2px solid ${SAND.gold}77` }}>
        <p className="font-arabic font-bold mb-1" style={{ fontSize: 14, color: SAND.gold }}>
          🏆 {isAr ? 'كأس الفارس (ضد البوتات)' : 'Solo Cup vs Bots'}
        </p>
        <p className="font-arabic mb-3" style={{ fontSize: 11, color: 'rgba(245,230,200,0.55)' }}>
          {isAr ? 'ابدأ شجرة كاملة فوراً — الجائزة من السيرفر' : 'Full bracket starts instantly — prize paid by the server'}
        </p>

        <PickerLabel label={isAr ? 'الحجم' : 'Size'}>
          <div className="grid grid-cols-2 gap-1">
            {([4, 8] as TournamentSize[]).map(s => (
              <Pick key={s} sel={soloSize === s} onClick={() => setSoloSize(s)}>{s}</Pick>
            ))}
          </div>
        </PickerLabel>

        <div className="flex items-center justify-between rounded-xl px-3 py-2 mb-3"
          style={{ background: '#0E0905', border: `1px solid ${SAND.gold}55` }}>
          <span className="font-arabic" style={{ fontSize: 11, color: 'rgba(245,230,200,0.55)' }}>
            {isAr ? 'جائزة الكأس' : 'Cup prize'}
          </span>
          <span className="font-mono font-bold" style={{ fontSize: 14, color: SAND.gold }}>
            🪙 {soloPrize.toLocaleString()}
          </span>
        </div>

        <button onClick={() => onSolo(soloSize)}
          className="w-full rounded-xl py-3 font-arabic font-bold"
          style={{
            background: `linear-gradient(135deg, ${SAND.goldLight}, ${SAND.gold}, ${SAND.goldDark})`,
            color: '#0E0905', fontSize: 14,
            boxShadow: `0 0 20px ${SAND.gold}55`,
            cursor: 'pointer',
          }}>
          ▶ {isAr ? 'ابدأ الكأس' : 'Start cup'}
        </button>
      </div>

      {/* ── Online cup ── */}
      <div className="rounded-2xl p-4"
        style={{ background: SAND.panel, border: `1.5px solid ${SAND.gold}55` }}>
        <p className="font-arabic font-bold mb-1" style={{ fontSize: 14, color: SAND.cream }}>
          🌐 {isAr ? 'بطولة أونلاين' : 'Online Tournament'}
        </p>
        <p className="font-arabic mb-3" style={{ fontSize: 11, color: 'rgba(245,230,200,0.55)' }}>
          {isAr ? 'بطولة عامة. كل لاعب يدفع الرسوم وتجتمع الجوائز.'
                : 'A public bracket. Each player pays the entry fee — pot is split by the prize rule.'}
        </p>

        <PickerLabel label={isAr ? 'الحجم' : 'Size'}>
          <div className="grid grid-cols-2 gap-1">
            {([4, 8] as TournamentSize[]).map(s => (
              <Pick key={s} sel={onlineSize === s} onClick={() => setOnlineSize(s)}>{s}</Pick>
            ))}
          </div>
        </PickerLabel>

        <PickerLabel label={isAr ? '🪙 الكوينز للدخول' : '🪙 Entry coins'}>
          <div className="grid grid-cols-4 gap-1">
            {ENTRY_FEE_TIERS.slice(0, 6).map(v => (
              <Pick key={v} sel={onlineFee === v} onClick={() => setOnlineFee(v)}>
                <span style={{ fontSize: 10 }}>🪙 {v}</span>
              </Pick>
            ))}
          </div>
        </PickerLabel>

        <BalanceLine isAr={isAr} myCoins={myCoins} required={onlineFee} />

        <button onClick={() => onOnline(onlineFee, onlineSize)} disabled={myCoins < onlineFee}
          className="w-full rounded-xl py-3 font-arabic font-bold disabled:opacity-50"
          style={{
            background: myCoins >= onlineFee
              ? `linear-gradient(135deg, ${SAND.goldLight}, ${SAND.gold})`
              : 'rgba(255,255,255,0.04)',
            color: myCoins >= onlineFee ? '#0E0905' : 'rgba(255,255,255,0.4)',
            fontSize: 14,
            cursor: myCoins >= onlineFee ? 'pointer' : 'not-allowed',
          }}>
          {isAr ? '🌐 أنشئ بطولة أونلاين' : '🌐 Create Online Tournament'}
        </button>
      </div>

      {/* ── Clan cup ── */}
      <div className="rounded-2xl p-4 relative"
        style={{
          background: SAND.panel,
          border: `2px solid ${ludoClanId ? '#9DD8E8' : `${SAND.goldDark}88`}`,
        }}>
        <p className="font-arabic font-bold mb-1" style={{ fontSize: 14, color: ludoClanId ? '#9DD8E8' : SAND.cream }}>
          🛡️ {isAr ? 'بطولة قبائل لودو' : 'Ludo Clan Cup'}
        </p>
        <p className="font-arabic mb-3" style={{ fontSize: 11, color: 'rgba(245,230,200,0.55)' }}>
          {isAr
            ? 'بطولة مخصصة لأعضاء قبيلتك في لودو فقط. ٧٠٪ للفائز و ٣٠٪ لبنك القبيلة.'
            : 'Open only to your Ludo clan. 70% to the champion, 30% to the clan bank.'}
        </p>

        {!ludoClanId ? (
          <div className="rounded-xl px-3 py-3 text-center font-arabic"
            style={{ background: `${SAND.goldDark}33`, border: `1px dashed ${SAND.gold}55`, color: 'rgba(245,230,200,0.6)', fontSize: 12 }}>
            {isAr ? 'لازم تكون في قبيلة لودو لتنشئ بطولة قبائل' : 'You must be in a Ludo clan to host a clan cup'}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3 rounded-xl px-3 py-2"
              style={{ background: '#0E0905', border: `1px solid ${SAND.gold}55` }}>
              <span style={{ fontSize: 16 }}>🛡️</span>
              <span className="font-arabic" style={{ fontSize: 11, color: 'rgba(245,230,200,0.55)' }}>
                {isAr ? 'قبيلتك' : 'Your clan'}
              </span>
              <span className="font-mono font-bold flex-1 text-end" style={{ fontSize: 12, color: '#9DD8E8' }}>
                [{ludoClanTag || '—'}]
              </span>
            </div>

            <PickerLabel label={isAr ? 'الحجم' : 'Size'}>
              <div className="grid grid-cols-2 gap-1">
                {([4, 8] as TournamentSize[]).map(s => (
                  <Pick key={s} sel={clanSize === s} onClick={() => setClanSize(s)}>{s}</Pick>
                ))}
              </div>
            </PickerLabel>

            <PickerLabel label={isAr ? '🪙 الكوينز للدخول' : '🪙 Entry coins'}>
              <div className="grid grid-cols-4 gap-1">
                {ENTRY_FEE_TIERS.slice(0, 6).map(v => (
                  <Pick key={v} sel={clanFee === v} onClick={() => setClanFee(v)}>
                    <span style={{ fontSize: 10 }}>🪙 {v}</span>
                  </Pick>
                ))}
              </div>
            </PickerLabel>

            <BalanceLine isAr={isAr} myCoins={myCoins} required={clanFee} />

            <button onClick={() => onClan(clanFee, clanSize)} disabled={myCoins < clanFee}
              className="w-full rounded-xl py-3 font-arabic font-bold disabled:opacity-50"
              style={{
                background: myCoins >= clanFee
                  ? 'linear-gradient(135deg, #9DD8E8 0%, #4A90D9 100%)'
                  : 'rgba(255,255,255,0.04)',
                color: myCoins >= clanFee ? '#0E0905' : 'rgba(255,255,255,0.4)',
                fontSize: 14,
                boxShadow: myCoins >= clanFee ? '0 0 18px rgba(157,216,232,0.55)' : 'none',
                cursor: myCoins >= clanFee ? 'pointer' : 'not-allowed',
              }}>
              {isAr ? '🛡️ أنشئ بطولة قبائل' : '🛡️ Create Clan Cup'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function BalanceLine({ isAr, myCoins, required }: { isAr: boolean; myCoins: number; required: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl px-3 py-2 mb-3"
      style={{ background: '#0E0905', border: `1px solid ${SAND.gold}55` }}>
      <span className="font-arabic" style={{ fontSize: 11, color: 'rgba(245,230,200,0.55)' }}>
        {isAr ? 'رصيدك' : 'Your balance'}
      </span>
      <span className="font-mono font-bold" style={{ fontSize: 13, color: myCoins >= required ? SAND.gold : '#FF8A65' }}>
        🪙 {myCoins.toLocaleString()}
      </span>
    </div>
  );
}

function PickerLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <p className="font-arabic mb-1" style={{ fontSize: 10, color: 'rgba(245,230,200,0.5)' }}>{label}</p>
      {children}
    </div>
  );
}
function Pick({ sel, onClick, children }: { sel: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="rounded-lg py-1.5 font-arabic font-bold"
      style={{
        background: sel ? `${SAND.gold}33` : 'rgba(255,255,255,0.025)',
        border: `1.5px solid ${sel ? SAND.gold : 'rgba(255,255,255,0.08)'}`,
        color: sel ? SAND.gold : 'rgba(245,230,200,0.55)',
        fontSize: 12, cursor: 'pointer',
      }}>{children}</button>
  );
}

// ─── My tournament tab ───────────────────────────────────────────────────────
function MineTab({ state, myUid, isAr, onStart, onFillBots, onLeave, onPlay }: {
  state: TournamentState | null; myUid?: string; isAr: boolean;
  onStart: () => void; onFillBots: () => void; onLeave: () => void; onPlay: () => void;
}) {
  if (!state) {
    return (
      <div className="rounded-2xl p-7 text-center"
        style={{ background: SAND.panel, border: `1.5px dashed ${SAND.gold}55` }}>
        <span style={{ fontSize: 40 }}>⚡</span>
        <p className="font-arabic mt-2" style={{ fontSize: 13, color: 'rgba(245,230,200,0.55)' }}>
          {isAr ? 'لا توجد بطولة نشطة لك' : 'No active tournament'}
        </p>
      </div>
    );
  }

  const isHost = state.hostUid === myUid;
  const meIn = state.players.some(p => p.uid === myUid);

  return (
    <div>
      <div className="rounded-2xl p-4 mb-3"
        style={{
          background: `linear-gradient(135deg, ${SAND.gold}24, ${SAND.panel})`,
          border: `2px solid ${SAND.gold}77`,
          boxShadow: `0 0 22px ${SAND.gold}33`,
        }}>
        <p className="font-arabic font-bold" style={{ fontSize: 16, color: SAND.cream }}>{state.name}</p>
        <div className="flex items-center gap-2 mt-1" style={{ fontSize: 11 }}>
          <span className="font-mono" style={{ color: SAND.gold }}>{state.size} {isAr ? 'لاعب' : 'players'}</span>
          <span className="font-mono" style={{ color: 'rgba(245,230,200,0.55)' }}>·</span>
          <span className="font-arabic" style={{ color: SAND.gold }}>
            🪙 {state.prizePool.toLocaleString()} {isAr ? 'كوينز' : 'coins'}
          </span>
          <span className="font-mono" style={{ color: 'rgba(245,230,200,0.55)' }}>·</span>
          <span className="font-arabic" style={{ color: state.status === 'in_progress' ? '#7AC74F' : SAND.gold }}>
            {state.status === 'waiting' ? (isAr ? 'في الانتظار' : 'waiting')
             : state.status === 'in_progress' ? (isAr ? 'يلعب' : 'live')
             : (isAr ? 'انتهت' : 'finished')}
          </span>
        </div>
      </div>

      {/* Players strip */}
      <p className="font-arabic mb-2" style={{ fontSize: 11, color: SAND.gold, letterSpacing: 2, paddingInlineStart: 6 }}>
        {isAr ? '✦ المتسابقون' : '✦ ENTRANTS'}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {Array.from({ length: state.size }).map((_, i) => {
          const p = state.players[i];
          if (!p) {
            return (
              <div key={i} className="rounded-xl p-2 text-center"
                style={{ background: SAND.panel, border: `1px dashed ${SAND.gold}33`, opacity: 0.6 }}>
                <span style={{ fontSize: 22 }}>—</span>
                <p className="font-arabic" style={{ fontSize: 10, color: 'rgba(245,230,200,0.4)' }}>
                  {isAr ? 'مقعد فارغ' : 'open seat'}
                </p>
              </div>
            );
          }
          const isMe = p.uid === myUid;
          return (
            <div key={p.uid} className="rounded-xl p-2 text-center"
              style={{
                background: isMe ? `linear-gradient(135deg, ${SAND.gold}28, ${SAND.panel})` : SAND.panel,
                border: `1.5px solid ${isMe ? SAND.gold : `${SAND.gold}33`}`,
                opacity: p.isEliminated ? 0.5 : 1,
              }}>
              <CharacterArt id={p.avatarId} size={36} />
              <p className="font-arabic font-bold truncate mt-1" style={{ fontSize: 11, color: SAND.cream }}>
                {isMe ? (isAr ? 'أنت' : 'You') : p.displayName}
              </p>
              <p className="font-arabic" style={{ fontSize: 9, color: p.isBot ? 'rgba(245,230,200,0.4)' : SAND.gold }}>
                {p.isBot ? (isAr ? 'بوت' : 'bot') : (isAr ? 'لاعب' : 'player')}
              </p>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        {state.status === 'waiting' && isHost && state.kind === 'online' && (
          <>
            <button onClick={onFillBots}
              className="rounded-xl py-2.5 font-arabic font-bold"
              style={{ background: `${SAND.gold}33`, border: `1.5px solid ${SAND.gold}88`, color: SAND.cream, fontSize: 12, cursor: 'pointer' }}>
              🤖 {isAr ? 'املأ بوتات' : 'Fill bots'}
            </button>
            <button onClick={onStart}
              className="rounded-xl py-2.5 font-arabic font-bold"
              style={{ background: `linear-gradient(135deg, ${SAND.goldLight}, ${SAND.gold})`, color: '#0E0905', fontSize: 12, boxShadow: `0 0 14px ${SAND.gold}55`, cursor: 'pointer' }}>
              ▶ {isAr ? 'ابدأ الآن' : 'Start now'}
            </button>
          </>
        )}
        {state.status === 'in_progress' && state.nextHostMatchNum != null && (
          <button onClick={onPlay} className="col-span-2 rounded-xl py-3 font-arabic font-bold"
            style={{
              background: `linear-gradient(135deg, ${SAND.goldLight}, ${SAND.gold})`,
              color: '#0E0905', fontSize: 14,
              boxShadow: `0 0 20px ${SAND.gold}77`,
              animation: 'pulse 1.4s ease-in-out infinite',
              cursor: 'pointer',
            }}>
            🎯 {isAr ? 'العب مباراتك التالية' : 'Play your next match'}
          </button>
        )}
        {state.status === 'waiting' && meIn && state.kind === 'online' && (
          <button onClick={onLeave}
            className="col-span-2 rounded-xl py-2 font-arabic font-bold"
            style={{ background: 'rgba(196,92,58,0.15)', border: '1.5px solid rgba(196,92,58,0.5)', color: '#E07040', fontSize: 12, cursor: 'pointer' }}>
            {isAr ? 'مغادرة' : 'Leave'}
          </button>
        )}
      </div>
    </div>
  );
}
