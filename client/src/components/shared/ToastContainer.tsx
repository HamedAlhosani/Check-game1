import { AnimatePresence, motion } from 'framer-motion';
import { useUiStore } from '../../store/uiStore';

export function ToastContainer() {
  const { toasts, removeToast } = useUiStore();

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none" style={{ minWidth: 280, maxWidth: 380 }}>
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`pointer-events-auto px-4 py-3 rounded-xl border text-sm font-arabic shadow-xl backdrop-blur-sm flex items-center gap-3
              ${t.type === 'success' ? 'bg-palm/80 border-palm text-white' :
                t.type === 'error' ? 'bg-danger/80 border-danger text-white' :
                'bg-night-mid/90 border-gold/30 text-sand-light'}`}
            onClick={!t.action ? () => removeToast(t.id) : undefined}
            style={{ cursor: t.action ? 'default' : 'pointer' }}
          >
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button
                onClick={() => { t.action!.onClick(); removeToast(t.id); }}
                className="shrink-0 px-3 py-1 rounded-lg font-bold text-xs"
                style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)' }}
              >
                {t.action.label}
              </button>
            )}
            {!t.action && (
              <button onClick={() => removeToast(t.id)} style={{ opacity: 0.6, fontSize: 16 }}>×</button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
