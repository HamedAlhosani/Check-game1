import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { apiClient } from '../../services/api.service';
import { soundService } from '../../services/sound.service';
import { useLang } from '../../i18n/useT';
import { LangToggle } from '../../components/shared/LangToggle';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { CharacterArt } from '../../components/shared/CharacterArt';
import type { Clan, ClanSummary, ClanMember, ClanRole, UserProfile, ClanVisibility } from '@check-game/shared';
import { CLAN_EMBLEMS, CLAN_CREATE_COST } from '@check-game/shared';

type Tab = 'browse' | 'mine' | 'create';

export function ClansPage() {
  const lang = useLang();
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const navigate = useNavigate();
  const { profile, setProfile } = useAuthStore();
  const { addToast } = useUiStore();
  const [tab, setTab] = useState<Tab>('browse');
  const [list, setList] = useState<ClanSummary[]>([]);
  const [myClan, setMyClan] = useState<Clan | null>(null);
  const [invites, setInvites] = useState<ClanSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Quiet refresh that doesn't flash the loading state — used by the
  // background poll. Initial load uses showLoading=true.
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
    } catch { /* noop */ }
    finally { if (showLoading) setLoading(false); }
  }

  useEffect(() => {
    // Initial load shows the spinner; subsequent ticks happen quietly so
    // the page doesn't flash every 4 seconds. This is what makes invite
    // accepts / declines / kicks / role changes feel "immediate" without
    // needing socket plumbing — the data is fresh within 4s of any action
    // by ANY member.
    let cancelled = false;
    (async () => {
      await refresh(true);
      if (!cancelled && myClan) setTab('mine');
    })();
    // 1 second poll — feels nearly instant. The refresh is a quiet GET that
    // doesn't flash the UI, so spamming it is fine for the file-backed store.
    const id = setInterval(() => { if (!cancelled) refresh(false); }, 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return (
    <div className="min-h-screen pb-16 sm:pb-0" style={{ background: 'linear-gradient(180deg, #14100A 0%, #0E0905 100%)', direction: dir }}>
      <nav className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: 'rgba(20,16,10,0.95)', backdropFilter: 'blur(12px)', borderColor: 'rgba(201,168,76,0.15)' }}>
        <button onClick={() => navigate('/home')} className="flex items-center gap-2"
          style={{ color: 'rgba(245,230,200,0.55)' }}>
          <span style={{ fontSize: 20 }}>{lang === 'ar' ? '←' : '→'}</span>
          <span className="font-arabic">{lang === 'ar' ? 'الرئيسية' : 'Home'}</span>
        </button>
        <h1 className="font-display tracking-widest" style={{ fontSize: 18, color: '#E8C97A' }}>
          🏰 {lang === 'ar' ? 'القبائل' : 'CLANS'}
        </h1>
        <LangToggle />
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {/* Invites banner — appears whenever someone invited the player */}
        {invites.length > 0 && !myClan && (
          <InvitesBanner invites={invites} lang={lang} onChange={refresh}/>
        )}

        <div className="flex gap-1.5 mb-5">
          <Tab2 label={lang === 'ar' ? '🌐 تصفّح' : '🌐 Browse'} active={tab === 'browse'} onClick={() => setTab('browse')}/>
          <Tab2 label={lang === 'ar' ? '🏰 قبيلتي' : '🏰 Mine'}    active={tab === 'mine'}   onClick={() => setTab('mine')}   badge={myClan ? '●' : undefined}/>
          <Tab2 label={lang === 'ar' ? '➕ أنشئ' : '➕ Create'}   active={tab === 'create'} onClick={() => setTab('create')} disabled={!!myClan}/>
        </div>

        {loading ? (
          <div className="text-center py-12 font-arabic" style={{ color: 'rgba(245,230,200,0.45)' }}>...</div>
        ) : (
          <>
            {tab === 'browse' && (
              <BrowseTab list={list} myClanId={myClan?.id} myCoins={profile?.coins ?? 0} lang={lang} onRefresh={refresh}/>
            )}
            {tab === 'mine' && (
              <MineTab clan={myClan} myUid={profile?.uid} lang={lang}
                onChanged={refresh} onLeft={async () => { await refresh(); setTab('browse'); }}/>
            )}
            {tab === 'create' && !myClan && (
              <CreateTab lang={lang} myCoins={profile?.coins ?? 0} onCreated={async () => { await refresh(); }}/>
            )}
            {tab === 'create' && myClan && (
              <p className="text-center font-arabic py-8" style={{ color: 'rgba(245,230,200,0.5)', fontSize: 13 }}>
                {lang === 'ar' ? 'لا تستطيع إنشاء قبيلة وأنت في واحدة' : "You're already in a clan"}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────
function Tab2({ label, active, onClick, badge, disabled }: { label: string; active: boolean; onClick: () => void; badge?: string; disabled?: boolean }) {
  return (
    <button onClick={() => !disabled && onClick()} disabled={disabled}
      className="relative flex-1 rounded-xl py-2.5 font-arabic font-bold disabled:opacity-40"
      style={{
        background: active ? 'rgba(201,168,76,0.20)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? 'rgba(201,168,76,0.55)' : 'rgba(255,255,255,0.06)'}`,
        color: active ? '#E8C97A' : 'rgba(245,230,200,0.5)',
        boxShadow: active ? '0 0 12px rgba(201,168,76,0.20)' : 'none',
        fontSize: 13,
      }}>
      {label}
      {badge && <span className="absolute -top-1 -right-1 rounded-full" style={{ width: 8, height: 8, background: '#E04030' }}/>}
    </button>
  );
}

// ─── Invites banner ───────────────────────────────────────────────────────
function InvitesBanner({ invites, lang, onChange }: { invites: ClanSummary[]; lang: string; onChange: () => void }) {
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
    try { await apiClient.post(`/api/clans/${c.id}/invite/decline`, {}); } catch { /* noop */ }
    onChange();
  }
  return (
    <div className="rounded-2xl p-3 mb-4"
      style={{ background: 'linear-gradient(135deg, rgba(196,149,255,0.10), rgba(120,80,168,0.05))', border: '1px solid rgba(196,149,255,0.40)' }}>
      <p className="font-arabic mb-2" style={{ fontSize: 12, color: '#C495FF' }}>
        💌 {lang === 'ar' ? `لديك ${invites.length} دعوة` : `${invites.length} invite${invites.length === 1 ? '' : 's'}`}
      </p>
      <div className="flex flex-col gap-1.5">
        {invites.map(c => (
          <div key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5"
            style={{ background: 'rgba(255,255,255,0.03)' }}>
            <span style={{ fontSize: 22 }}>{c.emblem}</span>
            <span className="flex-1 font-arabic truncate" style={{ fontSize: 12, color: '#E8C97A' }}>
              {c.name} <span className="font-mono" style={{ fontSize: 10, color: 'rgba(232,201,122,0.6)' }}>[{c.tag}]</span>
            </span>
            <button onClick={() => accept(c)}
              className="rounded-lg px-2.5 py-1 font-arabic font-bold"
              style={{ background: 'rgba(80,200,120,0.20)', color: '#80E0A0', border: '1px solid rgba(80,200,120,0.45)', fontSize: 10 }}>
              {lang === 'ar' ? 'قبول' : 'Accept'}
            </button>
            <button onClick={() => decline(c)}
              className="rounded-lg px-2 py-1 font-arabic"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(245,230,200,0.55)', fontSize: 10 }}>
              {lang === 'ar' ? 'رفض' : 'Decline'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Browse tab ───────────────────────────────────────────────────────────
function BrowseTab({ list, myClanId, myCoins, lang, onRefresh }: {
  list: ClanSummary[]; myClanId?: string; myCoins: number; lang: string; onRefresh: () => void;
}) {
  const { addToast } = useUiStore();
  const [search, setSearch] = useState('');

  async function apply(c: ClanSummary) {
    soundService.playClick();
    try {
      const res = await apiClient.post<{ autoAccepted: boolean }>(`/api/clans/${c.id}/apply`, {});
      addToast(res.autoAccepted
        ? (lang === 'ar' ? '✓ انضممت!' : '✓ Joined!')
        : (lang === 'ar' ? '📨 تم إرسال الطلب' : '📨 Application sent'), 'success');
      onRefresh();
    } catch (e: any) {
      soundService.playError();
      addToast(e?.message || 'Failed', 'error');
    }
  }

  // Filter the list by name + tag (case-insensitive). Empty query → show all.
  const q = search.trim().toLowerCase();
  const filtered = q
    ? list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.tag.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q))
    : list;

  return (
    <div>
      {/* Search bar */}
      <div className="rounded-2xl p-2.5 mb-3 flex items-center gap-2"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.20)' }}>
        <span style={{ fontSize: 16, color: 'rgba(232,201,122,0.6)', paddingInlineStart: 8 }}>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={lang === 'ar' ? 'ابحث باسم القبيلة أو الرمز' : 'Search by name or tag'}
          className="flex-1 bg-transparent outline-none font-arabic"
          style={{ color: '#E8C97A', fontSize: 13 }}
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="rounded-md w-6 h-6 flex items-center justify-center"
            style={{ color: 'rgba(245,230,200,0.55)', background: 'rgba(255,255,255,0.05)', fontSize: 14 }}>×</button>
        )}
      </div>

      <p className="font-arabic mb-3 px-1" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.5)' }}>
        {q
          ? (lang === 'ar' ? `${filtered.length} نتيجة من ${list.length}` : `${filtered.length} of ${list.length} match`)
          : (lang === 'ar' ? `${list.length} قبيلة على المنصة` : `${list.length} clans on the platform`)}
      </p>
      {filtered.length === 0 ? (
        <div className="text-center py-12 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(201,168,76,0.18)' }}>
          <p style={{ fontSize: 32 }}>{q ? '🔎' : '🏰'}</p>
          <p className="font-arabic mt-2" style={{ fontSize: 13, color: 'rgba(245,230,200,0.5)' }}>
            {q
              ? (lang === 'ar' ? `لا قبيلة باسم "${search}"` : `No clans match "${search}"`)
              : (lang === 'ar' ? 'لا قبائل بعد — كن أول مؤسس!' : 'No clans yet — be the first founder!')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(c => (
            <ClanCard key={c.id} c={c} isMine={c.id === myClanId} canApply={!myClanId} lang={lang} onApply={() => apply(c)}/>
          ))}
        </div>
      )}
      <p className="font-arabic mt-4 text-center" style={{ fontSize: 10.5, color: 'rgba(245,230,200,0.4)' }}>
        💎 {lang === 'ar' ? `إنشاء قبيلة جديدة يكلف ${CLAN_CREATE_COST.toLocaleString()} كوينز (لديك ${myCoins.toLocaleString()})` : `Creating a clan costs ${CLAN_CREATE_COST.toLocaleString()} coins (you have ${myCoins.toLocaleString()})`}
      </p>
    </div>
  );
}

function ClanCard({ c, isMine, canApply, lang, onApply }: { c: ClanSummary; isMine: boolean; canApply: boolean; lang: string; onApply: () => void }) {
  const isPrivate = c.visibility === 'private';
  return (
    <div className="rounded-2xl p-3 flex items-center gap-3"
      style={{
        background: isMine ? 'rgba(201,168,76,0.10)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isMine ? 'rgba(201,168,76,0.45)' : 'rgba(255,255,255,0.06)'}`,
      }}>
      <ClanEmblem emblem={c.emblem} size={48}/>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className="font-arabic font-bold truncate" style={{ fontSize: 14, color: '#E8C97A' }}>{c.name}</p>
          <span className="font-mono rounded px-1.5"
            style={{ fontSize: 10, background: 'rgba(201,168,76,0.15)', color: '#E8C97A', letterSpacing: 1 }}>
            [{c.tag}]
          </span>
          {isPrivate && (
            <span className="font-arabic rounded px-1.5"
              style={{ fontSize: 9, background: 'rgba(196,149,255,0.15)', color: '#C495FF' }}>
              🔒 {lang === 'ar' ? 'خاصة' : 'private'}
            </span>
          )}
        </div>
        {c.description && (
          <p className="font-arabic truncate mt-0.5" style={{ fontSize: 10.5, color: 'rgba(245,230,200,0.5)' }}>{c.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1 font-arabic" style={{ fontSize: 10.5, color: 'rgba(245,230,200,0.55)' }}>
          <span>👥 {c.memberCount}/{c.memberLimit}</span>
          <span>🏆 {c.totalWins.toLocaleString()}</span>
          {c.bank > 0 && <span>💰 {c.bank.toLocaleString()}</span>}
        </div>
      </div>
      {isMine ? (
        <span className="shrink-0 rounded-lg px-2.5 py-1 font-arabic"
          style={{ background: 'rgba(80,200,120,0.10)', color: 'rgba(80,200,120,0.85)', fontSize: 10.5 }}>
          ✓ {lang === 'ar' ? 'قبيلتك' : 'Yours'}
        </span>
      ) : c.appliedByMe ? (
        <span className="shrink-0 rounded-lg px-2.5 py-1 font-arabic"
          style={{ background: 'rgba(196,149,255,0.10)', color: '#C495FF', fontSize: 10.5 }}>
          ⏳ {lang === 'ar' ? 'بانتظار الموافقة' : 'Pending'}
        </span>
      ) : c.invitedByMe ? (
        <span className="shrink-0 rounded-lg px-2.5 py-1 font-arabic"
          style={{ background: 'rgba(196,149,255,0.20)', color: '#C495FF', fontSize: 10.5 }}>
          💌 {lang === 'ar' ? 'مدعو' : 'Invited'}
        </span>
      ) : canApply && c.memberCount < c.memberLimit ? (
        isPrivate ? (
          <span className="shrink-0 rounded-lg px-2.5 py-1 font-arabic"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(245,230,200,0.45)', fontSize: 10.5 }}>
            🔒 {lang === 'ar' ? 'بدعوة فقط' : 'Invite only'}
          </span>
        ) : (
          <motion.button whileTap={{ scale: 0.96 }} onClick={onApply}
            className="shrink-0 rounded-lg px-3 py-1.5 font-arabic font-bold"
            style={{ background: 'linear-gradient(135deg, #C9A84C, #A07830)', color: '#0E0905', fontSize: 11 }}>
            📨 {lang === 'ar' ? 'تقدّم' : 'Apply'}
          </motion.button>
        )
      ) : c.memberCount >= c.memberLimit ? (
        <span className="shrink-0 rounded-lg px-2.5 py-1 font-arabic"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(245,230,200,0.4)', fontSize: 10.5 }}>
          {lang === 'ar' ? 'ممتلئة' : 'Full'}
        </span>
      ) : null}
    </div>
  );
}

// ─── Mine tab ─────────────────────────────────────────────────────────────
function MineTab({ clan, myUid, lang, onChanged, onLeft }: {
  clan: Clan | null; myUid?: string; lang: string; onChanged: () => void; onLeft: () => void;
}) {
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmKick, setConfirmKick] = useState<{ uid: string; name: string } | null>(null);
  const [confirmTransfer, setConfirmTransfer] = useState<{ uid: string; name: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const { setProfile } = useAuthStore();
  const { addToast } = useUiStore();

  if (!clan) {
    return (
      <div className="text-center py-12 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(201,168,76,0.18)' }}>
        <p style={{ fontSize: 36 }}>🪑</p>
        <p className="font-arabic mt-2" style={{ fontSize: 13, color: 'rgba(245,230,200,0.5)' }}>
          {lang === 'ar' ? 'لست في أي قبيلة' : "Not in any clan yet"}
        </p>
      </div>
    );
  }

  const me = clan.members.find(m => m.uid === myUid);
  const isLeader  = clan.leaderUid === myUid;
  const isOfficer = !!me && (me.role === 'leader' || me.role === 'officer');

  async function leave() {
    setConfirmLeave(false);
    try {
      const res = await apiClient.post<{ profile: UserProfile; disbanded: boolean }>('/api/clans/leave', {});
      if (res?.profile) setProfile(res.profile);
      addToast(res.disbanded
        ? (lang === 'ar' ? 'تم حل القبيلة' : 'Disbanded')
        : (lang === 'ar' ? 'غادرت' : 'Left'), 'success');
      onLeft();
    } catch (e: any) { addToast(e?.message || 'Failed', 'error'); }
  }
  async function deleteIt() {
    setConfirmDelete(false);
    try {
      const res = await apiClient.delete<{ profile: UserProfile }>(`/api/clans/${clan!.id}`);
      if (res?.profile) setProfile(res.profile);
      addToast(lang === 'ar' ? 'تم حذف القبيلة' : 'Clan deleted', 'success');
      onLeft();
    } catch (e: any) { addToast(e?.message || 'Failed', 'error'); }
  }
  async function setRole(targetUid: string, role: ClanRole) {
    try { await apiClient.post(`/api/clans/${clan!.id}/role/${targetUid}`, { role }); onChanged(); }
    catch (e: any) { addToast(e?.message || 'Failed', 'error'); }
  }
  function askKick(targetUid: string, name: string) { setConfirmKick({ uid: targetUid, name }); }
  function askTransfer(targetUid: string, name: string) { setConfirmTransfer({ uid: targetUid, name }); }
  async function doKick() {
    if (!confirmKick) return;
    const targetUid = confirmKick.uid;
    setConfirmKick(null);
    try { await apiClient.post(`/api/clans/${clan!.id}/kick/${targetUid}`, {}); onChanged(); }
    catch (e: any) { addToast(e?.message || 'Failed', 'error'); }
  }
  async function doTransfer() {
    if (!confirmTransfer) return;
    const targetUid = confirmTransfer.uid;
    setConfirmTransfer(null);
    try { await apiClient.post(`/api/clans/${clan!.id}/transfer/${targetUid}`, {}); onChanged(); addToast('👑', 'success'); }
    catch (e: any) { addToast(e?.message || 'Failed', 'error'); }
  }
  async function accept(uid: string) {
    try { await apiClient.post(`/api/clans/${clan!.id}/accept/${uid}`, {}); onChanged(); addToast('✓', 'success'); }
    catch (e: any) { addToast(e?.message || 'Failed', 'error'); }
  }
  async function reject(uid: string) {
    try { await apiClient.post(`/api/clans/${clan!.id}/reject/${uid}`, {}); onChanged(); }
    catch (e: any) { addToast(e?.message || 'Failed', 'error'); }
  }

  const sortedMembers = [...clan.members].sort((a, b) => {
    const order = { leader: 0, officer: 1, member: 2 } as const;
    return order[a.role] - order[b.role] || a.joinedAt - b.joinedAt;
  });

  return (
    <div>
      {editing && isLeader ? (
        <EditClan clan={clan} lang={lang} onClose={() => setEditing(false)} onSaved={onChanged}/>
      ) : (
        <div className="rounded-2xl p-4 mb-4 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.12), rgba(120,80,20,0.06))', border: '1px solid rgba(201,168,76,0.40)' }}>
          <ClanEmblem emblem={clan.emblem} size={64}/>
          <h2 className="font-arabic font-bold mt-2" style={{ fontSize: 22, color: '#E8C97A' }}>
            {clan.name} <span className="font-mono" style={{ fontSize: 13, color: 'rgba(232,201,122,0.7)' }}>[{clan.tag}]</span>
          </h2>
          {clan.description && (
            <p className="font-arabic mt-1.5" style={{ fontSize: 12, color: 'rgba(245,230,200,0.65)' }}>{clan.description}</p>
          )}
          <div className="flex items-center justify-center gap-3 mt-3 font-arabic flex-wrap"
            style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.7)' }}>
            <span>👥 {clan.members.length}/{clan.memberLimit}</span>
            <span>🏆 {clan.totalWins.toLocaleString()}</span>
            <span>💰 {(clan.bank || 0).toLocaleString()}</span>
            <span>{clan.visibility === 'private' ? '🔒' : '🌐'} {clan.visibility === 'private' ? (lang === 'ar' ? 'خاصة' : 'private') : (lang === 'ar' ? 'عامة' : 'open')}</span>
          </div>
          {isLeader && (
            <div className="flex gap-2 justify-center mt-3 flex-wrap">
              <button onClick={() => setEditing(true)}
                className="rounded-lg px-3 py-1.5 font-arabic"
                style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.35)', color: '#E8C97A', fontSize: 11 }}>
                ✏️ {lang === 'ar' ? 'تعديل' : 'Edit'}
              </button>
              <button onClick={() => setConfirmDelete(true)}
                className="rounded-lg px-3 py-1.5 font-arabic"
                style={{ background: 'rgba(224,64,48,0.10)', border: '1px solid rgba(224,64,48,0.35)', color: '#FF8A7A', fontSize: 11 }}>
                🗑 {lang === 'ar' ? 'حذف' : 'Delete'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pending applications — officers see them */}
      {isOfficer && clan.applications.length > 0 && (
        <div className="rounded-2xl p-3 mb-4"
          style={{ background: 'rgba(196,149,255,0.08)', border: '1px solid rgba(196,149,255,0.30)' }}>
          <p className="font-arabic mb-2 px-1" style={{ fontSize: 12, color: '#C495FF', fontWeight: 700 }}>
            📨 {lang === 'ar' ? `طلبات الانضمام (${clan.applications.length})` : `Applications (${clan.applications.length})`}
          </p>
          <div className="flex flex-col gap-1.5">
            {clan.applications.map(a => (
              <div key={a.uid} className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                <span style={{ fontSize: 18 }}>👤</span>
                <span className="flex-1 font-arabic truncate" style={{ fontSize: 12, color: '#E8C97A' }}>
                  {a.displayName}
                  {a.message && <span className="font-arabic" style={{ marginInlineStart: 6, fontSize: 10.5, color: 'rgba(245,230,200,0.55)' }}>"{a.message}"</span>}
                </span>
                <button onClick={() => accept(a.uid)}
                  className="rounded-lg px-2.5 py-1 font-arabic font-bold"
                  style={{ background: 'rgba(80,200,120,0.20)', color: '#80E0A0', border: '1px solid rgba(80,200,120,0.45)', fontSize: 10 }}>
                  {lang === 'ar' ? 'قبول' : 'Accept'}
                </button>
                <button onClick={() => reject(a.uid)}
                  className="rounded-lg px-2 py-1 font-arabic"
                  style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(245,230,200,0.55)', fontSize: 10 }}>
                  {lang === 'ar' ? 'رفض' : 'Reject'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members */}
      <h3 className="font-arabic font-bold mb-2 px-1" style={{ fontSize: 12, color: 'rgba(201,168,76,0.85)' }}>
        {lang === 'ar' ? 'الأعضاء' : 'Members'}
      </h3>
      <div className="flex flex-col gap-1.5 mb-4">
        {sortedMembers.map(m => (
          <MemberRow key={m.uid} m={m} isMe={m.uid === myUid} isLeader={isLeader} amOfficer={isOfficer}
            onPromote={() => setRole(m.uid, 'officer')}
            onDemote={() => setRole(m.uid, 'member')}
            onKick={() => askKick(m.uid, m.displayName)}
            onTransfer={() => askTransfer(m.uid, m.displayName)}
            lang={lang}/>
        ))}
      </div>

      {/* Invite friends — visible to officers + leader. Indispensable for
          private clans since they can ONLY be joined via direct invite. */}
      {isOfficer && (
        <button onClick={() => setShowInvite(true)}
          className="w-full mb-2 rounded-xl py-2.5 font-arabic font-bold flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(135deg, rgba(196,149,255,0.20), rgba(120,80,168,0.10))',
            border: '1.5px solid rgba(196,149,255,0.55)',
            color: '#C495FF', fontSize: 13,
            boxShadow: '0 0 14px rgba(196,149,255,0.25)',
          }}>
          💌 {lang === 'ar' ? 'دعوة الأصدقاء للقبيلة' : 'Invite friends to clan'}
        </button>
      )}

      {!isLeader && (
        <button onClick={() => setConfirmLeave(true)}
          className="w-full rounded-xl py-2.5 font-arabic"
          style={{ background: 'rgba(224,64,48,0.08)', border: '1px solid rgba(224,64,48,0.30)', color: 'rgba(255,150,140,0.85)', fontSize: 12 }}>
          {lang === 'ar' ? 'مغادرة القبيلة' : 'Leave Clan'}
        </button>
      )}
      {isLeader && (
        <button onClick={() => setConfirmLeave(true)}
          className="w-full rounded-xl py-2.5 font-arabic"
          style={{ background: 'rgba(224,64,48,0.08)', border: '1px solid rgba(224,64,48,0.30)', color: 'rgba(255,150,140,0.85)', fontSize: 12 }}>
          {clan.members.length === 1
            ? (lang === 'ar' ? 'مغادرة (سيُحلّ)' : 'Leave (will disband)')
            : (lang === 'ar' ? 'مغادرة (يُنقل القيادة)' : 'Leave (transfers leadership)')}
        </button>
      )}

      <ConfirmModal open={confirmLeave}
        title={lang === 'ar' ? 'مغادرة القبيلة' : 'Leave Clan'}
        message={clan.members.length === 1
          ? (lang === 'ar' ? 'أنت العضو الأخير — مغادرتك ستحلّ القبيلة نهائياً.' : "You're the last member — leaving disbands.")
          : (lang === 'ar' ? 'متأكد تبا تغادر القبيلة؟' : 'Sure you want to leave?')}
        confirmLabel={lang === 'ar' ? 'مغادرة' : 'Leave'} cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
        tone="danger" lang={lang} onConfirm={leave} onCancel={() => setConfirmLeave(false)}/>

      <ConfirmModal open={confirmDelete}
        title={lang === 'ar' ? 'حذف القبيلة' : 'Delete Clan'}
        message={lang === 'ar' ? 'سيتم طرد جميع الأعضاء وحذف القبيلة نهائياً. متأكد؟' : 'All members will be removed and the clan deleted permanently.'}
        confirmLabel={lang === 'ar' ? 'حذف' : 'Delete'} cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
        tone="danger" lang={lang} onConfirm={deleteIt} onCancel={() => setConfirmDelete(false)}/>

      <ConfirmModal open={!!confirmKick}
        title={lang === 'ar' ? 'طرد عضو' : 'Kick Member'}
        message={lang === 'ar' ? `هل تريد طرد "${confirmKick?.name}" من القبيلة؟` : `Kick "${confirmKick?.name}" from the clan?`}
        confirmLabel={lang === 'ar' ? 'طرد' : 'Kick'} cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
        tone="danger" lang={lang} onConfirm={doKick} onCancel={() => setConfirmKick(null)}/>

      <ConfirmModal open={!!confirmTransfer}
        title={lang === 'ar' ? 'نقل القيادة' : 'Transfer Leadership'}
        message={lang === 'ar'
          ? `سوف ينتقل دور القيادة إلى "${confirmTransfer?.name}". أنت ستصبح عضواً عادياً. متأكد؟`
          : `Leadership will pass to "${confirmTransfer?.name}". You'll become a regular member. Continue?`}
        confirmLabel={lang === 'ar' ? 'نقل' : 'Transfer'} cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
        tone="gold" lang={lang} onConfirm={doTransfer} onCancel={() => setConfirmTransfer(null)}/>

      <InviteFriendsModal open={showInvite} clan={clan} lang={lang}
        onClose={() => setShowInvite(false)} onInvited={onChanged}/>
    </div>
  );
}

function MemberRow({ m, isMe, isLeader, amOfficer, onPromote, onDemote, onKick, onTransfer, lang }: {
  m: ClanMember; isMe: boolean; isLeader: boolean; amOfficer: boolean;
  onPromote: () => void; onDemote: () => void; onKick: () => void; onTransfer: () => void; lang: string;
}) {
  const [open, setOpen] = useState(false);
  const canManage = (amOfficer || isLeader) && !isMe && m.role !== 'leader';
  const canPromote = isLeader && m.role === 'member';
  const canDemote  = isLeader && m.role === 'officer';
  const canTransfer = isLeader && m.role !== 'leader';
  const canKick = canManage && (isLeader || m.role === 'member');
  return (
    <div>
      <div className="flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer"
        style={{ background: isMe ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
        onClick={() => canManage && setOpen(s => !s)}>
        <span style={{ fontSize: 16 }}>{m.role === 'leader' ? '👑' : m.role === 'officer' ? '⚜️' : '👤'}</span>
        <span className="flex-1 font-arabic truncate" style={{ fontSize: 12.5, color: '#E8C97A' }}>
          {isMe ? (lang === 'ar' ? 'أنت' : 'You') : m.displayName}
          <span className="font-arabic" style={{ marginInlineStart: 6, fontSize: 9.5, color: 'rgba(245,230,200,0.5)' }}>
            · {m.role === 'leader' ? (lang === 'ar' ? 'قائد' : 'leader') : m.role === 'officer' ? (lang === 'ar' ? 'ضابط' : 'officer') : (lang === 'ar' ? 'عضو' : 'member')}
          </span>
        </span>
        {canManage && <span style={{ fontSize: 10, color: 'rgba(245,230,200,0.4)' }}>{open ? '▼' : '▶'}</span>}
      </div>
      {canManage && open && (
        <div className="flex gap-1.5 mt-1.5 mb-1 ms-6 flex-wrap">
          {canPromote && (
            <button onClick={onPromote} className="rounded-lg px-2.5 py-1 font-arabic"
              style={{ background: 'rgba(196,149,255,0.15)', color: '#C495FF', border: '1px solid rgba(196,149,255,0.35)', fontSize: 10 }}>
              ⚜️ {lang === 'ar' ? 'تعيين ضابطاً' : 'Promote'}
            </button>
          )}
          {canDemote && (
            <button onClick={onDemote} className="rounded-lg px-2.5 py-1 font-arabic"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(245,230,200,0.65)', border: '1px solid rgba(255,255,255,0.10)', fontSize: 10 }}>
              ↓ {lang === 'ar' ? 'إنزال' : 'Demote'}
            </button>
          )}
          {canTransfer && (
            <button onClick={onTransfer} className="rounded-lg px-2.5 py-1 font-arabic"
              style={{ background: 'rgba(232,201,122,0.15)', color: '#FFE07A', border: '1px solid rgba(232,201,122,0.40)', fontSize: 10 }}>
              👑 {lang === 'ar' ? 'نقل قيادة' : 'Transfer'}
            </button>
          )}
          {canKick && (
            <button onClick={onKick} className="rounded-lg px-2.5 py-1 font-arabic"
              style={{ background: 'rgba(224,64,48,0.10)', color: '#FF8A7A', border: '1px solid rgba(224,64,48,0.35)', fontSize: 10 }}>
              ✗ {lang === 'ar' ? 'طرد' : 'Kick'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Edit clan ────────────────────────────────────────────────────────────
function EditClan({ clan, lang, onClose, onSaved }: { clan: Clan; lang: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(clan.name);
  const [emblem, setEmblem] = useState(clan.emblem);
  const [description, setDescription] = useState(clan.description);
  const [visibility, setVisibility] = useState<ClanVisibility>(clan.visibility);
  const [busy, setBusy] = useState(false);
  const { addToast } = useUiStore();

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      await apiClient.patch(`/api/clans/${clan.id}`, { name, emblem, description, visibility });
      addToast(lang === 'ar' ? 'تم الحفظ' : 'Saved', 'success');
      onSaved();
      onClose();
    } catch (e: any) { addToast(e?.message || 'Failed', 'error'); }
    finally { setBusy(false); }
  }

  return (
    <div className="rounded-2xl p-4 mb-4 space-y-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.30)' }}>
      <h3 className="font-arabic font-bold" style={{ fontSize: 15, color: '#E8C97A' }}>
        ✏️ {lang === 'ar' ? 'تعديل القبيلة' : 'Edit Clan'}
      </h3>
      <input value={name} onChange={e => setName(e.target.value)} maxLength={24}
        className="w-full px-3 py-2 rounded-lg font-arabic"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.25)', color: '#E8C97A', fontSize: 13 }}/>
      <input value={description} onChange={e => setDescription(e.target.value.slice(0, 200))}
        placeholder={lang === 'ar' ? 'الوصف' : 'Description'}
        className="w-full px-3 py-2 rounded-lg font-arabic"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.25)', color: '#E8C97A', fontSize: 13 }}/>
      <div>
        <p className="font-arabic mb-1.5" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.55)' }}>
          {lang === 'ar' ? 'الشعار' : 'Emblem'}
        </p>
        <div className="grid grid-cols-8 gap-1.5">
          {CLAN_EMBLEMS.map(e => (
            <button key={e} onClick={() => setEmblem(e)}
              className="rounded-lg p-2"
              style={{
                background: emblem === e ? 'rgba(201,168,76,0.20)' : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${emblem === e ? 'rgba(201,168,76,0.65)' : 'rgba(255,255,255,0.08)'}`,
                fontSize: 18,
              }}>{e}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="font-arabic mb-1.5" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.55)' }}>
          {lang === 'ar' ? 'الرؤية' : 'Visibility'}
        </p>
        <div className="flex gap-2">
          <button onClick={() => setVisibility('open')}
            className="flex-1 rounded-lg py-2 font-arabic"
            style={{
              background: visibility === 'open' ? 'rgba(201,168,76,0.20)' : 'rgba(255,255,255,0.04)',
              border: `1.5px solid ${visibility === 'open' ? 'rgba(201,168,76,0.65)' : 'rgba(255,255,255,0.08)'}`,
              color: visibility === 'open' ? '#E8C97A' : 'rgba(245,230,200,0.55)', fontSize: 12,
            }}>🌐 {lang === 'ar' ? 'عامة' : 'Open'}</button>
          <button onClick={() => setVisibility('private')}
            className="flex-1 rounded-lg py-2 font-arabic"
            style={{
              background: visibility === 'private' ? 'rgba(201,168,76,0.20)' : 'rgba(255,255,255,0.04)',
              border: `1.5px solid ${visibility === 'private' ? 'rgba(201,168,76,0.65)' : 'rgba(255,255,255,0.08)'}`,
              color: visibility === 'private' ? '#E8C97A' : 'rgba(245,230,200,0.55)', fontSize: 12,
            }}>🔒 {lang === 'ar' ? 'خاصة' : 'Private'}</button>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onClose} className="flex-1 rounded-xl py-2 font-arabic"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(245,230,200,0.65)', fontSize: 12 }}>
          {lang === 'ar' ? 'إلغاء' : 'Cancel'}
        </button>
        <motion.button whileTap={{ scale: 0.96 }} onClick={save} disabled={busy}
          className="flex-1 rounded-xl py-2 font-arabic font-bold disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #C9A84C, #A07830)', color: '#0E0905', fontSize: 12 }}>
          {lang === 'ar' ? 'حفظ' : 'Save'}
        </motion.button>
      </div>
    </div>
  );
}

// ─── Create tab ───────────────────────────────────────────────────────────
function CreateTab({ lang, myCoins, onCreated }: { lang: string; myCoins: number; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [emblem, setEmblem] = useState(CLAN_EMBLEMS[0]);
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<ClanVisibility>('open');
  const [busy, setBusy] = useState(false);
  const { setProfile } = useAuthStore();
  const { addToast } = useUiStore();
  const cantAfford = myCoins < CLAN_CREATE_COST;

  async function create() {
    if (busy || cantAfford || !name.trim() || !tag.trim()) return;
    setBusy(true);
    soundService.playClick();
    try {
      const res = await apiClient.post<{ profile: UserProfile }>('/api/clans', { name, tag, emblem, description, visibility });
      if (res?.profile) setProfile(res.profile);
      addToast('🏰', 'success');
      onCreated();
    } catch (e: any) {
      soundService.playError();
      addToast(e?.message || 'Failed', 'error');
    } finally { setBusy(false); }
  }

  return (
    <div className="rounded-2xl p-4 space-y-4"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(201,168,76,0.20)' }}>
      <div>
        <p className="font-arabic mb-1.5" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.55)' }}>
          {lang === 'ar' ? 'اسم القبيلة (3-24 حرفاً)' : 'Clan Name'}
        </p>
        <input value={name} onChange={e => setName(e.target.value)} maxLength={24}
          placeholder={lang === 'ar' ? 'مثال: صقور الخليج' : 'e.g. Falcons of the Gulf'}
          className="w-full px-3 py-2 rounded-lg font-arabic"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.30)', color: '#E8C97A', fontSize: 13 }}/>
      </div>
      <div>
        <p className="font-arabic mb-1.5" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.55)' }}>
          {lang === 'ar' ? 'الرمز (2-5 حروف لاتينية)' : 'Tag (2-5 Latin)'}
        </p>
        <input value={tag} onChange={e => setTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} maxLength={5}
          placeholder="FALC"
          className="w-full px-3 py-2 rounded-lg font-mono"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.30)', color: '#E8C97A', fontSize: 14, letterSpacing: 2 }}/>
      </div>
      <div>
        <p className="font-arabic mb-1.5" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.55)' }}>
          {lang === 'ar' ? 'الشعار' : 'Emblem'}
        </p>
        <div className="grid grid-cols-8 gap-1.5">
          {CLAN_EMBLEMS.map(e => (
            <button key={e} onClick={() => { setEmblem(e); soundService.playClick(); }}
              className="rounded-lg p-2"
              style={{
                background: emblem === e ? 'rgba(201,168,76,0.20)' : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${emblem === e ? 'rgba(201,168,76,0.65)' : 'rgba(255,255,255,0.08)'}`,
                fontSize: 18,
              }}>{e}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="font-arabic mb-1.5" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.55)' }}>
          {lang === 'ar' ? 'الرؤية' : 'Visibility'}
        </p>
        <div className="flex gap-2">
          <button onClick={() => setVisibility('open')}
            className="flex-1 rounded-xl py-2 font-arabic"
            style={{
              background: visibility === 'open' ? 'rgba(201,168,76,0.20)' : 'rgba(255,255,255,0.04)',
              border: `1.5px solid ${visibility === 'open' ? 'rgba(201,168,76,0.65)' : 'rgba(255,255,255,0.08)'}`,
              color: visibility === 'open' ? '#E8C97A' : 'rgba(245,230,200,0.55)', fontSize: 12.5,
            }}>
            🌐 <strong>{lang === 'ar' ? 'عامة' : 'Open'}</strong>
            <div style={{ fontSize: 9.5, opacity: 0.65, marginTop: 2 }}>
              {lang === 'ar' ? 'تظهر في القائمة، يقدّم الناس طلب' : 'Listed publicly, people apply'}
            </div>
          </button>
          <button onClick={() => setVisibility('private')}
            className="flex-1 rounded-xl py-2 font-arabic"
            style={{
              background: visibility === 'private' ? 'rgba(201,168,76,0.20)' : 'rgba(255,255,255,0.04)',
              border: `1.5px solid ${visibility === 'private' ? 'rgba(201,168,76,0.65)' : 'rgba(255,255,255,0.08)'}`,
              color: visibility === 'private' ? '#E8C97A' : 'rgba(245,230,200,0.55)', fontSize: 12.5,
            }}>
            🔒 <strong>{lang === 'ar' ? 'خاصة' : 'Private'}</strong>
            <div style={{ fontSize: 9.5, opacity: 0.65, marginTop: 2 }}>
              {lang === 'ar' ? 'بدعوة مباشرة فقط' : 'Invite-only'}
            </div>
          </button>
        </div>
      </div>
      <div>
        <p className="font-arabic mb-1.5" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.55)' }}>
          {lang === 'ar' ? 'وصف (اختياري)' : 'Description (optional)'}
        </p>
        <input value={description} onChange={e => setDescription(e.target.value.slice(0, 200))}
          className="w-full px-3 py-2 rounded-lg font-arabic"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.30)', color: '#E8C97A', fontSize: 13 }}/>
      </div>

      <motion.button whileTap={{ scale: 0.97 }} onClick={create}
        disabled={cantAfford || busy || !name.trim() || !tag.trim()}
        className="w-full rounded-2xl py-3 font-arabic font-bold disabled:opacity-50"
        style={{
          background: cantAfford ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #C9A84C, #A07830)',
          color: cantAfford ? 'rgba(245,230,200,0.4)' : '#0E0905',
          fontSize: 14,
        }}>
        {busy ? '...' : cantAfford
          ? (lang === 'ar' ? `تحتاج ${CLAN_CREATE_COST.toLocaleString()} كوينز` : `Need ${CLAN_CREATE_COST.toLocaleString()} coins`)
          : (lang === 'ar' ? `🏰 أنشئ القبيلة (${CLAN_CREATE_COST.toLocaleString()} 🪙)` : `🏰 Found Clan (${CLAN_CREATE_COST.toLocaleString()} 🪙)`)}
      </motion.button>
    </div>
  );
}

// ─── Invite friends modal ─────────────────────────────────────────────────
// Officers + leader use this to send direct invites — the only way to get
// into a private clan. Loads the inviter's friends list, filters out anyone
// already in the clan / already invited, and lets them invite with one tap.
function InviteFriendsModal({ open, clan, lang, onClose, onInvited }: {
  open: boolean;
  clan: Clan;
  lang: string;
  onClose: () => void;
  onInvited: () => void;
}) {
  const [friends, setFriends] = useState<{ uid: string; displayName: string; avatarId: string; level: number }[]>([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [invitedThisSession, setInvitedThisSession] = useState<Set<string>>(new Set());
  const { addToast } = useUiStore();

  useEffect(() => {
    if (!open) return;
    apiClient.get<typeof friends>('/api/friends')
      .then(setFriends).catch(() => setFriends([]));
  }, [open]);

  // Whenever the clan's invite list shrinks (friend declined or accepted),
  // purge any locally-marked entries that aren't in the truth set anymore
  // so the leader can re-invite them immediately without refresh. The
  // background poll on ClansPage refreshes every 4s.
  const inviteIds = new Set(clan.invites.map(i => i.uid));
  const memberIds = new Set(clan.members.map(m => m.uid));
  useEffect(() => {
    setInvitedThisSession(prev => {
      const next = new Set<string>();
      for (const uid of prev) {
        // Keep only if server still has the invite. If the friend joined
        // (now a member) or declined (gone from both), drop them.
        if (inviteIds.has(uid)) next.add(uid);
      }
      return next.size === prev.size && [...next].every(u => prev.has(u)) ? prev : next;
    });
  }, [clan.invites.length, clan.members.length]);

  const filteredFriends = friends.filter(f => !memberIds.has(f.uid));

  async function inviteByUid(uid: string, name: string) {
    if (busyUid) return;
    setBusyUid(uid);
    soundService.playClick();
    try {
      await apiClient.post(`/api/clans/${clan.id}/invite/${uid}`, {});
      setInvitedThisSession(s => new Set([...s, uid]));
      addToast(lang === 'ar' ? `💌 تمت دعوة ${name}` : `💌 Invited ${name}`, 'success');
      onInvited();
    } catch (e: any) {
      soundService.playError();
      addToast(e?.message || 'Failed', 'error');
    } finally {
      setBusyUid(null);
    }
  }

  async function inviteByUsername() {
    const q = searchUsername.trim();
    if (!q) return;
    soundService.playClick();
    try {
      // Server has no by-username invite endpoint — but the friends search does.
      // Easiest: use friends/request flow as a soft search? Simpler: tell user
      // to add the player as friend first if they aren't already.
      addToast(lang === 'ar'
        ? 'لإضافة لاعب ليس صديقك، أرسل له طلب صداقة أولاً ثم ادعه من هنا'
        : 'Add the player as a friend first, then invite them from here',
        'info');
    } catch (e: any) { addToast(e?.message || 'Failed', 'error'); }
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        className="fixed inset-0 z-[70] flex items-center justify-center p-3"
        style={{ background: 'rgba(0,0,0,0.78)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-md rounded-3xl flex flex-col overflow-hidden"
          style={{
            maxHeight: '88vh',
            background: 'linear-gradient(180deg, #1A1408 0%, #0E0905 100%)',
            border: '1px solid rgba(196,149,255,0.40)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(196,149,255,0.20)',
            direction: lang === 'ar' ? 'rtl' : 'ltr',
          }}
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-3 border-b" style={{ borderColor: 'rgba(196,149,255,0.18)' }}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-arabic font-bold flex items-center gap-2"
                style={{ fontSize: 18, color: '#C495FF' }}>
                💌 {lang === 'ar' ? 'دعوة الأصدقاء' : 'Invite Friends'}
              </h2>
              <button onClick={onClose}
                className="rounded-lg w-8 h-8 flex items-center justify-center text-xl"
                style={{ color: 'rgba(245,230,200,0.5)', background: 'rgba(255,255,255,0.04)' }}>×</button>
            </div>
            <p className="font-arabic" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.55)' }}>
              {lang === 'ar'
                ? 'اختر أصدقاءك من القائمة لإرسال دعوة. تظهر لهم في صفحة القبائل.'
                : 'Pick friends to send an invite. They\'ll see it on their Clans page.'}
            </p>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-3 py-3">
            {filteredFriends.length === 0 ? (
              <div className="text-center py-8 font-arabic"
                style={{ fontSize: 12.5, color: 'rgba(245,230,200,0.5)' }}>
                <p style={{ fontSize: 32, marginBottom: 6 }}>👥</p>
                {friends.length === 0
                  ? (lang === 'ar' ? 'لا أصدقاء بعد — أضف أصدقاء من صفحة الأصدقاء' : 'No friends yet — add some from the Friends page')
                  : (lang === 'ar' ? 'كل أصدقائك في القبيلة بالفعل' : 'All your friends are already in the clan')}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {filteredFriends.map(f => {
                  const alreadyInvited = inviteIds.has(f.uid) || invitedThisSession.has(f.uid);
                  return (
                    <div key={f.uid} className="flex items-center gap-2 rounded-xl px-3 py-2"
                      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ width: 32, height: 32 }}>
                        <CharacterArt id={f.avatarId} size={32}/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-arabic font-bold truncate" style={{ fontSize: 13, color: '#E8C97A' }}>
                          {f.displayName}
                        </p>
                        <p className="font-arabic" style={{ fontSize: 10, color: 'rgba(245,230,200,0.5)' }}>
                          ⚡ Lvl {f.level}
                        </p>
                      </div>
                      {alreadyInvited ? (
                        <span className="rounded-lg px-2.5 py-1 font-arabic"
                          style={{ background: 'rgba(196,149,255,0.15)', color: '#C495FF', fontSize: 10.5 }}>
                          ✓ {lang === 'ar' ? 'مدعو' : 'Invited'}
                        </span>
                      ) : (
                        <motion.button whileTap={{ scale: 0.94 }}
                          onClick={() => inviteByUid(f.uid, f.displayName)}
                          disabled={busyUid === f.uid}
                          className="rounded-lg px-3 py-1.5 font-arabic font-bold disabled:opacity-50"
                          style={{
                            background: 'linear-gradient(135deg, #C495FF, #8856CC)',
                            color: '#fff', fontSize: 11,
                          }}>
                          {busyUid === f.uid ? '...' : (lang === 'ar' ? 'دعوة' : 'Invite')}
                        </motion.button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-3 border-t font-arabic text-center"
            style={{ borderColor: 'rgba(196,149,255,0.15)', fontSize: 11, color: 'rgba(245,230,200,0.55)' }}>
            💡 {lang === 'ar'
              ? 'الكود يُشاركه القائد كذلك — الأصدقاء يدخلون من تبويب التصفّح'
              : 'Or share your code — friends can join from the Browse tab'}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Emblem renderer ─────────────────────────────────────────────────────
// Falls back to emoji for built-ins, renders an <img> for `image:URL` form.
function ClanEmblem({ emblem, size }: { emblem: string; size: number }) {
  if (emblem.startsWith('image:')) {
    return (
      <img src={emblem.slice(6)} alt=""
        style={{ width: size, height: size, borderRadius: 12, objectFit: 'cover',
          background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(201,168,76,0.30)' }}/>
    );
  }
  return (
    <div className="flex items-center justify-center rounded-xl shrink-0 mx-auto"
      style={{ width: size, height: size, background: 'rgba(0,0,0,0.30)',
        border: '1px solid rgba(201,168,76,0.30)', fontSize: Math.round(size * 0.55) }}>
      {emblem}
    </div>
  );
}
