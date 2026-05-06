import { useMemo } from 'react';
import { motion } from 'framer-motion';

const COLORS = ['#E8C97A', '#FFE07A', '#80E0A0', '#FF9D5C', '#C495FF', '#7AC4FF'];

/**
 * Cheap DIY confetti — N small squares animated falling + drifting from
 * the top. No external library so we don't pay a dep cost for a one-shot
 * celebration. Renders absolute over a positioned parent.
 */
export function Confetti({ count = 60 }: { count?: number }) {
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => ({
    i,
    x:        Math.random() * 100,           // % from left
    delay:    Math.random() * 0.6,
    drift:    (Math.random() - 0.5) * 80,    // px horizontal drift
    rot:      Math.random() * 720 - 360,
    color:    COLORS[Math.floor(Math.random() * COLORS.length)],
    size:     6 + Math.random() * 8,
    duration: 2.4 + Math.random() * 2,
    shape:    Math.random() < 0.5 ? 'sq' : 'rect',
  })), [count]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 5 }}>
      {pieces.map(p => (
        <motion.div
          key={p.i}
          initial={{ y: -20, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: 600, x: p.drift, rotate: p.rot, opacity: 0 }}
          transition={{ duration: p.duration, delay: p.delay, ease: [0.45, 0.05, 0.55, 0.95] }}
          style={{
            position: 'absolute',
            top: 0, left: `${p.x}%`,
            width:  p.shape === 'rect' ? p.size : p.size * 0.7,
            height: p.shape === 'rect' ? p.size * 1.6 : p.size * 0.7,
            background: p.color,
            borderRadius: 1.5,
            boxShadow: `0 0 6px ${p.color}66`,
          }}
        />
      ))}
    </div>
  );
}
