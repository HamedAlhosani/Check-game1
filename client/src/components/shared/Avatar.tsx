import { FrameRing } from './FrameRing';
import { CharacterArt } from './CharacterArt';

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
  avatar_13: '⚔️', avatar_14: '⛵', avatar_15: '🧭', avatar_16: '🇦🇪',
  avatar_17: '👸', avatar_18: '🧕', avatar_19: '🤵', avatar_20: '👳', avatar_21: '👩', avatar_22: '🧓',
};

export function Avatar({ avatarId, name, size = 'md', className = '', active, frameId }: Props) {
  const dim = sizes[size];
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full select-none ${active ? 'animate-glow-pulse' : ''} ${className}`}
      style={{ width: dim.wh, height: dim.wh, fontSize: dim.font }}
      title={name}
    >
      <CharacterArt id={avatarId} size={dim.wh}/>
      <FrameRing frameId={frameId} size={dim.wh} />
    </div>
  );
}

// Kept for legacy callers that import the emoji map directly.
export { AVATAR_EMOJIS };
