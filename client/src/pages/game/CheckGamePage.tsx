import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { socketService } from '../../services/socket.service';
import { SOCKET_EVENTS, GameState } from '@check-game/shared';
import { useGameStore } from '../../store/gameStore';
import { CheckBoard } from '../../components/game/check/CheckBoard';
import { useLobbyStore } from '../../store/lobbyStore';

export function CheckGamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { gameState, setGameState, addChatMessage, setLastScores, setShowScoreBoard } = useGameStore();
  const { currentRoom } = useLobbyStore();

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.on(SOCKET_EVENTS.GAME_STATE, (state: GameState) => setGameState(state));
    socket.on(SOCKET_EVENTS.SYSTEM_RECONNECT_STATE, (state: GameState) => setGameState(state));
    socket.on(SOCKET_EVENTS.CHAT_MESSAGE, (msg: any) => addChatMessage(msg));
    socket.on(SOCKET_EVENTS.GAME_SCORES, (s: any) => {
      setLastScores(s);
      setShowScoreBoard(true);
      setTimeout(() => setShowScoreBoard(false), 8000);
    });

    return () => {
      socket.off(SOCKET_EVENTS.GAME_STATE);
      socket.off(SOCKET_EVENTS.SYSTEM_RECONNECT_STATE);
      socket.off(SOCKET_EVENTS.CHAT_MESSAGE);
      socket.off(SOCKET_EVENTS.GAME_SCORES);
    };
  }, []);

  if (!gameState || !gameId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0E0905' }}>
        <div className="text-center">
          <p className="font-display text-3xl tracking-widest shimmer-text mb-4">CHECK</p>
          <p className="text-sand/40 font-arabic text-sm animate-pulse">جاري تحميل اللعبة...</p>
        </div>
      </div>
    );
  }

  return (
    <CheckBoard
      gameId={gameId}
      roomId={gameState.roomId}
      gameState={gameState}
    />
  );
}
