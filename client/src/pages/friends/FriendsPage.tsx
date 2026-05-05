import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { apiClient } from '../../services/api.service';
import { soundService } from '../../services/sound.service';
import { useT, useLang } from '../../i18n/useT';
import { LangToggle } from '../../components/shared/LangToggle';

const AVATAR_EMOJIS: Record<string, string> = {
  avatar_1: '👳', avatar_2: '🧕', avatar_3: '👴', avatar_4: '🧔',
  avatar_5: '👩', avatar_6: '👨', avatar_7: '🧑', avatar_8: '👵',
  avatar_9: '🕌', avatar_10: '🏙️', avatar_11: '💎', avatar_12: '🌟',
};

interface FriendInfo {
  uid: string;
  displayName: string;
  username: string;
  avatarId: string;
  level: number;
  wins?: number;
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

  async function handleRemove(uid: string) {
    const confirmMsg = lang === 'ar' ? 'هل تريد حذف هذا الصديق؟' : 'Remove this friend?';
    if (!confirm(confirmMsg)) return;
    setBusy(uid);
    try {
      await apiClient.delete(`/api/friends/${uid}`);
      addToast(t('friends_removed'), 'info');
      fetchFriends();
    } catch {} finally {
      setBusy(null);
    }
  }

  function copyUsername() {
    const username = profile?.username || '';
    navigator.clipboard.writeText(username).then(() => {
      setCopied(true);
      soundService.playClick();
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #070410 0%, #0A0614 100%)', direction: dir }}>
      {/* Nav */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-5 py-3 border-b border-white/5"
        style={{ background: 'rgba(7,4,16,0.95)', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => navigate('/home')} className="flex items-center gap-2 text-sand/50 hover:text-gold transition-colors">
          <span className="text-xl">{lang === 'ar' ? '←' : '→'}</span>
          <span className="font-arabic text-sm">{t('back')}</span>
        </button>
        <h1 className="font-display text-xl tracking-widest" style={{ color: '#C9A84C' }}>{t('friends_title')}</h1>
        <LangToggle />
      </nav>

      <div className="max-w-lg mx-auto px-4 py-6">

        {/* Your username card */}
        <div className="rounded-2xl p-4 mb-6 flex items-center justify-between border"
          style={{ background: 'rgba(201,168,76,0.06)', borderColor: 'rgba(201,168,76,0.2)' }}>
          <div>
            <p className="font-arabic text-xs mb-1" style={{ color: 'rgba(245,230,200,0.4)' }}>
              {t('friends_my_username')}
            </p>
            <p className="font-bold text-base" style={{ color: '#E8C97A', direction: 'ltr', textAlign: dir === 'rtl' ? 'right' : 'left' }}>
              {profile?.username || '...'}
            </p>
          </div>
          <button
            onClick={copyUsername}
            className="px-3 py-1.5 rounded-xl font-arabic text-sm transition-all"
            style={{ background: copied ? 'rgba(80,200,120,0.15)' : 'rgba(201,168,76,0.12)', border: `1px solid ${copied ? 'rgba(80,200,120,0.4)' : 'rgba(201,168,76,0.3)'}`, color: copied ? '#50C878' : '#C9A84C' }}>
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
                background: 'linear-gradient(135deg, rgba(201,168,76,0.25), rgba(201,168,76,0.10))',
                color: '#E8C97A', fontWeight: 700,
                border: '1px solid rgba(201,168,76,0.35)',
              } : {
                color: 'rgba(245,230,200,0.4)', border: '1px solid transparent',
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
                  <p className="font-arabic" style={{ color: 'rgba(245,230,200,0.35)', fontSize: 14 }}>{t('friends_empty')}</p>
                  <p className="font-arabic mt-1" style={{ color: 'rgba(245,230,200,0.2)', fontSize: 12 }}>
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
                  <p className="font-arabic" style={{ color: 'rgba(245,230,200,0.35)', fontSize: 14 }}>{t('friends_no_requests')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {requests.map(f => (
                    <div key={f.uid} className="rounded-xl p-4 flex items-center gap-3 border"
                      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
                      <span className="text-3xl">{AVATAR_EMOJIS[f.avatarId] || '👤'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-arabic font-bold truncate" style={{ color: '#E8C97A', fontSize: 15 }}>{f.displayName}</p>
                        <p className="font-arabic text-xs" style={{ color: 'rgba(245,230,200,0.35)', direction: 'ltr' }}>{f.username}</p>
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
              <div className="rounded-2xl p-5 border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(201,168,76,0.15)' }}>
                <p className="font-arabic mb-1 font-bold" style={{ color: '#E8C97A' }}>{t('friends_add')}</p>
                <p className="font-arabic text-xs mb-4" style={{ color: 'rgba(245,230,200,0.35)' }}>
                  {lang === 'ar'
                    ? 'اطلب من صديقك يشاركك يوزرنيمه (مثل: أحمد#4523)'
                    : 'Ask your friend to share their username (e.g. Ahmed#4523)'}
                </p>
                <div className="flex gap-2">
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendRequest()}
                    placeholder={t('friends_add_placeholder')}
                    className="flex-1 rounded-xl px-4 py-2.5 font-arabic text-sm outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(245,230,200,0.9)', direction: 'ltr' }}
                  />
                  <button
                    onClick={handleSendRequest}
                    disabled={loading || !searchQuery.trim()}
                    className="px-4 py-2.5 rounded-xl font-arabic font-bold text-sm transition-all disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #C9A84C, #8B6914)', color: '#04080F' }}>
                    {loading ? '...' : t('friends_add_btn')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
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
  return (
    <div className="rounded-xl p-4 flex items-center gap-3 border"
      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
      <div className="w-11 h-11 rounded-full flex items-center justify-center text-2xl"
        style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
        {AVATAR_EMOJIS[friend.avatarId] || '👤'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-arabic font-bold truncate" style={{ color: '#E8C97A', fontSize: 15 }}>{friend.displayName}</p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="font-arabic text-xs" style={{ color: 'rgba(245,230,200,0.3)', direction: 'ltr' }}>{friend.username}</span>
          <span className="font-arabic text-xs" style={{ color: 'rgba(201,168,76,0.5)' }}>{lang === 'ar' ? 'لv' : 'Lv'}{friend.level}</span>
          {friend.wins !== undefined && <span className="font-arabic text-xs" style={{ color: 'rgba(245,230,200,0.3)' }}>🏆 {friend.wins}</span>}
        </div>
      </div>
      <button disabled={busy} onClick={onAction}
        className="px-3 py-1.5 rounded-lg font-arabic text-xs transition-all disabled:opacity-50"
        style={{ background: actionStyle.color, border: `1px solid ${actionStyle.border}`, color: actionStyle.textColor }}>
        {busy ? '...' : actionLabel}
      </button>
    </div>
  );
}
