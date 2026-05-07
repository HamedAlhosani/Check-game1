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

// ─── Board geometry ───────────────────────────────────────────────────────────
// 15×15 grid. Path is the cross around the perimeter; home bases sit in the
// four 6×6 corners; home columns are the colored axes leading to center (7,7).
//
// Engine encodes piece position as relativePos:
//   -1            → home base (off-board)
//   0..51         → main path (each color enters at LUDO_START_OFFSETS[color])
//   52..57        → that color's home column (6 cells leading to center)
//   58            → finished (center)

const PATH_COORDS: [number, number][] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],         // 0-4   right across left arm's upper row
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6],         // 5-9   up the left side of the top arm
  [0, 6], [0, 7], [0, 8],                         // 10-12 across the top edge
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],         // 13-17 down the right side of the top arm
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], // 18-23 right across the right arm
  [7, 14],                                        // 24    right edge transition
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], // 25-30 left across the right arm's lower row
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], // 31-36 down the right side of the bottom arm
  [14, 7],                                        // 37    bottom edge transition
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], // 38-43 up the left side of the bottom arm
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], // 44-49 left across the left arm's lower row
  [7, 0], [6, 0],                                 // 50-51 left edge close
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

// 2×2 piece slots inside each home base, expressed as cell coordinates.
const HOME_BASE_SLOTS: Record<LudoColor, [number, number][]> = {
  red:    [[1.4, 1.4], [1.4, 3.6], [3.6, 1.4], [3.6, 3.6]],
  blue:   [[1.4, 10.4], [1.4, 12.6], [3.6, 10.4], [3.6, 12.6]],
  green:  [[10.4, 10.4], [10.4, 12.6], [12.6, 10.4], [12.6, 12.6]],
  yellow: [[10.4, 1.4], [10.4, 3.6], [12.6, 1.4], [12.6, 3.6]],
};

const COLOR_HEX: Record<LudoColor, { main: string; light: string; dark: string; piece: string }> = {
  red:    { main: '#E74C3C', light: '#FFB6AE', dark: '#7A1D14', piece: '#E74C3C' },
  blue:   { main: '#4A90D9', light: '#B5D2EE', dark: '#1B4870', piece: '#4A90D9' },
  green:  { main: '#7AC74F', light: '#C8E5AE', dark: '#3F7124', piece: '#7AC74F' },
  yellow: { main: '#F1C40F', light: '#FFE89A', dark: '#7A6303', piece: '#F1C40F' },
};

const COLOR_LABELS: Record<LudoColor, string> = {
  red: 'أحمر', blue: 'أزرق', green: 'أخضر', yellow: 'أصفر',
};

const SAFE_TILES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const STAR_TILES = new Set([8, 21, 34, 47]); // safes that aren't a player's start

const CENTER = { row: 7, col: 7 };

// Returns grid (row, col) for a piece given its current state.
function pieceCoord(piece: LudoPiece, indexInColor: number): { row: number; col: number } {
  if (piece.status === 'home_base') {
    const [row, col] = HOME_BASE_SLOTS[piece.color][indexInColor % 4];
    return { row, col };
  }
  if (piece.status === 'finished' || piece.relativePos >= 58) {
    // Stagger finished pieces around center so they don't all sit on top.
    const offsets: [number, number][] = [[-0.2, -0.2], [-0.2, 0.2], [0.2, -0.2], [0.2, 0.2]];
    const [dr, dc] = offsets[indexInColor % 4];
    return { row: CENTER.row + dr, col: CENTER.col + dc };
  }
  if (piece.relativePos < 52) {
    const globalIdx = (LUDO_START_OFFSETS[piece.color] + piece.relativePos) % 52;
    const [row, col] = PATH_COORDS[globalIdx];
    return { row, col };
  }
  // Home column 52-57
  const coords = HOME_COLUMN_COORDS[piece.color];
  const idx = Math.max(0, Math.min(5, piece.relativePos - 52));
  const [row, col] = coords[idx];
  return { row, col };
}

// ─── Static board background — drawn once per render via memoized children ───
function BoardBackground() {
  return (
    <svg viewBox="0 0 15 15" className="absolute inset-0 w-full h-full" style={{ shapeRendering: 'crispEdges' }}>
      {/* Outer board */}
      <rect x="0" y="0" width="15" height="15" fill="#1A1408" />

      {/* 4 colored home bases (6×6 corners) */}
      {(['red', 'blue', 'green', 'yellow'] as LudoColor[]).map(color => {
        const r = HOME_BASE_REGION[color];
        const c = COLOR_HEX[color];
        return (
          <g key={color}>
            <rect x={r.col[0]} y={r.row[0]} width={6} height={6} fill={c.main} />
            <rect x={r.col[0] + 0.6} y={r.row[0] + 0.6} width={4.8} height={4.8} fill="#FFFFFF" opacity={0.96} />
            {/* Inner light tint for the 4 piece pockets */}
            {HOME_BASE_SLOTS[color].map((slot, i) => (
              <circle key={i} cx={slot[1] + 0.5} cy={slot[0] + 0.5} r={0.55} fill={c.light} stroke={c.dark} strokeWidth={0.04} />
            ))}
          </g>
        );
      })}

      {/* Path tiles — main 52-tile loop, plus row 7 / col 7 corner cells */}
      {PATH_COORDS.map(([row, col], i) => {
        const isSafe = SAFE_TILES.has(i);
        // Tile 0 is red, 13 blue, 26 green, 39 yellow — color the start tiles
        let fill = '#FFFFFF';
        if (i === 0)  fill = COLOR_HEX.red.main;
        if (i === 13) fill = COLOR_HEX.blue.main;
        if (i === 26) fill = COLOR_HEX.green.main;
        if (i === 39) fill = COLOR_HEX.yellow.main;
        return (
          <g key={i}>
            <rect x={col} y={row} width={1} height={1} fill={fill} stroke="#1A1408" strokeWidth={0.04} />
            {isSafe && !STAR_TILES.has(i) && (
              // colored start tile already conveys 'safe'; skip the star
              null
            )}
            {STAR_TILES.has(i) && (
              <text x={col + 0.5} y={row + 0.78} textAnchor="middle" fontSize="0.78" fill="#7A6440">★</text>
            )}
          </g>
        );
      })}

      {/* Home columns — colored strips toward center */}
      {(['red', 'blue', 'green', 'yellow'] as LudoColor[]).map(color =>
        HOME_COLUMN_COORDS[color].map(([row, col], i) =>
          <rect key={`${color}-${i}`} x={col} y={row} width={1} height={1}
            fill={COLOR_HEX[color].main} stroke="#1A1408" strokeWidth={0.04} />
        )
      )}

      {/* Center finish — 4 colored triangles meeting at the middle */}
      <g>
        <polygon points="6,6 9,6 7.5,7.5"  fill={COLOR_HEX.blue.main} stroke="#1A1408" strokeWidth={0.05} />
        <polygon points="9,6 9,9 7.5,7.5"  fill={COLOR_HEX.green.main} stroke="#1A1408" strokeWidth={0.05} />
        <polygon points="9,9 6,9 7.5,7.5"  fill={COLOR_HEX.yellow.main} stroke="#1A1408" strokeWidth={0.05} />
        <polygon points="6,9 6,6 7.5,7.5"  fill={COLOR_HEX.red.main} stroke="#1A1408" strokeWidth={0.05} />
      </g>

      {/* Outer board border */}
      <rect x="0" y="0" width="15" height="15" fill="none" stroke="#C9A84C" strokeWidth={0.12} />
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
  const [gameOver, setGameOver] = useState<{ winnerId: string | null; rankings: { uid: string; rank: number | null }[] } | null>(null);

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

  // All pieces flattened with their per-color index (so we can compute home-base slot)
  const allPieces = useMemo(() => {
    const out: { piece: LudoPiece; player: typeof state.players[0]; indexInColor: number }[] = [];
    for (const player of state.players) {
      player.pieces.forEach((p, i) => out.push({ piece: p, player, indexInColor: i }));
    }
    return out;
  }, [state.players]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg,#1A1408 0%,#0E0905 100%)' }}>
      {/* ── Players strip ── */}
      <div className="flex justify-around items-center px-2 py-2 sm:py-3 gap-1 sm:gap-2"
        style={{ background: 'rgba(20,14,8,0.85)', borderBottom: '1px solid rgba(201,168,76,0.18)' }}>
        {state.players.map(p => {
          const c = COLOR_HEX[p.color];
          return (
            <div key={p.uid}
              className="flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition-all"
              style={{
                background: p.isTurn ? `${c.main}26` : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${p.isTurn ? c.main : 'rgba(255,255,255,0.08)'}`,
                boxShadow: p.isTurn ? `0 0 14px ${c.main}77` : 'none',
                minWidth: 60,
              }}>
              <div className="relative" style={{ width: 32, height: 32 }}>
                <CharacterArt id={p.avatarId} size={32} />
                <div className="absolute -bottom-1 -right-1 rounded-full" style={{
                  width: 12, height: 12, background: c.main, border: '2px solid #14100A',
                }} />
              </div>
              <p className="font-arabic font-bold truncate" style={{ fontSize: 10, color: '#F5E6C8', maxWidth: 70 }}>
                {p.uid === user?.uid ? 'أنت' : p.displayName}
              </p>
              <div className="flex items-center gap-1 text-[10px] font-arabic" style={{ color: c.main }}>
                <span>{COLOR_LABELS[p.color]}</span>
                <span className="font-mono">· {p.finishedCount}/4</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Board ── */}
      <div className="flex-1 flex items-center justify-center p-2 sm:p-4 min-h-0">
        <div className="relative w-full"
          style={{ aspectRatio: '1 / 1', maxWidth: 'min(94vw, 480px)' }}>
          <BoardBackground />

          {/* Pieces overlay */}
          {allPieces.map(({ piece, player, indexInColor }) => {
            const { row, col } = pieceCoord(piece, indexInColor);
            const c = COLOR_HEX[piece.color];
            const isMine = player.uid === user?.uid;
            const movable = isMine && movableSet.has(piece.id);
            return (
              <motion.button
                key={piece.id}
                initial={false}
                animate={{
                  // Position via top/left percentages so pieces land on the
                  // correct grid cell at any board size.
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
                  padding: '8%',
                  cursor: movable ? 'pointer' : 'default',
                  zIndex: piece.status === 'finished' ? 5 : 10,
                }}
                whileHover={movable ? { scale: 1.15 } : undefined}
                whileTap={movable ? { scale: 0.92 } : undefined}>
                <div
                  className="w-full h-full rounded-full flex items-center justify-center"
                  style={{
                    background: `radial-gradient(circle at 30% 25%, ${c.main} 0%, ${c.dark} 100%)`,
                    border: `2px solid ${movable ? '#FFFFFF' : 'rgba(255,255,255,0.55)'}`,
                    boxShadow: movable
                      ? `0 0 14px ${c.main}, 0 2px 4px rgba(0,0,0,0.6)`
                      : '0 2px 4px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.25)',
                    color: '#fff',
                    fontSize: '0.6em',
                    fontWeight: 800,
                    animation: movable ? 'pulse 1.2s ease-in-out infinite' : undefined,
                  }}>
                  {piece.status === 'finished' && '✓'}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Bottom: dice + status ── */}
      <div className="flex flex-col items-center gap-2 px-4 py-3 sm:py-4"
        style={{ background: 'rgba(20,14,8,0.85)', borderTop: '1px solid rgba(201,168,76,0.18)' }}>
        <div className="flex items-center gap-4">
          <LudoDice value={state.diceValue} rolling={rolling}
            onClick={canRoll ? onRoll : undefined} disabled={!canRoll} />
          <div className="flex flex-col gap-0.5">
            <p className="font-arabic font-bold text-sand-light" style={{ fontSize: 13 }}>
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
                ست متتالية: {state.consecutiveSixes}
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
