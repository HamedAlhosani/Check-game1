import { AppShell } from '../../components/layout/AppShell';
import { RegisterForm } from '../../components/auth/RegisterForm';
import { LangToggle } from '../../components/shared/LangToggle';
import { useLang } from '../../i18n/useT';

export function RegisterPage() {
  const lang = useLang();
  return (
    <AppShell showNav={false}>
      <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
        <div className="absolute top-4 right-4 z-10"><LangToggle /></div>

        {/* Decorative card suits */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none" aria-hidden="true">
          <span className="absolute top-10 right-10 text-6xl text-gold/5 -rotate-8 font-bold">♦</span>
          <span className="absolute top-28 left-10 text-5xl text-gold/5 rotate-6 font-bold">♠</span>
          <span className="absolute bottom-24 right-14 text-7xl text-gold/4 rotate-15 font-bold">♥</span>
          <span className="absolute bottom-16 left-8 text-5xl text-gold/5 -rotate-10 font-bold">♣</span>
          <span className="absolute top-1/2 right-4 text-4xl text-gold/4 rotate-30 font-bold">♠</span>
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
                انضم إلى اللعبة
              </h2>
              <RegisterForm />
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent"/>
          </div>

          <p className="text-center text-sand/30 text-xs font-arabic mt-6 italic" style={{ fontFamily: '"Scheherazade New", serif' }}>
            النخلُ يشمخُ فوق الرملِ معتدلاً
          </p>
        </div>
      </div>
    </AppShell>
  );
}
