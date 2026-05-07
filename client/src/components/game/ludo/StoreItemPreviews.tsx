// Per-item visual previews for the Ludo store. Each dice / board / character
// item gets a unique rendering so the store reads as a real shop, not a
// catalogue of identical placeholders.

import { CharacterArt } from '../../shared/CharacterArt';

// ─── Hex palettes per item id ────────────────────────────────────────────────
// The shared STORE_ITEMS table uses Tailwind class names, which doesn't help
// when you want to draw a real dice with specific gradients. We map id →
// { face1, face2, faceEdge, pip, accent } here so each preview is hand-tuned.

interface DicePalette { face1: string; face2: string; faceEdge: string; pip: string; accent: string; pattern?: 'falcon' | 'crystal' | 'plain'; }

const DICE_PALETTES: Record<string, DicePalette> = {
  dice_classic: {
    face1: '#FAFAF8', face2: '#D8D5CE', faceEdge: '#9C9890',
    pip: '#1A1A1A', accent: '#7A6303', pattern: 'plain',
  },
  dice_gold: {
    face1: '#FFE799', face2: '#E8C97A', faceEdge: '#7A6303',
    pip: '#3A2A05', accent: '#FFD700', pattern: 'plain',
  },
  dice_amber: {
    face1: '#F5C56A', face2: '#A8651C', faceEdge: '#5C3A0A',
    pip: '#2A1408', accent: '#FFA94D', pattern: 'plain',
  },
  dice_falcon: {
    face1: '#5C3A18', face2: '#2A1408', faceEdge: '#0E0905',
    pip: '#F4D6C9', accent: '#C8323A', pattern: 'falcon',
  },
  dice_crystal: {
    face1: '#E0F4FA', face2: '#A0D8E8', faceEdge: '#4A8FA0',
    pip: '#2A5A6E', accent: '#9DD8E8', pattern: 'crystal',
  },
};

// ─── Mini 3D dice using a perspective cube ───────────────────────────────────
function MiniDicePreview({ id }: { id: string }) {
  const p = DICE_PALETTES[id] || DICE_PALETTES.dice_classic;
  const size = 60;
  const half = size / 2;

  // 3 dots layout for the front face — matches the "3" face on a real die.
  const PIPS_3: [number, number][] = [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]];
  const PIPS_2: [number, number][] = [[0.3, 0.3], [0.7, 0.7]];

  // Idle resting tilt so the cube looks 3D.
  const restRx = -22, restRy = 26;

  const faceBase = {
    width: size, height: size,
    borderRadius: '14%',
    position: 'absolute' as const,
    background: `
      radial-gradient(circle at 28% 22%, rgba(255,255,255,0.45) 0%, transparent 38%),
      linear-gradient(135deg, ${p.face1} 0%, ${p.face2} 100%)
    `,
    border: `2px solid ${p.faceEdge}`,
    boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.5), inset 0 -1.5px 0 rgba(0,0,0,0.35)',
  };

  return (
    <div className="rounded-xl mb-2 flex items-center justify-center"
      style={{
        height: 84,
        background: 'linear-gradient(135deg, #2A1F12 0%, #14100A 100%)',
        border: '1.5px solid rgba(201,168,76,0.30)',
      }}>
      <div style={{ width: size, height: size, perspective: size * 4 }}>
        <div style={{
          position: 'relative', width: '100%', height: '100%',
          transformStyle: 'preserve-3d',
          transform: `rotateX(${restRx}deg) rotateY(${restRy}deg)`,
          // Crystal pattern: glow halo
          filter: p.pattern === 'crystal' ? `drop-shadow(0 0 14px ${p.accent})` : `drop-shadow(0 6px 10px rgba(0,0,0,0.6))`,
        }}>
          {/* Front face — depending on pattern */}
          <div style={{ ...faceBase, transform: `translateZ(${half}px)` }}>
            {p.pattern === 'falcon' ? (
              // Falcon eye: a single pip with red iris ring
              <div style={{
                position: 'absolute', left: '50%', top: '50%',
                transform: 'translate(-50%, -50%)',
                width: size * 0.34, height: size * 0.34,
                borderRadius: '50%',
                background: `radial-gradient(circle at 45% 40%, ${p.accent} 0%, ${p.pip} 65%)`,
                boxShadow: `0 0 8px ${p.accent}, inset 0 1px 0 rgba(255,255,255,0.3)`,
              }}>
                <div style={{
                  position: 'absolute', left: '50%', top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '40%', height: '40%',
                  borderRadius: '50%',
                  background: '#0E0905',
                }} />
              </div>
            ) : (
              PIPS_3.map(([x, y], i) => (
                <div key={i} style={{
                  position: 'absolute',
                  left: `${x * 100}%`, top: `${y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  width: size * 0.13, height: size * 0.13,
                  borderRadius: '50%',
                  background: `radial-gradient(circle at 32% 28%, ${p.pip}, ${p.pip}EE)`,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.4), 0 1px 1px rgba(255,255,255,0.4)`,
                }} />
              ))
            )}
          </div>

          {/* Right face — '2' */}
          <div style={{
            ...faceBase,
            transform: `rotateY(-90deg) translateZ(${half}px)`,
            background: `linear-gradient(135deg, ${p.face2} 0%, ${p.faceEdge} 100%)`,
          }}>
            {p.pattern !== 'falcon' && PIPS_2.map(([x, y], i) => (
              <div key={i} style={{
                position: 'absolute',
                left: `${x * 100}%`, top: `${y * 100}%`,
                transform: 'translate(-50%, -50%)',
                width: size * 0.12, height: size * 0.12,
                borderRadius: '50%',
                background: p.pip,
                opacity: 0.85,
              }} />
            ))}
          </div>

          {/* Top face — single pip (1) */}
          <div style={{
            ...faceBase,
            transform: `rotateX(90deg) translateZ(${half}px)`,
            background: `linear-gradient(135deg, ${p.face1} 0%, ${p.face2} 100%)`,
          }}>
            <div style={{
              position: 'absolute', left: '50%', top: '50%',
              transform: 'translate(-50%, -50%)',
              width: size * 0.16, height: size * 0.16,
              borderRadius: '50%',
              background: p.pip,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 1px 1px rgba(255,255,255,0.5)',
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Per-board palette ───────────────────────────────────────────────────────
interface BoardPalette { bg: string; rim: string; accent: string; star: string; corners: [string, string, string, string]; texture?: 'sand' | 'palm' | 'stars' | 'royal' | 'plain'; }

const BOARD_PALETTES: Record<string, BoardPalette> = {
  board_classic: {
    bg: '#1A1A2E', rim: '#0E0E18', accent: '#3A3A52',
    star: '#9CA3AF',
    corners: ['#E74C3C', '#4A90D9', '#7AC74F', '#F1C40F'],
    texture: 'plain',
  },
  board_desert: {
    bg: '#5C3A18', rim: '#2A1408', accent: '#C9A84C',
    star: '#F6E6BE',
    corners: ['#C8323A', '#2E6FA8', '#3F8E55', '#D9A441'],
    texture: 'sand',
  },
  board_oasis: {
    bg: '#1F4D2A', rim: '#0E2A14', accent: '#7AC74F',
    star: '#C8E5AE',
    corners: ['#C8323A', '#2E6FA8', '#3F8E55', '#D9A441'],
    texture: 'palm',
  },
  board_night: {
    bg: '#0A1A3A', rim: '#020714', accent: '#6FB7D6',
    star: '#FFFFFF',
    corners: ['#C8323A', '#2E6FA8', '#3F8E55', '#D9A441'],
    texture: 'stars',
  },
  board_royal: {
    bg: '#3D1B5C', rim: '#1F0E2E', accent: '#C495FF',
    star: '#F6E6BE',
    corners: ['#C8323A', '#2E6FA8', '#3F8E55', '#D9A441'],
    texture: 'royal',
  },
};

function MiniBoardPreview({ id }: { id: string }) {
  const p = BOARD_PALETTES[id] || BOARD_PALETTES.board_classic;
  return (
    <div className="rounded-xl mb-2 flex items-center justify-center relative overflow-hidden"
      style={{
        height: 84,
        background: `linear-gradient(135deg, ${p.rim} 0%, ${p.bg} 100%)`,
        border: `1.5px solid ${p.accent}77`,
      }}>
      {/* Texture overlay */}
      {p.texture === 'stars' && (
        <svg className="absolute inset-0" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ opacity: 0.55 }}>
          {Array.from({ length: 14 }).map((_, i) => {
            const x = (i * 17) % 100;
            const y = (i * 11) % 100;
            return <circle key={i} cx={x} cy={y} r={i % 4 === 0 ? 0.7 : 0.4} fill={p.star} />;
          })}
        </svg>
      )}
      {p.texture === 'sand' && (
        <svg className="absolute inset-0" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ opacity: 0.45 }}>
          <path d="M0,80 Q25,72 50,78 T100,76 L100,100 L0,100 Z" fill={p.accent} />
          <path d="M0,90 Q30,85 60,89 T100,88 L100,100 L0,100 Z" fill={p.accent} opacity={0.6} />
        </svg>
      )}
      {p.texture === 'palm' && (
        <svg className="absolute inset-0" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ opacity: 0.4 }}>
          {/* Tiny palm silhouettes in corners */}
          {[[6, 76], [88, 76]].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`} fill={p.accent}>
              <rect x={-1} y={-12} width={2} height={20} />
              <path d="M0,-12 Q-8,-14 -10,-9 Q-3,-13 0,-10 Z" />
              <path d="M0,-12 Q8,-14 10,-9 Q3,-13 0,-10 Z" />
              <path d="M0,-12 Q-3,-20 -8,-22 Q-1,-18 0,-13 Z" />
              <path d="M0,-12 Q3,-20 8,-22 Q1,-18 0,-13 Z" />
            </g>
          ))}
        </svg>
      )}
      {p.texture === 'royal' && (
        <svg className="absolute inset-0" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ opacity: 0.35 }}>
          {/* Damask-ish pattern */}
          {Array.from({ length: 5 }).map((_, r) =>
            Array.from({ length: 6 }).map((__, c) => {
              const x = c * 18 + (r % 2 ? 9 : 0);
              const y = r * 18;
              return <text key={`${r}-${c}`} x={x} y={y + 12} fontSize="6" fill={p.accent}>✦</text>;
            })
          )}
        </svg>
      )}

      {/* Mini cross board */}
      <div className="grid relative"
        style={{
          width: 60, height: 60,
          gridTemplateColumns: 'repeat(5, 1fr)',
          gridTemplateRows: 'repeat(5, 1fr)',
          gap: 1,
          background: p.rim,
          padding: 2,
          borderRadius: 6,
          border: `1.5px solid ${p.accent}99`,
          boxShadow: `0 0 14px ${p.accent}55`,
        }}>
        {/* Four colored corner home tiles + cross arms + center */}
        {[
          [0, 0, p.corners[0]], [0, 4, p.corners[1]],
          [4, 0, p.corners[3]], [4, 4, p.corners[2]],
          [2, 0, p.bg], [2, 1, p.bg], [2, 3, p.bg], [2, 4, p.bg],
          [0, 2, p.bg], [1, 2, p.bg], [3, 2, p.bg], [4, 2, p.bg],
          [2, 2, p.accent],
        ].map(([r, c, bg], i) => (
          <div key={i} style={{
            gridRow: (r as number) + 1, gridColumn: (c as number) + 1,
            background: bg as string,
            borderRadius: 1.5,
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Top-level dispatcher ────────────────────────────────────────────────────
export function StoreItemPreview({ item }: { item: { id: string; category: string } }) {
  if (item.category === 'character') {
    return (
      <div className="rounded-xl mb-2 flex items-center justify-center relative overflow-hidden"
        style={{
          height: 84,
          background: 'linear-gradient(135deg, #2A1F12 0%, #14100A 100%)',
          border: '1.5px solid rgba(201,168,76,0.30)',
        }}>
        <CharacterArt id={item.id} size={68} />
      </div>
    );
  }
  if (item.category === 'diceSkin')  return <MiniDicePreview id={item.id} />;
  if (item.category === 'boardTheme') return <MiniBoardPreview id={item.id} />;
  // Fallback (shouldn't hit since Ludo store is filtered to these 3 cats)
  return (
    <div className="rounded-xl mb-2 flex items-center justify-center"
      style={{ height: 84, background: '#14100A', border: '1.5px solid rgba(201,168,76,0.20)' }}>
      <span style={{ fontSize: 32 }}>?</span>
    </div>
  );
}
