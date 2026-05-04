import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { Button } from '../../components/shared/Button';
import { RoomCard } from '../../components/lobby/RoomCard';
import { CreateRoomModal } from '../../components/lobby/CreateRoomModal';
import { JoinPrivateModal } from '../../components/lobby/JoinPrivateModal';
import { WaitingRoom } from '../../components/lobby/WaitingRoom';
import { socketService } from '../../services/socket.service';
import { SOCKET_EVENTS, RoomState, GameType } from '@check-game/shared';
import { useLobbyStore } from '../../store/lobbyStore';
export function LobbyPage() {
  const { gameType } = useParams<{ gameType: string }>();
  const navigate = useNavigate();
  const { rooms, setRooms, currentRoom, setCurrentRoom } = useLobbyStore();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoinPrivate, setShowJoinPrivate] = useState(false);
  const [showBotPicker, setShowBotPicker] = useState(false);
  const [botDiff, setBotDiff] = useState<'easy' | 'medium' | 'hard'>('medium');

  const game = { type: 'check' as const, nameAr: 'Check', description: 'لعبة البطاقات', icon: '🂡' };
  const filteredRooms = rooms.filter(r => r.gameType === gameType && r.type === 'public');

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.on(SOCKET_EVENTS.LOBBY_ROOM_LIST, (data: RoomState[]) => setRooms(data));
    socket.on(SOCKET_EVENTS.LOBBY_ROOM_UPDATED, (room: RoomState) => setCurrentRoom(room));
    socket.on(SOCKET_EVENTS.LOBBY_GAME_STARTING, (data: { gameId: string; gameType: GameType }) => {
      setCurrentRoom(null);
      navigate(`/game/${data.gameType}/${data.gameId}`);
    });
    socket.on(SOCKET_EVENTS.LOBBY_ERROR, (data: { message: string }) => {
      console.error(data.message);
    });

    return () => {
      socket.off(SOCKET_EVENTS.LOBBY_ROOM_LIST);
      socket.off(SOCKET_EVENTS.LOBBY_ROOM_UPDATED);
      socket.off(SOCKET_EVENTS.LOBBY_GAME_STARTING);
      socket.off(SOCKET_EVENTS.LOBBY_ERROR);
    };
  }, []);

  const startBotGame = () => {
    const socket = socketService.getSocket();
    if (!socket) return;
    socket.emit(SOCKET_EVENTS.LOBBY_CREATE_ROOM, {
      name: 'لعبة بوتات',
      type: 'private',
      botCount: 3,
      botDifficulty: botDiff,
      gameType: game.type,
    });
    setShowBotPicker(false);
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate('/home')} className="text-sand/50 hover:text-gold transition-colors text-2xl">←</button>
          <span className="text-3xl">{game.icon}</span>
          <div>
            <h1 className="font-arabic text-2xl font-bold text-gold">{game.nameAr}</h1>
            <p className="text-sand/50 text-sm font-arabic">{game.description}</p>
          </div>
        </div>

        {currentRoom ? (
          <WaitingRoom room={currentRoom} />
        ) : (
          <>
            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Button onClick={() => setShowCreate(true)}>
                إنشاء غرفة +
              </Button>
              <Button variant="secondary" onClick={() => setShowJoinPrivate(true)}>
                انضم بكود 🔒
              </Button>
              <Button variant="secondary" onClick={() => setShowBotPicker(v => !v)}>
                مع بوتات 🤖
              </Button>
            </div>

            {/* Bot quick-start picker */}
            {showBotPicker && (
              <div className="mb-5 p-4 bg-night-mid border border-gold/20 rounded-2xl">
                <p className="text-sand/70 text-sm font-arabic mb-3">اختر مستوى البوتات (ستكون غرفة خاصة):</p>
                <div className="flex gap-2 mb-3">
                  {(['easy', 'medium', 'hard'] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => setBotDiff(d)}
                      className={`flex-1 py-2 rounded-xl border text-sm font-arabic transition-all
                        ${botDiff === d ? 'border-gold bg-gold/10 text-gold' : 'border-gold/20 text-sand/50 hover:border-gold/40'}`}
                    >
                      {d === 'easy' ? '😊 سهل' : d === 'medium' ? '😐 متوسط' : '😤 صعب'}
                    </button>
                  ))}
                </div>
                <Button onClick={startBotGame} className="w-full">
                  ابدأ مع 3 بوتات 🎮
                </Button>
              </div>
            )}

            {/* Public room list */}
            <div className="space-y-3">
              <h2 className="font-arabic text-sand/60 text-sm mb-3">الغرف العامة ({filteredRooms.length})</h2>
              {filteredRooms.length === 0 ? (
                <div className="text-center py-16 text-sand/30 font-arabic">
                  لا توجد غرف عامة حالياً
                  <br/>
                  <span className="text-sm">أنشئ غرفة أو العب مع البوتات</span>
                </div>
              ) : (
                filteredRooms.map(room => <RoomCard key={room.roomId} room={room} />)
              )}
            </div>
          </>
        )}
      </div>

      <CreateRoomModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        gameType={game.type}
      />
      <JoinPrivateModal
        open={showJoinPrivate}
        onClose={() => setShowJoinPrivate(false)}
      />
    </AppShell>
  );
}
