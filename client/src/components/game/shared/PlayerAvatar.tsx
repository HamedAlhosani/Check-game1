import { Avatar } from '../../shared/Avatar';
import { CountdownTimer } from '../../shared/CountdownTimer';

interface Props {
  uid: string;
  displayName: string;
  avatarId: string;
  score: number;
  isTurn: boolean;
  isEliminated: boolean;
  turnEndAt?: number | null;
  compact?: boolean;
}

export function PlayerAvatar({ displayName, avatarId, score, isTurn, isEliminated, turnEndAt, compact }: Props) {
  return (
    <div className={`flex flex-col items-center gap-1 transition-all ${isEliminated ? 'opacity-30 grayscale' : ''}`}>
      <div className="relative">
        <Avatar avatarId={avatarId} size={compact ? 'sm' : 'md'} active={isTurn} />
        {isTurn && turnEndAt && (
          <div className="absolute -top-1 -right-1">
            <CountdownTimer endAt={turnEndAt} size={24} />
          </div>
        )}
      </div>
      <p className="text-xs font-arabic text-sand-light text-center max-w-16 truncate">{displayName}</p>
      <p className={`text-xs font-bold tabular-nums ${isTurn ? 'text-gold' : 'text-sand/50'}`}>{score}</p>
    </div>
  );
}
