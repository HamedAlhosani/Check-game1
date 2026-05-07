import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../services/api.service';
import { CharacterArt } from './CharacterArt';
import { FrameRing } from './FrameRing';

type FriendStatus = 'self' | 'friends' | 'requested_by_me' | 'requested_by_them' | 'none';

interface PublicProfile {
  uid: string;
  username: string;
  displayName: string;
  avatarId: string;
  equippedItems?: { avatarFrame?: string };
  ranking?: { level: number; xp: number };
  stats?: { totalGames: number; totalWins: number; totalLosses: number };
  clan: { id: string; name: string; tag: string; emblem: string } | null;
  friendStatus: FriendStatus;
}

interface Props {
  uid: string | null;
  onClose: () => void;
}

const LEVEL_TITLES_AR = ['مبتدئ الصحراء', 'رامي البطاقات', 'فارس النخيل', 'حارس الواحة', 'صائد النقاط', 'أسد المائدة', 'سلطان Check', 'حكيم الرمال', 'أمير الطاولة', 'ملك الورق', 'سلطان الرياح'];

export function ProfileModal({ uid, onClose }: Props) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [friendBusy, setFriendBusy] = useState(false);
  const [localFriendStatus, setLocalFriendStatus] = useState<FriendStatus | null>(null);

  useEffect(() => {
    if (!uid) return;
    setLoading(true); setError(null); setProfile(null); setLocalFriendStatus(null);
    apiClient.get<PublicProfile>(`/api/profile/${uid}`)
      .then(p => { setProfile(p); setLocalFriendStatus(p.friendStatus); })
      .catch(() => setError('تعذّر تحميل الملف'))
      .finally(() => setLoading(false));
  }, [uid]);

  const sendRequest = async () => {
    if (!profile || friendBusy) return;
    setFriendBusy(true);
    try {
      await apiClient.post('/api/friends/request', { username: profile.username });
      setLocalFriendStatus('requested_by_me');
    } catch {
      setError('تعذّر إرسال الطلب');
    } finally {
      setFriendBusy(false);
    }
  };

  const acceptRequest = async () => {
    if (!profile || friendBusy) return;
    setFriendBusy(true);
    try {
      await apiClient.post('/api/friends/accept', { uid: profile.uid });
      setLocalFriendStatus('friends');
    } catch {
      setError('تعذّر قبول الطلب');
    } finally {
      setFriendBusy(false);
    }
  };

  const status = localFriendStatus ?? profile?.friendStatus ?? 'none';
  const level = profile?.ranking?.level ?? 1;
  const xp = profile?.ranking?.xp ?? 0;
  const xpInLevel = xp % 200;
  const xpPct = Math.min(100, xpInLevel / 2);
  const stats = profile?.stats ?? { totalGames: 0, totalWins: 0, totalLosses: 0 };
  const winRate = stats.totalGames > 0 ? Math.round((stats.totalWins / stats.totalGames) * 100) : 0;
  const levelTitle = LEVEL_TITLES_AR[level - 1] || LEVEL_TITLES_AR[0];

  return (
    <AnimatePresence>
      {uid && (
        <motion.div
          key="profile-modal-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
        >
          <motion.div
            key="profile-modal"
            initial={{ opacity: 0, scale: 0.92, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="relative w-full max-w-sm rounded-2xl overflow-hidden border"
            style={{
              direction: 'rtl',
              background: 'linear-gradient(180deg, #1F1810 0%, #14100A 100%)',
              borderColor: 'rgba(201,168,76,0.35)',
              boxShadow: '0 30px 70px rgba(0,0,0,0.85), 0 0 60px rgba(201,168,76,0.12)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={onClose}
              aria-label="إغلاق"
              className="absolute top-2 left-2 w-8 h-8 rounded-lg flex items-center justify-center text-sand/60 hover:text-sand-light hover:bg-white/5 active:scale-90 transition z-10"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>

            {loading && (
              <div className="py-16 text-center text-gold/50 font-arabic animate-pulse">…</div>
            )}

            {!loading && error && (
              <div className="py-12 text-center text-sand/55 font-arabic px-6">{error}</div>
            )}

            {!loading && profile && (
              <>
                {/* Hero — gold glow band behind avatar */}
                <div
                  className="relative px-5 pt-7 pb-4 text-center"
                  style={{ background: 'radial-gradient(circle at 50% 0%, rgba(201,168,76,0.18) 0%, transparent 65%)' }}
                >
                  <div className="relative inline-block" style={{ width: 96, height: 96 }}>
                    <CharacterArt id={profile.avatarId} size={96} />
                    <FrameRing size={96} frameId={profile.equippedItems?.avatarFrame} />
                    <div
                      className="absolute -bottom-1 -right-1 rounded-full w-7 h-7 flex items-center justify-center font-bold"
                      style={{
                        background: 'linear-gradient(135deg, #E8C97A, #8B6914)',
                        border: '2px solid #14100A',
                        fontSize: 12, color: '#14100A',
                        boxShadow: '0 2px 10px rgba(201,168,76,0.45)',
                      }}
                    >
                      {level}
                    </div>
                  </div>

                  <h2 className="font-arabic font-bold mt-3 truncate" style={{ fontSize: 22, color: '#E8C97A' }}>
                    {profile.displayName}
                  </h2>
                  {profile.username && (
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(245,230,200,0.32)', direction: 'ltr' }}>
                      @{profile.username}
                    </p>
                  )}
                  <p className="font-arabic mt-1.5" style={{ fontSize: 12, color: 'rgba(201,168,76,0.7)' }}>{levelTitle}</p>
                </div>

                {/* Clan */}
                <div className="px-5 pb-3">
                  {profile.clan ? (
                    <div
                      className="rounded-xl px-3 py-2.5 flex items-center gap-3 border"
                      style={{
                        background: 'linear-gradient(135deg, rgba(232,144,58,0.12) 0%, rgba(20,14,8,0.8) 100%)',
                        borderColor: 'rgba(232,144,58,0.32)',
                      }}
                    >
                      <span style={{ fontSize: 28, lineHeight: 1 }}>{profile.clan.emblem}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-arabic font-bold text-sand-light truncate" style={{ fontSize: 14 }}>
                          {profile.clan.name}
                        </p>
                        <p className="font-mono text-xs" style={{ color: 'rgba(232,144,58,0.85)' }}>
                          [{profile.clan.tag}]
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="rounded-xl px-3 py-2.5 text-center font-arabic"
                      style={{
                        background: 'rgba(255,255,255,0.025)',
                        border: '1px dashed rgba(245,230,200,0.18)',
                        fontSize: 12, color: 'rgba(245,230,200,0.45)',
                      }}
                    >
                      بدون قبيلة
                    </div>
                  )}
                </div>

                {/* XP bar */}
                <div className="px-5 pb-3">
                  <div className="flex justify-between mb-1 font-arabic" style={{ fontSize: 10, color: 'rgba(245,230,200,0.45)' }}>
                    <span>المستوى {level}</span>
                    <span>{xpInLevel} / 200 XP</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(201,168,76,0.12)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      width: `${xpPct}%`, height: '100%',
                      background: 'linear-gradient(90deg, #8B6914, #E8C97A)',
                      boxShadow: '0 0 8px rgba(201,168,76,0.45)',
                      transition: 'width .6s ease',
                    }} />
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-4 gap-2 px-5 pb-4">
                  {[
                    { label: 'مباريات', value: stats.totalGames, color: '#E8C97A' },
                    { label: 'فوز', value: stats.totalWins, color: '#7AE08A' },
                    { label: 'خسارة', value: stats.totalLosses, color: '#E07040' },
                    { label: 'النسبة', value: `${winRate}%`, color: '#E8C97A' },
                  ].map((s, i) => (
                    <div key={i}
                      className="rounded-xl py-2 text-center border"
                      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(201,168,76,0.15)' }}>
                      <div className="font-bold font-mono" style={{ fontSize: 17, color: s.color, lineHeight: 1.2 }}>{s.value}</div>
                      <div className="font-arabic mt-0.5" style={{ fontSize: 10, color: 'rgba(245,230,200,0.5)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Friend action */}
                <div className="px-5 pb-5">
                  {status === 'self' && null}

                  {status === 'friends' && (
                    <div className="rounded-xl py-2.5 text-center font-arabic"
                      style={{ background: 'rgba(122,224,138,0.08)', border: '1px solid rgba(122,224,138,0.32)', color: '#7AE08A', fontSize: 13, fontWeight: 700 }}>
                      ✓ صديق
                    </div>
                  )}

                  {status === 'requested_by_me' && (
                    <div className="rounded-xl py-2.5 text-center font-arabic"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(245,230,200,0.18)', color: 'rgba(245,230,200,0.6)', fontSize: 13 }}>
                      الطلب مرسل…
                    </div>
                  )}

                  {status === 'requested_by_them' && (
                    <button
                      onClick={acceptRequest}
                      disabled={friendBusy}
                      className="w-full rounded-xl py-2.5 font-arabic font-bold disabled:opacity-50 active:scale-[0.98] transition"
                      style={{
                        background: 'linear-gradient(135deg, #E8C97A 0%, #C9A84C 100%)',
                        color: '#14100A', fontSize: 14,
                        boxShadow: '0 4px 14px rgba(201,168,76,0.35)',
                      }}>
                      قبول طلب الصداقة
                    </button>
                  )}

                  {status === 'none' && (
                    <button
                      onClick={sendRequest}
                      disabled={friendBusy}
                      className="w-full rounded-xl py-2.5 font-arabic font-bold disabled:opacity-50 active:scale-[0.98] transition flex items-center justify-center gap-2"
                      style={{
                        background: 'linear-gradient(135deg, #E8C97A 0%, #C9A84C 100%)',
                        color: '#14100A', fontSize: 14,
                        boxShadow: '0 4px 14px rgba(201,168,76,0.35)',
                      }}>
                      <span style={{ fontSize: 16 }}>＋</span>
                      إضافة صديق
                    </button>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
