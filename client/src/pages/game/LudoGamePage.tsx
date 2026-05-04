import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { socketService } from '../../services/socket.service';
import { SOCKET_EVENTS, LudoGameState } from '@check-game/shared';
import { useState } from 'react';
import { LudoBoard } from '../../components/game/ludo/LudoBoard';

export function LudoGamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const [state, setState] = useState<LudoGameState | null>(null);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.on(SOCKET_EVENTS.LUDO_STATE, (s: LudoGameState) => setState(s));
    socket.on(SOCKET_EVENTS.SYSTEM_RECONNECT_STATE, (s: LudoGameState) => {
      if ('diceValue' in s) setState(s);
    });

    return () => {
      socket.off(SOCKET_EVENTS.LUDO_STATE);
      socket.off(SOCKET_EVENTS.SYSTEM_RECONNECT_STATE);
    };
  }, []);

  if (!state || !gameId) {
    return (
      <div className="min-h-screen bg-night flex items-center justify-center">
        <p className="text-gold font-arabic animate-pulse">جاري تحميل اللعبة...</p>
      </div>
    );
  }

  return <LudoBoard gameId={gameId} state={state} />;
}
