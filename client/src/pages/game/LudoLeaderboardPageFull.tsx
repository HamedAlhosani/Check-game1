import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiClient } from '../../services/api.service';
import { useAuthStore } from '../../store/authStore';
import { useLang } from '../../i18n/useT';
import { LangToggle } from '../../components/shared/LangToggle';
import { CharacterArt } from '../../components/shared/CharacterArt';
import { LeaderboardEntry } from '@check-game/shared';
import { LudoPageBackground } from '../../components/game/ludo/BoardEmblems';

const SAND = {
  bg1: '#0E0905',
  panel: '#14100A',
  gold: '#D9A441',
  goldLight: '#F6E6BE',
  goldDark: '#7A6303',
  cream: '#F4E4BE',
};

interface FriendInfo { uid: string; displayName: string; avatarId: string; level: number; }

const TITLES_AR = ['مبتدئ الرمل', 'فارس النرد', 'رامي الكثبان', 'حارس الواحة', 'صياد القطع', 'أسد المسار', 'سلطان لودو', 'حكيم النخيل', 'أمير الصحراء', 'ملك السباق', 'سلطان الرياح'];
const TITLES_EN = ['Sand Beginner', 'Dice Knight', 'Dune Thrower', 'Oasis Guard', 'Token Hunter', 'Track Lion', 'Ludo Sultan', 'Palm Sage', 'Desert Prince', 'Race King', 'Wind Sultan'];

const MEDAL = [
  { bg: 'linear-gradient(135deg, #FFD700, #B8860B)', border: '#FFD700', text: '#0E0905' },
  { bg: 'linear-gradient(135deg, #E0E0E0, #808080)', border: '#C0C0C0', text: '#0E0905' },
  { bg: 'linear-gradient(135deg, #CD7F32, #6B4423)', border: '#CD7F32', text: '#0E0905' },
];

type Tab = 'world' | 'friends';

/**
 * Full-featured Ludo leaderboard. Same shape as the Check leaderboard
 * (podium top-3, World/Friends tabs, my-row highlight, level title) but
 * sorted by ludoWins instead of total wins, dressed in sand/gold chrome,
 * with the Friends tab linking to the dedicated /ludo/friends page.
 */
export function LudoLeaderboardPageFull() {
  const lang = useLang();
  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
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

  function levelTitle(level: number) {
    const titles = isAr ? TITLES_AR : TITLES_EN;
    return titles[Math.min(level - 1, titles.length - 1)] || titles[0];
  }

  // Friends tab = me + my friends, with leaderboard data filled where available
  const friendUids = new Set([profile?.uid, ...friends.map(f => f.uid)].filter(Boolean) as string[]);
  const friendsList: LeaderboardEntry[] = (() => {
    if (!profile) return [];
    const intersected = entries.filter(e => friendUids.has(e.uid));
    for (const uid of friendUids) {
      if (!intersected.find(e => e.uid === uid)) {
        const f = friends.find(x => x.uid === uid);
        if (uid === profile.uid) {
          intersected.push({
            uid: profile.uid, displayName: profile.displayName, avatarId: profile.avatarId,
            level: profile.ranking?.level ?? 1, xp: profile.ranking?.xp ?? 0,
            wins: profile.stats?.totalWins ?? 0, gamesPlayed: profile.stats?.totalGames ?? 0,
            winRate: 0, checkWins: 0, ludoWins: profile.stats?.ludoWins ?? 0, dominoWins: 0, jacaroWins: 0,
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
  // Sort by ludoWins (Ludo-only ranking), drop everyone with 0 from the World
  // tab so the top of the board isn't a sea of zeros.
  const sorted = [...sourceList]
    .filter(e => tab === 'friends' || ((e as any).ludoWins ?? 0) > 0)
    .sort((a, b) => ((b as any).ludoWins ?? 0) - ((a as any).ludoWins ?? 0));
  const myRank = sorted.findIndex(e => e.uid === profile?.uid) + 1;
  const meLabel = isAr ? 'أنت' : 'You';

  return (
    <div className="min-h-screen relative" style={{ background: SAND.bg1, direction: dir }}>
      <LudoPageBackground />

      {/* Nav */}
      <nav className="sticky top-0 z-30 flex items-center justify-between px-3 py-2.5"
        style={{ background: '#0E0905', borderBottom: `1.5px solid ${SAND.gold}55`, boxShadow: '0 4px 18px rgba(0,0,0,0.5)' }}>
        <button onClick={() => navigate('/ludo')}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/5 transition">
          <span style={{ fontSize: 18, color: SAND.gold }}>{isAr ? '→' : '←'}</span>
          <span className="font-arabic" style={{ fontSize: 12, color: SAND.cream }}>{isAr ? 'لودو' : 'Ludo'}</span>
        </button>
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: 16 }}>🏆</span>
          <span className="font-display tracking-widest" style={{ fontSize: 14, color: SAND.gold }}>
            {isAr ? 'تصنيف لودو' : 'LUDO LEADERBOARD'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {myRank > 0 && (
            <div className="rounded-xl px-2 py-1"
              style={{ background: `${SAND.gold}22`, border: `1px solid ${SAND.gold}88` }}>
              <span className="font-mono" style={{ fontSize: 11, color: SAND.gold }}>#{myRank}</span>
            </div>
          )}
          <LangToggle />
        </div>
      </nav>

      <main className="relative z-10 max-w-2xl mx-auto px-3 pt-4 pb-12">
        {/* Tabs */}
        <div className="flex gap-1.5 mb-5">
          <TabBtn label={isAr ? '🌍 عالمي' : '🌍 World'}    active={tab === 'world'}    onClick={() => setTab('world')} />
          <TabBtn label={isAr ? '👥 الأصدقاء' : '👥 Friends'} active={tab === 'friends'} onClick={() => setTab('friends')} badge={friends.length} />
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: `${SAND.gold}10` }} />
            ))}
          </div>
        ) : tab === 'friends' && friends.length === 0 ? (
          <EmptyFriends isAr={isAr} onAdd={() => navigate('/ludo/friends')} />
        ) : sorted.length === 0 ? (
          <div className="rounded-2xl p-8 text-center"
            style={{ background: SAND.panel, border: `1.5px dashed ${SAND.gold}55` }}>
            <span style={{ fontSize: 40 }}>🏜️</span>
            <p className="font-arabic mt-2" style={{ color: 'rgba(245,230,200,0.5)', fontSize: 13 }}>
              {isAr ? 'لا توجد بيانات بعد — كن أول الأبطال' : 'No data yet — be the first champion'}
            </p>
          </div>
        ) : (
          <>
            {/* Podium top-3 — only on World, only when 3+ entries */}
            {tab === 'world' && sorted.length >= 3 && (
              <div className="flex items-end justify-center gap-3 mb-7 px-4">
                {[sorted[1], sorted[0], sorted[2]].map((entry, i) => {
                  const rank = i === 0 ? 1 : i === 1 ? 0 : 2;
                  const m = MEDAL[rank];
                  const podiumH = ['h-20', 'h-28', 'h-16'][i];
                  const medals = ['🥈', '🥇', '🥉'];
                  const isMe = entry.uid === profile?.uid;
                  const lWins = (entry as any).ludoWins ?? 0;
                  return (
                    <motion.div key={entry.uid}
                      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex flex-col items-center gap-1 flex-1">
                      <span style={{ fontSize: 24, lineHeight: 1, filter: `drop-shadow(0 0 10px ${m.border})` }}>{medals[i]}</span>
                      <div className="rounded-full overflow-hidden relative"
                        style={{
                          width: 56, height: 56,
                          background: m.bg,
                          border: `3px solid ${m.border}`,
                          boxShadow: `0 0 20px ${m.border}88`,
                        }}>
                        <CharacterArt id={entry.avatarId} size={56} />
                      </div>
                      <p className="font-arabic font-bold truncate text-center"
                        style={{ fontSize: 11, color: isMe ? SAND.gold : SAND.cream, maxWidth: 80 }}>
                        {isMe ? meLabel : entry.displayName}
                      </p>
                      <div className={`w-full ${podiumH} rounded-t-xl flex flex-col items-center justify-center`}
                        style={{ background: m.bg, border: `2px solid ${m.border}`, borderBottom: 'none' }}>
                        <span className="font-bold text-lg" style={{ color: m.text, lineHeight: 1 }}>{lWins}</span>
                        <span className="font-arabic" style={{ fontSize: 9, color: m.text, opacity: 0.75 }}>
                          {isAr ? 'فوز' : 'wins'}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Header label */}
            <p className="font-arabic mb-3 px-1" style={{ fontSize: 11, color: 'rgba(245,230,200,0.5)' }}>
              {tab === 'friends'
                ? (isAr ? `${sorted.length} لاعب (أنت + أصدقاؤك)` : `${sorted.length} players (you + friends)`)
                : (isAr ? `${sorted.length} بطل في صحراء لودو` : `${sorted.length} Ludo champions`)}
            </p>

            {/* Full list */}
            <div className="space-y-1.5">
              {sorted.map((entry, idx) => {
                const isTop3 = tab === 'world' && idx < 3;
                const isMe = entry.uid === profile?.uid;
                const m = isTop3 ? MEDAL[idx] : null;
                const lWins = (entry as any).ludoWins ?? 0;
                return (
                  <motion.div
                    key={entry.uid}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(idx * 0.03, 0.4) }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={isMe ? {
                      background: `linear-gradient(135deg, ${SAND.gold}28, ${SAND.panel})`,
                      border: `1.5px solid ${SAND.gold}`,
                      boxShadow: `0 0 18px ${SAND.gold}33`,
                    } : isTop3 ? {
                      background: SAND.panel,
                      border: `1.5px solid ${m!.border}88`,
                    } : {
                      background: SAND.panel,
                      border: `1px solid ${SAND.gold}22`,
                    }}>
                    <div className="w-7 text-center shrink-0">
                      {isTop3
                        ? <span style={{ fontSize: 18 }}>{['🥇', '🥈', '🥉'][idx]}</span>
                        : <span className="font-bold" style={{ fontSize: 12, color: 'rgba(245,230,200,0.4)' }}>{idx + 1}</span>}
                    </div>

                    <div className="rounded-full overflow-hidden shrink-0"
                      style={{
                        width: 38, height: 38,
                        border: `1.5px solid ${isTop3 ? m!.border : SAND.gold + '55'}`,
                      }}>
                      <CharacterArt id={entry.avatarId} size={38} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-arabic font-bold truncate"
                        style={{ fontSize: 13, color: isMe ? SAND.goldLight : SAND.cream }}>
                        {isMe ? `${entry.displayName} (${meLabel})` : entry.displayName}
                      </p>
                      <p className="font-arabic truncate" style={{ fontSize: 10, color: 'rgba(245,230,200,0.4)' }}>
                        {levelTitle(entry.level)} · {isAr ? 'لv' : 'Lv'}{entry.level}
                      </p>
                    </div>

                    <div className="text-end shrink-0">
                      <p className="font-bold font-mono" style={{ fontSize: 18, color: isTop3 ? m!.border : SAND.gold, lineHeight: 1 }}>{lWins}</p>
                      <p className="font-arabic" style={{ fontSize: 9, color: 'rgba(245,230,200,0.35)' }}>
                        {isAr ? 'فوز' : 'wins'}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Friends tab CTA */}
            {tab === 'friends' && friends.length > 0 && (
              <button onClick={() => navigate('/ludo/friends')}
                className="w-full mt-4 rounded-xl py-2.5 font-arabic font-bold flex items-center justify-center gap-2"
                style={{
                  background: `${SAND.gold}22`,
                  border: `1.5px solid ${SAND.gold}77`,
                  color: SAND.gold, fontSize: 12,
                  cursor: 'pointer',
                }}>
                ➕ {isAr ? 'أضف المزيد من الأصدقاء' : 'Add more friends'}
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function TabBtn({ label, active, onClick, badge }: { label: string; active: boolean; onClick: () => void; badge?: number }) {
  return (
    <button onClick={onClick}
      className="relative flex-1 rounded-xl py-2.5 font-arabic font-bold"
      style={{
        background: active ? `linear-gradient(135deg, ${SAND.goldLight}, ${SAND.gold})` : SAND.panel,
        border: `1.5px solid ${active ? SAND.gold : `${SAND.gold}33`}`,
        color: active ? '#0E0905' : 'rgba(245,230,200,0.55)',
        boxShadow: active ? `0 0 16px ${SAND.gold}55` : 'none',
        fontSize: 13, cursor: 'pointer',
      }}>
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ms-2 inline-block rounded-full px-2 font-mono"
          style={{
            background: active ? 'rgba(0,0,0,0.18)' : `${SAND.gold}22`,
            color: active ? '#0E0905' : SAND.gold,
            fontSize: 10, lineHeight: '17px',
          }}>
          {badge}
        </span>
      )}
    </button>
  );
}

function EmptyFriends({ isAr, onAdd }: { isAr: boolean; onAdd: () => void }) {
  return (
    <div className="rounded-2xl p-8 text-center"
      style={{ background: SAND.panel, border: `1.5px dashed ${SAND.gold}55` }}>
      <span style={{ fontSize: 40 }}>👥</span>
      <p className="font-arabic font-bold mt-2" style={{ fontSize: 15, color: SAND.cream }}>
        {isAr ? 'ما عندك أصدقاء بعد' : 'No friends yet'}
      </p>
      <p className="font-arabic mt-1 mb-4" style={{ fontSize: 12, color: 'rgba(245,230,200,0.55)', lineHeight: 1.6 }}>
        {isAr ? 'أضف أصدقاءك لتتنافسوا على نفس اللوحة' : 'Add friends to compete on the same board'}
      </p>
      <button onClick={onAdd}
        className="rounded-xl px-5 py-2.5 font-arabic font-bold"
        style={{
          background: `linear-gradient(135deg, ${SAND.goldLight}, ${SAND.gold})`,
          color: '#0E0905', fontSize: 13,
          boxShadow: `0 4px 14px ${SAND.gold}55`,
          cursor: 'pointer',
        }}>
        ➕ {isAr ? 'أضف أصدقاء' : 'Add Friends'}
      </button>
    </div>
  );
}
