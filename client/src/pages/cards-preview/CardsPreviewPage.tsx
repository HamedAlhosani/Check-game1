/**
 * Card design preview — visit /cards-preview to inspect the proposed
 * Emirati-themed custom card art before it's wired into the live game.
 */
import { useState } from 'react';

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

const SUIT_GLYPH: Record<Suit, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function isRed(s: Suit): boolean { return s === 'hearts' || s === 'diamonds'; }

function labelFor(rank: Rank, suit: Suit): string {
  if (rank === 'A') return '1';
  if (rank === '10' && isRed(suit)) return '0';
  if (rank === 'J') return '11';
  if (rank === 'Q') return '12';
  if (rank === 'K') return '13';
  return rank;
}

function specialOf(rank: Rank, suit: Suit): 'K' | 'J' | 'Q_RED' | 'TEN_RED' | null {
  if (rank === 'K') return 'K';
  if (rank === 'J') return 'J';
  if (rank === 'Q' && isRed(suit)) return 'Q_RED';
  if (rank === '10' && isRed(suit)) return 'TEN_RED';
  return null;
}

// ─── Polished SVG illustrations ─────────────────────────────────────────────

function PalmTree({ cx, cy, scale = 1, color }: { cx: number; cy: number; scale?: number; color: string }) {
  // Smooth fronds with gradient feel — kept this style because the user liked it.
  const trunkColor = '#6B3A14';
  const dy = 14 * scale;
  return (
    <g transform={`translate(${cx} ${cy})`}>
      {/* Trunk with curve */}
      <path d={`M -${1.2 * scale} ${dy} Q 0 ${dy / 2} ${0.6 * scale} 0`}
        stroke={trunkColor} strokeWidth={2 * scale} fill="none" strokeLinecap="round"/>
      {/* Coconuts cluster */}
      <circle cx={-1.5 * scale} cy={-0.5} r={1.2 * scale} fill="#5A3010"/>
      <circle cx={1.5 * scale} cy={0} r={1.2 * scale} fill="#5A3010"/>
      <circle cx={0} cy={-1.5} r={1.2 * scale} fill="#5A3010"/>
      {/* Fronds — 7 leaves arranged in arc */}
      {Array.from({ length: 7 }).map((_, i) => {
        const ang = -Math.PI + (i / 6) * Math.PI;     // 0..π flipped to up
        const x2 = Math.cos(ang) * 9 * scale;
        const y2 = Math.sin(ang) * 6 * scale - 2;
        // Add a midpoint to give each leaf a natural curve
        const mx = (x2 / 2) + Math.sin(ang) * 1.5 * scale;
        const my = (y2 / 2) + Math.cos(ang) * 1.5 * scale;
        return (
          <g key={i}>
            <path d={`M 0 -2 Q ${mx} ${my} ${x2} ${y2}`}
              stroke={color} strokeWidth={1.4 * scale} fill="none" strokeLinecap="round"/>
            {/* Tiny pinnules */}
            <circle cx={x2} cy={y2} r={0.7 * scale} fill={color}/>
          </g>
        );
      })}
    </g>
  );
}

function Falcon({ cx, cy, scale = 1, color }: { cx: number; cy: number; scale?: number; color: string }) {
  // Refined falcon in flight pose
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
      {/* Body */}
      <ellipse cx={0} cy={2} rx={9} ry={4.5} fill={color}/>
      {/* Head */}
      <circle cx={9} cy={-2} r={4} fill={color}/>
      {/* Beak */}
      <path d="M 12 -3 L 17 -1.5 L 12.5 -0.5 Z" fill="#C9A84C"/>
      {/* Eye */}
      <circle cx={10} cy={-3} r={1} fill="#fff"/>
      <circle cx={10.3} cy={-3} r={0.5} fill="#000"/>
      {/* Left wing — outstretched up */}
      <path d="M -3 -1 Q -10 -10 -18 -8 Q -14 -5 -8 -2 Z" fill={color}/>
      {/* Right wing — outstretched up */}
      <path d="M 3 -1 Q 0 -8 -2 -10 Q 1 -7 5 -3 Z" fill={color} opacity={0.85}/>
      {/* Tail feathers */}
      <path d="M -8 4 L -14 8 L -10 5 L -14 6 L -9 3 Z" fill={color}/>
      {/* Talons */}
      <path d="M -2 6 L -2 9 M 2 6 L 2 9" stroke="#C9A84C" strokeWidth={0.8}/>
    </g>
  );
}

function Pearl({ cx, cy, r, color = '#F0EAD6' }: any) {
  return (
    <g>
      <defs>
        <radialGradient id={`pearl-${cx}-${cy}`} cx="35%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#FFFFFF"/>
          <stop offset="40%" stopColor={color}/>
          <stop offset="100%" stopColor="#A89D7B"/>
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={`url(#pearl-${cx}-${cy})`}/>
      <circle cx={cx - r * 0.35} cy={cy - r * 0.4} r={r * 0.25} fill="#FFFFFF" opacity={0.85}/>
    </g>
  );
}

// 5-pointed star
function Star({ cx, cy, r, fill, opacity = 1 }: any) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${cx + Math.cos(a) * rad},${cy + Math.sin(a) * rad}`);
  }
  return <polygon points={pts.join(' ')} fill={fill} opacity={opacity}/>;
}

// Refined 8-point Islamic star (rosette)
function IslamicStar({ cx, cy, r, color }: any) {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI / 8) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${cx + Math.cos(a) * rad},${cy + Math.sin(a) * rad}`);
  }
  return (
    <g>
      <polygon points={pts.join(' ')} fill={color} opacity={0.18}/>
      <polygon points={pts.join(' ')} fill="none" stroke={color} strokeWidth={1.2}/>
      {/* inner rosette */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (Math.PI / 4) * i - Math.PI / 2;
        const x = cx + Math.cos(a) * r * 0.5;
        const y = cy + Math.sin(a) * r * 0.5;
        return <circle key={i} cx={x} cy={y} r={r * 0.12} fill={color}/>;
      })}
      <circle cx={cx} cy={cy} r={r * 0.18} fill={color}/>
    </g>
  );
}

function Arch({ cx, cy, w, h, color, fill = false }: any) {
  return (
    <path d={`M ${cx - w / 2} ${cy + h / 2}
              L ${cx - w / 2} ${cy - h / 6}
              Q ${cx} ${cy - h * 0.85} ${cx + w / 2} ${cy - h / 6}
              L ${cx + w / 2} ${cy + h / 2} Z`}
      fill={fill ? color : 'none'} fillOpacity={fill ? 0.18 : 0}
      stroke={color} strokeWidth={1.4} strokeLinejoin="round"/>
  );
}

// ─── Single card ────────────────────────────────────────────────────────────
function CardSVG({ rank, suit, w = 140 }: { rank: Rank; suit: Suit; w?: number }) {
  const h = w * 1.5;
  const red = isRed(suit);
  const ink = red ? '#9B1C1C' : '#0E1B2C';
  const accent = '#C9A84C';
  const accent2 = red ? '#E04030' : '#1B6B3F';
  const label = labelFor(rank, suit);
  const special = specialOf(rank, suit);

  return (
    <svg width={w} height={h} viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 5px 14px rgba(0,0,0,0.55))', borderRadius: 9 }}>
      <defs>
        <linearGradient id={`bg-${rank}-${suit}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFCF2"/>
          <stop offset="100%" stopColor="#F2E4BE"/>
        </linearGradient>
        <linearGradient id={`sky-${rank}-${suit}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE08A"/>
          <stop offset="100%" stopColor="#F2C065"/>
        </linearGradient>
        <linearGradient id={`dune-${rank}-${suit}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E0B26A"/>
          <stop offset="100%" stopColor="#A07030"/>
        </linearGradient>
      </defs>

      {/* Body */}
      <rect x="0" y="0" width="100" height="150" rx="8" fill={`url(#bg-${rank}-${suit})`} stroke={accent} strokeWidth="1"/>
      {/* Inner gold frame */}
      <rect x="3.5" y="3.5" width="93" height="143" rx="6" fill="none" stroke={accent} strokeWidth="0.5" opacity="0.55"/>
      {/* Corner ornaments — small diamonds */}
      <polygon points="9,8 11,10 9,12 7,10" fill={accent} opacity="0.5"/>
      <polygon points="91,8 93,10 91,12 89,10" fill={accent} opacity="0.5"/>
      <polygon points="9,138 11,140 9,142 7,140" fill={accent} opacity="0.5"/>
      <polygon points="91,138 93,140 91,142 89,140" fill={accent} opacity="0.5"/>

      {/* Rank corner (top-left) */}
      <g>
        <text x="14" y="22" fontFamily="Georgia, serif" fontWeight="800"
          fontSize={label.length > 1 ? 12 : 16} fill={ink} textAnchor="middle">{label}</text>
        <text x="14" y="34" fontSize="12" fill={ink} textAnchor="middle">{SUIT_GLYPH[suit]}</text>
      </g>
      {/* Rank corner (bottom-right, rotated) */}
      <g transform="rotate(180 50 75)">
        <text x="14" y="22" fontFamily="Georgia, serif" fontWeight="800"
          fontSize={label.length > 1 ? 12 : 16} fill={ink} textAnchor="middle">{label}</text>
        <text x="14" y="34" fontSize="12" fill={ink} textAnchor="middle">{SUIT_GLYPH[suit]}</text>
      </g>

      {/* ─── CENTER ARTWORK ─── */}
      {rank === 'A' && (
        <g>
          <Falcon cx={50} cy={62} scale={2.2} color={ink}/>
        </g>
      )}
      {rank === '2' && (
        <g>
          <PalmTree cx={36} cy={88} scale={2.0} color={accent2}/>
          <PalmTree cx={64} cy={88} scale={2.0} color={accent2}/>
        </g>
      )}
      {rank === '3' && (
        <g>
          {/* Sun */}
          <circle cx={50} cy={32} r={5} fill={accent}/>
          {/* 3 palms */}
          <PalmTree cx={28} cy={84} scale={1.7} color={accent2}/>
          <PalmTree cx={50} cy={80} scale={2.0} color={accent2}/>
          <PalmTree cx={72} cy={84} scale={1.7} color={accent2}/>
          {/* Oasis pool — ellipse with reflection lines */}
          <ellipse cx={50} cy={94} rx={30} ry={5} fill="#5BB1E0" opacity={0.6}/>
          <ellipse cx={50} cy={94} rx={26} ry={3} fill="#90D8FF" opacity={0.5}/>
          <line x1={36} y1={94} x2={42} y2={94} stroke="#fff" strokeWidth={0.6} opacity={0.7}/>
          <line x1={56} y1={95} x2={64} y2={95} stroke="#fff" strokeWidth={0.6} opacity={0.7}/>
        </g>
      )}
      {rank === '4' && (
        <g>
          {/* Sky */}
          <rect x={6} y={40} width={88} height={28} rx={4} fill={`url(#sky-${rank}-${suit})`} opacity={0.45}/>
          {/* Sun */}
          <circle cx={70} cy={50} r={6} fill={accent}/>
          {/* 4 layered dunes */}
          <path d="M 6 96 Q 30 70 50 80 Q 72 90 94 75 L 94 96 Z" fill={`url(#dune-${rank}-${suit})`} opacity={0.55}/>
          <path d="M 6 100 Q 24 78 44 88 Q 64 100 94 82 L 94 100 Z" fill={`url(#dune-${rank}-${suit})`} opacity={0.75}/>
          <path d="M 6 106 Q 30 90 60 96 Q 80 100 94 92 L 94 106 Z" fill={`url(#dune-${rank}-${suit})`}/>
          <path d="M 6 112 Q 50 96 94 108 L 94 112 Z" fill={ink} opacity={0.85}/>
        </g>
      )}
      {rank === '5' && (
        <g>
          {/* Big star with inner glow */}
          <Star cx={50} cy={68} r={28} fill={accent} opacity={0.25}/>
          <Star cx={50} cy={68} r={22} fill={accent2}/>
          <Star cx={50} cy={68} r={11} fill={accent}/>
          <Star cx={50} cy={68} r={5} fill="#FFF" opacity={0.6}/>
        </g>
      )}
      {rank === '6' && (
        <g>
          {/* 6 pearls in a flower pattern with gold stem ring */}
          <circle cx={50} cy={68} r={22} fill="none" stroke={accent} strokeWidth={0.6} opacity={0.4}/>
          {[
            [50, 46], [70, 58], [70, 78], [50, 90], [30, 78], [30, 58],
          ].map(([cx, cy], i) => <Pearl key={i} cx={cx} cy={cy} r={6}/>)}
          <Pearl cx={50} cy={68} r={4.5}/>
        </g>
      )}
      {rank === '7' && (
        <g>
          {/* Pleiades — 7 stars with constellation lines */}
          {(() => {
            const dots: [number, number, number][] = [
              [38, 40, 4],
              [56, 38, 5],
              [68, 50, 4],
              [50, 54, 3.5],
              [40, 60, 4],
              [60, 70, 5],
              [44, 76, 4],
            ];
            return (
              <g>
                {/* lines connecting */}
                <path d="M 38 40 L 56 38 L 68 50 L 60 70 L 44 76 L 40 60 L 38 40 M 50 54 L 56 38 M 50 54 L 60 70" stroke={accent} strokeWidth={0.5} fill="none" opacity={0.5}/>
                {dots.map(([cx, cy, r], i) => <Star key={i} cx={cx} cy={cy} r={r} fill={accent2}/>)}
              </g>
            );
          })()}
        </g>
      )}
      {rank === '8' && (
        <g>
          <IslamicStar cx={50} cy={68} r={28} color={accent2}/>
        </g>
      )}
      {rank === '9' && (
        <g>
          {/* Mosque-like 3 main arches with 6 small ones (2 rows below) */}
          <Arch cx={50} cy={48} w={20} h={28} color={accent2} fill={true}/>
          <Arch cx={28} cy={56} w={14} h={20} color={accent2} fill={true}/>
          <Arch cx={72} cy={56} w={14} h={20} color={accent2} fill={true}/>
          {[28, 50, 72].map(cx => <Arch key={`b1-${cx}`} cx={cx} cy={84} w={11} h={14} color={accent2}/>)}
          {[34, 50, 66].map(cx => <Arch key={`b2-${cx}`} cx={cx} cy={102} w={9} h={10} color={accent2} fill={true}/>)}
        </g>
      )}
      {rank === '10' && !red && (
        <g>
          {/* Black 10 — desert at sunset, with sun + dunes + camel silhouette */}
          <rect x={6} y={36} width={88} height={36} rx={4} fill={`url(#sky-${rank}-${suit})`} opacity={0.7}/>
          <circle cx={70} cy={48} r={8} fill={accent2}/>
          <circle cx={70} cy={48} r={12} fill={accent} opacity={0.25}/>
          <path d="M 6 96 Q 30 76 56 86 Q 74 92 94 78 L 94 96 Z" fill={`url(#dune-${rank}-${suit})`} opacity={0.8}/>
          <path d="M 6 108 Q 36 88 70 98 Q 84 100 94 94 L 94 108 Z" fill={ink} opacity={0.85}/>
          {/* Small camel silhouette on the dune */}
          <g transform="translate(36 92)">
            <path d="M -7 0 Q -5 -3 -3 -2 Q -1 -5 1 -2 Q 4 -3 6 0 L 6 2 L -7 2 Z M 6 0 Q 8 -3 10 -5 L 9 -2 L 7 1" fill={ink}/>
            <line x1={-5} y1={2} x2={-5} y2={5} stroke={ink} strokeWidth={0.7}/>
            <line x1={-2} y1={2} x2={-2} y2={5} stroke={ink} strokeWidth={0.7}/>
            <line x1={2} y1={2} x2={2} y2={5} stroke={ink} strokeWidth={0.7}/>
            <line x1={5} y1={2} x2={5} y2={5} stroke={ink} strokeWidth={0.7}/>
          </g>
        </g>
      )}
      {special === 'TEN_RED' && (
        <g>
          {/* Lucky 0 — shooting star + sparkles + big 0 */}
          <defs>
            <linearGradient id={`sparkle-${suit}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFE675"/>
              <stop offset="100%" stopColor="#E04030"/>
            </linearGradient>
          </defs>
          {/* shooting star tail */}
          <path d="M 78 30 L 32 80" stroke={`url(#sparkle-${suit})`} strokeWidth={2.4} strokeLinecap="round" opacity={0.85}/>
          <Star cx={78} cy={30} r={9} fill={accent}/>
          <Star cx={78} cy={30} r={4} fill="#FFF" opacity={0.85}/>
          {/* sparkles */}
          <Star cx={28} cy={48} r={3} fill={accent2}/>
          <Star cx={66} cy={62} r={2.5} fill={accent}/>
          <Star cx={42} cy={42} r={2} fill={accent2} opacity={0.7}/>
          {/* Big 0 */}
          <circle cx={50} cy={88} r={18} fill="none" stroke={ink} strokeWidth={3.5}/>
          <circle cx={50} cy={88} r={14} fill="none" stroke={accent2} strokeWidth={1.2} opacity={0.6}/>
          <text x="50" y="116" textAnchor="middle" fontFamily="'Tajawal', 'Cairo', sans-serif" fontWeight="800" fontSize="9" fill={accent2}>حظك حلو ✨</text>
        </g>
      )}
      {special === 'J' && (
        <g>
          {/* Two cards swapping with rotation arrows */}
          <g transform="translate(50 60)">
            {/* Card behind */}
            <rect x="-22" y="-18" width="22" height="32" rx="3" fill={ink} stroke={accent} strokeWidth="0.8" transform="rotate(-12)"/>
            <text x={-11} y={-8} textAnchor="middle" fontSize="10" fill={accent} fontFamily="Georgia, serif" fontWeight="800" transform="rotate(-12 -11 -8)">A</text>
            {/* Card front */}
            <rect x="0" y="-18" width="22" height="32" rx="3" fill={accent2} stroke={accent} strokeWidth="0.8" transform="rotate(12)"/>
            <text x={11} y={-3} textAnchor="middle" fontSize="10" fill="#FFF" fontFamily="Georgia, serif" fontWeight="800" transform="rotate(12 11 -3)">K</text>
            {/* swap arrows in middle */}
            <g>
              <path d="M -8 -4 L -4 -4 L -4 -8 L 4 -2 L -4 4 L -4 0 L -8 0 Z" fill={accent}/>
              <path d="M 8 8 L 4 8 L 4 12 L -4 6 L 4 0 L 4 4 L 8 4 Z" fill={accent}/>
            </g>
          </g>
          <text x="50" y="108" textAnchor="middle" fontFamily="'Tajawal', 'Cairo', sans-serif" fontWeight="800" fontSize="11" fill={ink}>بدّل كرت</text>
        </g>
      )}
      {special === 'Q_RED' && (
        <g>
          {/* Refined eye with kohl + lashes + iris pattern */}
          <g transform="translate(50 60)">
            {/* eye outline */}
            <path d="M -24 0 Q 0 -16 24 0 Q 0 16 -24 0 Z" fill="#FFF" stroke={ink} strokeWidth={1.5}/>
            {/* kohl wings */}
            <path d="M -24 0 Q -28 -2 -32 -6 L -28 -2 L -26 1" stroke={ink} strokeWidth={1.6} fill="none" strokeLinecap="round"/>
            <path d="M 24 0 Q 28 -2 32 -6 L 28 -2 L 26 1" stroke={ink} strokeWidth={1.6} fill="none" strokeLinecap="round"/>
            {/* lashes */}
            {[-12, -6, 0, 6, 12].map((x, i) => (
              <line key={i} x1={x} y1={-12} x2={x * 1.1} y2={-15} stroke={ink} strokeWidth={0.8} strokeLinecap="round"/>
            ))}
            {/* iris */}
            <circle cx={0} cy={0} r={9} fill={accent2}/>
            <circle cx={0} cy={0} r={5} fill={ink}/>
            {/* highlight */}
            <circle cx={-2} cy={-2} r={1.6} fill="#FFF"/>
            <circle cx={2} cy={2} r={0.8} fill="#FFF" opacity={0.6}/>
            {/* small card peeking from above */}
            <rect x={-8} y={-26} width={16} height={10} rx={1.5} fill="#FFF" stroke={accent} strokeWidth={0.7}/>
            <text x={0} y={-19} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="6" fill={ink}>?</text>
          </g>
          <text x="50" y="108" textAnchor="middle" fontFamily="'Tajawal', 'Cairo', sans-serif" fontWeight="800" fontSize="11" fill={ink}>اكشف كرت</text>
        </g>
      )}
      {rank === 'Q' && !red && (
        <g>
          {/* 12-point compass — clean and precise, no text below */}
          <g transform="translate(50 68)">
            {/* outer ring */}
            <circle r={28} fill="none" stroke={accent} strokeWidth={1.2} opacity={0.5}/>
            <circle r={22} fill="none" stroke={accent} strokeWidth={0.6} opacity={0.4}/>
            {/* 12 compass spokes — alternating long/short */}
            {Array.from({ length: 12 }).map((_, i) => {
              const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
              const long = i % 3 === 0;
              const r2 = long ? 28 : 22;
              return <line key={i} x1={Math.cos(a) * 8} y1={Math.sin(a) * 8} x2={Math.cos(a) * r2} y2={Math.sin(a) * r2} stroke={accent} strokeWidth={long ? 1.5 : 0.8} opacity={0.85}/>;
            })}
            {/* central compass rose — 4 cardinal arrows */}
            <polygon points="0,-22 4,0 0,22 -4,0" fill={ink}/>
            <polygon points="-22,0 0,4 22,0 0,-4" fill={accent2}/>
            {/* center hub */}
            <circle r={5} fill={ink} stroke={accent} strokeWidth={1.2}/>
          </g>
        </g>
      )}
      {special === 'K' && (
        <g>
          {/* Refined crown + 2 cards */}
          <g transform="translate(50 50)">
            {/* crown body with 5 peaks */}
            <path d="M -16 4 L -16 -2 L -10 -10 L -6 -2 L 0 -14 L 6 -2 L 10 -10 L 16 -2 L 16 4 Z" fill={accent} stroke={ink} strokeWidth={0.9} strokeLinejoin="round"/>
            {/* base bar with gem inlays */}
            <rect x={-16} y={4} width={32} height={4.5} fill={accent} stroke={ink} strokeWidth={0.9}/>
            {/* gems on the base */}
            <circle cx={-10} cy={6.2} r={1.2} fill={accent2}/>
            <circle cx={0} cy={6.2} r={1.6} fill="#3A6B95"/>
            <circle cx={10} cy={6.2} r={1.2} fill={accent2}/>
            {/* peak gems */}
            <circle cx={0} cy={-12} r={1.5} fill={accent2}/>
            <circle cx={-10} cy={-9} r={1} fill="#3A6B95"/>
            <circle cx={10} cy={-9} r={1} fill="#3A6B95"/>
          </g>
          {/* Two drawn cards with deck behind */}
          <g transform="translate(50 86)">
            {/* deck shadow */}
            <rect x={-10} y={-2} width={20} height={28} rx={2} fill={ink} opacity={0.18}/>
            {/* card 1 */}
            <rect x="-22" y="-12" width="20" height="28" rx="2.5" fill="#FFF" stroke={ink} strokeWidth={0.9} transform="rotate(-14)"/>
            <text x={-12} y={2} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="9" fill={ink} transform="rotate(-14 -12 2)">A</text>
            {/* card 2 */}
            <rect x="2" y="-12" width="20" height="28" rx="2.5" fill="#FFF" stroke={ink} strokeWidth={0.9} transform="rotate(14)"/>
            <text x={12} y={2} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="9" fill={ink} transform="rotate(14 12 2)">K</text>
            {/* badge with 2 */}
            <g transform="translate(0 22)">
              <circle r={6.5} fill={accent2} stroke="#FFF" strokeWidth={1}/>
              <text y={2.4} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="900" fontSize="9" fill="#FFF">2</text>
            </g>
          </g>
          <text x="50" y="124" textAnchor="middle" fontFamily="'Tajawal', 'Cairo', sans-serif" fontWeight="800" fontSize="10" fill={ink}>اسحب كرتين</text>
        </g>
      )}

      {/* CHECK brand wordmark — bottom-center */}
      <g>
        <rect x="32" y="135" width="36" height="9" rx="4.5" fill={ink} opacity="0.85"/>
        <text x="50" y="141.5" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="6" letterSpacing="2" fill={accent}>CHECK</text>
      </g>
    </svg>
  );
}

export function CardsPreviewPage() {
  const [size, setSize] = useState(150);
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #1A1408 0%, #0E0905 100%)', padding: '24px 16px 60px' }}>
      <div className="max-w-5xl mx-auto" dir="rtl">
        <h1 className="font-arabic font-bold mb-2" style={{ fontSize: 28, color: '#E8C97A', textAlign: 'center' }}>
          🃏 معاينة أوراق Check الإماراتية
        </h1>
        <p className="font-arabic text-center mb-6" style={{ fontSize: 13, color: 'rgba(245,230,200,0.55)' }}>
          الإصدار الثاني — رسوم منقّحة، بدون نص على الأرقام
        </p>

        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="font-arabic" style={{ color: 'rgba(245,230,200,0.55)', fontSize: 13 }}>الحجم</span>
          <input type="range" min={110} max={220} value={size}
            onChange={e => setSize(Number(e.target.value))}
            style={{ accentColor: '#C9A84C', width: 240 }}/>
          <span className="font-mono" style={{ color: '#E8C97A', fontSize: 13 }}>{size}px</span>
        </div>

        {SUITS.map(suit => (
          <section key={suit} className="mb-8">
            <h2 className="font-arabic font-bold mb-3 px-2" style={{
              fontSize: 18, color: isRed(suit) ? '#FF7B7B' : '#E8C97A',
              borderInlineStart: `4px solid ${isRed(suit) ? '#B91C1C' : '#C9A84C'}`,
              paddingInlineStart: 10,
            }}>
              {SUIT_GLYPH[suit]} {suit === 'hearts' ? 'القلوب'
                : suit === 'diamonds' ? 'الديناري'
                : suit === 'clubs' ? 'السباتي'
                : 'البستوني'}
            </h2>
            <div className="flex flex-wrap gap-3 justify-center">
              {RANKS.map(rank => (
                <CardSVG key={`${rank}-${suit}`} rank={rank} suit={suit} w={size}/>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
