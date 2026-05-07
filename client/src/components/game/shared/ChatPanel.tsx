import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { socketService } from '../../../services/socket.service';
import { SOCKET_EVENTS } from '@check-game/shared';
import { useGameStore } from '../../../store/gameStore';
import { Avatar } from '../../shared/Avatar';
import { useAuthStore } from '../../../store/authStore';

interface Props {
  roomId: string;
  open: boolean;
  onToggle: () => void;
}

const formatTime = (ts: number) => {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

export function ChatPanel({ roomId, open, onToggle }: Props) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const { chatMessages } = useGameStore();
  const { user } = useAuthStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chatMessages, open]);

  // Group consecutive messages from same author within 2 min — hide repeated avatar/name
  const grouped = useMemo(() => {
    return chatMessages.map((m, i) => {
      const prev = chatMessages[i - 1];
      const grouped = !!prev && prev.uid === m.uid && (m.timestamp - prev.timestamp) < 120_000;
      return { ...m, grouped };
    });
  }, [chatMessages]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    socketService.getSocket()?.emit(SOCKET_EVENTS.CHAT_SEND, { roomId, text: t.slice(0, 200) });
    setText('');
  };

  const onEmoji = (e: EmojiClickData) => {
    socketService.getSocket()?.emit(SOCKET_EVENTS.CHAT_SEND, { roomId, text: e.emoji, emoji: e.emoji });
    setShowEmoji(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="chat-panel"
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.96 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed bottom-16 left-3 z-40 w-[calc(100vw-1.5rem)] max-w-[22rem] sm:w-80"
        >
          <div
            className="glass-card rounded-2xl overflow-hidden shadow-2xl shadow-black/60 flex flex-col relative"
            style={{ height: 'min(420px, 68vh)' }}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gold/15 bg-gradient-to-l from-gold/10 via-gold/5 to-transparent">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
                <span className="text-sand-light text-sm font-arabic font-bold">الشات</span>
                {chatMessages.length > 0 && (
                  <span className="text-sand/40 text-[10px] font-arabic">{chatMessages.length} رسالة</span>
                )}
              </div>
              <button
                onClick={onToggle}
                className="text-sand/50 hover:text-sand-light active:scale-90 w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center transition"
                aria-label="إغلاق الشات"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>
            </div>

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3">
              {grouped.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-sand/35 font-arabic text-xs select-none">
                  <span className="text-3xl opacity-60">💬</span>
                  <span>ابدا الحديث مع اللاعبين</span>
                </div>
              ) : (
                grouped.map((m, i) => {
                  const isMe = m.uid === user?.uid;
                  return (
                    <div
                      key={i}
                      className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''} ${m.grouped ? 'mt-0.5' : 'mt-2.5 first:mt-0'}`}
                    >
                      <div className="w-7 flex-shrink-0 pt-4">
                        {!m.grouped && <Avatar avatarId={m.avatarId} size="xs" />}
                      </div>
                      <div className={`max-w-[78%] flex flex-col ${isMe ? 'items-end' : 'items-start'} min-w-0`}>
                        {!m.grouped && (
                          <span className={`text-[10px] font-arabic mb-0.5 px-1.5 ${isMe ? 'text-gold/70' : 'text-sand/55'}`}>
                            {m.displayName}
                          </span>
                        )}
                        <div
                          className={`px-3 py-1.5 font-arabic text-[15px] break-words leading-snug shadow-sm
                            ${isMe
                              ? `bg-gradient-to-br from-gold/35 to-gold/20 text-sand-light border border-gold/30 ${m.grouped ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-br-sm'}`
                              : `bg-night/70 text-sand border border-white/5 ${m.grouped ? 'rounded-2xl rounded-bl-md' : 'rounded-2xl rounded-bl-sm'}`
                            }`}
                        >
                          {m.text}
                        </div>
                        <span className="text-sand/25 text-[9px] mt-0.5 px-1.5 font-mono">{formatTime(m.timestamp)}</span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* ── Input ── */}
            <div className="border-t border-gold/15 p-2 bg-night-deep/50">
              <div className="flex items-center gap-1 bg-night/70 rounded-xl border border-white/10 focus-within:border-gold/45 transition">
                <button
                  onClick={() => setShowEmoji(s => !s)}
                  className={`text-lg w-9 h-9 flex items-center justify-center rounded-lg active:scale-90 transition flex-shrink-0
                    ${showEmoji ? 'text-gold-light bg-gold/15' : 'text-gold/70 hover:text-gold-light hover:bg-gold/10'}`}
                  aria-label="إيموجي"
                >
                  😀
                </button>
                <input
                  className="flex-1 min-w-0 bg-transparent text-sand-light outline-none placeholder-sand/30 font-arabic py-2"
                  // 16px is the magic minimum that prevents iOS Safari from zooming in on focus.
                  // Don't drop below this — Tailwind's text-sm/14px triggers the auto-zoom.
                  style={{ fontSize: '16px' }}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
                  placeholder="رسالة..."
                  maxLength={200}
                  enterKeyHint="send"
                  autoComplete="off"
                  autoCorrect="off"
                />
                <button
                  onClick={send}
                  disabled={!text.trim()}
                  className="w-9 h-9 mr-1 rounded-lg flex items-center justify-center text-night-deep bg-gradient-to-br from-gold-light to-gold disabled:opacity-25 disabled:cursor-not-allowed enabled:hover:brightness-110 enabled:active:scale-90 transition flex-shrink-0"
                  aria-label="إرسال"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 5l-7 7 7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ── Emoji picker ── */}
            {showEmoji && (
              <div className="absolute bottom-full left-0 mb-2">
                <EmojiPicker onEmojiClick={onEmoji} theme={'dark' as any} width={280} height={320} />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
