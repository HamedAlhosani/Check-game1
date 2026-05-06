import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { apiClient } from '../../services/api.service';
import { soundService } from '../../services/sound.service';
import { useLang } from '../../i18n/useT';
import { LangToggle } from '../../components/shared/LangToggle';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import type { Clan, ClanSummary, UserProfile } from '@check-game/shared';
import { CLAN_EMBLEMS } from '@check-game/shared';

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
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const [l, mine] = await Promise.all([
        apiClient.get<ClanSummary[]>('/api/clans'),
        apiClient.get<{ clan: Clan | null }>('/api/clans/me').then(r => r.clan),
      ]);
      setList(l);
      setMyClan(mine);
      if (mine) setTab('mine');
    } catch { /* noop */ }
    finally { setLoading(false); }
  }

  useEffect(() => { refresh(); }, []);

  async function joinClan(id: string) {
    soundService.playClick();
    try {
      const res = await apiClient.post<{ clan: Clan; profile: UserProfile }>(`/api/clans/${id}/join`, {});
      if (res?.profile) setProfile(res.profile);
      setMyClan(res.clan);
      setTab('mine');
      addToast(lang === 'ar' ? '🎉 انضممت للقبيلة' : '🎉 Joined the clan', 'success');
    } catch (e: any) {
      soundService.playError();
      addToast(e?.message || 'Failed', 'error');
    }
  }

  return (
    <div className="min-h-screen pb-16 sm:pb-0" style={{ background: 'linear-gradient(180deg, #14100A 0%, #0E0905 100%)', direction: dir }}>
      <nav className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: 'rgba(20,16,10,0.95)', backdropFilter: 'blur(12px)', borderColor: 'rgba(201,168,76,0.15)' }}>
        <button onClick={() => navigate('/home')}
          className="flex items-center gap-2"
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
              <BrowseTab list={list} myClanId={myClan?.id} myCoins={profile?.coins ?? 0} lang={lang} onJoin={joinClan}/>
            )}
            {tab === 'mine' && (
              <MineTab clan={myClan} myUid={profile?.uid} lang={lang} onLeft={async () => { await refresh(); setTab('browse'); }}
                refresh={async () => { await refresh(); }}/>
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

function BrowseTab({ list, myClanId, myCoins, lang, onJoin }: {
  list: ClanSummary[]; myClanId?: string; myCoins: number; lang: string; onJoin: (id: string) => void;
}) {
  return (
    <div>
      <p className="font-arabic mb-3 px-1" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.5)' }}>
        {lang === 'ar' ? `${list.length} قبيلة على المنصة` : `${list.length} clans on the platform`}
      </p>
      {list.length === 0 ? (
        <div className="text-center py-12 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(201,168,76,0.18)' }}>
          <p style={{ fontSize: 32 }}>🏰</p>
          <p className="font-arabic mt-2" style={{ fontSize: 13, color: 'rgba(245,230,200,0.5)' }}>
            {lang === 'ar' ? 'لا قبائل بعد — كن أول مؤسس!' : 'No clans yet — be the first founder!'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map(c => (
            <ClanCard key={c.id} c={c} isMine={c.id === myClanId} canJoin={!myClanId} lang={lang} onJoin={() => onJoin(c.id)}/>
          ))}
        </div>
      )}
      <p className="font-arabic mt-4 text-center" style={{ fontSize: 10.5, color: 'rgba(245,230,200,0.4)' }}>
        💎 {lang === 'ar' ? `إنشاء قبيلة جديدة يكلف 5,000 كوينز (لديك ${myCoins.toLocaleString()})` : `Creating a clan costs 5,000 coins (you have ${myCoins.toLocaleString()})`}
      </p>
    </div>
  );
}

function ClanCard({ c, isMine, canJoin, lang, onJoin }: { c: ClanSummary; isMine: boolean; canJoin: boolean; lang: string; onJoin: () => void }) {
  return (
    <div className="rounded-2xl p-3 flex items-center gap-3"
      style={{
        background: isMine ? 'rgba(201,168,76,0.10)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isMine ? 'rgba(201,168,76,0.45)' : 'rgba(255,255,255,0.06)'}`,
      }}>
      <div className="flex items-center justify-center rounded-xl shrink-0"
        style={{ width: 48, height: 48, background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(201,168,76,0.30)', fontSize: 26 }}>
        {c.emblem}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="font-arabic font-bold truncate" style={{ fontSize: 14, color: '#E8C97A' }}>{c.name}</p>
          <span className="font-mono rounded px-1.5"
            style={{ fontSize: 10, background: 'rgba(201,168,76,0.15)', color: '#E8C97A', letterSpacing: 1 }}>
            [{c.tag}]
          </span>
        </div>
        {c.description && (
          <p className="font-arabic truncate mt-0.5" style={{ fontSize: 10.5, color: 'rgba(245,230,200,0.5)' }}>
            {c.description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1 font-arabic" style={{ fontSize: 10.5, color: 'rgba(245,230,200,0.55)' }}>
          <span>👥 {c.memberCount}/{c.memberLimit}</span>
          <span>🏆 {c.totalWins.toLocaleString()}</span>
        </div>
      </div>
      {isMine ? (
        <span className="shrink-0 rounded-lg px-2.5 py-1 font-arabic"
          style={{ background: 'rgba(80,200,120,0.10)', color: 'rgba(80,200,120,0.85)', fontSize: 10.5 }}>
          ✓ {lang === 'ar' ? 'قبيلتك' : 'Yours'}
        </span>
      ) : canJoin && c.memberCount < c.memberLimit ? (
        <motion.button whileTap={{ scale: 0.96 }} onClick={onJoin}
          className="shrink-0 rounded-lg px-3 py-1.5 font-arabic font-bold"
          style={{ background: 'linear-gradient(135deg, #C9A84C, #A07830)', color: '#0E0905', fontSize: 11 }}>
          {lang === 'ar' ? 'انضم' : 'Join'}
        </motion.button>
      ) : c.memberCount >= c.memberLimit ? (
        <span className="shrink-0 rounded-lg px-2.5 py-1 font-arabic"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(245,230,200,0.4)', fontSize: 10.5 }}>
          {lang === 'ar' ? 'ممتلئة' : 'Full'}
        </span>
      ) : null}
    </div>
  );
}

function MineTab({ clan, myUid, lang, onLeft, refresh }: {
  clan: Clan | null;
  myUid?: string;
  lang: string;
  onLeft: () => void;
  refresh: () => void;
}) {
  const [confirmLeave, setConfirmLeave] = useState(false);
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
        <p className="font-arabic mt-1" style={{ fontSize: 11, color: 'rgba(245,230,200,0.35)' }}>
          {lang === 'ar' ? 'انضم من تبويب التصفّح أو أنشئ واحدة' : 'Join one or create your own'}
        </p>
      </div>
    );
  }

  async function doLeave() {
    setConfirmLeave(false);
    try {
      const res = await apiClient.post<{ profile: UserProfile; disbanded: boolean }>('/api/clans/leave', {});
      if (res?.profile) setProfile(res.profile);
      addToast(res.disbanded
        ? (lang === 'ar' ? 'تم حل القبيلة' : 'Clan disbanded')
        : (lang === 'ar' ? 'غادرت القبيلة' : 'Left the clan'),
        'success');
      onLeft();
    } catch (e: any) {
      addToast(e?.message || 'Failed', 'error');
    }
  }

  const sortedMembers = [...clan.members].sort((a, b) =>
    (a.role === 'leader' ? -1 : 1) - (b.role === 'leader' ? -1 : 1) || a.joinedAt - b.joinedAt
  );

  return (
    <div>
      {/* Banner */}
      <div className="rounded-2xl p-4 mb-4 text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(201,168,76,0.12), rgba(120,80,20,0.06))',
          border: '1px solid rgba(201,168,76,0.40)',
        }}>
        <div style={{ fontSize: 56 }}>{clan.emblem}</div>
        <h2 className="font-arabic font-bold mt-1" style={{ fontSize: 22, color: '#E8C97A' }}>
          {clan.name} <span className="font-mono" style={{ fontSize: 13, color: 'rgba(232,201,122,0.7)' }}>[{clan.tag}]</span>
        </h2>
        {clan.description && (
          <p className="font-arabic mt-2" style={{ fontSize: 12, color: 'rgba(245,230,200,0.65)' }}>{clan.description}</p>
        )}
        <div className="flex items-center justify-center gap-4 mt-3 font-arabic"
          style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.7)' }}>
          <span>👥 {clan.members.length}/{clan.memberLimit}</span>
          <span>🏆 {clan.totalWins.toLocaleString()}</span>
          <span>🎮 {clan.totalGames.toLocaleString()}</span>
        </div>
      </div>

      {/* Members */}
      <h3 className="font-arabic font-bold mb-2 px-1" style={{ fontSize: 12, color: 'rgba(201,168,76,0.85)' }}>
        {lang === 'ar' ? 'الأعضاء' : 'Members'}
      </h3>
      <div className="flex flex-col gap-1.5 mb-4">
        {sortedMembers.map(m => (
          <div key={m.uid} className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: m.uid === myUid ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 16 }}>{m.role === 'leader' ? '👑' : '👤'}</span>
            <span className="flex-1 font-arabic truncate" style={{ fontSize: 12.5, color: '#E8C97A' }}>
              {m.uid === myUid ? (lang === 'ar' ? 'أنت' : 'You') : m.displayName}
              {m.role === 'leader' && (
                <span className="font-arabic" style={{ marginInlineStart: 6, fontSize: 9.5, color: 'rgba(245,230,200,0.5)' }}>
                  · {lang === 'ar' ? 'القائد' : 'leader'}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      <button onClick={() => setConfirmLeave(true)}
        className="w-full rounded-xl py-2.5 font-arabic"
        style={{ background: 'rgba(224,64,48,0.08)', border: '1px solid rgba(224,64,48,0.30)', color: 'rgba(255,150,140,0.85)', fontSize: 12 }}>
        {lang === 'ar'
          ? `مغادرة${clan.leaderUid === myUid ? ' (سيُنقل القيادة لأقدم عضو)' : ''}`
          : `Leave${clan.leaderUid === myUid ? ' (leadership transfers)' : ''}`}
      </button>

      <ConfirmModal
        open={confirmLeave}
        title={lang === 'ar' ? 'مغادرة القبيلة' : 'Leave Clan'}
        message={clan.members.length === 1
          ? (lang === 'ar' ? 'أنت العضو الأخير — مغادرتك ستحلّ القبيلة نهائياً.' : "You're the last member — leaving will disband the clan permanently.")
          : (lang === 'ar' ? 'هل أنت متأكد من مغادرة القبيلة؟' : 'Sure you want to leave the clan?')}
        confirmLabel={lang === 'ar' ? 'مغادرة' : 'Leave'}
        cancelLabel={lang === 'ar' ? 'إلغاء' : 'Cancel'}
        tone="danger"
        lang={lang}
        onConfirm={doLeave}
        onCancel={() => setConfirmLeave(false)}
      />
    </div>
  );
}

function CreateTab({ lang, myCoins, onCreated }: { lang: string; myCoins: number; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [emblem, setEmblem] = useState(CLAN_EMBLEMS[0]);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const { setProfile } = useAuthStore();
  const { addToast } = useUiStore();
  const cantAfford = myCoins < 5000;

  async function create() {
    if (busy || cantAfford || !name.trim() || !tag.trim()) return;
    setBusy(true);
    soundService.playClick();
    try {
      const res = await apiClient.post<{ clan: Clan; profile: UserProfile }>('/api/clans', { name, tag, emblem, description });
      if (res?.profile) setProfile(res.profile);
      addToast(lang === 'ar' ? '🏰 تم إنشاء القبيلة!' : '🏰 Clan created!', 'success');
      onCreated();
    } catch (e: any) {
      soundService.playError();
      addToast(e?.message || 'Failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl p-4 space-y-4"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(201,168,76,0.20)' }}>
      <div>
        <p className="font-arabic mb-1.5" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.55)' }}>
          {lang === 'ar' ? 'اسم القبيلة (3-24 حرفاً)' : 'Clan Name (3-24 chars)'}
        </p>
        <input value={name} onChange={e => setName(e.target.value)} maxLength={24}
          placeholder={lang === 'ar' ? 'مثال: صقور الخليج' : 'e.g. Falcons of the Gulf'}
          className="w-full px-3 py-2 rounded-lg font-arabic"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.30)', color: '#E8C97A', fontSize: 13 }}/>
      </div>
      <div>
        <p className="font-arabic mb-1.5" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.55)' }}>
          {lang === 'ar' ? 'الرمز (2-5 حروف لاتينية، يطلع جنب اسمك [FALC])' : 'Tag (2-5 Latin letters, shows next to your name [FALC])'}
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
        <div className="grid grid-cols-6 gap-1.5">
          {CLAN_EMBLEMS.map(e => (
            <button key={e} onClick={() => { setEmblem(e); soundService.playClick(); }}
              className="rounded-lg p-2"
              style={{
                background: emblem === e ? 'rgba(201,168,76,0.20)' : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${emblem === e ? 'rgba(201,168,76,0.65)' : 'rgba(255,255,255,0.08)'}`,
                fontSize: 22,
              }}>{e}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="font-arabic mb-1.5" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.55)' }}>
          {lang === 'ar' ? 'وصف (اختياري)' : 'Description (optional)'}
        </p>
        <input value={description} onChange={e => setDescription(e.target.value.slice(0, 200))}
          placeholder={lang === 'ar' ? 'كلمة عن قبيلتك' : 'Say something about your clan'}
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
          ? (lang === 'ar' ? `تحتاج 5,000 كوينز (لديك ${myCoins.toLocaleString()})` : `Need 5,000 coins (you have ${myCoins.toLocaleString()})`)
          : (lang === 'ar' ? `🏰 أنشئ القبيلة (5,000 🪙)` : `🏰 Found Clan (5,000 🪙)`)}
      </motion.button>
    </div>
  );
}
