import { motion } from 'framer-motion';

interface Props {
  value: number | null;
  rolling?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

const DOTS: Record<number, number[][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
};

export function LudoDice({ value, rolling, onClick, disabled }: Props) {
  return (
    <motion.div
      animate={rolling ? { rotate: [0, 90, 180, 270, 360] } : {}}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      onClick={!disabled ? onClick : undefined}
      className={`w-16 h-16 bg-white rounded-xl border-2 shadow-xl relative
        ${onClick && !disabled ? 'cursor-pointer hover:scale-105 border-gold' : 'border-gray-300 opacity-50'}
        transition-all duration-200`}
    >
      {value && DOTS[value]?.map(([x, y], i) => (
        <div
          key={i}
          className="absolute w-3 h-3 bg-night rounded-full transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${x}%`, top: `${y}%` }}
        />
      ))}
      {!value && <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-2xl">🎲</div>}
    </motion.div>
  );
}
