import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameState, Card, SOCKET_EVENTS } from '@check-game/shared';
import { socketService } from '../../../services/socket.service';
import { useAuthStore } from '../../../store/authStore';
import { useGameStore } from '../../../store/gameStore';
import { PlayingCard } from './PlayingCard';
import { ChatPanel } from '../shared/ChatPanel';
import { GameOverModal } from '../shared/GameOverModal';
import { motion, AnimatePresence } from 'framer-motion';
import { soundService } from '../../../services/sound.service';
import { FrameRing } from '../../shared/FrameRing';

interface Props { gameId: string; roomId: string; gameState: GameState; }

// ─── Timer Bar ────────────────────────────────────────────────────────────────
function TimerBar({ endAt, active, maxMs = 30000, w = 48 }: { endAt: number | null; active?: boolean; maxMs?: number; w?: number }) {
  const [pct, setPct] = useState(100);
  useEffect(() => {
    if (!endAt || !active) { setPct(active ? 0 : 100); return; }
    const tick = () => setPct(Math.max(0, Math.min(100, ((endAt - Date.now()) / maxMs) * 100)));
    tick(); const id = setInterval(tick, 120); return () => clearInterval(id);
  }, [endAt, active, maxMs]);
  const color = pct > 50 ? '#4ade80' : pct > 25 ? '#C9A84C' : '#ef4444';
  return (
    <div style={{ width: w, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.10)' }}>
      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: active ? color : 'rgba(255,255,255,0.15)', transition: 'width .12s linear' }} />
    </div>
  );
}

const CARD_BACK = '/card-back.png';

// ─── Room background (midnight blue luxury) ───────────────────────────────────
function RoomBackground() {
  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 70% 50% at 50% 50%, rgba(0,40,100,0.35) 0%, transparent 65%),
          radial-gradient(ellipse 100% 40% at 50% 0%, rgba(0,20,60,0.5) 0%, transparent 60%),
          linear-gradient(180deg, #040C1E 0%, #020A18 38%, #010610 100%)
        `,
      }}/>
      <svg style={{position:'fixed',inset:0,width:'100%',height:'100%',zIndex:1,pointerEvents:'none',opacity:0.04}} aria-hidden="true">
        <filter id="grain-f2"><feTurbulence type="fractalNoise" baseFrequency="0.78" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
        <rect width="100%" height="100%" filter="url(#grain-f2)" fill="white"/>
      </svg>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 40%, rgba(0,0,0,0.7) 100%)',
      }}/>
    </>
  );
}

// ─── Chair top-down view ──────────────────────────────────────────────────────
function ChairTopDown() {
  return (
    <svg width="48" height="56" viewBox="0 0 48 56" fill="none">
      {/* Back rail */}
      <rect x="2" y="0" width="44" height="14" rx="5" fill="#2A1208"/>
      <rect x="5" y="2" width="38" height="8" rx="3" fill="#3D1E0A"/>
      <rect x="8" y="3" width="32" height="4" rx="2" fill="rgba(255,200,80,0.07)"/>
      {/* Seat body */}
      <rect x="2" y="16" width="44" height="36" rx="6" fill="#3A1A08"/>
      {/* Cushion */}
      <rect x="6" y="19" width="36" height="30" rx="4" fill="#4A2510" opacity="0.75"/>
      {/* Cushion highlight */}
      <rect x="9" y="21" width="30" height="9" rx="3" fill="rgba(255,200,80,0.065)"/>
      {/* Armrests */}
      <rect x="-3" y="15" width="7" height="24" rx="3" fill="#250F05"/>
      <rect x="44" y="15" width="7" height="24" rx="3" fill="#250F05"/>
      {/* Legs */}
      <rect x="3" y="48" width="9" height="6" rx="2" fill="#1A0803"/>
      <rect x="36" y="48" width="9" height="6" rx="2" fill="#1A0803"/>
    </svg>
  );
}

// ─── 10 chairs around the table ──────────────────────────────────────────────
function ChairsRing({ radius }: { radius: number }) {
  const count = 10;
  const dist = radius + 52;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;
        const rotDeg = (i / count) * 360 + 180;
        return (
          <div key={i} style={{
            position: 'absolute', left: '50%', top: '50%', zIndex: -1, pointerEvents: 'none',
            transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${rotDeg}deg)`,
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.7))',
          }}>
            <ChairTopDown />
          </div>
        );
      })}
    </>
  );
}

// ─── Circular Deck Ring ────────────────────────────────────────────────────────
function CircleDeck({ count, onClick, disabled }: { count: number; onClick?: () => void; disabled?: boolean }) {
  const MAX = 52;
  const CW = 18, CH = 27, R = 85;
  return (
    <div className="relative" style={{ width: R * 2 + CW, height: R * 2 + CH }}>
      {Array.from({ length: MAX }).map((_, i) => {
        const angle = (i / MAX) * 2 * Math.PI - Math.PI / 2;
        const cx = (R + CW / 2) + Math.cos(angle) * R - CW / 2;
        const cy = (R + CH / 2) + Math.sin(angle) * R - CH / 2;
        const rot = (i / MAX) * 360;
        const isTop = i === 0;
        const exists = i < count;
        return (
          <div
            key={i}
            onClick={isTop && exists && !disabled ? onClick : undefined}
            style={{
              position: 'absolute', left: cx, top: cy,
              width: CW, height: CH,
              transform: `rotate(${rot}deg)`,
              transformOrigin: 'center center',
              borderRadius: 4,
              background: exists ? '#080318' : 'rgba(255,255,255,0.01)',
              border: exists
                ? (isTop && !disabled ? '1.5px solid rgba(232,201,122,0.9)' : '1px solid rgba(232,201,122,0.25)')
                : '1px solid rgba(232,201,122,0.06)',
              boxShadow: isTop && exists && !disabled ? '0 0 8px rgba(201,168,76,0.5)' : 'none',
              cursor: isTop && exists && !disabled ? 'pointer' : 'default',
              zIndex: isTop && exists ? 10 : 1,
              opacity: exists ? 1 : 0.18,
              transition: 'opacity 0.5s',
            }}
          />
        );
      })}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-gold/60 font-bold" style={{ fontSize: 12, textShadow: '0 1px 4px #000' }}>{count}</span>
      </div>
    </div>
  );
}

// ─── Avatar Circle ────────────────────────────────────────────────────────────
const AV = ['#C9A84C','#4A90D9','#50C878','#E74C3C','#9B59B6','#E67E22','#1ABC9C','#E91E63'];
const AV_COLORS = AV;
const AVATAR_EMOJIS: Record<string, string> = {
  avatar_1: '👳', avatar_2: '🧕', avatar_3: '👴', avatar_4: '🧔',
  avatar_5: '👩', avatar_6: '👨', avatar_7: '🧑', avatar_8: '👵',
  avatar_9: '🕌', avatar_10: '🏙️', avatar_11: '💎', avatar_12: '🌟',
};
function Av({ id, name, size = 32, frameId }: { id: string; name: string; size?: number; frameId?: string }) {
  const i = parseInt(id?.replace(/\D/g, '') || '1', 10) - 1;
  const emoji = AVATAR_EMOJIS[id];
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="rounded-full flex items-center justify-center font-bold text-white"
        style={{ width: size, height: size, background: AV_COLORS[i % AV_COLORS.length], fontSize: emoji ? Math.round(size * 0.52) : Math.round(size * .37) }}>
        {emoji || name?.slice(0, 2) || '?'}
      </div>
      <FrameRing frameId={frameId} size={size}/>
    </div>
  );
}

// ─── Emoji float ──────────────────────────────────────────────────────────────
function EmojiFloat({ em }: { em: string }) {
  return (
    <motion.div initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -44 }}
      transition={{ duration: 1.3 }}
      className="absolute left-1/2 -translate-x-1/2 -top-8 text-2xl z-50 pointer-events-none">
      {em}
    </motion.div>
  );
}

// ─── Chat bubble above player box ─────────────────────────────────────────────
function ChatBubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.82, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.82, y: -4 }}
      transition={{ type: 'spring', stiffness: 340, damping: 26 }}
      className="absolute left-1/2 z-50 pointer-events-none"
      style={{ bottom: '105%', transform: 'translateX(-50%)', maxWidth: 190 }}
    >
      <div className="rounded-xl px-3 py-1.5 font-arabic text-xs text-white text-center"
        style={{ background: 'rgba(20,14,8,0.97)', border: '1px solid rgba(201,168,76,0.5)',
                 boxShadow: '0 2px 14px rgba(0,0,0,0.75)', wordBreak: 'break-word', lineHeight: 1.5,
                 whiteSpace: 'pre-wrap' }}>
        {text}
      </div>
      <div style={{ width: 0, height: 0, margin: '0 auto',
        borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
        borderTop: '6px solid rgba(201,168,76,0.5)' }}/>
    </motion.div>
  );
}

// ─── Distribute function ──────────────────────────────────────────────────────
function distribute(opponents: any[]) {
  // Active players first, eliminated last so the top seat stays occupied
  const active = opponents.filter(p => !p.isEliminated);
  const eliminated = opponents.filter(p => p.isEliminated);
  const sorted = [...active, ...eliminated];
  const top: any[] = [], left: any[] = [], right: any[] = [];
  const n = sorted.length;
  if (n === 1) top.push(sorted[0]);
  else if (n === 2) { left.push(sorted[0]); right.push(sorted[1]); }
  else if (n === 3) { left.push(sorted[0]); top.push(sorted[1]); right.push(sorted[2]); }
  else if (n === 4) { left.push(sorted[0]); top.push(sorted[1], sorted[2]); right.push(sorted[3]); }
  else if (n === 5) { left.push(sorted[0], sorted[1]); top.push(sorted[2]); right.push(sorted[3], sorted[4]); }
  else if (n === 6) { left.push(sorted[0], sorted[1]); top.push(sorted[2], sorted[3]); right.push(sorted[4], sorted[5]); }
  else if (n === 7) { left.push(sorted[0], sorted[1]); top.push(sorted[2], sorted[3], sorted[4]); right.push(sorted[5], sorted[6]); }
  else if (n === 8) { left.push(sorted[0], sorted[1], sorted[2]); top.push(sorted[3], sorted[4]); right.push(sorted[5], sorted[6], sorted[7]); }
  else { left.push(sorted[0], sorted[1], sorted[2]); top.push(sorted[3], sorted[4], sorted[5]); right.push(sorted[6], sorted[7], sorted[8]); }
  return { top, left, right };
}

// ─── Full-width timer bar ─────────────────────────────────────────────────────
function FullBar({ endAt, active, maxMs = 30000 }: { endAt: number | null; active?: boolean; maxMs?: number }) {
  const [pct, setPct] = useState(100);
  useEffect(() => {
    if (!endAt || !active) { setPct(active ? 0 : 100); return; }
    const tick = () => setPct(Math.max(0, Math.min(100, ((endAt - Date.now()) / maxMs) * 100)));
    tick(); const id = setInterval(tick, 120); return () => clearInterval(id);
  }, [endAt, active, maxMs]);
  const color = pct > 50 ? '#4ade80' : pct > 25 ? '#C9A84C' : '#ef4444';
  return (
    <div style={{ width: `${pct}%`, height: '100%', background: active ? color : 'rgba(255,255,255,0.12)', transition: 'width .12s linear, background .3s' }} />
  );
}

// ─── Shared player box (same design for everyone) ─────────────────────────────
function PlayerBox({ player, gameState, avSize = 42, scoreFs = 26, nameFs = 11 }: { player: any; gameState: any; avSize?: number; scoreFs?: number; nameFs?: number }) {
  const isTurn = player.isTurn, isElim = player.isEliminated;
  const compact = avSize <= 30;
  return (
    <div
      className={`w-full rounded-xl border overflow-hidden ${isTurn ? 'border-gold/70' : 'border-yellow-900/30'}`}
      style={{
        background: isTurn
          ? 'linear-gradient(135deg,rgba(201,168,76,.18) 0%,rgba(20,8,0,.94) 100%)'
          : 'linear-gradient(135deg,rgba(100,50,10,.14) 0%,rgba(20,14,8,.94) 100%)',
        backdropFilter: 'blur(12px)',
        boxShadow: isTurn ? '0 0 16px rgba(201,168,76,.25), inset 0 1px 0 rgba(232,201,122,.1)' : 'none',
      }}
    >
      <div style={{ height: compact ? 3 : 4, background: 'rgba(255,255,255,.06)', width: '100%' }}>
        <FullBar endAt={gameState.turnEndAt} active={isTurn} />
      </div>
      <div className={`flex items-center gap-2 ${compact ? 'px-1.5 py-1' : 'px-2.5 py-2'}`}>
        <div className="relative shrink-0">
          <Av id={player.avatarId} name={player.displayName} frameId={(player as any).equippedFrame} size={avSize} />
          {isTurn && <div className="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-black animate-pulse" style={{ width: compact ? 8 : 11, height: compact ? 8 : 11, background: '#C9A84C' }} />}
          {isElim && <div className="absolute inset-0 rounded-full bg-black/70 flex items-center justify-center"><span className="text-red-400 font-bold" style={{ fontSize: compact ? 8 : 10 }}>✕</span></div>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-arabic truncate" style={{ fontSize: nameFs, color: 'rgba(255,255,255,.75)' }}>{player.displayName}</p>
          <p className="font-bold leading-none mt-0.5" style={{ fontSize: scoreFs, color: isTurn ? '#E8C97A' : 'rgba(201,168,76,.65)' }}>{player.cumulativeScore}</p>
        </div>
      </div>
    </div>
  );
}

function cardGridCols(count: number) {
  if (count <= 4) return 'grid grid-cols-2 gap-1';
  if (count <= 6) return 'grid grid-cols-3 gap-1';
  return 'grid grid-cols-4 gap-1';
}

// ─── Shared cards row for any seat ───────────────────────────────────────────
function SeatCards({ player, isSpecialJ, selectedPos, onSpecialSwap, mini = false }: any) {
  const nonNull = player.cards.filter(Boolean).length;
  return (
    <div className="relative">
      <div className={cardGridCols(nonNull)}>
        <AnimatePresence>
          {player.cards.map((c: any, i: number) => c !== null ? (
            <motion.div key={`${player.uid}-${i}`}
              initial={{ opacity: 0, y: i % 2 === 0 ? -18 : 18, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            >
              <PlayingCard card={c} faceDown={!c?.isRevealed} small={!mini} mini={mini}
                highlight={isSpecialJ ? 'burn' : 'none'}
                onClick={isSpecialJ && selectedPos !== null ? () => onSpecialSwap(player.uid, i) : undefined} />
            </motion.div>
          ) : null)}
        </AnimatePresence>
      </div>
      {player.isEliminated && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.55)' }}>
          <span className="text-red-400 font-bold" style={{ fontSize: 24 }}>✕</span>
        </div>
      )}
    </div>
  );
}

// ─── Mobile card count dots ───────────────────────────────────────────────────
function CardCountDots({ count, eliminated }: { count: number; eliminated: boolean }) {
  if (eliminated) return <div className="flex items-center justify-center mt-0.5"><span className="text-red-400 font-bold" style={{ fontSize: 10 }}>✕</span></div>;
  return (
    <div className="flex flex-wrap gap-0.5 justify-center mt-0.5" style={{ maxWidth: 112 }}>
      {Array.from({ length: Math.max(count, 0) }).map((_, i) => (
        <div key={i} style={{ width: 11, height: 16, borderRadius: 2, background: '#080318', border: '1px solid rgba(201,168,76,0.38)' }} />
      ))}
    </div>
  );
}

// ─── Unified opponent seat (top / left / right / mobile) ─────────────────────
function OpponentSeat({ player, gameState, isSpecialJ, selectedPos, onSpecialSwap, emoji, chatBubble, cfg }: any) {
  const mobileCompact = cfg.w <= 120;
  return (
    <div className="relative flex flex-col items-center shrink-0" style={{ width: cfg.w, zIndex: 20, gap: mobileCompact ? 2 : 4 }}>
      <AnimatePresence>{emoji && <EmojiFloat em={emoji} />}</AnimatePresence>
      <div className="relative w-full">
        <AnimatePresence>
          {chatBubble && <ChatBubble text={chatBubble.text} key={chatBubble.key} />}
        </AnimatePresence>
        <PlayerBox player={player} gameState={gameState} avSize={cfg.avSize} scoreFs={cfg.scoreFs} nameFs={cfg.nameFs} />
      </div>
      {mobileCompact ? (
        <CardCountDots count={player.cards.filter(Boolean).length} eliminated={player.isEliminated} />
      ) : (
        <SeatCards player={player} isSpecialJ={isSpecialJ} selectedPos={selectedPos} onSpecialSwap={onSpecialSwap} mini={cfg.mini} />
      )}
    </div>
  );
}

// ─── Compact seat for mobile strip (shows all opponents in one row) ─────────
function CompactSeat({ player, emoji, chatBubble, isSpecialJ, selectedPos, onSelectForJ }: any) {
  const isTurn = player.isTurn;
  const isElim = player.isEliminated;
  const cardCount = player.cards.filter(Boolean).length;
  return (
    <div className="relative flex flex-col items-center"
      style={{
        flex: 1, borderRadius: 8, padding: '3px 2px 4px',
        background: isTurn ? 'rgba(201,168,76,0.16)' : 'rgba(255,255,255,0.04)',
        border: isTurn ? '1px solid rgba(201,168,76,0.65)' : '1px solid rgba(255,255,255,0.06)',
        boxShadow: isTurn ? '0 0 8px rgba(201,168,76,0.22)' : 'none',
        opacity: isElim ? 0.45 : 1, cursor: isSpecialJ && selectedPos !== null && !isElim ? 'pointer' : 'default',
        gap: 1.5, transition: 'all 0.3s',
      }}
      onClick={() => isSpecialJ && selectedPos !== null && !isElim && onSelectForJ(player.uid)}
    >
      <AnimatePresence>{emoji && <EmojiFloat em={emoji} />}</AnimatePresence>
      <AnimatePresence>{chatBubble && <ChatBubble text={chatBubble.text} key={chatBubble.key} />}</AnimatePresence>
      <div className="relative">
        <Av id={player.avatarId} name={player.displayName} frameId={(player as any).equippedFrame} size={20} />
        {isTurn && <div className="absolute animate-pulse" style={{ bottom:-1, right:-1, width:5, height:5, borderRadius:'50%', background:'#C9A84C', border:'1px solid #000' }} />}
        {isElim && <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{color:'#ef4444', fontSize:7, fontWeight:700}}>✕</span></div>}
      </div>
      <p className="font-arabic" style={{ fontSize: 5.5, color:'rgba(255,255,255,0.55)', lineHeight:1, maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{player.displayName}</p>
      <p style={{ fontSize: 8.5, fontWeight:700, lineHeight:1, color: isTurn ? '#E8C97A' : 'rgba(201,168,76,0.55)' }}>{player.cumulativeScore}</p>
      {/* 2×2 card indicators */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:1.5, marginTop:1 }}>
        {Array.from({ length: Math.min(cardCount, 4) }).map((_, j) => (
          <div key={j} style={{ width:13, height:19, borderRadius:2, background:'#060B1F', border:`1px solid ${isTurn ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.22)'}` }} />
        ))}
      </div>
      {isSpecialJ && selectedPos !== null && !isElim && (
        <div className="absolute inset-0 rounded-lg" style={{ border: '1.5px solid rgba(80,200,120,0.7)', boxShadow: '0 0 8px rgba(80,200,120,0.4)', pointerEvents:'none' }} />
      )}
    </div>
  );
}

// ─── Mini seat for circular orbit (2×2 real cards) ───────────────────────────
function MiniSeat({ player, isSpecialJ, selectedPos, onSpecialSwap, emoji, chatBubble, isMob }: any) {
  const isTurn = player.isTurn;
  const isElim = player.isEliminated;
  const w = isMob ? 82 : 104;
  const avSz = isMob ? 18 : 24;

  const handleClick = () => {
    if (isSpecialJ && selectedPos !== null && !isElim) {
      const pos = player.cards.findIndex((c: any) => c !== null);
      if (pos !== -1) onSpecialSwap(player.uid, pos);
    }
  };

  const borderColor = isTurn ? 'rgba(201,168,76,0.75)' : 'rgba(255,255,255,0.10)';
  const bg = isTurn ? 'rgba(201,168,76,0.15)' : 'rgba(20,14,8,0.88)';

  return (
    <div className="relative flex flex-col items-center" onClick={handleClick}
      style={{ width: w, cursor: isSpecialJ && selectedPos !== null && !isElim ? 'pointer' : 'default', opacity: isElim ? 0.5 : 1, transition: 'opacity 0.3s' }}>
      <AnimatePresence>{emoji && <EmojiFloat em={emoji} />}</AnimatePresence>
      <AnimatePresence>{chatBubble && <ChatBubble text={chatBubble.text} key={chatBubble.key} />}</AnimatePresence>

      {/* Header: avatar + name + score */}
      <div style={{
        width: '100%', borderRadius: '8px 8px 0 0', backdropFilter: 'blur(10px)',
        background: bg, border: `1.5px solid ${borderColor}`, borderBottom: 'none',
        boxShadow: isTurn ? '0 0 10px rgba(201,168,76,0.3)' : 'none',
        padding: '3px 4px 2px', display: 'flex', alignItems: 'center', gap: 3,
      }}>
        <div className="relative shrink-0">
          <Av id={player.avatarId} name={player.displayName} frameId={(player as any).equippedFrame} size={avSz} />
          {isTurn && <div className="absolute animate-pulse" style={{ bottom: -1, right: -1, width: 6, height: 6, borderRadius: '50%', background: '#C9A84C', border: '1px solid #000' }} />}
          {isElim && <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#ef4444', fontSize: 7, fontWeight: 700 }}>✕</span></div>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-arabic truncate" style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.1 }}>{player.displayName}</p>
          <p style={{ fontSize: 10, fontWeight: 700, lineHeight: 1, color: isTurn ? '#E8C97A' : 'rgba(201,168,76,0.65)' }}>{player.cumulativeScore}</p>
        </div>
      </div>

      {/* 2×2 cards grid */}
      <div style={{
        width: '100%', borderRadius: '0 0 8px 8px', position: 'relative',
        background: isTurn ? 'rgba(201,168,76,0.06)' : 'rgba(4,2,0,0.82)',
        border: `1.5px solid ${borderColor}`, borderTop: 'none',
        padding: '2px 3px 3px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2,
      }}>
        {player.cards.map((c: any, i: number) => c !== null ? (
          <PlayingCard key={i} card={c} faceDown={!c?.isRevealed} xmini
            highlight={isSpecialJ && selectedPos !== null ? 'burn' : 'none'} />
        ) : null)}
        {isElim && (
          <div style={{ position: 'absolute', inset: 0, borderRadius: '0 0 8px 8px', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 16 }}>✕</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Opponents orbiting the table ─────────────────────────────────────────────
function CircularOpponents({ opponents, tableRadius, isMobile, gameState, isSpecialJ, selectedPos, onSpecialSwap, emojiMap, chatBubbleMap }: any) {
  const n = opponents.length;
  if (n === 0) return null;
  // Arc from -140° to +140° (avoiding bottom where player sits)
  const arcStart = -(Math.PI * 14) / 18;
  const arcEnd = (Math.PI * 14) / 18;
  const orbitR = tableRadius + (isMobile ? 38 : 72);
  return (
    <>
      {opponents.map((p: any, i: number) => {
        const angle = n === 1 ? -Math.PI / 2 : arcStart + (i / (n - 1)) * (arcEnd - arcStart);
        const x = Math.cos(angle) * orbitR;
        const y = Math.sin(angle) * orbitR;
        return (
          <div key={p.uid} style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`, zIndex: 20 }}>
            <MiniSeat player={p} isSpecialJ={isSpecialJ} selectedPos={selectedPos} onSpecialSwap={onSpecialSwap}
              emoji={emojiMap[p.uid]} chatBubble={chatBubbleMap[p.uid] ?? null} isMob={isMobile} />
          </div>
        );
      })}
    </>
  );
}

// ─── CheckBoard ───────────────────────────────────────────────────────────────
export function CheckBoard({ gameId, roomId, gameState }: Props) {
  const { user, profile } = useAuthStore();
  const boardThemeId = (profile?.equippedItems as any)?.boardTheme || 'board_classic';
  const cardBackId = (profile?.equippedItems as any)?.cardBack || 'card_classic';
  const BOARD_THEMES: Record<string, { c1: string; c2: string; c3: string; rim1: string; rim2: string }> = {
    board_classic: { c1: '#17432E', c2: '#0D2D1F', c3: '#071810', rim1: '#1A2A3A', rim2: '#243548' },
    board_desert:  { c1: '#6B3A10', c2: '#4A2508', c3: '#2A1003', rim1: '#5A3010', rim2: '#7A4518' },
    board_oasis:   { c1: '#1A5A30', c2: '#104020', c3: '#082010', rim1: '#1A4028', rim2: '#286038' },
    board_night:   { c1: '#0A1840', c2: '#061028', c3: '#020810', rim1: '#102040', rim2: '#183058' },
    board_royal:   { c1: '#2A0A50', c2: '#1A0638', c3: '#0A0220', rim1: '#2A1050', rim2: '#3A1868' },
  };
  const theme = BOARD_THEMES[boardThemeId] || BOARD_THEMES.board_classic;
  const { drawnCard, setDrawnCard, gameOverData, setGameOverData, reset: resetGame, chatMessages } = useGameStore();
  const navigate = useNavigate();
  const socket = socketService.getSocket();

  const me = gameState.players.find(p => p.uid === user?.uid);
  const others = gameState.players.filter(p => p.uid !== user?.uid);
  const isMyTurn = !!me?.isTurn;
  const canBurnAttempt = isMyTurn && !drawnCard &&
    (gameState.phase === 'PLAYING' || gameState.phase === 'CHECK_CALLED') &&
    !gameState.lastDiscardFromKing &&
    !!gameState.discardTop;
  const isSpecialJ = gameState.phase === 'SPECIAL_J' && gameState.specialActionUid === user?.uid;
  const isSpecialQ = gameState.phase === 'SPECIAL_Q' && gameState.specialActionUid === user?.uid;
  const activePlCount = gameState.players.filter(p => !p.isEliminated).length;
  const lapCount = activePlCount > 0 ? Math.floor(gameState.dealTurnCount / activePlCount) : 0;
  const lapsRemainingForCheck = Math.max(0, 4 - lapCount);
  const [hasPlayedThisTurn, setHasPlayedThisTurn] = useState(false);
  const canCallCheck = gameState.phase === 'PLAYING' &&
    lapCount >= 4 &&
    isMyTurn && !gameState.checkCallerId &&
    hasPlayedThisTurn;

  const [winW, setWinW] = useState(() => window.innerWidth);
  const [winH, setWinH] = useState(() => window.innerHeight);
  useEffect(() => {
    const h = () => { setWinW(window.innerWidth); setWinH(window.innerHeight); };
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  const isMobile = winW < 768;

  // Dynamic mobile sizing — everything must fit inside the fixed viewport
  const useMiniCards = isMobile && winH < 780;
  const myAreaH = useMiniCards ? 218 : 280; // mini vs small cards height estimate
  const stripH = isMobile ? 82 : 0;
  const mobileTableSize = isMobile
    ? Math.min(
        Math.floor(winW * 0.72),           // max 72% of screen width
        winH - 100 - stripH - myAreaH - 20, // max from available height
        290                                  // hard cap
      )
    : 0;
  const n = gameState.players.length;
  const seatCfg = (() => {
    if (isMobile) return { w: 114, avSize: 24, scoreFs: 14, nameFs: 7, mini: true };
    if (n <= 4)   return { w: 200, avSize: 42, scoreFs: 26, nameFs: 11, mini: false };
    if (n <= 6)   return { w: 175, avSize: 38, scoreFs: 22, nameFs: 10, mini: false };
    if (n <= 8)   return { w: 155, avSize: 34, scoreFs: 18, nameFs: 9,  mini: true };
                  return { w: 138, avSize: 28, scoreFs: 15, nameFs: 8,  mini: true };
  })();

  const tableRef = useRef<HTMLDivElement>(null);
  const [tSize, setTSize] = useState(500);

  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setTSize(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [knownCards, setKnownCards] = useState<Map<number, Card>>(new Map());
  const [selectedPos, setSelectedPos] = useState<number | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [emojiMap, setEmojiMap] = useState<Record<string, string | null>>({});
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [showPeek, setShowPeek] = useState(false);
  const [showAfk, setShowAfk] = useState(false);
  const [roundScoreData, setRoundScoreData] = useState<any>(null);
  const [kingChoiceCards, setKingChoiceCards] = useState<Card[] | null>(null);
  const [kingSelectedIdx, setKingSelectedIdx] = useState<number | null>(null);
  const [pendingBurnPos, setPendingBurnPos] = useState<number | null>(null);
  const [discardSelected, setDiscardSelected] = useState(false);
  const [chatBubbleMap, setChatBubbleMap] = useState<Record<string, { text: string; key: number } | null>>({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [jTargetUid, setJTargetUid] = useState<string | null>(null);
  const [swapHighlight, setSwapHighlight] = useState<{ pos: number; byUid: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [soundOn, setSoundOn] = useState(soundService.isEnabled());
  const [volume, setVolumeState] = useState(soundService.getVolume());

  const prevTurnRef = useRef<string | null>(null);
  const actedRef = useRef(false);
  const afkCountRef = useRef(0);
  const prevMsgCountRef = useRef(-1);
  const chatOpenRef = useRef(false);
  const drawingRef = useRef(false);

  useEffect(() => {
    if (!socket) return;
    socket.on(SOCKET_EVENTS.GAME_PEEK_OWN, (data: any) => {
      setKnownCards(prev => {
        const next = new Map(prev);
        if (data.cards) data.cards.forEach((item: any) => next.set(item.position, item.card));
        else if (data.card !== undefined) next.set(data.position, data.card);
        return next;
      });
    });
    socket.on(SOCKET_EVENTS.GAME_CARD_DRAWN, (data: any) => { if (data.card) { setDrawnCard(data.card); soundService.playCardDraw(); } actedRef.current = true; });
    socket.on(SOCKET_EVENTS.GAME_OVER, (data: any) => { setGameOverData(data); soundService.playWin(); });
    socket.on(SOCKET_EVENTS.GAME_CHECK_CALLED, () => { soundService.playCheckVoice(); });
    socket.on(SOCKET_EVENTS.GAME_BURN_INVALID, () => { soundService.playError(); });
    socket.on(SOCKET_EVENTS.GAME_SCORES, (data: any) => {
      setRoundScoreData(data);
      setTimeout(() => setRoundScoreData(null), 5500);
    });
    socket.on(SOCKET_EVENTS.GAME_KING_CHOICE, (data: any) => {
      if (data.cards) {
        setKingChoiceCards(data.cards);
        setKingSelectedIdx(null);
      }
    });
    socket.on(SOCKET_EVENTS.GAME_SWAP_EXECUTED, (data: any) => {
      // If someone (not me) swapped a card with one of mine, mark that card for 5s
      if (data?.targetUid === user?.uid && data?.uid !== user?.uid && typeof data.targetPosition === 'number') {
        setSwapHighlight({ pos: data.targetPosition, byUid: data.uid });
        window.setTimeout(() => setSwapHighlight(null), 5000);
      }
    });
    return () => {
      socket.off(SOCKET_EVENTS.GAME_PEEK_OWN);
      socket.off(SOCKET_EVENTS.GAME_CARD_DRAWN);
      socket.off(SOCKET_EVENTS.GAME_OVER);
      socket.off(SOCKET_EVENTS.GAME_SCORES);
      socket.off(SOCKET_EVENTS.GAME_KING_CHOICE);
      socket.off(SOCKET_EVENTS.GAME_SWAP_EXECUTED);
      socket.off(SOCKET_EVENTS.GAME_CHECK_CALLED);
      socket.off(SOCKET_EVENTS.GAME_BURN_INVALID);
      // Reset game state so a new game starts fresh
      resetGame();
    };
  }, [socket]);

  useEffect(() => {
    if (gameState.phase === 'PEEK_PHASE') { setShowIntro(false); setShowPeek(true); }
    if (gameState.phase === 'PLAYING') { setShowPeek(false); setKnownCards(new Map()); }
    if (gameState.phase !== 'KING_CHOICE') { setKingChoiceCards(null); setKingSelectedIdx(null); }
  }, [gameState.phase]);

  useEffect(() => {
    if (gameState.phase !== 'SPECIAL_J') { setJTargetUid(null); }
  }, [gameState.phase]);

  useEffect(() => {
    const cur = gameState.currentTurnUid;
    if (cur !== prevTurnRef.current) {
      if (prevTurnRef.current === user?.uid && !actedRef.current) {
        afkCountRef.current++;
        if (afkCountRef.current >= 2) setShowAfk(true);
      }
      if (cur === user?.uid) { actedRef.current = false; drawingRef.current = false; soundService.playTurnStart(); }
      prevTurnRef.current = cur;
      setPendingBurnPos(null);
      setDiscardSelected(false);
      setHasPlayedThisTurn(false);
    }
  }, [gameState.currentTurnUid, user?.uid]);

  // Auto-burn K choice cards if player doesn't respond within 20s
  useEffect(() => {
    if (gameState.phase !== 'KING_CHOICE' || gameState.specialActionUid !== user?.uid) return;
    const id = window.setTimeout(() => {
      if (!actedRef.current) {
        socket?.emit(SOCKET_EVENTS.GAME_KING_BURN, { gameId });
        markActed();
      }
    }, 19000);
    return () => window.clearTimeout(id);
  }, [gameState.phase, gameState.specialActionUid]);

  // Auto-play on turn timeout so game continues for everyone
  useEffect(() => {
    if (!isMyTurn || !gameState.turnEndAt || (gameState.phase !== 'PLAYING' && gameState.phase !== 'CHECK_CALLED')) return;
    const delay = gameState.turnEndAt - Date.now();
    if (delay <= 0) return;
    const id = window.setTimeout(() => {
      if (actedRef.current) return;
      if (!drawnCard) {
        socket?.emit(SOCKET_EVENTS.GAME_DRAW_DECK, { gameId });
        window.setTimeout(() => { socket?.emit(SOCKET_EVENTS.GAME_BURN_DRAWN, { gameId }); setDrawnCard(null); }, 900);
      } else {
        socket?.emit(SOCKET_EVENTS.GAME_BURN_DRAWN, { gameId }); setDrawnCard(null);
      }
    }, delay);
    return () => window.clearTimeout(id);
  }, [gameState.turnEndAt, isMyTurn, gameState.phase]);

  // AFK: play quickly (1.5s) instead of waiting full turn timeout
  useEffect(() => {
    if (!showAfk || !isMyTurn || (gameState.phase !== 'PLAYING' && gameState.phase !== 'CHECK_CALLED')) return;
    const id = window.setTimeout(() => {
      if (actedRef.current) return;
      if (!drawnCard) {
        socket?.emit(SOCKET_EVENTS.GAME_DRAW_DECK, { gameId });
        window.setTimeout(() => { socket?.emit(SOCKET_EVENTS.GAME_BURN_DRAWN, { gameId }); setDrawnCard(null); }, 700);
      } else {
        socket?.emit(SOCKET_EVENTS.GAME_BURN_DRAWN, { gameId }); setDrawnCard(null);
      }
      actedRef.current = true;
    }, 1500);
    return () => window.clearTimeout(id);
  }, [showAfk, isMyTurn, gameState.phase]);

  // Clear stale drawn card (e.g. K choice cards left after opponent takes turn)
  useEffect(() => {
    if (!isMyTurn) setDrawnCard(null);
  }, [isMyTurn]);

  // Sync chatOpenRef and clear unread when panel opens
  useEffect(() => {
    chatOpenRef.current = chatOpen;
    if (chatOpen) setUnreadCount(0);
  }, [chatOpen]);

  // Process incoming chat messages → bubble + emoji + unread count
  useEffect(() => {
    if (prevMsgCountRef.current === -1) {
      prevMsgCountRef.current = chatMessages.length;
      return;
    }
    if (chatMessages.length <= prevMsgCountRef.current) return;
    const newMsgs = chatMessages.slice(prevMsgCountRef.current);
    prevMsgCountRef.current = chatMessages.length;

    for (const msg of newMsgs) {
      if (!chatOpenRef.current) setUnreadCount(c => c + 1);

      // Emoji float for all players
      if (msg.emoji) {
        const uid = msg.uid;
        const em = msg.emoji;
        setEmojiMap(prev => ({ ...prev, [uid]: em }));
        setTimeout(() => setEmojiMap(prev => ({ ...prev, [uid]: null })), 2000);
      }

      // Chat bubble above seat (text only, skip pure-emoji messages)
      if (msg.text && msg.text !== msg.emoji) {
        const uid = msg.uid;
        const key = Date.now() + Math.random();
        setChatBubbleMap(prev => ({ ...prev, [uid]: { text: msg.text, key } }));
        setTimeout(() => {
          setChatBubbleMap(prev => {
            const cur = prev[uid];
            if (cur && cur.key === key) return { ...prev, [uid]: null };
            return prev;
          });
        }, 5000);
      }
    }
  }, [chatMessages.length]);

  const markActed = useCallback(() => { actedRef.current = true; afkCountRef.current = 0; setShowAfk(false); }, []);
  const canTakeDiscard = isMyTurn && !drawnCard &&
    (gameState.phase === 'PLAYING' || gameState.phase === 'CHECK_CALLED') &&
    !gameState.lastDiscardFromKing &&
    !!gameState.discardTop;
  const onDraw = () => {
    if (drawingRef.current) return;
    drawingRef.current = true;
    setTimeout(() => { drawingRef.current = false; }, 1500);
    setPendingBurnPos(null);
    setDiscardSelected(false);
    socket?.emit(SOCKET_EVENTS.GAME_DRAW_DECK, { gameId });
    markActed();
  };
  const onTakeDiscard = (handPos: number) => {
    socket?.emit(SOCKET_EVENTS.GAME_TAKE_DISCARD, { gameId, handPosition: handPos });
    setDiscardSelected(false);
    setPendingBurnPos(null);
    setHasPlayedThisTurn(true);
    markActed();
  };
  const onBurnDrawn = () => { soundService.playBurn(); socket?.emit(SOCKET_EVENTS.GAME_BURN_DRAWN, { gameId }); setDrawnCard(null); setHasPlayedThisTurn(true); markActed(); };
  const onSwapDrawn = (pos: number) => { soundService.playCardFlip(); socket?.emit(SOCKET_EVENTS.GAME_SWAP_DRAWN, { gameId, cardPosition: pos }); setDrawnCard(null); setHasPlayedThisTurn(true); markActed(); };
  const onCallCheck = () => { soundService.playCheckVoice(); socket?.emit(SOCKET_EVENTS.GAME_CALL_CHECK, { gameId }); markActed(); };
  const onSpecialSwap = (targetUid: string, targetPos: number) => {
    if (selectedPos === null) return;
    soundService.playSpecialAction();
    socket?.emit(SOCKET_EVENTS.GAME_SPECIAL_SWAP, { gameId, myPosition: selectedPos, targetUid, targetPosition: targetPos });
    setSelectedPos(null); setHasPlayedThisTurn(true); markActed();
  };
  const onSpecialPeek = (pos: number) => { soundService.playSpecialAction(); socket?.emit(SOCKET_EVENTS.GAME_SPECIAL_PEEK_OWN, { gameId, cardPosition: pos }); setHasPlayedThisTurn(true); markActed(); };
  const onPeekDone = () => { socket?.emit(SOCKET_EVENTS.GAME_PEEK_COMPLETE, { gameId }); setShowPeek(false); };

  const getCardForPos = (cards: (Card | null)[], pos: number): Card | null => {
    const c = cards[pos]; if (c?.isRevealed) return c;
    const known = knownCards.get(pos);
    return known ? { ...known, isRevealed: false } : (c ? { ...c, isRevealed: false } : null);
  };
  const myCardHighlight = (i: number): 'burn' | 'select' | 'none' => {
    if (drawnCard && isMyTurn) return 'select';
    if (discardSelected) return 'select';
    if (isSpecialJ && selectedPos === null) return 'select';
    if (isSpecialQ) return 'select';
    if (pendingBurnPos === i) return 'burn';
    if (canBurnAttempt) return 'select';
    return 'none';
  };
  const onMyCardClick = (i: number) => {
    if (drawnCard && isMyTurn) { onSwapDrawn(i); return; }
    if (discardSelected) { onTakeDiscard(i); return; }
    if (isSpecialQ) { onSpecialPeek(i); return; }
    if (isSpecialJ) { setSelectedPos(i); return; }
    if (canBurnAttempt) {
      if (pendingBurnPos === i) {
        soundService.playBurn();
        socket?.emit(SOCKET_EVENTS.GAME_BURN_ATTEMPT, { gameId, cardPosition: i });
        setPendingBurnPos(null);
        markActed();
      } else {
        setPendingBurnPos(i);
      }
      return;
    }
  };

  const { top, left, right } = isMobile ? { top: [] as any[], left: [] as any[], right: [] as any[] } : distribute(others);

  const commonSeatProps = { gameState, isSpecialJ, selectedPos, onSpecialSwap, cfg: seatCfg };

  // ── Overlays ──────────────────────────────────────────────────────────────
  const IntroOverlay = () => (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'rgba(20,14,8,0.93)', backdropFilter: 'blur(8px)' }}>
      <p className="font-display text-4xl tracking-widest text-gold mb-1" style={{ textShadow: '0 0 30px rgba(201,168,76,.5)' }}>CHECK</p>
      <p className="text-sand/50 font-arabic text-sm mb-6">اللاعبون</p>
      <div className="flex flex-wrap justify-center gap-3 mb-8 px-4 overflow-y-auto" style={{ maxHeight: '42vh' }}>
        {gameState.players.map((p, i) => (
          <motion.div key={p.uid} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .1 }}
            className="flex flex-col items-center gap-2 rounded-xl border border-gold/20 bg-white/5 px-3 py-2.5">
            <Av id={p.avatarId} name={p.displayName} frameId={(p as any).equippedFrame} size={48} />
            <p className="text-white/90 text-xs font-arabic">{p.displayName}</p>
          </motion.div>
        ))}
      </div>
      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: .95 }}
        className="px-8 py-3 rounded-xl border border-gold/60 text-gold font-arabic text-lg bg-gold/10 hover:bg-gold/20 transition-all"
        onClick={() => { setShowIntro(false); socket?.emit(SOCKET_EVENTS.GAME_PEEK_COMPLETE, { gameId }); }}>
        تخطي
      </motion.button>
    </div>
  );

  const PeekOverlay = () => (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'rgba(20,14,8,0.91)', backdropFilter: 'blur(8px)' }}>
      <p className="text-gold font-arabic font-bold text-xl mb-1">احفظ أوراقك!</p>
      <p className="text-sand/50 font-arabic text-sm mb-4">الورقتان السفليتان</p>
      {me && (
        <div className="flex flex-col items-center gap-3">
          <TimerBar endAt={gameState.peekPhaseEndAt} maxMs={8000} w={200} />
          <div className="rounded-2xl border border-gold/30 bg-white/5 p-5 flex gap-4">
            <PlayingCard card={me.cards[2] ? { ...me.cards[2], isRevealed: true } : null} />
            <PlayingCard card={me.cards[3] ? { ...me.cards[3], isRevealed: true } : null} />
          </div>
        </div>
      )}
      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: .95 }}
        className="mt-6 px-8 py-3 rounded-xl border border-gold/60 text-gold font-arabic text-lg bg-gold/10 transition-all"
        onClick={onPeekDone}>تخطي</motion.button>
    </div>
  );

  const AfkOverlay = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="rounded-2xl border border-gold/30 bg-night-mid/95 px-8 py-6 flex flex-col items-center gap-4 pointer-events-auto"
        style={{ backdropFilter: 'blur(12px)' }}>
        <p className="text-gold font-arabic text-lg font-bold">البوت جالس يلعب</p>
        <p className="text-sand/60 font-arabic text-sm text-center">البوت يلعب بدلك تلقائياً واللعبة تكمل</p>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: .95 }}
          className="px-6 py-2 rounded-xl border border-gold/60 text-gold font-arabic bg-gold/10 hover:bg-gold/20 transition-all"
          onClick={() => { setShowAfk(false); afkCountRef.current = 0; }}>العودة</motion.button>
      </div>
    </div>
  );

  const doLeaveGame = () => {
    // Tell the server immediately so the bot takes over right away
    socket?.emit(SOCKET_EVENTS.GAME_PLAYER_LEAVE, { gameId });
    resetGame();
    navigate('/home');
  };

  const ExitOverlay = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(20,14,8,0.84)', backdropFilter: 'blur(8px)' }}>
      <div className="rounded-2xl border border-white/10 bg-night-mid/95 px-8 py-6 flex flex-col items-center gap-4">
        <p className="text-white font-arabic text-lg">هل أنت متأكد تريد الخروج؟</p>
        <p className="text-sand/50 font-arabic text-sm text-center">سيحل بوت مكانك مع اللاعبين الحقيقيين</p>
        <div className="flex gap-3">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: .95 }}
            className="px-5 py-2 rounded-xl border border-red-500/60 text-red-400 font-arabic bg-red-900/20 hover:bg-red-900/40"
            onClick={doLeaveGame}>نعم، خروج</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: .95 }}
            className="px-5 py-2 rounded-xl border border-gold/40 text-gold font-arabic bg-gold/10 hover:bg-gold/20"
            onClick={() => setShowExitConfirm(false)}>إلغاء</motion.button>
        </div>
      </div>
    </div>
  );

  // ── Score Bar ──────────────────────────────────────────────────────────────
  const ScoreBar = () => {
    const barAv = n <= 6 ? 22 : n <= 8 ? 18 : 15;
    const barScore = n <= 6 ? 11 : n <= 8 ? 10 : 9;
    const showName = n <= 8;
    return (
      <div className="fixed top-0 left-0 right-0 z-40"
        style={{ background: 'rgba(3,7,18,0.98)', borderBottom: '1px solid rgba(201,168,76,.22)', height: 44 }}>
        <div className="h-full flex items-center gap-1.5 px-2 overflow-x-auto"
          style={{ scrollbarWidth: 'none' }}>
          {gameState.players.map(p => {
            const isMe = p.uid === user?.uid;
            const isTurn = p.isTurn;
            return (
              <div key={p.uid} className="shrink-0 flex flex-col items-center gap-0.5"
                style={{ opacity: p.isEliminated ? 0.4 : 1, transition: 'opacity .3s' }}>
                <div className="relative">
                  <div style={{
                    padding: isTurn ? 2 : 1, borderRadius: '50%',
                    background: isTurn ? 'rgba(201,168,76,0.35)' : 'transparent',
                    border: isTurn ? '1.5px solid #C9A84C' : `1.5px solid ${isMe ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.1)'}`,
                    boxShadow: isTurn ? '0 0 8px rgba(201,168,76,0.5)' : 'none',
                  }}>
                    <Av id={p.avatarId} name={p.displayName} frameId={(p as any).equippedFrame} size={barAv} />
                  </div>
                  {isTurn && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-black animate-pulse" style={{ background: '#C9A84C' }}/>}
                  {p.isEliminated && <div className="absolute inset-0 rounded-full bg-black/70 flex items-center justify-center"><span className="text-red-400 font-bold" style={{ fontSize: 8 }}>✕</span></div>}
                </div>
                <div className="flex flex-col items-center" style={{ lineHeight: 1 }}>
                  {showName && (
                    <span className="font-arabic truncate" style={{ fontSize: 6, color: isMe ? '#E8C97A' : 'rgba(255,255,255,0.5)', maxWidth: barAv + 10 }}>
                      {p.displayName}
                    </span>
                  )}
                  <span className="font-bold" style={{ fontSize: barScore, color: isTurn ? '#E8C97A' : isMe ? '#C9A84C' : 'rgba(255,255,255,0.7)' }}>
                    {p.cumulativeScore}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0E0905' }}>
      <RoomBackground />
      <ScoreBar />

      <div className={`flex-1 flex flex-col pt-11 pb-14 min-h-0 px-1 ${isMobile ? 'gap-1' : 'gap-2'}`} style={{ position: 'relative', zIndex: 1 }}>

        {/* ══ MOBILE: compact opponent strip ══ */}
        {isMobile && others.length > 0 && (
          <div className="shrink-0 flex items-stretch gap-1" style={{ padding: '3px 4px 4px', height: stripH, position: 'relative', zIndex: 20 }}>
            {others.map(p => (
              <CompactSeat key={p.uid} player={p}
                emoji={emojiMap[p.uid]} chatBubble={chatBubbleMap[p.uid] ?? null}
                isSpecialJ={isSpecialJ} selectedPos={selectedPos}
                onSelectForJ={(uid: string) => setJTargetUid(uid)} />
            ))}
          </div>
        )}

        {/* ══ DESKTOP ONLY: top row of opponents ══ */}
        {!isMobile && top.length > 0 && (
          <div className="shrink-0 flex justify-center gap-2 pt-0.5"
            style={{ marginBottom: n <= 6 ? 52 : n <= 8 ? 36 : 24 }}>
            {top.map(p => (
              <OpponentSeat key={p.uid} player={p} {...commonSeatProps}
                emoji={emojiMap[p.uid]} chatBubble={chatBubbleMap[p.uid] ?? null} />
            ))}
          </div>
        )}

        {/* ══ MIDDLE ROW: [left] table [right] ══ */}
        <div className="flex-1 flex items-center gap-1.5 min-h-0" style={{ position: 'relative', zIndex: 1 }}>

          {/* LEFT players (desktop only) */}
          {!isMobile && left.length > 0 && (
            <div className="flex flex-col gap-2 shrink-0 justify-center items-center">
              {left.map(p => (
                <OpponentSeat key={p.uid} player={p} {...commonSeatProps}
                  emoji={emojiMap[p.uid]} chatBubble={chatBubbleMap[p.uid] ?? null} />
              ))}
            </div>
          )}

          {/* ══ CIRCULAR TABLE ══ */}
          <div className="flex-1 flex items-center justify-center min-h-0 min-w-0 overflow-visible">
            <div style={{ position: 'relative', marginTop: isMobile ? 0 : 60 }}>
              {/* Wooden rim — sits behind the felt circle */}
              <div style={{
                position: 'absolute',
                inset: -22,
                borderRadius: '50%',
                background: `conic-gradient(from 10deg, ${theme.rim1} 0deg, ${theme.rim2} 50deg, ${theme.rim1} 90deg, ${theme.rim2} 130deg, ${theme.rim1} 180deg, ${theme.rim2} 220deg, ${theme.rim1} 270deg, ${theme.rim2} 310deg, ${theme.rim1} 360deg)`,
                boxShadow: '0 30px 90px rgba(0,0,0,0.9), 0 0 0 5px #0A1520, 0 0 0 7px rgba(201,168,76,0.15), inset 0 3px 8px rgba(201,168,76,0.05)',
                zIndex: 0,
              }}/>
              {/* Floor glow under table */}
              <div style={{
                position: 'absolute',
                inset: -80,
                borderRadius: '50%',
                background: 'radial-gradient(ellipse at 50% 50%, rgba(80,40,5,0.12) 0%, transparent 65%)',
                zIndex: -1,
                pointerEvents: 'none',
              }}/>
              {/* Chairs — desktop only */}
              {!isMobile && <ChairsRing radius={tSize / 2} />}
            <div
              ref={tableRef}
              className="relative"
              style={{
                width: isMobile ? Math.max(120, mobileTableSize) : 'min(650px, max(200px, 55vw))',
                height: isMobile ? Math.max(120, mobileTableSize) : 'min(650px, max(200px, 55vw))',
                borderRadius: '50%',
                background: `
                  radial-gradient(ellipse at 44% 30%, rgba(255,255,255,0.045) 0%, transparent 38%),
                  radial-gradient(ellipse at 58% 70%, rgba(0,0,0,0.3) 0%, transparent 35%),
                  radial-gradient(ellipse at 50% 50%, ${theme.c1} 0%, ${theme.c2} 45%, ${theme.c3} 100%)
                `,
                boxShadow: 'inset 0 0 70px rgba(0,0,0,0.6), inset 0 0 25px rgba(0,0,0,0.4)',
                zIndex: 1,
              }}
            >
              {/* CHECK watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 0 }}>
                <p className="font-display tracking-widest select-none" style={{ fontSize: isMobile ? 18 : 30, color: 'rgba(201,168,76,0.09)', letterSpacing: '0.3em' }}>CHECK</p>
              </div>
              {/* Inner ring */}
              <div className="absolute pointer-events-none" style={{ inset: '5%', borderRadius: '50%', border: '1px dashed rgba(201,168,76,.13)' }} />

              {/* Check called indicator — only when called */}
              {gameState.checkCallerId && (
                <div className="absolute top-2 left-0 right-0 flex justify-center pointer-events-none" style={{ zIndex: 22 }}>
                  <p className="text-gold font-arabic font-bold animate-pulse rounded-full px-3 py-0.5"
                    style={{ fontSize: 11, background: 'rgba(20,14,8,0.85)', border: '1px solid rgba(201,168,76,0.5)' }}>⚠ Check!</p>
                </div>
              )}

              {/* Circular deck + discard in center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative flex items-center justify-center">
                  {/* Circular deck ring */}
                  <CircleDeck
                    count={gameState.deckCount}
                    onClick={isMyTurn && !drawnCard && (gameState.phase === 'PLAYING' || gameState.phase === 'CHECK_CALLED') ? onDraw : undefined}
                    disabled={!isMyTurn || !!drawnCard || (gameState.phase !== 'PLAYING' && gameState.phase !== 'CHECK_CALLED')}
                  />
                  {/* Discard pile — absolute center */}
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-1"
                    style={{ pointerEvents: canTakeDiscard ? 'auto' : 'none', cursor: canTakeDiscard ? 'pointer' : 'default' }}
                    onClick={canTakeDiscard ? () => setDiscardSelected(s => !s) : undefined}
                  >
                    <PlayingCard
                      card={gameState.discardTop ? { ...gameState.discardTop, isRevealed: true } : null}
                      highlight={discardSelected ? 'select' : 'none'}
                      mini
                    />
                    {discardSelected && (
                      <p className="text-oasis font-arabic animate-pulse" style={{ fontSize: 9 }}>اختر كرت</p>
                    )}
                  </div>
                </div>

                {/* Special J step hint on table */}
                {isSpecialJ && selectedPos !== null && (
                  <p className="absolute bottom-8 text-oasis font-arabic animate-pulse text-center" style={{ fontSize: 10 }}>اختر كرت خصمك</p>
                )}
              </div>

              {/* Drawn card — direct child of table circle → always dead-center */}
              <AnimatePresence>
                {drawnCard && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 60,
                    pointerEvents: 'auto',
                  }}>
                    <motion.div
                      initial={{ opacity: 0, scale: .7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: .7 }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <PlayingCard card={{ ...drawnCard, isRevealed: true }} highlight="select" />
                      {isMyTurn && (
                        <button
                          onClick={onBurnDrawn}
                          style={{
                            background: '#C9A84C',
                            border: '2px solid #E8C97A',
                            borderRadius: 12,
                            padding: '8px 28px',
                            color: '#0D1B2A',
                            fontSize: 16,
                            fontFamily: 'inherit',
                            fontWeight: 800,
                            boxShadow: '0 0 16px rgba(201,168,76,0.5)',
                            cursor: 'pointer',
                            letterSpacing: 1,
                          }}
                        >
                          احرق
                        </button>
                      )}
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>{/* end table circle */}

            </div>{/* end position:relative wrapper */}
          </div>{/* end flex-1 table container */}

          {/* RIGHT players (desktop only) */}
          {!isMobile && right.length > 0 && (
            <div className="flex flex-col gap-2 shrink-0 justify-center items-center">
              {right.map(p => (
                <OpponentSeat key={p.uid} player={p} {...commonSeatProps}
                  emoji={emojiMap[p.uid]} chatBubble={chatBubbleMap[p.uid] ?? null} />
              ))}
            </div>
          )}
        </div>

        {/* ══ MY AREA: cards above, big box below ══ */}
        {me && (
          <div className="shrink-0 self-center flex flex-col items-center gap-1.5 pb-1"
            style={{ width: isMobile ? winW - 12 : 220, position: 'relative', zIndex: 5, marginTop: isMobile ? 2 : n <= 6 ? 100 : n <= 8 ? 70 : 50 }}>
            {/* My cards — 2×2 grid on mobile */}
            <div className={isMobile ? 'grid grid-cols-2 gap-1' : cardGridCols(me.cards.filter(Boolean).length)}>
              <AnimatePresence>
                {me.cards.map((c, i) => c !== null ? (
                  <motion.div key={`me-${i}`}
                    initial={{ opacity: 0, y: i % 2 === 0 ? -22 : 22, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    className="relative"
                  >
                    <PlayingCard
                      card={getCardForPos(me.cards, i)}
                      faceDown={!me.cards[i]?.isRevealed && !knownCards.has(i)}
                      highlight={myCardHighlight(i)}
                      onClick={() => onMyCardClick(i)}
                      small={!isMobile || !useMiniCards}
                      mini={isMobile && useMiniCards}
                      backId={cardBackId}
                    />
                    {swapHighlight?.pos === i && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.6 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        className="absolute pointer-events-none flex flex-col items-center"
                        style={{ left: '50%', top: -22, transform: 'translateX(-50%)', zIndex: 30 }}
                      >
                        <div className="rounded-full px-1.5 py-0.5 font-arabic font-bold animate-pulse"
                          style={{ background: '#E04030', color: '#fff', fontSize: 9, lineHeight: 1.2, boxShadow: '0 0 8px rgba(224,64,48,0.7)' }}>
                          بدّل J
                        </div>
                        <div style={{
                          width: 0, height: 0,
                          borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
                          borderTop: '6px solid #E04030', marginTop: -1,
                        }}/>
                      </motion.div>
                    )}
                  </motion.div>
                ) : null)}
              </AnimatePresence>
            </div>

            {/* Burn hint */}
            <AnimatePresence>
              {pendingBurnPos !== null && (
                <motion.div
                  key="burn-hint"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="flex items-center gap-2 rounded-xl border border-red-500/50 px-3 py-1.5"
                  style={{ background: 'rgba(80,10,5,.95)', backdropFilter: 'blur(8px)' }}
                >
                  <span className="text-red-300 font-arabic text-xs">🔥 اضغط مجدداً للحرق</span>
                  <button
                    onClick={() => setPendingBurnPos(null)}
                    className="text-white/40 hover:text-white/70 text-xs"
                    style={{ lineHeight: 1 }}
                  >✕</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* My player box + CHECK button side by side */}
            <div className="w-full flex items-center gap-2">
              <div className="flex-1 min-w-0 relative">
                <AnimatePresence>
                  {chatBubbleMap[me.uid] && (
                    <ChatBubble text={chatBubbleMap[me.uid]!.text} key={chatBubbleMap[me.uid]!.key} />
                  )}
                </AnimatePresence>
                <PlayerBox player={me} gameState={gameState} />
              </div>
              {!me?.isEliminated && (
                <div className="shrink-0 flex flex-col items-center gap-0.5">
                  <motion.button
                    whileHover={canCallCheck ? { scale: 1.08 } : {}}
                    whileTap={canCallCheck ? { scale: .92 } : {}}
                    disabled={!canCallCheck}
                    onClick={canCallCheck ? onCallCheck : undefined}
                    className={`px-3 py-2 rounded-xl border-2 font-bold transition-all ${
                      canCallCheck
                        ? 'border-gold text-gold bg-gold/15 hover:bg-gold/30 cursor-pointer'
                        : 'border-white/10 text-white/20 bg-transparent cursor-not-allowed'
                    }`}
                    style={{ fontSize: 12 }}
                  >CHECK</motion.button>
                  {lapsRemainingForCheck > 0 && (
                    <span className="font-arabic" style={{ fontSize: 9, color: 'rgba(201,168,76,0.55)' }}>
                      بعد {lapsRemainingForCheck} {lapsRemainingForCheck === 1 ? 'لفة' : 'لفات'}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* My emoji float */}
            <AnimatePresence>
              {emojiMap[me.uid] && (
                <motion.div key={emojiMap[me.uid]!} initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -64 }}
                  transition={{ duration: 1.5 }} className="fixed text-3xl pointer-events-none z-30" style={{ bottom: 90, left: '50%', transform: 'translateX(-50%)' }}>{emojiMap[me.uid]}</motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ══ ACTION BAR ══ */}
      <div className="fixed bottom-0 left-0 right-0 flex items-center justify-between border-t border-yellow-900/30"
        style={{ background: 'rgba(3,7,18,0.98)', height: isMobile ? 46 : 52, zIndex: 40, padding: isMobile ? '0 8px' : '0 12px' }}>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: .95 }}
          className={`relative px-4 py-1.5 rounded-xl border font-arabic text-sm transition-all
            ${chatOpen ? 'border-gold/60 text-gold bg-gold/12' : 'border-white/15 text-white/60 bg-white/5'}`}
          onClick={() => { setChatOpen(s => !s); setUnreadCount(0); }}>
          شات
          <AnimatePresence>
            {!chatOpen && unreadCount > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                className="absolute flex items-center justify-center rounded-full bg-red-500 text-white font-bold"
                style={{ top: -6, right: -6, minWidth: 17, height: 17, fontSize: 9, lineHeight: 1 }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: .92 }}
          className="px-4 py-1.5 rounded-xl border font-arabic text-sm transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(245,230,200,0.65)' }}
          onClick={() => setShowSettings(true)}>إعدادات</motion.button>
      </div>

      {/* ── Round/Lap badges — top-left of viewport, always visible ── */}
      <div className="fixed z-40 flex gap-1.5" style={{ top: isMobile ? 6 : 14, left: isMobile ? 6 : 14 }}>
        <div className="rounded-xl border border-gold/30 flex flex-col items-center px-2.5 py-1"
          style={{ background: 'rgba(20,14,8,.92)', backdropFilter: 'blur(8px)', minWidth: 44 }}>
          <span className="text-gold/50 font-arabic font-bold" style={{ fontSize: 9, lineHeight: 1 }}>راوند</span>
          <span className="text-gold font-bold" style={{ fontSize: 18, lineHeight: 1.1 }}>{gameState.roundNumber}</span>
        </div>
        <div className="rounded-xl border flex flex-col items-center px-2.5 py-1"
          style={{ background: 'rgba(20,14,8,.92)', backdropFilter: 'blur(8px)', minWidth: 44, borderColor: lapCount >= 4 ? 'rgba(80,200,120,0.5)' : 'rgba(201,168,76,0.3)' }}>
          <span className="font-arabic font-bold" style={{ fontSize: 9, lineHeight: 1, color: lapCount >= 4 ? 'rgba(122,224,138,0.7)' : 'rgba(201,168,76,0.5)' }}>لفة</span>
          <span className="font-bold" style={{ fontSize: 18, lineHeight: 1.1, color: lapCount >= 4 ? '#7AE08A' : '#E8C97A' }}>{lapCount}</span>
        </div>
      </div>

      {/* ── Bottom-left deck info panel (desktop only) ── */}
      {!isMobile && <div className="fixed z-40 flex flex-col items-center gap-1 rounded-xl border border-gold/30 px-4 py-3"
        style={{ bottom: 58, left: 8, background: 'rgba(20,14,8,.97)', backdropFilter: 'blur(10px)', minWidth: 72, boxShadow: '0 0 12px rgba(201,168,76,.10)' }}>
        <span className="text-gold/40 font-arabic" style={{ fontSize: 10 }}>كروت</span>
        <span className="text-sand/80 font-bold" style={{ fontSize: 24, lineHeight: 1 }}>{gameState.deckCount}</span>
      </div>}

      <ChatPanel roomId={roomId} open={chatOpen} onToggle={() => setChatOpen(s => !s)} />

      {/* ── K choice modal ── */}
      <AnimatePresence>
        {kingChoiceCards && gameState.phase === 'KING_CHOICE' && gameState.specialActionUid === user?.uid && (
          <motion.div
            key="king-choice"
            initial={{ opacity: 0, scale: .9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: .9 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(20,14,8,.92)', backdropFilter: 'blur(10px)' }}
          >
            <div className="rounded-2xl border border-gold/40 flex flex-col items-center gap-4"
              style={{ background: 'rgba(10,4,0,.98)', boxShadow: '0 0 40px rgba(201,168,76,.15)', width: 'min(92vw, 380px)', maxHeight: '88vh', overflowY: 'auto', padding: '20px 20px' }}>

              {/* Header */}
              <div className="flex flex-col items-center gap-1">
                <span style={{ fontSize: 32 }}>♚</span>
                <p className="text-gold font-bold font-arabic text-xl">سحبت الملك!</p>
                {kingSelectedIdx === null
                  ? <p className="text-sand/50 font-arabic text-sm">اختر كرت تبدله مع كرت من يدك، أو احرق الكل</p>
                  : <p className="text-sand/50 font-arabic text-sm">اختر الكرت اللي تبدله من يدك</p>
                }
              </div>

              {kingSelectedIdx === null ? (
                <>
                  {/* Step 1: show choice cards (2 or more if extra Ks were drawn) */}
                  <div className="flex flex-wrap gap-3 justify-center">
                    {kingChoiceCards.map((card, i) => (
                      <div key={i} className="flex flex-col items-center gap-2">
                        <motion.div
                          whileHover={{ scale: 1.08, y: -4 }}
                          whileTap={{ scale: .95 }}
                          onClick={() => setKingSelectedIdx(i)}
                          className="cursor-pointer"
                          style={{ filter: 'drop-shadow(0 4px 12px rgba(201,168,76,.35))' }}
                        >
                          <PlayingCard card={{ ...card, isRevealed: true }} highlight="select" />
                        </motion.div>
                        <span className="text-gold/60 font-arabic text-xs">اضغط للتبديل</span>
                      </div>
                    ))}
                  </div>

                  {/* Burn all button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: .95 }}
                    onClick={() => {
                      socket?.emit(SOCKET_EVENTS.GAME_KING_BURN, { gameId });
                      markActed();
                    }}
                    className="px-6 py-2.5 rounded-xl border border-red-500/50 text-red-300 font-arabic bg-red-900/20 hover:bg-red-900/35 transition-all"
                    style={{ fontSize: 14 }}
                  >
                    🔥 احرق الكل
                  </motion.button>
                </>
              ) : (
                <>
                  {/* Step 2: show selected card + hand grid */}
                  <div className="flex items-center gap-3 mb-1">
                    <div style={{ filter: 'drop-shadow(0 4px 12px rgba(201,168,76,.5))' }}>
                      <PlayingCard card={{ ...kingChoiceCards[kingSelectedIdx], isRevealed: true }} highlight="burn" />
                    </div>
                    <div className="text-gold font-arabic text-lg">↔</div>
                    <p className="text-sand/60 font-arabic text-sm">اختر من يدك</p>
                  </div>

                  {/* Player's hand cards */}
                  <div className="grid grid-cols-2 gap-2">
                    {me?.cards.map((c, i) => c !== null ? (
                      <motion.div
                        key={i}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: .92 }}
                        onClick={() => {
                          socket?.emit(SOCKET_EVENTS.GAME_KING_SWAP, { gameId, choiceIndex: kingSelectedIdx, handPosition: i });
                          markActed();
                        }}
                        className="cursor-pointer"
                        style={{ filter: 'drop-shadow(0 2px 8px rgba(80,200,120,.3))' }}
                      >
                        <PlayingCard
                          card={getCardForPos(me.cards, i)}
                          faceDown={!me.cards[i]?.isRevealed && !knownCards.has(i)}
                          highlight="select" backId={cardBackId}
                        />
                      </motion.div>
                    ) : null)}
                  </div>

                  {/* Back button */}
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    onClick={() => setKingSelectedIdx(null)}
                    className="text-sand/40 font-arabic text-xs hover:text-sand/60 transition-colors"
                  >
                    ← رجوع
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── J: swap banner ── */}
      <AnimatePresence>
        {isSpecialJ && (
          <motion.div
            key="special-j"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-12 left-0 right-0 z-50 flex justify-center pointer-events-none"
          >
            <div className="flex items-center gap-2 rounded-2xl border border-gold/60 px-5 py-2.5"
              style={{ background: 'rgba(30,10,0,0.97)', boxShadow: '0 0 24px rgba(201,168,76,.25)' }}>
              <span style={{ fontSize: 22 }}>J ♠</span>
              <p className="text-gold font-arabic font-bold" style={{ fontSize: 14 }}>
                {selectedPos === null ? 'أولاً: اختر ورقة من يدك' : 'الآن: اختر كرت من يد الخصم'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Red Q: peek own card prompt ── */}
      <AnimatePresence>
        {isSpecialQ && (
          <motion.div
            key="special-q"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-12 left-0 right-0 z-50 flex justify-center pointer-events-none"
          >
            <div className="flex items-center gap-2 rounded-2xl border border-gold/60 px-5 py-2.5"
              style={{ background: 'rgba(30,10,0,0.97)', boxShadow: '0 0 24px rgba(201,168,76,.25)' }}>
              <span style={{ fontSize: 22 }}>Q♥</span>
              <p className="text-gold font-arabic font-bold" style={{ fontSize: 14 }}>اضغط على أحد كروتك لتكشفه</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Round score board ── */}
      <AnimatePresence>
        {roundScoreData && (
          <motion.div
            key="round-scores"
            initial={{ opacity: 0, scale: .92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: .92 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(20,14,8,.88)', backdropFilter: 'blur(8px)' }}
          >
            <div className="rounded-2xl border border-gold/30 px-6 py-5 flex flex-col items-center gap-3"
              style={{ background: 'rgba(20,14,8,.97)', width: 'min(96vw, 360px)', maxHeight: '88vh', overflowY: 'auto' }}>
              <p className="text-gold font-bold font-arabic text-lg">نتيجة الجولة {roundScoreData.roundNumber}</p>
              {roundScoreData.checkPenalty && (
                <p className="text-red-300 font-arabic text-sm animate-pulse">
                  ⚠ الـ Checker ما كان الأقل — العقوبة مضاعفة!
                </p>
              )}
              <div className="w-full space-y-1.5">
                {gameState.players.map(p => {
                  const round = roundScoreData.scores?.[p.uid] ?? 0;
                  const total = roundScoreData.cumulative?.[p.uid] ?? p.cumulativeScore;
                  const isCaller = p.uid === roundScoreData.checkCallerId;
                  const isLowest = p.uid === roundScoreData.lowestUid;
                  return (
                    <div key={p.uid}
                      className="flex items-center gap-3 rounded-lg px-3 py-2"
                      style={{
                        background: isCaller ? 'rgba(201,168,76,.12)' : isLowest ? 'rgba(80,200,120,.10)' : 'rgba(255,255,255,.04)',
                        border: isCaller ? '1px solid rgba(201,168,76,.3)' : isLowest ? '1px solid rgba(80,200,120,.3)' : '1px solid transparent',
                      }}
                    >
                      <Av id={p.avatarId} name={p.displayName} frameId={(p as any).equippedFrame} size={28} />
                      <span className="flex-1 text-sand-light text-sm font-arabic truncate">{p.displayName}</span>
                      {isCaller && <span className="text-gold text-xs font-arabic">CHECK</span>}
                      {isLowest && !isCaller && <span className="text-green-400 text-xs font-arabic">الأقل ✓</span>}
                      <span className="text-red-300 font-bold text-sm" style={{ minWidth: 32, textAlign: 'right' }}>
                        {round > 0 ? `+${round}` : round === 0 ? '0' : round}
                      </span>
                      <span className="text-gold/80 font-bold text-sm" style={{ minWidth: 36, textAlign: 'right' }}>
                        {total}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-sand/30 font-arabic text-xs">الجولة التالية تبدأ تلقائياً...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showIntro && <IntroOverlay />}
        {showPeek && !showIntro && <PeekOverlay />}
        {showAfk && <AfkOverlay />}
        {showExitConfirm && <ExitOverlay />}
      </AnimatePresence>

      {/* ── J action: Step 1 — select opponent ── */}
      <AnimatePresence>
        {isSpecialJ && selectedPos !== null && jTargetUid === null && (
          <motion.div
            key="j-step1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col justify-end"
            style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="rounded-t-3xl flex flex-col gap-2"
              style={{ background: 'rgba(4,9,24,0.99)', border: '1px solid rgba(201,168,76,0.25)', padding: '18px 16px 36px', maxHeight: '70vh', overflowY: 'auto' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">♠</span>
                <div>
                  <p className="font-arabic font-bold text-gold text-base">J — مبادلة كرت</p>
                  <p className="font-arabic text-xs" style={{ color: 'rgba(245,230,200,0.4)' }}>اختر اللاعب اللي تبادل معه</p>
                </div>
              </div>
              {others.filter(p => !p.isEliminated).map(p => (
                <motion.button
                  key={p.uid}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setJTargetUid(p.uid)}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 w-full"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <Av id={p.avatarId} name={p.displayName} frameId={(p as any).equippedFrame} size={38} />
                  <div className="text-left">
                    <p className="font-arabic text-white text-sm font-bold">{p.displayName}</p>
                    <p style={{ fontSize: 11, color: 'rgba(201,168,76,0.6)' }}>{p.cumulativeScore} نقطة</p>
                  </div>
                  <div className="mr-auto text-gold text-lg">←</div>
                </motion.button>
              ))}
              <motion.button
                onClick={() => setSelectedPos(null)}
                className="text-sand/35 font-arabic text-xs mt-2 self-center hover:text-sand/60 transition-colors"
              >✕ إلغاء</motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── J action: Step 2 — select card from opponent ── */}
      <AnimatePresence>
        {isSpecialJ && jTargetUid !== null && (() => {
          const tgt = others.find(p => p.uid === jTargetUid);
          if (!tgt) return null;
          return (
            <motion.div
              key="j-step2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex flex-col justify-end"
              style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                className="rounded-t-3xl flex flex-col items-center gap-4"
                style={{ background: 'rgba(4,9,24,0.99)', border: '1px solid rgba(201,168,76,0.25)', padding: '20px 16px 40px' }}
              >
                <div className="flex items-center gap-3 self-start">
                  <Av id={tgt.avatarId} name={tgt.displayName} frameId={(tgt as any).equippedFrame} size={38} />
                  <div>
                    <p className="font-arabic font-bold text-gold">{tgt.displayName}</p>
                    <p className="font-arabic text-xs" style={{ color: 'rgba(245,230,200,0.4)' }}>اختر الكرت اللي تبادله</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {tgt.cards.map((c: any, i: number) => c !== null ? (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.08, y: -4 }}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => {
                        onSpecialSwap(jTargetUid, i);
                        setJTargetUid(null);
                      }}
                      className="cursor-pointer"
                      style={{ filter: 'drop-shadow(0 4px 12px rgba(80,200,120,0.3))' }}
                    >
                      <PlayingCard card={c} faceDown={!c?.isRevealed} small highlight="burn" />
                    </motion.div>
                  ) : null)}
                </div>
                <motion.button
                  onClick={() => setJTargetUid(null)}
                  className="text-sand/40 font-arabic text-xs hover:text-sand/65 transition-colors"
                >← رجوع لاختيار لاعب آخر</motion.button>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── Settings Panel ── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            key="settings-panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col justify-end"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="rounded-t-3xl flex flex-col gap-4"
              style={{ background: 'rgba(20,14,8,0.98)', border: '1px solid rgba(201,168,76,0.2)', padding: '20px 20px 32px', boxShadow: '0 -8px 40px rgba(0,0,0,0.8)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-arabic font-bold text-lg" style={{ color: '#E8C97A' }}>الإعدادات</h3>
                <button onClick={() => setShowSettings(false)} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 22, lineHeight: 1 }}>✕</button>
              </div>

              {/* Mute toggle */}
              <div className="flex items-center justify-between rounded-2xl px-4 py-3.5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="font-arabic text-sm" style={{ color: 'rgba(245,230,200,0.75)' }}>
                  {soundOn ? 'الصوت مفعّل' : 'الصوت معطّل'}
                </span>
                <button
                  onClick={() => { const n = !soundOn; soundService.setEnabled(n); setSoundOn(n); }}
                  style={{
                    width: 50, height: 28, borderRadius: 14, position: 'relative',
                    background: soundOn ? '#C9A84C' : 'rgba(255,255,255,0.15)',
                    border: 'none', cursor: 'pointer', transition: 'background 0.25s',
                  }}>
                  <div style={{
                    position: 'absolute', top: 4, width: 20, height: 20, borderRadius: '50%',
                    background: 'white', transition: 'left 0.25s',
                    left: soundOn ? 26 : 4,
                  }} />
                </button>
              </div>

              {/* Volume slider */}
              <div className="flex flex-col gap-3 rounded-2xl px-4 py-3.5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', opacity: soundOn ? 1 : 0.35 }}>
                <div className="flex items-center justify-between">
                  <span className="font-arabic text-sm" style={{ color: 'rgba(245,230,200,0.75)' }}>مستوى الصوت</span>
                  <span className="font-bold font-mono text-sm" style={{ color: '#C9A84C' }}>{Math.round(volume * 100)}%</span>
                </div>
                <input type="range" min={0} max={100} value={Math.round(volume * 100)}
                  disabled={!soundOn}
                  onChange={e => { const v = Number(e.target.value) / 100; soundService.setVolume(v); setVolumeState(v); }}
                  className="w-full" style={{ accentColor: '#C9A84C', height: 4 }} />
                <div className="flex justify-between font-arabic" style={{ fontSize: 10, color: 'rgba(245,230,200,0.25)' }}>
                  <span>صامت</span><span>أقصى</span>
                </div>
              </div>

              {/* Exit */}
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => { setShowSettings(false); setShowExitConfirm(true); }}
                className="w-full py-3.5 rounded-2xl font-arabic font-bold border"
                style={{ background: 'rgba(196,92,58,0.10)', borderColor: 'rgba(196,92,58,0.4)', color: '#E07040', fontSize: 15 }}>
                الخروج من اللعبة
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {gameOverData && (
        <GameOverModal open={true} winnerId={gameOverData.winnerId}
          finalScores={gameOverData.finalScores} players={gameState.players}
          currentUid={user?.uid}
          onPlayAgain={() => navigate('/lobby/check')} />
      )}
    </div>
  );
}
