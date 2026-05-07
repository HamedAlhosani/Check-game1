import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LudoGameState, LudoPiece, LudoColor, LUDO_START_OFFSETS, SOCKET_EVENTS } from '@check-game/shared';
import { socketService } from '../../../services/socket.service';
import { useAuthStore } from '../../../store/authStore';
import { useUiStore } from '../../../store/uiStore';
import { soundService } from '../../../services/sound.service';
import { LudoDice } from './LudoDice';
import { ChatPanel } from '../shared/ChatPanel';
import { GameOverModal } from '../shared/GameOverModal';
import { CharacterArt } from '../../shared/CharacterArt';
import { LUDO_EMIRATI_PALETTE, COLOR_LABELS_AR } from './BoardEmblems';

// ─── Board geometry — 15×15 grid ─────────────────────────────────────────────
// Path is the cross around the perimeter (52 tiles); home bases sit in the
// four 6×6 corners; home columns are the colored axes leading to center (7,7).
//
// Engine encodes piece position as relativePos:
//   -1            → home base (off-board)
//   0..51         → main path (each color enters at LUDO_START_OFFSETS[color])
//   52..57        → that color's home column (6 cells leading to center)
//   58            → finished (center)

// Path layout matching the Ludo King screenshot. Tile 0 is the GREEN
// start (top-left corner), 13 the YELLOW start (top-right), 26 the BLUE
// start (bottom-right), 39 the RED start (bottom-left). Walking the
// array clockwise around the cross.
const PATH_COORDS: [number, number][] = [
  [1, 6],  [0, 6],  [0, 7],  [0, 8],  [1, 8],  [2, 8],  [3, 8],  [4, 8],  [5, 8],   // 0-8   green start → top arm
  [6, 9],  [6, 10], [6, 11], [6, 12], [6, 13],                                       // 9-13  enter right arm → yellow start
  [6, 14], [7, 14], [8, 14],                                                         // 14-16 right edge
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],                                        // 17-21 right arm bottom row
  [9, 8],  [10, 8], [11, 8], [12, 8], [13, 8],                                       // 22-26 down bottom arm → blue start
  [14, 8], [14, 7], [14, 6],                                                         // 27-29 bottom edge
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],                                        // 30-34 bottom arm right col (going up)
  [8, 5],  [8, 4],  [8, 3],  [8, 2],  [8, 1],                                        // 35-39 left arm bottom → red start
  [8, 0],  [7, 0],  [6, 0],                                                          // 40-42 left edge
  [6, 1],  [6, 2],  [6, 3],  [6, 4],  [6, 5],                                        // 43-47 left arm top
  [5, 6],  [4, 6],  [3, 6],  [2, 6],                                                 // 48-51 up top arm left col
];

// Home columns leading from the perimeter to the center (7, 7). Each
// engine colour gets a 6-cell strip on its visual side of the cross.
const HOME_COLUMN_COORDS: Record<LudoColor, [number, number][]> = {
  // engine red (visual GREEN, top-left) — top arm middle column going down
  red:    [[1, 7],  [2, 7],  [3, 7],  [4, 7],  [5, 7],  [6, 7]],
  // engine blue (visual YELLOW, top-right) — right arm middle row going left
  blue:   [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9],  [7, 8]],
  // engine green (visual BLUE, bottom-right) — bottom arm middle column going up
  green:  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7],  [8, 7]],
  // engine yellow (visual RED, bottom-left) — left arm middle row going right
  yellow: [[7, 1],  [7, 2],  [7, 3],  [7, 4],  [7, 5],  [7, 6]],
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


const SAFE_TILES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const STAR_TILES = new Set([8, 21, 34, 47]); // safes that aren't a player's start
// Engine-color → visual-color screen positions handled implicitly via
// the palette swap in BoardEmblems.tsx; the engine still calls the
// top-left start tile 'red'.
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

// ─── Clean Ludo King-style board background ──────────────────────────────────
function BoardBackground() {
  return (
    <svg viewBox="0 0 15 15" className="absolute inset-0 w-full h-full" style={{ shapeRendering: 'auto' }}>
      {/* Plain white board surface */}
      <rect x="0" y="0" width="15" height="15" fill="#FFFFFF" />

      {/* ── 4 colored home bases (6×6 corners) ── */}
      {(['red', 'blue', 'green', 'yellow'] as LudoColor[]).map(color => {
        const r = HOME_BASE_REGION[color];
        const c = LUDO_EMIRATI_PALETTE[color];
        return (
          <g key={color}>
            {/* Solid colored outer 6×6 */}
            <rect x={r.col[0]} y={r.row[0]} width={6} height={6} fill={c.main} />
            {/* White inner plaque */}
            <rect x={r.col[0] + 0.6} y={r.row[0] + 0.6} width={4.8} height={4.8} fill="#FFFFFF" />
            {/* 4 concentric-ring piece pockets — empty home spots */}
            {HOME_BASE_SLOTS[color].map((slot, i) => {
              const cx = slot[1] + 0.5;
              const cy = slot[0] + 0.5;
              return (
                <g key={i}>
                  <circle cx={cx} cy={cy} r={0.55} fill="#FFFFFF" stroke={c.main} strokeWidth={0.06} />
                  <circle cx={cx} cy={cy} r={0.40} fill={c.main} />
                  <circle cx={cx} cy={cy} r={0.26} fill="#FFFFFF" />
                  <circle cx={cx} cy={cy} r={0.12} fill={c.main} />
                </g>
              );
            })}
          </g>
        );
      })}

      {/* ── Path tiles ── */}
      {PATH_COORDS.map(([row, col], i) => {
        const startColor = START_TILES[i];
        const fill = startColor ? LUDO_EMIRATI_PALETTE[startColor].main : '#FFFFFF';
        return (
          <g key={i}>
            <rect x={col} y={row} width={1} height={1} fill={fill}
              stroke="#222222" strokeWidth={0.04} />
            {/* Star on safe non-start tiles */}
            {STAR_TILES.has(i) && (
              <text x={col + 0.5} y={col === 0 ? row + 0.78 : row + 0.78}
                textAnchor="middle"
                fontSize="0.85"
                fontWeight="700"
                fill="#888888"
              >★</text>
            )}
          </g>
        );
      })}

      {/* ── Home columns — solid colored cells with thin black border ── */}
      {(['red', 'blue', 'green', 'yellow'] as LudoColor[]).map(color => {
        const c = LUDO_EMIRATI_PALETTE[color];
        return HOME_COLUMN_COORDS[color].map(([row, col], i) => (
          <rect key={`${color}-${i}`} x={col} y={row} width={1} height={1}
            fill={c.main}
            stroke="#222222" strokeWidth={0.04} />
        ));
      })}

      {/* ── Center finish — 4 colored triangles meeting at the middle ── */}
      <g>
        {/* Visual: GREEN(top-left) YELLOW(top-right) BLUE(bottom-right) RED(bottom-left) */}
        <polygon points="6,6 9,6 7.5,7.5" fill={LUDO_EMIRATI_PALETTE.blue.main}  stroke="#222" strokeWidth={0.04} />
        <polygon points="9,6 9,9 7.5,7.5" fill={LUDO_EMIRATI_PALETTE.green.main} stroke="#222" strokeWidth={0.04} />
        <polygon points="9,9 6,9 7.5,7.5" fill={LUDO_EMIRATI_PALETTE.yellow.main} stroke="#222" strokeWidth={0.04} />
        <polygon points="6,9 6,6 7.5,7.5" fill={LUDO_EMIRATI_PALETTE.red.main}   stroke="#222" strokeWidth={0.04} />
      </g>

      {/* Outer frame */}
      <rect x="0" y="0" width="15" height="15" fill="none" stroke="#222222" strokeWidth={0.10} />
    </svg>
  );
}

// Board orientation is fixed in this Ludo-King-style layout — every player
// sees the same canonical view (green top-left, yellow top-right, red
// bottom-left, blue bottom-right). The seat cards still rotate so the user
// is at bottom-left.
const ROTATION_DEG: Record<LudoColor, number> = {
  yellow: 0, green: 0, blue: 0, red: 0,
};
const SLOT_ORDER_FOR: Record<LudoColor, [LudoColor, LudoColor, LudoColor, LudoColor]> = {
  yellow: ['red',    'blue',   'yellow', 'green'],
  green:  ['yellow', 'red',    'green',  'blue'],
  blue:   ['green',  'yellow', 'blue',   'red'],
  red:    ['blue',   'green',  'red',    'yellow'],
};

// ─── Top rank ribbon — turn-timer + 1st/2nd/3rd by finishedCount ─────────────
function RankRibbon({ state }: { state: LudoGameState }) {
  const [pct, setPct] = useState(100);

  useEffect(() => {
    const end = state.turnEndAt;
    if (!end) { setPct(0); return; }
    const max = 30000;
    const tick = () => setPct(Math.max(0, Math.min(100, ((end - Date.now()) / max) * 100)));
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [state.turnEndAt]);

  // Sort by finishedCount desc, eliminated/finished first only when ranked.
  const ranked = [...state.players].sort((a, b) => b.finishedCount - a.finishedCount);
  const medal = ['🥇', '🥈', '🥉'];
  const active = state.players.find(p => p.isTurn);
  const activeColor = active ? LUDO_EMIRATI_PALETTE[active.color] : null;

  return (
    <div className="relative z-20 flex items-center gap-2 px-3 py-1.5"
      style={{
        background: 'linear-gradient(180deg, rgba(20,14,8,0.95) 0%, rgba(14,9,5,0.85) 100%)',
        borderBottom: `1px solid rgba(201,168,76,0.32)`,
        boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
      }}>
      {/* Left: ranks */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {ranked.slice(0, 3).map((p, i) => {
          const c = LUDO_EMIRATI_PALETTE[p.color];
          return (
            <div key={p.uid}
              className="flex items-center gap-1 rounded-lg px-1.5 py-1 truncate"
              style={{
                background: `linear-gradient(135deg, ${c.main}28, rgba(20,14,8,0.6))`,
                border: `1px solid ${c.accent}55`,
                fontSize: 10,
              }}>
              <span style={{ fontSize: 12, lineHeight: 1 }}>{medal[i]}</span>
              <span className="font-arabic font-bold truncate"
                style={{ color: c.accent, maxWidth: 56 }}>
                {p.displayName}
              </span>
              <span className="font-mono" style={{ color: 'rgba(245,230,200,0.7)', fontSize: 9 }}>
                {p.finishedCount}/4
              </span>
            </div>
          );
        })}
      </div>

      {/* Right: timer + active player */}
      <div className="flex items-center gap-2 shrink-0">
        {active && activeColor && (
          <div className="flex items-center gap-1.5">
            <div className="rounded-full" style={{ width: 8, height: 8, background: activeColor.main, boxShadow: `0 0 8px ${activeColor.main}`, animation: 'pulse 1.6s ease-in-out infinite' }} />
            <span className="font-arabic font-bold truncate"
              style={{ fontSize: 11, color: activeColor.accent, maxWidth: 80 }}>
              {active.displayName}
            </span>
          </div>
        )}
        {/* Turn timer — slim bar */}
        <div style={{ width: 50, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{
            width: `${pct}%`, height: '100%',
            background: pct > 50 ? '#7AC74F' : pct > 25 ? '#D9A441' : '#E04030',
            transition: 'width .2s linear, background .3s',
          }} />
        </div>
      </div>
    </div>
  );
}

// ─── Per-player seat card ─────────────────────────────────────────────────────
// Each card sits at one of the four corners around the board. The user's seat
// gets a big interactive dice + reroll button; everyone else's seat shows a
// compact dice with their last roll value.
function SeatCard({ slotColor, player, isMe, diceValue, rolling, isTurn,
                    onRoll, canRoll, ludoGems, onReroll, hasReusedThisTurn }: {
  slotColor: LudoColor;
  player: LudoGameState['players'][number] | null;
  isMe: boolean;
  diceValue: number | null;
  rolling: boolean;
  isTurn: boolean;
  onRoll?: () => void;
  canRoll: boolean;
  ludoGems: number;
  onReroll?: () => void;
  hasReusedThisTurn: boolean;
}) {
  const c = LUDO_EMIRATI_PALETTE[slotColor];

  // Empty seat — solid panel so the layout feels balanced even with 2/3 players
  if (!player) {
    return (
      <div className="rounded-xl px-2 py-1.5 flex items-center justify-center"
        style={{
          background: '#0E0905',
          border: `1.5px dashed ${c.dark}AA`,
          minHeight: 56,
        }}>
        <span className="font-arabic" style={{ fontSize: 10, color: `${c.accent}AA` }}>
          مقعد {COLOR_LABELS_AR[slotColor]}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl flex items-center gap-2 transition-all relative"
      style={{
        background: isTurn
          ? `linear-gradient(135deg, ${c.main} 0%, ${c.dark} 100%)`
          : `linear-gradient(135deg, ${c.dark} 0%, #14100A 100%)`,
        border: `2px solid ${isTurn ? '#F6E6BE' : c.accent + 'AA'}`,
        boxShadow: isTurn
          ? `0 0 22px ${c.main}, 0 4px 14px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.16)`
          : `0 4px 10px rgba(0,0,0,0.55)`,
        padding: isMe ? '8px 10px' : '6px 8px',
        minHeight: isMe ? 88 : 56,
      }}>
      {/* Avatar + name + finished count */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="relative shrink-0" style={{ width: isMe ? 40 : 30, height: isMe ? 40 : 30 }}>
          <CharacterArt id={player.avatarId} size={isMe ? 40 : 30} />
          <div className="absolute -bottom-0.5 -right-0.5 rounded-full"
            style={{
              width: 12, height: 12, background: c.main,
              border: '2px solid #14100A',
              boxShadow: `0 0 6px ${c.main}`,
            }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-arabic font-bold truncate"
            style={{ fontSize: isMe ? 13 : 11, color: '#F5E6C8' }}>
            {isMe ? 'أنت' : player.displayName}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="font-mono font-bold"
              style={{ fontSize: 11, color: '#F6E6BE' }}>
              {player.finishedCount}/4
            </span>
            {isTurn && !isMe && (
              <span className="font-arabic" style={{ fontSize: 9, color: '#F6E6BE', opacity: 0.85 }}>
                · يلعب
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Per-player dice — bigger & tappable for me, compact for others */}
      <div className="shrink-0 flex flex-col items-center gap-1">
        <LudoDice
          value={isTurn ? diceValue : null}
          rolling={isTurn && rolling}
          onClick={isMe && canRoll ? onRoll : undefined}
          disabled={!isMe || !canRoll}
          size={isMe ? 'md' : 'sm'}
        />
        {/* Reroll-with-gems button — only on my card, only after a roll */}
        {isMe && diceValue !== null && !rolling && !hasReusedThisTurn && ludoGems > 0 && (
          <button
            onClick={onReroll}
            className="font-arabic font-bold rounded-lg flex items-center gap-1 active:scale-95 transition"
            style={{
              padding: '2px 8px',
              fontSize: 10,
              background: 'linear-gradient(135deg, #9DD8E8 0%, #4A90D9 100%)',
              color: '#0E0905',
              border: '1px solid #4A90D9',
              boxShadow: '0 0 10px rgba(157,216,232,0.55)',
              cursor: 'pointer',
            }}
            title="استخدم جوهرة لإعادة الرمي">
            💎 أعد
          </button>
        )}
      </div>
    </div>
  );
}

interface Props {
  gameId: string;
  state: LudoGameState;
}

export function LudoBoard({ gameId, state }: Props) {
  const { user, profile } = useAuthStore();
  const { addToast } = useUiStore();
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [gameOver, setGameOver] = useState<{ winnerId: string | null } | null>(null);
  const [showRerollConfirm, setShowRerollConfirm] = useState(false);
  const [hasReusedThisTurn, setHasReusedThisTurn] = useState(false);

  const socket = socketService.getSocket();
  const me = state.players.find(p => p.uid === user?.uid);
  const isMyTurn = !!me?.isTurn;
  const movableSet = useMemo(() => new Set(state.movablePieces), [state.movablePieces]);
  const ludoGems = (profile as any)?.ludoGems ?? 0;

  // My color drives both the board's CSS rotation and the seat-slot order so
  // I always appear in the bottom-left visual position. Default to yellow
  // (no rotation) for spectators / pre-color-assignment.
  const myColor: LudoColor = me?.color ?? 'yellow';
  const boardRotation = ROTATION_DEG[myColor];
  const slotOrder = SLOT_ORDER_FOR[myColor]; // [TL, TR, BL=me, BR]

  // Reset the reroll-used flag whenever a fresh turn starts
  useEffect(() => {
    setHasReusedThisTurn(false);
  }, [state.currentTurnUid, state.turnEndAt]);

  useEffect(() => {
    if (!socket) return;
    const onRolled = () => {
      setRolling(true);
      soundService.playClick?.();
      setTimeout(() => setRolling(false), 700);
    };
    const onOver = (data: any) => setGameOver(data);
    const onMoved = (data: { uid?: string; pieceId?: string; captured?: boolean; toCell?: number }) => {
      soundService.playClick?.();
      // When my piece is the one captured, surface a toast so I know why
      // it just flew back home — the user reported losing pieces silently
      // and not understanding it was a capture.
      if (data?.captured && data?.uid === user?.uid) {
        addToast('⚔️ تم أكل قطعتك — رجعت للبيت', 'info');
      } else if (data?.captured && data?.uid && data.uid !== user?.uid) {
        // I captured someone — celebrate
        soundService.playClick?.();
      }
    };
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

  const onReroll = () => setShowRerollConfirm(true);

  const confirmReroll = () => {
    setShowRerollConfirm(false);
    setHasReusedThisTurn(true);
    socket?.emit(SOCKET_EVENTS.LUDO_REROLL_DICE, { gameId });
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

  // Helper to render a seat at a given slot position
  const renderSeat = (slotColor: LudoColor) => {
    const player = state.players.find(p => p.color === slotColor) ?? null;
    const isMeSlot = !!player && player.uid === user?.uid;
    const isTurn = !!player?.isTurn;
    return (
      <SeatCard
        slotColor={slotColor}
        player={player}
        isMe={isMeSlot}
        diceValue={isTurn ? state.diceValue : null}
        rolling={rolling}
        isTurn={isTurn}
        onRoll={onRoll}
        canRoll={isMyTurn && !state.diceRolled && state.phase === 'PLAYING'}
        ludoGems={ludoGems}
        onReroll={onReroll}
        hasReusedThisTurn={hasReusedThisTurn}
      />
    );
  };

  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: '#1A1A1A' }}>

      {/* ── Top rank ribbon ── */}
      <RankRibbon state={state} />

      {/* ── Top row: 2 corner seats ── */}
      <div className="relative z-10 grid grid-cols-2 gap-2 px-2 py-2"
        style={{ background: '#0E0905' }}>
        {renderSeat(slotOrder[0])}
        {renderSeat(slotOrder[1])}
      </div>

      {/* ── Board (rotated so my home corner is bottom-left) ── */}
      <div className="flex-1 flex items-center justify-center px-2 py-1 min-h-0 relative z-10">
        <motion.div
          className="relative"
          animate={{ rotate: boardRotation }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          style={{
            width: '100%',
            aspectRatio: '1 / 1',
            maxWidth: 'min(94vw, 440px)',
            filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.7))',
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
                animate={movable
                  ? {
                      top: `${(row / 15) * 100}%`,
                      left: `${(col / 15) * 100}%`,
                      // Bounce in place when movable so the player can't miss it
                      scale: [1, 1.18, 1],
                    }
                  : {
                      top: `${(row / 15) * 100}%`,
                      left: `${(col / 15) * 100}%`,
                      scale: 1,
                    }}
                transition={movable
                  ? {
                      top:   { type: 'spring', stiffness: 240, damping: 22 },
                      left:  { type: 'spring', stiffness: 240, damping: 22 },
                      scale: { duration: 0.9, repeat: Infinity, ease: 'easeInOut' },
                    }
                  : { type: 'spring', stiffness: 240, damping: 22 }}
                onClick={() => onMove(piece.id)}
                disabled={!movable}
                className="absolute"
                style={{
                  width: `${100 / 15}%`,
                  height: `${100 / 15}%`,
                  // Movable pieces use a bigger hit target so home-base launches
                  // (which were tiny before) are easy to tap.
                  padding: movable ? '4%' : (inHome ? '12%' : '10%'),
                  cursor: movable ? 'pointer' : 'default',
                  zIndex: movable ? 20 : (piece.status === 'finished' ? 5 : 12),
                  // Counter-rotate the piece so its emblem stays right-side-up
                  // for everyone, regardless of how the user's POV rotated the
                  // board container.
                  transform: `rotate(${-boardRotation}deg)`,
                  transformOrigin: 'center',
                }}
                whileTap={movable ? { scale: 0.92 } : undefined}>
                <div
                  className="w-full h-full relative rounded-full flex items-center justify-center"
                  style={{
                    background: c.main,
                    border: `2px solid ${movable ? '#FFFFFF' : c.dark}`,
                    boxShadow: movable
                      ? `0 0 0 2px #FFFFFF, 0 0 16px ${c.main}, 0 3px 6px rgba(0,0,0,0.6)`
                      : '0 3px 6px rgba(0,0,0,0.55), inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -1.5px 0 rgba(0,0,0,0.30)',
                  }}>
                  {/* Concentric ring matching the Ludo King piece look */}
                  <div className="rounded-full"
                    style={{
                      width: '60%', height: '60%',
                      background: '#FFFFFF',
                      boxShadow: 'inset 0 0 0 2px ' + c.main,
                    }}>
                    <div className="rounded-full mx-auto"
                      style={{
                        width: '60%', height: '60%',
                        marginTop: '20%',
                        background: c.main,
                      }} />
                  </div>
                  {piece.status === 'finished' && (
                    <span className="absolute" style={{ fontSize: '0.55em', fontWeight: 900, color: '#FFFFFF', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>★</span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      {/* ── Bottom row: my seat (left) + opposite-corner seat (right) ── */}
      <div className="relative z-10 grid grid-cols-2 gap-2 px-2 py-2"
        style={{ background: '#0E0905' }}>
        {renderSeat(slotOrder[2])}
        {renderSeat(slotOrder[3])}
      </div>

      {/* Game-over status banner */}
      {state.phase === 'GAME_OVER' && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-20 rounded-xl px-4 py-2 font-arabic font-bold"
          style={{
            background: '#14100A',
            border: '1.5px solid #C9A84C',
            color: '#E8C97A',
            fontSize: 13,
            boxShadow: '0 0 20px rgba(201,168,76,0.6)',
          }}>
          انتهت اللعبة
        </div>
      )}
      {state.consecutiveSixes > 0 && state.phase !== 'GAME_OVER' && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-20 rounded-xl px-3 py-1.5 font-arabic"
          style={{ background: '#14100A', border: '1px solid #C9A84C', color: '#E8C97A', fontSize: 11 }}>
          ✦ ست متتالية: {state.consecutiveSixes}
        </div>
      )}

      {/* Reroll confirm modal */}
      <AnimatePresence>
        {showRerollConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center px-6"
            style={{ background: 'rgba(8,4,2,0.85)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowRerollConfirm(false)}>
            <motion.div
              initial={{ scale: 0.92, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 8 }}
              className="rounded-2xl px-5 py-5 max-w-xs w-full text-center"
              style={{
                background: 'linear-gradient(180deg, #1F1810 0%, #14100A 100%)',
                border: '2px solid #4A90D9',
                boxShadow: '0 18px 50px rgba(0,0,0,0.85), 0 0 30px rgba(74,144,217,0.45)',
              }}
              onClick={e => e.stopPropagation()}>
              <span style={{ fontSize: 44, lineHeight: 1, filter: 'drop-shadow(0 0 14px rgba(157,216,232,0.8))' }}>💎</span>
              <h3 className="font-arabic font-bold mt-2" style={{ fontSize: 17, color: '#F6E6BE' }}>
                إعادة رمي النرد؟
              </h3>
              <p className="font-arabic mt-2" style={{ fontSize: 12, color: 'rgba(245,230,200,0.65)', lineHeight: 1.6 }}>
                ستُخصم جوهرة واحدة 💎 وتحصل على رقم جديد.
                <br />
                رصيدك الحالي: <span className="font-mono font-bold" style={{ color: '#9DD8E8' }}>{ludoGems} 💎</span>
              </p>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowRerollConfirm(false)}
                  className="flex-1 rounded-xl py-2 font-arabic font-bold"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.12)', color: 'rgba(245,230,200,0.7)', fontSize: 13 }}>
                  إلغاء
                </button>
                <button onClick={confirmReroll}
                  className="flex-1 rounded-xl py-2 font-arabic font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #9DD8E8 0%, #4A90D9 100%)',
                    color: '#0E0905', fontSize: 13,
                    boxShadow: '0 0 16px rgba(157,216,232,0.55)',
                  }}>
                  💎 ارمِ مرة ثانية
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
