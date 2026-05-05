interface FrameDef {
  c1: string;
  c2: string;
  c3?: string;
  glow: string;
  pattern: 'plain' | 'dashed' | 'double' | 'dots' | 'arabesque' | 'crown' | 'rays' | 'crescent' | 'palm' | 'wave' | 'gems' | 'shimmer' | 'royal';
  legendary?: boolean;
}

export const FRAMES: Record<string, FrameDef> = {
  // Existing
  frame_default:   { c1: '#C9A84C', c2: '#8B6914', glow: 'rgba(201,168,76,0.35)', pattern: 'plain' },
  frame_falcon:    { c1: '#E8A234', c2: '#7A3E10', glow: 'rgba(232,162,52,0.5)',  pattern: 'crescent' },
  frame_desert:    { c1: '#E8C97A', c2: '#A07028', glow: 'rgba(232,201,122,0.45)',pattern: 'wave' },
  frame_pearl:     { c1: '#E0E6F0', c2: '#7A8898', glow: 'rgba(208,216,232,0.55)',pattern: 'dots' },
  frame_palm:      { c1: '#7AE08A', c2: '#1A6028', glow: 'rgba(122,224,138,0.55)',pattern: 'palm' },
  frame_sultan:    { c1: '#FFE062', c2: '#9A6B10', glow: 'rgba(255,224,98,0.7)',  pattern: 'royal',     legendary: true },
  frame_diamond:   { c1: '#7BE6FF', c2: '#1A6090', glow: 'rgba(123,230,255,0.7)', pattern: 'gems',      legendary: true },
  // ── New gold-themed legendary frames ────────────────────────────────────────
  frame_arabesque: { c1: '#FFD96A', c2: '#7A4810', c3: '#E8B340', glow: 'rgba(255,217,106,0.6)', pattern: 'arabesque', legendary: true },
  frame_majlis:    { c1: '#F5C462', c2: '#6B3F0A', c3: '#FFEB9A', glow: 'rgba(245,196,98,0.55)', pattern: 'dashed' },
  frame_burj:      { c1: '#FFE89A', c2: '#9A7018', c3: '#FFD05A', glow: 'rgba(255,232,154,0.6)', pattern: 'crown',     legendary: true },
  frame_dahab:     { c1: '#FFE062', c2: '#A07820', c3: '#FFF4C0', glow: 'rgba(255,224,98,0.75)', pattern: 'shimmer',   legendary: true },
  frame_oasis:     { c1: '#D8C868', c2: '#3A6028', glow: 'rgba(216,200,104,0.5)', pattern: 'wave' },
  frame_nakhla:    { c1: '#E8C262', c2: '#3A5018', c3: '#F5DC88', glow: 'rgba(232,194,98,0.55)', pattern: 'palm' },
  frame_royal:     { c1: '#FFD75A', c2: '#7A2818', c3: '#FFEFB0', glow: 'rgba(255,215,90,0.7)',  pattern: 'royal',     legendary: true },
  frame_zafran:    { c1: '#FFB840', c2: '#7A3008', glow: 'rgba(255,184,64,0.5)',  pattern: 'rays' },
  frame_oud:       { c1: '#D9A050', c2: '#3A1808', c3: '#F5C672', glow: 'rgba(217,160,80,0.5)',  pattern: 'double' },
  frame_emirates:  { c1: '#E8C97A', c2: '#0A6028', c3: '#C03020', glow: 'rgba(232,201,122,0.55)',pattern: 'gems' },
};

export function FrameRing({ frameId, size }: { frameId?: string; size: number }) {
  const fr = FRAMES[frameId || 'frame_default'] || FRAMES.frame_default;
  const id = `${frameId || 'frame_default'}_${size}`;
  const cx = size / 2;
  const r = size / 2 - 1;
  const sw = Math.max(2, size * 0.045);
  const accent = fr.c3 || fr.c1;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`fr-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={fr.c1}/>
          <stop offset="50%" stopColor={fr.c2}/>
          <stop offset="100%" stopColor={fr.c1}/>
        </linearGradient>
        <radialGradient id={`fg-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor="rgba(0,0,0,0)"/>
          <stop offset="100%" stopColor={fr.glow}/>
        </radialGradient>
        <linearGradient id={`fa-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent}/>
          <stop offset="100%" stopColor={fr.c2}/>
        </linearGradient>
      </defs>

      {/* Halo glow (legendary only) */}
      {fr.legendary && <circle cx={cx} cy={cx} r={r + 1} fill={`url(#fg-${id})`}/>}

      {/* Outer gradient ring */}
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={`url(#fr-${id})`} strokeWidth={sw} />

      {/* Pattern overlays */}
      {fr.pattern === 'dashed' && (
        <circle cx={cx} cy={cx} r={r - sw * 0.7} fill="none" stroke={accent} strokeWidth="0.6" opacity="0.7" strokeDasharray={`${Math.max(2, size*0.04)} ${Math.max(1.5, size*0.025)}`}/>
      )}

      {fr.pattern === 'double' && (
        <>
          <circle cx={cx} cy={cx} r={r - sw * 1.4} fill="none" stroke={accent} strokeWidth="1" opacity="0.7"/>
          <circle cx={cx} cy={cx} r={r - sw * 2.2} fill="none" stroke={accent} strokeWidth="0.4" opacity="0.4" strokeDasharray="1.5 2"/>
        </>
      )}

      {fr.pattern === 'dots' && (
        <g fill={accent}>
          {[0, 45, 90, 135, 180, 225, 270, 315].map(a => {
            const rr = r;
            const rad = (a * Math.PI) / 180;
            return <circle key={a} cx={cx + rr * Math.cos(rad)} cy={cx + rr * Math.sin(rad)} r={size * 0.04}/>;
          })}
        </g>
      )}

      {fr.pattern === 'arabesque' && (
        <>
          {/* Inner dashed ring */}
          <circle cx={cx} cy={cx} r={r - sw * 0.9} fill="none" stroke={accent} strokeWidth="0.5" opacity="0.5" strokeDasharray="1 1.5"/>
          {/* 8-pt star medallions at cardinals */}
          {[0, 90, 180, 270].map(a => {
            const rr = r + sw * 0.5;
            const rad = (a * Math.PI) / 180;
            const x = cx + rr * Math.cos(rad);
            const y = cx + rr * Math.sin(rad);
            const s = size * 0.075;
            return (
              <g key={a} transform={`translate(${x},${y}) rotate(${a + 90})`}>
                <circle r={s * 0.85} fill={fr.c2} stroke={accent} strokeWidth="0.6"/>
                <path d={`M0,${-s*0.6} L${s*0.18},${-s*0.18} L${s*0.6},0 L${s*0.18},${s*0.18} L0,${s*0.6} L${-s*0.18},${s*0.18} L${-s*0.6},0 L${-s*0.18},${-s*0.18} Z`} fill={accent} opacity="0.95"/>
              </g>
            );
          })}
          {/* Diamond accents at 45° */}
          {[45, 135, 225, 315].map(a => {
            const rr = r + sw * 0.3;
            const rad = (a * Math.PI) / 180;
            const x = cx + rr * Math.cos(rad);
            const y = cx + rr * Math.sin(rad);
            const s = size * 0.04;
            return <polygon key={a} points={`${x},${y-s} ${x+s},${y} ${x},${y+s} ${x-s},${y}`} fill={accent}/>;
          })}
        </>
      )}

      {fr.pattern === 'crown' && (
        <>
          {/* Inner ring */}
          <circle cx={cx} cy={cx} r={r - sw * 1.3} fill="none" stroke={accent} strokeWidth="0.5" opacity="0.45"/>
          {/* Top crown spires */}
          <g fill={accent} stroke={fr.c2} strokeWidth="0.4">
            <path d={`M${cx},${-size*0.04} L${cx-size*0.07},${size*0.04} L${cx-size*0.04},${size*0.05} L${cx-size*0.04},${size*0.005} L${cx-size*0.015},${size*0.005} L${cx-size*0.015},${size*0.045} L${cx+size*0.015},${size*0.045} L${cx+size*0.015},${size*0.005} L${cx+size*0.04},${size*0.005} L${cx+size*0.04},${size*0.05} L${cx+size*0.07},${size*0.04} Z`}/>
            <circle cx={cx} cy={-size*0.025} r={size * 0.018} fill={fr.c1}/>
          </g>
          {/* Side jewels */}
          {[60, 120, 240, 300].map(a => {
            const rr = r + sw * 0.4;
            const rad = (a * Math.PI) / 180;
            const x = cx + rr * Math.cos(rad);
            const y = cx + rr * Math.sin(rad);
            const s = size * 0.035;
            return <circle key={a} cx={x} cy={y} r={s} fill={accent} stroke={fr.c2} strokeWidth="0.5"/>;
          })}
        </>
      )}

      {fr.pattern === 'rays' && (
        <g stroke={accent} strokeWidth="0.6" strokeLinecap="round" opacity="0.7">
          {Array.from({ length: 16 }).map((_, i) => {
            const a = (i * 22.5 * Math.PI) / 180;
            const r1 = r + sw * 0.6;
            const r2 = r + sw * 1.4;
            return <line key={i} x1={cx + r1 * Math.cos(a)} y1={cx + r1 * Math.sin(a)} x2={cx + r2 * Math.cos(a)} y2={cx + r2 * Math.sin(a)} />;
          })}
        </g>
      )}

      {fr.pattern === 'crescent' && (
        <g>
          {/* Falcon-tip crescent at top */}
          <path d={`M${cx-size*0.12},${-size*0.01} Q${cx},${-size*0.07} ${cx+size*0.12},${-size*0.01} Q${cx},${size*0.025} ${cx-size*0.12},${-size*0.01} Z`} fill={accent} stroke={fr.c2} strokeWidth="0.4"/>
          <circle cx={cx} cy={-size * 0.005} r={size * 0.015} fill={fr.c2}/>
        </g>
      )}

      {fr.pattern === 'palm' && (
        <g fill={accent} opacity="0.9">
          {/* Palm fronds at top */}
          {[-1, 0, 1].map(off => (
            <path key={off}
              d={`M${cx + off * size * 0.05},${-size * 0.005} Q${cx + off * size * 0.09},${-size * 0.05} ${cx + off * size * 0.06},${-size * 0.07} Q${cx + off * size * 0.02},${-size * 0.045} ${cx + off * size * 0.05},${-size * 0.005} Z`}
              transform={`rotate(${off * 12} ${cx} 0)`}
            />
          ))}
        </g>
      )}

      {fr.pattern === 'wave' && (
        <g fill="none" stroke={accent} strokeWidth="0.6" opacity="0.65">
          {/* Inner dune-wave */}
          <path d={`M${cx - r * 0.7},${cx} Q${cx - r * 0.35},${cx - r * 0.1} ${cx},${cx} T${cx + r * 0.7},${cx}`}/>
          <path d={`M${cx - r * 0.7},${cx + r * 0.18} Q${cx - r * 0.35},${cx + r * 0.08} ${cx},${cx + r * 0.18} T${cx + r * 0.7},${cx + r * 0.18}`} opacity="0.4"/>
        </g>
      )}

      {fr.pattern === 'shimmer' && (
        <>
          {/* Inner concentric shimmer */}
          <circle cx={cx} cy={cx} r={r - sw * 1.0} fill="none" stroke={accent} strokeWidth="0.6" opacity="0.6"/>
          <circle cx={cx} cy={cx} r={r - sw * 1.8} fill="none" stroke={accent} strokeWidth="0.4" opacity="0.35" strokeDasharray="0.8 1.2"/>
          {/* Sparkles */}
          {[30, 75, 150, 210, 285, 330].map(a => {
            const rr = r + sw * 0.5;
            const rad = (a * Math.PI) / 180;
            const x = cx + rr * Math.cos(rad);
            const y = cx + rr * Math.sin(rad);
            const s = size * 0.025;
            return (
              <g key={a} fill={accent}>
                <line x1={x - s} y1={y} x2={x + s} y2={y} stroke={accent} strokeWidth="0.6"/>
                <line x1={x} y1={y - s} x2={x} y2={y + s} stroke={accent} strokeWidth="0.6"/>
              </g>
            );
          })}
        </>
      )}

      {fr.pattern === 'gems' && (
        <>
          <circle cx={cx} cy={cx} r={r - sw * 1.2} fill="none" stroke={accent} strokeWidth="0.5" opacity="0.5" strokeDasharray="2 2"/>
          {/* Three diamonds at top + sides + bottom */}
          {[0, 90, 180, 270].map(a => {
            const rr = r + sw * 0.4;
            const rad = (a * Math.PI) / 180;
            const x = cx + rr * Math.cos(rad);
            const y = cx + rr * Math.sin(rad);
            const s = size * 0.045;
            return (
              <g key={a}>
                <polygon points={`${x},${y-s} ${x+s*0.8},${y} ${x},${y+s} ${x-s*0.8},${y}`} fill={accent} stroke={fr.c2} strokeWidth="0.4"/>
                <line x1={x} y1={y-s} x2={x} y2={y+s} stroke="rgba(255,255,255,0.5)" strokeWidth="0.4"/>
              </g>
            );
          })}
        </>
      )}

      {fr.pattern === 'royal' && (
        <>
          {/* Inner ring */}
          <circle cx={cx} cy={cx} r={r - sw * 1.0} fill="none" stroke={accent} strokeWidth="0.6" opacity="0.7"/>
          <circle cx={cx} cy={cx} r={r - sw * 2.0} fill="none" stroke={accent} strokeWidth="0.4" opacity="0.4" strokeDasharray="1 1.5"/>
          {/* Cardinal medallions */}
          {[0, 90, 180, 270].map(a => {
            const rr = r;
            const rad = (a * Math.PI) / 180;
            const x = cx + rr * Math.cos(rad);
            const y = cx + rr * Math.sin(rad);
            const s = size * 0.06;
            return (
              <g key={a} transform={`translate(${x},${y}) rotate(${a})`}>
                <circle r={s} fill={fr.c2} stroke={accent} strokeWidth="0.6"/>
                <path d={`M0,${-s*0.55} L${s*0.18},${-s*0.18} L${s*0.55},0 L${s*0.18},${s*0.18} L0,${s*0.55} L${-s*0.18},${s*0.18} L${-s*0.55},0 L${-s*0.18},${-s*0.18} Z`} fill={accent}/>
                <circle r={s * 0.18} fill={fr.c1}/>
              </g>
            );
          })}
          {/* 4 small jewels at 45° */}
          {[45, 135, 225, 315].map(a => {
            const rr = r + sw * 0.4;
            const rad = (a * Math.PI) / 180;
            const x = cx + rr * Math.cos(rad);
            const y = cx + rr * Math.sin(rad);
            return <circle key={a} cx={x} cy={y} r={size * 0.022} fill={accent}/>;
          })}
        </>
      )}
    </svg>
  );
}
