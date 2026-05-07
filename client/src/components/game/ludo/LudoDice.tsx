import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
  value: number | null;
  rolling?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = { sm: 44, md: 68, lg: 88 } as const;

// ─── Pip layouts ─────────────────────────────────────────────────────────────
// Pip positions on the cube's TOP face, in normalized cube-local coords (0..1
// across the back→front axis and 0..1 across the left→right axis). We then
// project them onto the screen-space rhombus when drawing.
const PIPS: Record<number, [number, number][]> = {
  1: [[0.50, 0.50]],
  2: [[0.30, 0.30], [0.70, 0.70]],
  3: [[0.30, 0.30], [0.50, 0.50], [0.70, 0.70]],
  4: [[0.30, 0.30], [0.70, 0.30], [0.30, 0.70], [0.70, 0.70]],
  5: [[0.30, 0.30], [0.70, 0.30], [0.50, 0.50], [0.30, 0.70], [0.70, 0.70]],
  6: [[0.30, 0.25], [0.70, 0.25], [0.30, 0.50], [0.70, 0.50], [0.30, 0.75], [0.70, 0.75]],
};

// ─── Rhombus geometry for the TOP face (our main pip-bearing surface) ───────
// 100×100 viewBox. The cube is shown from above-front so the TOP face is the
// largest visible surface. Front and right faces sit beneath/right of it as
// thin parallelograms to give the 3D depth cue.
const TOP = {
  back:  { x: 50, y:  8  }, // back-center vertex
  right: { x: 92, y: 32 }, // right-center vertex
  front: { x: 50, y: 56 }, // front-center vertex
  left:  { x:  8, y: 32 }, // left-center vertex
};

// Project (u,v) ∈ [0,1]² in cube-local space onto the screen-space rhombus.
// u = 0 → back-left edge, u = 1 → front-right edge.
// v = 0 → back-right edge, v = 1 → front-left edge.
function projectTop(u: number, v: number): { x: number; y: number } {
  const a = TOP.back;
  const b = TOP.right;
  const d = TOP.left;
  // Bilinear: P = (1-u)(1-v)A + u(1-v)B + uvC + (1-u)vD,  with C derived as A+ (B-A)+(D-A)
  const c = { x: b.x + d.x - a.x, y: b.y + d.y - a.y };
  return {
    x: (1 - u) * (1 - v) * a.x + u * (1 - v) * b.x + u * v * c.x + (1 - u) * v * d.x,
    y: (1 - u) * (1 - v) * a.y + u * (1 - v) * b.y + u * v * c.y + (1 - u) * v * d.y,
  };
}

/**
 * Top-down 3D dice (Ludo Star style). The TOP face is the dominant
 * pip-bearing surface; front + right faces sit below/right as slim
 * parallelograms for depth. The dice always shows a value 1-6 — never a
 * blank or '?' — so the player always knows what's on the die.
 *
 * While `rolling` is true the pip layout cycles through random values
 * every ~80ms, the whole dice wobbles + scales, then locks onto the real
 * value when rolling clears.
 */
export function LudoDice({ value, rolling, onClick, disabled, size = 'md' }: Props) {
  const px = SIZES[size];
  // Always render a real face. Default to 1 so the dice never looks 'empty'.
  const baseValue = value ?? 1;
  const [tumble, setTumble] = useState<number>(baseValue);

  useEffect(() => {
    if (!rolling) {
      setTumble(baseValue);
      return;
    }
    let alive = true;
    const tick = () => {
      if (!alive) return;
      setTumble(1 + Math.floor(Math.random() * 6));
      setTimeout(tick, 80);
    };
    tick();
    return () => { alive = false; };
  }, [rolling, baseValue]);

  const showValue = rolling ? tumble : baseValue;

  return (
    <motion.button
      onClick={!disabled && onClick ? onClick : undefined}
      disabled={disabled}
      animate={rolling
        ? { rotate: [-9, 9, -7, 7, -3, 3, 0], scale: [1, 1.10, 0.96, 1.04, 1] }
        : { rotate: 0, scale: 1 }}
      transition={rolling
        ? { duration: 0.7, ease: 'easeOut' }
        : { duration: 0.3, type: 'spring', stiffness: 320, damping: 20 }}
      whileHover={onClick && !disabled ? { scale: 1.07, y: -2 } : undefined}
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
      aria-label={`Dice ${showValue}`}
    >
      <svg viewBox="0 0 100 100" width={px} height={px} style={{ overflow: 'visible' }}>
        {/* Drop shadow under the dice */}
        <ellipse cx="50" cy="92" rx="34" ry="4" fill="#000" opacity={disabled ? 0.20 : 0.50} />

        {/* Right face — slim parallelogram on the right side of the cube */}
        <path
          d={`M ${TOP.right.x} ${TOP.right.y} L 92 70 L 50 88 L ${TOP.front.x} ${TOP.front.y} Z`}
          fill="#C8C5BD"
          stroke="#7A6303"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* Front-left face — slim parallelogram on the bottom-left */}
        <path
          d={`M ${TOP.left.x} ${TOP.left.y} L ${TOP.front.x} ${TOP.front.y} L 50 88 L 8 70 Z`}
          fill="#E8E5DD"
          stroke="#7A6303"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* TOP face — main rhombus, white, with the pips */}
        <path
          d={`M ${TOP.back.x} ${TOP.back.y} L ${TOP.right.x} ${TOP.right.y} L ${TOP.front.x} ${TOP.front.y} L ${TOP.left.x} ${TOP.left.y} Z`}
          fill="#FFFFFF"
          stroke="#7A6303"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Inner gold bezel for premium feel */}
        <path
          d={`M ${TOP.back.x + 0} ${TOP.back.y + 4} L ${TOP.right.x - 4} ${TOP.right.y} L ${TOP.front.x} ${TOP.front.y - 4} L ${TOP.left.x + 4} ${TOP.left.y} Z`}
          fill="none"
          stroke="#E8C97A"
          strokeWidth="0.7"
          opacity="0.7"
        />

        {/* Pips on the TOP face — projected onto the rhombus plane */}
        {PIPS[showValue]?.map(([u, v], i) => {
          const p = projectTop(u, v);
          return (
            <g key={`${showValue}-${i}`}>
              <circle cx={p.x} cy={p.y} r={4.6}
                fill="#C8323A"
                stroke="#5E1612" strokeWidth="0.8" />
              <circle cx={p.x - 1.2} cy={p.y - 1.2} r={1.4}
                fill="#FFCFD0" opacity="0.85" />
            </g>
          );
        })}

        {/* Glow halo when interactive — surrounds the top face only */}
        {!disabled && onClick && (
          <path
            d={`M ${TOP.back.x} ${TOP.back.y} L ${TOP.right.x} ${TOP.right.y} L ${TOP.front.x} ${TOP.front.y} L ${TOP.left.x} ${TOP.left.y} Z`}
            fill="none"
            stroke="#E8C97A"
            strokeWidth="2"
            opacity="0.85"
            style={{ filter: 'drop-shadow(0 0 8px #E8C97A)' }}
          />
        )}
      </svg>
    </motion.button>
  );
}
