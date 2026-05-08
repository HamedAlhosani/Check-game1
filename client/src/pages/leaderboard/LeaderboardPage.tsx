import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiClient } from '../../services/api.service';
import { useAuthStore } from '../../store/authStore';
import { useT, useLang } from '../../i18n/useT';
import { PageShell } from '../../components/shared/PageShell';
import { CharacterArt } from '../../components/shared/CharacterArt';
import { LeaderboardEntry } from '@check-game/shared';

interface FriendInfo {
  uid: string;
  displayName: string;
  avatarId: string;
  level: number;
}

const TITLES_AR = ['مبتدئ الصحراء','رامي البطاقات','فارس النخيل','حارس الواحة','صائد النقاط','أسد المائدة','سلطان Check','حكيم الرمال','أمير الطاولة','ملك الورق','سلطان الرياح'];
const TITLES_EN = ['Desert Beginner','Card Thrower','Palm Knight','Oasis Guard','Point Hunter','Table Lion','Check Sultan','Sand Sage','Table Prince','Card King','Wind Sultan'];

const MEDAL_COLORS = [
  { bg: 'rgba(255,215,0,0.12)', border: 'rgba(255,215,0,0.35)', text: '#FFD700', num: '#FFD700' },
  { bg: 'rgba(192,192,192,0.12)', border: 'rgba(192,192,192,0.35)', text: '#C0C0C0', num: '#C0C0C0' },
  { bg: 'rgba(205,127,50,0.12)', border: 'rgba(205,127,50,0.35)', text: '#CD7F32', num: '#CD7F32' },
];

type Tab = 'world' | 'friends';

export function LeaderboardPage() {
  const t = useT();
  const lang = useLang();
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [friends, setFriends] = useState<FriendInfo[]>([]);
  const [tab, setTab] = useState<Tab>('world');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get<LeaderboardEntry[]>('/api/leaderboard'),
      apiClient.get<FriendInfo[]>('/api/friends').catch(() => [] as FriendInfo[]),
    ]).then(([lb, fr]) => {
      setEntries(lb);
      setFriends(fr);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function getLevelTitle(level: number) {
    const titles = lang === 'ar' ? TITLES_AR : TITLES_EN;
    return titles[Math.min(level - 1, titles.length - 1)] || titles[0];
  }

  // Friends tab list = me + my friends, intersected with leaderboard data so
  // they all carry stats. Friends without a leaderboard entry are appended
  // with placeholder stats.
  const friendUids = new Set([profile?.uid, ...friends.map(f => f.uid)].filter(Boolean) as string[]);
  const friendsList: LeaderboardEntry[] = (() => {
    if (!profile) return [];
    const intersected = entries.filter(e => friendUids.has(e.uid));
    // Add friends who don't have entries yet
    for (const uid of friendUids) {
      if (!intersected.find(e => e.uid === uid)) {
        const f = friends.find(x => x.uid === uid);
        if (uid === profile.uid) {
          intersected.push({
            uid: profile.uid, displayName: profile.displayName, avatarId: profile.avatarId,
            level: profile.ranking?.level ?? 1, xp: profile.ranking?.xp ?? 0,
            wins: profile.stats?.totalWins ?? 0, gamesPlayed: profile.stats?.totalGames ?? 0,
            winRate: 0, checkWins: 0, ludoWins: 0, dominoWins: 0, jacaroWins: 0,
          } as LeaderboardEntry);
        } else if (f) {
          intersected.push({
            uid: f.uid, displayName: f.displayName, avatarId: f.avatarId,
            level: f.level, xp: 0, wins: 0, gamesPlayed: 0, winRate: 0,
            checkWins: 0, ludoWins: 0, dominoWins: 0, jacaroWins: 0,
          } as LeaderboardEntry);
        }
      }
    }
    return intersected;
  })();

  const sourceList = tab === 'friends' ? friendsList : entries;
  const sorted = [...sourceList].sort((a, b) => b.wins - a.wins);
  const myRank = sorted.findIndex(e => e.uid === profile?.uid) + 1;
  const meLabel = lang === 'ar' ? 'أنت' : 'You';

  return (
    <PageShell
      title={t('leaderboard_title')}
      lang={lang}
      maxWidth={760}
      right={myRank > 0 ? (
        <div className="rounded-full px-3 py-1.5"
          style={{ background: 'rgba(201,168,76,0.12)', border: '1.5px solid rgba(201,168,76,0.45)' }}>
          <span className="font-arabic text-xs font-bold" style={{ color: '#E8C97A' }}>#{myRank}</span>
        </div>
      ) : undefined}
    >
      <div>
        {/* Tabs */}
        {/* Tabs */}
        <div className="flex gap-1.5 mb-5">
          <TabBtn label={lang === 'ar' ? '🌍 عالمي' : '🌍 World'}    active={tab === 'world'}    onClick={() => setTab('world')}/>
          <TabBtn label={lang === 'ar' ? '👥 الأصدقاء' : '👥 Friends'} active={tab === 'friends'} onClick={() => setTab('friends')} badge={friends.length}/>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(201,168,76,0.04)' }} />
            ))}
          </div>
        ) : tab === 'friends' && friends.length === 0 ? (
          <EmptyFriends lang={lang} onAdd={() => navigate('/friends')}/>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🏜️</p>
            <p className="font-arabic" style={{ color: 'rgba(245,230,200,0.3)' }}>{t('leaderboard_no_data')}</p>
          </div>
        ) : (
          <>
            {/* Podium top 3 — only show on world tab and when 3+ entries */}
            {tab === 'world' && sorted.length >= 3 && (
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
                      <div className="rounded-full overflow-hidden"
                        style={{ width: 56, height: 56, background: mc.bg, border: `2px solid ${mc.border}`, boxShadow: `0 0 16px ${mc.border}` }}>
                        <CharacterArt id={entry.avatarId} size={56}/>
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

            {/* Header label */}
            <p className="font-arabic mb-3 px-1" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.5)' }}>
              {tab === 'friends'
                ? (lang === 'ar' ? `${sorted.length} لاعب (أنت + أصدقاؤك)` : `${sorted.length} players (you + friends)`)
                : (lang === 'ar' ? `${sorted.length} لاعب على المنصة` : `${sorted.length} players on the platform`)}
            </p>

            {/* Full list */}
            <div className="space-y-2">
              {sorted.map((entry, idx) => {
                const isTop3 = tab === 'world' && idx < 3;
                const isMe = entry.uid === profile?.uid;
                const mc = isTop3 ? MEDAL_COLORS[idx] : null;

                return (
                  <motion.div
                    key={entry.uid}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border"
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

                    <div className="rounded-full overflow-hidden shrink-0"
                      style={{ width: 40, height: 40, background: isTop3 ? mc!.bg : 'rgba(255,255,255,0.04)', border: `1px solid ${isTop3 ? mc!.border : 'rgba(255,255,255,0.08)'}` }}>
                      <CharacterArt id={entry.avatarId} size={40}/>
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

            {/* Friends tab CTA at the bottom */}
            {tab === 'friends' && friends.length > 0 && (
              <button onClick={() => navigate('/friends')}
                className="w-full mt-4 rounded-xl py-2.5 font-arabic font-bold flex items-center justify-center gap-2"
                style={{
                  background: 'rgba(196,149,255,0.10)',
                  border: '1px solid rgba(196,149,255,0.35)',
                  color: '#C495FF', fontSize: 12.5,
                }}>
                ➕ {lang === 'ar' ? 'أضف المزيد من الأصدقاء' : 'Add more friends'}
              </button>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}

function TabBtn({ label, active, onClick, badge }: { label: string; active: boolean; onClick: () => void; badge?: number }) {
  return (
    <button onClick={onClick}
      className="relative flex-1 rounded-xl py-2.5 font-arabic font-bold"
      style={{
        background: active ? 'rgba(201,168,76,0.20)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? 'rgba(201,168,76,0.55)' : 'rgba(255,255,255,0.06)'}`,
        color: active ? '#E8C97A' : 'rgba(245,230,200,0.5)',
        boxShadow: active ? '0 0 12px rgba(201,168,76,0.20)' : 'none',
        fontSize: 13,
      }}>
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ms-2 inline-block rounded-full px-2 font-mono"
          style={{ background: 'rgba(232,201,122,0.18)', color: '#E8C97A', fontSize: 10, lineHeight: '17px' }}>
          {badge}
        </span>
      )}
    </button>
  );
}

function EmptyFriends({ lang, onAdd }: { lang: string; onAdd: () => void }) {
  return (
    <div className="text-center py-12 rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(196,149,255,0.30)' }}>
      <p style={{ fontSize: 48, marginBottom: 8 }}>👥</p>
      <p className="font-arabic font-bold mb-2" style={{ fontSize: 16, color: '#E8C97A' }}>
        {lang === 'ar' ? 'لا أصدقاء بعد' : 'No friends yet'}
      </p>
      <p className="font-arabic mb-5" style={{ fontSize: 12.5, color: 'rgba(245,230,200,0.55)', lineHeight: 1.7 }}>
        {lang === 'ar'
          ? 'أضف أصدقاءك لتتنافسوا على نفس اللوحة'
          : 'Add some friends to compete on the same board'}
      </p>
      <button onClick={onAdd}
        className="rounded-xl px-5 py-2.5 font-arabic font-bold inline-flex items-center gap-2"
        style={{
          background: 'linear-gradient(135deg, #C495FF, #8856CC)',
          color: '#fff', fontSize: 13,
          boxShadow: '0 4px 14px rgba(196,149,255,0.30)',
        }}>
        ➕ {lang === 'ar' ? 'أضف أصدقاء' : 'Add Friends'}
      </button>
    </div>
  );
}
