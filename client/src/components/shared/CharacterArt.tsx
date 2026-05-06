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

function SvgPortrait({ id, size, ring }: { id: string; size: number; ring?: boolean }) {
  const p = PORTRAITS[id] || PORTRAITS.avatar_1;
  const ringStyle = ring
    ? { boxShadow: '0 0 0 2px rgba(232,201,122,0.5), 0 0 16px rgba(232,201,122,0.3)' }
    : {};
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      overflow: 'hidden', position: 'relative',
      background: `radial-gradient(circle at 30% 25%, ${p.accent}33, ${p.accent}11 40%, #0E0905 100%)`,
      ...ringStyle,
    }}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        {/* Neck/shoulders */}
        <ellipse cx="50" cy="105" rx="38" ry="22" fill={p.accent} opacity="0.9"/>
        <ellipse cx="50" cy="78"  rx="14" ry="10" fill={p.skin}/>
        {/* Face */}
        <ellipse cx="50" cy="50" rx="22" ry="26" fill={p.skin}/>
        {/* Beard */}
        {p.beard === 'short' && (
          <path d={`M 32 60 Q 50 78 68 60 Q 64 70 50 72 Q 36 70 32 60 Z`} fill={p.hair}/>
        )}
        {p.beard === 'long' && (
          <path d={`M 30 56 Q 50 90 70 56 Q 64 80 50 82 Q 36 80 30 56 Z`} fill={p.hair}/>
        )}
        {/* Eyes */}
        <ellipse cx="42" cy="48" rx="2" ry="2.4" fill="#1A1408"/>
        <ellipse cx="58" cy="48" rx="2" ry="2.4" fill="#1A1408"/>
        {/* Eyebrows */}
        <path d="M 38 43 Q 42 41 46 43" stroke={p.hair} strokeWidth="1.6" fill="none" strokeLinecap="round"/>
        <path d="M 54 43 Q 58 41 62 43" stroke={p.hair} strokeWidth="1.6" fill="none" strokeLinecap="round"/>
        {/* Headwear */}
        <Headwear kind={p.headwear} accent={p.accent}/>
      </svg>
    </div>
  );
}

function Headwear({ kind, accent }: { kind: string; accent: string }) {
  if (kind === 'ghutra') {
    return (
      <g>
        {/* White ghutra base */}
        <path d="M 22 38 Q 22 18 50 16 Q 78 18 78 38 L 78 62 Q 70 64 65 58 L 65 38 Q 50 28 35 38 L 35 58 Q 30 64 22 62 Z"
          fill="#F5F0E5"/>
        {/* Black agal cord */}
        <path d="M 28 32 Q 50 22 72 32" stroke="#1A1408" strokeWidth="2.5" fill="none"/>
        <path d="M 28 36 Q 50 26 72 36" stroke="#1A1408" strokeWidth="2.5" fill="none"/>
        {/* Accent stripe */}
        <path d="M 35 38 Q 50 30 65 38" stroke={accent} strokeWidth="1.2" fill="none" opacity="0.6"/>
      </g>
    );
  }
  if (kind === 'turban') {
    return (
      <g>
        <path d="M 24 36 Q 50 14 76 36 L 76 32 Q 50 16 24 32 Z" fill={accent}/>
        <path d="M 24 36 Q 50 22 76 36 L 76 40 Q 50 30 24 40 Z" fill="#F5F0E5"/>
        <path d="M 24 40 Q 50 30 76 40 L 76 44 Q 50 36 24 44 Z" fill={accent}/>
      </g>
    );
  }
  if (kind === 'crown') {
    return (
      <g>
        <path d="M 28 30 L 36 18 L 44 28 L 50 14 L 56 28 L 64 18 L 72 30 L 72 36 L 28 36 Z" fill={accent}/>
        <circle cx="36" cy="22" r="2" fill="#FFE07A"/>
        <circle cx="50" cy="18" r="2.5" fill="#7AC4FF"/>
        <circle cx="64" cy="22" r="2" fill="#FFE07A"/>
      </g>
    );
  }
  if (kind === 'helmet') {
    return (
      <g>
        <path d="M 26 36 Q 26 18 50 14 Q 74 18 74 36 L 74 42 Q 50 36 26 42 Z" fill={accent}/>
        <path d="M 50 14 L 50 8 L 56 12" stroke="#FFE07A" strokeWidth="2" fill="none"/>
        <rect x="48" y="36" width="4" height="20" fill="#1A1408"/>
      </g>
    );
  }
  if (kind === 'sailor') {
    return (
      <g>
        {/* Sailor's headscarf — striped */}
        <path d="M 24 38 Q 50 18 76 38 L 76 32 Q 50 18 24 32 Z" fill="#F5F0E5"/>
        <path d="M 24 32 Q 50 18 76 32 L 76 28 Q 50 16 24 28 Z" fill={accent}/>
        <circle cx="50" cy="22" r="3" fill="#FFE07A" stroke="#1A1408" strokeWidth="0.5"/>
      </g>
    );
  }
  if (kind === 'scholar') {
    return (
      <g>
        {/* Scholar turban with extra layer */}
        <path d="M 22 36 Q 50 12 78 36 L 78 32 Q 50 14 22 32 Z" fill={accent}/>
        <path d="M 22 36 Q 50 24 78 36 L 78 40 Q 50 32 22 40 Z" fill="#F5F0E5"/>
        <path d="M 22 40 Q 50 32 78 40 L 78 44 Q 50 38 22 44 Z" fill={accent}/>
        <circle cx="50" cy="20" r="2.5" fill="#FFE07A"/>
      </g>
    );
  }
  // 'none' — small hair lock
  return (
    <g>
      <path d="M 30 40 Q 35 22 50 22 Q 65 22 70 40" fill="#1A1408" opacity="0.85"/>
    </g>
  );
}
