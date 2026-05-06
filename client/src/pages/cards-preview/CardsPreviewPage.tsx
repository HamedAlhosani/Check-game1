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
  // Two big real-looking cards exchanging places with curved arrows.
  return (
    <g transform="translate(50 70)">
      {/* Curved arrow above (left → right) */}
      <path d="M -22 -28 Q 0 -42 22 -28" stroke={accent2} strokeWidth={2.2} fill="none" strokeLinecap="round"/>
      <polygon points="22,-28 16,-32 18,-24" fill={accent2}/>
      {/* Curved arrow below (right → left) */}
      <path d="M 22 28 Q 0 42 -22 28" stroke={accent} strokeWidth={2.2} fill="none" strokeLinecap="round"/>
      <polygon points="-22,28 -16,32 -18,24" fill={accent}/>

      {/* Left card (going to right) */}
      <g transform="translate(-18 0) rotate(-12)">
        <rect x={-10} y={-15} width={20} height={30} rx={2.5} fill="#FFF" stroke={ink} strokeWidth={1.1}/>
        <text x={-6} y={-7} fontFamily="Georgia, serif" fontWeight="800" fontSize="8" fill={accent2}>A</text>
        <text x={-6} y={1} fontSize="8" fill={accent2}>♥</text>
        <text x={6} y={13} fontFamily="Georgia, serif" fontWeight="800" fontSize="8" fill={accent2} transform="rotate(180 6 13)">A</text>
      </g>
      {/* Right card (going to left) */}
      <g transform="translate(18 0) rotate(12)">
        <rect x={-10} y={-15} width={20} height={30} rx={2.5} fill="#FFF" stroke={ink} strokeWidth={1.1}/>
        <text x={-6} y={-7} fontFamily="Georgia, serif" fontWeight="800" fontSize="8" fill={ink}>K</text>
        <text x={-6} y={1} fontSize="8" fill={ink}>♣</text>
        <text x={6} y={13} fontFamily="Georgia, serif" fontWeight="800" fontSize="8" fill={ink} transform="rotate(180 6 13)">K</text>
      </g>
    </g>
  );
}

function PullIllustration({ ink, accent, accent2 }: { ink: string; accent: string; accent2: string }) {
  // A deck on the left and two cards being drawn out, with a "2" badge on top.
  return (
    <g transform="translate(50 70)">
      {/* Hand-drawn arrow indicating pull direction */}
      <path d="M -28 -28 Q -8 -36 16 -22" stroke={accent2} strokeWidth={2} fill="none" strokeLinecap="round"/>
      <polygon points="16,-22 10,-26 12,-18" fill={accent2}/>

      {/* Deck stack (3 layered cards) */}
      <g transform="translate(-22 0)">
        {[2, 1, 0].map(i => (
          <rect key={i} x={-9 + i * 0.6} y={-16 + i * 0.6} width={18} height={28} rx={2} fill="#080318" stroke={accent} strokeWidth={0.8}/>
        ))}
        {/* deck count "..." */}
        <text x={0} y={2} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="10" fill={accent}>♢</text>
      </g>

      {/* Two drawn cards — fanned out to the right of the deck */}
      <g transform="translate(8 -2) rotate(-14)">
        <rect x={-10} y={-16} width={20} height={32} rx={2.5} fill="#FFF" stroke={ink} strokeWidth={1.1}/>
        <text x={-6} y={-8} fontFamily="Georgia, serif" fontWeight="800" fontSize="9" fill={accent2}>A</text>
        <text x={-6} y={0} fontSize="8" fill={accent2}>♥</text>
      </g>
      <g transform="translate(22 4) rotate(14)">
        <rect x={-10} y={-16} width={20} height={32} rx={2.5} fill="#FFF" stroke={ink} strokeWidth={1.1}/>
        <text x={-6} y={-8} fontFamily="Georgia, serif" fontWeight="800" fontSize="9" fill={ink}>K</text>
        <text x={-6} y={0} fontSize="8" fill={ink}>♠</text>
      </g>

      {/* Big "2" badge */}
      <g transform="translate(28 -22)">
        <circle r={9} fill={accent2} stroke="#FFF" strokeWidth={1.4}/>
        <text y={3.5} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="900" fontSize="11" fill="#FFF">2</text>
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
  // Layout: "حظك حلو" banner on top, BIG '0' in the middle, "صفر" word below.
  // Arabic text needs direction="rtl" inside SVG or it can render reversed.
  return (
    <g transform="translate(50 72)">
      {/* Sparkle stars in the corners */}
      {[
        [-34, -8, 3],
        [34, -8, 3.5],
        [-30, 26, 2.5],
        [32, 26, 3],
      ].map(([cx, cy, r], i) => (
        <g key={i}>
          <line x1={cx} y1={cy - r * 1.8} x2={cx} y2={cy + r * 1.8} stroke={accent2} strokeWidth={1.2} strokeLinecap="round"/>
          <line x1={cx - r * 1.8} y1={cy} x2={cx + r * 1.8} y2={cy} stroke={accent2} strokeWidth={1.2} strokeLinecap="round"/>
          <circle cx={cx} cy={cy} r={r * 0.45} fill={accent2}/>
        </g>
      ))}

      {/* "حظك حلو" banner on top */}
      <g transform="translate(0 -32)">
        <rect x={-32} y={-9} width={64} height={18} rx={9} fill={accent2} opacity={0.92}/>
        <text y={4} textAnchor="middle" direction="rtl"
          fontFamily="'Tajawal', 'Cairo', 'Segoe UI', sans-serif"
          fontWeight="900" fontSize="11" fill="#FFF">
          {'‫حظك حلو ✨‬'}
        </text>
      </g>

      {/* The big digit '0' in the centre */}
      <text y={20} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="900" fontSize="50"
        fill="none" stroke={accent} strokeWidth={3.5} opacity={0.45}>0</text>
      <text y={20} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="900" fontSize="50"
        fill={ink}>0</text>

      {/* "صفر" word below the digit */}
      <text y={36} textAnchor="middle" direction="rtl"
        fontFamily="'Tajawal', 'Cairo', 'Segoe UI', sans-serif"
        fontWeight="800" fontSize="11" fill={accent2} letterSpacing="1">
        {'‫صفر‬'}
      </text>
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

      {/* Action label for special cards (wrapped in RTL marks so Arabic
          glyphs don't get reversed by SVG's default LTR text shaping) */}
      {actionLabel && (
        <text
          x={50}
          y={120}
          textAnchor="middle"
          direction="rtl"
          fontFamily="'Tajawal', 'Cairo', 'Segoe UI', sans-serif"
          fontWeight="800"
          fontSize="11"
          fill={accent2}
        >
          {`‫${actionLabel}‬`}
        </text>
      )}

      {/* CHECK brand — bottom centre */}
      <g>
        <rect x="36" y="135" width="28" height="8" rx="4" fill={ink} opacity="0.85"/>
        <text x="50" y="141" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="5.5" letterSpacing="2" fill={accent}>CHECK</text>
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
