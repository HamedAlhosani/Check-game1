import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socketService } from '../../services/socket.service';
import { SOCKET_EVENTS, JacaroGameState, JacaroCard, JacaroMeld } from '@check-game/shared';
import { PlayerAvatar } from '../../components/game/shared/PlayerAvatar';
import { ChatPanel } from '../../components/game/shared/ChatPanel';
import { GameOverModal } from '../../components/game/shared/GameOverModal';
import { Button } from '../../components/shared/Button';
import { useAuthStore } from '../../store/authStore';
import { motion } from 'framer-motion';

const SUIT_SYMBOLS: Record<string, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const RED_SUITS = ['hearts', 'diamonds'];

function JCard({ card, onClick, selected, small }: { card: JacaroCard; onClick?: () => void; selected?: boolean; small?: boolean }) {
  const isRed = card.suit && RED_SUITS.includes(card.suit);
  return (
    <motion.div
      whileHover={onClick ? { scale: 1.08, y: -4 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
      onClick={onClick}
      className={`rounded-lg border-2 flex flex-col items-center justify-center select-none
        ${small ? 'w-9 h-12 text-xs' : 'w-11 h-16 text-sm'}
        ${card.isJoker
          ? 'bg-gradient-to-br from-purple-900 to-purple-700 border-purple-400 text-white'
          : `bg-[#FBF4E3] border-gray-200 ${isRed ? 'text-red-600' : 'text-gray-900'}`}
        ${selected ? 'ring-2 ring-gold border-gold scale-110 -translate-y-2' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        transition-all duration-200`}
    >
      {card.isJoker ? (
        <span className="text-base">🃏</span>
      ) : (
        <>
          <span className="font-bold leading-none">{card.rank}</span>
          <span>{SUIT_SYMBOLS[card.suit!]}</span>
        </>
      )}
    </motion.div>
  );
}

export function JacaroGamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [state, setState] = useState<JacaroGameState | null>(null);
  const [myHand, setMyHand] = useState<JacaroCard[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [chatOpen, setChatOpen] = useState(false);
  const [gameOver, setGameOver] = useState<any>(null);

  const socket = socketService.getSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on(SOCKET_EVENTS.JACKARO_STATE, (s: JacaroGameState) => setState(s));
    socket.on(SOCKET_EVENTS.JACKARO_CARD_DRAWN, (data: any) => {
      if (Array.isArray(data.cards)) setMyHand(data.cards);
      else if (data.card) setMyHand(h => [...h, data.card]);
    });
    socket.on(SOCKET_EVENTS.JACKARO_GAME_OVER, (data: any) => setGameOver(data));
    socket.on(SOCKET_EVENTS.SYSTEM_RECONNECT_STATE, (s: any) => {
      if ('tableMelds' in s) setState(s);
    });

    return () => {
      socket.off(SOCKET_EVENTS.JACKARO_STATE);
      socket.off(SOCKET_EVENTS.JACKARO_CARD_DRAWN);
      socket.off(SOCKET_EVENTS.JACKARO_GAME_OVER);
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

  const draw = (fromDiscard = false) => {
    socket?.emit(SOCKET_EVENTS.JACKARO_DRAW, { gameId, fromDiscard });
  };

  const discard = (cardId: string) => {
    socket?.emit(SOCKET_EVENTS.JACKARO_DISCARD, { gameId, cardId });
    setMyHand(h => h.filter(c => c.id !== cardId));
    setSelected(new Set());
  };

  const meld = () => {
    if (selected.size < 3) return;
    socket?.emit(SOCKET_EVENTS.JACKARO_MELD, { gameId, cardIds: Array.from(selected) });
    setMyHand(h => h.filter(c => !selected.has(c.id)));
    setSelected(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const meldPoints = myHand.filter(c => selected.has(c.id)).reduce((s, c) => {
    if (c.isJoker) return s;
    const r = c.rank;
    const val = r === 'A' ? 1 : ['J'].includes(r!) ? 11 : r === 'Q' ? 12 : r === 'K' ? 13 : parseInt(r || '0') || 10;
    return s + val;
  }, 0);

  return (
    <div className="min-h-screen bg-night p-4">
      <div className="max-w-4xl mx-auto">
        {/* Players */}
        <div className="flex justify-around mb-4">
          {state.players.map(p => (
            <div key={p.uid} className="flex flex-col items-center">
              <PlayerAvatar
                uid={p.uid} displayName={p.displayName} avatarId={p.avatarId}
                score={p.cumulativeScore} isTurn={p.isTurn} isEliminated={p.isEliminated}
                turnEndAt={p.isTurn ? state.turnEndAt : null}
              />
              <span className={`text-xs font-arabic mt-1 ${p.hasOpenedMeld ? 'text-palm' : 'text-sand/40'}`}>
                {p.hasOpenedMeld ? 'مفتوح ✓' : `${p.cardCount} ورقة`}
              </span>
            </div>
          ))}
        </div>

        {/* Table melds */}
        {state.tableMelds.length > 0 && (
          <div className="bg-night-mid border border-gold/10 rounded-xl p-3 mb-4">
            <p className="text-sand/40 text-xs font-arabic mb-2">الطاولة</p>
            <div className="flex flex-wrap gap-4">
              {state.tableMelds.map(meld => (
                <div key={meld.id} className="flex gap-1">
                  {meld.cards.map(c => <JCard key={c.id} card={c} small />)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Center: deck & discard */}
        <div className="flex items-center justify-center gap-8 mb-4">
          <div className="flex flex-col items-center gap-1">
            <div
              onClick={isMyTurn && !me?.hasDrawn ? () => draw(false) : undefined}
              className={`w-12 h-16 rounded-lg border-2 border-gold/30 bg-night-accent flex items-center justify-center
                ${isMyTurn && !me?.hasDrawn ? 'cursor-pointer hover:border-gold' : 'opacity-50'}`}
            >
              <span className="text-gold/50 text-xs">{state.deckCount}</span>
            </div>
            <span className="text-sand/40 text-xs font-arabic">الكومة</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            {state.discardTop ? (
              <div
                onClick={isMyTurn && !me?.hasDrawn ? () => draw(true) : undefined}
                className={`${isMyTurn && !me?.hasDrawn ? 'cursor-pointer' : ''}`}
              >
                <JCard card={state.discardTop} />
              </div>
            ) : (
              <div className="w-11 h-16 border-2 border-dashed border-gold/20 rounded-lg"/>
            )}
            <span className="text-sand/40 text-xs font-arabic">المرمي</span>
          </div>
        </div>

        {/* My hand */}
        <div className="bg-night-mid border border-gold/20 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sand/50 text-sm font-arabic">أوراقي ({myHand.length})</p>
            {selected.size > 0 && (
              <span className="text-gold text-xs font-arabic">{meldPoints} نقطة محددة</span>
            )}
          </div>
          <div className="flex flex-wrap gap-1 justify-center">
            {myHand.map(card => (
              <JCard
                key={card.id}
                card={card}
                selected={selected.has(card.id)}
                onClick={isMyTurn && me?.hasDrawn ? () => toggleSelect(card.id) : undefined}
              />
            ))}
          </div>

          {/* Action buttons */}
          {isMyTurn && me?.hasDrawn && (
            <div className="flex gap-2 mt-4 justify-center flex-wrap">
              {selected.size >= 3 && (
                <Button size="sm" onClick={meld} className="bg-palm border-palm text-white">
                  نزّل مجموعة {selected.size > 0 ? `(${meldPoints}ن)` : ''}
                </Button>
              )}
              {selected.size === 1 && (
                <Button size="sm" variant="danger" onClick={() => discard(Array.from(selected)[0])}>
                  ارمِ الورقة
                </Button>
              )}
              {selected.size === 0 && (
                <p className="text-sand/40 text-xs font-arabic">اختر ورقة للرمي أو 3+ للمجموعة</p>
              )}
            </div>
          )}

          {/* Not yet drawn */}
          {isMyTurn && !me?.hasDrawn && (
            <p className="text-center text-gold font-arabic text-sm mt-3 animate-pulse">اسحب ورقة من الكومة أو المرمي</p>
          )}
        </div>

        {/* Opening threshold */}
        {!me?.hasOpenedMeld && (
          <div className="mt-3 text-center">
            <p className="text-sand/40 text-xs font-arabic">تحتاج 51 نقطة لأول مجموعة — لديك {meldPoints} محددة</p>
            <div className="w-full bg-night-accent rounded-full h-1.5 mt-1">
              <div className="bg-gold h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (meldPoints / 51) * 100)}%` }}/>
            </div>
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
          onPlayAgain={() => navigate('/lobby/jackaro')}
        />
      )}
    </div>
  );
}
