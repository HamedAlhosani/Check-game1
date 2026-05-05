import { AppShell } from '../../components/layout/AppShell';
import { RegisterForm } from '../../components/auth/RegisterForm';
import { LangToggle } from '../../components/shared/LangToggle';
import { useLang } from '../../i18n/useT';
import { useNavigate } from 'react-router-dom';

export function RegisterPage() {
  const lang = useLang();
  const navigate = useNavigate();
  return (
    <AppShell showNav={false}>
      {/* Lang toggle fixed */}
      <div className="fixed top-4 right-4 z-50"><LangToggle /></div>
      {/* Back button fixed */}
      <button
        onClick={() => navigate('/')}
        className="fixed top-4 left-4 z-50 flex items-center gap-1.5 font-arabic text-sm transition-colors"
        style={{ color: 'rgba(201,168,76,0.6)', background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, padding: '5px 12px' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#C9A84C')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.6)')}
      >
        <span>{lang === 'ar' ? '→' : '←'}</span>
        <span>{lang === 'ar' ? 'الرئيسية' : 'Home'}</span>
      </button>

      <div className="min-h-screen flex items-center justify-center px-4 pt-16 pb-8 relative" style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}>

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
            <p className="text-sand/50 font-arabic text-sm tracking-wide">
              {lang === 'ar' ? 'لعبة الأوراق الإماراتية' : 'The Emirati Card Game'}
            </p>
          </div>

          {/* Card */}
          <div className="glass-card rounded-2xl overflow-hidden shadow-2xl">
            <div className="h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent"/>
            <div className="p-8">
              <h2 className="font-arabic text-lg font-bold text-sand-light mb-6 text-center">
                {lang === 'ar' ? 'انضم إلى اللعبة' : 'Create Account'}
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
