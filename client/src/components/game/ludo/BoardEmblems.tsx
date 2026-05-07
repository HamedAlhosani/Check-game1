// Reusable SVG <symbol>s + helpers for the Emirati-themed Ludo board.
// Drop a single <BoardDefs/> into any SVG to make every emblem available
// via <use href="#emb-falcon"/> etc.

// Ludo King palette mapped onto the engine's colour keys. The engine
// hard-codes start offsets per (red/blue/green/yellow), but the player
// sees them as the four Ludo King corners — so we re-skin:
//   engine.red    → visual GREEN  (top-left)
//   engine.blue   → visual YELLOW (top-right)
//   engine.green  → visual BLUE   (bottom-right)
//   engine.yellow → visual RED    (bottom-left)
export const LUDO_EMIRATI_PALETTE = {
  red: {    // visual GREEN
    main:   '#2ECC40',
    dark:   '#1F8E2C',
    light:  '#A6E5A9',
    accent: '#27AE38',
  },
  blue: {   // visual YELLOW
    main:   '#F7CA18',
    dark:   '#A8870A',
    light:  '#FFEFA8',
    accent: '#D9B214',
  },
  green: {  // visual BLUE
    main:   '#3498DB',
    dark:   '#1F6190',
    light:  '#A9D3EE',
    accent: '#2A7AB0',
  },
  yellow: { // visual RED
    main:   '#E74C3C',
    dark:   '#9C2519',
    light:  '#F5B0A8',
    accent: '#C7392B',
  },
} as const;

export const COLOR_LABELS_AR = {
  red: 'الصقر',
  blue: 'اللؤلؤ',
  green: 'النخيل',
  yellow: 'الرمال',
} as const;

/**
 * Pattern + symbol library. Drop into the SVG once. Coordinates are
 * normalised to a 1×1 box so each emblem fits inside one grid cell or
 * a 6×6 home base when sized via <use width/height>.
 */
export function BoardDefs() {
  return (
    <defs>
      {/* ── Sand-grain pattern for path tiles ─────────────────────────── */}
      <pattern id="sand-grain" width="1" height="1" patternUnits="userSpaceOnUse">
        <rect width="1" height="1" fill="#F4E4BE" />
        <circle cx="0.18" cy="0.22" r="0.012" fill="#C9A84C" opacity="0.45" />
        <circle cx="0.74" cy="0.31" r="0.010" fill="#A07830" opacity="0.40" />
        <circle cx="0.45" cy="0.55" r="0.013" fill="#C9A84C" opacity="0.35" />
        <circle cx="0.82" cy="0.78" r="0.011" fill="#A07830" opacity="0.45" />
        <circle cx="0.21" cy="0.83" r="0.010" fill="#C9A84C" opacity="0.40" />
        <circle cx="0.62" cy="0.68" r="0.012" fill="#A07830" opacity="0.30" />
        <circle cx="0.92" cy="0.12" r="0.009" fill="#C9A84C" opacity="0.50" />
        <circle cx="0.10" cy="0.50" r="0.011" fill="#A07830" opacity="0.35" />
      </pattern>

      {/* ── Khatim (8-point Arabic geometric star) ────────────────────── */}
      {/* Used on safe path tiles. ViewBox 0..1, centered at (0.5, 0.5). */}
      <symbol id="emb-khatim" viewBox="0 0 1 1">
        <g transform="translate(0.5 0.5)">
          {/* Two overlapping squares rotated 45° = 8-point star */}
          <rect x="-0.32" y="-0.32" width="0.64" height="0.64"
            fill="#C9A84C" stroke="#7A6303" strokeWidth="0.02" />
          <rect x="-0.32" y="-0.32" width="0.64" height="0.64"
            fill="#E8C97A" stroke="#7A6303" strokeWidth="0.02"
            transform="rotate(45)" />
          <circle r="0.12" fill="#7A6303" stroke="#C9A84C" strokeWidth="0.02" />
        </g>
      </symbol>

      {/* ── Falcon silhouette (red home base) ─────────────────────────── */}
      <symbol id="emb-falcon" viewBox="0 0 6 6">
        <g fill="currentColor">
          {/* Body + tail */}
          <path d="M 1.6 3.0 Q 2.4 2.4 3.6 2.5 Q 4.8 2.7 4.5 3.4 Q 4.0 4.0 3.2 4.2 L 1.6 3.5 Z" />
          {/* Outstretched wing */}
          <path d="M 1.5 3.1 Q 0.4 2.0 0.2 0.9 Q 1.4 1.6 2.4 2.7 Z" />
          {/* Head + beak */}
          <path d="M 4.4 3.0 Q 4.9 2.6 5.1 2.4 L 5.6 2.6 L 5.1 2.85 L 5.0 3.2 Z" />
          {/* Eye */}
          <circle cx="4.95" cy="2.78" r="0.08" fill="#F4D6C9" />
          {/* Talons */}
          <path d="M 3.0 4.2 L 2.85 4.7 L 2.95 4.7 L 3.05 4.4 Z M 3.4 4.25 L 3.3 4.75 L 3.4 4.75 L 3.5 4.45 Z" />
        </g>
      </symbol>

      {/* ── Pearl + half-shell (blue home base) ───────────────────────── */}
      <symbol id="emb-pearl" viewBox="0 0 6 6">
        <g>
          {/* Open shell — bottom half */}
          <path d="M 0.9 3.2 Q 3.0 5.2 5.1 3.2 Q 4.6 4.4 3.0 4.6 Q 1.4 4.4 0.9 3.2 Z"
            fill="currentColor" opacity="0.85" />
          <path d="M 0.9 3.2 Q 3.0 1.6 5.1 3.2"
            fill="none" stroke="currentColor" strokeWidth="0.08" />
          {/* Pearl */}
          <circle cx="3" cy="3.0" r="0.85" fill="#FFFFFF" opacity="0.95" />
          <circle cx="2.7" cy="2.7" r="0.32" fill="#FFFFFF" />
          <circle cx="3" cy="3.0" r="0.85" fill="none" stroke="#6FB7D6" strokeWidth="0.04" />
          {/* Shell ridges */}
          <path d="M 1.8 3.5 Q 3.0 4.1 4.2 3.5" fill="none" stroke="#6FB7D6" strokeWidth="0.04" opacity="0.6" />
          <path d="M 2.0 3.0 Q 3.0 3.6 4.0 3.0" fill="none" stroke="#6FB7D6" strokeWidth="0.04" opacity="0.45" />
        </g>
      </symbol>

      {/* ── Date palm tree (green home base) ──────────────────────────── */}
      <symbol id="emb-palm" viewBox="0 0 6 6">
        <g fill="currentColor">
          {/* Trunk with rings */}
          <path d="M 2.7 5.5 L 2.85 2.4 L 3.15 2.4 L 3.3 5.5 Z" />
          <line x1="2.75" y1="3.0" x2="3.25" y2="3.0" stroke="#1A3D24" strokeWidth="0.06" />
          <line x1="2.75" y1="3.6" x2="3.25" y2="3.6" stroke="#1A3D24" strokeWidth="0.06" />
          <line x1="2.75" y1="4.2" x2="3.25" y2="4.2" stroke="#1A3D24" strokeWidth="0.06" />
          <line x1="2.75" y1="4.8" x2="3.25" y2="4.8" stroke="#1A3D24" strokeWidth="0.06" />
          {/* Date cluster */}
          <circle cx="2.7" cy="2.5" r="0.10" fill="#8B5A24" />
          <circle cx="3.0" cy="2.45" r="0.10" fill="#8B5A24" />
          <circle cx="3.3" cy="2.5" r="0.10" fill="#8B5A24" />
          {/* 8 fronds — quadratic Béziers fanning out */}
          <path d="M 3.0 2.3 Q 1.4 2.0 0.4 2.6 Q 1.6 1.7 3.0 2.0 Z" />
          <path d="M 3.0 2.3 Q 4.6 2.0 5.6 2.6 Q 4.4 1.7 3.0 2.0 Z" />
          <path d="M 3.0 2.3 Q 1.6 1.0 0.6 0.6 Q 2.0 0.9 3.0 1.9 Z" />
          <path d="M 3.0 2.3 Q 4.4 1.0 5.4 0.6 Q 4.0 0.9 3.0 1.9 Z" />
          <path d="M 3.0 2.3 Q 2.0 0.6 1.7 0.0 Q 2.6 0.5 3.05 1.9 Z" />
          <path d="M 3.0 2.3 Q 4.0 0.6 4.3 0.0 Q 3.4 0.5 2.95 1.9 Z" />
          <path d="M 3.0 2.3 Q 1.2 1.5 0.0 1.5 Q 1.5 1.4 3.0 2.0 Z" />
          <path d="M 3.0 2.3 Q 4.8 1.5 6.0 1.5 Q 4.5 1.4 3.0 2.0 Z" />
        </g>
      </symbol>

      {/* ── Triple dune crest with sun (yellow home base) ─────────────── */}
      <symbol id="emb-dunes" viewBox="0 0 6 6">
        <g fill="currentColor">
          {/* Sun behind dunes */}
          <circle cx="4.4" cy="1.9" r="0.85" fill="#F6E6BE" opacity="0.95" />
          <circle cx="4.4" cy="1.9" r="0.85" fill="none" stroke="currentColor" strokeWidth="0.05" opacity="0.6" />
          {/* Back dune */}
          <path d="M 0 4.3 Q 1.5 3.2 3 3.8 T 6 3.5 L 6 6 L 0 6 Z" opacity="0.55" />
          {/* Mid dune */}
          <path d="M 0 4.8 Q 2 3.7 3.5 4.4 T 6 4.1 L 6 6 L 0 6 Z" opacity="0.75" />
          {/* Front dune (darker) */}
          <path d="M 0 5.2 Q 1.5 4.5 3 5.0 Q 4.5 5.4 6 4.8 L 6 6 L 0 6 Z" />
          {/* Tiny camel silhouette atop the front dune */}
          <g transform="translate(2.1 4.65) scale(0.25)" fill="#5E3A18">
            <path d="M 0 1.2 L 0.4 0.4 L 0.7 1.0 L 1.0 0.4 L 1.3 1.0 L 1.7 0.6 L 1.9 1.2 L 1.7 1.6 L 0.2 1.6 Z" />
            <path d="M 0.1 1.6 L 0 2.2 L 0.2 2.2 L 0.3 1.6 Z M 1.6 1.6 L 1.5 2.2 L 1.7 2.2 L 1.8 1.6 Z" />
          </g>
        </g>
      </symbol>

      {/* ── Page-background SVGs (used outside the board) ─────────────── */}
      <symbol id="bg-burj-khalifa" viewBox="0 0 100 320">
        {/* Tapered tower with stepped tiers */}
        <path d="M 50 0 L 56 80 L 60 160 L 64 240 L 70 320 L 30 320 L 36 240 L 40 160 L 44 80 Z" />
        <line x1="50" y1="0" x2="50" y2="-20" stroke="currentColor" strokeWidth="2" />
        <circle cx="50" cy="-22" r="2" />
      </symbol>

      <symbol id="bg-burj-al-arab" viewBox="0 0 120 220">
        {/* Sail-shaped silhouette */}
        <path d="M 60 0 Q 20 110 10 220 L 110 220 Q 100 110 60 0 Z" />
        <path d="M 60 10 Q 30 110 25 220 L 60 220 Z" opacity="0.85" />
      </symbol>

      <symbol id="bg-frame" viewBox="0 0 240 200">
        {/* Dubai Frame — square arch */}
        <rect x="0" y="0" width="240" height="200" fill="none" stroke="currentColor" strokeWidth="14" />
        <rect x="20" y="20" width="200" height="160" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      </symbol>

      <symbol id="bg-palm" viewBox="0 0 100 200">
        <g fill="currentColor">
          {/* Trunk */}
          <path d="M 47 200 L 49 70 L 51 70 L 53 200 Z" />
          {/* Rings */}
          <line x1="46" y1="170" x2="54" y2="170" stroke="#000" strokeWidth="1.5" opacity="0.6" />
          <line x1="46" y1="140" x2="54" y2="140" stroke="#000" strokeWidth="1.5" opacity="0.6" />
          <line x1="46" y1="110" x2="54" y2="110" stroke="#000" strokeWidth="1.5" opacity="0.6" />
          <line x1="46" y1="85"  x2="54" y2="85"  stroke="#000" strokeWidth="1.5" opacity="0.6" />
          {/* Fronds */}
          <path d="M 50 70 Q 10 50 -8 70 Q 18 30 50 60 Z" />
          <path d="M 50 70 Q 90 50 108 70 Q 82 30 50 60 Z" />
          <path d="M 50 70 Q 25 25 5 0 Q 32 18 52 58 Z" />
          <path d="M 50 70 Q 75 25 95 0 Q 68 18 48 58 Z" />
          <path d="M 50 70 Q 50 30 45 -10 Q 55 22 52 60 Z" />
          <path d="M 50 70 Q 0 60 -15 50 Q 20 50 50 65 Z" />
          <path d="M 50 70 Q 100 60 115 50 Q 80 50 50 65 Z" />
        </g>
      </symbol>

      <symbol id="bg-dune" viewBox="0 0 1440 200">
        <path d="M 0 100 Q 200 40 400 80 T 800 60 T 1200 90 T 1440 70 L 1440 200 L 0 200 Z" />
      </symbol>
    </defs>
  );
}

/**
 * Page-level decorative background — desert night with skyline + dunes +
 * palms. Sits behind everything via `position: fixed; z-index: -1`.
 */
export function LudoPageBackground() {
  return (
    <svg
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, width: '100%', height: '100%' }}
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#0E0905" />
          <stop offset="55%" stopColor="#2A1408" />
          <stop offset="78%" stopColor="#5E2A10" />
          <stop offset="100%" stopColor="#1A1408" />
        </linearGradient>
        <radialGradient id="lp-moon" cx="78%" cy="22%" r="6%">
          <stop offset="0%"   stopColor="#F6E6BE" stopOpacity="1" />
          <stop offset="100%" stopColor="#F6E6BE" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sky */}
      <rect width="1440" height="900" fill="url(#lp-sky)" />
      <rect width="1440" height="900" fill="url(#lp-moon)" />

      {/* Stars */}
      {Array.from({ length: 50 }).map((_, i) => {
        const x = (i * 137) % 1440;
        const y = (i * 53) % 480;
        const r = (i % 5 === 0) ? 1.4 : 0.8;
        return <circle key={i} cx={x} cy={y} r={r} fill="#F6E6BE" opacity={(i % 3) * 0.18 + 0.3} />;
      })}

      {/* Moon */}
      <circle cx="1120" cy="200" r="30" fill="#F6E6BE" opacity="0.92" />
      <circle cx="1120" cy="200" r="30" fill="none" stroke="#C9A84C" strokeWidth="0.4" opacity="0.4" />

      {/* Faint Arabic poetry watermark — reads as ornament, not text */}
      <text
        x="720" y="120" textAnchor="middle"
        fontFamily="'Cairo', 'Scheherazade New', serif"
        fontSize="28" fill="#C9A84C" opacity="0.07"
        letterSpacing="6"
        style={{ direction: 'rtl' }}>
        على رمال الدار يلعب أهلنا
      </text>

      {/* Skyline silhouette around horizon (~y=620) */}
      <g fill="#0A0604" opacity="0.92">
        {/* Etihad Towers — 4 staggered parallelograms */}
        <path d="M 180 620 L 200 350 L 220 620 Z" />
        <path d="M 230 620 L 252 320 L 274 620 Z" />
        <path d="M 282 620 L 304 380 L 326 620 Z" />
        <path d="M 334 620 L 356 360 L 378 620 Z" />
        {/* Burj Khalifa */}
        <path d="M 700 620 L 712 280 L 718 180 L 722 80 L 726 180 L 732 280 L 744 620 Z" />
        <line x1="722" y1="80" x2="722" y2="40" stroke="#0A0604" strokeWidth="1.5" />
        <circle cx="722" cy="38" r="2" />
        {/* Dubai Frame */}
        <rect x="850" y="430" width="180" height="190" fill="#0A0604" />
        <rect x="868" y="448" width="144" height="154" fill="url(#lp-sky)" />
        {/* Burj Al Arab */}
        <path d="M 1100 620 Q 1075 380 1110 250 Q 1145 380 1135 620 Z" />
        {/* Sheikh Zayed Mosque dome */}
        <path d="M 460 620 L 440 520 Q 460 460 480 460 Q 500 460 520 520 L 500 620 Z" />
        <circle cx="480" cy="465" r="12" fill="#0A0604" />
        <line x1="480" y1="455" x2="480" y2="430" stroke="#0A0604" strokeWidth="2" />
        <circle cx="480" cy="427" r="3" />
      </g>

      {/* Dunes (3 layered) */}
      <g>
        <path d="M 0 720 Q 200 660 400 700 T 800 680 T 1200 710 T 1440 690 L 1440 900 L 0 900 Z"
          fill="#3A2410" opacity="0.95" />
        <path d="M 0 770 Q 250 720 500 760 T 1000 750 T 1440 760 L 1440 900 L 0 900 Z"
          fill="#5E3A18" opacity="0.95" />
        <path d="M 0 820 Q 300 790 600 820 T 1200 820 T 1440 815 L 1440 900 L 0 900 Z"
          fill="#8B5A24" opacity="0.95" />
        {/* Sand highlight */}
        <path d="M 0 720 Q 200 660 400 700 T 800 680 T 1200 710 T 1440 690"
          fill="none" stroke="#C9A84C" strokeWidth="0.6" opacity="0.45" />
      </g>

      {/* Flanking palm silhouettes */}
      <g fill="#0A0604" opacity="0.78">
        {/* Left */}
        <g transform="translate(40 700)">
          <path d="M 47 200 L 49 70 L 51 70 L 53 200 Z" />
          <path d="M 50 70 Q 10 50 -8 70 Q 18 30 50 60 Z" />
          <path d="M 50 70 Q 90 50 108 70 Q 82 30 50 60 Z" />
          <path d="M 50 70 Q 25 25 5 0 Q 32 18 52 58 Z" />
          <path d="M 50 70 Q 75 25 95 0 Q 68 18 48 58 Z" />
          <path d="M 50 70 Q 0 60 -15 50 Q 20 50 50 65 Z" />
          <path d="M 50 70 Q 100 60 115 50 Q 80 50 50 65 Z" />
        </g>
        {/* Right (mirrored) */}
        <g transform="translate(1300 670)">
          <path d="M 47 200 L 49 70 L 51 70 L 53 200 Z" />
          <path d="M 50 70 Q 10 50 -8 70 Q 18 30 50 60 Z" />
          <path d="M 50 70 Q 90 50 108 70 Q 82 30 50 60 Z" />
          <path d="M 50 70 Q 25 25 5 0 Q 32 18 52 58 Z" />
          <path d="M 50 70 Q 75 25 95 0 Q 68 18 48 58 Z" />
          <path d="M 50 70 Q 0 60 -15 50 Q 20 50 50 65 Z" />
          <path d="M 50 70 Q 100 60 115 50 Q 80 50 50 65 Z" />
        </g>
      </g>
    </svg>
  );
}
