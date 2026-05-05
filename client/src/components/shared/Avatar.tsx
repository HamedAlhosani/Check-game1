import { FrameRing } from './FrameRing';

interface Props {
  avatarId: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  active?: boolean;
  frameId?: string;
}

const sizes: Record<NonNullable<Props['size']>, { wh: number; font: number }> = {
  xs: { wh: 24, font: 12 },
  sm: { wh: 32, font: 14 },
  md: { wh: 48, font: 18 },
  lg: { wh: 64, font: 24 },
  xl: { wh: 96, font: 32 },
};

const AVATAR_EMOJIS: Record<string, string> = {
  avatar_1: '🦅', avatar_2: '🐪', avatar_3: '🌴', avatar_4: '⚔️',
  avatar_5: '🌙', avatar_6: '⭐', avatar_7: '🏜️', avatar_8: '🌊',
  avatar_9: '🦁', avatar_10: '🔥', avatar_11: '💎', avatar_12: '🎭',
};

export function Avatar({ avatarId, name, size = 'md', className = '', active, frameId }: Props) {
  const dim = sizes[size];
  const emoji = AVATAR_EMOJIS[avatarId];
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full bg-night-accent select-none ${active ? 'animate-glow-pulse' : ''} ${className}`}
      style={{ width: dim.wh, height: dim.wh, fontSize: dim.font }}
      title={name}
    >
      <span style={{ fontSize: Math.round(dim.wh * 0.55), lineHeight: 1 }}>{emoji || '👤'}</span>
      <FrameRing frameId={frameId} size={dim.wh} />
    </div>
  );
}
