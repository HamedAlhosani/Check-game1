import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiClient } from '../../services/api.service';
import { useAuthStore } from '../../store/authStore';
import { useT, useLang } from '../../i18n/useT';
import { LangToggle } from '../../components/shared/LangToggle';
import { LeaderboardEntry } from '@check-game/shared';

const AVATAR_EMOJIS: Record<string, string> = {
  avatar_1: '👳', avatar_2: '🧕', avatar_3: '👴', avatar_4: '🧔',
  avatar_5: '👩', avatar_6: '👨', avatar_7: '🧑', avatar_8: '👵',
  avatar_9: '🕌', avatar_10: '🏙️', avatar_11: '💎', avatar_12: '🌟',
};

const TITLES_AR = ['مبتدئ الصحراء','رامي البطاقات','فارس النخيل','حارس الواحة','صائد النقاط','أسد المائدة','سلطان Check','حكيم الرمال','أمير الطاولة','ملك الورق','سلطان الرياح'];
const TITLES_EN = ['Desert Beginner','Card Thrower','Palm Knight','Oasis Guard','Point Hunter','Table Lion','Check Sultan','Sand Sage','Table Prince','Card King','Wind Sultan'];

const MEDAL_COLORS = [
  { bg: 'rgba(255,215,0,0.12)', border: 'rgba(255,215,0,0.35)', text: '#FFD700', num: '#FFD700' },
  { bg: 'rgba(192,192,192,0.12)', border: 'rgba(192,192,192,0.35)', text: '#C0C0C0', num: '#C0C0C0' },
  { bg: 'rgba(205,127,50,0.12)', border: 'rgba(205,127,50,0.35)', text: '#CD7F32', num: '#CD7F32' },
];

export function LeaderboardPage() {
  const t = useT();
  const lang = useLang();
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<LeaderboardEntry[]>('/api/leaderboard')
      .then(data => { setEntries(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const sorted = [...entries].sort((a, b) => b.wins - a.wins);
  const myRank = sorted.findIndex(e => e.uid === profile?.uid) + 1;

  function getLevelTitle(level: number) {
    const titles = lang === 'ar' ? TITLES_AR : TITLES_EN;
    return titles[Math.min(level - 1, titles.length - 1)] || titles[0];
  }

  const meLabel = lang === 'ar' ? 'أنت' : 'You';

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #040810 0%, #070412 50%, #0A0614 100%)', direction: dir }}>

      {/* Nav */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-5 py-3 border-b border-white/5"
        style={{ background: 'rgba(4,8,16,0.96)', backdropFilter: 'blur(14px)' }}>
        <button onClick={() => navigate('/home')} className="flex items-center gap-2 transition-colors"
          style={{ color: 'rgba(245,230,200,0.45)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#C9A84C')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(245,230,200,0.45)')}>
          <span className="text-xl">{lang === 'ar' ? '←' : '→'}</span>
          <span className="font-arabic text-sm">{t('back')}</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏆</span>
          <h1 className="font-display text-lg tracking-widest" style={{ color: '#C9A84C' }}>{t('leaderboard_title')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <LangToggle />
          {myRank > 0 ? (
            <div className="rounded-xl px-3 py-1 border" style={{ background: 'rgba(201,168,76,0.08)', borderColor: 'rgba(201,168,76,0.2)' }}>
              <span className="font-arabic text-xs" style={{ color: '#C9A84C' }}>{t('leaderboard_my_rank')} #{myRank}</span>
            </div>
          ) : <div className="w-16" />}
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Podium top 3 */}
        {!loading && sorted.length >= 3 && (
          <div className="flex items-end justify-center gap-4 mb-8 px-4">
            {[sorted[1], sorted[0], sorted[2]].map((entry, i) => {
              const rank = i === 0 ? 1 : i === 1 ? 0 : 2;
              const mc = MEDAL_COLORS[rank];
              const podiumH = ['h-20', 'h-28', 'h-16'][i];
              const medals = ['🥈', '🥇', '🥉'];
              const isMe = entry.uid === profile?.uid;
              return (
                <motion.div key={entry.uid}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex flex-col items-center gap-1.5 flex-1">
                  <span className="text-2xl">{medals[i]}</span>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                    style={{ background: mc.bg, border: `2px solid ${mc.border}`, boxShadow: `0 0 16px ${mc.border}` }}>
                    {AVATAR_EMOJIS[entry.avatarId] || '👤'}
                  </div>
                  <p className="font-arabic text-xs font-bold text-center max-w-20 truncate"
                    style={{ color: isMe ? '#C9A84C' : 'rgba(245,230,200,0.8)' }}>
                    {isMe ? meLabel : entry.displayName}
                  </p>
                  <div className={`w-full ${podiumH} rounded-t-xl flex flex-col items-center justify-center gap-0.5`}
                    style={{ background: mc.bg, border: `1px solid ${mc.border}`, borderBottom: 'none' }}>
                    <span className="font-bold text-lg leading-none" style={{ color: mc.num }}>{entry.wins}</span>
                    <span className="font-arabic text-xs" style={{ color: mc.text, opacity: 0.7 }}>{t('leaderboard_victory')}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Divider */}
        {!loading && sorted.length >= 3 && (
          <div className="flex items-center gap-3 mb-5">
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.25))' }} />
            <span className="font-arabic text-xs" style={{ color: 'rgba(201,168,76,0.5)' }}>{t('leaderboard_full_list')}</span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(201,168,76,0.25))' }} />
          </div>
        )}

        {/* Full list */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(201,168,76,0.04)' }} />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🏜️</p>
            <p className="font-arabic" style={{ color: 'rgba(245,230,200,0.3)' }}>{t('leaderboard_no_data')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((entry, idx) => {
              const isTop3 = idx < 3;
              const isMe = entry.uid === profile?.uid;
              const mc = isTop3 ? MEDAL_COLORS[idx] : null;

              return (
                <motion.div
                  key={entry.uid}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all"
                  style={isMe ? {
                    background: 'rgba(201,168,76,0.10)',
                    borderColor: 'rgba(201,168,76,0.4)',
                    boxShadow: '0 0 16px rgba(201,168,76,0.08)',
                  } : isTop3 ? {
                    background: mc!.bg,
                    borderColor: mc!.border,
                  } : {
                    background: 'rgba(255,255,255,0.025)',
                    borderColor: 'rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="w-8 text-center shrink-0">
                    {isTop3
                      ? <span className="text-xl">{['🥇', '🥈', '🥉'][idx]}</span>
                      : <span className="font-bold text-sm" style={{ color: 'rgba(245,230,200,0.3)' }}>{idx + 1}</span>}
                  </div>

                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0"
                    style={{ background: isTop3 ? mc!.bg : 'rgba(255,255,255,0.04)', border: `1px solid ${isTop3 ? mc!.border : 'rgba(255,255,255,0.08)'}` }}>
                    {AVATAR_EMOJIS[entry.avatarId] || '👤'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-arabic font-bold truncate"
                      style={{ fontSize: 14, color: isMe ? '#E8C97A' : isTop3 ? mc!.text : 'rgba(245,230,200,0.85)' }}>
                      {isMe ? `${entry.displayName} (${meLabel})` : entry.displayName}
                    </p>
                    <p className="font-arabic text-xs truncate" style={{ color: 'rgba(245,230,200,0.3)' }}>
                      {getLevelTitle(entry.level)} · {lang === 'ar' ? 'لv' : 'Lv'}{entry.level}
                    </p>
                  </div>

                  <div className="text-center shrink-0 hidden sm:block">
                    <p className="font-bold text-sm" style={{ color: '#50C878' }}>{entry.winRate}%</p>
                    <p className="font-arabic" style={{ fontSize: 10, color: 'rgba(245,230,200,0.3)' }}>{t('winRate')}</p>
                  </div>

                  <div className="text-center shrink-0 w-14">
                    <p className="font-bold text-xl leading-none"
                      style={{ color: isTop3 ? mc!.num : '#C9A84C' }}>{entry.wins}</p>
                    <p className="font-arabic" style={{ fontSize: 10, color: 'rgba(245,230,200,0.35)' }}>{t('leaderboard_victory')}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
