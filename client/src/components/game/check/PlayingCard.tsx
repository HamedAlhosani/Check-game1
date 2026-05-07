import { motion } from 'framer-motion';
import { memo } from 'react';
import { Card } from '@check-game/shared';

interface Props {
  card: Card | null;
  faceDown?: boolean;
  onClick?: () => void;
  highlight?: 'burn' | 'select' | 'none';
  small?: boolean;
  mini?: boolean;
  xmini?: boolean;
  backId?: string;
}

export const CARD_BACK_THEMES: Record<string, { bg1: string; bg2: string; accent: string; glow: string }> = {
  card_classic:  { bg1: '#080D22', bg2: '#040918', accent: '#C9A84C', glow: 'rgba(201,168,76,0.07)' },
  card_arabian:  { bg1: '#0D0A2A', bg2: '#06040F', accent: '#6B8AFF', glow: 'rgba(107,138,255,0.08)' },
  card_desert:   { bg1: '#2A1208', bg2: '#180800', accent: '#E8903A', glow: 'rgba(232,144,58,0.09)' },
  card_pearl:    { bg1: '#1C1E24', bg2: '#0E1018', accent: '#D0D8E8', glow: 'rgba(208,216,232,0.07)' },
  card_uae:      { bg1: '#061A0C', bg2: '#020C05', accent: '#50C878', glow: 'rgba(80,200,120,0.08)' },
  card_galaxy:   { bg1: '#120828', bg2: '#06021A', accent: '#A06EFF', glow: 'rgba(160,110,255,0.09)' },
};

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
};
const RED_SUITS = ['hearts', 'diamonds'];

// Same labelling rules as the cards-preview page.
function labelFor(rank: string, suit: string): string {
  if (rank === 'A') return '1';
  if (rank === '10' && RED_SUITS.includes(suit)) return '0';
  if (rank === 'J') return '11';
  if (rank === 'Q') return '12';
  if (rank === 'K') return '13';
  return rank;
}
function specialOf(rank: string, suit: string): 'K' | 'J' | 'Q_RED' | 'TEN_RED' | null {
  if (rank === 'K') return 'K';
  if (rank === 'J') return 'J';
  if (rank === 'Q' && RED_SUITS.includes(suit)) return 'Q_RED';
  if (rank === '10' && RED_SUITS.includes(suit)) return 'TEN_RED';
  return null;
}

const ARABIC_FONT = "'Tajawal','Cairo','Noto Sans Arabic','SF Arabic','Arial',sans-serif";

// ─── Special card illustrations ─────────────────────────────────────────────
function SwapIllustration({ ink, accent, accent2 }: { ink: string; accent: string; accent2: string }) {
  return (
    <g transform="translate(50 70)">
      <path d="M -16 -22 Q 0 -32 16 -22" stroke={accent2} strokeWidth={2} fill="none" strokeLinecap="round"/>
      <polygon points="16,-22 11,-26 12,-19" fill={accent2}/>
      <path d="M 16 22 Q 0 32 -16 22" stroke={accent} strokeWidth={2} fill="none" strokeLinecap="round"/>
      <polygon points="-16,22 -11,26 -12,19" fill={accent}/>
      <g transform="translate(-14 0) rotate(-12)">
        <rect x={-9} y={-14} width={18} height={28} rx={2.5} fill="#FFF" stroke={ink} strokeWidth={1.1}/>
        <text x={0} y={4} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="14" fill={accent2}>A</text>
      </g>
      <g transform="translate(14 0) rotate(12)">
        <rect x={-9} y={-14} width={18} height={28} rx={2.5} fill="#FFF" stroke={ink} strokeWidth={1.1}/>
        <text x={0} y={4} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="14" fill={ink}>K</text>
      </g>
    </g>
  );
}
function PullIllustration({ ink, accent, accent2 }: { ink: string; accent: string; accent2: string }) {
  return (
    <g transform="translate(50 70)">
      <path d="M -22 -22 Q -4 -28 12 -16" stroke={accent2} strokeWidth={1.8} fill="none" strokeLinecap="round"/>
      <polygon points="12,-16 7,-20 8,-13" fill={accent2}/>
      <g transform="translate(-20 0)">
        {[2, 1, 0].map(i => (
          <rect key={i} x={-7 + i * 0.6} y={-13 + i * 0.6} width={14} height={24} rx={2} fill="#080318" stroke={accent} strokeWidth={0.7}/>
        ))}
        <text x={0} y={2} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="9" fill={accent}>♢</text>
      </g>
      <g transform="translate(6 -2) rotate(-14)">
        <rect x={-9} y={-14} width={18} height={28} rx={2.5} fill="#FFF" stroke={ink} strokeWidth={1.1}/>
        <text x={0} y={4} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="14" fill={accent2}>A</text>
      </g>
      <g transform="translate(20 4) rotate(14)">
        <rect x={-9} y={-14} width={18} height={28} rx={2.5} fill="#FFF" stroke={ink} strokeWidth={1.1}/>
        <text x={0} y={4} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="14" fill={ink}>K</text>
      </g>
      <g transform="translate(26 -20)">
        <circle r={8} fill={accent2} stroke="#FFF" strokeWidth={1.4}/>
        <text y={3} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="900" fontSize="10" fill="#FFF">2</text>
      </g>
    </g>
  );
}
function PeekIllustration({ ink, accent, accent2 }: { ink: string; accent: string; accent2: string }) {
  return (
    <g transform="translate(50 72)">
      <ellipse cx={0} cy={6} rx={28} ry={6} fill={accent} opacity={0.18}/>
      <rect x={-22} y={-22} width={44} height={36} rx={4} fill={ink} stroke={accent} strokeWidth={1.5}/>
      <g opacity="0.35" stroke={accent} strokeWidth={0.7} fill="none">
        <path d="M -14 -16 L 14 12 M 14 -16 L -14 12"/>
        <circle cx={0} cy={-2} r={5}/>
      </g>
      <g>
        <path d="M -22 14 L 4 14 L -22 -8 Z" fill="#FFF" stroke={ink} strokeWidth={1.3}/>
        <text x={-12} y={9} fontFamily="Georgia, serif" fontWeight="900" fontSize="13" fill={accent2}>?</text>
        <line x1={-22} y1={-8} x2={4} y2={14} stroke={ink} strokeWidth={1} opacity={0.55}/>
      </g>
      <g transform="translate(-26 -10) rotate(-25)">
        <path d="M 0 0 Q 4 -3 8 -1 L 6 3 L 10 4 L 4 8 Z" fill={accent} stroke={ink} strokeWidth={0.6}/>
      </g>
    </g>
  );
}
function LuckIllustration({ ink, accent, accent2 }: { ink: string; accent: string; accent2: string }) {
  return (
    <g transform="translate(50 72)">
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
      <g transform="translate(0 -30)">
        <rect x={-18} y={-6} width={36} height={12} rx={6} fill={accent2} opacity={0.95}/>
      </g>
      <text y={16} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="900" fontSize="64"
        fill="none" stroke={accent} strokeWidth={4} opacity={0.45}>0</text>
      <text y={16} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="900" fontSize="64"
        fill={ink}>0</text>
    </g>
  );
}

// ─── Card face SVG (the new Check design) ───────────────────────────────────
// Memoised: same rank+suit → same SVG output. Skips the (sizeable) re-render
// on every state change for cards that haven't actually changed face.
const CardFaceSVG = memo(function CardFaceSVG({ rank, suit }: { rank: string; suit: string }) {
  const red = RED_SUITS.includes(suit);
  const ink = red ? '#9B1C1C' : '#0E1B2C';
  const accent = '#C9A84C';
  const accent2 = red ? '#E04030' : '#1B6B3F';
  const label = labelFor(rank, suit);
  const special = specialOf(rank, suit);

  return (
    <svg width="100%" height="100%" viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
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

      <rect x="0" y="0" width="100" height="150" rx="8" fill={`url(#bg-${rank}-${suit})`} stroke={accent} strokeWidth="1"/>
      <rect x="3.5" y="3.5" width="93" height="143" rx="6" fill="none" stroke={accent} strokeWidth="0.6" opacity="0.6"/>

      <g opacity="0.6" stroke={accent} strokeWidth="0.5" fill="none">
        <path d="M 16 14 L 24 18 L 32 14 L 40 18 L 48 14 L 56 18 L 64 14 L 72 18 L 80 14 L 84 14"/>
      </g>
      <g opacity="0.6" stroke={accent} strokeWidth="0.5" fill="none" transform="rotate(180 50 75)">
        <path d="M 16 14 L 24 18 L 32 14 L 40 18 L 48 14 L 56 18 L 64 14 L 72 18 L 80 14 L 84 14"/>
      </g>

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

      {[[12, 12], [88, 12], [12, 138], [88, 138]].map(([cx, cy], i) => (
        <g key={i}>
          {Array.from({ length: 4 }).map((_, j) => {
            const a = (j / 4) * Math.PI * 2;
            return <circle key={j} cx={cx + Math.cos(a) * 2.6} cy={cy + Math.sin(a) * 2.6} r="1.4" fill={accent} opacity="0.55"/>;
          })}
          <circle cx={cx} cy={cy} r="1.2" fill={accent2}/>
        </g>
      ))}

      {/* Corner ranks (top-left + bottom-right, both upright) */}
      <g>
        <text x="14" y="22" fontFamily="Georgia, serif" fontWeight="800"
          fontSize={label.length > 1 ? 12 : 16} fill={ink} textAnchor="middle">{label}</text>
        <text x="14" y="36" fontSize="12" fill={ink} textAnchor="middle">{SUIT_SYMBOLS[suit]}</text>
      </g>
      <g>
        <text x="86" y="124" fontFamily="Georgia, serif" fontWeight="800"
          fontSize={label.length > 1 ? 12 : 16} fill={ink} textAnchor="middle">{label}</text>
        <text x="86" y="138" fontSize="12" fill={ink} textAnchor="middle">{SUIT_SYMBOLS[suit]}</text>
      </g>

      <circle cx={50} cy={75} r={32} fill={`url(#glow-${rank}-${suit})`}/>
      <circle cx={50} cy={75} r={26} fill="none" stroke={accent} strokeWidth="0.7" opacity="0.4" strokeDasharray="2 2"/>

      {!special && (
        <text x={50} y={92} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800"
          fontSize={label.length === 1 ? 64 : 50} fill={ink} style={{ letterSpacing: -1 }}>
          {label}
        </text>
      )}
      {special === 'J' && <SwapIllustration ink={ink} accent={accent} accent2={accent2}/>}
      {special === 'K' && <PullIllustration ink={ink} accent={accent} accent2={accent2}/>}
      {special === 'Q_RED' && <PeekIllustration ink={ink} accent={accent} accent2={accent2}/>}
      {special === 'TEN_RED' && <LuckIllustration ink={ink} accent={accent} accent2={accent2}/>}

      {/* CHECK brand pill */}
      <g>
        <rect x="32" y="135" width="36" height="9" rx="4.5" fill={ink} opacity="0.88"/>
        <text x="50" y="141.5" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800" fontSize="6" letterSpacing="2" fill={accent}>CHECK</text>
      </g>
    </svg>
  );
});

// ─── Emirati card back SVG (kept as-is) ─────────────────────────────────────
const CardBack = memo(function CardBack({ backId = 'card_classic' }: { backId?: string }) {
  const t = CARD_BACK_THEMES[backId] || CARD_BACK_THEMES.card_classic;
  const uid = backId.replace(/_/g, '');
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 150" style={{ position: 'absolute', inset: 0 }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`cb2-bg-${uid}`} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor={t.bg1}/>
          <stop offset="100%" stopColor={t.bg2}/>
        </linearGradient>
        <radialGradient id={`cb2-glow-${uid}`} cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor={t.glow}/>
          <stop offset="100%" stopColor="rgba(0,0,0,0)"/>
        </radialGradient>
        <pattern id="cb2-grid" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="0.5" fill="rgba(201,168,76,0.10)"/>
        </pattern>
      </defs>
      <rect width="100" height="150" fill={`url(#cb2-bg-${uid})`}/>
      <rect width="100" height="150" fill={`url(#cb2-glow-${uid})`}/>
      <rect width="100" height="150" fill="url(#cb2-grid)"/>
      <rect x="3" y="3" width="94" height="144" rx="4" fill="none" stroke={t.accent} strokeWidth="0.9" opacity="0.75"/>
      <rect x="6" y="6" width="88" height="138" rx="2.5" fill="none" stroke={t.accent} strokeWidth="0.4" opacity="0.3"/>
      {/* (Removed corner brackets, corner diamonds and the top-center moon —
          they were reading like dents at small sizes.) */}
      <g transform="translate(50,72)">
        <circle r="20" fill="none" stroke={t.accent} strokeWidth="0.4" opacity="0.12"/>
        <circle r="14" fill="none" stroke={t.accent} strokeWidth="0.35" opacity="0.15"/>
        <path d="M0,-13 L3,-3 L13,0 L3,3 L0,13 L-3,3 L-13,0 L-3,-3 Z" fill="none" stroke={t.accent} strokeWidth="0.7" opacity="0.65"/>
        <path d="M0,-13 L3,-3 L13,0 L3,3 L0,13 L-3,3 L-13,0 L-3,-3 Z" fill="none" stroke="#C9A84C" strokeWidth="0.5" opacity="0.35" transform="rotate(45)"/>
        <path d="M0,-6.5 L1.5,-1.5 L6.5,0 L1.5,1.5 L0,6.5 L-1.5,1.5 L-6.5,0 L-1.5,-1.5 Z" fill={t.accent} fillOpacity="0.18" stroke={t.accent} strokeWidth="0.5" opacity="0.7"/>
        <circle r="1.8" fill={t.accent} opacity="0.5"/>
      </g>
      <text x="50" y="99" textAnchor="middle" fill={t.accent} fontSize="7.5" fontFamily="Georgia, 'Times New Roman', serif" fontWeight="bold" letterSpacing="4" opacity="0.75">CHECK</text>
      <line x1="16" y1="103" x2="84" y2="103" stroke={t.accent} strokeWidth="0.4" opacity="0.2"/>
      <g fill={t.accent} opacity="0.18" transform="translate(50,145)">
        <rect x="-0.6" y="-42" width="1.2" height="10"/>
        <rect x="-1.5" y="-32" width="3" height="5"/>
        <rect x="-2.5" y="-27" width="5" height="4"/>
        <rect x="-3.5" y="-23" width="7" height="4"/>
        <rect x="-4.5" y="-19" width="9" height="4"/>
        <rect x="-5.5" y="-15" width="11" height="4"/>
        <rect x="-6.5" y="-11" width="13" height="4"/>
        <rect x="-7.5" y="-7" width="15" height="7"/>
      </g>
      <rect x="18" y="122" width="6" height="23" fill={t.accent} opacity="0.09"/>
      <rect x="24" y="128" width="4" height="17" fill={t.accent} opacity="0.07"/>
      <rect x="72" y="125" width="4" height="20" fill={t.accent} opacity="0.07"/>
      <rect x="76" y="130" width="6" height="15" fill={t.accent} opacity="0.09"/>
      <line x1="12" y1="145" x2="88" y2="145" stroke={t.accent} strokeWidth="0.5" opacity="0.18"/>
    </svg>
  );
});

export function PlayingCard({ card, faceDown = false, onClick, highlight = 'none', small, mini, xmini, backId }: Props) {
  const showFront = card && !faceDown && card.isRevealed;
  const w = xmini ? 36 : mini ? 52 : small ? 72 : 100;
  const special = card ? specialOf(card.rank, card.suit) : null;

  // Highlight is shown via outline + glow only — NOT a scale transform.
  // Scaling one card in a grid made it visually bigger than the others
  // and the user asked for all hand cards to be exactly the same size.
  const highlightStyle = highlight === 'burn'
    ? { boxShadow: '0 0 0 2px #C9A84C, 0 0 14px rgba(201,168,76,0.85)' }
    : highlight === 'select'
    ? { boxShadow: '0 0 0 2px #50C878, 0 0 14px rgba(80,200,120,0.85)' }
    : {};

  // Action label (only on the larger sizes — the text would be illegible on
  // mini cards anyway, and it keeps small layouts clean).
  const showActionLabel = !xmini && !mini && special !== null;
  const actionLabel = special === 'J' ? 'بدّل كرت'
                    : special === 'Q_RED' ? 'اكشف'
                    : special === 'K' ? 'اسحب كرتين'
                    : null;
  const showLuckBanner = !xmini && !mini && special === 'TEN_RED';

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.1 } : {}}
      whileTap={onClick ? { scale: 0.93 } : {}}
      onClick={onClick}
      className={`relative rounded-lg select-none transition-all duration-200 ${onClick ? 'cursor-pointer' : ''} overflow-hidden`}
      style={{
        width: w,
        aspectRatio: '2/3',
        ...highlightStyle,
      }}
    >
      {!card ? (
        <div className="w-full h-full rounded-lg border-2 flex items-center justify-center"
          style={{ background: '#080318', borderColor: 'rgba(201,168,76,0.55)' }}>
          <span className="text-gold/20" style={{ fontSize: xmini ? 7 : mini ? 8 : 18 }}>?</span>
        </div>
      ) : faceDown || !card.isRevealed ? (
        <div className="w-full h-full rounded-lg overflow-hidden border-2"
          style={{ background: '#080318', borderColor: 'rgba(201,168,76,0.55)', position: 'relative' }}>
          <CardBack backId={backId} />
        </div>
      ) : (
        <div className="relative w-full h-full">
          <CardFaceSVG rank={card.rank} suit={card.suit} />
          {/* HTML overlays for Arabic on bigger sizes only */}
          {showLuckBanner && (
            <>
              <div dir="rtl" style={{
                position: 'absolute', left: '32%', top: '24%', width: '36%', height: '8%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#FFF', fontWeight: 900, fontSize: w * 0.058,
                fontFamily: ARABIC_FONT, lineHeight: 1, pointerEvents: 'none',
              }}>حظك حلو</div>
              <div dir="rtl" style={{
                position: 'absolute', left: '20%', top: '74%', width: '60%',
                textAlign: 'center', color: '#E04030', fontWeight: 800,
                fontSize: w * 0.082, fontFamily: ARABIC_FONT, letterSpacing: 1,
                lineHeight: 1, pointerEvents: 'none',
              }}>صفر</div>
            </>
          )}
          {showActionLabel && actionLabel && (
            <div dir="rtl" style={{
              position: 'absolute', left: '15%', top: '78%', width: '70%',
              textAlign: 'center',
              color: RED_SUITS.includes(card.suit) ? '#E04030' : '#1B6B3F',
              fontWeight: 800, fontSize: w * 0.072,
              fontFamily: ARABIC_FONT, lineHeight: 1, pointerEvents: 'none',
            }}>{actionLabel}</div>
          )}
        </div>
      )}
    </motion.div>
  );
}
