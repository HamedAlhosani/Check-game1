import { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  open: boolean;
  onClose?: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ open, onClose, title, children, size = 'md' }: Props) {
  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-0 bg-black/75"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`relative w-full ${sizes[size]} bg-night-mid border border-gold/30 rounded-xl shadow-2xl shadow-black/50 overflow-hidden`}
          >
            {/* Gold top line */}
            <div className="h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent"/>
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-gold/10">
                <h2 className="font-arabic text-lg font-bold text-gold">{title}</h2>
                {onClose && (
                  <button onClick={onClose} className="text-sand/50 hover:text-sand transition-colors text-xl leading-none">×</button>
                )}
              </div>
            )}
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
