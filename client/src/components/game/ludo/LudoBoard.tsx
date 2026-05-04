import { useState, useEffect } from 'react';
import { LudoGameState, LudoPiece, LUDO_START_OFFSETS, SOCKET_EVENTS } from '@check-game/shared';
import { socketService } from '../../../services/socket.service';
import { useAuthStore } from '../../../store/authStore';
import { LudoDice } from './LudoDice';
import { PlayerAvatar } from '../shared/PlayerAvatar';
import { ChatPanel } from '../shared/ChatPanel';
import { GameOverModal } from '../shared/GameOverModal';
import { useNavigate } from 'react-router-dom';

const COLORS = {
  red: { bg: 'bg-ludo-red', text: 'text-ludo-red', border: 'border-ludo-red' },
  blue: { bg: 'bg-ludo-blue', text: 'text-ludo-blue', border: 'border-ludo-blue' },
  green: { bg: 'bg-ludo-green', text: 'text-ludo-green', border: 'border-ludo-green' },
  yellow: { bg: 'bg-ludo-yellow', text: 'text-ludo-yellow', border: 'border-ludo-yellow' },
};

interface Props {
  gameId: string;
  state: LudoGameState;
}

export function LudoBoard({ gameId, state }: Props) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [gameOver, setGameOver] = useState<any>(null);

  const socket = socketService.getSocket();
  const me = state.players.find(p => p.uid === user?.uid);
  const isMyTurn = me?.isTurn;

  useEffect(() => {
    if (!socket) return;
    socket.on(SOCKET_EVENTS.LUDO_DICE_ROLLED, () => {
      setRolling(true);
      setTimeout(() => setRolling(false), 800);
    });
    socket.on(SOCKET_EVENTS.LUDO_GAME_OVER, (data: any) => setGameOver(data));
    return () => {
      socket.off(SOCKET_EVENTS.LUDO_DICE_ROLLED);
      socket.off(SOCKET_EVENTS.LUDO_GAME_OVER);
    };
  }, [socket]);

  const onRoll = () => {
    socket?.emit(SOCKET_EVENTS.LUDO_ROLL_DICE, { gameId });
  };

  const onMove = (pieceId: string) => {
    socket?.emit(SOCKET_EVENTS.LUDO_MOVE_PIECE, { gameId, pieceId });
  };

  const canMove = isMyTurn && state.diceRolled && state.movablePieces.length > 0;

  return (
    <div className="min-h-screen bg-night p-4">
      <div className="max-w-2xl mx-auto">
        {/* Players */}
        <div className="flex justify-around mb-6">
          {state.players.map(p => (
            <div key={p.uid} className="flex flex-col items-center gap-1">
              <PlayerAvatar
                uid={p.uid}
                displayName={p.displayName}
                avatarId={p.avatarId}
                score={p.finishedCount}
                isTurn={p.isTurn}
                isEliminated={!!p.rank}
                turnEndAt={p.isTurn ? state.turnEndAt : null}
              />
              <div className={`text-xs font-arabic ${COLORS[p.color]?.text || 'text-sand'}`}>
                {p.color === 'red' ? 'أحمر' : p.color === 'blue' ? 'أزرق' : p.color === 'green' ? 'أخضر' : 'أصفر'}
              </div>
            </div>
          ))}
        </div>

        {/* Board placeholder */}
        <div className="bg-night-mid border border-gold/20 rounded-2xl p-4 mb-6 aspect-square flex items-center justify-center relative">
          <div className="grid grid-cols-4 gap-4 w-full">
            {state.players.map(p => (
              <div key={p.uid} className={`rounded-xl border-2 ${COLORS[p.color]?.border || 'border-gold/20'} p-3 flex flex-wrap gap-2 justify-center`}>
                {p.pieces.map(piece => (
                  <button
                    key={piece.id}
                    onClick={() => canMove && state.movablePieces.includes(piece.id) ? onMove(piece.id) : null}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-white text-xs font-bold
                      ${COLORS[p.color]?.bg || 'bg-gold'}
                      ${canMove && state.movablePieces.includes(piece.id)
                        ? 'border-white scale-110 cursor-pointer animate-glow-pulse'
                        : 'border-white/30 opacity-70'}
                      ${piece.status === 'finished' ? 'opacity-40' : ''}
                      ${piece.status === 'home_base' ? 'opacity-60' : ''}
                    `}
                    title={`قطعة ${piece.relativePos >= 0 ? `موقع ${piece.relativePos}` : 'في القاعدة'}`}
                  >
                    {piece.status === 'finished' ? '✓' : piece.status === 'home_base' ? '⌂' : piece.relativePos}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Dice + Actions */}
        <div className="flex items-center justify-center gap-6">
          <LudoDice
            value={state.diceValue}
            rolling={rolling}
            onClick={isMyTurn && !state.diceRolled ? onRoll : undefined}
            disabled={!isMyTurn || state.diceRolled}
          />
          {isMyTurn && !state.diceRolled && (
            <p className="text-gold font-arabic font-semibold animate-pulse">ارمِ النرد!</p>
          )}
          {canMove && (
            <p className="text-oasis font-arabic font-semibold animate-pulse">اختر قطعة للتحريك</p>
          )}
        </div>
      </div>

      <ChatPanel roomId={state.roomId} open={chatOpen} onToggle={() => setChatOpen(s => !s)} />

      {gameOver && (
        <GameOverModal
          open={true}
          winnerId={gameOver.winnerId}
          finalScores={Object.fromEntries(state.players.map(p => [p.uid, p.rank ?? 99]))}
          players={state.players}
          onPlayAgain={() => navigate('/lobby/ludo')}
        />
      )}
    </div>
  );
}
