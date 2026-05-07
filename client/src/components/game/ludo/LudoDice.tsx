import { motion } from 'framer-motion';

interface Props {
  value: number | null;
  rolling?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Dot positions in the cell (0-3 grid). Used to render real pip layouts.
const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[1.5, 1.5]],
  2: [[0.6, 0.6], [2.4, 2.4]],
  3: [[0.6, 0.6], [1.5, 1.5], [2.4, 2.4]],
  4: [[0.6, 0.6], [2.4, 0.6], [0.6, 2.4], [2.4, 2.4]],
  5: [[0.6, 0.6], [2.4, 0.6], [1.5, 1.5], [0.6, 2.4], [2.4, 2.4]],
  6: [[0.6, 0.4], [2.4, 0.4], [0.6, 1.5], [2.4, 1.5], [0.6, 2.6], [2.4, 2.6]],
};

const SIZES = { sm: 36, md: 56, lg: 72 } as const;

export function LudoDice({ value, rolling, onClick, disabled, size = 'md' }: Props) {
  const px = SIZES[size];
  const dotR = px === 36 ? 3 : px === 56 ? 4.5 : 5.5;

  // Tumble animation — rolls through random faces while `rolling` is true,
  // settles on `value` when it ends. Uses CSS rotateX/rotateY for a 3D feel.
  return (
    <motion.button
      onClick={!disabled && onClick ? onClick : undefined}
      animate={rolling ? {
        rotateX: [0, 360, 720, 1080],
        rotateY: [0, 360, 720, 1080],
        scale: [1, 1.12, 0.96, 1.05, 1],
      } : { rotateX: 0, rotateY: 0, scale: 1 }}
      transition={rolling
        ? { duration: 0.7, ease: 'easeOut' }
        : { duration: 0.3, ease: 'easeOut' }}
      whileHover={onClick && !disabled ? { scale: 1.06 } : undefined}
      whileTap={onClick && !disabled ? { scale: 0.92 } : undefined}
      disabled={disabled}
      className="relative"
      style={{
        width: px,
        height: px,
        perspective: 200,
        transformStyle: 'preserve-3d',
        cursor: onClick && !disabled ? 'pointer' : 'default',
        background: 'transparent',
        border: 'none',
        padding: 0,
      }}
      aria-label={value ? `Dice ${value}` : 'Dice'}
    >
      {/* Cube face — Ludo Star inspired ivory + gold */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: `
            radial-gradient(circle at 28% 22%, #FFFFFF 0%, transparent 38%),
            linear-gradient(135deg, #F6E6BE 0%, #E8C97A 55%, #C9A84C 100%)
          `,
          border: '2px solid #7A6303',
          boxShadow: `
            0 6px 14px rgba(0,0,0,0.55),
            0 0 18px ${disabled ? 'rgba(122,99,3,0.25)' : 'rgba(232,201,122,0.55)'},
            inset 0 2px 0 rgba(255,255,255,0.6),
            inset 0 -2px 0 rgba(122,99,3,0.45)
          `,
        }}
      />
      {/* Inner gold ring for the bezel */}
      <div
        className="absolute rounded-xl pointer-events-none"
        style={{
          inset: 4,
          border: '1px solid rgba(122,99,3,0.30)',
        }}
      />
      {/* Pips */}
      {value && !rolling && DOT_POSITIONS[value]?.map(([x, y], i) => (
        <motion.div
          key={`${value}-${i}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.04, duration: 0.18, ease: 'backOut' }}
          className="absolute rounded-full"
          style={{
            left: `${(x / 3) * 100}%`,
            top: `${(y / 3) * 100}%`,
            transform: 'translate(-50%, -50%)',
            width: dotR * 2,
            height: dotR * 2,
            background: 'radial-gradient(circle at 32% 28%, #4A2A05 0%, #1A0F02 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.5), 0 1px 2px rgba(255,255,255,0.5)',
          }}
        />
      ))}
      {/* Tumbling overlay glyph while rolling */}
      {rolling && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ fontSize: px * 0.5, color: '#7A6303', textShadow: '0 1px 0 rgba(255,255,255,0.6)' }}>
          🎲
        </div>
      )}
      {/* No value yet — subtle question mark */}
      {!value && !rolling && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ fontSize: px * 0.45, color: 'rgba(122,99,3,0.55)', fontWeight: 800 }}>
          ?
        </div>
      )}
    </motion.button>
  );
}
