import { ReactNode } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Aurora } from './Aurora';
import { soundService } from '../../services/sound.service';

/**
 * Modern game-hub frame in the violet/magenta/cyan palette.
 * Glass surfaces over an animated aurora backdrop. Replaces the old
 * gold/dark vocabulary entirely.
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
              onClick={() => { soundService.playClick(); navigate(back); }}
              className="rounded-full flex items-center justify-center shrink-0"
              style={{
                width: 44, height: 44,
                background: 'linear-gradient(135deg, rgba(229,188,124,0.30), rgba(54,38,24,0.55))',
                border: '1.5px solid rgba(229,188,124,0.65)',
                boxShadow: '0 4px 14px rgba(0,0,0,0.55), inset 0 -2px 6px rgba(0,0,0,0.45), 0 0 14px rgba(229,188,124,0.35)',
                color: '#FAEDC4', fontSize: 26, lineHeight: 1, fontWeight: 700,
                cursor: 'pointer',
              }}
              aria-label={lang === 'ar' ? 'رجوع' : 'Back'}>
              {lang === 'ar' ? '›' : '‹'}
            </motion.button>

            <div className="flex-1 min-w-0 text-center">
              <h1 className="font-display"
                style={{
                  fontSize: 22,
                  letterSpacing: '0.18em', lineHeight: 1.05,
                  background: 'linear-gradient(180deg, #FBF3DB 0%, #E5BC7C 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 0 14px rgba(229,188,124,0.55)) drop-shadow(0 2px 6px rgba(0,0,0,0.55))',
                }}>
                {title.toUpperCase()}
              </h1>
              {subtitle && (
                <p className="font-arabic mt-0.5 truncate" style={{ fontSize: 11, color: 'rgba(251,243,219,0.55)' }}>
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
          'linear-gradient(180deg, rgba(54,38,24,0.95) 0%, rgba(24,18,12,0.95) 100%)',
        border: '1px solid rgba(229,188,124,0.35)',
        borderRadius: 999,
        padding: '6px 8px',
        boxShadow:
          '0 8px 22px rgba(0,0,0,0.65), 0 0 16px rgba(229,188,124,0.25)',
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
              onClick={() => soundService.playClick()}
              className="relative flex flex-col items-center justify-center transition-all"
              style={{
                minWidth: 60, padding: '6px 4px',
                borderRadius: 999,
                background: active
                  ? 'radial-gradient(circle at 50% 35%, rgba(229,188,124,0.40), rgba(54,38,24,0) 72%)'
                  : 'transparent',
                color: active ? '#FBF3DB' : 'rgba(251,243,219,0.55)',
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
                    background: 'linear-gradient(90deg, #7AA847, #E5BC7C)',
                    boxShadow: '0 0 10px rgba(229,188,124,0.85)',
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
 * Glass card primitive in the new palette. Uses solid alpha
 * backgrounds (no backdrop-filter) so paint cost stays cheap —
 * GlassCard renders many times per screen and each blur pass
 * was visibly slowing first paint on lower-end devices.
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
          ? 'linear-gradient(160deg, rgba(82,62,40,0.95) 0%, rgba(24,18,12,0.95) 100%)'
          : 'linear-gradient(160deg, rgba(54,38,24,0.92) 0%, rgba(24,18,12,0.92) 100%)',
        border: '1px solid rgba(229,188,124,0.32)',
        borderRadius: 22,
        boxShadow: glow
          ? '0 8px 22px rgba(0,0,0,0.55), 0 0 18px rgba(229,188,124,0.25)'
          : '0 4px 16px rgba(0,0,0,0.45)',
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
  icon, title, sub, accent = 'violet', onClick, badge, size = 'sm',
}: {
  icon: string;
  title: string;
  sub?: string;
  accent?: 'violet' | 'magenta' | 'cyan' | 'amber' | 'red' | 'gold' | 'green' | 'purple';
  onClick?: () => void;
  badge?: string;
  size?: 'sm' | 'wide' | 'tall';
}) {
  // Map old accent names to the new palette so existing call sites
  // ("gold", "purple", "green", "red") still produce on-theme colors.
  const ACCENT = {
    violet:  { glow: 'rgba(229,188,124,0.45)', border: 'rgba(229,188,124,0.55)', text: '#FAEDC4' },
    magenta: { glow: 'rgba(122,168,71,0.45)', border: 'rgba(122,168,71,0.55)', text: '#FAEDC4' },
    cyan:    { glow: 'rgba(224,140,58,0.45)',  border: 'rgba(224,140,58,0.55)',  text: '#FAEDC4' },
    amber:   { glow: 'rgba(251,191,36,0.45)',  border: 'rgba(251,191,36,0.55)',  text: '#FFE9B0' },
    red:     { glow: 'rgba(248,113,113,0.45)', border: 'rgba(248,113,113,0.55)', text: '#FFCACA' },
    gold:    { glow: 'rgba(122,168,71,0.45)', border: 'rgba(122,168,71,0.55)', text: '#FAEDC4' },
    purple:  { glow: 'rgba(229,188,124,0.45)', border: 'rgba(229,188,124,0.55)', text: '#FAEDC4' },
    green:   { glow: 'rgba(224,140,58,0.45)',  border: 'rgba(224,140,58,0.55)',  text: '#FAEDC4' },
  }[accent];

  const wide = size === 'wide';
  const tall = size === 'tall';
  const iconSize = tall ? 64 : 46;

  return (
    <motion.button
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick ? () => { soundService.playClick(); onClick(); } : undefined}
      className={`relative ${wide ? 'flex flex-row items-center text-start' : 'flex flex-col items-center justify-center text-center'} gap-2 transition-all overflow-hidden`}
      style={{
        minHeight: tall ? 220 : wide ? 96 : 116,
        padding: wide ? '14px 18px' : '16px 12px',
        background: 'linear-gradient(160deg, rgba(54,38,24,0.95) 0%, rgba(24,18,12,0.95) 100%)',
        border: `1.5px solid ${ACCENT.border}`,
        clipPath:
          'polygon(14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px), 0 14px)',
        boxShadow: `0 6px 16px rgba(0,0,0,0.55), 0 0 14px ${ACCENT.glow}`,
        cursor: 'pointer',
      }}
    >
      {/* Top-edge highlight stripe */}
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
            style={{ fontSize: tall ? 12 : 10.5, color: 'rgba(251,243,219,0.55)' }}>
            {sub}
          </p>
        )}
      </div>
      {badge && (
        <span
          className="absolute rounded-full font-bold flex items-center justify-center"
          style={{
            top: 10, insetInlineEnd: 10, minWidth: 18, height: 18, padding: '0 6px',
            background: '#7AA847', color: '#fff', fontSize: 10, lineHeight: 1,
            border: '2px solid rgba(24,18,12,0.85)',
            boxShadow: '0 0 10px rgba(122,168,71,0.65)',
          }}>
          {badge}
        </span>
      )}
    </motion.button>
  );
}

/**
 * ThemedBanner — distinctive flag silhouette with a chevron tail,
 * used on Rules / Clans / Tournaments to differentiate those page
 * surfaces from the rest of the app. New violet/magenta palette.
 */
export function ThemedBanner({
  emblem, title, sub, lang,
}: {
  emblem: string;
  title: string;
  sub?: string;
  lang: string;
}) {
  return (
    <div
      className="relative overflow-hidden mb-5"
      style={{
        background: 'linear-gradient(95deg, rgba(82,62,40,0.92) 0%, rgba(54,38,24,0.92) 50%, rgba(24,18,12,0.92) 100%)',
        border: '1.5px solid rgba(229,188,124,0.45)',
        boxShadow: '0 6px 18px rgba(0,0,0,0.55), 0 0 14px rgba(229,188,124,0.20)',
        clipPath: lang === 'ar'
          ? 'polygon(20px 0, 100% 0, 100% 100%, 20px 100%, 0 50%)'
          : 'polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%)',
        padding: lang === 'ar' ? '14px 18px 16px 32px' : '14px 32px 16px 18px',
      }}
    >
      <span aria-hidden style={{
        position: 'absolute', top: 6, left: 24, right: 24, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(229,188,124,0.65), transparent)',
      }} />

      <div className="flex items-center gap-4">
        <div
          className="rounded-full flex items-center justify-center shrink-0"
          style={{
            width: 56, height: 56,
            background: 'radial-gradient(circle at 30% 30%, rgba(229,188,124,0.55), rgba(54,38,24,0.55) 75%)',
            border: '1.5px solid rgba(229,188,124,0.65)',
            boxShadow: '0 0 18px rgba(229,188,124,0.50), inset 0 -3px 8px rgba(0,0,0,0.45)',
            fontSize: 30,
          }}>
          {emblem}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display tracking-wider truncate"
            style={{
              fontSize: 18, color: '#FBF3DB',
              letterSpacing: '0.10em',
              textShadow: '0 0 14px rgba(229,188,124,0.55)',
            }}>
            {title}
          </h2>
          {sub && (
            <p className="font-arabic mt-1 truncate" style={{ fontSize: 11.5, color: 'rgba(251,243,219,0.55)' }}>
              {sub}
            </p>
          )}
          <svg viewBox="0 0 200 6" preserveAspectRatio="none"
            style={{ marginTop: 6, width: '100%', maxWidth: 240, height: 6, display: 'block', opacity: 0.6 }}>
            <path
              d="M0 3 L8 0 L16 3 L24 0 L32 3 L40 0 L48 3 L56 0 L64 3 L72 0 L80 3 L88 0 L96 3 L104 0 L112 3 L120 0 L128 3 L136 0 L144 3 L152 0 L160 3 L168 0 L176 3 L184 0 L192 3 L200 0"
              stroke="rgba(229,188,124,0.65)" strokeWidth="0.6" fill="none"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

/**
 * NeonStat — big-numerals stat block. Vertical gradient + drop-shadow
 * glow. Now in violet / magenta / cyan, with backwards-compatible
 * accent names for places still passing "gold"/"red".
 */
export function NeonStat({
  value, label, accent = 'violet', icon,
}: {
  value: string | number;
  label: string;
  accent?: 'violet' | 'magenta' | 'cyan' | 'amber' | 'gold' | 'red' | 'purple' | 'green';
  icon?: string;
}) {
  const ACCENT = {
    violet:  { from: '#FAEDC4', to: '#7C3AED', glow: 'rgba(229,188,124,0.65)' },
    magenta: { from: '#FAEDC4', to: '#DB2777', glow: 'rgba(122,168,71,0.65)' },
    cyan:    { from: '#FAEDC4', to: '#0891B2', glow: 'rgba(224,140,58,0.65)' },
    amber:   { from: '#FFE9B0', to: '#D97706', glow: 'rgba(251,191,36,0.65)' },
    red:     { from: '#FFCACA', to: '#B91C1C', glow: 'rgba(248,113,113,0.65)' },
    gold:    { from: '#FAEDC4', to: '#DB2777', glow: 'rgba(122,168,71,0.65)' },
    purple:  { from: '#FAEDC4', to: '#7C3AED', glow: 'rgba(229,188,124,0.65)' },
    green:   { from: '#FAEDC4', to: '#0891B2', glow: 'rgba(224,140,58,0.65)' },
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
        style={{ fontSize: 9.5, color: 'rgba(251,243,219,0.55)', letterSpacing: '0.10em' }}>
        {label.toUpperCase()}
      </div>
    </div>
  );
}
