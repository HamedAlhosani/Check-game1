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

// Tagline tucked under the centerpiece
function taglineFor(rank: Rank, suit: Suit): string {
  if (rank === 'A')                       return 'الصقر';
  if (rank === '2')                       return 'النخلتين';
  if (rank === '3')                       return 'الواحة';
  if (rank === '4')                       return 'الكثبان';
  if (rank === '5')                       return 'النجمة';
  if (rank === '6')                       return 'اللؤلؤ';
  if (rank === '7')                       return 'الثريا';
  if (rank === '8')                       return 'النجمة الثمانية';
  if (rank === '9')                       return 'القناطر';
  if (rank === '10' && isRed(suit))       return 'حظك حلو';
  if (rank === '10')                      return 'الصحراء';
  if (rank === 'J')                       return 'بدّل كرت';
  if (rank === 'Q' && isRed(suit))        return 'اكشف كرت';
  if (rank === 'Q')                       return 'الاثنا عشر';
  if (rank === 'K')                       return 'اسحب كرتين';
  return '';
}

// ─── Reusable SVG primitives ────────────────────────────────────────────────
function Star({ cx, cy, r, fill, opacity = 1 }: { cx: number; cy: number; r: number; fill: string; opacity?: number }) {
  // 5-point star
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.42;
    pts.push(`${cx + Math.cos(a) * rad},${cy + Math.sin(a) * rad}`);
  }
  return <polygon points={pts.join(' ')} fill={fill} opacity={opacity}/>;
}

function EightStar({ cx, cy, r, stroke, fill, opacity = 1 }: any) {
  // 8-point Islamic star (two squares rotated 45°)
  return (
    <g opacity={opacity}>
      <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill={fill} stroke={stroke} strokeWidth={0.6}/>
      <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill={fill} stroke={stroke} strokeWidth={0.6} transform={`rotate(45 ${cx} ${cy})`}/>
    </g>
  );
}

function PalmTree({ cx, cy, scale = 1, color = '#3D7A3F' }: { cx: number; cy: number; scale?: number; color?: string }) {
  // Simple palm tree: trunk + 6 fronds
  const fronds: string[] = [];
  for (let i = 0; i < 6; i++) {
    const ang = (-Math.PI * (i / 5)) - Math.PI / 12;
    const x2 = cx + Math.cos(ang) * 5 * scale;
    const y2 = cy - 4 * scale + Math.sin(ang) * 5 * scale;
    fronds.push(`M${cx} ${cy - 4 * scale} Q ${cx + Math.cos(ang) * 2.5 * scale} ${cy - 8 * scale} ${x2} ${y2}`);
  }
  return (
    <g>
      <line x1={cx} y1={cy} x2={cx} y2={cy - 4 * scale} stroke="#7A4A1A" strokeWidth={1.2 * scale} strokeLinecap="round"/>
      {fronds.map((d, i) => <path key={i} d={d} stroke={color} strokeWidth={1.1 * scale} fill="none" strokeLinecap="round"/>)}
    </g>
  );
}

function Falcon({ cx, cy, scale = 1, color }: { cx: number; cy: number; scale?: number; color: string }) {
  // Stylized falcon silhouette — head + body + wing line
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
      {/* Body */}
      <path d="M -8 0 Q -4 -10 4 -8 Q 14 -6 12 4 Q 10 12 -2 12 Q -10 10 -8 0 Z" fill={color}/>
      {/* Beak */}
      <path d="M 12 -6 L 18 -3 L 12 -2 Z" fill={color}/>
      {/* Eye */}
      <circle cx={9} cy={-4} r={1} fill="#fff"/>
      {/* Wing line */}
      <path d="M -6 -2 Q 2 6 8 4" stroke="#fff" strokeWidth={0.6} fill="none" opacity={0.7}/>
      {/* Tail */}
      <path d="M -10 4 L -16 8 L -10 6 Z" fill={color}/>
    </g>
  );
}

function Camel({ cx, cy, scale = 1, color }: { cx: number; cy: number; scale?: number; color: string }) {
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
      {/* Body with two humps */}
      <path d="M -12 4 Q -10 -2 -6 -4 Q -3 -8 0 -4 Q 3 -8 6 -4 Q 10 -2 12 4 L 12 8 L -12 8 Z" fill={color}/>
      {/* Neck + head */}
      <path d="M 12 4 Q 14 -4 16 -8 Q 18 -10 20 -7 L 19 -4 L 14 4" fill={color}/>
      {/* Legs */}
      <line x1={-9} y1={8} x2={-9} y2={14} stroke={color} strokeWidth={1.5}/>
      <line x1={-3} y1={8} x2={-3} y2={14} stroke={color} strokeWidth={1.5}/>
      <line x1={3} y1={8} x2={3} y2={14} stroke={color} strokeWidth={1.5}/>
      <line x1={9} y1={8} x2={9} y2={14} stroke={color} strokeWidth={1.5}/>
    </g>
  );
}

function Dune({ cx, cy, w, color, opacity = 1 }: any) {
  return <path d={`M ${cx - w} ${cy} Q ${cx} ${cy - w * 0.6} ${cx + w} ${cy} Z`} fill={color} opacity={opacity}/>;
}

function Pearl({ cx, cy, r, color }: any) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={color}/>
      <circle cx={cx - r * 0.35} cy={cy - r * 0.35} r={r * 0.3} fill="#fff" opacity={0.7}/>
    </g>
  );
}

function Arch({ cx, cy, w, h, color }: any) {
  return (
    <path d={`M ${cx - w / 2} ${cy + h / 2}
              L ${cx - w / 2} ${cy - h / 4}
              Q ${cx} ${cy - h * 0.9} ${cx + w / 2} ${cy - h / 4}
              L ${cx + w / 2} ${cy + h / 2} Z`}
      fill="none" stroke={color} strokeWidth={1.2}/>
  );
}

// ─── Single card ────────────────────────────────────────────────────────────
function CardSVG({ rank, suit, w = 140 }: { rank: Rank; suit: Suit; w?: number }) {
  const h = w * 1.5;
  const red = isRed(suit);
  const ink = red ? '#B91C1C' : '#0A1A2A';
  const accent = '#C9A84C';            // Emirati gold
  const accent2 = red ? '#E04030' : '#1B6B3F';
  const label = labelFor(rank, suit);
  const special = specialOf(rank, suit);
  const tagline = taglineFor(rank, suit);

  return (
    <svg width={w} height={h} viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 5px 14px rgba(0,0,0,0.55))', borderRadius: 9 }}>
      <defs>
        {/* Cream linen background */}
        <linearGradient id={`bg-${rank}-${suit}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFCF1"/>
          <stop offset="100%" stopColor="#F5E9C8"/>
        </linearGradient>
        {/* Subtle damask pattern */}
        <pattern id={`pat-${rank}-${suit}`} x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="7" r="0.8" fill={accent} opacity="0.08"/>
          <path d="M 0 7 L 14 7 M 7 0 L 7 14" stroke={accent} strokeWidth="0.18" opacity="0.07"/>
        </pattern>
      </defs>

      {/* Body */}
      <rect x="0" y="0" width="100" height="150" rx="8" fill={`url(#bg-${rank}-${suit})`} stroke={accent} strokeWidth="1"/>
      <rect x="0" y="0" width="100" height="150" rx="8" fill={`url(#pat-${rank}-${suit})`}/>
      {/* Inner gold frame */}
      <rect x="3.5" y="3.5" width="93" height="143" rx="6" fill="none" stroke={accent} strokeWidth="0.5" opacity="0.55"/>
      {/* Ornament corners (4 small 8-stars in the inner corners) */}
      <EightStar cx={9} cy={9} r={2.2} stroke={accent} fill="none" opacity={0.45}/>
      <EightStar cx={91} cy={9} r={2.2} stroke={accent} fill="none" opacity={0.45}/>
      <EightStar cx={9} cy={141} r={2.2} stroke={accent} fill="none" opacity={0.45}/>
      <EightStar cx={91} cy={141} r={2.2} stroke={accent} fill="none" opacity={0.45}/>

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
          <Falcon cx={50} cy={56} scale={1.7} color={ink}/>
          <text x="50" y="100" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="32" fill={ink}>1</text>
        </g>
      )}
      {rank === '2' && (
        <g>
          <PalmTree cx={36} cy={62} scale={2.4} color={accent2}/>
          <PalmTree cx={64} cy={62} scale={2.4} color={accent2}/>
          <text x="50" y="100" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="34" fill={ink}>2</text>
        </g>
      )}
      {rank === '3' && (
        <g>
          <PalmTree cx={28} cy={56} scale={1.8} color={accent2}/>
          <PalmTree cx={50} cy={50} scale={2.2} color={accent2}/>
          <PalmTree cx={72} cy={56} scale={1.8} color={accent2}/>
          {/* water/oasis */}
          <ellipse cx={50} cy={68} rx={26} ry={4} fill="#5BB1E0" opacity={0.5}/>
          <text x="50" y="100" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="34" fill={ink}>3</text>
        </g>
      )}
      {rank === '4' && (
        <g>
          {/* 4 dunes layered */}
          <Dune cx={28} cy={72} w={20} color={accent} opacity={0.35}/>
          <Dune cx={50} cy={66} w={26} color={accent} opacity={0.55}/>
          <Dune cx={72} cy={72} w={20} color={accent} opacity={0.4}/>
          <Dune cx={50} cy={78} w={36} color={accent2} opacity={0.85}/>
          <text x="50" y="105" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="34" fill={ink}>4</text>
        </g>
      )}
      {rank === '5' && (
        <g>
          <Star cx={50} cy={56} r={18} fill={accent2}/>
          <Star cx={50} cy={56} r={9} fill={accent} opacity={0.85}/>
          <text x="50" y="105" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="34" fill={ink}>5</text>
        </g>
      )}
      {rank === '6' && (
        <g>
          {/* 6 pearls in honeycomb */}
          {[[36,46],[64,46],[28,60],[50,60],[72,60],[50,74]].map(([cx, cy], i) => (
            <Pearl key={i} cx={cx} cy={cy} r={5} color="#E6E2D6"/>
          ))}
          <text x="50" y="105" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="34" fill={ink}>6</text>
        </g>
      )}
      {rank === '7' && (
        <g>
          {/* Pleiades — scattered 7 stars */}
          {[[40,40],[58,38],[68,52],[36,58],[52,54],[60,68],[44,72]].map(([cx, cy], i) => (
            <Star key={i} cx={cx} cy={cy} r={3.2 + (i % 3)} fill={accent}/>
          ))}
          <text x="50" y="105" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="34" fill={ink}>7</text>
        </g>
      )}
      {rank === '8' && (
        <g>
          <EightStar cx={50} cy={58} r={18} stroke={accent2} fill={accent} opacity={0.18}/>
          <EightStar cx={50} cy={58} r={11} stroke={accent2} fill={accent2} opacity={0.45}/>
          <text x="50" y="105" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="34" fill={ink}>8</text>
        </g>
      )}
      {rank === '9' && (
        <g>
          {/* 3x3 arches */}
          {[[28,46],[50,46],[72,46],[28,62],[50,62],[72,62],[28,78],[50,78],[72,78]].map(([cx, cy], i) => (
            <Arch key={i} cx={cx} cy={cy} w={12} h={12} color={accent2}/>
          ))}
          <text x="50" y="105" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="34" fill={ink}>9</text>
        </g>
      )}
      {rank === '10' && !red && (
        <g>
          {/* Black 10 — desert dunes + sun */}
          <circle cx={50} cy={48} r={7} fill={accent}/>
          <Dune cx={28} cy={70} w={22} color={accent2} opacity={0.55}/>
          <Dune cx={62} cy={66} w={26} color={accent2} opacity={0.75}/>
          <Dune cx={50} cy={78} w={36} color={ink} opacity={0.85}/>
          <text x="50" y="115" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="32" fill={ink}>10</text>
        </g>
      )}
      {special === 'TEN_RED' && (
        <g>
          {/* Red 10 = 0 — luck explosion! */}
          {/* shooting star + sparkles */}
          <Star cx={68} cy={42} r={9} fill={accent}/>
          <path d="M 60 50 L 40 70" stroke={accent} strokeWidth="1.6" opacity={0.7}/>
          <Star cx={32} cy={72} r={3} fill={accent2}/>
          <Star cx={28} cy={56} r={2.5} fill={accent}/>
          <Star cx={42} cy={48} r={2} fill={accent2}/>
          {/* big 0 */}
          <text x="50" y="92" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="36" fill={ink}>0</text>
          <text x="50" y="108" textAnchor="middle" fontFamily="'Tajawal', 'Cairo', sans-serif" fontWeight="800" fontSize="9" fill={accent2}>حظك حلو ✨</text>
        </g>
      )}
      {special === 'J' && (
        <g>
          {/* Two cards swapping */}
          <g transform="translate(50 56)">
            <rect x="-22" y="-15" width="16" height="22" rx="2" fill={ink} stroke={accent} strokeWidth="0.6" transform="rotate(-10)"/>
            <rect x="6" y="-15" width="16" height="22" rx="2" fill={accent2} stroke={accent} strokeWidth="0.6" transform="rotate(10)"/>
            {/* swap arrows */}
            <path d="M -6 -2 L -2 -2 L -2 -5 L 4 0 L -2 5 L -2 2 L -6 2 Z" fill={accent}/>
            <path d="M 6 8 L 2 8 L 2 11 L -4 6 L 2 1 L 2 4 L 6 4 Z" fill={accent}/>
          </g>
          <text x="50" y="100" textAnchor="middle" fontFamily="'Tajawal', 'Cairo', sans-serif" fontWeight="800" fontSize="11" fill={ink}>{tagline}</text>
        </g>
      )}
      {special === 'Q_RED' && (
        <g>
          {/* Stylized eye with kohl makeup + small card */}
          <g transform="translate(50 56)">
            {/* eye almond */}
            <path d="M -22 0 Q 0 -14 22 0 Q 0 14 -22 0 Z" fill="#fff" stroke={ink} strokeWidth="1.2"/>
            {/* iris */}
            <circle cx={0} cy={0} r={8} fill={ink}/>
            <circle cx={0} cy={0} r={4} fill={accent2}/>
            <circle cx={-2} cy={-2} r={1.4} fill="#fff"/>
            {/* kohl wing */}
            <path d="M -22 0 Q -27 -2 -28 -5" stroke={ink} strokeWidth="1.4" fill="none"/>
            <path d="M 22 0 Q 27 -2 28 -5" stroke={ink} strokeWidth="1.4" fill="none"/>
            {/* small card peeking */}
            <rect x={-6} y={-26} width={12} height={9} rx={1.2} fill="#fff" stroke={accent} strokeWidth={0.6}/>
            <text x={0} y={-19} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="6" fill={ink}>?</text>
          </g>
          <text x="50" y="100" textAnchor="middle" fontFamily="'Tajawal', 'Cairo', sans-serif" fontWeight="800" fontSize="11" fill={ink}>{tagline}</text>
        </g>
      )}
      {rank === 'Q' && !red && (
        <g>
          {/* Black Q = 12 — 12-pointed compass star */}
          <g transform="translate(50 58)">
            {Array.from({ length: 12 }).map((_, i) => {
              const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
              const x = Math.cos(a) * 16; const y = Math.sin(a) * 16;
              return <line key={i} x1={0} y1={0} x2={x} y2={y} stroke={accent} strokeWidth={0.8} opacity={0.55}/>;
            })}
            <circle r={16} fill="none" stroke={accent} strokeWidth={0.6} opacity={0.45}/>
            <circle r={9} fill={ink}/>
            <text y={3} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="9" fill={accent}>12</text>
          </g>
          <text x="50" y="105" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="32" fill={ink}>12</text>
        </g>
      )}
      {special === 'K' && (
        <g>
          {/* Crown + 2 cards being drawn */}
          <g transform="translate(50 50)">
            {/* crown */}
            <path d="M -14 0 L -10 -8 L -4 -2 L 0 -10 L 4 -2 L 10 -8 L 14 0 Z" fill={accent} stroke={ink} strokeWidth="0.6"/>
            <rect x={-14} y={0} width={28} height={3} fill={accent} stroke={ink} strokeWidth="0.6"/>
            {/* gem */}
            <circle cx={0} cy={-2} r={1.5} fill={accent2}/>
          </g>
          <g transform="translate(50 78)">
            {/* two drawn cards */}
            <rect x="-22" y="-12" width="18" height="24" rx="2" fill="#fff" stroke={ink} strokeWidth="0.7" transform="rotate(-12)"/>
            <rect x="4" y="-12" width="18" height="24" rx="2" fill="#fff" stroke={ink} strokeWidth="0.7" transform="rotate(12)"/>
            {/* badge with 2 */}
            <circle cx={0} cy={6} r={6.5} fill={accent2}/>
            <text x={0} y={9} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="900" fontSize="9" fill="#fff">2</text>
          </g>
          <text x="50" y="116" textAnchor="middle" fontFamily="'Tajawal', 'Cairo', sans-serif" fontWeight="800" fontSize="11" fill={ink}>{tagline}</text>
        </g>
      )}

      {/* Tagline (numeric cards) */}
      {!special && rank !== 'Q' && (
        <text x="50" y="118" textAnchor="middle" fontFamily="'Tajawal', 'Cairo', sans-serif" fontSize="8" fill={ink} opacity={0.7}>
          {tagline}
        </text>
      )}

      {/* CHECK brand wordmark — bottom-center */}
      <g>
        <rect x="32" y="129" width="36" height="11" rx="5" fill={ink} opacity="0.85"/>
        <text x="50" y="137" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="6.5" letterSpacing="2" fill={accent}>CHECK</text>
      </g>
    </svg>
  );
}

export function CardsPreviewPage() {
  const [size, setSize] = useState(140);
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #1A1408 0%, #0E0905 100%)', padding: '24px 16px 60px' }}>
      <div className="max-w-5xl mx-auto" dir="rtl">
        <h1 className="font-arabic font-bold mb-2" style={{ fontSize: 28, color: '#E8C97A', textAlign: 'center' }}>
          🃏 معاينة أوراق Check الإماراتية
        </h1>
        <p className="font-arabic text-center mb-6" style={{ fontSize: 13, color: 'rgba(245,230,200,0.55)' }}>
          كل ورقة فيها رسمة مميزة بطابع إماراتي + علامة Check — A=الصقر، 2=النخلتين،
          3=الواحة، 4=الكثبان، 5=النجمة، 6=اللؤلؤ، 7=الثريا، 8=النجمة الثمانية،
          9=القناطر، 10♣♠=الصحراء، 10♥♦=حظك حلو ✨، Q الأسود=12 (بوصلة)،
          J/Q الأحمر/K = أوامر اللعبة
        </p>

        {/* Size slider */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="font-arabic" style={{ color: 'rgba(245,230,200,0.55)', fontSize: 13 }}>الحجم</span>
          <input type="range" min={100} max={200} value={size}
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

        <div className="rounded-xl p-4 mt-8" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)' }}>
          <h3 className="font-arabic font-bold mb-2" style={{ color: '#E8C97A' }}>اللي مميز في التصميم</h3>
          <ul className="font-arabic text-sm" style={{ color: 'rgba(245,230,200,0.65)', lineHeight: 1.9 }}>
            <li>• 🦅 <strong>A</strong> صقر — رمز الإمارات (يطلع كرقم 1)</li>
            <li>• 🌴 <strong>2/3</strong> نخيل وواحة — هوية الصحراء</li>
            <li>• 🏜️ <strong>4/10 الأسود</strong> كثبان رملية + شمس</li>
            <li>• ⭐ <strong>5/7/8</strong> نجوم متنوعة (خماسية، الثريا، نجمة إسلامية ثمانية)</li>
            <li>• 🟡 <strong>6</strong> لؤلؤ — تراث الإمارات البحري</li>
            <li>• 🕌 <strong>9</strong> قناطر — عمارة عربية</li>
            <li>• ✨ <strong>10 الأحمر</strong> "حظك حلو" مع نيزك ونجوم متطايرة (قيمة 0!)</li>
            <li>• 🔄 <strong>J</strong> "بدّل كرت" — كرتين بأسهم تبادل</li>
            <li>• 👁️ <strong>Q الأحمر</strong> "اكشف كرت" — عين بكحل تنظر لكرت</li>
            <li>• 🧭 <strong>Q الأسود</strong> "12" — بوصلة ١٢ نقطة</li>
            <li>• 👑 <strong>K</strong> "اسحب كرتين" — تاج فوق كرتين</li>
            <li>• كل ورقة: حدود ذهبية + ٤ نجوم إسلامية في الزوايا + خط CHECK في الأسفل</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
