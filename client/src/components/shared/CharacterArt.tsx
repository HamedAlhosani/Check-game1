import { useEffect, useState } from 'react';

/**
 * CharacterArt — render the player's character with real artwork when
 * available, falling back to a stylized SVG portrait, then to an emoji.
 *
 * Lookup order:
 *   1. /characters/{avatarId}.png  — real artwork the user dropped in
 *   2. Built-in stylized SVG       — themed portrait with headwear
 *   3. Emoji fallback              — last resort, never empty
 *
 * The image probe runs once per avatarId per session and caches the
 * result in module-level memory, so we don't fire 404s on every render.
 */

const EMOJI: Record<string, string> = {
  avatar_1: '🦅', avatar_2: '🐪', avatar_3: '🌴', avatar_4: '⚔️',
  avatar_5: '🌙', avatar_6: '⭐', avatar_7: '🏜️', avatar_8: '🌊',
  avatar_9: '🦁', avatar_10: '🔥', avatar_11: '💎', avatar_12: '🌟',
  avatar_13: '⚔️', avatar_14: '⛵', avatar_15: '🧭', avatar_16: '🇦🇪',
};

const NAMES_AR: Record<string, string> = {
  avatar_1: 'الصقر', avatar_2: 'ابن الصحراء', avatar_3: 'شيخ النخيل', avatar_4: 'محارب الصحراء',
  avatar_5: 'صياد الليل', avatar_6: 'نجم الخليج', avatar_7: 'أمير البر', avatar_8: 'جدّة',
  avatar_9: 'المسجد', avatar_10: 'المدينة', avatar_11: 'أمير الماس', avatar_12: 'سلطان الرياح',
  avatar_13: 'عنترة بن شداد', avatar_14: 'السندباد', avatar_15: 'ابن بطوطة', avatar_16: 'الشيخ زايد',
};

// Module-level probe cache: avatarId → 'real' | 'fallback' (or undefined while pending)
const probeCache = new Map<string, 'real' | 'fallback'>();
const probeUrl = (id: string) => `/characters/${id}.png`;

function probe(id: string): Promise<'real' | 'fallback'> {
  const cached = probeCache.get(id);
  if (cached) return Promise.resolve(cached);
  return new Promise(resolve => {
    const img = new Image();
    img.onload  = () => { probeCache.set(id, 'real');     resolve('real'); };
    img.onerror = () => { probeCache.set(id, 'fallback'); resolve('fallback'); };
    img.src = probeUrl(id);
  });
}

export function CharacterArt({ id, size = 64, ring }: { id: string; size?: number; ring?: boolean }) {
  const [mode, setMode] = useState<'real' | 'fallback' | 'pending'>(probeCache.get(id) || 'pending');

  useEffect(() => {
    if (probeCache.has(id)) { setMode(probeCache.get(id)!); return; }
    let cancelled = false;
    probe(id).then(r => { if (!cancelled) setMode(r); });
    return () => { cancelled = true; };
  }, [id]);

  const ringStyle = ring
    ? { boxShadow: '0 0 0 2px rgba(232,201,122,0.5), 0 0 16px rgba(232,201,122,0.3)' }
    : {};

  if (mode === 'real') {
    return (
      <img src={probeUrl(id)} alt={NAMES_AR[id] || id}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover',
          background: 'rgba(0,0,0,0.30)',
          ...ringStyle,
        }}/>
    );
  }

  // SVG portrait fallback — themed by character.
  return <SvgPortrait id={id} size={size} ring={ring}/>;
}

// ── Stylized SVG portraits ──────────────────────────────────────────────────
// Built from primitive shapes — no real likenesses, but each character has
// a distinctive silhouette (headwear, beard, accent colour) so they read
// as different at a glance, even before custom art is dropped in.

const PORTRAITS: Record<string, { skin: string; hair: string; accent: string; headwear: 'ghutra' | 'turban' | 'crown' | 'helmet' | 'sailor' | 'scholar' | 'none'; beard?: 'short' | 'long' | 'none' }> = {
  avatar_1:  { skin: '#F4D5A5', hair: '#3B2516', accent: '#C9A84C', headwear: 'ghutra' },
  avatar_2:  { skin: '#E8C088', hair: '#2A1A0E', accent: '#A07830', headwear: 'ghutra', beard: 'short' },
  avatar_3:  { skin: '#E8B888', hair: '#5C5C5C', accent: '#8B6914', headwear: 'ghutra', beard: 'long' },
  avatar_4:  { skin: '#E8B888', hair: '#1F1108', accent: '#B83020', headwear: 'helmet', beard: 'short' },
  avatar_5:  { skin: '#F0D0A0', hair: '#3B2516', accent: '#7A5A24', headwear: 'turban' },
  avatar_6:  { skin: '#F4D5A5', hair: '#2A1A0E', accent: '#FFE07A', headwear: 'none', beard: 'short' },
  avatar_7:  { skin: '#E8B888', hair: '#3B2516', accent: '#C9A84C', headwear: 'ghutra', beard: 'short' },
  avatar_8:  { skin: '#F4D5A5', hair: '#9A9A9A', accent: '#B383CC', headwear: 'turban' },
  avatar_9:  { skin: '#E8B888', hair: '#3B2516', accent: '#50C878', headwear: 'turban' },
  avatar_10: { skin: '#F4D5A5', hair: '#2A1A0E', accent: '#FF9D5C', headwear: 'none' },
  avatar_11: { skin: '#F4D5A5', hair: '#3B2516', accent: '#7AC4FF', headwear: 'crown' },
  avatar_12: { skin: '#F4D5A5', hair: '#2A1A0E', accent: '#FFE07A', headwear: 'crown', beard: 'short' },
  // Historical legends — distinctive silhouettes
  avatar_13: { skin: '#D8A878', hair: '#1F1108', accent: '#B83020', headwear: 'helmet',  beard: 'long' },  // Antara — warrior
  avatar_14: { skin: '#E8B888', hair: '#1F1108', accent: '#3A8060', headwear: 'sailor',  beard: 'short' }, // Sindbad — sailor
  avatar_15: { skin: '#E8B888', hair: '#3B2516', accent: '#C9A84C', headwear: 'scholar', beard: 'long' },  // Ibn Battuta — scholar
  avatar_16: { skin: '#F0D0A0', hair: '#7A7A7A', accent: '#005A28', headwear: 'ghutra',  beard: 'short' }, // Sheikh Zayed
};

/** Lighten or darken a hex colour by a 0..1 factor (negative = darker). */
function shade(hex: string, factor: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const adj = (c: number) => Math.max(0, Math.min(255, Math.round(c + (factor > 0 ? (255 - c) * factor : c * factor))));
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(adj(r))}${toHex(adj(g))}${toHex(adj(b))}`;
}

function SvgPortrait({ id, size, ring }: { id: string; size: number; ring?: boolean }) {
  const p = PORTRAITS[id] || PORTRAITS.avatar_1;
  const ringStyle = ring
    ? { boxShadow: '0 0 0 2px rgba(232,201,122,0.5), 0 0 16px rgba(232,201,122,0.3)' }
    : {};
  // Unique gradient id per character so multiple portraits don't collide
  const uid = `pt-${id}`;
  const skinShadow = shade(p.skin, -0.18);
  const skinHi     = shade(p.skin, +0.10);
  const beardHi    = shade(p.hair, +0.18);
  const beardSh    = shade(p.hair, -0.30);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      overflow: 'hidden', position: 'relative',
      background: `radial-gradient(circle at 30% 25%, ${p.accent}33, ${p.accent}11 40%, #0E0905 100%)`,
      ...ringStyle,
    }}>
      <svg viewBox="0 0 100 110" width={size} height={size * 1.1}
        style={{ marginTop: -size * 0.05, display: 'block' }}>
        <defs>
          {/* Skin: warm forehead → cooler jaw + slight side shadow */}
          <radialGradient id={`${uid}-skin`} cx="50%" cy="38%" r="65%">
            <stop offset="0%"  stopColor={skinHi}/>
            <stop offset="55%" stopColor={p.skin}/>
            <stop offset="100%" stopColor={skinShadow}/>
          </radialGradient>
          {/* Beard texture: depth + a brighter highlight near the chin */}
          <linearGradient id={`${uid}-beard`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor={p.hair}/>
            <stop offset="55%" stopColor={beardSh}/>
            <stop offset="100%" stopColor={p.hair}/>
          </linearGradient>
          {/* Cheek glow — soft warm spot */}
          <radialGradient id={`${uid}-cheek`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor="#E07A6A" stopOpacity="0.35"/>
            <stop offset="100%" stopColor="#E07A6A" stopOpacity="0"/>
          </radialGradient>
          {/* Iris radial — darker rim, lighter centre */}
          <radialGradient id={`${uid}-iris`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor="#5A3F1A"/>
            <stop offset="80%" stopColor="#2A1A08"/>
            <stop offset="100%" stopColor="#0A0500"/>
          </radialGradient>
        </defs>

        {/* Shoulders / robe */}
        <path d={`M 8 110 Q 50 80 92 110 L 92 115 L 8 115 Z`} fill={p.accent}/>
        <path d={`M 8 110 Q 50 80 92 110 L 92 113 L 8 113 Z`} fill={shade(p.accent, -0.15)} opacity="0.6"/>

        {/* Neck */}
        <path d="M 42 76 Q 50 84 58 76 L 60 90 Q 50 95 40 90 Z" fill={p.skin}/>
        <path d="M 42 78 Q 50 84 58 78 L 58 80 Q 50 84 42 80 Z" fill={skinShadow} opacity="0.55"/>

        {/* Face — slightly heart-shaped: wider forehead, narrower chin */}
        <path d={`M 28 42
                  Q 26 25 50 22
                  Q 74 25 72 42
                  Q 73 60 65 70
                  Q 58 78 50 78
                  Q 42 78 35 70
                  Q 27 60 28 42 Z`}
          fill={`url(#${uid}-skin)`}/>

        {/* Cheeks — warm spots */}
        <ellipse cx="36" cy="58" rx="6" ry="4" fill={`url(#${uid}-cheek)`}/>
        <ellipse cx="64" cy="58" rx="6" ry="4" fill={`url(#${uid}-cheek)`}/>

        {/* Forehead highlight */}
        <ellipse cx="50" cy="32" rx="10" ry="4" fill={skinHi} opacity="0.55"/>

        {/* Nose — bridge shadow + nostril hint */}
        <path d="M 49 44 Q 49 54 47 58 Q 49 60 51 58 Q 51 54 51 44 Z" fill={skinShadow} opacity="0.35"/>
        <ellipse cx="50" cy="58" rx="2.5" ry="1.2" fill={skinShadow} opacity="0.45"/>

        {/* Mouth — subtle lips */}
        <path d="M 44 65 Q 50 67 56 65 Q 50 64 44 65 Z" fill={shade(p.skin, -0.40)} opacity="0.85"/>
        <path d="M 44 65 Q 50 64 56 65" stroke={shade(p.skin, -0.55)} strokeWidth="0.6" fill="none" strokeLinecap="round"/>

        {/* Eyes — sclera (white) under iris, with eyelid shadow + lashes */}
        {/* Left eye */}
        <ellipse cx="40" cy="48" rx="3.6" ry="2.2" fill="#FAF6EE"/>
        <circle cx="40" cy="48" r="2" fill={`url(#${uid}-iris)`}/>
        <circle cx="40.6" cy="47.4" r="0.5" fill="#fff"/>
        <path d="M 36.5 46 Q 40 44 43.5 46" stroke="#1A1408" strokeWidth="0.5" fill="none" strokeLinecap="round"/>
        {/* Right eye */}
        <ellipse cx="60" cy="48" rx="3.6" ry="2.2" fill="#FAF6EE"/>
        <circle cx="60" cy="48" r="2" fill={`url(#${uid}-iris)`}/>
        <circle cx="60.6" cy="47.4" r="0.5" fill="#fff"/>
        <path d="M 56.5 46 Q 60 44 63.5 46" stroke="#1A1408" strokeWidth="0.5" fill="none" strokeLinecap="round"/>

        {/* Eyebrows — thicker arched */}
        <path d="M 35 42 Q 40 39 45 42 Q 40 41 35 42 Z" fill={p.hair}/>
        <path d="M 55 42 Q 60 39 65 42 Q 60 41 55 42 Z" fill={p.hair}/>

        {/* Beard layers — depth via a darker base + textured top */}
        {p.beard === 'short' && (
          <g>
            <path d={`M 30 60 Q 50 80 70 60 Q 65 73 50 75 Q 35 73 30 60 Z`} fill={`url(#${uid}-beard)`}/>
            <path d={`M 33 62 Q 50 75 67 62 Q 60 70 50 71 Q 40 70 33 62 Z`} fill={beardHi} opacity="0.35"/>
            {/* Mustache */}
            <path d="M 42 62 Q 50 65 58 62 Q 50 60 42 62 Z" fill={p.hair}/>
          </g>
        )}
        {p.beard === 'long' && (
          <g>
            <path d={`M 28 56 Q 50 95 72 56 Q 65 85 50 88 Q 35 85 28 56 Z`} fill={`url(#${uid}-beard)`}/>
            <path d={`M 32 60 Q 50 88 68 60 Q 60 80 50 82 Q 40 80 32 60 Z`} fill={beardHi} opacity="0.30"/>
            <path d="M 42 62 Q 50 66 58 62 Q 50 60 42 62 Z" fill={p.hair}/>
            {/* Beard strands */}
            <path d="M 38 75 L 36 88" stroke={beardSh} strokeWidth="0.6" fill="none" strokeLinecap="round" opacity="0.5"/>
            <path d="M 50 80 L 50 92" stroke={beardSh} strokeWidth="0.6" fill="none" strokeLinecap="round" opacity="0.5"/>
            <path d="M 62 75 L 64 88" stroke={beardSh} strokeWidth="0.6" fill="none" strokeLinecap="round" opacity="0.5"/>
          </g>
        )}

        {/* Headwear sits on top of everything */}
        <Headwear kind={p.headwear} accent={p.accent} hair={p.hair}/>
      </svg>
    </div>
  );
}

function Headwear({ kind, accent, hair }: { kind: string; accent: string; hair?: string }) {
  const accentDark = shade(accent, -0.30);
  const accentHi   = shade(accent, +0.20);

  if (kind === 'ghutra') {
    return (
      <g>
        {/* White ghutra falling down both sides */}
        <path d="M 18 40 Q 18 16 50 12 Q 82 16 82 40 L 82 70 Q 75 75 68 68 L 68 40 Q 50 30 32 40 L 32 68 Q 25 75 18 70 Z"
          fill="#F8F4EA"/>
        {/* Side shading — folds */}
        <path d="M 18 40 Q 18 16 50 12 L 50 28 Q 32 30 25 50 L 18 70 Z" fill="#E8E0D0" opacity="0.45"/>
        <path d="M 82 40 Q 82 16 50 12 L 50 28 Q 68 30 75 50 L 82 70 Z" fill="#E8E0D0" opacity="0.25"/>
        {/* Crown line */}
        <path d="M 26 28 Q 50 18 74 28" stroke="#D8D0BD" strokeWidth="0.8" fill="none" opacity="0.7"/>
        {/* Black agal cord — twisted rope */}
        <path d="M 28 30 Q 50 21 72 30" stroke="#0E0905" strokeWidth="3" fill="none" strokeLinecap="round"/>
        <path d="M 28 33 Q 50 24 72 33" stroke="#1A1408" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
        <path d="M 30 31 Q 50 23 70 31" stroke="#3A2A18" strokeWidth="0.6" fill="none" opacity="0.7"/>
        {/* Accent piping (subtle) */}
        <path d="M 32 40 Q 50 32 68 40" stroke={accent} strokeWidth="0.8" fill="none" opacity="0.45"/>
      </g>
    );
  }
  if (kind === 'turban') {
    return (
      <g>
        {/* Three wrapped layers with shadow between */}
        <path d="M 22 36 Q 50 12 78 36 L 78 30 Q 50 14 22 30 Z" fill={accent}/>
        <path d="M 22 36 L 78 36" stroke={accentDark} strokeWidth="0.5" opacity="0.6"/>
        <path d="M 22 38 Q 50 24 78 38 L 78 32 Q 50 18 22 32 Z" fill="#F5F0E5"/>
        <path d="M 22 42 Q 50 30 78 42 L 78 38 Q 50 26 22 38 Z" fill={accent}/>
        {/* Highlight stripe */}
        <path d="M 28 28 Q 50 18 72 28" stroke={accentHi} strokeWidth="0.8" fill="none" opacity="0.7"/>
      </g>
    );
  }
  if (kind === 'crown') {
    return (
      <g>
        {/* Crown body */}
        <path d="M 24 32 L 30 18 L 38 28 L 44 14 L 50 24 L 56 14 L 62 28 L 70 18 L 76 32 L 76 38 L 24 38 Z"
          fill={accent} stroke={accentDark} strokeWidth="0.8"/>
        {/* Inner shading */}
        <path d="M 24 38 L 76 38 L 74 42 L 26 42 Z" fill={accentDark} opacity="0.5"/>
        {/* Jewels */}
        <circle cx="30" cy="22" r="1.8" fill="#FFE07A" stroke="#0E0905" strokeWidth="0.3"/>
        <circle cx="50" cy="20" r="2.5" fill="#7AC4FF" stroke="#0E0905" strokeWidth="0.3"/>
        <circle cx="70" cy="22" r="1.8" fill="#FFE07A" stroke="#0E0905" strokeWidth="0.3"/>
        <circle cx="50" cy="22" r="0.8" fill="#FFFFFF" opacity="0.8"/>
      </g>
    );
  }
  if (kind === 'helmet') {
    return (
      <g>
        {/* Domed warrior helmet with edge band */}
        <path d="M 24 40 Q 24 14 50 10 Q 76 14 76 40 L 76 44 Q 50 38 24 44 Z" fill={accent}/>
        <path d="M 24 40 Q 24 14 50 10 Q 60 12 60 28 L 50 30 Q 36 30 24 40 Z" fill={accentHi} opacity="0.4"/>
        {/* Edge band */}
        <path d="M 24 40 Q 50 36 76 40 L 76 44 Q 50 40 24 44 Z" fill={accentDark}/>
        {/* Top spike */}
        <path d="M 50 10 L 48 4 L 52 4 Z" fill={accentDark}/>
        <circle cx="50" cy="3" r="1.5" fill="#FFE07A"/>
        {/* Nose guard down to face */}
        <path d="M 48 38 Q 50 50 52 38" fill={accentDark}/>
        {/* Rivet details */}
        <circle cx="32" cy="42" r="0.8" fill={accentDark}/>
        <circle cx="68" cy="42" r="0.8" fill={accentDark}/>
      </g>
    );
  }
  if (kind === 'sailor') {
    return (
      <g>
        {/* Striped headscarf with knot at side */}
        <path d="M 22 36 Q 50 14 78 36 L 78 30 Q 50 14 22 30 Z" fill="#F5F0E5"/>
        <path d="M 22 32 Q 50 16 78 32 L 78 28 Q 50 14 22 28 Z" fill={accent}/>
        <path d="M 22 28 Q 50 14 78 28 L 78 24 Q 50 12 22 24 Z" fill="#F5F0E5"/>
        <path d="M 22 24 Q 50 12 78 24 L 78 20 Q 50 10 22 20 Z" fill={accent}/>
        {/* Knot on the side */}
        <ellipse cx="76" cy="32" rx="5" ry="3" fill="#F5F0E5" stroke={accentDark} strokeWidth="0.5"/>
        <ellipse cx="76" cy="32" rx="2" ry="1.5" fill={accent} opacity="0.5"/>
        {/* Forehead earring/jewel */}
        <circle cx="50" cy="22" r="2" fill="#FFE07A" stroke="#0E0905" strokeWidth="0.4"/>
      </g>
    );
  }
  if (kind === 'scholar') {
    return (
      <g>
        {/* Scholar's tall layered turban with brooch */}
        <path d="M 20 38 Q 50 8 80 38 L 80 32 Q 50 10 20 32 Z" fill={accent}/>
        <path d="M 20 38 Q 50 22 80 38 L 80 42 Q 50 30 20 42 Z" fill="#F5F0E5"/>
        <path d="M 20 42 Q 50 30 80 42 L 80 46 Q 50 34 20 46 Z" fill={accent}/>
        {/* Highlight on top */}
        <path d="M 28 24 Q 50 14 72 24" stroke={accentHi} strokeWidth="0.8" fill="none" opacity="0.65"/>
        {/* Brooch / feather */}
        <path d="M 50 22 L 48 12 L 52 12 Z" fill="#FFE07A"/>
        <circle cx="50" cy="22" r="2" fill="#FFE07A" stroke="#0E0905" strokeWidth="0.3"/>
        <circle cx="50" cy="22" r="0.8" fill="#FF9D5C"/>
      </g>
    );
  }
  // 'none' — visible hair with strands
  return (
    <g>
      <path d="M 28 38 Q 30 18 50 18 Q 70 18 72 38 Q 70 30 50 28 Q 30 30 28 38 Z" fill={hair || '#1A1408'}/>
      <path d="M 32 32 Q 40 22 50 24" stroke={shade(hair || '#1A1408', +0.2)} strokeWidth="0.6" fill="none" opacity="0.6"/>
    </g>
  );
}
