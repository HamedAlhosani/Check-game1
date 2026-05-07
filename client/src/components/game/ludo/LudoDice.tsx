import { useEffect, useState } from 'react';

interface Props {
  value: number | null;
  rolling?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = { sm: 36, md: 56, lg: 72 } as const;

// Pip layout per face — 0..1 normalized inside the face square.
const FACE_PIPS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.20], [0.75, 0.20], [0.25, 0.50], [0.75, 0.50], [0.25, 0.80], [0.75, 0.80]],
};

// Cube faces wrapping (opposite sums = 7):
// Front = 1, Back = 6, Right = 4, Left = 3, Top = 2, Bottom = 5.
// Each face is positioned by translating along its axis by HALF the cube edge.
//
// To show value V on the front, we rotate the inner cube so that face V is
// facing the camera. The math below maps every value to (rotX, rotY).
const ORIENT: Record<number, { rx: number; ry: number }> = {
  1: { rx:    0, ry:    0 }, // front
  2: { rx:  -90, ry:    0 }, // top → bring DOWN to front
  3: { rx:    0, ry:   90 }, // left
  4: { rx:    0, ry:  -90 }, // right
  5: { rx:   90, ry:    0 }, // bottom → bring UP to front
  6: { rx:    0, ry:  180 }, // back
};

function Pip({ x, y, size }: { x: number; y: number; size: number }) {
  const r = size === 36 ? 3 : size === 56 ? 4.6 : 5.6;
  return (
    <div
      style={{
        position: 'absolute',
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        transform: 'translate(-50%, -50%)',
        width: r * 2,
        height: r * 2,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 32% 28%, #4A2A05 0%, #1A0F02 100%)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.18), ' +
          'inset 0 -1px 0 rgba(0,0,0,0.5), ' +
          '0 1px 2px rgba(255,255,255,0.5)',
      }}
    />
  );
}

function DiceFace({ value, side, size }: { value: number; side: 'front'|'back'|'left'|'right'|'top'|'bottom'; size: number }) {
  const half = size / 2;
  const transform = {
    front:  `rotateY(0deg)   translateZ(${half}px)`,
    back:   `rotateY(180deg) translateZ(${half}px)`,
    right:  `rotateY(-90deg) translateZ(${half}px)`,
    left:   `rotateY(90deg)  translateZ(${half}px)`,
    top:    `rotateX(90deg)  translateZ(${half}px)`,
    bottom: `rotateX(-90deg) translateZ(${half}px)`,
  }[side];

  return (
    <div
      style={{
        position: 'absolute',
        width: size,
        height: size,
        transform,
        borderRadius: '14%',
        background: `
          radial-gradient(circle at 28% 22%, #FFFFFF 0%, transparent 38%),
          linear-gradient(135deg, #F6E6BE 0%, #E8C97A 55%, #C9A84C 100%)
        `,
        border: '2px solid #7A6303',
        boxShadow:
          'inset 0 2px 0 rgba(255,255,255,0.6), ' +
          'inset 0 -2px 0 rgba(122,99,3,0.45), ' +
          'inset 0 0 0 1px rgba(255,255,255,0.18)',
        backfaceVisibility: 'hidden',
      }}
    >
      {FACE_PIPS[value].map(([x, y], i) => (
        <Pip key={i} x={x} y={y} size={size} />
      ))}
    </div>
  );
}

/**
 * Real 3D dice — six CSS faces wrapped into a cube via preserve-3d. The cube
 * rotates to bring the active face to the front. While `rolling` is true the
 * cube tumbles through multiple full rotations + a small bounce, then settles
 * on the target value.
 */
export function LudoDice({ value, rolling, onClick, disabled, size = 'md' }: Props) {
  const px = SIZES[size];
  const [tumble, setTumble] = useState({ rx: 0, ry: 0 });

  // While rolling, fast random orientation changes give the tumble effect.
  useEffect(() => {
    if (!rolling) return;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      setTumble({
        rx: Math.floor(Math.random() * 4) * 90 + (value === 5 ? 90 : value === 2 ? -90 : 0),
        ry: Math.floor(Math.random() * 4) * 90 + (value === 6 ? 180 : 0),
      });
      setTimeout(tick, 90);
    };
    tick();
    return () => { alive = false; };
  }, [rolling, value]);

  const target = value && ORIENT[value]
    ? { rx: ORIENT[value].rx, ry: ORIENT[value].ry }
    : { rx: -22, ry: 28 };

  // Add multiple full rotations during the roll for the "tumble" feel
  const rolledExtraX = rolling ? 720 + tumble.rx : 0;
  const rolledExtraY = rolling ? 720 + tumble.ry : 0;

  const finalRx = rolling ? rolledExtraX : target.rx;
  const finalRy = rolling ? rolledExtraY : target.ry;

  return (
    <button
      onClick={!disabled && onClick ? onClick : undefined}
      disabled={disabled}
      aria-label={value ? `Dice ${value}` : 'Dice'}
      style={{
        width: px,
        height: px,
        perspective: px * 4,
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: onClick && !disabled ? 'pointer' : 'default',
        // Idle resting tilt makes it look 3D even before any roll
        position: 'relative',
        filter: disabled ? 'none' : 'drop-shadow(0 6px 14px rgba(0,0,0,0.55)) drop-shadow(0 0 14px rgba(232,201,122,0.55))',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transform: `rotateX(${finalRx}deg) rotateY(${finalRy}deg)`,
          transition: rolling ? 'transform 90ms linear' : 'transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <DiceFace value={1} side="front"  size={px} />
        <DiceFace value={6} side="back"   size={px} />
        <DiceFace value={4} side="right"  size={px} />
        <DiceFace value={3} side="left"   size={px} />
        <DiceFace value={2} side="top"    size={px} />
        <DiceFace value={5} side="bottom" size={px} />
      </div>
    </button>
  );
}
