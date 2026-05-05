import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RoomState, RoomPlayer } from '@check-game/shared';
import { socketService } from '../../services/socket.service';
import { SOCKET_EVENTS } from '@check-game/shared';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { useLang } from '../../i18n/useT';

const AV_COLORS = ['#C9A84C','#4A90D9','#50C878','#E74C3C','#9B59B6','#E67E22','#1ABC9C','#E91E63'];
function avatarColor(id: string) {
  const i = parseInt(id?.replace(/\D/g, '') || '1', 10) - 1;
  return AV_COLORS[i % AV_COLORS.length];
}

function PlayerSlot({ player, isHost, hostUid, onRemoveBot }: {
  player: RoomPlayer;
  isHost: boolean;
  hostUid: string;
  onRemoveBot: (uid: string) => void;
}) {
  const lang = useLang();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="rounded-xl p-3 flex flex-col items-center gap-2 relative border"
      style={{
        background: player.isBot
          ? 'rgba(80,200,120,0.06)'
          : player.isReady
            ? 'rgba(45,110,78,0.12)'
            : 'rgba(201,168,76,0.06)',
        borderColor: player.isBot
          ? 'rgba(80,200,120,0.25)'
          : player.isReady
            ? 'rgba(45,110,78,0.4)'
            : 'rgba(201,168,76,0.2)',
      }}
    >
      {/* Remove bot button */}
      {isHost && player.isBot && (
        <button
          onClick={() => onRemoveBot(player.uid)}
          className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center rounded-full transition-all"
          style={{ background: 'rgba(196,92,58,0.15)', color: '#E07040', fontSize: 14, lineHeight: 1 }}
        >
          ×
        </button>
      )}

      {/* Avatar */}
      <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-base"
        style={{ background: avatarColor(player.avatarId), border: '2px solid rgba(201,168,76,0.25)', boxShadow: player.uid === hostUid ? '0 0 10px rgba(201,168,76,0.3)' : 'none' }}>
        {player.isBot ? '🤖' : player.displayName?.slice(0, 2) || '?'}
      </div>

      {/* Name */}
      <p className="font-arabic text-xs font-bold text-center truncate w-full px-1"
        style={{ color: player.isBot ? 'rgba(80,200,120,0.9)' : '#E8C97A' }}>
        {player.displayName}
        {player.uid === hostUid && <span className="mr-0.5">👑</span>}
      </p>

      {/* Status */}
      <span className="font-arabic text-center" style={{ fontSize: 10, color: player.isBot ? 'rgba(80,200,120,0.6)' : player.isReady ? '#2D6E4E' : 'rgba(245,230,200,0.3)' }}>
        {player.isBot
          ? (player.botDifficulty === 'easy' ? (lang === 'ar' ? 'سهل' : 'Easy') : player.botDifficulty === 'hard' ? (lang === 'ar' ? 'صعب' : 'Hard') : (lang === 'ar' ? 'متوسط' : 'Medium'))
          : player.isReady
            ? (lang === 'ar' ? 'جاهز ✓' : 'Ready ✓')
            : (lang === 'ar' ? 'ينتظر...' : 'Waiting...')}
      </span>
    </motion.div>
  );
}

function EmptySlot({ isHost, onAddBot, disabled }: { isHost: boolean; onAddBot: () => void; disabled?: boolean }) {
  const lang = useLang();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.8, pointerEvents: 'none' }}
      className="rounded-xl p-3 flex flex-col items-center justify-center gap-2 border min-h-[100px] transition-all"
      style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)', borderStyle: 'dashed' }}
    >
      {isHost ? (
        <button
          onClick={onAddBot}
          disabled={disabled}
          className="flex flex-col items-center gap-1 transition-all group"
          style={{ opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
        >
          <span className="text-2xl opacity-30 group-hover:opacity-70 transition-opacity">🤖</span>
          <span className="font-arabic text-xs" style={{ color: 'rgba(201,168,76,0.4)' }}>
            {lang === 'ar' ? '+ بوت' : '+ Bot'}
          </span>
        </button>
      ) : (
        <span className="font-arabic text-xs" style={{ color: 'rgba(245,230,200,0.2)' }}>
          {lang === 'ar' ? 'مقعد فارغ' : 'Empty seat'}
        </span>
      )}
    </motion.div>
  );
}

interface Props {
  room: RoomState;
  onLeave?: () => void;
}

export function WaitingRoom({ room, onLeave }: Props) {
  const lang = useLang();
  const { user } = useAuthStore();
  const { addToast } = useUiStore();
  const socket = socketService.getSocket();
  const isHost = room.hostUid === user?.uid;
  const me = room.players.find(p => p.uid === user?.uid);
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [copied, setCopied] = useState(false);
  const [addingBot, setAddingBot] = useState(false);

  const maxPlayers = room.maxPlayers ?? 10;
  const emptySlots = maxPlayers - room.players.length;
  const cols = maxPlayers <= 4 ? 2 : maxPlayers <= 6 ? 3 : 4;

  const handleReady = () => socket?.emit(SOCKET_EVENTS.LOBBY_PLAYER_READY, { roomId: room.roomId, ready: !me?.isReady });
  const handleStart = () => socket?.emit(SOCKET_EVENTS.LOBBY_START_GAME, { roomId: room.roomId });
  const handleLeave = () => {
    socket?.emit(SOCKET_EVENTS.LOBBY_LEAVE_ROOM, { roomId: room.roomId });
    onLeave?.();
  };
  const handleAddBot = () => {
    if (addingBot) return;
    setAddingBot(true);
    socket?.emit(SOCKET_EVENTS.LOBBY_ADD_BOT, { roomId: room.roomId, difficulty: botDifficulty });
    setTimeout(() => setAddingBot(false), 800);
  };
  const handleRemoveBot = (botUid: string) => socket?.emit(SOCKET_EVENTS.LOBBY_REMOVE_BOT, { roomId: room.roomId, botUid });
  const handleFillWithBots = () => {
    if (addingBot) return;
    setAddingBot(true);
    for (let i = 0; i < emptySlots; i++) {
      socket?.emit(SOCKET_EVENTS.LOBBY_ADD_BOT, { roomId: room.roomId, difficulty: botDifficulty });
    }
    setTimeout(() => setAddingBot(false), 800);
  };

  const copyCode = () => {
    if (!room.code) return;
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    addToast(lang === 'ar' ? `تم نسخ الكود: ${room.code}` : `Code copied: ${room.code}`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const diffOptions: { v: 'easy' | 'medium' | 'hard'; ar: string; en: string }[] = [
    { v: 'easy',   ar: 'سهل',   en: 'Easy' },
    { v: 'medium', ar: 'متوسط', en: 'Medium' },
    { v: 'hard',   ar: 'صعب',   en: 'Hard' },
  ];

  return (
    <div className="flex flex-col gap-4">

      {/* Room code banner */}
      {room.code && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 text-center border"
          style={{ background: 'rgba(201,168,76,0.06)', borderColor: 'rgba(201,168,76,0.2)' }}
        >
          <p className="font-arabic text-xs mb-2" style={{ color: 'rgba(245,230,200,0.45)' }}>
            {lang === 'ar' ? 'شارك هذا الكود مع أصدقائك' : 'Share this code with your friends'}
          </p>
          <button
            onClick={copyCode}
            className="inline-flex items-center gap-3 rounded-xl px-6 py-3 transition-all border"
            style={{
              background: copied ? 'rgba(45,110,78,0.15)' : 'rgba(201,168,76,0.08)',
              borderColor: copied ? 'rgba(45,110,78,0.4)' : 'rgba(201,168,76,0.35)',
            }}
          >
            <span className="font-mono font-bold tracking-[0.3em]" style={{ fontSize: 26, color: '#E8C97A', letterSpacing: '0.3em' }}>
              {room.code}
            </span>
            <span style={{ fontSize: 18 }}>{copied ? '✓' : '📋'}</span>
          </button>
          <p className="font-arabic text-xs mt-2" style={{ color: 'rgba(245,230,200,0.3)' }}>
            {lang === 'ar' ? 'انقر للنسخ' : 'Click to copy'}
          </p>
        </motion.div>
      )}

      {/* Header: room name + player count */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-arabic font-bold" style={{ fontSize: 17, color: '#E8C97A' }}>{room.name}</h2>
          <p className="font-arabic text-xs mt-0.5" style={{ color: 'rgba(245,230,200,0.4)' }}>
            {room.players.length}/{maxPlayers} {lang === 'ar' ? 'لاعبين' : 'players'} •{' '}
            {lang === 'ar' ? 'في الانتظار' : 'Waiting'}
          </p>
        </div>
        {/* Pulse indicator */}
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="w-2 h-2 rounded-full"
            style={{ background: '#50C878' }}
          />
          <span className="font-arabic text-xs" style={{ color: 'rgba(80,200,120,0.8)' }}>
            {lang === 'ar' ? 'مباشر' : 'Live'}
          </span>
        </div>
      </div>

      {/* Players grid */}
      <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        <AnimatePresence mode="popLayout">
          {Array.from({ length: maxPlayers }).map((_, i) => {
            const p = room.players[i];
            return p ? (
              <PlayerSlot
                key={p.uid}
                player={p}
                isHost={isHost}
                hostUid={room.hostUid}
                onRemoveBot={handleRemoveBot}
              />
            ) : (
              <EmptySlot key={`empty-${i}`} isHost={true} onAddBot={handleAddBot} disabled={addingBot} />
            );
          })}
        </AnimatePresence>
      </div>

      {/* Room info summary — visible to ALL players */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl px-4 py-3 border flex items-center gap-4 flex-wrap"
        style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(201,168,76,0.12)' }}
      >
        {/* Host name */}
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: 13 }}>👑</span>
          <span className="font-arabic text-xs" style={{ color: 'rgba(245,230,200,0.5)' }}>
            {lang === 'ar' ? 'المضيف:' : 'Host:'}
          </span>
          <span className="font-arabic text-xs font-bold" style={{ color: '#E8C97A' }}>
            {room.players.find(p => p.uid === room.hostUid)?.displayName || '—'}
          </span>
        </div>

        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)' }} />

        {/* Real players count */}
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: 13 }}>👥</span>
          <span className="font-arabic text-xs font-bold" style={{ color: 'rgba(245,230,200,0.7)' }}>
            {room.players.filter(p => !p.isBot).length} {lang === 'ar' ? 'لاعب' : 'players'}
          </span>
        </div>

        {/* Bots info */}
        {room.players.some(p => p.isBot) && (
          <>
            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)' }} />
            <div className="flex items-center gap-1.5">
              <span style={{ fontSize: 13 }}>🤖</span>
              <span className="font-arabic text-xs font-bold" style={{ color: 'rgba(80,200,120,0.8)' }}>
                {room.players.filter(p => p.isBot).length} {lang === 'ar' ? 'بوت' : 'bots'}
              </span>
              <span className="font-arabic text-xs px-2 py-0.5 rounded-lg"
                style={{ background: 'rgba(80,200,120,0.1)', border: '1px solid rgba(80,200,120,0.25)', color: 'rgba(80,200,120,0.9)' }}>
                {(() => {
                  const d = room.players.find(p => p.isBot)?.botDifficulty || 'medium';
                  if (lang === 'ar') return d === 'easy' ? 'سهل' : d === 'hard' ? 'صعب' : 'متوسط';
                  return d === 'easy' ? 'Easy' : d === 'hard' ? 'Hard' : 'Medium';
                })()}
              </span>
            </div>
          </>
        )}

        {/* Empty seats */}
        {emptySlots > 0 && (
          <>
            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)' }} />
            <span className="font-arabic text-xs" style={{ color: 'rgba(245,230,200,0.3)' }}>
              {emptySlots} {lang === 'ar' ? 'مقعد فارغ' : 'empty'}
            </span>
          </>
        )}
      </motion.div>

      {/* Bot controls — visible to all players when there are empty seats */}
      {emptySlots > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-4 border"
          style={{ background: 'rgba(80,200,120,0.04)', borderColor: 'rgba(80,200,120,0.15)' }}
        >
          <p className="font-arabic text-xs mb-3" style={{ color: 'rgba(245,230,200,0.4)' }}>
            🤖 {lang === 'ar' ? `${emptySlots} مقعد فارغ — أضف بوتات` : `${emptySlots} empty seat${emptySlots > 1 ? 's' : ''} — add bots`}
          </p>

          {/* Difficulty selector */}
          <div className="flex gap-2 mb-3">
            {diffOptions.map(d => (
              <button
                key={d.v}
                onClick={() => setBotDifficulty(d.v)}
                className="flex-1 py-1.5 rounded-lg font-arabic text-xs transition-all"
                style={{
                  background: botDifficulty === d.v ? 'rgba(80,200,120,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${botDifficulty === d.v ? 'rgba(80,200,120,0.45)' : 'rgba(255,255,255,0.08)'}`,
                  color: botDifficulty === d.v ? 'rgba(80,200,120,0.95)' : 'rgba(245,230,200,0.4)',
                  fontWeight: botDifficulty === d.v ? 700 : 400,
                }}
              >
                {lang === 'ar' ? d.ar : d.en}
              </button>
            ))}
          </div>

          {/* Buttons row */}
          <div className="flex gap-2">
            <button
              onClick={handleAddBot}
              disabled={addingBot}
              className="flex-1 py-2 rounded-xl font-arabic text-sm font-bold transition-all border"
              style={{
                background: addingBot ? 'rgba(80,200,120,0.04)' : 'rgba(80,200,120,0.08)',
                borderColor: 'rgba(80,200,120,0.3)',
                color: addingBot ? 'rgba(80,200,120,0.4)' : 'rgba(80,200,120,0.9)',
                cursor: addingBot ? 'not-allowed' : 'pointer',
              }}
            >
              {addingBot ? '...' : `+ ${lang === 'ar' ? 'بوت واحد' : 'Add Bot'}`}
            </button>
            {emptySlots > 1 && (
              <button
                onClick={handleFillWithBots}
                disabled={addingBot}
                className="flex-1 py-2 rounded-xl font-arabic text-sm font-bold transition-all border"
                style={{
                  background: addingBot ? 'rgba(80,200,120,0.04)' : 'rgba(80,200,120,0.12)',
                  borderColor: 'rgba(80,200,120,0.4)',
                  color: addingBot ? 'rgba(80,200,120,0.4)' : 'rgba(80,200,120,1)',
                  cursor: addingBot ? 'not-allowed' : 'pointer',
                }}
              >
                ⚡ {lang === 'ar' ? `أكمل الكل (${emptySlots})` : `Fill All (${emptySlots})`}
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 mt-1">
        {isHost ? (
          <button
            onClick={handleStart}
            disabled={room.players.length < 2}
            className="flex-1 py-3 rounded-xl font-arabic font-bold text-sm transition-all"
            style={room.players.length >= 2 ? {
              background: 'linear-gradient(135deg, #C9A84C, #8B6914)',
              color: '#0A0614',
              boxShadow: '0 0 20px rgba(201,168,76,0.3)',
              border: '1px solid rgba(201,168,76,0.5)',
            } : {
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.07)',
              cursor: 'not-allowed',
            }}
          >
            {lang === 'ar' ? 'ابدأ اللعبة ←' : 'Start Game →'}
          </button>
        ) : (
          <div className="flex-1 py-3 rounded-xl font-arabic font-bold text-sm text-center border"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(245,230,200,0.35)' }}>
            {lang === 'ar' ? 'بانتظار المضيف...' : 'Waiting for host...'}
          </div>
        )}
        <button
          onClick={handleLeave}
          className="px-5 py-3 rounded-xl font-arabic text-sm transition-all border"
          style={{ background: 'rgba(196,92,58,0.07)', borderColor: 'rgba(196,92,58,0.25)', color: '#E07040' }}
        >
          {lang === 'ar' ? 'خروج' : 'Leave'}
        </button>
      </div>
    </div>
  );
}
