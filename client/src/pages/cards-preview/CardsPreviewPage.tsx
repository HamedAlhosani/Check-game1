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

// ─── Big illustrations for the 4 special cards ──────────────────────────────
// All centered around (50, 70) within the 100×150 card viewBox.

function SwapIllustration({ ink, accent, accent2 }: { ink: string; accent: string; accent2: string }) {
  // Two compact cards with a single centered letter inside each, with curved
  // swap arrows above and below.
  return (
    <g transform="translate(50 70)">
      {/* Arrows */}
      <path d="M -16 -22 Q 0 -32 16 -22" stroke={accent2} strokeWidth={2} fill="none" strokeLinecap="round"/>
      <polygon points="16,-22 11,-26 12,-19" fill={accent2}/>
      <path d="M 16 22 Q 0 32 -16 22" stroke={accent} strokeWidth={2} fill="none" strokeLinecap="round"/>
      <polygon points="-16,22 -11,26 -12,19" fill={accent}/>

      {/* Left card (going to right) — letter centered inside */}
      <g transform="translate(-14 0) rotate(-12)">
        <rect x={-9} y={-14} width={18} height={28} rx={2.5} fill="#FFF" stroke={ink} strokeWidth={1.1}/>
        <text x={0} y={4} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="14" fill={accent2}>A</text>
      </g>
      {/* Right card (going to left) */}
      <g transform="translate(14 0) rotate(12)">
        <rect x={-9} y={-14} width={18} height={28} rx={2.5} fill="#FFF" stroke={ink} strokeWidth={1.1}/>
        <text x={0} y={4} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="14" fill={ink}>K</text>
      </g>
    </g>
  );
}

function PullIllustration({ ink, accent, accent2 }: { ink: string; accent: string; accent2: string }) {
  // A small deck on the left + two compact drawn cards on the right with
  // letters centered inside, plus a '2' badge.
  return (
    <g transform="translate(50 70)">
      {/* Arrow from deck → drawn cards */}
      <path d="M -22 -22 Q -4 -28 12 -16" stroke={accent2} strokeWidth={1.8} fill="none" strokeLinecap="round"/>
      <polygon points="12,-16 7,-20 8,-13" fill={accent2}/>

      {/* Deck stack (3 layered cards) */}
      <g transform="translate(-20 0)">
        {[2, 1, 0].map(i => (
          <rect key={i} x={-7 + i * 0.6} y={-13 + i * 0.6} width={14} height={24} rx={2} fill="#080318" stroke={accent} strokeWidth={0.7}/>
        ))}
        <text x={0} y={2} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="9" fill={accent}>♢</text>
      </g>

      {/* Two drawn cards fanned out — single centered letter each */}
      <g transform="translate(6 -2) rotate(-14)">
        <rect x={-9} y={-14} width={18} height={28} rx={2.5} fill="#FFF" stroke={ink} strokeWidth={1.1}/>
        <text x={0} y={4} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="14" fill={accent2}>A</text>
      </g>
      <g transform="translate(20 4) rotate(14)">
        <rect x={-9} y={-14} width={18} height={28} rx={2.5} fill="#FFF" stroke={ink} strokeWidth={1.1}/>
        <text x={0} y={4} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="14" fill={ink}>K</text>
      </g>

      {/* '2' badge */}
      <g transform="translate(26 -20)">
        <circle r={8} fill={accent2} stroke="#FFF" strokeWidth={1.4}/>
        <text y={3} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="900" fontSize="10" fill="#FFF">2</text>
      </g>
    </g>
  );
}

function PeekIllustration({ ink, accent, accent2 }: { ink: string; accent: string; accent2: string }) {
  // Card with its corner being lifted up to reveal a hidden value — clearer
  // 'reveal' metaphor than the previous eye design.
  return (
    <g transform="translate(50 72)">
      {/* Soft glow behind the card */}
      <ellipse cx={0} cy={6} rx={28} ry={6} fill={accent} opacity={0.18}/>

      {/* The face-down card body (its back) */}
      <rect x={-22} y={-22} width={44} height={36} rx={4} fill={ink} stroke={accent} strokeWidth={1.5}/>
      {/* faint pattern on the back */}
      <g opacity="0.35" stroke={accent} strokeWidth={0.7} fill="none">
        <path d="M -14 -16 L 14 12 M 14 -16 L -14 12"/>
        <circle cx={0} cy={-2} r={5}/>
      </g>

      {/* Lifted bottom-left corner — a triangular flap folded up showing the
          face underneath. */}
      <g>
        {/* The flap (face/white) — folded from bottom-left */}
        <path d="M -22 14 L 4 14 L -22 -8 Z" fill="#FFF" stroke={ink} strokeWidth={1.3}/>
        {/* Reveal sparkle on the flap */}
        <text x={-12} y={9} fontFamily="Georgia, serif" fontWeight="900" fontSize="13" fill={accent2}>?</text>
        {/* Crease line */}
        <line x1={-22} y1={-8} x2={4} y2={14} stroke={ink} strokeWidth={1} opacity={0.55}/>
      </g>

      {/* Hand cursor / pointing finger lifting the corner — a tiny arrow */}
      <g transform="translate(-26 -10) rotate(-25)">
        <path d="M 0 0 Q 4 -3 8 -1 L 6 3 L 10 4 L 4 8 Z" fill={accent} stroke={ink} strokeWidth={0.6}/>
      </g>

      {/* Sparkle bursts around the flap to scream "REVEAL" */}
      {[
        [-30, 18, 2.5],
        [10, 18, 2],
        [-22, 22, 1.5],
      ].map(([cx, cy, r], i) => (
        <g key={i}>
          <line x1={cx} y1={cy - r * 1.6} x2={cx} y2={cy + r * 1.6} stroke={accent} strokeWidth={1} strokeLinecap="round"/>
          <line x1={cx - r * 1.6} y1={cy} x2={cx + r * 1.6} y2={cy} stroke={accent} strokeWidth={1} strokeLinecap="round"/>
        </g>
      ))}
    </g>
  );
}

function LuckIllustration({ ink, accent, accent2 }: { ink: string; accent: string; accent2: string }) {
  // Layout INSIDE the card: red 'حظك حلو' pill at top, BIG '0' in middle,
  // 'صفر' word below. All as plain SVG (foreignObject was rendering outside
  // the card on iOS Safari).
  return (
    <g transform="translate(50 72)">
      {/* Sparkle stars in the corners */}
      {[
        [-32, -6, 3],
        [32, -6, 3.5],
        [-30, 24, 2.5],
        [30, 24, 3],
      ].map(([cx, cy, r], i) => (
        <g key={i}>
          <line x1={cx} y1={cy - r * 1.8} x2={cx} y2={cy + r * 1.8} stroke={accent2} strokeWidth={1.2} strokeLinecap="round"/>
          <line x1={cx - r * 1.8} y1={cy} x2={cx + r * 1.8} y2={cy} stroke={accent2} strokeWidth={1.2} strokeLinecap="round"/>
          <circle cx={cx} cy={cy} r={r * 0.45} fill={accent2}/>
        </g>
      ))}

      {/* 'حظك حلو' red pill banner */}
      <g transform="translate(0 -28)">
        <rect x={-30} y={-9} width={60} height={18} rx={9} fill={accent2} opacity={0.95}/>
        <text x={0} y={4} textAnchor="middle" direction="rtl" xmlLang="ar"
          fontFamily="'Tajawal','Cairo','Noto Sans Arabic','Arial',sans-serif"
          fontWeight="900" fontSize="11" fill="#FFF">حظك حلو ✨</text>
      </g>

      {/* The big digit '0' in the centre */}
      <text y={10} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="900" fontSize="46"
        fill="none" stroke={accent} strokeWidth={3.5} opacity={0.45}>0</text>
      <text y={10} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="900" fontSize="46"
        fill={ink}>0</text>

      {/* 'صفر' word — directly under the digit */}
      <text x={0} y={26} textAnchor="middle" direction="rtl" xmlLang="ar"
        fontFamily="'Tajawal','Cairo','Noto Sans Arabic','Arial',sans-serif"
        fontWeight="800" fontSize="11" fill={accent2} letterSpacing="1">صفر</text>
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

  // 'حظك حلو' is rendered inside LuckIllustration itself (above the 0),
  // so we skip the external bottom-label for TEN_RED.
  const actionLabel = special === 'J' ? 'بدّل كرت'
                    : special === 'Q_RED' ? 'اكشف كرت'
                    : special === 'K' ? 'اسحب كرتين'
                    : null;

  return (
    <svg width={w} height={h} viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 5px 14px rgba(0,0,0,0.55))', borderRadius: 9 }}>
      <defs>
        <linearGradient id={`bg-${rank}-${suit}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFCF2"/>
          <stop offset="100%" stopColor="#F2E4BE"/>
        </linearGradient>
        <radialGradient id={`glow-${rank}-${suit}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={red ? '#FFD8D8' : '#D8E8FF'} stopOpacity="0.55"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>
      </defs>

      {/* Card body */}
      <rect x="0" y="0" width="100" height="150" rx="8" fill={`url(#bg-${rank}-${suit})`} stroke={accent} strokeWidth="1"/>
      <rect x="3.5" y="3.5" width="93" height="143" rx="6" fill="none" stroke={accent} strokeWidth="0.6" opacity="0.6"/>

      {/* Decorative chevron ribbons (top + bottom edges) */}
      <g opacity="0.6" stroke={accent} strokeWidth="0.5" fill="none">
        <path d="M 16 14 L 24 18 L 32 14 L 40 18 L 48 14 L 56 18 L 64 14 L 72 18 L 80 14 L 84 14"/>
      </g>
      <g opacity="0.6" stroke={accent} strokeWidth="0.5" fill="none" transform="rotate(180 50 75)">
        <path d="M 16 14 L 24 18 L 32 14 L 40 18 L 48 14 L 56 18 L 64 14 L 72 18 L 80 14 L 84 14"/>
      </g>

      {/* Side filigree */}
      <g opacity="0.4" stroke={accent} strokeWidth="0.45" fill="none">
        <line x1="16" y1="40" x2="16" y2="110"/>
        <line x1="84" y1="40" x2="84" y2="110"/>
        {[50, 60, 70, 80, 90, 100].map(y => (
          <g key={y}>
            <circle cx="16" cy={y} r="0.8" fill={accent}/>
            <circle cx="84" cy={y} r="0.8" fill={accent}/>
          </g>
        ))}
      </g>

      {/* Corner ornaments — 4-petal flower */}
      {[[12, 12], [88, 12], [12, 138], [88, 138]].map(([cx, cy], i) => (
        <g key={i}>
          {Array.from({ length: 4 }).map((_, j) => {
            const a = (j / 4) * Math.PI * 2;
            return <circle key={j} cx={cx + Math.cos(a) * 2.6} cy={cy + Math.sin(a) * 2.6} r="1.4" fill={accent} opacity="0.55"/>;
          })}
          <circle cx={cx} cy={cy} r="1.2" fill={accent2}/>
        </g>
      ))}

      {/* Corner rank+suit (always shown — small, in the corners only) */}
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

      {/* Soft halo behind the centre */}
      <circle cx={50} cy={75} r={32} fill={`url(#glow-${rank}-${suit})`}/>
      <circle cx={50} cy={75} r={26} fill="none" stroke={accent} strokeWidth="0.7" opacity="0.4" strokeDasharray="2 2"/>

      {/* ─── CENTRE CONTENT ─── */}
      {!special && (
        // Numeric / black-Q / A — JUST the big number, no suit below.
        <text
          x={50}
          y={92}
          textAnchor="middle"
          fontFamily="Georgia, serif"
          fontWeight="800"
          fontSize={label.length === 1 ? 64 : 50}
          fill={ink}
          style={{ letterSpacing: -1 }}
        >
          {label}
        </text>
      )}

      {special === 'J' && <SwapIllustration ink={ink} accent={accent} accent2={accent2}/>}
      {special === 'K' && <PullIllustration ink={ink} accent={accent} accent2={accent2}/>}
      {special === 'Q_RED' && <PeekIllustration ink={ink} accent={accent} accent2={accent2}/>}
      {special === 'TEN_RED' && <LuckIllustration ink={ink} accent={accent} accent2={accent2}/>}

      {/* Action label for special cards (plain SVG text, not foreignObject:
          foreignObject renders outside the card frame on iOS Safari) */}
      {actionLabel && (
        <text x={50} y={122} textAnchor="middle" direction="rtl" xmlLang="ar"
          fontFamily="'Tajawal','Cairo','Noto Sans Arabic','Arial',sans-serif"
          fontWeight="800" fontSize="11" fill={accent2}>
          {actionLabel}
        </text>
      )}

      {/* CHECK brand — bottom centre, modest pill */}
      <g>
        <rect x="32" y="135" width="36" height="9" rx="4.5" fill={ink} opacity="0.88"/>
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
          🃏 معاينة أوراق Check
        </h1>
        <p className="font-arabic text-center mb-6" style={{ fontSize: 13, color: 'rgba(245,230,200,0.55)' }}>
          الإصدار الرابع — رقم كبير بدون شكل تحته للأوراق العادية، ورسوم كبيرة للأوراق الخاصة
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
