import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { socketService } from '../../services/socket.service';
import { SOCKET_EVENTS, GameState } from '@check-game/shared';
import { useGameStore } from '../../store/gameStore';
import { CheckBoard } from '../../components/game/check/CheckBoard';
import { useUiStore } from '../../store/uiStore';

/**
 * Read-only spectator view of a friend's public game. Differs from
 * CheckGamePage in two ways: it announces itself with GAME_SPECTATE on
 * mount (so the server joins the socket to the game's room) and it
 * unannounces on unmount (so we don't leak idle observers in the room).
 *
 * The board itself is the same component the seated players see, but
 * with `spectator` set so the GameOver modal hides "Play Again" and a
 * "وضع المشاهدة" badge anchors at the top.
 */
export function CheckSpectatePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const { gameState, setGameState, addChatMessage, setLastScores, setShowScoreBoard, reset } = useGameStore();

  useEffect(() => {
    document.documentElement.classList.add('game-locked');
    return () => { document.documentElement.classList.remove('game-locked'); };
  }, []);

  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;
    reset();
    (async () => {
      let socket;
      try {
        socket = await socketService.ensureReady(5000);
      } catch {
        if (!cancelled) {
          addToast('تعذر الاتصال بالخادم', 'error');
          navigate('/friends');
        }
        return;
      }
      if (cancelled) return;

      const onState = (state: GameState) => setGameState(state);
      const onChat = (msg: any) => addChatMessage(msg);
      const onScores = (s: any) => {
        setLastScores(s);
        setShowScoreBoard(true);
        setTimeout(() => setShowScoreBoard(false), 8000);
      };
      const onError = (data: { message: string }) => {
        addToast(data.message || 'تعذر مشاهدة اللعبة', 'error');
        navigate('/friends');
      };

      socket.on(SOCKET_EVENTS.GAME_STATE, onState);
      socket.on(SOCKET_EVENTS.SYSTEM_RECONNECT_STATE, onState);
      socket.on(SOCKET_EVENTS.CHAT_MESSAGE, onChat);
      socket.on(SOCKET_EVENTS.GAME_SCORES, onScores);
      socket.on(SOCKET_EVENTS.LOBBY_ERROR, onError);

      socket.emit(SOCKET_EVENTS.GAME_SPECTATE, { gameId });
    })();

    return () => {
      cancelled = true;
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit(SOCKET_EVENTS.GAME_SPECTATE_LEAVE, { gameId });
        socket.off(SOCKET_EVENTS.GAME_STATE);
        socket.off(SOCKET_EVENTS.SYSTEM_RECONNECT_STATE);
        socket.off(SOCKET_EVENTS.CHAT_MESSAGE);
        socket.off(SOCKET_EVENTS.GAME_SCORES);
        socket.off(SOCKET_EVENTS.LOBBY_ERROR);
      }
      reset();
    };
  }, [gameId]);

  if (!gameState || !gameId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0E0905' }}>
        <div className="text-center">
          <p className="font-display text-3xl tracking-widest shimmer-text mb-4">CHECK</p>
          <p className="text-sand/40 font-arabic text-sm animate-pulse">جاري الاتصال باللعبة...</p>
        </div>
      </div>
    );
  }

  return (
    <CheckBoard
      gameId={gameId}
      roomId={gameState.roomId}
      gameState={gameState}
      spectator
    />
  );
}
