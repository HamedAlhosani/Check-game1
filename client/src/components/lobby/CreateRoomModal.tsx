import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { Input } from '../shared/Input';
import { Button } from '../shared/Button';
import { socketService } from '../../services/socket.service';
import { SOCKET_EVENTS, GameType } from '@check-game/shared';

interface Props {
  open: boolean;
  onClose: () => void;
  gameType: GameType;
}

export function CreateRoomModal({ open, onClose, gameType }: Props) {
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [botCount, setBotCount] = useState(0);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const handleCreate = () => {
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.emit(SOCKET_EVENTS.LOBBY_CREATE_ROOM, {
      name: name.trim() || 'غرفة جديدة',
      type: isPrivate ? 'private' : 'public',
      botCount,
      botDifficulty: difficulty,
      gameType,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="إنشاء غرفة جديدة" size="sm">
      <div className="space-y-4">
        <Input
          label="اسم الغرفة"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="غرفتي الخاصة"
        />

        <div className="flex gap-2">
          <button
            onClick={() => setIsPrivate(false)}
            className={`flex-1 py-2 rounded-lg border text-sm font-arabic transition-all
              ${!isPrivate ? 'border-gold bg-gold/10 text-gold' : 'border-gold/20 text-sand/50'}`}
          >
            عامة 🌍
          </button>
          <button
            onClick={() => setIsPrivate(true)}
            className={`flex-1 py-2 rounded-lg border text-sm font-arabic transition-all
              ${isPrivate ? 'border-gold bg-gold/10 text-gold' : 'border-gold/20 text-sand/50'}`}
          >
            خاصة 🔒
          </button>
        </div>

        <div>
          <label className="text-sand text-sm font-arabic block mb-2">بوتات ({botCount})</label>
          <input
            type="range" min={0} max={3} value={botCount}
            onChange={e => setBotCount(Number(e.target.value))}
            className="w-full accent-gold"
          />
        </div>

        {botCount > 0 && (
          <div className="flex gap-2">
            {(['easy', 'medium', 'hard'] as const).map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-1.5 rounded border text-xs font-arabic transition-all
                  ${difficulty === d ? 'border-gold bg-gold/10 text-gold' : 'border-gold/20 text-sand/50'}`}
              >
                {d === 'easy' ? 'سهل' : d === 'medium' ? 'متوسط' : 'صعب'}
              </button>
            ))}
          </div>
        )}

        <Button onClick={handleCreate} className="w-full">إنشاء الغرفة</Button>
      </div>
    </Modal>
  );
}
