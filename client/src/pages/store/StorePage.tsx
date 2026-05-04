import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/shared/Button';
import { useStoreStore } from '../../store/storeStore';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { apiClient } from '../../services/api.service';
import { soundService } from '../../services/sound.service';
import { useT, useLang } from '../../i18n/useT';
import { LangToggle } from '../../components/shared/LangToggle';
import {
  StoreItem, ItemCategory,
  CATEGORY_LABEL, RARITY_LABEL, RARITY_COLOR,
} from '@check-game/shared';
import { UserProfile } from '@check-game/shared';

const AVATAR_EMOJIS: Record<string, string> = {
  avatar_1: '🦅', avatar_2: '🐪', avatar_3: '🌴', avatar_4: '⚔️',
  avatar_5: '🌙', avatar_6: '⭐', avatar_7: '🏜️', avatar_8: '🌊',
  avatar_9: '🦁', avatar_10: '🔥', avatar_11: '💎', avatar_12: '🎭',
};

type TabType = ItemCategory | 'recharge';

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
    { id: 'character', label: t('store_characters'), icon: '👥' },
    { id: 'avatarFrame', label: t('store_frames'), icon: '🖼' },
    { id: 'recharge', label: t('store_recharge'), icon: '💰' },
  ];

  useEffect(() => { fetchItems(); }, []);

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

  function handleRecharge() {
    soundService.playClick();
    addToast(t('store_recharge_soon'), 'info');
  }

  function isCharEquipped(item: StoreItem) {
    return item.category === 'character'
      ? profile?.avatarId === item.id
      : (equipped as any)[item.category] === item.id;
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #030610 0%, #050413 50%, #07040F 100%)', direction: dir }}>
      {/* Nav */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-5 py-3 border-b border-white/5"
        style={{ background: 'rgba(4,8,15,0.96)', backdropFilter: 'blur(14px)' }}>
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
                    />
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Recharge tab */}
        {activeTab === 'recharge' && (
          <RechargeTab onRecharge={handleRecharge} t={t} lang={lang} />
        )}

        {/* Earn coins hint */}
        {activeTab !== 'recharge' && (
          <div className="mt-8 rounded-2xl p-4 text-center border border-gold/10"
            style={{ background: 'rgba(201,168,76,0.03)' }}>
            <p className="text-sand/45 text-sm font-arabic">
              🪙 {lang === 'ar'
                ? <>اكسب <span className="text-gold font-bold">5 كوينز</span> لكل لعبة و <span className="text-gold font-bold">15 كوينز</span> لكل انتصار</>
                : <>Earn <span className="text-gold font-bold">5 coins</span> per game and <span className="text-gold font-bold">15 coins</span> per win</>
              }
            </p>
          </div>
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
  item, isOwned, isEquipped, isBusy, coins, onBuy, onEquip, onPreview, t,
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
}) {
  return (
    <div
      onClick={() => onPreview(item)}
      className={`relative rounded-2xl border overflow-hidden cursor-pointer transition-all hover:scale-[1.03]
        ${isEquipped ? 'border-gold shadow-md' : 'border-gold/15 hover:border-gold/35'}`}
      style={{ background: 'rgba(10,18,32,0.75)' }}
    >
      <div className={`h-28 flex items-center justify-center ${item.preview.bg} border-b ${item.preview.border}`}>
        <SkinPreviewIcon item={item} size="lg" />
      </div>

      <div className="p-3">
        <p className="font-arabic text-sand-light text-sm font-semibold truncate">{item.nameAr}</p>
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

function RechargeTab({ onRecharge, t, lang }: { onRecharge: () => void; t: (k: any) => string; lang: string }) {
  return (
    <div>
      <div className="text-center mb-8">
        <p className="text-4xl mb-3">🪙</p>
        <h2 className="font-arabic text-2xl font-bold text-gold mb-2">{t('store_recharge_title')}</h2>
        <p className="text-sand/45 text-sm font-arabic">{t('store_recharge_desc')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {COIN_PACKAGES.map(pkg => (
          <div
            key={pkg.id}
            className={`relative rounded-2xl p-5 border transition-all hover:scale-[1.02]
              ${pkg.popular ? 'border-gold' : 'border-gold/20 hover:border-gold/40'}`}
            style={pkg.popular
              ? { background: 'rgba(201,168,76,0.08)', boxShadow: '0 0 24px rgba(201,168,76,0.12)' }
              : { background: 'rgba(10,18,32,0.7)' }}
          >
            {pkg.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-night text-xs font-bold px-3 py-1 rounded-full font-arabic whitespace-nowrap">
                {lang === 'ar' ? 'الأكثر قيمة 🔥' : 'Best Value 🔥'}
              </div>
            )}

            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-2xl">🪙</span>
                <span className="text-2xl font-bold text-gold font-mono">
                  {(pkg.coins + pkg.bonus).toLocaleString()}
                </span>
              </div>
              <p className="text-sand/40 text-xs font-arabic">
                {pkg.coins.toLocaleString()} {t('coins')}
                {pkg.bonus > 0 && (
                  <span className="text-emerald-400 font-bold">
                    {lang === 'ar' ? ` + ${pkg.bonus.toLocaleString()} مجاناً` : ` + ${pkg.bonus.toLocaleString()} free`}
                  </span>
                )}
              </p>
            </div>

            <button
              onClick={onRecharge}
              className="w-full py-2.5 rounded-xl font-arabic font-bold text-sm transition-all"
              style={pkg.popular
                ? { background: 'linear-gradient(135deg, #C9A84C, #A07830)', color: '#04080F' }
                : { background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.35)', color: '#C9A84C' }}
            >
              {lang === 'ar' ? `${pkg.price} درهم إماراتي` : `${pkg.price} AED`}
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-4 border border-white/5 text-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <p className="text-sand/30 text-xs font-arabic leading-relaxed">
          {lang === 'ar'
            ? '💳 الدفع آمن ومشفر · الكوينز تُضاف فوراً لحسابك · للاستفسار: support@check-game.ae'
            : '💳 Secure & encrypted payment · Coins added instantly · Support: support@check-game.ae'}
        </p>
      </div>
    </div>
  );
}

// ── Skin preview icon ──────────────────────────────────────────────────────────

function SkinPreviewIcon({ item, size = 'md' }: { item: StoreItem; size?: 'md' | 'lg' }) {
  const s = size === 'lg' ? 'w-16 h-16' : 'w-10 h-10';

  if (item.category === 'avatarFrame') {
    return (
      <div className={`${s} rounded-full ${item.preview.bg} border-4 ${item.preview.border} flex items-center justify-center`}>
        <span className={`text-lg ${item.preview.text} font-bold font-arabic`}>ل</span>
      </div>
    );
  }
  if (item.category === 'cardBack') {
    return (
      <div className={`${size === 'lg' ? 'w-12 h-16' : 'w-8 h-12'} rounded-lg ${item.preview.bg} border-2 ${item.preview.border} flex items-center justify-center`}>
        <span className={`text-xs ${item.preview.text} font-bold`}>♠</span>
      </div>
    );
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
        style={{ background: '#0A1220' }}
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
