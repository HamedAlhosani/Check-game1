import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
  value: number | null;
  rolling?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = { sm: 40, md: 64, lg: 84 } as const;

// Pip layout per face, normalized 0..1 inside the front square.
const PIPS: Record<number, [number, number][]> = {
  1: [[0.50, 0.50]],
  2: [[0.28, 0.28], [0.72, 0.72]],
  3: [[0.28, 0.28], [0.50, 0.50], [0.72, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.50, 0.50], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.22], [0.72, 0.22], [0.28, 0.50], [0.72, 0.50], [0.28, 0.78], [0.72, 0.78]],
};

/**
 * Isometric SVG dice — Ludo Star inspired. Three visible faces (front,
 * top, right) drawn as flat polygons with a single tilt; pips render on
 * the front face only so the rolled value is *always* visible regardless
 * of device, browser, or 3D-transform support. Much more reliable than
 * the previous CSS-cube approach (which on some browsers could leave the
 * dice rendering blank).
 *
 * While `rolling` is true the front face cycles through random pip
 * layouts every ~80ms and the whole die wobbles + rotates slightly,
 * settling on the actual value when rolling clears.
 */
export function LudoDice({ value, rolling, onClick, disabled, size = 'md' }: Props) {
  const px = SIZES[size];
  const [tumbleValue, setTumbleValue] = useState<number>(value || 1);

  // Cycle pip layouts while rolling
  useEffect(() => {
    if (!rolling) {
      if (value) setTumbleValue(value);
      return;
    }
    let alive = true;
    const tick = () => {
      if (!alive) return;
      setTumbleValue(1 + Math.floor(Math.random() * 6));
      setTimeout(tick, 80);
    };
    tick();
    return () => { alive = false; };
  }, [rolling, value]);

  // Whichever value to draw right now
  const showValue = rolling ? tumbleValue : (value ?? null);

  return (
    <motion.button
      onClick={!disabled && onClick ? onClick : undefined}
      disabled={disabled}
      animate={rolling
        ? { rotate: [-8, 8, -6, 6, -3, 3, 0], scale: [1, 1.08, 0.96, 1.04, 1] }
        : { rotate: 0, scale: 1 }}
      transition={rolling
        ? { duration: 0.7, ease: 'easeOut' }
        : { duration: 0.3, type: 'spring', stiffness: 320, damping: 20 }}
      whileHover={onClick && !disabled ? { scale: 1.06 } : undefined}
      whileTap={onClick && !disabled ? { scale: 0.92 } : undefined}
      className="relative"
      style={{
        width: px,
        height: px,
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: onClick && !disabled ? 'pointer' : 'default',
      }}
      aria-label={value ? `Dice ${value}` : 'Dice'}
    >
      <svg viewBox="0 0 100 100" width={px} height={px} style={{ overflow: 'visible' }}>
        {/* Drop shadow under the dice */}
        <ellipse cx="50" cy="94" rx="32" ry="4" fill="#000" opacity={disabled ? 0.18 : 0.45} />

        {/* Top face — lighter trapezoid */}
        <path d="M 20 22 L 30 10 L 90 10 L 80 22 Z"
          fill="#FFFFFF"
          stroke="#7A6303" strokeWidth="1.2" strokeLinejoin="round" />

        {/* Right face — darker trapezoid */}
        <path d="M 80 22 L 90 10 L 90 78 L 80 90 Z"
          fill="#D8D5CE"
          stroke="#7A6303" strokeWidth="1.2" strokeLinejoin="round" />

        {/* Front face — white square with the pips */}
        <rect x="20" y="22" width="60" height="68" rx="9" ry="9"
          fill="#FAFAF8"
          stroke="#7A6303" strokeWidth="1.4" />

        {/* Inner gold bezel for premium feel */}
        <rect x="22" y="24" width="56" height="64" rx="7" ry="7"
          fill="none" stroke="#E8C97A" strokeWidth="0.6" opacity="0.6" />

        {/* Pips */}
        {showValue && PIPS[showValue]?.map(([x, y], i) => {
          const cx = 20 + x * 60;
          const cy = 22 + y * 68;
          return (
            <g key={`${showValue}-${i}`}>
              <circle cx={cx} cy={cy} r={5.5}
                fill="#C8323A"
                stroke="#5E1612" strokeWidth="0.8" />
              <circle cx={cx - 1.3} cy={cy - 1.3} r={1.6}
                fill="#FFCFD0" opacity="0.85" />
            </g>
          );
        })}

        {/* No value yet — soft '?' so the empty die isn't a blank square */}
        {!showValue && (
          <text x="50" y="62" textAnchor="middle"
            fontSize="32" fontWeight="800" fill="#C9A84C" opacity="0.5">?</text>
        )}

        {/* Glow halo when interactive */}
        {!disabled && onClick && (
          <rect x="20" y="22" width="60" height="68" rx="9" ry="9"
            fill="none" stroke="#E8C97A" strokeWidth="2" opacity="0.7"
            style={{ filter: 'drop-shadow(0 0 6px #E8C97A)' }} />
        )}
      </svg>
    </motion.button>
  );
}
