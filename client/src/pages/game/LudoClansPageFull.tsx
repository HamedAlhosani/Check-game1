import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { apiClient } from '../../services/api.service';
import { soundService } from '../../services/sound.service';
import { useLang } from '../../i18n/useT';
import { LangToggle } from '../../components/shared/LangToggle';
import { CharacterArt } from '../../components/shared/CharacterArt';
import type { Clan, ClanSummary, UserProfile, ClanVisibility } from '@check-game/shared';
import { CLAN_EMBLEMS, CLAN_CREATE_COST } from '@check-game/shared';
import { LudoPageBackground } from '../../components/game/ludo/BoardEmblems';

const SAND = {
  bg1: '#0E0905',
  gold: '#D9A441',
  goldLight: '#F6E6BE',
  goldDark: '#7A6303',
  cream: '#F4E4BE',
  panel: '#14100A',
};

type Tab = 'browse' | 'mine' | 'create';

/**
 * Ludo-themed Clans page. Mirrors the Check ClansPage feature set (browse,
 * my clan, create, apply, invites) but in sand/gold chrome and with a
 * lighter advanced-admin surface — for kick/role management we link out to
 * /clans for now. Data is currently shared with Check; full Ludo-only
 * scope is a follow-up server change.
 */
export function LudoClansPageFull() {
  const lang = useLang();
  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const [tab, setTab] = useState<Tab>('browse');
  const [list, setList] = useState<ClanSummary[]>([]);
  const [myClan, setMyClan] = useState<Clan | null>(null);
  const [invites, setInvites] = useState<ClanSummary[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh(showLoading = false) {
    if (showLoading) setLoading(true);
    try {
      const [l, mine] = await Promise.all([
        apiClient.get<ClanSummary[]>('/api/clans'),
        apiClient.get<{ clan: Clan | null; invites: ClanSummary[] }>('/api/clans/me'),
      ]);
      setList(l);
      setMyClan(mine.clan);
      setInvites(mine.invites || []);
    } catch {} finally { if (showLoading) setLoading(false); }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refresh(true);
      if (!cancelled && (window as any).__lc_my) setTab('mine');
    })();
    const id = setInterval(() => { if (!cancelled) refresh(false); }, 2000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

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
          <span style={{ fontSize: 16 }}>🛡️</span>
          {isAr ? 'قبائل لودو' : 'LUDO CLANS'}
        </span>
        <LangToggle />
      </nav>

      <main className="relative z-10 max-w-2xl mx-auto px-3 pt-4">
        {/* Invites banner */}
        {invites.length > 0 && !myClan && (
          <InvitesBanner invites={invites} isAr={isAr} onChange={() => refresh()} />
        )}

        <div className="flex gap-1.5 mb-4">
          <TabBtn label={isAr ? '🌐 تصفّح' : '🌐 Browse'}    active={tab === 'browse'} onClick={() => setTab('browse')} />
          <TabBtn label={isAr ? '🏰 قبيلتي' : '🏰 Mine'}     active={tab === 'mine'}   onClick={() => setTab('mine')} hasDot={!!myClan} />
          <TabBtn label={isAr ? '➕ أنشئ' : '➕ Create'}    active={tab === 'create'} onClick={() => setTab('create')} disabled={!!myClan} />
        </div>

        {loading ? (
          <p className="text-center font-arabic py-8 animate-pulse" style={{ color: SAND.gold, fontSize: 12 }}>…</p>
        ) : (
          <>
            {tab === 'browse' && (
              <BrowseTab list={list} myClanId={myClan?.id} isAr={isAr} onRefresh={() => refresh()} />
            )}
            {tab === 'mine' && (
              <MineTab clan={myClan} myUid={profile?.uid} isAr={isAr}
                onLeft={async () => { await refresh(); setTab('browse'); }} />
            )}
            {tab === 'create' && !myClan && (
              <CreateTab isAr={isAr} myCoins={profile?.coins ?? 0} onCreated={async () => { await refresh(); setTab('mine'); }} />
            )}
            {tab === 'create' && myClan && (
              <p className="text-center font-arabic py-8" style={{ color: 'rgba(245,230,200,0.5)', fontSize: 13 }}>
                {isAr ? 'لا تقدر تنشئ قبيلة وأنت في وحدة' : "You're already in a clan"}
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
function TabBtn({ label, active, onClick, hasDot, disabled }: { label: string; active: boolean; onClick: () => void; hasDot?: boolean; disabled?: boolean }) {
  return (
    <button onClick={() => !disabled && onClick()} disabled={disabled}
      className="relative flex-1 rounded-xl py-2.5 font-arabic font-bold disabled:opacity-40"
      style={{
        background: active ? `linear-gradient(135deg, ${SAND.goldLight}, ${SAND.gold})` : SAND.panel,
        border: `1.5px solid ${active ? SAND.gold : `${SAND.gold}33`}`,
        color: active ? '#0E0905' : 'rgba(245,230,200,0.55)',
        boxShadow: active ? `0 0 16px ${SAND.gold}55` : 'none',
        fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer',
      }}>
      {label}
      {hasDot && <span className="absolute -top-1 -right-1 rounded-full" style={{ width: 8, height: 8, background: '#7AC74F', boxShadow: '0 0 6px #7AC74F' }} />}
    </button>
  );
}

function InvitesBanner({ invites, isAr, onChange }: { invites: ClanSummary[]; isAr: boolean; onChange: () => void }) {
  const { setProfile } = useAuthStore();
  const { addToast } = useUiStore();
  async function accept(c: ClanSummary) {
    soundService.playClick();
    try {
      const res = await apiClient.post<{ profile: UserProfile }>(`/api/clans/${c.id}/invite/accept`, {});
      if (res?.profile) setProfile(res.profile);
      addToast(`✓ ${c.name}`, 'success');
      onChange();
    } catch (e: any) { addToast(e?.message || 'Failed', 'error'); }
  }
  async function decline(c: ClanSummary) {
    try { await apiClient.post(`/api/clans/${c.id}/invite/decline`, {}); } catch {}
    onChange();
  }
  return (
    <div className="rounded-2xl p-3 mb-4"
      style={{
        background: `linear-gradient(135deg, ${SAND.gold}22, #14100A)`,
        border: `1.5px solid ${SAND.gold}88`,
      }}>
      <p className="font-arabic mb-2" style={{ fontSize: 12, color: SAND.gold }}>
        💌 {isAr ? `لديك ${invites.length} دعوة` : `${invites.length} invite${invites.length === 1 ? '' : 's'}`}
      </p>
      <div className="flex flex-col gap-1.5">
        {invites.map(c => (
          <div key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5"
            style={{ background: '#0E0905', border: `1px solid ${SAND.gold}33` }}>
            <span style={{ fontSize: 22 }}>{c.emblem}</span>
            <span className="flex-1 font-arabic truncate" style={{ fontSize: 12, color: SAND.cream }}>
              {c.name} <span className="font-mono" style={{ fontSize: 10, color: SAND.gold }}>[{c.tag}]</span>
            </span>
            <button onClick={() => accept(c)}
              className="rounded-lg px-2.5 py-1 font-arabic font-bold"
              style={{ background: '#7AC74F', color: '#0E0905', fontSize: 10, cursor: 'pointer' }}>
              {isAr ? 'قبول' : 'Accept'}
            </button>
            <button onClick={() => decline(c)}
              className="rounded-lg px-2 py-1 font-arabic"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(245,230,200,0.55)', fontSize: 10, cursor: 'pointer' }}>
              {isAr ? 'رفض' : 'Decline'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Browse ─────────────────────────────────────────────────────────────────
function BrowseTab({ list, myClanId, isAr, onRefresh }: {
  list: ClanSummary[]; myClanId?: string; isAr: boolean; onRefresh: () => void;
}) {
  const { addToast } = useUiStore();
  const [search, setSearch] = useState('');

  async function apply(c: ClanSummary) {
    soundService.playClick();
    try {
      const res = await apiClient.post<{ autoAccepted: boolean }>(`/api/clans/${c.id}/apply`, {});
      addToast(res.autoAccepted ? (isAr ? '✓ انضممت!' : '✓ Joined!') : (isAr ? '📨 الطلب أُرسل' : '📨 Sent'), 'success');
      onRefresh();
    } catch (e: any) {
      soundService.playError();
      addToast(e?.message || 'Failed', 'error');
    }
  }

  const filtered = list.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.tag.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={isAr ? 'ابحث بالاسم أو التاق…' : 'Search by name or tag…'}
        className="w-full rounded-xl px-3 py-2.5 mb-3 outline-none"
        style={{
          background: '#0E0905',
          border: `1.5px solid ${SAND.gold}55`,
          color: SAND.cream,
          fontSize: 16, // 16px keeps iOS Safari from auto-zooming on focus
        }} />

      {filtered.length === 0 ? (
        <p className="text-center font-arabic py-12" style={{ color: 'rgba(245,230,200,0.4)', fontSize: 13 }}>
          {isAr ? 'لا توجد قبائل بهذا البحث' : 'No clans match'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => {
            const isMine = c.id === myClanId;
            const full = c.memberCount >= c.memberLimit;
            return (
              <div key={c.id} className="rounded-xl p-3 flex items-center gap-3"
                style={{
                  background: isMine ? `linear-gradient(135deg, ${SAND.gold}22, #14100A)` : SAND.panel,
                  border: `1.5px solid ${isMine ? SAND.gold : `${SAND.gold}22`}`,
                }}>
                <span style={{ fontSize: 32, lineHeight: 1 }}>{c.emblem}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-arabic font-bold truncate" style={{ color: SAND.cream, fontSize: 14 }}>{c.name}</p>
                    <span className="font-mono" style={{ color: SAND.gold, fontSize: 10 }}>[{c.tag}]</span>
                    {c.visibility === 'private' && <span style={{ fontSize: 11 }}>🔒</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5" style={{ fontSize: 10 }}>
                    <span className="font-mono" style={{ color: 'rgba(245,230,200,0.55)' }}>👥 {c.memberCount}/{c.memberLimit}</span>
                    <span className="font-mono" style={{ color: 'rgba(245,230,200,0.55)' }}>🏆 {c.totalWins ?? 0}</span>
                  </div>
                </div>
                {isMine ? (
                  <span className="font-arabic rounded-md px-2 py-1" style={{ background: `${SAND.gold}22`, color: SAND.gold, fontSize: 10 }}>
                    {isAr ? 'قبيلتك' : 'Yours'}
                  </span>
                ) : c.appliedByMe ? (
                  <span className="font-arabic rounded-md px-2 py-1" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(245,230,200,0.6)', fontSize: 10 }}>
                    {isAr ? 'مرسل' : 'Sent'}
                  </span>
                ) : full ? (
                  <span className="font-arabic rounded-md px-2 py-1" style={{ background: 'rgba(196,92,58,0.10)', color: '#E07040', fontSize: 10 }}>
                    {isAr ? 'ممتلئة' : 'Full'}
                  </span>
                ) : (
                  <button onClick={() => apply(c)}
                    className="rounded-lg px-3 py-1.5 font-arabic font-bold"
                    style={{
                      background: `linear-gradient(135deg, ${SAND.goldLight}, ${SAND.gold})`,
                      color: '#0E0905', fontSize: 11, cursor: 'pointer',
                    }}>
                    {c.visibility === 'open' ? (isAr ? 'انضم' : 'Join') : (isAr ? 'تقدّم' : 'Apply')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Mine ───────────────────────────────────────────────────────────────────
function MineTab({ clan, myUid, isAr, onLeft }: {
  clan: Clan | null; myUid?: string; isAr: boolean; onLeft: () => void | Promise<void>;
}) {
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const [confirmLeave, setConfirmLeave] = useState(false);

  if (!clan) {
    return (
      <div className="rounded-2xl p-6 text-center"
        style={{ background: SAND.panel, border: `1.5px dashed ${SAND.gold}55` }}>
        <span style={{ fontSize: 40 }}>🛡️</span>
        <p className="font-arabic font-bold mt-2" style={{ fontSize: 14, color: SAND.cream }}>
          {isAr ? 'ما أنت في قبيلة' : "You're not in a clan"}
        </p>
        <p className="font-arabic mt-1" style={{ fontSize: 11, color: 'rgba(245,230,200,0.5)' }}>
          {isAr ? 'انضم لوحدة من علامة "تصفّح" أو أنشئ قبيلتك' : 'Join one from "Browse" or create your own'}
        </p>
      </div>
    );
  }

  async function leave() {
    setConfirmLeave(false);
    soundService.playClick();
    try {
      await apiClient.post(`/api/clans/${clan!.id}/leave`, {});
      addToast(isAr ? 'غادرت القبيلة' : 'Left the clan', 'info');
      await onLeft();
    } catch (e: any) { addToast(e?.message || 'Failed', 'error'); }
  }

  const myMember = clan.members.find(m => m.uid === myUid);
  const isLeader = myMember?.role === 'leader';

  return (
    <>
      {/* Header card */}
      <div className="rounded-2xl p-5 mb-4 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${SAND.gold}24, #14100A 70%)`,
          border: `2px solid ${SAND.gold}88`,
          boxShadow: `0 8px 26px rgba(0,0,0,0.55), 0 0 30px ${SAND.gold}33`,
        }}>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 52, lineHeight: 1, filter: `drop-shadow(0 0 16px ${SAND.gold}88)` }}>{clan.emblem}</span>
          <div className="flex-1 min-w-0">
            <p className="font-arabic font-bold truncate" style={{ fontSize: 18, color: SAND.cream }}>
              {clan.name}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono" style={{ color: SAND.gold, fontSize: 12 }}>[{clan.tag}]</span>
              {clan.visibility === 'private' && <span style={{ fontSize: 12 }}>🔒</span>}
            </div>
            {clan.description && (
              <p className="font-arabic mt-1.5 line-clamp-2" style={{ fontSize: 11, color: 'rgba(245,230,200,0.6)' }}>
                {clan.description}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <Stat label={isAr ? 'أعضاء' : 'Members'} value={`${clan.members.length}/${clan.memberLimit}`} />
          <Stat label={isAr ? 'انتصارات' : 'Wins'}    value={clan.totalWins ?? 0} />
          <Stat label={isAr ? 'بنك' : 'Bank'}       value={`🪙 ${(clan.bank ?? 0).toLocaleString()}`} />
        </div>
      </div>

      {/* Members list */}
      <p className="font-arabic mb-2" style={{ fontSize: 11, color: SAND.gold, letterSpacing: 2, paddingInlineStart: 6 }}>
        {isAr ? '✦ الأعضاء' : '✦ MEMBERS'}
      </p>
      <div className="space-y-1.5">
        {clan.members.map(m => (
          <div key={m.uid} className="rounded-xl p-2.5 flex items-center gap-3"
            style={{ background: SAND.panel, border: `1px solid ${SAND.gold}22` }}>
            <CharacterArt id={m.avatarId} size={32} />
            <div className="flex-1 min-w-0">
              <p className="font-arabic font-bold truncate" style={{ color: SAND.cream, fontSize: 13 }}>
                {m.displayName}
              </p>
              <p className="font-arabic" style={{ fontSize: 10, color: 'rgba(245,230,200,0.4)' }}>
                {m.role === 'leader' ? (isAr ? '👑 القائد' : '👑 Leader')
                 : m.role === 'officer' ? (isAr ? '⚔ ضابط' : '⚔ Officer')
                 : (isAr ? 'عضو' : 'Member')}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button onClick={() => navigate('/clans')}
          className="rounded-xl py-2.5 font-arabic font-bold"
          style={{
            background: `${SAND.gold}22`,
            border: `1.5px solid ${SAND.gold}88`,
            color: SAND.cream,
            fontSize: 12, cursor: 'pointer',
          }}>
          {isAr ? '⚙ إدارة متقدمة' : '⚙ Advanced'}
        </button>
        <button onClick={() => setConfirmLeave(true)} disabled={isLeader && clan.members.length > 1}
          className="rounded-xl py-2.5 font-arabic font-bold disabled:opacity-40"
          style={{
            background: 'rgba(196,92,58,0.18)',
            border: '1.5px solid rgba(196,92,58,0.5)',
            color: '#E07040',
            fontSize: 12,
            cursor: isLeader && clan.members.length > 1 ? 'not-allowed' : 'pointer',
          }}>
          {isAr ? 'غادر القبيلة' : 'Leave Clan'}
        </button>
      </div>
      {isLeader && clan.members.length > 1 && (
        <p className="font-arabic text-center mt-2" style={{ fontSize: 10, color: 'rgba(245,230,200,0.45)' }}>
          {isAr ? 'القائد لا يقدر يغادر — انقل القيادة من الإدارة المتقدمة أولاً' : 'Leaders must transfer leadership before leaving'}
        </p>
      )}

      <AnimatePresence>
        {confirmLeave && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center px-6"
            style={{ background: 'rgba(8,4,2,0.85)', backdropFilter: 'blur(8px)' }}
            onClick={() => setConfirmLeave(false)}>
            <motion.div initial={{ scale: 0.92, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 8 }}
              className="rounded-2xl p-5 max-w-xs w-full text-center"
              style={{
                background: 'linear-gradient(180deg, #1F1810, #14100A)',
                border: '2px solid rgba(196,92,58,0.5)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.85), 0 0 28px rgba(196,92,58,0.4)',
              }}
              onClick={e => e.stopPropagation()}>
              <span style={{ fontSize: 38 }}>⚠</span>
              <h3 className="font-arabic font-bold mt-1" style={{ fontSize: 16, color: SAND.cream }}>
                {isAr ? 'مغادرة القبيلة؟' : 'Leave clan?'}
              </h3>
              <p className="font-arabic mt-2" style={{ fontSize: 12, color: 'rgba(245,230,200,0.6)' }}>
                {isAr ? 'لن تستطيع الرجوع إلا بطلب جديد' : 'You\'ll need to apply again to rejoin'}
              </p>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setConfirmLeave(false)}
                  className="flex-1 rounded-xl py-2 font-arabic font-bold"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.12)', color: 'rgba(245,230,200,0.7)', fontSize: 13, cursor: 'pointer' }}>
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button onClick={leave}
                  className="flex-1 rounded-xl py-2 font-arabic font-bold"
                  style={{ background: 'rgba(196,92,58,0.85)', color: '#fff', fontSize: 13, cursor: 'pointer', boxShadow: '0 0 14px rgba(196,92,58,0.55)' }}>
                  {isAr ? 'غادر' : 'Leave'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl py-2 text-center"
      style={{ background: '#0E0905', border: `1px solid ${SAND.gold}33` }}>
      <p className="font-mono font-bold" style={{ fontSize: 16, color: SAND.gold }}>{value}</p>
      <p className="font-arabic" style={{ fontSize: 9, color: 'rgba(245,230,200,0.4)' }}>{label}</p>
    </div>
  );
}

// ─── Create ─────────────────────────────────────────────────────────────────
function CreateTab({ isAr, myCoins, onCreated }: { isAr: boolean; myCoins: number; onCreated: () => void | Promise<void> }) {
  const { addToast } = useUiStore();
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [emblem, setEmblem] = useState(CLAN_EMBLEMS[0]);
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<ClanVisibility>('open');
  const [busy, setBusy] = useState(false);

  const canCreate = myCoins >= CLAN_CREATE_COST && name.trim().length >= 3 && tag.trim().length >= 2;

  async function create() {
    if (!canCreate || busy) return;
    setBusy(true);
    soundService.playClick();
    try {
      await apiClient.post('/api/clans', { name: name.trim(), tag: tag.trim(), emblem, description: description.trim(), visibility });
      addToast(isAr ? '🎉 تم إنشاء القبيلة' : '🎉 Clan created', 'success');
      await onCreated();
    } catch (e: any) {
      addToast(e?.message || 'Failed', 'error');
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl p-4"
      style={{ background: SAND.panel, border: `1.5px solid ${SAND.gold}55` }}>
      {/* Cost */}
      <div className="flex items-center justify-between mb-4 rounded-xl px-3 py-2"
        style={{ background: `${SAND.gold}22`, border: `1px solid ${SAND.gold}77` }}>
        <span className="font-arabic" style={{ fontSize: 12, color: SAND.cream }}>
          {isAr ? 'تكلفة الإنشاء' : 'Create cost'}
        </span>
        <span className="font-mono font-bold" style={{ fontSize: 14, color: myCoins >= CLAN_CREATE_COST ? SAND.gold : '#FF8A65' }}>
          🪙 {CLAN_CREATE_COST.toLocaleString()}
          <span style={{ marginInlineStart: 6, fontSize: 10, opacity: 0.7 }}>
            ({isAr ? 'رصيدك' : 'you'} {myCoins.toLocaleString()})
          </span>
        </span>
      </div>

      {/* Form fields */}
      <Field label={isAr ? 'اسم القبيلة' : 'Clan name'}>
        <input value={name} onChange={e => setName(e.target.value)} maxLength={24}
          placeholder={isAr ? 'مثال: فرسان النخيل' : 'e.g. Falcons of the Sand'}
          className="w-full rounded-xl px-3 py-2.5 outline-none"
          style={{ background: '#0E0905', border: `1.5px solid ${SAND.gold}55`, color: SAND.cream, fontSize: 16 }}
        />
      </Field>

      <Field label={isAr ? 'التاق (٢-٥ أحرف)' : 'Tag (2-5 chars)'}>
        <input value={tag} onChange={e => setTag(e.target.value.toUpperCase().slice(0, 5))} maxLength={5}
          placeholder="WIND"
          className="w-full rounded-xl px-3 py-2.5 outline-none font-mono font-bold"
          style={{ background: '#0E0905', border: `1.5px solid ${SAND.gold}55`, color: SAND.gold, fontSize: 16, letterSpacing: 2, direction: 'ltr' }}
        />
      </Field>

      <Field label={isAr ? 'الشعار' : 'Emblem'}>
        <div className="grid grid-cols-8 gap-1.5">
          {CLAN_EMBLEMS.map(e => {
            const sel = emblem === e;
            return (
              <button key={e} onClick={() => setEmblem(e)}
                className="rounded-lg flex items-center justify-center"
                style={{
                  aspectRatio: '1',
                  background: sel ? `${SAND.gold}33` : 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${sel ? SAND.gold : 'rgba(255,255,255,0.08)'}`,
                  fontSize: 22,
                  cursor: 'pointer',
                  boxShadow: sel ? `0 0 10px ${SAND.gold}66` : 'none',
                }}>{e}</button>
            );
          })}
        </div>
      </Field>

      <Field label={isAr ? 'وصف (اختياري)' : 'Description (optional)'}>
        <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={120} rows={2}
          placeholder={isAr ? 'في كل سباق، نقود الموكب…' : 'We lead the race…'}
          className="w-full rounded-xl px-3 py-2 outline-none resize-none"
          style={{ background: '#0E0905', border: `1.5px solid ${SAND.gold}55`, color: SAND.cream, fontSize: 14 }}
        />
      </Field>

      <Field label={isAr ? 'الانضمام' : 'Joining'}>
        <div className="grid grid-cols-2 gap-2">
          {(['open', 'private'] as ClanVisibility[]).map(v => {
            const sel = visibility === v;
            const label = v === 'open' ? (isAr ? '🌐 مفتوح' : '🌐 Open') : (isAr ? '🔒 مغلق' : '🔒 Closed');
            return (
              <button key={v} onClick={() => setVisibility(v)}
                className="rounded-xl py-2 font-arabic font-bold"
                style={{
                  background: sel ? `${SAND.gold}33` : 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${sel ? SAND.gold : 'rgba(255,255,255,0.08)'}`,
                  color: sel ? SAND.gold : 'rgba(245,230,200,0.55)',
                  fontSize: 12, cursor: 'pointer',
                }}>{label}</button>
            );
          })}
        </div>
      </Field>

      <button onClick={create} disabled={!canCreate || busy}
        className="w-full rounded-xl py-3 mt-2 font-arabic font-bold disabled:opacity-50"
        style={{
          background: canCreate && !busy
            ? `linear-gradient(135deg, ${SAND.goldLight}, ${SAND.gold}, ${SAND.goldDark})`
            : 'rgba(255,255,255,0.04)',
          color: canCreate && !busy ? '#0E0905' : 'rgba(255,255,255,0.4)',
          fontSize: 14, letterSpacing: 1,
          boxShadow: canCreate ? `0 0 20px ${SAND.gold}55` : 'none',
          cursor: canCreate && !busy ? 'pointer' : 'not-allowed',
        }}>
        {busy ? (isAr ? '…جاري' : '…') : (isAr ? '✦ أنشئ قبيلتي' : '✦ Create clan')}
      </button>
      {!canCreate && (
        <p className="text-center font-arabic mt-2" style={{ fontSize: 10, color: 'rgba(245,230,200,0.5)' }}>
          {myCoins < CLAN_CREATE_COST
            ? (isAr ? `الرصيد غير كافٍ` : 'Insufficient balance')
            : name.trim().length < 3
              ? (isAr ? 'الاسم قصير' : 'Name too short')
              : (isAr ? 'التاق قصير' : 'Tag too short')}
        </p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="font-arabic mb-1" style={{ fontSize: 11, color: 'rgba(245,230,200,0.6)' }}>{label}</p>
      {children}
    </div>
  );
}
