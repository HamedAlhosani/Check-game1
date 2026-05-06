import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/shared/Button';
import { useStoreStore } from '../../store/storeStore';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { apiClient } from '../../services/api.service';
import { soundService } from '../../services/sound.service';
import { useT, useLang } from '../../i18n/useT';
import { LangToggle } from '../../components/shared/LangToggle';
import { FrameRing } from '../../components/shared/FrameRing';
import {
  StoreItem, ItemCategory,
  CATEGORY_LABEL, RARITY_LABEL, RARITY_COLOR,
} from '@check-game/shared';
import { UserProfile } from '@check-game/shared';

const AVATAR_EMOJIS: Record<string, string> = {
  avatar_1: '👳', avatar_2: '🧕', avatar_3: '👴', avatar_4: '🧔',
  avatar_5: '👩', avatar_6: '👨', avatar_7: '🧑', avatar_8: '👵',
  avatar_9: '🕌', avatar_10: '🏙️', avatar_11: '💎', avatar_12: '🌟',
  avatar_13: '⚔️', avatar_14: '⛵', avatar_15: '🧭', avatar_16: '🇦🇪',
};

type TabType = ItemCategory | 'recharge';
// cardBack and boardTheme are already in ItemCategory

const COIN_PACKAGES = [
  { id: 'pkg_100', coins: 100, bonus: 0, price: 5, popular: false },
  { id: 'pkg_500', coins: 500, bonus: 50, price: 20, popular: false },
  { id: 'pkg_1000', coins: 1000, bonus: 150, price: 35, popular: true },
  { id: 'pkg_3000', coins: 3000, bonus: 500, price: 90, popular: false },
  { id: 'pkg_5000', coins: 5000, bonus: 1000, price: 150, popular: false },
  { id: 'pkg_10000', coins: 10000, bonus: 3000, price: 280, popular: false },
];

export function StorePage() {
  const t = useT();
  const lang = useLang();
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const { items, loading, fetchItems, purchase, equip } = useStoreStore();
  const { profile, setProfile } = useAuthStore();
  const { addToast } = useUiStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('character');
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<StoreItem | null>(null);

  const TABS: { id: TabType; label: string; icon: string }[] = [
    { id: 'character', label: t('store_characters'), icon: '🧑' },
    { id: 'avatarFrame', label: t('store_frames'), icon: '🖼' },
    { id: 'cardBack', label: lang === 'ar' ? 'كفر الأوراق' : 'Card Backs', icon: '🃏' },
    { id: 'boardTheme', label: lang === 'ar' ? 'ثيم الطاولة' : 'Tables', icon: '🟢' },
    { id: 'recharge', label: t('store_recharge'), icon: '💰' },
  ];

  useEffect(() => { fetchItems(); }, []);

  // After PayPal redirects back as /store?paid=1&token=<ORDER_ID>, capture
  // the order so the coins are credited. Refreshing the page is safe — the
  // server's capture endpoint is idempotent on PayPal's side.
  useEffect(() => {
    const url  = new URL(window.location.href);
    const paid = url.searchParams.get('paid');
    const orderId = url.searchParams.get('token');
    if (paid !== '1' || !orderId) return;
    // Strip the query string so a refresh doesn't re-trigger this.
    window.history.replaceState({}, '', url.pathname);
    (async () => {
      try {
        const res = await apiClient.post<{ profile?: UserProfile; granted?: number; error?: string }>(
          '/api/payments/capture', { orderId }
        );
        if (res?.profile) setProfile(res.profile);
        soundService.playCoins();
        addToast(
          lang === 'ar'
            ? `أُضيفت ${(res?.granted || 0).toLocaleString()} كوينز إلى رصيدك 🎉`
            : `${(res?.granted || 0).toLocaleString()} coins added to your balance 🎉`,
          'success'
        );
      } catch (e: any) {
        soundService.playError();
        addToast(e?.message || (lang === 'ar' ? 'فشل تأكيد الدفع' : 'Payment confirmation failed'), 'error');
      }
    })();
  }, []);

  const owned = profile?.ownedItems || [];
  const equipped = profile?.equippedItems || {};

  const filtered = activeTab !== 'recharge'
    ? items.filter(i => i.category === activeTab)
    : [];

  async function handleBuy(item: StoreItem) {
    if (busy) return;
    setBusy(item.id);
    soundService.playClick();
    try {
      await purchase(item.id);
      soundService.playCoins();
      addToast(t('store_purchase_success'), 'success');
    } catch (e: any) {
      soundService.playError();
      const msg = e.message || '';
      if (msg.includes('coins')) addToast(t('store_not_enough'), 'error');
      else if (msg.includes('owned')) addToast(t('store_owned'), 'error');
      else addToast(t('store_not_enough'), 'error');
    } finally {
      setBusy(null);
    }
  }

  async function handleEquip(item: StoreItem) {
    if (busy) return;
    setBusy(item.id);
    soundService.playClick();
    try {
      if (item.category === 'character') {
        const updated = await apiClient.patch<UserProfile>('/api/profile', { avatarId: item.id });
        setProfile(updated);
      } else {
        await equip(item.id);
      }
      addToast(t('store_equip_success'), 'success');
    } catch {
      addToast(t('profile_save_error'), 'error');
    } finally {
      setBusy(null);
    }
  }

  async function handleRecharge(packageId: string) {
    if (busy) return;
    setBusy(packageId);
    soundService.playClick();
    try {
      // Real money via PayPal. Falls back to the legacy test-mode recharge
      // if the server says PayPal isn't configured yet.
      const res = await apiClient.post<{ url?: string; error?: string }>('/api/payments/checkout', { packId: packageId });
      if (res?.url) {
        window.location.href = res.url;
        return;
      }
      throw new Error(res?.error || 'Checkout failed');
    } catch (e: any) {
      const msg = e?.message || '';
      // If PayPal isn't set up yet, hit the test-mode recharge so the dev
      // flow still works locally.
      if (/not configured|Unknown coin pack/i.test(msg)) {
        try {
          const res = await apiClient.post<{ profile: UserProfile; granted: number }>('/api/store/recharge', { packageId });
          if (res.profile) setProfile(res.profile);
          soundService.playCoins();
          addToast(
            lang === 'ar' ? `أُضيفت ${res.granted.toLocaleString()} كوينز (وضع تجريبي)` : `Added ${res.granted.toLocaleString()} coins (test mode)`,
            'success'
          );
        } catch (e2: any) {
          soundService.playError();
          addToast(e2?.message || 'error', 'error');
        }
      } else {
        soundService.playError();
        addToast(msg || 'Payment error', 'error');
      }
    } finally {
      setBusy(null);
    }
  }

  function isCharEquipped(item: StoreItem) {
    return item.category === 'character'
      ? profile?.avatarId === item.id
      : (equipped as any)[item.category] === item.id;
  }

  return (
    <div className="min-h-screen pb-16 sm:pb-0" style={{ background: 'linear-gradient(180deg, #14100A 0%, #1A1408 45%, #0E0905 100%)', direction: dir }}>
      {/* Nav */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-5 py-3 border-b border-white/5"
        style={{ background: 'rgba(20,14,8,0.96)', backdropFilter: 'blur(14px)' }}>
        <button onClick={() => navigate('/home')} className="flex items-center gap-2 transition-colors"
          style={{ color: 'rgba(245,230,200,0.45)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#C9A84C')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(245,230,200,0.45)')}>
          <span className="text-xl">{lang === 'ar' ? '←' : '→'}</span>
          <span className="font-arabic text-sm">{t('back')}</span>
        </button>
        <h1 className="font-display text-lg tracking-widest" style={{ color: '#C9A84C' }}>{t('store_title')}</h1>
        <div className="flex items-center gap-2">
          <LangToggle />
          <div className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 border border-gold/20"
            style={{ background: 'rgba(201,168,76,0.06)' }}>
            <span className="text-sm">🪙</span>
            <span className="font-bold font-mono text-sm" style={{ color: '#E8C97A' }}>{profile?.coins ?? 0}</span>
            <span className="font-arabic text-xs" style={{ color: 'rgba(245,230,200,0.35)' }}>{t('coins')}</span>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Tabs */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); soundService.playClick(); }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-sm font-arabic whitespace-nowrap transition-all flex-shrink-0
                ${activeTab === tab.id
                  ? tab.id === 'recharge'
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                    : 'border-gold bg-gold/10 text-gold'
                  : 'border-gold/15 text-sand/50 hover:border-gold/35 hover:text-sand/80'}`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Character tab */}
        {activeTab === 'character' && (
          <CharacterGrid
            items={filtered}
            owned={owned}
            currentAvatarId={profile?.avatarId || 'avatar_1'}
            coins={profile?.coins ?? 0}
            busy={busy}
            onBuy={handleBuy}
            onEquip={handleEquip}
            onPreview={setPreview}
            t={t}
            lang={lang}
          />
        )}

        {/* Regular item tabs */}
        {activeTab !== 'character' && activeTab !== 'recharge' && (
          <>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-52 rounded-2xl animate-pulse" style={{ background: 'rgba(201,168,76,0.04)' }} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtered.map(item => {
                  const isOwned = owned.includes(item.id);
                  const isEquipped = isCharEquipped(item);
                  const isBusy = busy === item.id;
                  return (
                    <ItemCard
                      key={item.id}
                      item={item}
                      isOwned={isOwned}
                      isEquipped={isEquipped}
                      isBusy={isBusy}
                      coins={profile?.coins ?? 0}
                      onBuy={handleBuy}
                      onEquip={handleEquip}
                      onPreview={setPreview}
                      t={t}
                      lang={lang}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Recharge tab */}
        {activeTab === 'recharge' && (
          <RechargeTab onRecharge={handleRecharge} busy={busy} t={t} lang={lang} />
        )}

      </div>

      {/* Preview Modal */}
      {preview && (
        <ItemPreviewModal
          item={preview}
          isOwned={owned.includes(preview.id) || preview.price === 0}
          isEquipped={isCharEquipped(preview)}
          coins={profile?.coins ?? 0}
          busy={busy === preview.id}
          onBuy={() => { handleBuy(preview); setPreview(null); }}
          onEquip={() => { handleEquip(preview); setPreview(null); }}
          onClose={() => setPreview(null)}
          t={t}
          lang={lang}
        />
      )}

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex sm:hidden items-center border-t"
        style={{ background: 'rgba(20,16,10,0.97)', backdropFilter: 'blur(12px)', borderColor: 'rgba(201,168,76,0.15)', height: 56 }}>
        {[
          { to: '/home', icon: '🏠', label: lang === 'ar' ? 'الرئيسية' : 'Home' },
          { to: '/store', icon: '🏪', label: lang === 'ar' ? 'المتجر' : 'Store' },
          { to: '/leaderboard', icon: '🏆', label: lang === 'ar' ? 'التصنيف' : 'Rank' },
          { to: '/friends', icon: '👥', label: lang === 'ar' ? 'أصدقاء' : 'Friends' },
          { to: '/profile', icon: '👤', label: lang === 'ar' ? 'حسابي' : 'Profile' },
        ].map(item => (
          <Link key={item.to} to={item.to}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all"
            style={{ color: 'rgba(245,230,200,0.5)', fontSize: 10 }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span className="font-arabic">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

// ── Character Grid ─────────────────────────────────────────────────────────────

function CharacterGrid({
  items, owned, currentAvatarId, coins, busy, onBuy, onEquip, onPreview, t, lang,
}: {
  items: StoreItem[];
  owned: string[];
  currentAvatarId: string;
  coins: number;
  busy: string | null;
  onBuy: (item: StoreItem) => void;
  onEquip: (item: StoreItem) => void;
  onPreview: (item: StoreItem) => void;
  t: (k: any) => string;
  lang: string;
}) {
  return (
    <div>
      <p className="text-sand/40 text-sm font-arabic mb-5 text-center">
        {lang === 'ar'
          ? 'اختر شخصيتك — الشخصيتان الأوليان مجانيتان للجميع'
          : 'Choose your character — first 2 are free for everyone'}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        {items.map(item => {
          const isOwned = item.price === 0 || owned.includes(item.id);
          const isActive = currentAvatarId === item.id;
          const isBusy = busy === item.id;
          const emoji = AVATAR_EMOJIS[item.id] || '👤';
          const canAfford = coins >= item.price;

          return (
            <div
              key={item.id}
              onClick={() => onPreview(item)}
              className={`relative rounded-2xl border overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.03]
                ${isActive
                  ? 'border-gold shadow-lg'
                  : isOwned
                    ? 'border-gold/30 hover:border-gold/60'
                    : 'border-white/8 hover:border-white/20'}`}
              style={isActive ? { boxShadow: '0 0 20px rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.05)' } : { background: 'rgba(10,18,32,0.7)' }}
            >
              <div className={`h-32 flex items-center justify-center relative ${item.preview.bg}`}>
                <span className="text-5xl select-none">{emoji}</span>
                {!isOwned && (
                  <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                    <span className="text-3xl">🔒</span>
                  </div>
                )}
                {isActive && (
                  <div className="absolute top-2 right-2 bg-gold text-night text-xs font-bold px-2 py-0.5 rounded-full font-arabic">
                    {lang === 'ar' ? 'مُفعَّل' : 'Active'}
                  </div>
                )}
                {item.price === 0 && (
                  <div className="absolute top-2 left-2 bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-bold px-2 py-0.5 rounded-full font-arabic">
                    {t('store_free')}
                  </div>
                )}
              </div>

              <div className="p-3">
                <p className="font-arabic text-sand-light text-sm font-semibold">
                  {lang === 'ar' ? item.nameAr : (item as any).nameEn || item.nameAr}
                </p>
                <p className={`text-xs font-arabic mt-0.5 ${RARITY_COLOR[item.rarity]}`}>
                  {RARITY_LABEL[item.rarity]}
                </p>

                <div className="mt-2.5" onClick={e => e.stopPropagation()}>
                  {isActive ? (
                    <div className="text-center py-1.5 text-gold text-xs font-arabic font-bold">
                      {lang === 'ar' ? '✓ شخصيتك الحالية' : '✓ Current character'}
                    </div>
                  ) : isOwned ? (
                    <button
                      onClick={() => onEquip(item)}
                      disabled={!!isBusy}
                      className="w-full py-1.5 rounded-lg border border-gold/40 text-gold text-xs font-arabic hover:bg-gold/10 transition-all disabled:opacity-50"
                    >
                      {isBusy ? '...' : t('store_equip')}
                    </button>
                  ) : (
                    <button
                      onClick={() => onBuy(item)}
                      disabled={!!isBusy || !canAfford}
                      className="w-full py-1.5 rounded-lg text-xs font-arabic transition-all disabled:opacity-40 flex items-center justify-center gap-1"
                      style={canAfford
                        ? { background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', color: '#C9A84C' }
                        : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(245,230,200,0.35)' }}
                    >
                      {isBusy ? '...' : (
                        <>
                          <span>🪙</span>
                          <span>{item.price.toLocaleString()}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Regular Item Card ──────────────────────────────────────────────────────────

function ItemCard({
  item, isOwned, isEquipped, isBusy, coins, onBuy, onEquip, onPreview, t, lang,
}: {
  item: StoreItem;
  isOwned: boolean;
  isEquipped: boolean;
  isBusy: boolean;
  coins: number;
  onBuy: (item: StoreItem) => void;
  onEquip: (item: StoreItem) => void;
  onPreview: (item: StoreItem) => void;
  t: (k: any) => string;
  lang: string;
}) {
  const isVisual = item.category === 'cardBack' || item.category === 'boardTheme';
  return (
    <div
      onClick={() => onPreview(item)}
      className={`relative rounded-2xl border overflow-hidden cursor-pointer transition-all hover:scale-[1.03]
        ${isEquipped ? 'border-gold shadow-md' : 'border-gold/15 hover:border-gold/35'}`}
      style={{ background: 'rgba(10,18,32,0.75)' }}
    >
      <div
        className={`h-28 flex items-center justify-center border-b ${isVisual ? '' : item.preview.bg} ${item.preview.border}`}
        style={isVisual ? { background: 'linear-gradient(160deg, #04080F 0%, #060C1E 100%)' } : undefined}
      >
        <SkinPreviewIcon item={item} size="lg" />
      </div>

      <div className="p-3">
        <p className="font-arabic text-sand-light text-sm font-semibold truncate">
          {lang === 'ar' ? item.nameAr : ((item as any).nameEn || item.nameAr)}
        </p>
        <p className={`text-xs font-arabic mt-0.5 ${RARITY_COLOR[item.rarity]}`}>
          {RARITY_LABEL[item.rarity]}
        </p>

        <div className="mt-2" onClick={e => e.stopPropagation()}>
          {isEquipped ? (
            <div className="text-center py-1 text-gold text-xs font-arabic font-bold">✓ {t('store_equipped')}</div>
          ) : isOwned ? (
            <button
              onClick={() => onEquip(item)}
              disabled={isBusy}
              className="w-full py-1.5 rounded-lg border border-gold/35 text-gold text-xs font-arabic hover:bg-gold/10 transition-all disabled:opacity-50"
            >
              {isBusy ? '...' : t('store_equip')}
            </button>
          ) : (
            <button
              onClick={() => onBuy(item)}
              disabled={isBusy || coins < item.price}
              className="w-full py-1.5 rounded-lg text-xs font-arabic transition-all disabled:opacity-40 flex items-center justify-center gap-1"
              style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.35)', color: '#C9A84C' }}
            >
              {isBusy ? '...' : (
                <>
                  <span>🪙</span>
                  <span>{item.price === 0 ? t('store_free') : item.price.toLocaleString()}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {isEquipped && (
        <div className="absolute top-2 right-2 bg-gold text-night text-xs font-bold px-1.5 py-0.5 rounded-full font-arabic">
          {t('store_equipped')}
        </div>
      )}
    </div>
  );
}

// ── Recharge Tab ───────────────────────────────────────────────────────────────

function RechargeTab({ t, lang }: { onRecharge: (packageId: string) => void; busy: string | null; t: (k: any) => string; lang: string }) {
  return (
    <div>
      <div className="text-center mb-6">
        <p className="text-4xl mb-3">🪙</p>
        <h2 className="font-arabic text-2xl font-bold text-gold mb-2">{t('store_recharge_title')}</h2>
        <p className="text-sand/45 text-sm font-arabic">
          {lang === 'ar'
            ? 'اربح كوينز من المباريات والمكافآت اليومية والمهام والإنجازات'
            : 'Earn coins from matches, daily rewards, missions, and achievements'}
        </p>
      </div>

      {/* Coming-soon banner — explains the real-money store is in development. */}
      <div className="rounded-2xl p-5 mb-6 border text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(201,168,76,0.10) 0%, rgba(120,80,20,0.06) 100%)',
          borderColor: 'rgba(201,168,76,0.40)',
          boxShadow: '0 0 24px rgba(201,168,76,0.10)',
        }}>
        <div className="text-3xl mb-2">🚧</div>
        <p className="font-arabic font-bold text-base mb-1.5" style={{ color: '#E8C97A' }}>
          {lang === 'ar' ? 'متجر الكوينز الحقيقي قريباً' : 'Real coin store coming soon'}
        </p>
        <p className="font-arabic" style={{ fontSize: 12, color: 'rgba(245,230,200,0.55)', lineHeight: 1.7 }}>
          {lang === 'ar'
            ? 'نشتغل على فتح الدفع الحقيقي قريباً. حالياً تقدر تكسب الكوينز من اللعب والمكافآت اليومية والمهام بدون أي فلوس.'
            : 'We\'re working on enabling real payments. For now, earn coins by playing, daily rewards, and completing missions — no money needed.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {COIN_PACKAGES.map(pkg => (
          <div
            key={pkg.id}
            className={`relative rounded-2xl p-5 border
              ${pkg.popular ? 'border-gold/35' : 'border-gold/15'}`}
            style={pkg.popular
              ? { background: 'rgba(201,168,76,0.05)' }
              : { background: 'rgba(10,18,32,0.55)' }}
          >
            {pkg.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold/70 text-night text-xs font-bold px-3 py-1 rounded-full font-arabic whitespace-nowrap">
                {lang === 'ar' ? 'الأكثر قيمة 🔥' : 'Best Value 🔥'}
              </div>
            )}

            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-2xl opacity-70">🪙</span>
                <span className="text-2xl font-bold font-mono" style={{ color: 'rgba(232,201,122,0.7)' }}>
                  {(pkg.coins + pkg.bonus).toLocaleString()}
                </span>
              </div>
              <p className="text-sand/40 text-xs font-arabic">
                {pkg.coins.toLocaleString()} {t('coins')}
                {pkg.bonus > 0 && (
                  <span className="text-emerald-400/70 font-bold">
                    {lang === 'ar' ? ` + ${pkg.bonus.toLocaleString()} مجاناً` : ` + ${pkg.bonus.toLocaleString()} free`}
                  </span>
                )}
              </p>
            </div>

            <button
              disabled
              className="w-full py-2.5 rounded-xl font-arabic font-bold text-sm cursor-not-allowed"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px dashed rgba(201,168,76,0.30)',
                color: 'rgba(232,201,122,0.55)',
              }}
            >
              🔜 {lang === 'ar' ? 'قريباً' : 'Coming soon'}
            </button>
            <p className="text-center text-sand/35 text-[10px] font-arabic mt-1.5">
              {lang === 'ar' ? `${pkg.price} درهم` : `${pkg.price} AED`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Card back theme colors ────────────────────────────────────────────────────
const CARD_BACK_STORE: Record<string, { bg1: string; bg2: string; accent: string }> = {
  card_classic: { bg1: '#080D22', bg2: '#040918', accent: '#C9A84C' },
  card_arabian: { bg1: '#0D0A2A', bg2: '#06040F', accent: '#6B8AFF' },
  card_desert:  { bg1: '#2A1208', bg2: '#180800', accent: '#E8903A' },
  card_pearl:   { bg1: '#1C1E24', bg2: '#0E1018', accent: '#D0D8E8' },
  card_uae:     { bg1: '#061A0C', bg2: '#020C05', accent: '#50C878' },
  card_galaxy:  { bg1: '#120828', bg2: '#06021A', accent: '#A06EFF' },
};

const BOARD_STORE: Record<string, { c1: string; c2: string; c3: string; rim1: string; rim2: string }> = {
  board_classic: { c1: '#17432E', c2: '#0D2D1F', c3: '#071810', rim1: '#1A2A3A', rim2: '#243548' },
  board_desert:  { c1: '#6B3A10', c2: '#4A2508', c3: '#2A1003', rim1: '#5A3010', rim2: '#7A4518' },
  board_oasis:   { c1: '#1A5A30', c2: '#104020', c3: '#082010', rim1: '#1A4028', rim2: '#286038' },
  board_night:   { c1: '#0A1840', c2: '#061028', c3: '#020810', rim1: '#102040', rim2: '#183058' },
  board_royal:   { c1: '#2A0A50', c2: '#1A0638', c3: '#0A0220', rim1: '#2A1050', rim2: '#3A1868' },
};

function CardBackMini({ id, size = 'lg' }: { id: string; size?: 'md' | 'lg' }) {
  const t = CARD_BACK_STORE[id] || CARD_BACK_STORE.card_classic;
  const uid = `store_${id}`;
  const w = size === 'lg' ? 56 : 36;
  const h = size === 'lg' ? 80 : 52;
  return (
    <svg width={w} height={h} viewBox="0 0 56 80" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: 5, display: 'block' }}>
      <defs>
        <linearGradient id={`s-bg-${uid}`} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor={t.bg1}/>
          <stop offset="100%" stopColor={t.bg2}/>
        </linearGradient>
        <radialGradient id={`s-glow-${uid}`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor={t.accent} stopOpacity="0.08"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0)"/>
        </radialGradient>
      </defs>
      <rect width="56" height="80" fill={`url(#s-bg-${uid})`} rx="4"/>
      <rect width="56" height="80" fill={`url(#s-glow-${uid})`} rx="4"/>
      {/* Outer border */}
      <rect x="2" y="2" width="52" height="76" rx="3" fill="none" stroke={t.accent} strokeWidth="0.8" opacity="0.7"/>
      {/* Inner border */}
      <rect x="4" y="4" width="48" height="72" rx="2" fill="none" stroke={t.accent} strokeWidth="0.35" opacity="0.3"/>
      {/* Crescent */}
      <path d="M28,10 A5,5 0 1,1 32,12.5 A4,4 0 1,0 28,10 Z" fill={t.accent} opacity="0.45"/>
      {/* 8-pt star center */}
      <g transform="translate(28,40)">
        <path d="M0,-9 L2,-2 L9,0 L2,2 L0,9 L-2,2 L-9,0 L-2,-2 Z" fill="none" stroke={t.accent} strokeWidth="0.7" opacity="0.65"/>
        <path d="M0,-9 L2,-2 L9,0 L2,2 L0,9 L-2,2 L-9,0 L-2,-2 Z" fill="none" stroke={t.accent} strokeWidth="0.5" opacity="0.3" transform="rotate(45)"/>
        <path d="M0,-4 L1,-1 L4,0 L1,1 L0,4 L-1,1 L-4,0 L-1,-1 Z" fill={t.accent} fillOpacity="0.25" stroke={t.accent} strokeWidth="0.5" opacity="0.7"/>
        <circle r="1.2" fill={t.accent} opacity="0.55"/>
      </g>
      {/* CHECK text */}
      <text x="28" y="56" textAnchor="middle" fill={t.accent} fontSize="4.5" fontFamily="Georgia, serif" fontWeight="bold" letterSpacing="2.5" opacity="0.7">CHECK</text>
      {/* Divider */}
      <line x1="9" y1="59" x2="47" y2="59" stroke={t.accent} strokeWidth="0.3" opacity="0.2"/>
      {/* Burj mini */}
      <g fill={t.accent} opacity="0.18" transform="translate(28,79)">
        <rect x="-0.4" y="-20" width="0.8" height="5"/>
        <rect x="-1" y="-15" width="2" height="3"/>
        <rect x="-1.7" y="-12" width="3.4" height="2.5"/>
        <rect x="-2.5" y="-9.5" width="5" height="2"/>
        <rect x="-3.5" y="-7.5" width="7" height="7.5"/>
      </g>
      {/* Corner ornaments */}
      <path d="M5,5 L9,5 M5,5 L5,9" stroke={t.accent} strokeWidth="0.6" opacity="0.5" strokeLinecap="round"/>
      <path d="M51,5 L47,5 M51,5 L51,9" stroke={t.accent} strokeWidth="0.6" opacity="0.5" strokeLinecap="round"/>
      <path d="M5,75 L9,75 M5,75 L5,71" stroke={t.accent} strokeWidth="0.6" opacity="0.5" strokeLinecap="round"/>
      <path d="M51,75 L47,75 M51,75 L51,71" stroke={t.accent} strokeWidth="0.6" opacity="0.5" strokeLinecap="round"/>
    </svg>
  );
}

function BoardThemeMini({ id, size = 'lg' }: { id: string; size?: 'md' | 'lg' }) {
  const th = BOARD_STORE[id] || BOARD_STORE.board_classic;
  const uid = `store_board_${id}`;
  const r = size === 'lg' ? 36 : 26;
  const rim = size === 'lg' ? 8 : 6;
  const cx = r + rim + 2;
  const viewSize = cx * 2;
  return (
    <svg width={viewSize} height={viewSize} viewBox={`0 0 ${viewSize} ${viewSize}`} xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <defs>
        <radialGradient id={`sb-felt-${uid}`} cx="44%" cy="30%" r="70%">
          <stop offset="0%" stopColor={th.c1}/>
          <stop offset="55%" stopColor={th.c2}/>
          <stop offset="100%" stopColor={th.c3}/>
        </radialGradient>
        <radialGradient id={`sb-rim-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={th.rim2}/>
          <stop offset="100%" stopColor={th.rim1}/>
        </radialGradient>
      </defs>
      {/* Rim */}
      <circle cx={cx} cy={cx} r={r + rim} fill={`url(#sb-rim-${uid})`}/>
      {/* Rim ring highlight */}
      <circle cx={cx} cy={cx} r={r + rim} fill="none" stroke="rgba(201,168,76,0.18)" strokeWidth="0.8"/>
      {/* Felt */}
      <circle cx={cx} cy={cx} r={r} fill={`url(#sb-felt-${uid})`}/>
      {/* Felt inner sheen */}
      <circle cx={cx - r*0.12} cy={cx - r*0.18} r={r * 0.55} fill="rgba(255,255,255,0.025)"/>
      {/* Inner dashed ring */}
      <circle cx={cx} cy={cx} r={r * 0.78} fill="none" stroke="rgba(201,168,76,0.13)" strokeWidth="0.5" strokeDasharray="2 2"/>
      {/* CHECK watermark */}
      <text x={cx} y={cx + 2.5} textAnchor="middle" fill="rgba(201,168,76,0.12)" fontSize={size === 'lg' ? 7 : 5} fontFamily="Georgia, serif" fontWeight="bold" letterSpacing="2">CHECK</text>
      {/* Deck dot */}
      <circle cx={cx - 7} cy={cx} r="3.5" fill="rgba(0,0,0,0.35)" stroke="rgba(201,168,76,0.25)" strokeWidth="0.6"/>
      <circle cx={cx + 7} cy={cx} r="3.5" fill="rgba(255,255,255,0.08)" stroke="rgba(201,168,76,0.18)" strokeWidth="0.6"/>
    </svg>
  );
}

// ── Skin preview icon ──────────────────────────────────────────────────────────

function SkinPreviewIcon({ item, size = 'md' }: { item: StoreItem; size?: 'md' | 'lg' }) {
  const s = size === 'lg' ? 'w-16 h-16' : 'w-10 h-10';

  if (item.category === 'avatarFrame') {
    const px = size === 'lg' ? 110 : 40;
    const wh = size === 'lg' ? 'w-[110px] h-[110px]' : 'w-10 h-10';
    return (
      <div className={`${wh} relative rounded-full flex items-center justify-center`}
        style={{ background: 'rgba(20,16,10,0.7)' }}>
        <span className="font-bold font-arabic" style={{ color: '#E8C97A', fontSize: size === 'lg' ? 32 : 18 }}>ل</span>
        <FrameRing frameId={item.id} size={px} />
      </div>
    );
  }
  if (item.category === 'cardBack') {
    return <CardBackMini id={item.id} size={size} />;
  }
  if (item.category === 'boardTheme') {
    return <BoardThemeMini id={item.id} size={size} />;
  }
  if (item.category === 'diceSkin') {
    return (
      <div className={`${s} rounded-xl ${item.preview.bg} border-2 ${item.preview.border} flex items-center justify-center shadow-inner`}>
        <span className={`text-xl ${item.preview.text}`}>⚄</span>
      </div>
    );
  }
  return (
    <div className={`${size === 'lg' ? 'w-20 h-14' : 'w-12 h-8'} rounded-lg ${item.preview.bg} border-2 ${item.preview.border} grid grid-cols-3 gap-0.5 p-1`}>
      {[...Array(6)].map((_, i) => (
        <div key={i} className={`rounded-sm ${item.preview.border} border opacity-40`} />
      ))}
    </div>
  );
}

// ── Item preview modal ─────────────────────────────────────────────────────────

interface ModalProps {
  item: StoreItem;
  isOwned: boolean;
  isEquipped: boolean;
  coins: number;
  busy: boolean;
  onBuy: () => void;
  onEquip: () => void;
  onClose: () => void;
  t: (k: any) => string;
  lang: string;
}

function ItemPreviewModal({ item, isOwned, isEquipped, coins, busy, onBuy, onEquip, onClose, t, lang }: ModalProps) {
  const isChar = item.category === 'character';
  const emoji = AVATAR_EMOJIS[item.id];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
      <div
        className="relative rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gold/25"
        style={{ background: '#1A1408' }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 left-3 text-sand/40 hover:text-sand text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5">×</button>

        <div className={`h-40 rounded-xl ${item.preview.bg} border-2 ${item.preview.border} flex items-center justify-center mb-4`}>
          {isChar && emoji
            ? <span className="text-6xl">{emoji}</span>
            : <SkinPreviewIcon item={item} size="lg" />
          }
        </div>

        <h2 className="font-arabic text-xl font-bold text-sand-light mb-1">
          {lang === 'ar' ? item.nameAr : (item as any).nameEn || item.nameAr}
        </h2>
        <p className={`text-sm font-arabic mb-1 ${RARITY_COLOR[item.rarity]}`}>{RARITY_LABEL[item.rarity]}</p>
        <p className="text-sand/45 text-sm font-arabic mb-5">
          {lang === 'ar' ? item.descriptionAr : (item as any).descriptionEn || item.descriptionAr}
        </p>

        {isEquipped ? (
          <div className="text-center py-2.5 text-gold font-arabic font-bold">
            {isChar
              ? (lang === 'ar' ? '✓ شخصيتك الحالية' : '✓ Current character')
              : `✓ ${t('store_equipped')}`}
          </div>
        ) : isOwned ? (
          <Button onClick={onEquip} className="w-full" disabled={busy}>
            {busy ? '...' : isChar
              ? (lang === 'ar' ? 'تفعيل الشخصية' : 'Set as character')
              : t('store_equip')}
          </Button>
        ) : (
          <Button onClick={onBuy} className="w-full" disabled={busy || coins < item.price}>
            {busy ? '...' : item.price === 0
              ? (lang === 'ar' ? 'احصل مجاناً' : 'Get for free')
              : `${t('store_buy')} 🪙 ${item.price.toLocaleString()} ${t('coins')}`}
          </Button>
        )}

        {!isOwned && item.price > 0 && coins < item.price && (
          <p className="text-center text-red-400 text-xs font-arabic mt-2">
            {lang === 'ar'
              ? `تحتاج ${(item.price - coins).toLocaleString()} كوينز إضافية`
              : `Need ${(item.price - coins).toLocaleString()} more coins`}
          </p>
        )}
      </div>
    </div>
  );
}
