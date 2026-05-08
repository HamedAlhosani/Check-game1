import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { apiClient } from '../../services/api.service';
import { soundService } from '../../services/sound.service';
import { useT, useLang } from '../../i18n/useT';
import { PageShell } from '../../components/shared/PageShell';
import { socketService } from '../../services/socket.service';
import { SOCKET_EVENTS } from '@check-game/shared';
import { FrameRing } from '../../components/shared/FrameRing';

const AVATAR_EMOJIS: Record<string, string> = {
  avatar_1: '👳', avatar_2: '🧕', avatar_3: '👴', avatar_4: '🧔',
  avatar_5: '👩', avatar_6: '👨', avatar_7: '🧑', avatar_8: '👵',
  avatar_9: '🕌', avatar_10: '🏙️', avatar_11: '💎', avatar_12: '🌟',
  avatar_13: '⚔️', avatar_14: '⛵', avatar_15: '🧭', avatar_16: '🇦🇪',
  avatar_17: '👸', avatar_18: '🧕', avatar_19: '🤵', avatar_20: '👳', avatar_21: '👩', avatar_22: '🧓',
  avatar_23: '👩‍🎓', avatar_24: '👵', avatar_25: '👩‍🏫', avatar_26: '🧕', avatar_27: '👩‍⚕️', avatar_28: '👑',
};

interface FriendInfo {
  uid: string;
  displayName: string;
  username: string;
  avatarId: string;
  level: number;
  wins?: number;
  /** Set when the friend is in a public match — drives the "Watch" handle. */
  inGame?: { gameId: string; gameType: string } | null;
  /** True if the friend currently has at least one live socket. */
  online?: boolean;
}

type Tab = 'friends' | 'requests' | 'add';

export function FriendsPage() {
  const t = useT();
  const lang = useLang();
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { addToast } = useUiStore();

  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<FriendInfo[]>([]);
  const [requests, setRequests] = useState<FriendInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const fetchFriends = useCallback(async () => {
    try {
      const [f, r] = await Promise.all([
        apiClient.get<FriendInfo[]>('/api/friends'),
        apiClient.get<FriendInfo[]>('/api/friends/requests'),
      ]);
      setFriends(f);
      setRequests(r);
    } catch {}
  }, []);

  useEffect(() => { fetchFriends(); }, [fetchFriends]);

  // Real-time updates: refetch when a friend request comes in or list changes
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;
    const onChanged = () => { fetchFriends(); };
    const onReceived = () => {
      fetchFriends();
      addToast(lang === 'ar' ? 'وصلك طلب صداقة جديد' : 'New friend request', 'info');
    };
    socket.on(SOCKET_EVENTS.FRIEND_LIST_CHANGED, onChanged);
    socket.on(SOCKET_EVENTS.FRIEND_REQUEST_RECEIVED, onReceived);
    return () => {
      socket.off(SOCKET_EVENTS.FRIEND_LIST_CHANGED, onChanged);
      socket.off(SOCKET_EVENTS.FRIEND_REQUEST_RECEIVED, onReceived);
    };
  }, [fetchFriends, addToast, lang]);

  async function handleSendRequest() {
    if (!searchQuery.trim()) return;
    setLoading(true);
    soundService.playClick();
    try {
      await apiClient.post('/api/friends/request', { username: searchQuery.trim() });
      addToast(t('friends_sent'), 'success');
      setSearchQuery('');
      fetchFriends();
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.includes('not found')) addToast(t('friends_not_found'), 'error');
      else if (msg.includes('Already friends')) addToast(lang === 'ar' ? 'أنتم أصدقاء بالفعل' : 'Already friends', 'info');
      else if (msg.includes('already sent')) addToast(lang === 'ar' ? 'الطلب أُرسل مسبقاً' : 'Request already sent', 'info');
      else if (msg.includes('yourself')) addToast(lang === 'ar' ? 'لا تقدر تضيف نفسك 😄' : "Can't add yourself 😄", 'info');
      else addToast(t('friends_error'), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(uid: string) {
    setBusy(uid);
    soundService.playClick();
    try {
      await apiClient.post('/api/friends/accept', { uid });
      addToast(t('friends_accepted'), 'success');
      fetchFriends();
    } catch {
      addToast(t('friends_error'), 'error');
    } finally {
      setBusy(null);
    }
  }

  async function handleDecline(uid: string) {
    setBusy(uid);
    soundService.playClick();
    try {
      await apiClient.delete(`/api/friends/${uid}`);
      fetchFriends();
    } catch {} finally {
      setBusy(null);
    }
  }

  const [confirmRemove, setConfirmRemove] = useState<FriendInfo | null>(null);

  async function performRemove(uid: string) {
    setBusy(uid);
    setConfirmRemove(null);
    try {
      await apiClient.delete(`/api/friends/${uid}`);
      addToast(t('friends_removed'), 'info');
      fetchFriends();
    } catch {} finally {
      setBusy(null);
    }
  }
  function handleRemove(uid: string) {
    const friend = friends.find(f => f.uid === uid);
    if (!friend) return;
    setConfirmRemove(friend);
  }

  function copyUsername() {
    // Copy only the number part — that's all a friend needs to add you
    const number = (profile?.username || '').split('#')[1] || profile?.username || '';
    navigator.clipboard.writeText(number).then(() => {
      setCopied(true);
      soundService.playClick();
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <PageShell title={t('friends_title')} lang={lang}>

        {/* Your username card */}
        <div className="rounded-2xl p-4 mb-6 flex items-center justify-between border"
          style={{ background: 'rgba(229,188,124,0.06)', borderColor: 'rgba(229,188,124,0.2)' }}>
          <div>
            <p className="font-arabic text-xs mb-1" style={{ color: 'rgba(251,243,219,0.4)' }}>
              {lang === 'ar' ? 'رقمك (شاركه مع أصدقائك)' : 'Your number (share with friends)'}
            </p>
            <p className="font-bold font-mono" style={{ color: '#FBF3DB', fontSize: 26, lineHeight: 1.1, letterSpacing: 2 }}>
              {(profile?.username || '').split('#')[1] || '...'}
            </p>
            <p className="font-arabic mt-0.5" style={{ color: 'rgba(251,243,219,0.3)', fontSize: 10, direction: 'ltr', textAlign: dir === 'rtl' ? 'right' : 'left' }}>
              {profile?.username || ''}
            </p>
          </div>
          <button
            onClick={copyUsername}
            className="px-3 py-1.5 rounded-xl font-arabic text-sm transition-all"
            style={{ background: copied ? 'rgba(80,200,120,0.15)' : 'rgba(229,188,124,0.12)', border: `1px solid ${copied ? 'rgba(80,200,120,0.4)' : 'rgba(229,188,124,0.3)'}`, color: copied ? '#50C878' : '#E5BC7C' }}>
            {copied ? `✓ ${t('friends_copied')}` : `📋 ${t('friends_copy')}`}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {([
            { id: 'friends', label: `${t('friends_list')} ${friends.length > 0 ? `(${friends.length})` : ''}`, icon: '👥' },
            { id: 'requests', label: `${t('friends_requests')} ${requests.length > 0 ? `(${requests.length})` : ''}`, icon: '📩' },
            { id: 'add', label: t('friends_add'), icon: '➕' },
          ] as const).map(tt => (
            <button
              key={tt.id}
              onClick={() => { setTab(tt.id); soundService.playClick(); }}
              className="flex-1 py-2 rounded-lg text-sm font-arabic transition-all"
              style={tab === tt.id ? {
                background: 'linear-gradient(135deg, rgba(229,188,124,0.25), rgba(229,188,124,0.10))',
                color: '#FBF3DB', fontWeight: 700,
                border: '1px solid rgba(229,188,124,0.35)',
              } : {
                color: 'rgba(251,243,219,0.4)', border: '1px solid transparent',
              }}>
              {tt.icon} {tt.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Friends List */}
          {tab === 'friends' && (
            <motion.div key="friends" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
              {friends.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-4xl mb-3">👥</p>
                  <p className="font-arabic" style={{ color: 'rgba(251,243,219,0.35)', fontSize: 14 }}>{t('friends_empty')}</p>
                  <p className="font-arabic mt-1" style={{ color: 'rgba(251,243,219,0.2)', fontSize: 12 }}>
                    {lang === 'ar' ? 'أضف أصدقاء عبر تبويب "إضافة صديق"' : 'Add friends via the "Add Friend" tab'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map(f => (
                    <FriendCard key={f.uid} friend={f} busy={busy === f.uid}
                      actionLabel={t('friends_remove')}
                      actionStyle={{ color: 'rgba(196,92,58,0.15)', border: 'rgba(196,92,58,0.4)', textColor: '#E07040' }}
                      onAction={() => handleRemove(f.uid)}
                      lang={lang}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Pending Requests */}
          {tab === 'requests' && (
            <motion.div key="requests" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
              {requests.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-4xl mb-3">📩</p>
                  <p className="font-arabic" style={{ color: 'rgba(251,243,219,0.35)', fontSize: 14 }}>{t('friends_no_requests')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {requests.map(f => (
                    <div key={f.uid} className="rounded-xl p-4 flex items-center gap-3 border"
                      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
                      <span className="text-3xl">{AVATAR_EMOJIS[f.avatarId] || '👤'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-arabic font-bold truncate" style={{ color: '#FBF3DB', fontSize: 15 }}>{f.displayName}</p>
                        <p className="font-arabic text-xs" style={{ color: 'rgba(251,243,219,0.35)', direction: 'ltr' }}>{f.username}</p>
                      </div>
                      <div className="flex gap-2">
                        <button disabled={busy === f.uid}
                          onClick={() => handleAccept(f.uid)}
                          className="px-3 py-1.5 rounded-lg font-arabic text-xs transition-all"
                          style={{ background: 'rgba(80,200,120,0.15)', border: '1px solid rgba(80,200,120,0.4)', color: '#50C878' }}>
                          ✓ {t('friends_accept')}
                        </button>
                        <button disabled={busy === f.uid}
                          onClick={() => handleDecline(f.uid)}
                          className="px-3 py-1.5 rounded-lg font-arabic text-xs transition-all"
                          style={{ background: 'rgba(196,92,58,0.10)', border: '1px solid rgba(196,92,58,0.35)', color: '#E07040' }}>
                          ✕ {t('friends_decline')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Add Friend */}
          {tab === 'add' && (
            <motion.div key="add" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
              <div className="rounded-2xl p-5 border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(229,188,124,0.15)' }}>
                <p className="font-arabic mb-1 font-bold" style={{ color: '#FBF3DB' }}>{t('friends_add')}</p>
                <p className="font-arabic text-xs mb-4" style={{ color: 'rgba(251,243,219,0.35)' }}>
                  {lang === 'ar'
                    ? 'اكتب رقم صديقك فقط (مثل: 4523)'
                    : 'Just type your friend\'s number (e.g. 4523)'}
                </p>
                <div className="flex gap-2">
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendRequest()}
                    placeholder={lang === 'ar' ? 'الرقم فقط' : 'Number only'}
                    inputMode="numeric"
                    className="flex-1 rounded-xl px-4 py-2.5 font-bold text-base outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(251,243,219,0.95)', direction: 'ltr', letterSpacing: 1 }}
                  />
                  <button
                    onClick={handleSendRequest}
                    disabled={loading || !searchQuery.trim()}
                    className="px-4 py-2.5 rounded-xl font-arabic font-bold text-sm transition-all disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #E5BC7C, #A07338)', color: '#100A05' }}>
                    {loading ? '...' : t('friends_add_btn')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* ── Remove friend confirmation modal ── */}
      <AnimatePresence>
        {confirmRemove && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(8,4,0,0.85)', backdropFilter: 'blur(8px)' }}
            onClick={() => setConfirmRemove(null)}
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="relative rounded-3xl border w-full"
              style={{
                background: 'linear-gradient(160deg, #241810 0%, #1F1810 100%)',
                borderColor: 'rgba(196,92,58,0.45)',
                maxWidth: 380,
                padding: '22px 22px 20px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.85), 0 0 30px rgba(196,92,58,0.18)',
              }}>
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">⚠</div>
                <h2 className="font-arabic font-bold mb-1" style={{ fontSize: 18, color: '#FBF3DB' }}>
                  {lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Remove'}
                </h2>
                <p className="font-arabic" style={{ fontSize: 13, color: 'rgba(251,243,219,0.65)' }}>
                  {lang === 'ar' ? 'هل أنت متأكد من حذف' : 'Are you sure you want to remove'}{' '}
                  <span style={{ color: '#FBF3DB', fontWeight: 700 }}>{confirmRemove.displayName}</span>
                  {lang === 'ar' ? ' من قائمة أصدقائك؟' : ' from your friends?'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmRemove(null)}
                  className="flex-1 py-2.5 rounded-xl font-arabic font-bold transition-all border"
                  style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(251,243,219,0.7)' }}>
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={() => performRemove(confirmRemove.uid)}
                  className="flex-1 py-2.5 rounded-xl font-arabic font-bold transition-all border"
                  style={{ background: 'rgba(196,92,58,0.15)', borderColor: 'rgba(196,92,58,0.5)', color: '#E07040' }}>
                  {lang === 'ar' ? 'نعم، احذف' : 'Yes, Remove'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}

function FriendCard({ friend, busy, actionLabel, actionStyle, onAction, lang }: {
  friend: FriendInfo;
  busy: boolean;
  actionLabel: string;
  actionStyle: { color: string; border: string; textColor: string };
  onAction: () => void;
  lang: string;
}) {
  const navigate = useNavigate();
  const goToProfile = () => navigate(`/user/${friend.uid}`);
  return (
    <div className="rounded-xl p-4 flex items-center gap-3 border transition-all hover:border-gold/40 cursor-pointer"
      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}
      onClick={goToProfile}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') goToProfile(); }}
    >
      <div className="relative shrink-0" style={{ width: 44, height: 44 }}>
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-2xl"
          style={{ background: 'rgba(229,188,124,0.08)' }}>
          {AVATAR_EMOJIS[friend.avatarId] || '👤'}
        </div>
        <FrameRing size={44} frameId={(friend as any).equippedFrame} />
        {/* Presence dot — green = online, gray = offline */}
        <span
          aria-label={friend.online ? (lang === 'ar' ? 'متصل' : 'online') : (lang === 'ar' ? 'غير متصل' : 'offline')}
          style={{
            position: 'absolute', right: -1, bottom: -1,
            width: 12, height: 12, borderRadius: '50%',
            background: friend.online ? '#3CCB7F' : '#6B6B6B',
            border: '2px solid #100A05',
            boxShadow: friend.online ? '0 0 6px rgba(60,203,127,0.7)' : 'none',
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-arabic font-bold truncate" style={{ color: '#FBF3DB', fontSize: 15 }}>{friend.displayName}</p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="font-arabic text-xs" style={{
            color: friend.online ? 'rgba(60,203,127,0.85)' : 'rgba(251,243,219,0.3)',
            fontWeight: friend.online ? 600 : 400,
          }}>
            {friend.online ? (lang === 'ar' ? '● متصل' : '● online') : (lang === 'ar' ? 'غير متصل' : 'offline')}
          </span>
          <span className="font-arabic text-xs" style={{ color: 'rgba(229,188,124,0.5)' }}>{lang === 'ar' ? 'لv' : 'Lv'}{friend.level}</span>
          {friend.wins !== undefined && <span className="font-arabic text-xs" style={{ color: 'rgba(251,243,219,0.3)' }}>🏆 {friend.wins}</span>}
        </div>
      </div>
      {friend.inGame && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/watch/${friend.inGame!.gameType}/${friend.inGame!.gameId}`);
          }}
          className="px-3 py-1.5 rounded-lg font-arabic text-xs transition-all flex items-center gap-1"
          style={{
            background: 'rgba(80,200,120,0.15)',
            border: '1px solid rgba(80,200,120,0.45)',
            color: '#7AC74F',
          }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7AC74F', boxShadow: '0 0 6px #7AC74F' }} />
          {lang === 'ar' ? '👁 شاهد' : '👁 Watch'}
        </button>
      )}
      <button disabled={busy} onClick={(e) => { e.stopPropagation(); onAction(); }}
        className="px-3 py-1.5 rounded-lg font-arabic text-xs transition-all disabled:opacity-50"
        style={{ background: actionStyle.color, border: `1px solid ${actionStyle.border}`, color: actionStyle.textColor }}>
        {busy ? '...' : actionLabel}
      </button>
    </div>
  );
}
