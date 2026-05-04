import { motion } from 'framer-motion';
import { Card } from '@check-game/shared';

interface Props {
  card: Card | null;
  faceDown?: boolean;
  onClick?: () => void;
  highlight?: 'burn' | 'select' | 'none';
  small?: boolean;
  mini?: boolean;
}

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
};
const RED_SUITS = ['hearts', 'diamonds'];

// ─── Emirati card back SVG ────────────────────────────────────────────────────
function CardBack() {
  return (
    <svg
      width="100%" height="100%"
      viewBox="0 0 100 150"
      style={{ position: 'absolute', inset: 0 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="cb-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#080318"/>
          <stop offset="55%" stopColor="#140800"/>
          <stop offset="100%" stopColor="#2A1000"/>
        </linearGradient>
        <linearGradient id="cb-dune1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7A4510"/>
          <stop offset="100%" stopColor="#3D1E05"/>
        </linearGradient>
        <linearGradient id="cb-dune2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5A3008"/>
          <stop offset="100%" stopColor="#220E02"/>
        </linearGradient>
        <radialGradient id="cb-glow" cx="50%" cy="42%" r="40%">
          <stop offset="0%" stopColor="rgba(201,168,76,0.08)"/>
          <stop offset="100%" stopColor="rgba(201,168,76,0)"/>
        </radialGradient>
      </defs>

      {/* Sky */}
      <rect width="100" height="150" fill="url(#cb-sky)"/>
      {/* Center glow */}
      <rect width="100" height="150" fill="url(#cb-glow)"/>

      {/* Stars */}
      <circle cx="12" cy="10" r="0.55" fill="white" opacity="0.85"/>
      <circle cx="28" cy="6"  r="0.7"  fill="white" opacity="0.75"/>
      <circle cx="42" cy="13" r="0.5"  fill="white" opacity="0.9"/>
      <circle cx="58" cy="7"  r="0.65" fill="white" opacity="0.8"/>
      <circle cx="72" cy="14" r="0.5"  fill="white" opacity="0.7"/>
      <circle cx="88" cy="5"  r="0.6"  fill="white" opacity="0.85"/>
      <circle cx="20" cy="20" r="0.45" fill="white" opacity="0.65"/>
      <circle cx="50" cy="18" r="0.55" fill="white" opacity="0.7"/>
      <circle cx="80" cy="22" r="0.45" fill="white" opacity="0.65"/>
      <circle cx="93" cy="16" r="0.5"  fill="white" opacity="0.75"/>
      <circle cx="6"  cy="26" r="0.4"  fill="white" opacity="0.6"/>
      <circle cx="35" cy="24" r="0.4"  fill="white" opacity="0.55"/>
      <circle cx="65" cy="20" r="0.5"  fill="white" opacity="0.7"/>

      {/* Crescent moon */}
      <circle cx="82" cy="14" r="5.5" fill="#C9A84C" opacity="0.88"/>
      <circle cx="85" cy="12" r="4.4" fill="#080318"/>
      {/* Star next to moon */}
      <polygon points="91,8 92,11 95,11 92.5,13 93.5,16 91,14.2 88.5,16 89.5,13 87,11 90,11"
        fill="#E8C97A" opacity="0.7" transform="scale(0.55) translate(75,5)"/>

      {/* Outer gold border */}
      <rect x="3.5" y="3.5" width="93" height="143" rx="3.5" fill="none" stroke="#C9A84C" strokeWidth="0.9" opacity="0.75"/>
      {/* Inner border */}
      <rect x="6" y="6" width="88" height="138" rx="2" fill="none" stroke="#C9A84C" strokeWidth="0.35" opacity="0.4"/>

      {/* Corner bracket ornaments */}
      <path d="M3.5,16 L3.5,3.5 L16,3.5"  fill="none" stroke="#E8C97A" strokeWidth="1.4"/>
      <path d="M96.5,16 L96.5,3.5 L84,3.5" fill="none" stroke="#E8C97A" strokeWidth="1.4"/>
      <path d="M3.5,134 L3.5,146.5 L16,146.5"  fill="none" stroke="#E8C97A" strokeWidth="1.4"/>
      <path d="M96.5,134 L96.5,146.5 L84,146.5" fill="none" stroke="#E8C97A" strokeWidth="1.4"/>

      {/* Corner diamond dots */}
      <path d="M10,3.5 L12.2,5.7 L10,7.9 L7.8,5.7 Z" fill="#C9A84C" opacity="0.65"/>
      <path d="M90,3.5 L92.2,5.7 L90,7.9 L87.8,5.7 Z" fill="#C9A84C" opacity="0.65"/>
      <path d="M10,142.1 L12.2,144.3 L10,146.5 L7.8,144.3 Z" fill="#C9A84C" opacity="0.65"/>
      <path d="M90,142.1 L92.2,144.3 L90,146.5 L87.8,144.3 Z" fill="#C9A84C" opacity="0.65"/>

      {/* ── CHECK text center ── */}
      {/* Top decorative line */}
      <path d="M22,57 Q50,53 78,57" fill="none" stroke="#C9A84C" strokeWidth="0.5" opacity="0.55"/>
      {/* Diamond left */}
      <path d="M18,60 L21,63 L18,66 L15,63 Z" fill="#C9A84C" opacity="0.55"/>
      {/* Diamond right */}
      <path d="M82,60 L85,63 L82,66 L79,63 Z" fill="#C9A84C" opacity="0.55"/>
      {/* CHECK */}
      <text x="50" y="68" textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="11" fontWeight="bold" letterSpacing="3.5"
        fill="#E8C97A">CHECK</text>
      {/* Bottom decorative line */}
      <path d="M22,72 Q50,76 78,72" fill="none" stroke="#C9A84C" strokeWidth="0.5" opacity="0.55"/>

      {/* Arabesque center medallion (subtle, behind text) */}
      <circle cx="50" cy="63" r="16" fill="none" stroke="#C9A84C" strokeWidth="0.35" opacity="0.22"/>
      <path d="M50,47 L66,63 L50,79 L34,63 Z" fill="none" stroke="#C9A84C" strokeWidth="0.3" opacity="0.18"/>

      {/* ── Desert scene ── */}
      {/* Sand dune layer 1 */}
      <path d="M0,108 Q18,98 35,104 Q52,110 68,102 Q84,94 100,100 L100,150 L0,150 Z"
        fill="url(#cb-dune1)" opacity="0.88"/>
      {/* Sand dune layer 2 */}
      <path d="M0,120 Q25,112 48,118 Q68,123 85,113 Q92,109 100,112 L100,150 L0,150 Z"
        fill="url(#cb-dune2)"/>
      {/* Sand dune layer 3 (foreground) */}
      <path d="M0,132 Q30,125 55,130 Q75,134 100,122 L100,150 L0,150 Z"
        fill="#1E0A02" opacity="0.95"/>

      {/* Palm tree left */}
      <path d="M18,128 C17,118 18,108 17,100"
        stroke="#4A2808" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      <path d="M17,100 C10,93 4,88 0,85"   stroke="#1C4A1C" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M17,100 C15,92 14,85 15,79"  stroke="#1C4A1C" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M17,100 C22,92 27,87 31,84"  stroke="#1C4A1C" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M17,100 C11,97 6,100 2,106"  stroke="#1C4A1C" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
      <path d="M17,100 C23,97 28,101 33,107" stroke="#1C4A1C" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
      <circle cx="16" cy="98" r="1.2" fill="#6B2D0A"/>

      {/* Palm tree right */}
      <path d="M82,130 C83,120 81,110 82,102"
        stroke="#3D2005" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M82,102 C74,95 68,90 63,87"  stroke="#1A421A" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
      <path d="M82,102 C80,94 79,87 80,81"  stroke="#1A421A" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
      <path d="M82,102 C87,94 91,89 95,86"  stroke="#1A421A" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
      <path d="M82,102 C76,99 71,103 67,109" stroke="#1A421A" strokeWidth="1.0" fill="none" strokeLinecap="round"/>
      <path d="M82,102 C87,99 91,104 95,110" stroke="#1A421A" strokeWidth="1.0" fill="none" strokeLinecap="round"/>
      <circle cx="82" cy="100" r="1.1" fill="#6B2D0A"/>

      {/* Bedouin tent (بيت الشعر) — center */}
      <path d="M38,118 L30,112 L34,106 L50,103 L66,106 L70,112 L62,118 Z"
        fill="#2A1205" opacity="0.88"/>
      {/* Tent poles */}
      <rect x="34.5" y="106" width="1.8" height="12" fill="#3D1A08" opacity="0.85"/>
      <rect x="63.7" y="106" width="1.8" height="12" fill="#3D1A08" opacity="0.85"/>
      {/* Tent entrance */}
      <path d="M49,118 L45.5,110 L54.5,110 L51,118 Z" fill="#140802"/>
      {/* Tent ropes */}
      <path d="M30,112 L24,116" stroke="#3D1A08" strokeWidth="0.7" fill="none" opacity="0.7"/>
      <path d="M70,112 L76,116" stroke="#3D1A08" strokeWidth="0.7" fill="none" opacity="0.7"/>
      {/* Gold stripe */}
      <path d="M30,112 L70,112" stroke="#C9A84C" strokeWidth="0.5" opacity="0.35"/>

      {/* Small camel silhouette */}
      <g fill="#3D1E08" opacity="0.55" transform="translate(43,122) scale(0.18)">
        <ellipse cx="58" cy="30" rx="48" ry="20"/>
        <ellipse cx="46" cy="14" rx="18" ry="14"/>
        <path d="M85,22 C90,12 93,4 91,0" stroke="#3D1E08" strokeWidth="9" fill="none" strokeLinecap="round"/>
        <ellipse cx="89" cy="-3" rx="9" ry="7"/>
        <rect x="20" y="46" width="7" height="22" rx="3"/>
        <rect x="36" y="46" width="7" height="26" rx="3"/>
        <rect x="65" y="46" width="7" height="26" rx="3"/>
        <rect x="81" y="46" width="7" height="22" rx="3"/>
      </g>
    </svg>
  );
}

export function PlayingCard({ card, faceDown = false, onClick, highlight = 'none', small, mini }: Props) {
  const isRed = card && RED_SUITS.includes(card.suit);
  const showFront = card && !faceDown && card.isRevealed;

  const highlightStyle = highlight === 'burn'
    ? { boxShadow: '0 0 12px rgba(201,168,76,0.7)', borderColor: '#C9A84C', transform: 'scale(1.07)' }
    : highlight === 'select'
    ? { boxShadow: '0 0 12px rgba(80,200,120,0.7)', borderColor: '#50C878', transform: 'scale(1.07)' }
    : {};

  const w = mini ? 52 : small ? 72 : 100;

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.1 } : {}}
      whileTap={onClick ? { scale: 0.93 } : {}}
      onClick={onClick}
      className={`relative rounded-lg border-2 flex items-center justify-center select-none
        transition-all duration-200 ${onClick ? 'cursor-pointer' : ''} overflow-hidden`}
      style={{
        width: w,
        aspectRatio: '2/3',
        ...(!showFront ? {
          background: '#080318',
          borderColor: 'rgba(201,168,76,0.55)',
          ...highlightStyle,
        } : {
          background: 'linear-gradient(160deg, #FFFDF5 0%, #FFF8E8 100%)',
          borderColor: '#D4C49A',
          ...highlightStyle,
        }),
      }}
    >
      {!card ? (
        <span className="text-gold/20 z-10 relative" style={{ fontSize: mini ? 8 : 18 }}>?</span>
      ) : faceDown || !card.isRevealed ? (
        <CardBack />
      ) : (
        <div className="flex flex-col items-center justify-center h-full z-10 relative"
          style={{ padding: mini ? 1 : 2 }}>
          <span style={{
            fontWeight: 800,
            fontSize: mini ? 11 : small ? 16 : 22,
            lineHeight: 1,
            color: isRed ? '#B91C1C' : '#111827',
            fontFamily: 'Georgia, serif',
          }}>
            {card.rank}
          </span>
          <span style={{
            fontSize: mini ? 14 : small ? 19 : 28,
            lineHeight: 1,
            marginTop: mini ? 1 : 2,
            color: isRed ? '#B91C1C' : '#111827',
          }}>
            {SUIT_SYMBOLS[card.suit]}
          </span>
        </div>
      )}
    </motion.div>
  );
}
