import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LudoGameState, LudoPiece, LudoColor, LUDO_START_OFFSETS, SOCKET_EVENTS } from '@check-game/shared';
import { socketService } from '../../../services/socket.service';
import { useAuthStore } from '../../../store/authStore';
import { soundService } from '../../../services/sound.service';
import { LudoDice } from './LudoDice';
import { ChatPanel } from '../shared/ChatPanel';
import { GameOverModal } from '../shared/GameOverModal';
import { CharacterArt } from '../../shared/CharacterArt';
import { BoardDefs, LudoPageBackground, LUDO_EMIRATI_PALETTE, COLOR_LABELS_AR } from './BoardEmblems';

// ─── Board geometry — 15×15 grid ─────────────────────────────────────────────
// Path is the cross around the perimeter (52 tiles); home bases sit in the
// four 6×6 corners; home columns are the colored axes leading to center (7,7).
//
// Engine encodes piece position as relativePos:
//   -1            → home base (off-board)
//   0..51         → main path (each color enters at LUDO_START_OFFSETS[color])
//   52..57        → that color's home column (6 cells leading to center)
//   58            → finished (center)

const PATH_COORDS: [number, number][] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],         // 0-4
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6],         // 5-9
  [0, 6], [0, 7], [0, 8],                         // 10-12
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],         // 13-17
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], // 18-23
  [7, 14],                                        // 24
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], // 25-30
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], // 31-36
  [14, 7],                                        // 37
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], // 38-43
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], // 44-49
  [7, 0], [6, 0],                                 // 50-51
];

const HOME_COLUMN_COORDS: Record<LudoColor, [number, number][]> = {
  red:    [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  blue:   [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  green:  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  yellow: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
};

const HOME_BASE_REGION: Record<LudoColor, { row: [number, number]; col: [number, number] }> = {
  red:    { row: [0, 5],  col: [0, 5] },
  blue:   { row: [0, 5],  col: [9, 14] },
  green:  { row: [9, 14], col: [9, 14] },
  yellow: { row: [9, 14], col: [0, 5] },
};

const HOME_BASE_SLOTS: Record<LudoColor, [number, number][]> = {
  red:    [[1.4, 1.4], [1.4, 3.6], [3.6, 1.4], [3.6, 3.6]],
  blue:   [[1.4, 10.4], [1.4, 12.6], [3.6, 10.4], [3.6, 12.6]],
  green:  [[10.4, 10.4], [10.4, 12.6], [12.6, 10.4], [12.6, 12.6]],
  yellow: [[10.4, 1.4], [10.4, 3.6], [12.6, 1.4], [12.6, 3.6]],
};

const COLOR_EMBLEM: Record<LudoColor, string> = {
  red: 'emb-falcon',
  blue: 'emb-pearl',
  green: 'emb-palm',
  yellow: 'emb-dunes',
};

const SAFE_TILES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const STAR_TILES = new Set([8, 21, 34, 47]); // safes that aren't a player's start
const START_TILES: Record<number, LudoColor> = { 0: 'red', 13: 'blue', 26: 'green', 39: 'yellow' };

const CENTER = { row: 7, col: 7 };

function pieceCoord(piece: LudoPiece, indexInColor: number): { row: number; col: number } {
  if (piece.status === 'home_base') {
    const [row, col] = HOME_BASE_SLOTS[piece.color][indexInColor % 4];
    return { row, col };
  }
  if (piece.status === 'finished' || piece.relativePos >= 58) {
    const offsets: [number, number][] = [[-0.18, -0.18], [-0.18, 0.18], [0.18, -0.18], [0.18, 0.18]];
    const [dr, dc] = offsets[indexInColor % 4];
    return { row: CENTER.row + dr, col: CENTER.col + dc };
  }
  if (piece.relativePos < 52) {
    const globalIdx = (LUDO_START_OFFSETS[piece.color] + piece.relativePos) % 52;
    const [row, col] = PATH_COORDS[globalIdx];
    return { row, col };
  }
  const coords = HOME_COLUMN_COORDS[piece.color];
  const idx = Math.max(0, Math.min(5, piece.relativePos - 52));
  const [row, col] = coords[idx];
  return { row, col };
}

// ─── Static board background ─────────────────────────────────────────────────
function BoardBackground() {
  return (
    <svg viewBox="0 0 15 15" className="absolute inset-0 w-full h-full" style={{ shapeRendering: 'auto' }}>
      <BoardDefs />

      {/* Outer parchment — base under everything */}
      <rect x="0" y="0" width="15" height="15" fill="#1A1408" />

      {/* Subtle radial highlight in the centre to draw the eye in */}
      <radialGradient id="board-radial" cx="50%" cy="50%" r="60%">
        <stop offset="0%"  stopColor="#3A2410" />
        <stop offset="100%" stopColor="#1A1408" />
      </radialGradient>
      <rect x="0" y="0" width="15" height="15" fill="url(#board-radial)" />

      {/* ── 4 home bases (6×6 corners) ── */}
      {(['red', 'blue', 'green', 'yellow'] as LudoColor[]).map(color => {
        const r = HOME_BASE_REGION[color];
        const c = LUDO_EMIRATI_PALETTE[color];
        return (
          <g key={color}>
            {/* Outer colored frame */}
            <rect x={r.col[0]} y={r.row[0]} width={6} height={6} fill={c.main} />
            {/* Inner parchment plaque */}
            <rect x={r.col[0] + 0.5} y={r.row[0] + 0.5} width={5} height={5}
              fill="#F4E4BE" stroke={c.dark} strokeWidth={0.06} />
            {/* Themed watermark — falcon / pearl / palm / dunes */}
            <use
              href={`#${COLOR_EMBLEM[color]}`}
              x={r.col[0] + 0.5} y={r.row[0] + 0.5}
              width={5} height={5}
              color={c.dark}
              opacity={0.18}
            />
            {/* 4 piece pockets */}
            {HOME_BASE_SLOTS[color].map((slot, i) => (
              <g key={i}>
                <circle cx={slot[1] + 0.5} cy={slot[0] + 0.5} r={0.62}
                  fill={c.light} stroke={c.dark} strokeWidth={0.05} />
                <circle cx={slot[1] + 0.5} cy={slot[0] + 0.5} r={0.5}
                  fill="none" stroke={c.dark} strokeWidth={0.025} opacity={0.5} />
              </g>
            ))}
          </g>
        );
      })}

      {/* ── Path tiles ── */}
      {PATH_COORDS.map(([row, col], i) => {
        const startColor = START_TILES[i];
        const fill = startColor ? LUDO_EMIRATI_PALETTE[startColor].main : 'url(#sand-grain)';
        return (
          <g key={i}>
            <rect x={col} y={row} width={1} height={1} fill={fill}
              stroke="#7A6303" strokeWidth={0.025} />
            {/* Inner subtle inset */}
            {!startColor && (
              <rect x={col + 0.08} y={row + 0.08} width={0.84} height={0.84}
                fill="none" stroke="#C9A84C" strokeWidth={0.02} opacity={0.35} />
            )}
            {/* Star (khatim) tiles */}
            {STAR_TILES.has(i) && (
              <use href="#emb-khatim" x={col + 0.15} y={row + 0.15} width={0.7} height={0.7} />
            )}
            {/* Mini emblem on start tiles */}
            {startColor && (
              <use href={`#${COLOR_EMBLEM[startColor]}`}
                x={col + 0.1} y={row + 0.1} width={0.8} height={0.8}
                color="#F4E4BE" opacity={0.85} />
            )}
          </g>
        );
      })}

      {/* ── Home columns — gradient strips toward center ── */}
      {(['red', 'blue', 'green', 'yellow'] as LudoColor[]).map(color => {
        const c = LUDO_EMIRATI_PALETTE[color];
        return HOME_COLUMN_COORDS[color].map(([row, col], i) => {
          // Fade colour along the column so it visibly "leads home"
          const t = i / 5;
          const alpha = 0.55 + t * 0.45;
          return (
            <g key={`${color}-${i}`}>
              <rect x={col} y={row} width={1} height={1}
                fill={c.main} opacity={alpha}
                stroke={c.dark} strokeWidth={0.03} />
              <rect x={col + 0.1} y={row + 0.1} width={0.8} height={0.8}
                fill="none" stroke={c.light} strokeWidth={0.02} opacity={0.4} />
            </g>
          );
        });
      })}

      {/* ── Center finish — 4 colored triangles + gold star + ✦ ── */}
      <g>
        <polygon points="6,6 9,6 7.5,7.5"  fill={LUDO_EMIRATI_PALETTE.blue.main}   stroke="#7A6303" strokeWidth={0.04} />
        <polygon points="9,6 9,9 7.5,7.5"  fill={LUDO_EMIRATI_PALETTE.green.main}  stroke="#7A6303" strokeWidth={0.04} />
        <polygon points="9,9 6,9 7.5,7.5"  fill={LUDO_EMIRATI_PALETTE.yellow.main} stroke="#7A6303" strokeWidth={0.04} />
        <polygon points="6,9 6,6 7.5,7.5"  fill={LUDO_EMIRATI_PALETTE.red.main}    stroke="#7A6303" strokeWidth={0.04} />
        {/* Gold rim around the centre */}
        <circle cx="7.5" cy="7.5" r="1.45" fill="none" stroke="#C9A84C" strokeWidth={0.08} opacity={0.7} />
        <circle cx="7.5" cy="7.5" r="1.55" fill="none" stroke="#7A6303" strokeWidth={0.04}
          strokeDasharray="0.12 0.12" />
        {/* 8-point khatim star at centre */}
        <use href="#emb-khatim" x="6.6" y="6.6" width="1.8" height="1.8" />
      </g>

      {/* ── Outer frame: double gold border + corner medallions ── */}
      <g>
        <rect x="0" y="0" width="15" height="15" fill="none" stroke="#C9A84C" strokeWidth={0.18} />
        <rect x="0.16" y="0.16" width="14.68" height="14.68" fill="none" stroke="#7A6303" strokeWidth={0.04} />
      </g>
      {/* 4 corner medallions */}
      {[
        [0.5, 0.5], [14.5, 0.5], [0.5, 14.5], [14.5, 14.5],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r={0.32} fill="#1A1408" stroke="#C9A84C" strokeWidth={0.06} />
          <use href="#emb-khatim" x={cx - 0.22} y={cy - 0.22} width={0.44} height={0.44} />
        </g>
      ))}
    </svg>
  );
}

interface Props {
  gameId: string;
  state: LudoGameState;
}

export function LudoBoard({ gameId, state }: Props) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [gameOver, setGameOver] = useState<{ winnerId: string | null } | null>(null);

  const socket = socketService.getSocket();
  const me = state.players.find(p => p.uid === user?.uid);
  const isMyTurn = !!me?.isTurn;
  const movableSet = useMemo(() => new Set(state.movablePieces), [state.movablePieces]);

  useEffect(() => {
    if (!socket) return;
    const onRolled = () => {
      setRolling(true);
      soundService.playClick?.();
      setTimeout(() => setRolling(false), 700);
    };
    const onOver = (data: any) => setGameOver(data);
    const onMoved = () => soundService.playClick?.();
    socket.on(SOCKET_EVENTS.LUDO_DICE_ROLLED, onRolled);
    socket.on(SOCKET_EVENTS.LUDO_PIECE_MOVED, onMoved);
    socket.on(SOCKET_EVENTS.LUDO_GAME_OVER, onOver);
    return () => {
      socket.off(SOCKET_EVENTS.LUDO_DICE_ROLLED, onRolled);
      socket.off(SOCKET_EVENTS.LUDO_PIECE_MOVED, onMoved);
      socket.off(SOCKET_EVENTS.LUDO_GAME_OVER, onOver);
    };
  }, [socket]);

  const onRoll = () => {
    if (!isMyTurn || state.diceRolled) return;
    socket?.emit(SOCKET_EVENTS.LUDO_ROLL_DICE, { gameId });
  };

  const onMove = (pieceId: string) => {
    if (!isMyTurn || !state.diceRolled || !movableSet.has(pieceId)) return;
    socket?.emit(SOCKET_EVENTS.LUDO_MOVE_PIECE, { gameId, pieceId });
  };

  const canRoll = isMyTurn && !state.diceRolled && state.phase === 'PLAYING';

  const allPieces = useMemo(() => {
    const out: { piece: LudoPiece; player: typeof state.players[0]; indexInColor: number }[] = [];
    for (const player of state.players) {
      player.pieces.forEach((p, i) => out.push({ piece: p, player, indexInColor: i }));
    }
    return out;
  }, [state.players]);

  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: '#0E0905' }}>
      {/* Page-level desert background — sits behind everything */}
      <LudoPageBackground />

      {/* ── Players strip ── */}
      <div className="relative flex justify-around items-center px-2 py-2 sm:py-3 gap-1 sm:gap-2 z-10"
        style={{
          background: 'linear-gradient(180deg, rgba(20,14,8,0.96) 0%, rgba(14,9,5,0.85) 100%)',
          borderBottom: '1px solid rgba(201,168,76,0.32)',
          boxShadow: '0 4px 18px rgba(0,0,0,0.45)',
        }}>
        {state.players.map(p => {
          const c = LUDO_EMIRATI_PALETTE[p.color];
          return (
            <div key={p.uid}
              className="flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition-all"
              style={{
                background: p.isTurn
                  ? `linear-gradient(135deg, ${c.main}38 0%, ${c.dark}88 100%)`
                  : 'rgba(255,255,255,0.025)',
                border: `1.5px solid ${p.isTurn ? c.accent : 'rgba(255,255,255,0.08)'}`,
                boxShadow: p.isTurn ? `0 0 16px ${c.main}99, inset 0 1px 0 rgba(255,255,255,0.1)` : 'none',
                minWidth: 64,
              }}>
              <div className="relative" style={{ width: 34, height: 34 }}>
                <CharacterArt id={p.avatarId} size={34} />
                <div className="absolute -bottom-1 -right-1 rounded-full flex items-center justify-center"
                  style={{
                    width: 14, height: 14,
                    background: c.main,
                    border: '2px solid #14100A',
                    boxShadow: `0 0 6px ${c.main}AA`,
                  }} />
              </div>
              <p className="font-arabic font-bold truncate" style={{ fontSize: 10, color: '#F5E6C8', maxWidth: 72 }}>
                {p.uid === user?.uid ? 'أنت' : p.displayName}
              </p>
              <div className="flex items-center gap-1 text-[10px] font-arabic" style={{ color: c.accent }}>
                <span>{COLOR_LABELS_AR[p.color]}</span>
                <span className="font-mono opacity-80">· {p.finishedCount}/4</span>
              </div>
              {p.isTurn && (
                <div className="absolute -bottom-0.5 left-2 right-2 h-0.5 rounded-full"
                  style={{ background: `linear-gradient(90deg, transparent, ${c.accent}, transparent)` }} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Board ── */}
      <div className="flex-1 flex items-center justify-center p-2 sm:p-4 min-h-0 relative z-10">
        <div className="relative"
          style={{
            width: '100%',
            aspectRatio: '1 / 1',
            maxWidth: 'min(94vw, 480px)',
            // Drop a warm halo behind the board so it floats above the dunes
            filter: 'drop-shadow(0 16px 40px rgba(0,0,0,0.85)) drop-shadow(0 0 36px rgba(201,168,76,0.20))',
          }}>
          <BoardBackground />

          {/* Pieces overlay */}
          {allPieces.map(({ piece, player, indexInColor }) => {
            const { row, col } = pieceCoord(piece, indexInColor);
            const c = LUDO_EMIRATI_PALETTE[piece.color];
            const isMine = player.uid === user?.uid;
            const movable = isMine && movableSet.has(piece.id);
            const inHome = piece.status === 'home_base';
            return (
              <motion.button
                key={piece.id}
                initial={false}
                animate={{
                  top: `${(row / 15) * 100}%`,
                  left: `${(col / 15) * 100}%`,
                }}
                transition={{ type: 'spring', stiffness: 240, damping: 22 }}
                onClick={() => onMove(piece.id)}
                disabled={!movable}
                className="absolute"
                style={{
                  width: `${100 / 15}%`,
                  height: `${100 / 15}%`,
                  padding: inHome ? '12%' : '10%',
                  cursor: movable ? 'pointer' : 'default',
                  zIndex: piece.status === 'finished' ? 5 : 12,
                }}
                whileHover={movable ? { scale: 1.18 } : undefined}
                whileTap={movable ? { scale: 0.92 } : undefined}>
                <div
                  className="w-full h-full relative rounded-full flex items-center justify-center"
                  style={{
                    background: `radial-gradient(circle at 32% 24%, ${c.light} 0%, ${c.main} 55%, ${c.dark} 100%)`,
                    border: `2px solid ${movable ? '#F6E6BE' : '#C9A84C'}`,
                    boxShadow: movable
                      ? `0 0 0 2px #C9A84C, 0 0 18px ${c.main}, 0 3px 6px rgba(0,0,0,0.6)`
                      : '0 3px 6px rgba(0,0,0,0.65), inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -1.5px 0 rgba(0,0,0,0.35)',
                    color: '#fff',
                    animation: movable ? 'pulse 1.4s ease-in-out infinite' : undefined,
                  }}>
                  {/* Themed glyph inside the piece */}
                  <svg viewBox="0 0 6 6" className="absolute inset-0 w-full h-full" style={{ padding: '18%' }}>
                    <BoardDefs />
                    <use href={`#${COLOR_EMBLEM[piece.color]}`}
                      width="6" height="6"
                      color="#F6E6BE"
                      opacity={piece.status === 'finished' ? 1 : 0.55} />
                  </svg>
                  {piece.status === 'finished' && (
                    <span className="relative" style={{ fontSize: '0.55em', fontWeight: 900, color: '#F6E6BE', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>★</span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Bottom: dice + status ── */}
      <div className="relative flex flex-col items-center gap-2 px-4 py-3 sm:py-4 z-10"
        style={{
          background: 'linear-gradient(0deg, rgba(20,14,8,0.96) 0%, rgba(14,9,5,0.6) 100%)',
          borderTop: '1px solid rgba(201,168,76,0.32)',
          boxShadow: '0 -4px 18px rgba(0,0,0,0.45)',
        }}>
        <div className="flex items-center gap-4">
          <div className="relative">
            {canRoll && (
              <div className="absolute inset-0 rounded-xl pointer-events-none"
                style={{ boxShadow: '0 0 24px rgba(232,201,122,0.7)', animation: 'pulse 1.6s ease-in-out infinite' }} />
            )}
            <LudoDice value={state.diceValue} rolling={rolling}
              onClick={canRoll ? onRoll : undefined} disabled={!canRoll} />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="font-arabic font-bold" style={{ fontSize: 14, color: '#F5E6C8' }}>
              {state.phase === 'GAME_OVER'
                ? 'انتهت اللعبة'
                : isMyTurn
                  ? (state.diceRolled
                      ? (state.movablePieces.length > 0 ? 'اختر قطعة للتحريك' : 'لا حركات متاحة…')
                      : 'دورك — ارمِ النرد')
                  : `دور ${state.players.find(p => p.uid === state.currentTurnUid)?.displayName || ''}`}
            </p>
            {state.consecutiveSixes > 0 && (
              <p className="font-arabic text-xs" style={{ color: '#E8C97A' }}>
                ✦ ست متتالية: {state.consecutiveSixes}
              </p>
            )}
          </div>
        </div>
      </div>

      <ChatPanel roomId={state.roomId} open={chatOpen} onToggle={() => setChatOpen(s => !s)} />

      <AnimatePresence>
        {gameOver && (
          <GameOverModal
            open={true}
            winnerId={gameOver.winnerId}
            finalScores={Object.fromEntries(state.players.map(p => [p.uid, p.rank ?? 99]))}
            players={state.players}
            onPlayAgain={() => navigate('/home')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
