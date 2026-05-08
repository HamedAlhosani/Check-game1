import { ReactNode } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Aurora } from './Aurora';

/**
 * Modern game-hub frame — glassmorphism over an animated aurora
 * background. Replaces the old header-and-back-button paradigm with:
 *
 *   1. <Aurora/> backdrop: slow-drifting gradient orbs + gold dust.
 *   2. Floating glass hero card with the page title + back button +
 *      right slot. No flat nav band — the banner is a card that
 *      hovers above the page, with a soft gradient border and
 *      backdrop-blur.
 *   3. Glass content cards with thin gradient hairlines.
 *   4. Floating dock at the bottom carries app-wide navigation.
 *
 * Usage:
 *   <PageShell title="..." lang={lang} right={<MyChip/>}>
 *     ...page content...
 *   </PageShell>
 */
export function PageShell({
  title, subtitle, lang, right, children,
  back = '/home',
  maxWidth = 760,
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
    <div
      className="min-h-screen relative"
      style={{ direction: dir, paddingBottom: noDock ? 24 : 96 }}
    >
      <Aurora />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Floating glass hero card */}
        <div className="px-3 pt-3">
          <GlassCard
            inner
            className="flex items-center gap-3"
            style={{ padding: '14px 14px', minHeight: 70 }}
          >
            <motion.button
              whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
              onClick={() => navigate(back)}
              className="rounded-full flex items-center justify-center shrink-0"
              style={{
                width: 44, height: 44,
                background: 'linear-gradient(135deg, rgba(232,201,122,0.25), rgba(40,28,12,0.55))',
                border: '1.5px solid rgba(232,201,122,0.55)',
                boxShadow: '0 4px 14px rgba(0,0,0,0.55), inset 0 -2px 6px rgba(0,0,0,0.45), 0 0 14px rgba(232,201,122,0.20)',
                color: '#E8C97A', fontSize: 26, lineHeight: 1, fontWeight: 700,
                cursor: 'pointer',
              }}
              aria-label={lang === 'ar' ? 'رجوع' : 'Back'}>
              {lang === 'ar' ? '›' : '‹'}
            </motion.button>

            <div className="flex-1 min-w-0 text-center">
              <h1 className="font-display"
                style={{
                  fontSize: 22, color: '#FFE9B0',
                  letterSpacing: '0.18em', lineHeight: 1.05,
                  textShadow: '0 0 18px rgba(232,201,122,0.45), 0 2px 8px rgba(0,0,0,0.55)',
                }}>
                {title.toUpperCase()}
              </h1>
              {subtitle && (
                <p className="font-arabic mt-0.5 truncate" style={{ fontSize: 11, color: 'rgba(245,230,200,0.55)' }}>
                  {subtitle}
                </p>
              )}
            </div>

            <div className="shrink-0">
              {right ?? <div style={{ width: 44, height: 44 }} />}
            </div>
          </GlassCard>
        </div>

        <main style={{ maxWidth, margin: '0 auto', padding: '14px 16px 24px' }}>
          {children}
        </main>
      </div>

      {!noDock && <FloatingDock lang={lang} />}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Floating dock
// ────────────────────────────────────────────────────────────────────────────
export function FloatingDock({ lang }: { lang: string }) {
  const location = useLocation();
  const items: { to: string; icon: string; label: string }[] = [
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
          'linear-gradient(180deg, rgba(40,28,12,0.65) 0%, rgba(14,9,5,0.65) 100%)',
        border: '1px solid rgba(232,201,122,0.30)',
        borderRadius: 999,
        padding: '6px 8px',
        boxShadow:
          '0 14px 36px rgba(0,0,0,0.65), 0 0 28px rgba(232,201,122,0.18), inset 0 1px 0 rgba(255,255,255,0.05)',
        backdropFilter: 'blur(18px) saturate(120%)',
        WebkitBackdropFilter: 'blur(18px) saturate(120%)',
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
                color: active ? '#FFE9B0' : 'rgba(245,230,200,0.55)',
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
                    background: 'linear-gradient(90deg, #FFE9B0, #E8C97A)',
                    boxShadow: '0 0 10px rgba(232,201,122,0.85)',
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
 * Glass card primitive. Frosted backdrop-blur + thin gradient
 * hairline border + soft inner highlight. The default is the
 * "outer" variant used as a content surface; pass `inner` for the
 * brighter variant used for hero/header pieces.
 */
export function GlassCard({
  children, inner = false, glow = false, className = '', style,
}: {
  children: ReactNode;
  inner?: boolean;
  glow?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        background: inner
          ? 'linear-gradient(160deg, rgba(60,40,16,0.55) 0%, rgba(20,14,8,0.55) 100%)'
          : 'linear-gradient(160deg, rgba(40,28,12,0.45) 0%, rgba(14,9,5,0.45) 100%)',
        border: '1px solid rgba(232,201,122,0.28)',
        borderRadius: 22,
        backdropFilter: 'blur(14px) saturate(120%)',
        WebkitBackdropFilter: 'blur(14px) saturate(120%)',
        boxShadow: glow
          ? '0 12px 32px rgba(0,0,0,0.55), 0 0 28px rgba(232,201,122,0.25), inset 0 1px 0 rgba(255,255,255,0.06)'
          : '0 8px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
        ...style,
      }}>
      {children}
    </div>
  );
}

/** Legacy alias kept for any page still importing the old name. */
export const ShellCard = GlassCard;

/**
 * Bento tile primitive — a glass card with a polygon-cut shape,
 * accented icon medallion, title, optional sub and badge. Comes in
 * three sizes so a parent grid can build asymmetric bento layouts:
 *   size="sm"  → 1×1 cell, square-ish
 *   size="wide"→ 2×1 cell, lays out icon + text horizontally
 *   size="tall"→ 1×2 cell, with a bigger icon medallion
 */
export function BentoTile({
  icon, title, sub, accent = 'gold', onClick, badge, size = 'sm',
}: {
  icon: string;
  title: string;
  sub?: string;
  accent?: 'gold' | 'purple' | 'green' | 'red' | 'cyan';
  onClick?: () => void;
  badge?: string;
  size?: 'sm' | 'wide' | 'tall';
}) {
  const ACCENT = {
    gold:   { glow: 'rgba(232,201,122,0.45)', border: 'rgba(232,201,122,0.55)', text: '#FFE9B0' },
    purple: { glow: 'rgba(196,149,255,0.40)', border: 'rgba(196,149,255,0.55)', text: '#E0C8FF' },
    green:  { glow: 'rgba(122,199,79,0.40)',  border: 'rgba(122,199,79,0.55)',  text: '#C9F09F' },
    red:    { glow: 'rgba(224,80,72,0.40)',   border: 'rgba(224,80,72,0.55)',   text: '#FFB0AC' },
    cyan:   { glow: 'rgba(91,183,224,0.40)',  border: 'rgba(91,183,224,0.55)',  text: '#B5E2F2' },
  }[accent];

  const wide = size === 'wide';
  const tall = size === 'tall';
  const iconSize = tall ? 64 : 46;

  return (
    <motion.button
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`relative ${wide ? 'flex flex-row items-center text-start' : 'flex flex-col items-center justify-center text-center'} gap-2 transition-all overflow-hidden`}
      style={{
        minHeight: tall ? 220 : wide ? 96 : 116,
        padding: wide ? '14px 18px' : '16px 12px',
        background: 'linear-gradient(160deg, rgba(40,28,12,0.55) 0%, rgba(14,9,5,0.55) 100%)',
        border: `1.5px solid ${ACCENT.border}`,
        backdropFilter: 'blur(14px) saturate(120%)',
        WebkitBackdropFilter: 'blur(14px) saturate(120%)',
        // Polygon — clipped corners (8 cuts) for the new "card with
        // facets" shape language.
        clipPath:
          'polygon(14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px), 0 14px)',
        boxShadow: `0 8px 22px rgba(0,0,0,0.55), 0 0 24px ${ACCENT.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
        cursor: 'pointer',
      }}
    >
      {/* Top-edge highlight stripe — gives a metallic sheen */}
      <span aria-hidden style={{
        position: 'absolute', top: 6, left: 18, right: 18, height: 1,
        background: `linear-gradient(90deg, transparent, ${ACCENT.glow}, transparent)`,
      }} />

      <div
        className="rounded-full flex items-center justify-center"
        style={{
          width: iconSize, height: iconSize,
          background: `radial-gradient(circle at 30% 30%, ${ACCENT.glow}, rgba(0,0,0,0.45) 75%)`,
          border: `1.5px solid ${ACCENT.border}`,
          fontSize: tall ? 36 : 24,
          boxShadow: `0 0 14px ${ACCENT.glow}`,
          flexShrink: 0,
        }}>
        {icon}
      </div>
      <div className={wide ? 'flex-1 min-w-0' : ''}>
        <p className="font-arabic font-bold leading-none"
          style={{ fontSize: tall ? 16 : 12.5, color: ACCENT.text, textShadow: `0 0 10px ${ACCENT.glow}` }}>
          {title}
        </p>
        {sub && (
          <p className="font-arabic leading-none mt-1"
            style={{ fontSize: tall ? 12 : 10.5, color: 'rgba(245,230,200,0.55)' }}>
            {sub}
          </p>
        )}
      </div>
      {badge && (
        <span
          className="absolute rounded-full font-bold flex items-center justify-center"
          style={{
            top: 10, insetInlineEnd: 10, minWidth: 18, height: 18, padding: '0 6px',
            background: '#E04030', color: '#fff', fontSize: 10, lineHeight: 1,
            border: '2px solid rgba(14,9,5,0.85)',
            boxShadow: '0 0 10px rgba(224,64,48,0.65)',
          }}>
          {badge}
        </span>
      )}
    </motion.button>
  );
}

/**
 * NeonStat — big-numerals stat block. Used inside hero areas to
 * present the player's most important numbers in display font with
 * a glowing gold gradient.
 */
export function NeonStat({
  value, label, accent = 'gold', icon,
}: {
  value: string | number;
  label: string;
  accent?: 'gold' | 'purple' | 'green' | 'red' | 'cyan';
  icon?: string;
}) {
  const ACCENT = {
    gold:   { from: '#FFE9B0', to: '#C9A84C', glow: 'rgba(232,201,122,0.55)' },
    purple: { from: '#E0C8FF', to: '#9468D8', glow: 'rgba(196,149,255,0.55)' },
    green:  { from: '#C9F09F', to: '#5C9A3A', glow: 'rgba(122,199,79,0.55)' },
    red:    { from: '#FFB0AC', to: '#C04036', glow: 'rgba(224,80,72,0.55)' },
    cyan:   { from: '#B5E2F2', to: '#3E8CB0', glow: 'rgba(91,183,224,0.55)' },
  }[accent];
  return (
    <div className="text-center">
      {icon && <div style={{ fontSize: 14, marginBottom: 2 }}>{icon}</div>}
      <div
        className="font-display"
        style={{
          fontSize: 32,
          fontWeight: 700,
          lineHeight: 1,
          background: `linear-gradient(180deg, ${ACCENT.from}, ${ACCENT.to})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textShadow: `0 0 24px ${ACCENT.glow}`,
          filter: `drop-shadow(0 0 12px ${ACCENT.glow})`,
        }}>
        {value}
      </div>
      <div className="font-arabic mt-0.5"
        style={{ fontSize: 9.5, color: 'rgba(245,230,200,0.55)', letterSpacing: '0.10em' }}>
        {label.toUpperCase()}
      </div>
    </div>
  );
}
