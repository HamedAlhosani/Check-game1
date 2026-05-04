import { RoomState } from '@check-game/shared';
import { socketService } from '../../services/socket.service';
import { SOCKET_EVENTS } from '@check-game/shared';
import { Button } from '../shared/Button';

interface Props {
  room: RoomState;
}

export function RoomCard({ room }: Props) {
  const handleJoin = () => {
    const socket = socketService.getSocket();
    socket?.emit(SOCKET_EVENTS.LOBBY_JOIN_ROOM, { roomId: room.roomId });
  };

  const filled = room.players.length;
  const isFull = filled >= 4;

  return (
    <div
      className="glass-card rounded-xl p-4 flex items-center justify-between transition-all cursor-default"
      style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.3)' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
          🂡
        </div>
        <div>
          <p className="text-sand-light font-arabic font-semibold leading-snug">{room.name}</p>
          <p className="text-sand/35 text-xs font-arabic">
            {room.players[0]?.displayName} • {filled}/4 لاعبين
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex gap-1" aria-label={`${filled} من 4`}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-5 rounded-full"
              style={{ background: i < filled ? 'rgba(201,168,76,0.7)' : 'rgba(201,168,76,0.12)' }}
            />
          ))}
        </div>
        <Button size="sm" onClick={handleJoin} disabled={isFull}>
          {isFull ? 'ممتلئة' : 'انضم'}
        </Button>
      </div>
    </div>
  );
}
