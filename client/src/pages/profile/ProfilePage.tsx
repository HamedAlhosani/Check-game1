import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../../components/shared/Button';
import { Input } from '../../components/shared/Input';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../services/api.service';
import { changePassword, logout } from '../../services/auth.service';
import { useUiStore } from '../../store/uiStore';
import { soundService } from '../../services/sound.service';
import { useT, useLang } from '../../i18n/useT';
import { LangToggle } from '../../components/shared/LangToggle';
import { UserProfile } from '@check-game/shared';

const AVATAR_EMOJIS: Record<string, string> = {
  avatar_1: '👳', avatar_2: '🧕', avatar_3: '👴', avatar_4: '🧔',
  avatar_5: '👩', avatar_6: '👨', avatar_7: '🧑', avatar_8: '👵',
  avatar_9: '🕌', avatar_10: '🏙️', avatar_11: '💎', avatar_12: '🌟',
};

const CHARACTERS = [
  { id: 'avatar_1', nameAr: 'رجل خليجي', nameEn: 'Gulf Man', price: 0 },
  { id: 'avatar_2', nameAr: 'امرأة خليجية', nameEn: 'Gulf Woman', price: 0 },
  { id: 'avatar_3', nameAr: 'الشيخ', nameEn: 'The Sheikh', price: 150 },
  { id: 'avatar_4', nameAr: 'شاب ملتحٍ', nameEn: 'Bearded Youth', price: 200 },
  { id: 'avatar_5', nameAr: 'شابة', nameEn: 'Young Woman', price: 300 },
  { id: 'avatar_6', nameAr: 'رجل عصري', nameEn: 'Modern Man', price: 350 },
  { id: 'avatar_7', nameAr: 'شاب', nameEn: 'Young Person', price: 500 },
  { id: 'avatar_8', nameAr: 'عجوز حكيمة', nameEn: 'Wise Elder', price: 500 },
  { id: 'avatar_9', nameAr: 'المسجد', nameEn: 'The Mosque', price: 800 },
  { id: 'avatar_10', nameAr: 'المدينة', nameEn: 'The City', price: 800 },
  { id: 'avatar_11', nameAr: 'أمير الماس', nameEn: 'Diamond Prince', price: 1200 },
  { id: 'avatar_12', nameAr: 'نجم أسطوري', nameEn: 'Legendary Star', price: 2000 },
];

type Tab = 'info' | 'avatar' | 'password' | 'settings';

export function ProfilePage() {
  const t = useT();
  const lang = useLang();
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const navigate = useNavigate();
  const { profile, setProfile, setUser } = useAuthStore();
  const { addToast } = useUiStore();

  const [tab, setTab] = useState<Tab>('info');
  const [name, setName] = useState(profile?.displayName || '');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [saving, setSaving] = useState(false);
  const [soundOn, setSoundOn] = useState(soundService.isEnabled());
  const [volume, setVolumeState] = useState(soundService.getVolume());

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setProfile(null);
    navigate('/', { replace: true });
  };

  const saveName = async () => {
    if (!name.trim() || name === profile?.displayName) return;
    setSaving(true);
    try {
      const updated = await apiClient.patch<UserProfile>('/api/profile', { displayName: name.trim() });
      setProfile(updated);
      addToast(t('profile_saved'), 'success');
    } catch {
      addToast(t('profile_save_error'), 'error');
    } finally { setSaving(false); }
  };

  const saveAvatar = async (avatarId: string) => {
    soundService.playClick();
    try {
      const updated = await apiClient.patch<UserProfile>('/api/profile', { avatarId });
      setProfile(updated);
      addToast(t('profile_saved'), 'success');
    } catch {
      addToast(t('profile_save_error'), 'error');
    }
  };

  const savePassword = async () => {
    if (newPass !== confirmPass) {
      addToast(lang === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match', 'error');
      return;
    }
    if (newPass.length < 8) {
      addToast(lang === 'ar' ? '8 أحرف على الأقل' : 'At least 8 characters', 'error');
      return;
    }
    setSaving(true);
    try {
      await changePassword(currentPass, newPass);
      setCurrentPass(''); setNewPass(''); setConfirmPass('');
      addToast(t('profile_saved'), 'success');
    } catch {
      addToast(lang === 'ar' ? 'كلمة المرور الحالية غير صحيحة' : 'Incorrect current password', 'error');
    } finally { setSaving(false); }
  };

  if (!profile) return null;
  const stats = profile.stats;
  const level = profile.ranking?.level ?? 1;
  const xp = profile.ranking?.xp ?? 0;
  const xpPct = Math.min(100, (xp % 200) / 2);

  const LEVEL_TITLES_AR = ['مبتدئ الصحراء','رامي البطاقات','فارس النخيل','حارس الواحة','صائد النقاط','أسد المائدة','سلطان Check','حكيم الرمال','أمير الطاولة','ملك الورق','سلطان الرياح'];
  const LEVEL_TITLES_EN = ['Desert Beginner','Card Thrower','Palm Knight','Oasis Guard','Point Hunter','Table Lion','Check Sultan','Sand Sage','Table Prince','Card King','Wind Sultan'];
  const levelTitle = lang === 'ar'
    ? (LEVEL_TITLES_AR[level - 1] || LEVEL_TITLES_AR[0])
    : (LEVEL_TITLES_EN[level - 1] || LEVEL_TITLES_EN[0]);

  return (
    <div className="min-h-screen pb-16 sm:pb-0" style={{ background: 'linear-gradient(180deg, #060411 0%, #080516 50%, #0A0614 100%)', direction: dir }}>

      {/* Nav */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-5 py-3 border-b border-white/5"
        style={{ background: 'rgba(6,4,17,0.96)', backdropFilter: 'blur(14px)' }}>
        <button onClick={() => navigate('/home')} className="flex items-center gap-2 transition-colors"
          style={{ color: 'rgba(245,230,200,0.45)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#C9A84C')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(245,230,200,0.45)')}>
          <span className="text-xl">{lang === 'ar' ? '←' : '→'}</span>
          <span className="font-arabic text-sm">{t('back')}</span>
        </button>
        <h1 className="font-display text-lg tracking-widest" style={{ color: '#C9A84C' }}>{t('profile_title')}</h1>
        <div className="flex items-center gap-2">
          <LangToggle />
          <div className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 border border-gold/20"
            style={{ background: 'rgba(201,168,76,0.06)' }}>
            <span className="text-sm">🪙</span>
            <span className="font-bold font-mono text-sm" style={{ color: '#E8C97A' }}>{profile.coins ?? 0}</span>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Hero card */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 mb-5 flex flex-col sm:flex-row items-center gap-5 border"
          style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(10,6,20,0.95) 100%)', borderColor: 'rgba(201,168,76,0.22)', boxShadow: '0 4px 40px rgba(0,0,0,0.5)' }}>

          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
              style={{ background: 'rgba(201,168,76,0.10)', border: '2px solid rgba(201,168,76,0.35)', boxShadow: '0 0 20px rgba(201,168,76,0.12)' }}>
              {AVATAR_EMOJIS[profile.avatarId] || '👤'}
            </div>
            <div className="absolute -bottom-1 -right-1 rounded-full w-6 h-6 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #C9A84C, #8B6914)', fontSize: 10, color: '#04080F', fontWeight: 800 }}>
              {level}
            </div>
          </div>

          <div className="flex-1 min-w-0 w-full sm:w-auto text-center sm:text-start">
            <h1 className="font-arabic font-bold truncate mb-0.5" style={{ fontSize: 22, color: '#E8C97A' }}>
              {profile.displayName}
            </h1>
            <p className="text-xs mb-0.5" style={{ color: 'rgba(245,230,200,0.3)', direction: 'ltr' }}>
              {profile.username || ''}
            </p>
            <p className="font-arabic text-sm mb-3" style={{ color: 'rgba(201,168,76,0.55)' }}>
              {levelTitle} — {t('level')} {level}
            </p>

            <div className="flex gap-4 mb-3 flex-wrap justify-center sm:justify-start">
              {[
                { v: stats.totalWins, l: t('wins'), c: '#C9A84C' },
                { v: stats.totalGames, l: t('games'), c: 'rgba(245,230,200,0.55)' },
                { v: stats.currentStreak, l: '🔥', c: '#E07040' },
              ].map(s => (
                <span key={s.l} className="font-arabic text-xs" style={{ color: 'rgba(245,230,200,0.35)' }}>
                  <span className="font-bold text-sm" style={{ color: s.c }}>{s.v}</span> {s.l}
                </span>
              ))}
            </div>

            <div>
              <div className="flex justify-between font-arabic text-xs mb-1" style={{ color: 'rgba(245,230,200,0.25)' }}>
                <span>{xp % 200} / 200 XP</span>
                <span>{t('level')} {level + 1} {lang === 'ar' ? '←' : '→'}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(201,168,76,0.10)' }}>
                <div style={{ width: `${xpPct}%`, height: '100%', background: 'linear-gradient(90deg, #8B6914, #E8C97A)', borderRadius: 3, transition: 'width .7s ease', boxShadow: '0 0 8px rgba(201,168,76,0.35)' }} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          {[
            { path: '/', label: lang === 'ar' ? '🏠 الصفحة الرئيسية' : '🏠 Home', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.12)', color: 'rgba(245,230,200,0.75)' },
            { path: '/friends', label: t('profile_go_friends'), bg: 'rgba(80,140,220,0.08)', border: 'rgba(80,140,220,0.25)', color: 'rgba(130,180,245,0.9)' },
            { path: '/history', label: t('profile_go_history'), bg: 'rgba(80,200,120,0.08)', border: 'rgba(80,200,120,0.25)', color: 'rgba(100,210,140,0.9)' },
            { path: '/leaderboard', label: t('profile_go_leaderboard'), bg: 'rgba(201,168,76,0.08)', border: 'rgba(201,168,76,0.25)', color: 'rgba(201,168,76,0.9)' },
          ].map(l => (
            <button key={l.path} onClick={() => navigate(l.path)}
              className="py-2.5 rounded-xl font-arabic text-xs font-bold transition-all border flex flex-col items-center gap-1"
              style={{ background: l.bg, borderColor: l.border, color: l.color }}>
              {l.label}
            </button>
          ))}
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: lang === 'ar' ? 'انتصارات Check' : 'Check Wins', value: stats.checkWins, icon: '🃏', color: '#C9A84C' },
            { label: lang === 'ar' ? 'إجمالي الفوز' : 'Total Wins', value: stats.totalWins, icon: '🏆', color: '#FFD700' },
            { label: lang === 'ar' ? 'أفضل سلسلة' : 'Best Streak', value: stats.currentStreak, icon: '🔥', color: '#E07040' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center border"
              style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <span className="text-xl sm:text-2xl">{s.icon}</span>
              <p className="font-bold text-lg sm:text-xl mt-1" style={{ color: s.color }}>{s.value || 0}</p>
              <p className="font-arabic text-xs mt-0.5" style={{ color: 'rgba(245,230,200,0.35)', fontSize: 10 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 rounded-xl p-1 flex-wrap" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {([
            { id: 'info' as Tab, label: lang === 'ar' ? 'المعلومات' : 'Info', icon: '👤' },
            { id: 'avatar' as Tab, label: lang === 'ar' ? 'الشخصية' : 'Character', icon: '🧑' },
            { id: 'password' as Tab, label: lang === 'ar' ? 'كلمة السر' : 'Password', icon: '🔑' },
            { id: 'settings' as Tab, label: lang === 'ar' ? 'الإعدادات' : 'Settings', icon: '⚙️' },
          ]).map(tt => (
            <button key={tt.id} onClick={() => { setTab(tt.id); soundService.playClick(); }}
              className="flex-1 py-2 rounded-lg font-arabic text-xs transition-all"
              style={tab === tt.id ? {
                background: 'linear-gradient(135deg, rgba(201,168,76,0.25), rgba(201,168,76,0.10))',
                color: '#E8C97A', fontWeight: 700,
                border: '1px solid rgba(201,168,76,0.35)',
              } : { color: 'rgba(245,230,200,0.4)', border: '1px solid transparent' }}>
              {tt.icon} {tt.label}
            </button>
          ))}
        </div>

        {/* Tab: Info */}
        {tab === 'info' && (
          <motion.div key="info" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 space-y-4 border"
            style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
            <Input label={t('display_name')} value={name} onChange={e => setName(e.target.value)} />
            <Button onClick={saveName} loading={saving} disabled={!name.trim() || name === profile.displayName}>
              {t('save')}
            </Button>
          </motion.div>
        )}

        {/* Tab: Avatar */}
        {tab === 'avatar' && (
          <motion.div key="avatar" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 border"
            style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-arabic text-sm" style={{ color: 'rgba(245,230,200,0.45)' }}>
                {lang === 'ar' ? 'شخصيتان مجانيتان — الباقي من المتجر' : '2 free characters — rest from the store'}
              </p>
              <Link to="/store" className="font-arabic text-xs transition-all" style={{ color: '#C9A84C' }}>
                {t('profile_go_store')}
              </Link>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {CHARACTERS.map(char => {
                const isOwned = char.price === 0 || (profile.ownedItems || []).includes(char.id);
                const isActive = profile.avatarId === char.id;
                return (
                  <button key={char.id}
                    onClick={() => isOwned ? saveAvatar(char.id) : navigate('/store')}
                    className="relative rounded-xl py-3 px-2 flex flex-col items-center gap-1.5 transition-all border"
                    style={isActive ? {
                      borderColor: 'rgba(201,168,76,0.7)',
                      background: 'rgba(201,168,76,0.10)',
                      boxShadow: '0 0 12px rgba(201,168,76,0.15)',
                    } : isOwned ? {
                      borderColor: 'rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.03)',
                    } : {
                      borderColor: 'rgba(255,255,255,0.04)',
                      background: 'rgba(0,0,0,0.2)',
                    }}>
                    <div className="relative">
                      <span className="text-3xl">{AVATAR_EMOJIS[char.id]}</span>
                      {!isOwned && <span className="absolute -bottom-1 -right-1 text-xs">🔒</span>}
                    </div>
                    <span className="font-arabic text-center leading-tight"
                      style={{ fontSize: 11, color: isActive ? '#C9A84C' : isOwned ? 'rgba(245,230,200,0.65)' : 'rgba(245,230,200,0.28)' }}>
                      {lang === 'ar' ? char.nameAr : char.nameEn}
                    </span>
                    {isActive && <span style={{ fontSize: 10, color: '#C9A84C', fontWeight: 700 }}>✓ {lang === 'ar' ? 'مُفعَّل' : 'Active'}</span>}
                    {!isOwned && <span className="font-arabic" style={{ fontSize: 10, color: 'rgba(201,168,76,0.5)' }}>🪙 {char.price.toLocaleString()}</span>}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Tab: Password */}
        {tab === 'password' && (
          <motion.div key="password" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 space-y-4 border"
            style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
            <Input label={t('profile_current_password')} type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} dir="ltr" />
            <Input label={t('profile_new_password')} type="password" value={newPass} onChange={e => setNewPass(e.target.value)} dir="ltr" />
            <Input label={lang === 'ar' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'} type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} dir="ltr" />
            <Button onClick={savePassword} loading={saving}>{t('profile_change_password')}</Button>
          </motion.div>
        )}

        {/* Tab: Settings */}
        {tab === 'settings' && (
          <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 space-y-4 border"
            style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.07)' }}>
            <p className="font-arabic font-bold text-base" style={{ color: '#E8C97A' }}>
              {lang === 'ar' ? '🔊 الصوت' : '🔊 Sound'}
            </p>

            {/* Mute toggle */}
            <div className="flex items-center justify-between rounded-2xl px-4 py-3.5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="font-arabic text-sm" style={{ color: 'rgba(245,230,200,0.75)' }}>
                {soundOn ? (lang === 'ar' ? '🔊 الصوت مفعّل' : '🔊 Sound On') : (lang === 'ar' ? '🔇 الصوت معطّل' : '🔇 Sound Off')}
              </span>
              <button
                onClick={() => { const n = !soundOn; soundService.setEnabled(n); setSoundOn(n); }}
                style={{
                  width: 50, height: 28, borderRadius: 14, position: 'relative',
                  background: soundOn ? '#C9A84C' : 'rgba(255,255,255,0.15)',
                  border: 'none', cursor: 'pointer', transition: 'background 0.25s',
                }}>
                <div style={{
                  position: 'absolute', top: 4, width: 20, height: 20, borderRadius: '50%',
                  background: 'white', transition: 'left 0.25s',
                  left: soundOn ? 26 : 4,
                }} />
              </button>
            </div>

            {/* Volume slider */}
            <div className="flex flex-col gap-3 rounded-2xl px-4 py-3.5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', opacity: soundOn ? 1 : 0.35 }}>
              <div className="flex items-center justify-between">
                <span className="font-arabic text-sm" style={{ color: 'rgba(245,230,200,0.75)' }}>
                  {lang === 'ar' ? '🎚️ مستوى الصوت' : '🎚️ Volume'}
                </span>
                <span className="font-bold font-mono text-sm" style={{ color: '#C9A84C' }}>{Math.round(volume * 100)}%</span>
              </div>
              <input type="range" min={0} max={100} value={Math.round(volume * 100)}
                disabled={!soundOn}
                onChange={e => { const v = Number(e.target.value) / 100; soundService.setVolume(v); setVolumeState(v); }}
                className="w-full" style={{ accentColor: '#C9A84C', height: 4 }} />
              <div className="flex justify-between font-arabic" style={{ fontSize: 10, color: 'rgba(245,230,200,0.25)' }}>
                <span>{lang === 'ar' ? 'صامت' : 'Mute'}</span>
                <span>{lang === 'ar' ? 'أقصى' : 'Max'}</span>
              </div>
            </div>

            {/* Equipped items display */}
            <p className="font-arabic font-bold text-base pt-2" style={{ color: '#E8C97A' }}>
              {lang === 'ar' ? '🎴 العناصر المجهّزة' : '🎴 Equipped Items'}
            </p>
            {(['cardBack', 'avatarFrame', 'boardTheme'] as const).map(cat => {
              const catNames: Record<string, { ar: string; en: string }> = {
                cardBack: { ar: 'كفر الأوراق', en: 'Card Back' },
                avatarFrame: { ar: 'إطار الصورة', en: 'Avatar Frame' },
                boardTheme: { ar: 'ثيم الطاولة', en: 'Table Theme' },
              };
              const equipped = (profile.equippedItems as any)?.[cat];
              return (
                <div key={cat} className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span className="font-arabic text-sm" style={{ color: 'rgba(245,230,200,0.65)' }}>
                    {lang === 'ar' ? catNames[cat].ar : catNames[cat].en}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-arabic text-xs" style={{ color: '#C9A84C' }}>{equipped || '—'}</span>
                    <button onClick={() => navigate('/store')}
                      className="font-arabic text-xs px-2 py-1 rounded-lg"
                      style={{ background: 'rgba(201,168,76,0.12)', color: '#E8C97A', border: '1px solid rgba(201,168,76,0.25)' }}>
                      {lang === 'ar' ? 'تغيير' : 'Change'}
                    </button>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Logout */}
        <div className="mt-8 pb-6">
          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-xl font-arabic font-bold text-sm transition-all border"
            style={{
              background: 'rgba(196,92,58,0.08)',
              borderColor: 'rgba(196,92,58,0.3)',
              color: '#E07040',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(196,92,58,0.15)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(196,92,58,0.08)'; }}
          >
            🚪 {lang === 'ar' ? 'تسجيل الخروج' : 'Log Out'}
          </button>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex sm:hidden items-center border-t"
        style={{ background: 'rgba(10,6,20,0.97)', backdropFilter: 'blur(12px)', borderColor: 'rgba(201,168,76,0.15)', height: 56 }}>
        {[
          { to: '/home', icon: '🏠', label: 'الرئيسية' },
          { to: '/store', icon: '🏪', label: 'المتجر' },
          { to: '/leaderboard', icon: '🏆', label: 'التصنيف' },
          { to: '/friends', icon: '👥', label: 'أصدقاء' },
          { to: '/profile', icon: '👤', label: 'حسابي' },
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
