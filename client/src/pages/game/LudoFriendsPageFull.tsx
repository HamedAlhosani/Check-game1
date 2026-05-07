import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { apiClient } from '../../services/api.service';
import { soundService } from '../../services/sound.service';
import { useLang } from '../../i18n/useT';
import { LangToggle } from '../../components/shared/LangToggle';
import { socketService } from '../../services/socket.service';
import { SOCKET_EVENTS } from '@check-game/shared';
import { FrameRing } from '../../components/shared/FrameRing';
import { CharacterArt } from '../../components/shared/CharacterArt';
import { LudoPageBackground } from '../../components/game/ludo/BoardEmblems';

const SAND = {
  bg1: '#0E0905',
  gold: '#D9A441',
  goldLight: '#F6E6BE',
  goldDark: '#7A6303',
  cream: '#F4E4BE',
};

interface FriendInfo {
  uid: string;
  displayName: string;
  username: string;
  avatarId: string;
  level: number;
  wins?: number;
  equippedFrame?: string;
}

type Tab = 'friends' | 'requests' | 'add';

/**
 * Ludo-themed Friends page. Same data + endpoints as the Check Friends page,
 * just dressed in sand/gold/desert chrome so the player has a parallel UX
 * scoped to the Ludo home — no navigation back to the Check world needed.
 */
export function LudoFriendsPageFull() {
  const lang = useLang();
  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
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
  const [confirmRemove, setConfirmRemove] = useState<FriendInfo | null>(null);

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

  // Live updates
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;
    const onChanged = () => { fetchFriends(); };
    const onReceived = () => {
      fetchFriends();
      addToast(isAr ? '✦ وصلك طلب صداقة' : 'New friend request', 'info');
    };
    socket.on(SOCKET_EVENTS.FRIEND_LIST_CHANGED, onChanged);
    socket.on(SOCKET_EVENTS.FRIEND_REQUEST_RECEIVED, onReceived);
    return () => {
      socket.off(SOCKET_EVENTS.FRIEND_LIST_CHANGED, onChanged);
      socket.off(SOCKET_EVENTS.FRIEND_REQUEST_RECEIVED, onReceived);
    };
  }, [fetchFriends, addToast, isAr]);

  async function handleSendRequest() {
    if (!searchQuery.trim()) return;
    setLoading(true);
    soundService.playClick();
    try {
      await apiClient.post('/api/friends/request', { username: searchQuery.trim() });
      addToast(isAr ? '✦ تم إرسال الطلب' : 'Request sent', 'success');
      setSearchQuery('');
      fetchFriends();
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.includes('not found')) addToast(isAr ? 'الرقم غير موجود' : 'User not found', 'error');
      else if (msg.includes('Already friends')) addToast(isAr ? 'أنتم أصدقاء بالفعل' : 'Already friends', 'info');
      else if (msg.includes('already sent')) addToast(isAr ? 'الطلب مرسل مسبقاً' : 'Already sent', 'info');
      else if (msg.includes('yourself')) addToast(isAr ? 'ما تقدر تضيف نفسك 😄' : "Can't add yourself 😄", 'info');
      else addToast(isAr ? 'حدث خطأ' : 'Error', 'error');
    } finally { setLoading(false); }
  }

  async function handleAccept(uid: string) {
    setBusy(uid); soundService.playClick();
    try {
      await apiClient.post('/api/friends/accept', { uid });
      addToast(isAr ? '✓ صديق جديد' : 'New friend!', 'success');
      fetchFriends();
    } catch { addToast(isAr ? 'حدث خطأ' : 'Error', 'error'); }
    finally { setBusy(null); }
  }

  async function handleDecline(uid: string) {
    setBusy(uid); soundService.playClick();
    try { await apiClient.delete(`/api/friends/${uid}`); fetchFriends(); }
    catch {} finally { setBusy(null); }
  }

  async function performRemove(uid: string) {
    setBusy(uid); setConfirmRemove(null);
    try {
      await apiClient.delete(`/api/friends/${uid}`);
      addToast(isAr ? 'تم الحذف' : 'Removed', 'info');
      fetchFriends();
    } catch {} finally { setBusy(null); }
  }

  function copyUsername() {
    const number = (profile?.username || '').split('#')[1] || profile?.username || '';
    navigator.clipboard.writeText(number).then(() => {
      setCopied(true);
      soundService.playClick();
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const tabsMeta: { id: Tab; ar: string; en: string; icon: string; count: number }[] = [
    { id: 'friends',  ar: 'الأصدقاء', en: 'Friends',  icon: '👥', count: friends.length },
    { id: 'requests', ar: 'الطلبات',   en: 'Requests', icon: '📩', count: requests.length },
    { id: 'add',      ar: 'إضافة',     en: 'Add',      icon: '➕', count: 0 },
  ];

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
        <span className="font-display tracking-widest flex items-center gap-1.5"
          style={{ fontSize: 14, color: SAND.gold }}>
          <span style={{ fontSize: 16 }}>👥</span>
          {isAr ? 'أصدقاء لودو' : 'LUDO FRIENDS'}
        </span>
        <LangToggle />
      </nav>

      <main className="relative z-10 max-w-lg mx-auto px-4 pt-4 pb-12">
        {/* Your number card — desert framed */}
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 mb-5 flex items-center justify-between relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${SAND.gold}24 0%, #14100A 70%)`,
            border: `2px solid ${SAND.gold}88`,
            boxShadow: `0 8px 24px rgba(0,0,0,0.5), 0 0 28px ${SAND.gold}33`,
          }}>
          <div>
            <p className="font-arabic" style={{ fontSize: 11, color: `${SAND.gold}99`, letterSpacing: 2, marginBottom: 4 }}>
              {isAr ? '✦ رقمك ✦' : '✦ YOUR NUMBER ✦'}
            </p>
            <p className="font-bold font-mono" style={{ color: SAND.goldLight, fontSize: 28, lineHeight: 1.05, letterSpacing: 2, textShadow: `0 0 14px ${SAND.gold}88` }}>
              {(profile?.username || '').split('#')[1] || '...'}
            </p>
            <p className="font-arabic mt-1" style={{ color: 'rgba(245,230,200,0.4)', fontSize: 10, direction: 'ltr', textAlign: dir === 'rtl' ? 'right' : 'left' }}>
              {profile?.username || ''}
            </p>
          </div>
          <button
            onClick={copyUsername}
            className="px-3 py-2 rounded-xl font-arabic font-bold transition"
            style={{
              background: copied ? '#7AC74F' : `linear-gradient(135deg, ${SAND.goldLight}, ${SAND.gold})`,
              color: '#0E0905',
              border: `1.5px solid ${copied ? '#5AA840' : SAND.goldDark}`,
              fontSize: 12,
              boxShadow: copied ? '0 0 14px rgba(122,199,79,0.5)' : `0 0 14px ${SAND.gold}55`,
              cursor: 'pointer',
            }}>
            {copied ? (isAr ? '✓ نُسخ' : '✓ Copied') : (isAr ? '📋 انسخ' : '📋 Copy')}
          </button>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 rounded-xl p-1"
          style={{ background: '#14100A', border: `1.5px solid ${SAND.gold}33` }}>
          {tabsMeta.map(tt => {
            const sel = tab === tt.id;
            return (
              <button key={tt.id}
                onClick={() => { setTab(tt.id); soundService.playClick(); }}
                className="flex-1 py-2 rounded-lg font-arabic transition-all flex items-center justify-center gap-1.5"
                style={sel ? {
                  background: `linear-gradient(135deg, ${SAND.goldLight}, ${SAND.gold})`,
                  color: '#0E0905', fontWeight: 800, fontSize: 12,
                  boxShadow: `0 0 14px ${SAND.gold}55`,
                  cursor: 'pointer',
                } : {
                  color: 'rgba(245,230,200,0.55)', fontSize: 12,
                  cursor: 'pointer',
                }}>
                <span style={{ fontSize: 13 }}>{tt.icon}</span>
                {isAr ? tt.ar : tt.en}
                {tt.count > 0 && <span className="font-mono" style={{ fontSize: 11, opacity: 0.85 }}>({tt.count})</span>}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* Friends list */}
          {tab === 'friends' && (
            <motion.div key="friends" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
              {friends.length === 0 ? (
                <EmptyState icon="👥" titleAr="ما عندك أصدقاء بعد" titleEn="No friends yet"
                  subAr='افتح تبويب "إضافة" وأضف أحد' subEn='Open "Add" tab to invite someone' />
              ) : (
                <div className="space-y-2">
                  {friends.map(f => (
                    <FriendCard key={f.uid} friend={f} busy={busy === f.uid}
                      actionLabel={isAr ? 'حذف' : 'Remove'}
                      actionDanger
                      onAction={() => setConfirmRemove(f)}
                      isAr={isAr}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Requests */}
          {tab === 'requests' && (
            <motion.div key="requests" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
              {requests.length === 0 ? (
                <EmptyState icon="📩" titleAr="ما فيه طلبات" titleEn="No requests" />
              ) : (
                <div className="space-y-2">
                  {requests.map(f => (
                    <div key={f.uid} className="rounded-xl p-3 flex items-center gap-3"
                      style={{ background: '#14100A', border: `1.5px solid ${SAND.gold}33` }}>
                      <div className="relative shrink-0" style={{ width: 40, height: 40 }}>
                        <CharacterArt id={f.avatarId} size={40} />
                        <FrameRing size={40} frameId={f.equippedFrame} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-arabic font-bold truncate" style={{ color: SAND.cream, fontSize: 14 }}>{f.displayName}</p>
                        <p className="font-arabic" style={{ fontSize: 10, color: 'rgba(245,230,200,0.4)', direction: 'ltr' }}>{f.username}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button disabled={busy === f.uid} onClick={() => handleAccept(f.uid)}
                          className="rounded-lg px-3 py-1.5 font-arabic font-bold disabled:opacity-50"
                          style={{ background: '#7AC74F', color: '#0E0905', fontSize: 11, cursor: 'pointer' }}>
                          ✓ {isAr ? 'قبول' : 'Accept'}
                        </button>
                        <button disabled={busy === f.uid} onClick={() => handleDecline(f.uid)}
                          className="rounded-lg px-3 py-1.5 font-arabic font-bold disabled:opacity-50"
                          style={{ background: 'rgba(196,92,58,0.15)', border: '1px solid rgba(196,92,58,0.5)', color: '#E07040', fontSize: 11, cursor: 'pointer' }}>
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Add */}
          {tab === 'add' && (
            <motion.div key="add" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
              <div className="rounded-2xl p-5"
                style={{ background: '#14100A', border: `1.5px solid ${SAND.gold}55` }}>
                <p className="font-arabic font-bold mb-1" style={{ color: SAND.gold, fontSize: 14 }}>
                  {isAr ? '✦ أضف صديقاً' : '✦ Add a friend'}
                </p>
                <p className="font-arabic mb-4" style={{ fontSize: 11, color: 'rgba(245,230,200,0.5)' }}>
                  {isAr ? 'اكتب رقم صديقك (مثل 4523)' : 'Type your friend\'s number (e.g. 4523)'}
                </p>
                <div className="flex gap-2">
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendRequest()}
                    placeholder={isAr ? 'الرقم فقط' : 'Number only'}
                    inputMode="numeric"
                    className="flex-1 rounded-xl px-3 py-2.5 font-bold outline-none"
                    style={{
                      background: '#0E0905',
                      border: `1.5px solid ${SAND.gold}55`,
                      color: SAND.cream,
                      direction: 'ltr',
                      letterSpacing: 1,
                      fontSize: 16, // 16px keeps iOS Safari from auto-zooming on focus
                    }}
                  />
                  <button onClick={handleSendRequest} disabled={loading || !searchQuery.trim()}
                    className="px-4 py-2.5 rounded-xl font-arabic font-bold disabled:opacity-40"
                    style={{
                      background: `linear-gradient(135deg, ${SAND.goldLight}, ${SAND.gold})`,
                      color: '#0E0905', fontSize: 13,
                      boxShadow: `0 0 14px ${SAND.gold}55`,
                      cursor: loading ? 'wait' : 'pointer',
                    }}>
                    {loading ? '…' : (isAr ? 'أرسل' : 'Send')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Remove confirmation */}
      <AnimatePresence>
        {confirmRemove && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center px-6"
            style={{ background: 'rgba(8,4,2,0.85)', backdropFilter: 'blur(8px)' }}
            onClick={() => setConfirmRemove(null)}>
            <motion.div initial={{ scale: 0.92, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 8 }}
              className="rounded-2xl p-5 max-w-xs w-full text-center"
              style={{
                background: 'linear-gradient(180deg, #1F1810 0%, #14100A 100%)',
                border: '2px solid rgba(196,92,58,0.5)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.85), 0 0 28px rgba(196,92,58,0.4)',
              }}
              onClick={e => e.stopPropagation()}>
              <span style={{ fontSize: 38 }}>⚠</span>
              <h3 className="font-arabic font-bold mt-1" style={{ fontSize: 16, color: SAND.cream }}>
                {isAr ? 'تأكيد الحذف' : 'Confirm Remove'}
              </h3>
              <p className="font-arabic mt-2" style={{ fontSize: 12, color: 'rgba(245,230,200,0.6)', lineHeight: 1.5 }}>
                {isAr ? 'هل تريد حذف' : 'Remove'} <span style={{ color: SAND.gold, fontWeight: 700 }}>{confirmRemove.displayName}</span>{isAr ? ' من قائمتك؟' : ' from your list?'}
              </p>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setConfirmRemove(null)}
                  className="flex-1 rounded-xl py-2 font-arabic font-bold"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.12)', color: 'rgba(245,230,200,0.7)', fontSize: 13, cursor: 'pointer' }}>
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button onClick={() => performRemove(confirmRemove.uid)}
                  className="flex-1 rounded-xl py-2 font-arabic font-bold"
                  style={{ background: 'rgba(196,92,58,0.85)', color: '#fff', fontSize: 13, cursor: 'pointer', boxShadow: '0 0 14px rgba(196,92,58,0.55)' }}>
                  {isAr ? 'احذف' : 'Remove'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ icon, titleAr, titleEn, subAr, subEn }: { icon: string; titleAr: string; titleEn: string; subAr?: string; subEn?: string }) {
  const lang = useLang();
  const isAr = lang === 'ar';
  return (
    <div className="rounded-2xl p-8 text-center"
      style={{ background: '#14100A', border: `1.5px dashed ${SAND.gold}55` }}>
      <span style={{ fontSize: 40, lineHeight: 1, filter: `drop-shadow(0 0 18px ${SAND.gold}55)` }}>{icon}</span>
      <p className="font-arabic font-bold mt-2" style={{ fontSize: 14, color: SAND.cream }}>
        {isAr ? titleAr : titleEn}
      </p>
      {(subAr || subEn) && (
        <p className="font-arabic mt-1" style={{ fontSize: 11, color: 'rgba(245,230,200,0.4)' }}>
          {isAr ? subAr : subEn}
        </p>
      )}
    </div>
  );
}

function FriendCard({ friend, busy, actionLabel, actionDanger, onAction, isAr }: {
  friend: FriendInfo;
  busy: boolean;
  actionLabel: string;
  actionDanger?: boolean;
  onAction: () => void;
  isAr: boolean;
}) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/user/${friend.uid}`)}
      className="rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all hover:brightness-110"
      style={{ background: '#14100A', border: `1.5px solid ${SAND.gold}33` }}
      role="button" tabIndex={0}>
      <div className="relative shrink-0" style={{ width: 44, height: 44 }}>
        <CharacterArt id={friend.avatarId} size={44} />
        <FrameRing size={44} frameId={friend.equippedFrame} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-arabic font-bold truncate" style={{ color: SAND.cream, fontSize: 14 }}>{friend.displayName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-arabic" style={{ fontSize: 10, color: 'rgba(245,230,200,0.35)', direction: 'ltr' }}>{friend.username}</span>
          <span className="font-mono" style={{ fontSize: 10, color: SAND.gold }}>Lv{friend.level}</span>
          {friend.wins !== undefined && <span className="font-mono" style={{ fontSize: 10, color: 'rgba(245,230,200,0.55)' }}>🏆 {friend.wins}</span>}
        </div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onAction(); }} disabled={busy}
        className="rounded-lg px-3 py-1.5 font-arabic font-bold disabled:opacity-50"
        style={{
          background: actionDanger ? 'rgba(196,92,58,0.15)' : `${SAND.gold}22`,
          border: `1px solid ${actionDanger ? 'rgba(196,92,58,0.5)' : `${SAND.gold}66`}`,
          color: actionDanger ? '#E07040' : SAND.gold,
          fontSize: 11, cursor: 'pointer',
        }}>
        {busy ? '…' : actionLabel}
      </button>
    </div>
  );
}
