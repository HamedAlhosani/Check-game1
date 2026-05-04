import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ARABIC_POETRY } from '../../constants/gameConfig';

export function PoetryBanner() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % ARABIC_POETRY.length), 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative overflow-hidden py-2.5" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.06), transparent)' }}>
      <div className="absolute inset-0 border-y border-gold/15"/>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gold/25 text-lg select-none">✦</div>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/25 text-lg select-none">✦</div>
      <AnimatePresence mode="wait">
        <motion.p
          key={idx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.5 }}
          className="text-center text-sand-light/55 text-sm font-arabic italic px-12 leading-relaxed tracking-wide"
          style={{ fontFamily: '"Scheherazade New", serif', fontSize: '0.95rem' }}
        >
          {ARABIC_POETRY[idx]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
