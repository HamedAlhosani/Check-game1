import { ReactNode } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

/**
 * Game-hub style frame for every non-game page.
 *
 *  Departs from the "top nav with back button" idiom most pages used
 *  to ship. Instead:
 *    1. NO top nav. The page opens with a curved-bottom hero banner
 *       carrying the page title in a giant display font.
 *    2. A floating circular back button sits in the top-leading
 *       corner above the banner — large tap target, separated from
 *       the title.
 *    3. An optional `right` slot floats on the trailing edge of the
 *       banner (used for things like the player's coin pill or rank
 *       badge).
 *    4. Content area below scrolls under the banner.
 *    5. A floating dock at the bottom (mobile + desktop) carries
 *       the primary navigation (Home / Store / Tournaments /
 *       Friends / Profile). Replaces the old "back to home" pattern
 *       — the player can jump anywhere from any page in one tap.
 *
 *  All chrome is rounded, floating and detached — pages read like
 *  panels in a mobile game, not pages of a web app.
 */
export function PageShell({
  title, subtitle, lang, right, children,
  back = '/home',
  maxWidth = 760,
  /** Hide the floating dock — used by pages that already have their
   *  own bottom UI (e.g. modal shells). */
  noDock = false,
}: {
  title: string;
  subtitle?: string;
  lang: string;
  right?: ReactNode;
  back?: string;
  children: ReactNode;
  maxWidth?: number;
  noDock?: boolean;
}) {
  const navigate = useNavigate();
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <div className="min-h-screen relative" style={{
      background: 'radial-gradient(ellipse at top, #1A1408 0%, #0E0905 60%, #08050A 100%)',
      direction: dir,
      paddingBottom: noDock ? 24 : 96,
    }}>
      {/* ── Curved-bottom banner ── A solid gradient slab whose lower
            edge is a wide gentle wave, drawn with an inline SVG so the
            shape stays crisp at any size. */}
      <div
        className="relative"
        style={{
          background:
            'linear-gradient(180deg, rgba(60,40,12,0.85) 0%, rgba(40,28,12,0.85) 60%, rgba(20,14,8,0.85) 100%)',
          paddingTop: 14,
          paddingBottom: 42,
          marginBottom: -14,
        }}
      >
        {/* Hairline ornament across the very top */}
        <div
          aria-hidden
          style={{
            position: 'absolute', top: 0, left: '8%', right: '8%', height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(232,201,122,0.55), transparent)',
          }}
        />

        <div className="flex items-start justify-between gap-3 px-4 pt-2 relative z-10">
          {/* Floating round back button */}
          <motion.button
            whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
            onClick={() => navigate(back)}
            className="rounded-full flex items-center justify-center shrink-0"
            style={{
              width: 46, height: 46,
              background: 'radial-gradient(circle at 30% 30%, rgba(201,168,76,0.30), rgba(60,40,16,0.55) 70%)',
              border: '2px solid rgba(232,201,122,0.55)',
              boxShadow: '0 6px 16px rgba(0,0,0,0.55), inset 0 -3px 8px rgba(0,0,0,0.45), 0 0 14px rgba(232,201,122,0.20)',
              color: '#E8C97A', fontSize: 26, lineHeight: 1, fontWeight: 700,
              cursor: 'pointer',
            }}
            aria-label={lang === 'ar' ? 'رجوع' : 'Back'}>
            {lang === 'ar' ? '›' : '‹'}
          </motion.button>

          {/* Title centered + floating */}
          <div className="flex-1 min-w-0 text-center pt-1">
            <h1 className="font-display tracking-widest"
              style={{
                fontSize: 28, color: '#E8C97A',
                letterSpacing: '0.18em', lineHeight: 1,
                textShadow: '0 2px 12px rgba(232,201,122,0.35), 0 0 28px rgba(201,168,76,0.20)',
              }}>
              {title}
            </h1>
            {subtitle && (
              <p className="font-arabic mt-1 truncate" style={{ fontSize: 12, color: 'rgba(245,230,200,0.50)' }}>
                {subtitle}
              </p>
            )}
          </div>

          {/* Right floating slot */}
          <div className="shrink-0 pt-0.5">
            {right ?? <div style={{ width: 46, height: 46 }} />}
          </div>
        </div>

        {/* Curved bottom edge */}
        <svg
          aria-hidden viewBox="0 0 1440 60" preserveAspectRatio="none"
          className="block w-full"
          style={{ height: 36, marginBottom: -1 }}
        >
          <defs>
            <linearGradient id="ps2-curve" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#3C2A0C" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#1A1408" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,0 L1440,0 L1440,30 Q1080,60 720,42 Q360,24 0,46 Z"
            fill="url(#ps2-curve)"
          />
          <path
            d="M0,46 Q360,24 720,42 Q1080,60 1440,30"
            stroke="rgba(232,201,122,0.55)" strokeWidth="1" fill="none"
          />
        </svg>
      </div>

      {/* ── Content rail ── */}
      <main style={{ maxWidth, margin: '0 auto', padding: '8px 16px 24px' }}>
        {children}
      </main>

      {!noDock && <FloatingDock lang={lang} />}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Floating dock — primary navigation across the app
// ────────────────────────────────────────────────────────────────────────────
export function FloatingDock({ lang }: { lang: string }) {
  const location = useLocation();
  const items: { to: string; icon: string; label: string; pathPrefix?: string }[] = [
    { to: '/home',         icon: '🏠', label: lang === 'ar' ? 'الرئيسية' : 'Home' },
    { to: '/store',        icon: '🏪', label: lang === 'ar' ? 'المتجر'   : 'Store' },
    { to: '/tournaments',  icon: '🏆', label: lang === 'ar' ? 'البطولات' : 'Cups' },
    { to: '/friends',      icon: '👥', label: lang === 'ar' ? 'أصدقاء'   : 'Friends' },
    { to: '/profile',      icon: '👤', label: lang === 'ar' ? 'حسابي'    : 'Me' },
  ];

  return (
    <nav
      aria-label="primary"
      className="fixed left-1/2 z-40"
      style={{
        bottom: 14,
        transform: 'translateX(-50%)',
        background:
          'linear-gradient(180deg, rgba(40,28,12,0.96) 0%, rgba(14,9,5,0.96) 100%)',
        border: '1.5px solid rgba(232,201,122,0.45)',
        borderRadius: 999,
        padding: '6px 8px',
        boxShadow: '0 12px 32px rgba(0,0,0,0.65), 0 0 26px rgba(232,201,122,0.18)',
        backdropFilter: 'blur(14px)',
      }}
    >
      <div className="flex items-center gap-1">
        {items.map(item => {
          const active = location.pathname === item.to ||
            (item.to !== '/home' && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className="relative flex flex-col items-center justify-center transition-all"
              style={{
                minWidth: 60, padding: '6px 4px',
                borderRadius: 999,
                background: active
                  ? 'radial-gradient(circle at 50% 35%, rgba(232,201,122,0.30), rgba(40,28,12,0) 72%)'
                  : 'transparent',
                color: active ? '#E8C97A' : 'rgba(245,230,200,0.55)',
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{item.icon}</span>
              <span className="font-arabic" style={{ fontSize: 9.5, lineHeight: 1, marginTop: 3 }}>
                {item.label}
              </span>
              {active && (
                <motion.span
                  layoutId="dock-pill"
                  className="absolute"
                  style={{
                    bottom: -4, left: '50%', transform: 'translateX(-50%)',
                    width: 18, height: 3, borderRadius: 999,
                    background: '#E8C97A',
                    boxShadow: '0 0 8px rgba(232,201,122,0.65)',
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Bento tile primitive — used inside any page that wants to drop a
 * big quick-action button. Hex-cornered (clip-path polygon) with a
 * gold highlight ring on hover.
 */
export function BentoTile({
  icon, title, sub, accent = 'gold', onClick, badge,
}: {
  icon: string;
  title: string;
  sub?: string;
  accent?: 'gold' | 'purple' | 'green' | 'red';
  onClick?: () => void;
  badge?: string;
}) {
  const ACCENT = {
    gold:   { glow: 'rgba(232,201,122,0.45)', border: 'rgba(232,201,122,0.55)', text: '#E8C97A' },
    purple: { glow: 'rgba(196,149,255,0.40)', border: 'rgba(196,149,255,0.55)', text: '#C495FF' },
    green:  { glow: 'rgba(122,199,79,0.40)',  border: 'rgba(122,199,79,0.55)',  text: '#7AC74F' },
    red:    { glow: 'rgba(224,80,72,0.40)',   border: 'rgba(224,80,72,0.55)',   text: '#E04030' },
  }[accent];

  return (
    <motion.button
      whileHover={{ scale: 1.04, y: -3 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="relative flex flex-col items-center justify-center gap-1 transition-all"
      style={{
        minHeight: 104, padding: '14px 10px',
        background: 'linear-gradient(160deg, rgba(40,28,12,0.95) 0%, rgba(14,9,5,0.95) 100%)',
        border: `2px solid ${ACCENT.border}`,
        // Hex-octagon-ish corners — different geometry from the
        // generic rounded rectangle every existing card uses.
        clipPath:
          'polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px), 0 12px)',
        boxShadow: `0 6px 16px rgba(0,0,0,0.45), 0 0 22px ${ACCENT.glow}`,
        cursor: 'pointer',
      }}
    >
      <div
        className="rounded-full flex items-center justify-center"
        style={{
          width: 46, height: 46,
          background: `radial-gradient(circle at 30% 30%, ${ACCENT.glow}, transparent 70%)`,
          border: `1.5px solid ${ACCENT.border}`,
          fontSize: 24,
        }}>
        {icon}
      </div>
      <p className="font-arabic font-bold leading-none" style={{ fontSize: 12.5, color: ACCENT.text }}>
        {title}
      </p>
      {sub && (
        <p className="font-arabic leading-none" style={{ fontSize: 10, color: 'rgba(245,230,200,0.5)' }}>
          {sub}
        </p>
      )}
      {badge && (
        <span
          className="absolute rounded-full font-bold flex items-center justify-center"
          style={{
            top: 10, insetInlineEnd: 10, minWidth: 18, height: 18, padding: '0 6px',
            background: '#E04030', color: '#fff', fontSize: 10, lineHeight: 1,
            border: '2px solid #14100A',
          }}>
          {badge}
        </span>
      )}
    </motion.button>
  );
}

/**
 * Surface card primitive used inside content areas — slim hairline,
 * subtle inner shadow, asymmetric corner radii so it reads as the
 * new shape language rather than a default rounded card.
 */
export function ShellCard({
  children, glow = false, className = '', style,
}: {
  children: ReactNode;
  glow?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        background: 'linear-gradient(160deg, rgba(40,28,12,0.92) 0%, rgba(14,9,5,0.92) 100%)',
        border: '1.5px solid rgba(201,168,76,0.30)',
        boxShadow: glow
          ? '0 8px 24px rgba(0,0,0,0.50), 0 0 28px rgba(201,168,76,0.22), inset 0 -2px 12px rgba(0,0,0,0.45)'
          : '0 4px 16px rgba(0,0,0,0.45), inset 0 -2px 12px rgba(0,0,0,0.45)',
        borderRadius: '20px 4px 20px 4px',
        ...style,
      }}>
      {children}
    </div>
  );
}
