import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LangToggle } from './LangToggle';

/**
 * Shared frame for every non-game page in the app.
 *
 *  Layout: a sticky header band with a wavy / arch-shaped bottom edge
 *  (SVG curve), back arrow + page title + right-slot, then a centered
 *  content area below. Replaces the per-page nav bar each screen used
 *  to roll on its own — single source of truth for shape, spacing and
 *  back navigation.
 *
 *  Same dark/gold colour family the rest of the app uses; the new look
 *  is geometry-only: arch-cut header, round back button, gold-on-dark
 *  hairline ornament, content area with subtle ornamental hairlines on
 *  each side instead of a hard frame around the whole content.
 */
export function PageShell({
  title, subtitle, lang, right, children,
  back = '/home',
  maxWidth = 720,
}: {
  title: string;
  subtitle?: string;
  lang: string;
  /** Extra controls to put on the trailing edge of the header. */
  right?: ReactNode;
  /** Page that the back arrow leads to. */
  back?: string;
  children: ReactNode;
  /** Override content width. */
  maxWidth?: number;
}) {
  const navigate = useNavigate();
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #1A1408 0%, #0E0905 100%)', direction: dir }}>
      {/* ── Arch header ── */}
      <header className="sticky top-0 z-40" style={{
        background: 'linear-gradient(180deg, rgba(40,28,12,0.98) 0%, rgba(20,14,8,0.98) 100%)',
        boxShadow: '0 4px 18px rgba(0,0,0,0.55)',
        backdropFilter: 'blur(12px)',
      }}>
        {/* Top hairline ornament */}
        <div
          aria-hidden
          className="absolute"
          style={{
            top: 0, left: '8%', right: '8%', height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(232,201,122,0.55), transparent)',
          }}
        />

        <div className="flex items-center gap-3 px-4 pt-3 pb-5"
          style={{ minHeight: 64 }}>
          {/* Round back button */}
          <motion.button
            whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
            onClick={() => navigate(back)}
            className="rounded-full flex items-center justify-center shrink-0"
            style={{
              width: 40, height: 40,
              background: 'radial-gradient(circle at 30% 30%, rgba(201,168,76,0.20), rgba(60,40,16,0.45) 70%)',
              border: '1.5px solid rgba(201,168,76,0.45)',
              boxShadow: 'inset 0 -2px 6px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.35)',
              color: '#E8C97A', fontSize: 22, lineHeight: 1,
              cursor: 'pointer',
            }}
            aria-label={lang === 'ar' ? 'رجوع' : 'Back'}>
            {lang === 'ar' ? '›' : '‹'}
          </motion.button>

          {/* Title block */}
          <div className="flex-1 min-w-0 text-center">
            <h1 className="font-display tracking-widest truncate"
              style={{ fontSize: 18, color: '#E8C97A', letterSpacing: '0.18em', lineHeight: 1.05 }}>
              {title}
            </h1>
            {subtitle && (
              <p className="font-arabic mt-0.5 truncate" style={{ fontSize: 11, color: 'rgba(245,230,200,0.45)' }}>
                {subtitle}
              </p>
            )}
          </div>

          {/* Right slot — language toggle by default; pages can override. */}
          <div className="shrink-0">
            {right ?? <LangToggle />}
          </div>
        </div>

        {/* Curved bottom edge — gives the header an "arch" silhouette
            instead of the usual hard rectangular nav bar. */}
        <svg
          aria-hidden viewBox="0 0 1440 32" preserveAspectRatio="none"
          className="block w-full"
          style={{
            height: 28, marginTop: -1,
            display: 'block',
          }}
        >
          <defs>
            <linearGradient id="ps-arch" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#1F1810" />
              <stop offset="100%" stopColor="#1A1408" />
            </linearGradient>
          </defs>
          {/* Single wide arch */}
          <path
            d="M0,0 L0,8 Q360,38 720,18 Q1080,-2 1440,18 L1440,0 Z"
            fill="url(#ps-arch)"
          />
          {/* Gold edge highlight along the arch curve */}
          <path
            d="M0,8 Q360,38 720,18 Q1080,-2 1440,18"
            stroke="rgba(232,201,122,0.45)" strokeWidth="0.8" fill="none"
          />
        </svg>
      </header>

      {/* ── Content area ── */}
      <main
        style={{ maxWidth, margin: '0 auto', padding: '20px 16px 56px', position: 'relative' }}
      >
        {/* Side hairlines that decorate the content rail. */}
        <div aria-hidden className="absolute" style={{ top: 0, bottom: 0, insetInlineStart: 4, width: 1, background: 'linear-gradient(180deg, rgba(232,201,122,0.35), transparent)', opacity: 0.6 }} />
        <div aria-hidden className="absolute" style={{ top: 0, bottom: 0, insetInlineEnd: 4, width: 1, background: 'linear-gradient(180deg, rgba(232,201,122,0.35), transparent)', opacity: 0.6 }} />
        {children}
      </main>
    </div>
  );
}

/**
 * Card primitive used inside PageShell: notched-corner rounded card
 * with a hairline border + subtle inner shadow. Different geometry
 * from the old "rounded-2xl border" pattern so pages laid out with
 * this read as the redesigned look.
 */
export function ShellCard({
  children, glow = false, className = '', style,
}: {
  children: ReactNode;
  /** When true, wraps the card in a soft gold halo. */
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
          ? '0 8px 24px rgba(0,0,0,0.45), 0 0 28px rgba(201,168,76,0.20), inset 0 -2px 12px rgba(0,0,0,0.45)'
          : '0 4px 16px rgba(0,0,0,0.45), inset 0 -2px 12px rgba(0,0,0,0.45)',
        // Notched corners: large radius on opposing diagonals, small on
        // the others. Reads as a hand-cut shape instead of a uniform
        // rounded rectangle.
        borderRadius: '22px 6px 22px 6px',
        ...style,
      }}>
      {children}
    </div>
  );
}
