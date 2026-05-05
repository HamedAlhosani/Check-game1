import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiClient } from '../../services/api.service';
import { useT, useLang } from '../../i18n/useT';
import { LangToggle } from '../../components/shared/LangToggle';
import { FrameRing } from '../../components/shared/FrameRing';

interface PublicProfile {
  uid: string;
  username: string;
  displayName: string;
  avatarId: string;
  equippedItems?: { avatarFrame?: string };
  ranking?: { level: number; xp: number };
  stats?: { totalGames: number; totalWins: number; totalLosses: number; currentStreak?: number };
}

const AVATAR_EMOJIS: Record<string, string> = {
  avatar_1: '👳', avatar_2: '🧕', avatar_3: '👴', avatar_4: '🧔',
  avatar_5: '👩', avatar_6: '👨', avatar_7: '🧑', avatar_8: '👵',
  avatar_9: '🕌', avatar_10: '🏙️', avatar_11: '💎', avatar_12: '🌟',
};

const LEVEL_TITLES_AR = ['مبتدئ الصحراء','رامي البطاقات','فارس النخيل','حارس الواحة','صائد النقاط','أسد المائدة','سلطان Check','حكيم الرمال','أمير الطاولة','ملك الورق','سلطان الرياح'];
const LEVEL_TITLES_EN = ['Desert Beginner','Card Thrower','Palm Knight','Oasis Guard','Point Hunter','Table Lion','Check Sultan','Sand Sage','Table Prince','Card King','Wind Sultan'];

export function UserProfilePage() {
  const t = useT();
  const lang = useLang();
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const navigate = useNavigate();
  const { uid } = useParams();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    setError(null);
    apiClient.get<PublicProfile>(`/api/profile/${uid}`)
      .then(setProfile)
      .catch(() => setError(lang === 'ar' ? 'تعذّر تحميل الملف' : 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, [uid, lang]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #14100A 0%, #0E0905 100%)' }}>
        <p className="text-gold/60 font-arabic animate-pulse">…</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(180deg, #14100A 0%, #0E0905 100%)' }}>
        <div className="text-center">
          <p className="text-sand/60 font-arabic mb-4">{error || (lang === 'ar' ? 'الملف غير موجود' : 'Profile not found')}</p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-xl border border-gold/40 text-gold font-arabic">
            {t('back')}
          </button>
        </div>
      </div>
    );
  }

  const level = profile.ranking?.level ?? 1;
  const xp = profile.ranking?.xp ?? 0;
  const xpPct = Math.min(100, (xp % 200) / 2);
  const stats = profile.stats || { totalGames: 0, totalWins: 0, totalLosses: 0 };
  const winRate = stats.totalGames > 0 ? Math.round((stats.totalWins / stats.totalGames) * 100) : 0;
  const levelTitle = lang === 'ar'
    ? (LEVEL_TITLES_AR[level - 1] || LEVEL_TITLES_AR[0])
    : (LEVEL_TITLES_EN[level - 1] || LEVEL_TITLES_EN[0]);

  return (
    <div className="min-h-screen pb-12" style={{ background: 'linear-gradient(180deg, #14100A 0%, #1A1408 45%, #0E0905 100%)', direction: dir }}>
      {/* Nav */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-5 py-3 border-b border-white/5"
        style={{ background: 'rgba(20,14,8,0.96)', backdropFilter: 'blur(14px)' }}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 transition-colors"
          style={{ color: 'rgba(245,230,200,0.45)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#C9A84C')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(245,230,200,0.45)')}>
          <span className="text-xl">{lang === 'ar' ? '←' : '→'}</span>
          <span className="font-arabic text-sm">{t('back')}</span>
        </button>
        <h1 className="font-display text-lg tracking-widest" style={{ color: '#C9A84C' }}>
          {lang === 'ar' ? 'الملف الشخصي' : 'Profile'}
        </h1>
        <LangToggle />
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Hero card — same layout as own profile */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 mb-5 flex flex-col sm:flex-row items-center gap-5 border"
          style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(20,14,8,0.95) 100%)', borderColor: 'rgba(201,168,76,0.22)', boxShadow: '0 4px 40px rgba(0,0,0,0.5)' }}>

          <div className="relative shrink-0" style={{ width: 96, height: 96 }}>
            <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
              style={{ background: 'rgba(201,168,76,0.10)' }}>
              {AVATAR_EMOJIS[profile.avatarId] || '👤'}
            </div>
            <FrameRing size={96} frameId={profile.equippedItems?.avatarFrame} />
            <div className="absolute -bottom-1 -right-1 rounded-full w-6 h-6 flex items-center justify-center z-10"
              style={{ background: 'linear-gradient(135deg, #C9A84C, #8B6914)', fontSize: 10, color: '#0E0905', fontWeight: 800 }}>
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
            <p className="font-arabic mb-3" style={{ fontSize: 12, color: 'rgba(201,168,76,0.7)' }}>
              {levelTitle}
            </p>

            {/* XP bar */}
            <div className="w-full">
              <div className="flex justify-between mb-1 font-arabic" style={{ fontSize: 10, color: 'rgba(245,230,200,0.45)' }}>
                <span>{lang === 'ar' ? `المستوى ${level}` : `Level ${level}`}</span>
                <span>{xp % 200} / 200 XP</span>
              </div>
              <div style={{ height: 6, background: 'rgba(201,168,76,0.12)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${xpPct}%`, height: '100%', background: 'linear-gradient(90deg, #8B6914, #E8C97A)', boxShadow: '0 0 8px rgba(201,168,76,0.45)', transition: 'width .6s ease' }}/>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: lang === 'ar' ? 'مباريات' : 'Games', value: stats.totalGames, color: '#E8C97A' },
            { label: lang === 'ar' ? 'انتصارات' : 'Wins', value: stats.totalWins, color: '#7AE08A' },
            { label: lang === 'ar' ? 'خسائر' : 'Losses', value: stats.totalLosses, color: '#E07040' },
            { label: lang === 'ar' ? 'نسبة الفوز' : 'Win Rate', value: `${winRate}%`, color: '#E8C97A' },
          ].map((s, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl p-4 border text-center"
              style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(201,168,76,0.15)' }}>
              <div className="font-bold font-mono" style={{ fontSize: 26, color: s.color }}>{s.value}</div>
              <div className="font-arabic mt-1" style={{ fontSize: 11, color: 'rgba(245,230,200,0.5)' }}>{s.label}</div>
            </motion.div>
          ))}
        </div>

        {stats.currentStreak !== undefined && stats.currentStreak > 0 && (
          <div className="mt-4 rounded-2xl p-4 border text-center"
            style={{ background: 'rgba(232,144,58,0.06)', borderColor: 'rgba(232,144,58,0.25)' }}>
            <p className="font-arabic" style={{ fontSize: 12, color: 'rgba(245,230,200,0.55)' }}>
              {lang === 'ar' ? 'سلسلة انتصارات' : 'Win Streak'}
            </p>
            <p className="font-bold" style={{ fontSize: 24, color: '#E8903A' }}>{stats.currentStreak}</p>
          </div>
        )}
      </div>
    </div>
  );
}
