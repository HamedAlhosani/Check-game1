interface Props {
  avatarId: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  active?: boolean;
  frameId?: string;
}

const sizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-24 h-24 text-3xl',
};

const AVATAR_EMOJIS: Record<string, string> = {
  avatar_1: '🦅', avatar_2: '🐪', avatar_3: '🌴', avatar_4: '⚔️',
  avatar_5: '🌙', avatar_6: '⭐', avatar_7: '🏜️', avatar_8: '🌊',
  avatar_9: '🦁', avatar_10: '🔥', avatar_11: '💎', avatar_12: '🎭',
};

// Frame styles: [outerRing, innerGlow, extraClass]
const FRAME_STYLES: Record<string, { border: string; shadow: string }> = {
  frame_default:  { border: 'border-gold/50',    shadow: '' },
  frame_falcon:   { border: 'border-amber-600',   shadow: 'shadow-amber-600/40' },
  frame_desert:   { border: 'border-yellow-600',  shadow: 'shadow-yellow-600/40' },
  frame_pearl:    { border: 'border-slate-300',   shadow: 'shadow-slate-300/30' },
  frame_palm:     { border: 'border-green-500',   shadow: 'shadow-green-500/40' },
  frame_sultan:   { border: 'border-yellow-400',  shadow: 'shadow-yellow-400/60' },
  frame_diamond:  { border: 'border-cyan-400',    shadow: 'shadow-cyan-400/60' },
};

export function Avatar({ avatarId, name, size = 'md', className = '', active, frameId }: Props) {
  const frame = FRAME_STYLES[frameId || 'frame_default'] || FRAME_STYLES['frame_default'];
  const isLegendary = frameId === 'frame_diamond' || frameId === 'frame_sultan';

  return (
    <div className={`relative inline-flex items-center justify-center rounded-full bg-night-accent border-2
      ${active ? `${frame.border} animate-glow-pulse` : frame.border}
      ${frame.shadow ? `shadow-md ${frame.shadow}` : ''}
      ${isLegendary ? 'ring-2 ring-offset-1 ring-offset-night ring-gold/30' : ''}
      ${sizes[size]} ${className}`}
      title={name}
    >
      <span className="select-none">{AVATAR_EMOJIS[avatarId] || '👤'}</span>
    </div>
  );
}
