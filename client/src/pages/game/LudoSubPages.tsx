import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLang } from '../../i18n/useT';
import { LangToggle } from '../../components/shared/LangToggle';
import { LudoPageBackground } from '../../components/game/ludo/BoardEmblems';
import { STORE_ITEMS, RARITY_LABEL, ItemCategory, MatchRecord, LeaderboardEntry } from '@check-game/shared';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { apiClient } from '../../services/api.service';
import { CharacterArt } from '../../components/shared/CharacterArt';
import { FrameRing } from '../../components/shared/FrameRing';

const SAND = {
  bg1: '#0E0905',
  gold: '#D9A441',
  goldLight: '#F6E6BE',
  cream: '#F4E4BE',
};

interface SubPageProps {
  icon: string;
  titleAr: string;
  titleEn: string;
  taglineAr: string;
  taglineEn: string;
  bullets: { ar: string; en: string }[];
}

function LudoSubPage({ icon, titleAr, titleEn, taglineAr, taglineEn, bullets }: SubPageProps) {
  const lang = useLang();
  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative" style={{ background: SAND.bg1, direction: dir }}>
      <LudoPageBackground />

      {/* Nav */}
      <nav className="sticky top-0 z-30 flex items-center justify-between px-3 py-2.5"
        style={{ background: 'rgba(8,4,2,0.88)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${SAND.gold}33` }}>
        <button onClick={() => navigate('/ludo')}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/5 transition"
          aria-label={isAr ? 'رجوع' : 'Back'}>
          <span style={{ fontSize: 18, color: SAND.gold }}>{isAr ? '→' : '←'}</span>
          <span className="font-arabic" style={{ fontSize: 12, color: SAND.cream }}>
            {isAr ? 'لودو' : 'Ludo'}
          </span>
        </button>
        <span className="font-display tracking-widest"
          style={{ fontSize: 14, color: SAND.gold, textShadow: `0 0 10px ${SAND.gold}99` }}>
          LUDO
        </span>
        <LangToggle />
      </nav>

      <main className="relative z-10 max-w-xl mx-auto px-4 pt-8 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-7 text-center relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${SAND.gold}24 0%, rgba(20,14,8,0.92) 70%)`,
            border: `2px solid ${SAND.gold}88`,
            boxShadow: `0 12px 40px rgba(0,0,0,0.6), 0 0 36px ${SAND.gold}33`,
          }}>
          <span style={{ fontSize: 72, lineHeight: 1, filter: `drop-shadow(0 0 22px ${SAND.gold})` }}>{icon}</span>
          <p className="font-arabic mt-3" style={{ fontSize: 11, letterSpacing: 5, color: `${SAND.gold}AA` }}>
            {isAr ? '✦ خاص بلودو ✦' : '✦ LUDO ONLY ✦'}
          </p>
          <h1 className="font-display tracking-widest mt-1"
            style={{ fontSize: 36, color: SAND.gold, letterSpacing: '0.16em', textShadow: `0 0 24px ${SAND.gold}66` }}>
            {isAr ? titleAr : titleEn}
          </h1>
          <p className="font-arabic italic mt-3" style={{ fontSize: 14, color: 'rgba(245,230,200,0.55)', lineHeight: 1.7 }}>
            {isAr ? taglineAr : taglineEn}
          </p>

          <div className="flex items-center justify-center gap-2 mt-5 mb-3">
            <div style={{ width: 60, height: 1, background: `linear-gradient(to right, transparent, ${SAND.gold}66)` }} />
            <span style={{ color: SAND.gold, fontSize: 14 }}>✦</span>
            <div style={{ width: 60, height: 1, background: `linear-gradient(to left, transparent, ${SAND.gold}66)` }} />
          </div>

          <p className="font-arabic font-bold mb-3" style={{ fontSize: 13, color: SAND.goldLight }}>
            {isAr ? 'قريباً • قيد البناء' : 'Coming soon · Under construction'}
          </p>

          <ul className="text-start space-y-2 inline-flex flex-col mt-2" style={{ direction: dir }}>
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 font-arabic" style={{ fontSize: 13, color: 'rgba(245,230,200,0.7)' }}>
                <span style={{ color: SAND.gold, marginTop: 2, fontSize: 11 }}>✦</span>
                <span>{isAr ? b.ar : b.en}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <p className="font-arabic text-center italic mt-6" style={{ fontSize: 11, color: 'rgba(245,230,200,0.30)' }}>
          {isAr
            ? 'هذا القسم منفصل عن تشيك تماماً — له عملته وبيانته الخاصة'
            : 'This section is fully separate from Check — its own currency and data'}
        </p>
      </main>
    </div>
  );
}

// ─── Per-category preview visuals (no more generic emoji on every card) ────
function ItemPreview({ item }: { item: typeof STORE_ITEMS[number] }) {
  if (item.category === 'character') {
    return (
      <div className="rounded-xl mb-2 flex items-center justify-center relative overflow-hidden"
        style={{
          height: 84,
          background: 'linear-gradient(135deg, #2A1F12 0%, #14100A 100%)',
          border: '1.5px solid rgba(201,168,76,0.30)',
        }}>
        <CharacterArt id={item.id} size={68} />
      </div>
    );
  }

  if (item.category === 'diceSkin') {
    // Render a tiny static dice using the item's preview palette.
    return (
      <div className={`rounded-xl mb-2 flex items-center justify-center ${item.preview.bg}`}
        style={{
          height: 84,
          border: '1.5px solid rgba(201,168,76,0.30)',
          backgroundImage: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.5), transparent 55%)',
        }}>
        <div className={`${item.preview.bg} ${item.preview.border} border-2`}
          style={{
            width: 48, height: 48, borderRadius: 10,
            boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.5), inset 0 -2px 0 rgba(0,0,0,0.25), 0 4px 8px rgba(0,0,0,0.4)',
            position: 'relative',
          }}>
          {/* 5 pips */}
          {[[12, 12], [36, 12], [24, 24], [12, 36], [36, 36]].map(([x, y], i) => (
            <div key={i} className={`${item.preview.text}`}
              style={{
                position: 'absolute', left: x, top: y,
                width: 6, height: 6, borderRadius: '50%',
                background: 'currentColor',
                boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.4)',
              }} />
          ))}
        </div>
      </div>
    );
  }

  // Board theme — mini cross-shaped board mockup
  return (
    <div className="rounded-xl mb-2 flex items-center justify-center"
      style={{
        height: 84,
        background: 'linear-gradient(135deg, #2A1F12 0%, #14100A 100%)',
        border: '1.5px solid rgba(201,168,76,0.30)',
      }}>
      <div className={`${item.preview.bg} ${item.preview.border} border-2 rounded-md grid relative`}
        style={{
          width: 60, height: 60,
          gridTemplateColumns: 'repeat(5, 1fr)',
          gridTemplateRows: 'repeat(5, 1fr)',
          gap: 1,
          padding: 2,
        }}>
        {/* Mini cross — 4 corner home tiles + cross arms */}
        {[
          [0, 0, '#E74C3C'], [0, 4, '#4A90D9'],
          [4, 0, '#F1C40F'], [4, 4, '#7AC74F'],
          [2, 0, 'transparent'], [2, 1, 'transparent'], [2, 3, 'transparent'], [2, 4, 'transparent'],
          [0, 2, 'transparent'], [1, 2, 'transparent'], [3, 2, 'transparent'], [4, 2, 'transparent'],
          [2, 2, 'rgba(255,255,255,0.55)'],
        ].map(([r, c, bg], i) => (
          <div key={i} style={{
            gridRow: (r as number) + 1, gridColumn: (c as number) + 1,
            background: bg as string,
            borderRadius: 2,
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── REAL Ludo store: dice / boards / characters, paid in ludoCoins ────────
const LUDO_CATEGORIES: { id: 'all' | ItemCategory; ar: string; en: string; icon: string }[] = [
  { id: 'all',        ar: 'الكل',     en: 'All',        icon: '✨' },
  { id: 'diceSkin',   ar: 'النرد',    en: 'Dice',       icon: '🎲' },
  { id: 'boardTheme', ar: 'الطاولات', en: 'Boards',     icon: '🟫' },
  { id: 'character',  ar: 'الشخصيات', en: 'Characters', icon: '👤' },
];

const RARITY_RING: Record<string, string> = {
  free:      '#9CA3AF',
  bronze:    '#A57440',
  silver:    '#C0C8D8',
  gold:      '#E8C97A',
  legendary: '#7DD8E8',
};

export function LudoStorePage() {
  const lang = useLang();
  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const navigate = useNavigate();
  const { profile, setProfile } = useAuthStore();
  const { addToast } = useUiStore();
  const [tab, setTab] = useState<'all' | ItemCategory>('all');
  const [busyItem, setBusyItem] = useState<string | null>(null);

  const ludoCoins = (profile as any)?.ludoCoins ?? 0;
  const owned = new Set(profile?.ownedItems ?? []);
  const eligibleCats: ItemCategory[] = ['diceSkin', 'boardTheme', 'character'];
  const items = STORE_ITEMS.filter(it => eligibleCats.includes(it.category))
                           .filter(it => tab === 'all' || it.category === tab);

  useEffect(() => {
    if (!profile) return;
    // refresh in case the store opened after a tournament/wheel reward
  }, [profile]);

  const buy = async (itemId: string) => {
    if (busyItem) return;
    setBusyItem(itemId);
    try {
      const res = await apiClient.post<{ ok: boolean; profile: any }>('/api/ludo-store/purchase', { itemId });
      if (res.profile) setProfile(res.profile);
      addToast(isAr ? '✨ تم الشراء' : '✨ Purchased', 'success');
    } catch (e: any) {
      addToast(e?.message || (isAr ? 'فشل الشراء' : 'Purchase failed'), 'error');
    } finally {
      setBusyItem(null);
    }
  };

  const equip = async (itemId: string) => {
    if (busyItem) return;
    setBusyItem(itemId);
    try {
      const res = await apiClient.patch<{ ok: boolean; profile: any }>('/api/store/equip', { itemId });
      if (res.profile) setProfile(res.profile);
      addToast(isAr ? '✓ تم التجهيز' : '✓ Equipped', 'success');
    } catch (e: any) {
      addToast(e?.message || (isAr ? 'فشل التجهيز' : 'Equip failed'), 'error');
    } finally {
      setBusyItem(null);
    }
  };

  return (
    <div className="min-h-screen relative" style={{ background: SAND.bg1, direction: dir }}>
      <LudoPageBackground />

      <nav className="sticky top-0 z-30 flex items-center justify-between px-3 py-2.5"
        style={{ background: '#0E0905', borderBottom: `1.5px solid ${SAND.gold}55`, boxShadow: '0 4px 18px rgba(0,0,0,0.5)' }}>
        <button onClick={() => navigate('/ludo')}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/5 transition">
          <span style={{ fontSize: 18, color: SAND.gold }}>{isAr ? '→' : '←'}</span>
          <span className="font-arabic" style={{ fontSize: 12, color: SAND.cream }}>{isAr ? 'لودو' : 'Ludo'}</span>
        </button>
        <span className="font-display tracking-widest" style={{ fontSize: 14, color: SAND.gold }}>
          {isAr ? 'متجر لودو' : 'LUDO STORE'}
        </span>
        <div className="flex items-center gap-2">
          <div className="rounded-xl px-2.5 py-1 flex items-center gap-1.5"
            style={{ background: '#14100A', border: `1.5px solid ${SAND.gold}77` }}>
            <span style={{ fontSize: 14 }}>🪙</span>
            <span className="font-mono font-bold" style={{ fontSize: 13, color: SAND.gold }}>{ludoCoins.toLocaleString()}</span>
          </div>
          <LangToggle />
        </div>
      </nav>

      <main className="relative z-10 max-w-2xl mx-auto px-3 pt-4 pb-12">
        {/* Category tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {LUDO_CATEGORIES.map(cat => {
            const sel = tab === cat.id;
            return (
              <button key={cat.id}
                onClick={() => setTab(cat.id)}
                className="rounded-xl font-arabic font-bold flex items-center gap-1.5 shrink-0 transition-all"
                style={{
                  padding: sel ? '8px 14px' : '7px 12px',
                  background: sel ? SAND.gold : '#1A1408',
                  color: sel ? '#0E0905' : 'rgba(245,230,200,0.7)',
                  border: `1.5px solid ${sel ? SAND.gold : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: sel ? `0 0 18px ${SAND.gold}66` : 'none',
                  fontSize: 12, cursor: 'pointer',
                }}>
                <span style={{ fontSize: 14, lineHeight: 1 }}>{cat.icon}</span>
                {isAr ? cat.ar : cat.en}
              </button>
            );
          })}
        </div>

        {/* Items grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map(item => {
            const isOwned = owned.has(item.id);
            const isEquipped =
              (item.category === 'diceSkin'   && profile?.equippedItems?.diceSkin   === item.id) ||
              (item.category === 'boardTheme' && profile?.equippedItems?.boardTheme === item.id) ||
              (item.category === 'character'  && profile?.equippedItems?.character  === item.id);
            const ringColor = RARITY_RING[item.rarity] || SAND.gold;
            const canBuy = !isOwned && ludoCoins >= item.price;
            return (
              <div key={item.id} className="rounded-2xl p-3 flex flex-col"
                style={{
                  background: '#14100A',
                  border: `2px solid ${ringColor}66`,
                  boxShadow: isEquipped ? `0 0 22px ${ringColor}99` : `0 4px 12px rgba(0,0,0,0.5)`,
                }}>
                {/* Preview swatch — different visual per category */}
                <ItemPreview item={item} />
                <p className="font-arabic font-bold truncate" style={{ fontSize: 12, color: SAND.cream }}>
                  {item.nameAr}
                </p>
                <p className="font-arabic" style={{ fontSize: 10, color: ringColor, marginTop: 1 }}>
                  {RARITY_LABEL[item.rarity]}
                </p>
                <div className="flex items-center justify-between mt-2 gap-1">
                  <div className="flex items-center gap-1 font-mono"
                    style={{ fontSize: 12, color: canBuy || isOwned ? SAND.gold : '#FF8A65' }}>
                    🪙 {item.price.toLocaleString()}
                  </div>
                  {isEquipped ? (
                    <span className="font-arabic font-bold rounded-md px-2 py-1"
                      style={{ background: `${ringColor}22`, color: ringColor, fontSize: 10 }}>
                      ✓ مُجهّز
                    </span>
                  ) : isOwned ? (
                    <button onClick={() => equip(item.id)}
                      disabled={busyItem === item.id}
                      className="font-arabic font-bold rounded-md px-2.5 py-1 disabled:opacity-50"
                      style={{ background: SAND.gold, color: '#0E0905', fontSize: 11, cursor: 'pointer' }}>
                      جهّز
                    </button>
                  ) : (
                    <button onClick={() => buy(item.id)}
                      disabled={!canBuy || busyItem === item.id}
                      className="font-arabic font-bold rounded-md px-2.5 py-1 disabled:opacity-40"
                      style={{
                        background: canBuy
                          ? `linear-gradient(135deg, ${SAND.goldLight}, ${SAND.gold})`
                          : 'rgba(255,255,255,0.04)',
                        color: canBuy ? '#0E0905' : 'rgba(255,255,255,0.4)',
                        fontSize: 11,
                        cursor: canBuy ? 'pointer' : 'not-allowed',
                      }}>
                      {busyItem === item.id ? '…' : 'اشترِ'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

// ─── Shared chrome for the real subpages ────────────────────────────────────
function LudoSubShell({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  const lang = useLang();
  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const navigate = useNavigate();
  return (
    <div className="min-h-screen relative" style={{ background: SAND.bg1, direction: dir }}>
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
          <span style={{ fontSize: 16 }}>{icon}</span>
          {title}
        </span>
        <LangToggle />
      </nav>
      <main className="relative z-10 max-w-2xl mx-auto px-3 pt-4 pb-12">
        {children}
      </main>
    </div>
  );
}

// ─── REAL Leaderboard — pulls top players, ranks by ludoWins ───────────────
function _LudoLeaderboardPage_unused() {
  const lang = useLang();
  const isAr = lang === 'ar';
  const { user } = useAuthStore();
  const [tab, setTab] = useState<'global' | 'friends'>('global');
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    apiClient.get<LeaderboardEntry[]>('/api/leaderboard')
      .then(setEntries)
      .catch(() => setEntries([]));
  }, []);

  const sorted = (entries || [])
    .map(e => ({ ...e, score: (e as any).ludoWins ?? 0 }))
    .sort((a, b) => b.score - a.score);

  return (
    <LudoSubShell title={isAr ? 'تصنيف لودو' : 'LUDO LEADERBOARD'} icon="🏆">
      <div className="flex gap-2 mb-4">
        {(['global', 'friends'] as const).map(t => {
          const sel = tab === t;
          return (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 rounded-xl font-arabic font-bold py-2"
              style={{
                background: sel ? SAND.gold : '#1A1408',
                color: sel ? '#0E0905' : 'rgba(245,230,200,0.65)',
                border: `1.5px solid ${sel ? SAND.gold : 'rgba(255,255,255,0.08)'}`,
                fontSize: 13, cursor: 'pointer',
                boxShadow: sel ? `0 0 16px ${SAND.gold}55` : 'none',
              }}>
              {t === 'global' ? (isAr ? 'عالمي' : 'Global') : (isAr ? 'الأصدقاء' : 'Friends')}
            </button>
          );
        })}
      </div>

      {entries === null ? (
        <p className="text-center font-arabic animate-pulse" style={{ color: SAND.gold, fontSize: 12 }}>…</p>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl p-6 text-center" style={{ background: '#14100A', border: `1px dashed ${SAND.gold}55` }}>
          <span style={{ fontSize: 36 }}>🎲</span>
          <p className="font-arabic mt-2" style={{ fontSize: 13, color: 'rgba(245,230,200,0.55)' }}>
            {isAr ? 'لا يوجد لاعبون بعد — كن الأول!' : 'No players yet — be the first!'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.slice(0, 50).map((e, i) => {
            const isMe = e.uid === user?.uid;
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
            return (
              <div key={e.uid} className="rounded-xl flex items-center gap-3 px-3 py-2"
                style={{
                  background: isMe ? `linear-gradient(135deg, ${SAND.gold}28, #14100A)` : '#14100A',
                  border: `1.5px solid ${isMe ? SAND.gold : 'rgba(255,255,255,0.06)'}`,
                  boxShadow: isMe ? `0 0 14px ${SAND.gold}55` : 'none',
                }}>
                <div className="font-mono font-bold shrink-0" style={{ width: 28, fontSize: 13, color: SAND.gold }}>
                  {medal || `#${i + 1}`}
                </div>
                <div className="relative shrink-0" style={{ width: 32, height: 32 }}>
                  <CharacterArt id={e.avatarId} size={32} />
                  <FrameRing size={32} frameId={(e as any).equippedFrame} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-arabic font-bold truncate" style={{ fontSize: 13, color: SAND.cream }}>
                    {isMe ? (isAr ? 'أنت' : 'You') : e.displayName}
                  </p>
                  <p className="font-arabic" style={{ fontSize: 10, color: 'rgba(245,230,200,0.45)' }}>
                    {isAr ? `مستوى ${e.level}` : `Level ${e.level}`}
                  </p>
                </div>
                <div className="font-mono font-bold shrink-0 text-end"
                  style={{ fontSize: 15, color: SAND.gold, minWidth: 40 }}>
                  {e.score}
                  <p className="font-arabic" style={{ fontSize: 9, color: 'rgba(245,230,200,0.4)' }}>
                    {isAr ? 'فوز' : 'wins'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </LudoSubShell>
  );
}

// ─── REAL History — filter MatchRecord by gameType:'ludo' ───────────────────
export function LudoHistoryPage() {
  const lang = useLang();
  const isAr = lang === 'ar';
  const { user } = useAuthStore();
  const [records, setRecords] = useState<MatchRecord[] | null>(null);

  useEffect(() => {
    apiClient.get<MatchRecord[]>('/api/history')
      .then(r => setRecords(r.filter(rec => rec.gameType === 'ludo')))
      .catch(() => setRecords([]));
  }, []);

  const ago = (ts: number) => {
    const diff = (Date.now() - ts) / 1000;
    if (diff < 60) return isAr ? 'الآن' : 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}${isAr ? 'د' : 'm'}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}${isAr ? 'س' : 'h'}`;
    return `${Math.floor(diff / 86400)}${isAr ? 'ي' : 'd'}`;
  };

  return (
    <LudoSubShell title={isAr ? 'سجل لودو' : 'LUDO HISTORY'} icon="📜">
      {records === null ? (
        <p className="text-center font-arabic animate-pulse" style={{ color: SAND.gold }}>…</p>
      ) : records.length === 0 ? (
        <div className="rounded-2xl p-6 text-center" style={{ background: '#14100A', border: `1px dashed ${SAND.gold}55` }}>
          <span style={{ fontSize: 36 }}>🎲</span>
          <p className="font-arabic mt-2" style={{ fontSize: 13, color: 'rgba(245,230,200,0.55)' }}>
            {isAr ? 'لا يوجد مباريات لودو بعد' : 'No Ludo matches yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((rec, i) => {
            const isWin = rec.winnerId === user?.uid;
            return (
              <div key={rec.gameId + i} className="rounded-xl px-3 py-2.5"
                style={{
                  background: '#14100A',
                  border: `1.5px solid ${isWin ? '#7AC74F88' : 'rgba(255,255,255,0.06)'}`,
                }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-arabic font-bold rounded-md px-2 py-0.5"
                    style={{
                      fontSize: 11,
                      background: isWin ? 'rgba(122,199,79,0.18)' : 'rgba(255,255,255,0.04)',
                      color: isWin ? '#7AC74F' : 'rgba(245,230,200,0.55)',
                      border: `1px solid ${isWin ? 'rgba(122,199,79,0.40)' : 'rgba(255,255,255,0.08)'}`,
                    }}>
                    {isWin ? (isAr ? '🏆 فوز' : '🏆 Win') : (isAr ? 'خسارة' : 'Loss')}
                  </span>
                  <span className="font-arabic" style={{ fontSize: 10, color: 'rgba(245,230,200,0.40)' }}>
                    {ago(rec.playedAt)} · {rec.players.length} {isAr ? 'لاعبين' : 'players'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {rec.players.map(p => {
                    const isWinner = p.uid === rec.winnerId;
                    const isMe = p.uid === user?.uid;
                    return (
                      <div key={p.uid} className="flex items-center gap-1.5 rounded-md px-2 py-1"
                        style={{
                          background: isWinner ? 'rgba(232,201,122,0.10)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${isMe ? `${SAND.gold}66` : isWinner ? `${SAND.gold}33` : 'rgba(255,255,255,0.06)'}`,
                        }}>
                        <CharacterArt id={p.avatarId} size={20} />
                        <span className="font-arabic" style={{ fontSize: 10, color: isMe ? SAND.gold : 'rgba(245,230,200,0.7)' }}>
                          {isMe ? (isAr ? 'أنت' : 'You') : p.displayName}
                        </span>
                        {isWinner && <span style={{ fontSize: 10 }}>🏆</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </LudoSubShell>
  );
}

// Friends, Clans, and Leaderboard live in their own files (full feature
// parity with the Check versions, sand-themed). Re-export under the
// original names so /ludo/* routes pick them up.
export { LudoFriendsPageFull as LudoFriendsPage } from './LudoFriendsPageFull';
export { LudoClansPageFull as LudoClansPage } from './LudoClansPageFull';
export { LudoLeaderboardPageFull as LudoLeaderboardPage } from './LudoLeaderboardPageFull';

// ─── Friends — same data, Ludo chrome + private-room invite shortcut ────────
interface FriendEntry { uid: string; displayName: string; username: string; avatarId: string; level: number; wins: number; }

function _LudoFriendsPage_unused() {
  const lang = useLang();
  const isAr = lang === 'ar';
  const navigate = useNavigate();
  const [friends, setFriends] = useState<FriendEntry[] | null>(null);

  useEffect(() => {
    apiClient.get<FriendEntry[]>('/api/friends')
      .then(setFriends)
      .catch(() => setFriends([]));
  }, []);

  return (
    <LudoSubShell title={isAr ? 'أصدقاء لودو' : 'LUDO FRIENDS'} icon="👥">
      <button onClick={() => navigate('/friends')}
        className="w-full rounded-xl py-2.5 font-arabic font-bold mb-3"
        style={{
          background: `linear-gradient(135deg, ${SAND.goldLight}, ${SAND.gold})`,
          color: '#0E0905', fontSize: 13,
          boxShadow: `0 0 18px ${SAND.gold}55`,
          cursor: 'pointer',
        }}>
        ＋ {isAr ? 'أضف صديقاً جديداً' : 'Add a new friend'}
      </button>

      {friends === null ? (
        <p className="text-center font-arabic animate-pulse" style={{ color: SAND.gold }}>…</p>
      ) : friends.length === 0 ? (
        <div className="rounded-2xl p-6 text-center" style={{ background: '#14100A', border: `1px dashed ${SAND.gold}55` }}>
          <span style={{ fontSize: 36 }}>👥</span>
          <p className="font-arabic mt-2" style={{ fontSize: 13, color: 'rgba(245,230,200,0.55)' }}>
            {isAr ? 'لا أصدقاء بعد — أضف خصومك' : 'No friends yet — add some'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {friends.map(f => (
            <div key={f.uid} className="rounded-xl flex items-center gap-3 px-3 py-2"
              style={{ background: '#14100A', border: `1.5px solid ${SAND.gold}33` }}>
              <CharacterArt id={f.avatarId} size={36} />
              <div className="flex-1 min-w-0">
                <p className="font-arabic font-bold truncate" style={{ fontSize: 13, color: SAND.cream }}>
                  {f.displayName}
                </p>
                <p style={{ fontSize: 10, color: 'rgba(245,230,200,0.4)', direction: 'ltr' }}>
                  {f.username}
                </p>
              </div>
              <div className="text-end shrink-0">
                <p className="font-mono font-bold" style={{ fontSize: 13, color: SAND.gold }}>{f.wins}</p>
                <p className="font-arabic" style={{ fontSize: 9, color: 'rgba(245,230,200,0.4)' }}>
                  {isAr ? 'انتصارات' : 'wins'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </LudoSubShell>
  );
}

// ─── Clans — link to existing clan system, Ludo chrome ──────────────────────
function _LudoClansPage_unused() {
  const lang = useLang();
  const isAr = lang === 'ar';
  const navigate = useNavigate();

  return (
    <LudoSubShell title={isAr ? 'قبائل لودو' : 'LUDO CLANS'} icon="🛡️">
      <div className="rounded-2xl p-5 mb-4"
        style={{
          background: `linear-gradient(135deg, ${SAND.gold}22, #14100A)`,
          border: `2px solid ${SAND.gold}77`,
          boxShadow: `0 0 26px ${SAND.gold}33`,
        }}>
        <span style={{ fontSize: 40, lineHeight: 1 }}>🛡️</span>
        <h2 className="font-arabic font-bold mt-2" style={{ fontSize: 18, color: SAND.cream }}>
          {isAr ? 'قبيلتك ميدانك' : 'Your Clan, Your Arena'}
        </h2>
        <p className="font-arabic mt-1" style={{ fontSize: 12, color: 'rgba(245,230,200,0.6)', lineHeight: 1.6 }}>
          {isAr
            ? 'انضم لقبيلة موجودة أو أنشئ قبيلتك. القبائل تتنافس في بطولات لودو الأسبوعية.'
            : 'Join an existing clan or start your own. Clans compete in weekly Ludo tournaments.'}
        </p>
        <button onClick={() => navigate('/clans')}
          className="mt-3 rounded-xl py-2 px-5 font-arabic font-bold"
          style={{
            background: `linear-gradient(135deg, ${SAND.goldLight}, ${SAND.gold})`,
            color: '#0E0905', fontSize: 13,
            boxShadow: `0 0 18px ${SAND.gold}55`,
            cursor: 'pointer',
          }}>
          {isAr ? 'تصفح القبائل ←' : 'Browse Clans →'}
        </button>
      </div>

      <p className="font-arabic text-center" style={{ fontSize: 11, color: 'rgba(245,230,200,0.40)' }}>
        {isAr
          ? 'البطولات الحصرية للقبائل تنطلق قريباً'
          : 'Clan-only tournaments launching soon'}
      </p>
    </LudoSubShell>
  );
}

// ─── Tournaments — link to existing tournaments, themed for Ludo ────────────
export function LudoTournamentsPage() {
  const lang = useLang();
  const isAr = lang === 'ar';
  const navigate = useNavigate();

  return (
    <LudoSubShell title={isAr ? 'بطولات لودو' : 'LUDO TOURNAMENTS'} icon="🎯">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Solo */}
        <div className="rounded-2xl p-4 flex flex-col"
          style={{
            background: `linear-gradient(135deg, ${SAND.gold}22, #14100A)`,
            border: `2px solid ${SAND.gold}77`,
            boxShadow: `0 0 22px ${SAND.gold}33`,
          }}>
          <span style={{ fontSize: 36, lineHeight: 1 }}>🏆</span>
          <h3 className="font-arabic font-bold mt-2" style={{ fontSize: 15, color: SAND.cream }}>
            {isAr ? 'بطولة فردية' : 'Solo Cup'}
          </h3>
          <p className="font-arabic mt-1 flex-1" style={{ fontSize: 11, color: 'rgba(245,230,200,0.55)' }}>
            {isAr ? 'تنافس وحدك ضد لاعبين من العالم' : 'Compete solo against the world'}
          </p>
          <button onClick={() => navigate('/tournaments')}
            className="mt-3 rounded-xl py-2 font-arabic font-bold"
            style={{
              background: SAND.gold, color: '#0E0905', fontSize: 12,
              cursor: 'pointer',
            }}>
            {isAr ? 'افتح البطولات' : 'Open tournaments'}
          </button>
        </div>

        {/* Clan */}
        <div className="rounded-2xl p-4 flex flex-col"
          style={{
            background: `linear-gradient(135deg, #2A1808, #14100A)`,
            border: `2px dashed ${SAND.gold}55`,
          }}>
          <span style={{ fontSize: 36, lineHeight: 1, opacity: 0.6 }}>🛡️</span>
          <h3 className="font-arabic font-bold mt-2" style={{ fontSize: 15, color: SAND.cream }}>
            {isAr ? 'بطولة قبائل' : 'Clan Cup'}
          </h3>
          <p className="font-arabic mt-1 flex-1" style={{ fontSize: 11, color: 'rgba(245,230,200,0.55)' }}>
            {isAr ? '٤×٤ — قبيلة ضد قبيلة. تنطلق قريباً.' : '4-vs-4 clan brackets. Launching soon.'}
          </p>
          <button disabled
            className="mt-3 rounded-xl py-2 font-arabic font-bold opacity-50"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(245,230,200,0.5)',
              fontSize: 12,
              cursor: 'not-allowed',
            }}>
            {isAr ? 'قريباً' : 'Soon'}
          </button>
        </div>
      </div>
    </LudoSubShell>
  );
}
