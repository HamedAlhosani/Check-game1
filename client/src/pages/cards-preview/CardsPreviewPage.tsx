/**
 * Card design preview — visit /cards-preview to inspect the proposed
 * custom card art before it's wired into the live game.
 */
import { useState } from 'react';

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

const SUIT_GLYPH: Record<Suit, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function isRed(s: Suit): boolean { return s === 'hearts' || s === 'diamonds'; }

/** Returns what should be shown as the card's "rank label" everywhere
 *  (top corner, bottom corner, center for numeric cards). */
function labelFor(rank: Rank, suit: Suit): string {
  if (rank === 'A') return '1';
  if (rank === '10' && isRed(suit)) return '0';
  if (rank === '10') return '10';
  if (rank === 'J') return '11';
  if (rank === 'Q') return '12';
  if (rank === 'K') return '13';
  return rank; // 2..9
}

/** True when the center of the card is dedicated to a special action
 *  (draw 2, swap, peek) instead of a plain rank glyph. */
function specialOf(rank: Rank, suit: Suit): 'K' | 'J' | 'Q_RED' | null {
  if (rank === 'K') return 'K';
  if (rank === 'J') return 'J';
  if (rank === 'Q' && isRed(suit)) return 'Q_RED';
  return null;
}

function CardSVG({ rank, suit, w = 120 }: { rank: Rank; suit: Suit; w?: number }) {
  const h = w * 1.5;
  const red = isRed(suit);
  const ink = red ? '#B91C1C' : '#111827';
  const label = labelFor(rank, suit);
  const special = specialOf(rank, suit);

  return (
    <svg width={w} height={h} viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.45))', borderRadius: 9 }}>
      {/* Card body */}
      <defs>
        <linearGradient id={`bg-${rank}-${suit}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFEF5"/>
          <stop offset="100%" stopColor="#FFF6E0"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="100" height="150" rx="8" fill={`url(#bg-${rank}-${suit})`}
        stroke="#D4C49A" strokeWidth="0.8"/>
      <rect x="3" y="3" width="94" height="144" rx="6" fill="none" stroke="#C9A84C" strokeOpacity="0.18" strokeWidth="0.4"/>

      {/* Top-left corner */}
      <g>
        <text x="8" y="18" fontFamily="Georgia, serif" fontWeight="800" fontSize={label.length > 1 ? 11 : 14} fill={ink}>{label}</text>
        <text x="8" y="29" fontSize="11" fill={ink}>{SUIT_GLYPH[suit]}</text>
      </g>
      {/* Bottom-right corner (rotated 180°) */}
      <g transform="rotate(180 50 75)">
        <text x="8" y="18" fontFamily="Georgia, serif" fontWeight="800" fontSize={label.length > 1 ? 11 : 14} fill={ink}>{label}</text>
        <text x="8" y="29" fontSize="11" fill={ink}>{SUIT_GLYPH[suit]}</text>
      </g>

      {/* Center artwork */}
      {special === 'K' && (
        // King — draw 2 cards
        <g>
          {/* two card silhouettes */}
          <g transform="translate(50 75)">
            <rect x="-22" y="-26" width="22" height="34" rx="3" fill="#0E0905" stroke={ink} strokeWidth="0.8" transform="rotate(-10)"/>
            <rect x="0" y="-26" width="22" height="34" rx="3" fill="#0E0905" stroke={ink} strokeWidth="0.8" transform="rotate(10)"/>
            {/* badge with 2 */}
            <circle cx="0" cy="14" r="9" fill={ink}/>
            <text x="0" y="18" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff">2</text>
          </g>
          <text x="50" y="120" textAnchor="middle" fontFamily="'Tajawal', 'Cairo', sans-serif" fontSize="9" fontWeight="800" fill={ink}>اسحب كرتين</text>
        </g>
      )}
      {special === 'J' && (
        // Jack — swap a card
        <g>
          <g transform="translate(50 70)">
            {/* two cards facing each other with double-arrow */}
            <rect x="-25" y="-15" width="16" height="22" rx="2" fill="#0E0905" stroke={ink} strokeWidth="0.7"/>
            <rect x="9" y="-15" width="16" height="22" rx="2" fill="#0E0905" stroke={ink} strokeWidth="0.7"/>
            {/* arrows */}
            <path d="M-7 -7 L-3 -7 L-3 -10 L1 -4 L-3 2 L-3 -1 L-7 -1 Z" fill={ink}/>
            <path d="M7 7 L3 7 L3 10 L-1 4 L3 -2 L3 1 L7 1 Z" fill={ink}/>
          </g>
          <text x="50" y="120" textAnchor="middle" fontFamily="'Tajawal', 'Cairo', sans-serif" fontSize="9" fontWeight="800" fill={ink}>بدّل كرت</text>
        </g>
      )}
      {special === 'Q_RED' && (
        // Red Queen — peek your own card
        <g>
          <g transform="translate(50 72)">
            {/* eye */}
            <ellipse cx="0" cy="0" rx="22" ry="13" fill="none" stroke={ink} strokeWidth="1.6"/>
            <circle cx="0" cy="0" r="7" fill={ink}/>
            <circle cx="-2" cy="-2" r="2" fill="#fff"/>
            {/* card behind eye */}
            <rect x="-7" y="-22" width="14" height="9" rx="1.5" fill="#fff" stroke={ink} strokeWidth="0.7"/>
            <text x="0" y="-15" textAnchor="middle" fontSize="6" fontWeight="800" fill={ink}>?</text>
          </g>
          <text x="50" y="118" textAnchor="middle" fontFamily="'Tajawal', 'Cairo', sans-serif" fontSize="9" fontWeight="800" fill={ink}>اكشف كرت</text>
        </g>
      )}
      {!special && (
        // Plain numeric cards — big rank label in the centre
        <text x="50" y={86} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="800"
          fontSize={label.length === 1 ? 56 : 44} fill={ink}>
          {label}
        </text>
      )}

      {/* Tiny suit dots flanking the centre rank for numeric cards */}
      {!special && (
        <>
          <text x="22" y="80" textAnchor="middle" fontSize="14" fill={ink} opacity="0.55">{SUIT_GLYPH[suit]}</text>
          <text x="78" y="80" textAnchor="middle" fontSize="14" fill={ink} opacity="0.55">{SUIT_GLYPH[suit]}</text>
        </>
      )}
    </svg>
  );
}

export function CardsPreviewPage() {
  const [size, setSize] = useState(120);
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #1A1408 0%, #0E0905 100%)', padding: '24px 16px 60px' }}>
      <div className="max-w-5xl mx-auto" dir="rtl">
        <h1 className="font-arabic font-bold mb-2" style={{ fontSize: 28, color: '#E8C97A', textAlign: 'center' }}>
          معاينة تصميم الأوراق
        </h1>
        <p className="font-arabic text-center mb-6" style={{ fontSize: 14, color: 'rgba(245,230,200,0.55)' }}>
          A=1, 10 الأحمر=0, J=بدّل كرت, Q الأحمر=اكشف كرت, Q الأسود=12, K=اسحب كرتين
        </p>

        {/* Size slider */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="font-arabic" style={{ color: 'rgba(245,230,200,0.55)', fontSize: 13 }}>الحجم</span>
          <input type="range" min={80} max={180} value={size}
            onChange={e => setSize(Number(e.target.value))}
            style={{ accentColor: '#C9A84C', width: 240 }}/>
          <span className="font-mono" style={{ color: '#E8C97A', fontSize: 13 }}>{size}px</span>
        </div>

        {/* One row per suit */}
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
                <div key={`${rank}-${suit}`} className="flex flex-col items-center gap-1">
                  <CardSVG rank={rank} suit={suit} w={size}/>
                  <span className="font-arabic" style={{ fontSize: 10, color: 'rgba(245,230,200,0.45)' }}>
                    {rank}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}

        <div className="rounded-xl p-4 mt-8" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)' }}>
          <h3 className="font-arabic font-bold mb-2" style={{ color: '#E8C97A' }}>قواعد العرض</h3>
          <ul className="font-arabic text-sm" style={{ color: 'rgba(245,230,200,0.65)', lineHeight: 1.9 }}>
            <li>• <strong>A</strong> يطلع كرقم <strong>1</strong></li>
            <li>• <strong>10</strong> الأحمر (♥/♦) يطلع كرقم <strong>0</strong> · <strong>10</strong> الأسود (♣/♠) يبقى <strong>10</strong></li>
            <li>• <strong>Q</strong> الأحمر (♥/♦) يطلع كرت "<strong>اكشف كرت</strong>" مع رمز عين</li>
            <li>• <strong>Q</strong> الأسود (♣/♠) يطلع كرقم <strong>12</strong></li>
            <li>• <strong>J</strong> (الكل) يطلع كرت "<strong>بدّل كرت</strong>" مع كرتين وأسهم</li>
            <li>• <strong>K</strong> (الكل) يطلع كرت "<strong>اسحب كرتين</strong>" مع كرتين</li>
            <li>• الأرقام <strong>2-9</strong> تبقى أرقام عادية</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
