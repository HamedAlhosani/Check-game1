import { motion } from 'framer-motion';
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

const CARD_BACK_THEMES: Record<string, { bg1: string; bg2: string; accent: string; glow: string }> = {
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

// ─── Emirati card back SVG ────────────────────────────────────────────────────
function CardBack({ backId = 'card_classic' }: { backId?: string }) {
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
      {/* Background */}
      <rect width="100" height="150" fill={`url(#cb2-bg-${uid})`}/>
      <rect width="100" height="150" fill={`url(#cb2-glow-${uid})`}/>
      <rect width="100" height="150" fill="url(#cb2-grid)"/>
      {/* Outer border */}
      <rect x="3" y="3" width="94" height="144" rx="4" fill="none" stroke={t.accent} strokeWidth="0.9" opacity="0.75"/>
      {/* Inner border */}
      <rect x="6" y="6" width="88" height="138" rx="2.5" fill="none" stroke={t.accent} strokeWidth="0.4" opacity="0.3"/>
      {/* Corner ornaments */}
      <path d="M9,9 L18,9 M9,9 L9,18" stroke={t.accent} strokeWidth="0.8" opacity="0.55" strokeLinecap="round"/>
      <path d="M91,9 L82,9 M91,9 L91,18" stroke={t.accent} strokeWidth="0.8" opacity="0.55" strokeLinecap="round"/>
      <path d="M9,141 L18,141 M9,141 L9,132" stroke={t.accent} strokeWidth="0.8" opacity="0.55" strokeLinecap="round"/>
      <path d="M91,141 L82,141 M91,141 L91,132" stroke={t.accent} strokeWidth="0.8" opacity="0.55" strokeLinecap="round"/>
      {/* Corner diamonds */}
      <polygon points="9,9 11,11 9,13 7,11" fill={t.accent} opacity="0.4"/>
      <polygon points="91,9 93,11 91,13 89,11" fill={t.accent} opacity="0.4"/>
      <polygon points="9,141 11,139 9,137 7,139" fill={t.accent} opacity="0.4"/>
      <polygon points="91,141 93,139 91,137 89,139" fill={t.accent} opacity="0.4"/>
      {/* Crescent moon top center */}
      <path d="M50,17 A7,7 0 1,1 56.5,21.5 A5.5,5.5 0 1,0 50,17 Z" fill={t.accent} opacity="0.35"/>
      {/* Small stars near crescent */}
      <polygon points="44,15 44.6,17 46.2,17 44.9,18.1 45.4,19.7 44,18.6 42.6,19.7 43.1,18.1 41.8,17 43.4,17" fill={t.accent} opacity="0.25" transform="scale(0.55) translate(33.5,12)"/>
      <polygon points="56,15 56.6,17 58.2,17 56.9,18.1 57.4,19.7 56,18.6 54.6,19.7 55.1,18.1 53.8,17 55.4,17" fill={t.accent} opacity="0.25" transform="scale(0.55) translate(45.5,12)"/>
      {/* 8-point geometric star — center */}
      <g transform="translate(50,72)">
        <circle r="20" fill="none" stroke={t.accent} strokeWidth="0.4" opacity="0.12"/>
        <circle r="14" fill="none" stroke={t.accent} strokeWidth="0.35" opacity="0.15"/>
        {/* Outer star */}
        <path d="M0,-13 L3,-3 L13,0 L3,3 L0,13 L-3,3 L-13,0 L-3,-3 Z" fill="none" stroke={t.accent} strokeWidth="0.7" opacity="0.65"/>
        {/* Rotated star */}
        <path d="M0,-13 L3,-3 L13,0 L3,3 L0,13 L-3,3 L-13,0 L-3,-3 Z" fill="none" stroke="#C9A84C" strokeWidth="0.5" opacity="0.35" transform="rotate(45)"/>
        {/* Inner solid star */}
        <path d="M0,-6.5 L1.5,-1.5 L6.5,0 L1.5,1.5 L0,6.5 L-1.5,1.5 L-6.5,0 L-1.5,-1.5 Z" fill={t.accent} fillOpacity="0.18" stroke={t.accent} strokeWidth="0.5" opacity="0.7"/>
        <circle r="1.8" fill={t.accent} opacity="0.5"/>
        {/* Radial spokes */}
        <line x1="0" y1="-19" x2="0" y2="-14" stroke={t.accent} strokeWidth="0.4" opacity="0.25"/>
        <line x1="0" y1="19" x2="0" y2="14" stroke={t.accent} strokeWidth="0.4" opacity="0.25"/>
        <line x1="-19" y1="0" x2="-14" y2="0" stroke={t.accent} strokeWidth="0.4" opacity="0.25"/>
        <line x1="19" y1="0" x2="14" y2="0" stroke={t.accent} strokeWidth="0.4" opacity="0.25"/>
        <line x1="-13.4" y1="-13.4" x2="-9.9" y2="-9.9" stroke={t.accent} strokeWidth="0.4" opacity="0.18"/>
        <line x1="13.4" y1="-13.4" x2="9.9" y2="-9.9" stroke={t.accent} strokeWidth="0.4" opacity="0.18"/>
        <line x1="-13.4" y1="13.4" x2="-9.9" y2="9.9" stroke={t.accent} strokeWidth="0.4" opacity="0.18"/>
        <line x1="13.4" y1="13.4" x2="9.9" y2="9.9" stroke={t.accent} strokeWidth="0.4" opacity="0.18"/>
      </g>
      {/* CHECK text */}
      <text x="50" y="99" textAnchor="middle" fill={t.accent} fontSize="7.5" fontFamily="Georgia, 'Times New Roman', serif" fontWeight="bold" letterSpacing="4" opacity="0.75">CHECK</text>
      {/* Horizontal divider lines */}
      <line x1="16" y1="103" x2="84" y2="103" stroke={t.accent} strokeWidth="0.4" opacity="0.2"/>
      {/* Burj Khalifa silhouette */}
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
      {/* Side buildings */}
      <rect x="18" y="122" width="6" height="23" fill={t.accent} opacity="0.09"/>
      <rect x="24" y="128" width="4" height="17" fill={t.accent} opacity="0.07"/>
      <rect x="72" y="125" width="4" height="20" fill={t.accent} opacity="0.07"/>
      <rect x="76" y="130" width="6" height="15" fill={t.accent} opacity="0.09"/>
      <line x1="12" y1="145" x2="88" y2="145" stroke={t.accent} strokeWidth="0.5" opacity="0.18"/>
    </svg>
  );
}

export function PlayingCard({ card, faceDown = false, onClick, highlight = 'none', small, mini, xmini, backId }: Props) {
  const isRed = card && RED_SUITS.includes(card.suit);
  const showFront = card && !faceDown && card.isRevealed;

  const highlightStyle = highlight === 'burn'
    ? { boxShadow: '0 0 12px rgba(201,168,76,0.7)', borderColor: '#C9A84C', transform: 'scale(1.07)' }
    : highlight === 'select'
    ? { boxShadow: '0 0 12px rgba(80,200,120,0.7)', borderColor: '#50C878', transform: 'scale(1.07)' }
    : {};

  const w = xmini ? 36 : mini ? 52 : small ? 72 : 100;

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
        <span className="text-gold/20 z-10 relative" style={{ fontSize: xmini ? 7 : mini ? 8 : 18 }}>?</span>
      ) : faceDown || !card.isRevealed ? (
        <CardBack backId={backId} />
      ) : (
        <div className="flex flex-col items-center justify-center h-full z-10 relative"
          style={{ padding: mini ? 1 : 2 }}>
          <span style={{
            fontWeight: 800,
            fontSize: xmini ? 9 : mini ? 11 : small ? 16 : 22,
            lineHeight: 1,
            color: isRed ? '#B91C1C' : '#111827',
            fontFamily: 'Georgia, serif',
          }}>
            {card.rank}
          </span>
          <span style={{
            fontSize: xmini ? 11 : mini ? 14 : small ? 19 : 28,
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
