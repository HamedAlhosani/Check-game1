import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { Input } from '../shared/Input';
import { Button } from '../shared/Button';
import { socketService } from '../../services/socket.service';
import { SOCKET_EVENTS } from '@check-game/shared';

interface Props {
  open: boolean;
  onClose: () => void;
  onBeforeJoin?: () => void;
}

export function JoinPrivateModal({ open, onClose, onBeforeJoin }: Props) {
  const [code, setCode] = useState('');

  const handleJoin = () => {
    const socket = socketService.getSocket();
    if (!socket || code.length < 4) return;
    onBeforeJoin?.();
    socket.emit(SOCKET_EVENTS.LOBBY_JOIN_PRIVATE, { code: code.toUpperCase() });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="انضم بكود" size="sm">
      <div className="space-y-4">
        <Input
          label="كود الغرفة"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="XXXXXX"
          maxLength={8}
          className="text-center text-2xl tracking-widest"
          dir="ltr"
        />
        <Button onClick={handleJoin} className="w-full" disabled={code.length < 4}>
          انضمام
        </Button>
      </div>
    </Modal>
  );
}
