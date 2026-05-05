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

interface FrameStyle {
  c1: string;
  c2: string;
  glow: string;
  ornaments: 'classic' | 'falcon' | 'desert' | 'pearl' | 'palm' | 'sultan' | 'diamond';
}

const FRAMES: Record<string, FrameStyle> = {
  frame_default: { c1: '#C9A84C', c2: '#8B6914', glow: 'rgba(201,168,76,0.35)', ornaments: 'classic' },
  frame_falcon:  { c1: '#E8A234', c2: '#7A3E10', glow: 'rgba(232,162,52,0.5)',  ornaments: 'falcon' },
  frame_desert:  { c1: '#E8C97A', c2: '#A07028', glow: 'rgba(232,201,122,0.45)',ornaments: 'desert' },
  frame_pearl:   { c1: '#E0E6F0', c2: '#7A8898', glow: 'rgba(208,216,232,0.55)',ornaments: 'pearl' },
  frame_palm:    { c1: '#7AE08A', c2: '#1A6028', glow: 'rgba(122,224,138,0.55)',ornaments: 'palm' },
  frame_sultan:  { c1: '#FFE062', c2: '#9A6B10', glow: 'rgba(255,224,98,0.7)',  ornaments: 'sultan' },
  frame_diamond: { c1: '#7BE6FF', c2: '#1A6090', glow: 'rgba(123,230,255,0.7)', ornaments: 'diamond' },
};

function FrameRing({ frame, size, active }: { frame: FrameStyle; size: number; active?: boolean }) {
  const uid = `${frame.ornaments}_${size}`;
  const r = size / 2 - 1;
  const cx = size / 2;
  const isLegendary = frame.ornaments === 'sultan' || frame.ornaments === 'diamond';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`fr-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={frame.c1}/>
          <stop offset="50%" stopColor={frame.c2}/>
          <stop offset="100%" stopColor={frame.c1}/>
        </linearGradient>
        <radialGradient id={`fg-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor="rgba(0,0,0,0)"/>
          <stop offset="100%" stopColor={frame.glow}/>
        </radialGradient>
      </defs>
      {/* Glow halo */}
      {(active || isLegendary) && (
        <circle cx={cx} cy={cx} r={r + 1} fill={`url(#fg-${uid})`}/>
      )}
      {/* Outer gradient ring */}
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={`url(#fr-${uid})`} strokeWidth={Math.max(2, size * 0.045)} />
      {/* Inner accent ring (legendary only) */}
      {isLegendary && (
        <circle cx={cx} cy={cx} r={r - Math.max(3, size * 0.07)} fill="none" stroke={frame.c1} strokeWidth="0.6" opacity="0.55" strokeDasharray={frame.ornaments === 'diamond' ? '2 2' : undefined}/>
      )}
      {/* Cardinal dots — luxe touch */}
      {(frame.ornaments === 'sultan' || frame.ornaments === 'diamond' || frame.ornaments === 'pearl') && (
        <g fill={frame.c1}>
          <circle cx={cx} cy={1.5} r={size * 0.035}/>
          <circle cx={cx} cy={size - 1.5} r={size * 0.035}/>
          <circle cx={1.5} cy={cx} r={size * 0.035}/>
          <circle cx={size - 1.5} cy={cx} r={size * 0.035}/>
        </g>
      )}
      {/* Falcon corner notches */}
      {frame.ornaments === 'falcon' && (
        <g stroke={frame.c1} strokeWidth="0.8" fill="none" opacity="0.85" strokeLinecap="round">
          <path d={`M${cx - r * 0.55},${cx - r * 0.85} L${cx},${cx - r * 0.7} L${cx + r * 0.55},${cx - r * 0.85}`} />
        </g>
      )}
    </svg>
  );
}

export function Avatar({ avatarId, name, size = 'md', className = '', active, frameId }: Props) {
  const dim = sizes[size];
  const frame = FRAMES[frameId || 'frame_default'] || FRAMES['frame_default'];
  const emoji = AVATAR_EMOJIS[avatarId];
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full bg-night-accent select-none ${active ? 'animate-glow-pulse' : ''} ${className}`}
      style={{ width: dim.wh, height: dim.wh, fontSize: dim.font }}
      title={name}
    >
      <span style={{ fontSize: Math.round(dim.wh * 0.55), lineHeight: 1 }}>{emoji || '👤'}</span>
      <FrameRing frame={frame} size={dim.wh} active={active} />
    </div>
  );
}
