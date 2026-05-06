import { motion, AnimatePresence } from 'framer-motion';
import { soundService } from '../../services/sound.service';

/**
 * In-game confirmation dialog — replaces window.confirm() so the player
 * never sees the browser's native dialog (which feels like a Google
 * notification dropping on top of the app).
 *
 * Usage:
 *   <ConfirmModal
 *     open={showConfirm}
 *     title="..." message="..."
 *     confirmLabel="نعم" cancelLabel="إلغاء"
 *     tone="danger"
 *     onConfirm={() => {...; setShowConfirm(false);}}
 *     onCancel={() => setShowConfirm(false)}
 *   />
 */
export function ConfirmModal({
  open, title, message,
  confirmLabel = 'نعم',
  cancelLabel  = 'إلغاء',
  tone = 'gold',
  onConfirm, onCancel,
  lang = 'ar',
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' (red) for destructive actions, 'gold' for neutral. */
  tone?: 'gold' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
  lang?: string;
}) {
  if (!open) return null;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const confirmStyle = tone === 'danger'
    ? { background: 'linear-gradient(135deg, #B83020, #80201A)', color: '#fff', boxShadow: '0 6px 20px rgba(184,48,32,0.45)' }
    : { background: 'linear-gradient(135deg, #C9A84C, #A07830)', color: '#0E0905', boxShadow: '0 6px 20px rgba(201,168,76,0.45)' };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        className="fixed inset-0 z-[70] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.72)' }}
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={e => e.stopPropagation()}
          className="rounded-2xl w-full max-w-sm overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #1A1408 0%, #0E0905 100%)',
            border: `1px solid ${tone === 'danger' ? 'rgba(224,64,48,0.45)' : 'rgba(201,168,76,0.40)'}`,
            boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 30px ${tone === 'danger' ? 'rgba(224,64,48,0.20)' : 'rgba(201,168,76,0.20)'}`,
            direction: dir,
          }}
        >
          <div className="px-5 pt-5 pb-3">
            <h3 className="font-arabic font-bold mb-2"
              style={{ fontSize: 17, color: tone === 'danger' ? '#FF8A7A' : '#E8C97A' }}>
              {title}
            </h3>
            <p className="font-arabic" style={{ fontSize: 13, color: 'rgba(245,230,200,0.75)', lineHeight: 1.7 }}>
              {message}
            </p>
          </div>
          <div className="flex gap-2 px-5 pb-5 pt-2">
            <button
              onClick={() => { soundService.playClick(); onCancel(); }}
              className="flex-1 rounded-xl py-2.5 font-arabic font-bold"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(245,230,200,0.65)',
                fontSize: 13,
              }}>
              {cancelLabel}
            </button>
            <motion.button whileTap={{ scale: 0.96 }}
              onClick={() => { soundService.playClick(); onConfirm(); }}
              className="flex-1 rounded-xl py-2.5 font-arabic font-bold"
              style={{ ...confirmStyle, fontSize: 13 }}>
              {confirmLabel}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
