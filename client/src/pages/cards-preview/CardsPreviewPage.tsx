/**
 * Card design preview — visit /cards-preview to inspect the proposed
 * Check card art before it's wired into the live game.
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

// ─── Action icons for special cards (rendered ABOVE the big number) ─────────
function SwapIcon({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <g transform={`scale(${scale})`}>
      <path d="M -10 -2 L -2 -2 L -2 -6 L 6 0 L -2 6 L -2 2 L -10 2 Z" fill={color}/>
      <path d="M 10 -2 L 2 -2 L 2 -6 L -6 0 L 2 6 L 2 2 L 10 2 Z" fill={color} transform="translate(0 6) rotate(180)"/>
    </g>
  );
}
function EyeIcon({ color, accent }: { color: string; accent: string }) {
  return (
    <g>
      <path d="M -16 0 Q 0 -10 16 0 Q 0 10 -16 0 Z" fill="#FFF" stroke={color} strokeWidth={1.4}/>
      <circle cx={0} cy={0} r={6} fill={color}/>
      <circle cx={0} cy={0} r={3} fill={accent}/>
      <circle cx={-1.5} cy={-1.5} r={1.2} fill="#FFF"/>
    </g>
  );
}
function PullIcon({ color }: { color: string }) {
  // Two cards being drawn
  return (
    <g>
      <rect x={-12} y={-9} width={11} height={16} rx={1.5} fill="#FFF" stroke={color} strokeWidth={0.9} transform="rotate(-12 -7 -1)"/>
      <rect x={1} y={-9} width={11} height={16} rx={1.5} fill="#FFF" stroke={color} strokeWidth={0.9} transform="rotate(12 7 -1)"/>
      <circle cx={0} cy={9} r={4.5} fill={color}/>
      <text y={11.5} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="900" fontSize="6.5" fill="#FFF">2</text>
    </g>
  );
}
function StarBurstIcon({ color, accent }: { color: string; accent: string }) {
  // Lucky shooting star burst
  return (
    <g>
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const x = Math.cos(a) * 12;
        const y = Math.sin(a) * 12;
        return <line key={i} x1={0} y1={0} x2={x} y2={y} stroke={accent} strokeWidth={1.4} strokeLinecap="round"/>;
      })}
      <circle r={6} fill={color}/>
      <circle r={3} fill={accent}/>
    </g>
  );
}

// ─── Single card ────────────────────────────────────────────────────────────
function CardSVG({ rank, suit, w = 150 }: { rank: Rank; suit: Suit; w?: number }) {
  const h = w * 1.5;
  const red = isRed(suit);
  const ink = red ? '#9B1C1C' : '#0E1B2C';
  const accent = '#C9A84C';
  const accent2 = red ? '#E04030' : '#1B6B3F';
  const label = labelFor(rank, suit);
  const special = specialOf(rank, suit);

  // Special-card action label below the big number
  const actionLabel = special === 'J' ? 'بدّل كرت'
                    : special === 'Q_RED' ? 'اكشف كرت'
                    : special === 'K' ? 'اسحب كرتين'
                    : special === 'TEN_RED' ? 'حظك حلو'
                    : null;

  // Big-number font size — shrinks for 2-digit labels
  const bigSize = label.length === 1 ? 56 : label.length === 2 ? 42 : 28;

  return (
    <svg width={w} height={h} viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 5px 14px rgba(0,0,0,0.55))', borderRadius: 9 }}>
      <defs>
        <linearGradient id={`bg-${rank}-${suit}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFCF2"/>
          <stop offset="100%" stopColor="#F2E4BE"/>
        </linearGradient>
        {/* Center-of-card glow tinted by suit */}
        <radialGradient id={`glow-${rank}-${suit}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={red ? '#FFD8D8' : '#D8E8FF'} stopOpacity="0.55"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>
      </defs>

      {/* Card body */}
      <rect x="0" y="0" width="100" height="150" rx="8" fill={`url(#bg-${rank}-${suit})`} stroke={accent} strokeWidth="1"/>
      {/* Inner gold frame */}
      <rect x="3.5" y="3.5" width="93" height="143" rx="6" fill="none" stroke={accent} strokeWidth="0.6" opacity="0.6"/>

      {/* ─── ORNAMENTAL FRAME inside the card body ─── */}
      {/* Decorative ribbon at the top edge (geometric chevron) */}
      <g opacity="0.65" stroke={accent} strokeWidth="0.5" fill="none">
        <path d="M 16 14 L 24 18 L 32 14 L 40 18 L 48 14 L 56 18 L 64 14 L 72 18 L 80 14 L 84 14"/>
      </g>
      {/* Decorative ribbon at the bottom edge */}
      <g opacity="0.65" stroke={accent} strokeWidth="0.5" fill="none" transform="rotate(180 50 75)">
        <path d="M 16 14 L 24 18 L 32 14 L 40 18 L 48 14 L 56 18 L 64 14 L 72 18 L 80 14 L 84 14"/>
      </g>

      {/* Tall vertical filigree lines flanking the centre */}
      <g opacity="0.4" stroke={accent} strokeWidth="0.45" fill="none">
        <line x1="16" y1="40" x2="16" y2="110"/>
        <line x1="84" y1="40" x2="84" y2="110"/>
        {/* small dots along the line */}
        {[50, 60, 70, 80, 90, 100].map(y => (
          <g key={y}>
            <circle cx="16" cy={y} r="0.8" fill={accent}/>
            <circle cx="84" cy={y} r="0.8" fill={accent}/>
          </g>
        ))}
      </g>

      {/* 4 small flower-like ornaments at frame corners (replacing plain diamonds) */}
      {[[12, 12], [88, 12], [12, 138], [88, 138]].map(([cx, cy], i) => (
        <g key={i}>
          {Array.from({ length: 4 }).map((_, j) => {
            const a = (j / 4) * Math.PI * 2;
            return <circle key={j} cx={cx + Math.cos(a) * 2.6} cy={cy + Math.sin(a) * 2.6} r="1.4" fill={accent} opacity="0.55"/>;
          })}
          <circle cx={cx} cy={cy} r="1.2" fill={accent2}/>
        </g>
      ))}

      {/* ─── CORNER MARKS (rank + suit) ─── */}
      <g>
        <text x="14" y="22" fontFamily="Georgia, serif" fontWeight="800"
          fontSize={label.length > 1 ? 12 : 16} fill={ink} textAnchor="middle">{label}</text>
        <text x="14" y="34" fontSize="12" fill={ink} textAnchor="middle">{SUIT_GLYPH[suit]}</text>
      </g>
      <g transform="rotate(180 50 75)">
        <text x="14" y="22" fontFamily="Georgia, serif" fontWeight="800"
          fontSize={label.length > 1 ? 12 : 16} fill={ink} textAnchor="middle">{label}</text>
        <text x="14" y="34" fontSize="12" fill={ink} textAnchor="middle">{SUIT_GLYPH[suit]}</text>
      </g>

      {/* ─── CENTER: big number (always) + optional action icon/label ─── */}

      {/* Center halo — soft tinted glow behind the number */}
      <circle cx={50} cy={75} r={32} fill={`url(#glow-${rank}-${suit})`}/>

      {/* Decorative ring around the centre */}
      <circle cx={50} cy={75} r={26} fill="none" stroke={accent} strokeWidth="0.7" opacity="0.4" strokeDasharray="2 2"/>

      {/* For special cards: small action icon ABOVE the number */}
      {special === 'J' && (
        <g transform="translate(50 50)"><SwapIcon color={accent2}/></g>
      )}
      {special === 'Q_RED' && (
        <g transform="translate(50 52)"><EyeIcon color={ink} accent={accent2}/></g>
      )}
      {special === 'K' && (
        <g transform="translate(50 50)"><PullIcon color={accent2}/></g>
      )}
      {special === 'TEN_RED' && (
        <g transform="translate(50 50)"><StarBurstIcon color={accent} accent={accent2}/></g>
      )}

      {/* THE BIG NUMBER — always centered, this is the heart of the design */}
      <text
        x={50}
        y={special ? 96 : 86}
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontWeight="800"
        fontSize={special ? bigSize - 8 : bigSize}
        fill={ink}
        style={{ letterSpacing: -1 }}
      >
        {label}
      </text>

      {/* Suit glyph below number — bold and big */}
      <text
        x={50}
        y={special ? 116 : 110}
        textAnchor="middle"
        fontSize={special ? 14 : 20}
        fill={ink}
        opacity="0.9"
      >
        {SUIT_GLYPH[suit]}
      </text>

      {/* Optional action label for special cards */}
      {actionLabel && (
        <text
          x={50}
          y={130}
          textAnchor="middle"
          fontFamily="'Tajawal', 'Cairo', sans-serif"
          fontWeight="800"
          fontSize="10"
          fill={accent2}
        >
          {actionLabel}
        </text>
      )}

      {/* CHECK brand wordmark — tiny, bottom-center */}
      {!actionLabel && (
        <g>
          <rect x="36" y="129" width="28" height="8" rx="4" fill={ink} opacity="0.85"/>
          <text x="50" y="135" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="5.5" letterSpacing="2" fill={accent}>CHECK</text>
        </g>
      )}
    </svg>
  );
}

export function CardsPreviewPage() {
  const [size, setSize] = useState(150);
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #1A1408 0%, #0E0905 100%)', padding: '24px 16px 60px' }}>
      <div className="max-w-5xl mx-auto" dir="rtl">
        <h1 className="font-arabic font-bold mb-2" style={{ fontSize: 28, color: '#E8C97A', textAlign: 'center' }}>
          🃏 معاينة أوراق Check
        </h1>
        <p className="font-arabic text-center mb-6" style={{ fontSize: 13, color: 'rgba(245,230,200,0.55)' }}>
          الإصدار الثالث — الرقم كبير في النص + إطار زخرفي إماراتي
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
