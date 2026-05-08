import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#C9A84C',
          light: '#E8C97A',
          dark: '#A07830',
        },
        night: {
          DEFAULT: '#14100A',
          mid: '#1F1810',
          accent: '#2A1F12',
          deep: '#0E0905',
        },
        sand: {
          DEFAULT: '#D4A96A',
          light: '#F5E6C8',
          warm: '#C89A58',
        },
        desert: {
          DEFAULT: '#8B5E3C',
          light: '#B07D52',
          dark: '#5C3A1E',
        },
        sunset: {
          DEFAULT: '#E8903A',
          dark: '#C25E1A',
          deep: '#7A3008',
        },
        palm: {
          DEFAULT: '#3A6028',
          dark: '#1A2818',
          light: '#5C8038',
        },
        danger: '#C45C3A',
        oasis: '#1B6B6B',
        // ── Night Dubai palette (new) ─────────────────────────────────────
        // Midnight navy page, warm pearl card surfaces, rose-gold accents.
        // Built around a "Dubai at night" feel — lit Burj Khalifa,
        // glowing windows, stars overhead.
        // Legacy gold/night/sand/desert/sunset/palm/oasis tokens above
        // stay so any unmigrated screen still renders correctly.
        midnight: {
          DEFAULT: '#0E1B3E',     // deepest navy, page bg top
          mid:     '#1F2D5C',     // city navy, page bg mid
          rise:    '#2A3A6E',     // lit-from-below city horizon
          deep:    '#070D24',     // overlay shadow
        },
        pearl: {
          DEFAULT: '#F5EFE0',     // card surface
          surface: '#FAF6EA',     // brightest card surface
          mute:    '#E8DFC8',     // hover / pressed surface
          line:    '#D7CBA8',     // hairlines
        },
        ink: {
          DEFAULT: '#1A2240',     // primary text on pearl
          mid:     '#4A557A',     // secondary text
          soft:    '#7C86A7',     // tertiary / placeholders
        },
        royal: {
          // Rose-gold accent family — replaces the cool yellow-gold for
          // the night theme. Still legible on both navy and pearl.
          DEFAULT: '#D4A574',     // primary accent
          deep:    '#A87A4C',     // pressed / active
          tint:    '#F5E5CD',     // soft accent backdrops
          glow:    '#F0C68A',     // bright tip for highlights/shadows
        },
        gulf: {
          // Cool secondary — for "live" status pills / blue indicators.
          DEFAULT: '#5BB7E0',
          deep:    '#2E89B4',
          tint:    '#D7ECF6',
        },
      },
      fontFamily: {
        arabic: ['"Cairo"', '"Scheherazade New"', 'serif'],
        calligraphy: ['"Scheherazade New"', 'serif'],
        display: ['"Cinzel"', 'serif'],
        body: ['"Cairo"', 'sans-serif'],
      },
      animation: {
        'card-flip': 'cardFlip 0.5s ease-in-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'glow-gold': 'glowGold 3s ease-in-out infinite',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        shimmer: 'shimmer 2s infinite linear',
        'fade-in': 'fadeIn 0.4s ease-out',
        float: 'float 4s ease-in-out infinite',
        'slide-up': 'slideUp 0.4s ease-out',
        twinkle: 'twinkle 3s ease-in-out infinite',
        'sand-drift': 'sandDrift 8s ease-in-out infinite',
      },
      keyframes: {
        cardFlip: {
          '0%': { transform: 'rotateY(0deg)' },
          '50%': { transform: 'rotateY(90deg)' },
          '100%': { transform: 'rotateY(0deg)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(201,168,76,0.4)' },
          '50%': { boxShadow: '0 0 24px rgba(232,201,122,0.6), 0 0 40px rgba(201,168,76,0.3)' },
        },
        glowGold: {
          '0%, 100%': { textShadow: '0 0 20px rgba(201,168,76,0.3)' },
          '50%': { textShadow: '0 0 40px rgba(232,201,122,0.7), 0 0 60px rgba(201,168,76,0.4)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
        sandDrift: {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(8px)' },
        },
      },
      backgroundImage: {
        'desert-gradient': 'linear-gradient(180deg, #0E0905 0%, #14100A 30%, #1A1408 60%, #200E04 85%, #160A04 100%)',
        'gold-shimmer': 'linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent)',
        'card-texture': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0 L60 15 L60 45 L30 60 L0 45 L0 15 Z' fill='none' stroke='%23C9A84C' stroke-width='0.5' opacity='0.08'/%3E%3C/svg%3E\")",
        // Night Dubai: deep navy at top fading to a warm-rust horizon
        // glow where the city lights wash the lower atmosphere.
        'pearl-sky': 'linear-gradient(180deg, #0A1330 0%, #14224A 35%, #1F2D5C 65%, #38304E 88%, #4A2E3E 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
