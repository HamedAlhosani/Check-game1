import { useLangStore } from '../../store/langStore';

export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLangStore();
  return (
    <button
      onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
      className={className}
      style={{
        background: 'rgba(201,168,76,0.1)',
        border: '1px solid rgba(201,168,76,0.25)',
        borderRadius: 8,
        padding: '3px 10px',
        color: '#C9A84C',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        letterSpacing: 1,
      }}
    >
      {lang === 'ar' ? 'EN' : 'عربي'}
    </button>
  );
}
