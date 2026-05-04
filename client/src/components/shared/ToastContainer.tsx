import { AnimatePresence, motion } from 'framer-motion';
import { useUiStore } from '../../store/uiStore';

export function ToastContainer() {
  const { toasts, removeToast } = useUiStore();

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`pointer-events-auto px-5 py-3 rounded-lg border text-sm font-arabic shadow-xl backdrop-blur-sm
              ${t.type === 'success' ? 'bg-palm/80 border-palm text-white' :
                t.type === 'error' ? 'bg-danger/80 border-danger text-white' :
                'bg-night-mid/90 border-gold/30 text-sand-light'}`}
            onClick={() => removeToast(t.id)}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
