import { AppShell } from '../../components/layout/AppShell';
import { LoginForm } from '../../components/auth/LoginForm';
import { LangToggle } from '../../components/shared/LangToggle';
import { useLang } from '../../i18n/useT';

export function LoginPage() {
  const lang = useLang();
  return (
    <AppShell showNav={false}>
      <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
        <div className="absolute top-4 right-4 z-10"><LangToggle /></div>

        {/* Decorative card suits */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none" aria-hidden="true">
          <span className="absolute top-12 left-8 text-7xl text-gold/5 rotate-12 font-bold">♠</span>
          <span className="absolute top-24 right-12 text-5xl text-gold/5 -rotate-6 font-bold">♦</span>
          <span className="absolute bottom-32 left-16 text-6xl text-gold/5 rotate-3 font-bold">♥</span>
          <span className="absolute bottom-20 right-8 text-8xl text-gold/4 -rotate-12 font-bold">♣</span>
          <span className="absolute top-1/2 left-6 text-4xl text-gold/4 rotate-45 font-bold">♠</span>
          <span className="absolute top-1/3 right-6 text-4xl text-gold/4 -rotate-20 font-bold">♦</span>
        </div>

        <div className="w-full max-w-md relative z-10">

          {/* Logo area */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 border border-gold/30 shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(160,120,48,0.08))', boxShadow: '0 0 40px rgba(201,168,76,0.12)' }}>
              <span className="text-4xl select-none">🂡</span>
            </div>
            <h1 className="font-display text-4xl font-bold tracking-widest shimmer-text mb-1">CHECK</h1>
            <p className="text-sand/50 font-arabic text-sm tracking-wide">لعبة الأوراق الإماراتية</p>
          </div>

          {/* Card */}
          <div className="glass-card rounded-2xl overflow-hidden shadow-2xl">
            <div className="h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent"/>
            <div className="p-8">
              <h2 className="font-arabic text-lg font-bold text-sand-light mb-6 text-center">
                أهلاً بعودتك
              </h2>
              <LoginForm />
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent"/>
          </div>

          {/* Footer poetry */}
          <p className="text-center text-sand/30 text-xs font-arabic mt-6 italic" style={{ fontFamily: '"Scheherazade New", serif' }}>
            من جدَّ وجد، ومن لعب بعقلٍ نال ما قصد
          </p>
        </div>
      </div>
    </AppShell>
  );
}
