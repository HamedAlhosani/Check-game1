import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socketService } from '../../services/socket.service';
import { SOCKET_EVENTS, DominoGameState, DominoTile } from '@check-game/shared';
import { PlayerAvatar } from '../../components/game/shared/PlayerAvatar';
import { ChatPanel } from '../../components/game/shared/ChatPanel';
import { GameOverModal } from '../../components/game/shared/GameOverModal';
import { Button } from '../../components/shared/Button';
import { useAuthStore } from '../../store/authStore';

export function DominoGamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [state, setState] = useState<DominoGameState | null>(null);
  const [myHand, setMyHand] = useState<DominoTile[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [gameOver, setGameOver] = useState<any>(null);

  const socket = socketService.getSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on(SOCKET_EVENTS.DOMINO_STATE, (s: DominoGameState) => setState(s));
    socket.on(SOCKET_EVENTS.DOMINO_TILE_DRAWN_PRIVATE, (data: { tile?: DominoTile; tiles?: DominoTile[] }) => {
      if (data.tiles) setMyHand(data.tiles);
      else if (data.tile) setMyHand(h => [...h, data.tile!]);
    });
    socket.on(SOCKET_EVENTS.DOMINO_GAME_OVER, (data: any) => setGameOver(data));
    socket.on(SOCKET_EVENTS.SYSTEM_RECONNECT_STATE, (s: DominoGameState) => {
      if ('chain' in s) setState(s);
    });

    return () => {
      socket.off(SOCKET_EVENTS.DOMINO_STATE);
      socket.off(SOCKET_EVENTS.DOMINO_TILE_DRAWN_PRIVATE);
      socket.off(SOCKET_EVENTS.DOMINO_GAME_OVER);
      socket.off(SOCKET_EVENTS.SYSTEM_RECONNECT_STATE);
    };
  }, [socket]);

  if (!state || !gameId) {
    return (
      <div className="min-h-screen bg-night flex items-center justify-center">
        <p className="text-gold font-arabic animate-pulse">جاري تحميل اللعبة...</p>
      </div>
    );
  }

  const me = state.players.find(p => p.uid === user?.uid);
  const isMyTurn = me?.isTurn;

  const playTile = (tile: DominoTile, end: 'left' | 'right') => {
    socket?.emit(SOCKET_EVENTS.DOMINO_PLAY_TILE, { gameId, tileId: tile.id, end });
    setMyHand(h => h.filter(t => t.id !== tile.id));
  };

  const drawTile = () => socket?.emit(SOCKET_EVENTS.DOMINO_DRAW_TILE, { gameId });
  const pass = () => socket?.emit(SOCKET_EVENTS.DOMINO_PASS, { gameId });

  const canPlay = (tile: DominoTile) =>
    tile.left === state.chain.leftEnd || tile.right === state.chain.leftEnd ||
    tile.left === state.chain.rightEnd || tile.right === state.chain.rightEnd ||
    state.chain.tiles.length === 0;

  return (
    <div className="min-h-screen bg-night p-4">
      <div className="max-w-3xl mx-auto">
        {/* Players */}
        <div className="flex justify-around mb-6">
          {state.players.map(p => (
            <PlayerAvatar
              key={p.uid}
              uid={p.uid} displayName={p.displayName} avatarId={p.avatarId}
              score={p.cumulativeScore} isTurn={p.isTurn} isEliminated={p.isEliminated}
              turnEndAt={p.isTurn ? state.turnEndAt : null}
            />
          ))}
        </div>

        {/* Chain display */}
        <div className="bg-night-mid border border-gold/20 rounded-2xl p-4 mb-6 min-h-24 flex items-center justify-center overflow-x-auto">
          {state.chain.tiles.length === 0 ? (
            <p className="text-sand/30 font-arabic">الطاولة فارغة</p>
          ) : (
            <div className="flex gap-1">
              <span className="text-gold font-bold text-sm px-2">{state.chain.leftEnd}</span>
              {state.chain.tiles.slice(-8).map((t, i) => (
                <div key={i} className="bg-white rounded border border-gray-300 px-2 py-1 text-xs text-gray-800 font-bold whitespace-nowrap">
                  {t.flipped ? `${t.right}|${t.left}` : `${t.left}|${t.right}`}
                </div>
              ))}
              <span className="text-gold font-bold text-sm px-2">{state.chain.rightEnd}</span>
            </div>
          )}
        </div>

        {/* My hand */}
        <div className="bg-night-mid border border-gold/20 rounded-2xl p-4 mb-4">
          <p className="text-sand/50 text-sm font-arabic mb-3">أوراقي ({myHand.length})</p>
          <div className="flex flex-wrap gap-2">
            {myHand.map(tile => (
              <div key={tile.id} className={`relative group ${canPlay(tile) && isMyTurn ? 'cursor-pointer' : 'opacity-50'}`}>
                <div className={`bg-white rounded-lg border-2 px-3 py-2 text-gray-800 font-bold text-sm
                  ${canPlay(tile) && isMyTurn ? 'border-gold hover:scale-105 transition-transform' : 'border-gray-300'}`}>
                  {tile.left} | {tile.right}
                </div>
                {canPlay(tile) && isMyTurn && (
                  <div className="absolute bottom-full left-0 mb-1 hidden group-hover:flex gap-1 z-10">
                    <button onClick={() => playTile(tile, 'left')} className="bg-night-mid border border-gold/50 text-gold text-xs px-2 py-1 rounded whitespace-nowrap">← يسار</button>
                    <button onClick={() => playTile(tile, 'right')} className="bg-night-mid border border-gold/50 text-gold text-xs px-2 py-1 rounded whitespace-nowrap">يمين →</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        {isMyTurn && (
          <div className="flex gap-3 justify-center">
            <Button size="sm" variant="secondary" onClick={drawTile} disabled={state.boneyardCount === 0}>
              سحب ({state.boneyardCount})
            </Button>
            <Button size="sm" variant="ghost" onClick={pass}>تمرير</Button>
          </div>
        )}
      </div>

      <ChatPanel roomId={state.roomId} open={chatOpen} onToggle={() => setChatOpen(s => !s)} />

      {gameOver && (
        <GameOverModal
          open={true}
          winnerId={gameOver.winnerId}
          finalScores={state.scores}
          players={state.players}
          onPlayAgain={() => navigate('/lobby/domino')}
        />
      )}
    </div>
  );
}
