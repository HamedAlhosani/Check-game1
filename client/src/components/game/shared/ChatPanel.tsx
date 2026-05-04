import { useState, useRef, useEffect } from 'react';
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

export function ChatPanel({ roomId, open, onToggle }: Props) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const { chatMessages } = useGameStore();
  const { user } = useAuthStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const send = () => {
    if (!text.trim()) return;
    const socket = socketService.getSocket();
    socket?.emit(SOCKET_EVENTS.CHAT_SEND, { roomId, text: text.slice(0, 200) });
    setText('');
  };

  const onEmoji = (e: EmojiClickData) => {
    const socket = socketService.getSocket();
    socket?.emit(SOCKET_EVENTS.CHAT_SEND, { roomId, text: e.emoji, emoji: e.emoji });
    setShowEmoji(false);
  };

  return (
    <div className={`fixed bottom-16 left-4 z-40 flex flex-col gap-2 transition-all ${open ? 'w-72' : 'w-0 overflow-hidden'}`}>
      {open && (
        <div className="bg-night-mid border border-gold/20 rounded-xl overflow-hidden shadow-xl flex flex-col" style={{ height: '320px' }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.uid === user?.uid ? 'flex-row-reverse' : ''}`}>
                <Avatar avatarId={m.avatarId} size="xs" />
                <div className={`max-w-[70%] ${m.uid === user?.uid ? 'items-end' : 'items-start'} flex flex-col`}>
                  <span className="text-sand/40 text-xs font-arabic">{m.displayName}</span>
                  <span className={`text-sm font-arabic px-2.5 py-1.5 rounded-lg
                    ${m.uid === user?.uid ? 'bg-gold/20 text-sand-light' : 'bg-night/50 text-sand'}`}>
                    {m.text}
                  </span>
                </div>
              </div>
            ))}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div className="border-t border-gold/10 p-2 flex gap-1">
            <button
              onClick={() => setShowEmoji(s => !s)}
              className="text-gold/60 hover:text-gold text-lg px-1"
            >😀</button>
            <input
              className="flex-1 bg-transparent text-sand-light text-sm outline-none placeholder-sand/30 font-arabic"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="رسالة..."
              maxLength={200}
            />
            <button onClick={send} className="text-gold hover:text-gold-light text-sm px-1">إرسال</button>
          </div>

          {showEmoji && (
            <div className="absolute bottom-full left-0 mb-2">
              <EmojiPicker onEmojiClick={onEmoji} theme={'dark' as any} width={260} height={300}/>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
