import { useCountdown } from '../../hooks/useCountdown';

interface Props {
  endAt: number | null;
  maxSeconds?: number;
  size?: number;
}

export function CountdownTimer({ endAt, maxSeconds = 30, size = 40 }: Props) {
  const remaining = useCountdown(endAt);
  const progress = endAt ? Math.max(0, (remaining / maxSeconds)) : 0;
  const isUrgent = remaining <= 5 && remaining > 0;

  const r = size / 2 - 4;
  const circumference = 2 * Math.PI * r;
  const dash = circumference * progress;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className={`-rotate-90 transition-all ${isUrgent ? 'text-danger' : 'text-gold'}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth={3}/>
        <circle
          cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={3}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.5s linear' }}
        />
      </svg>
      <span className={`absolute text-xs font-bold tabular-nums ${isUrgent ? 'text-danger' : 'text-gold'}`}>
        {remaining}
      </span>
    </div>
  );
}
