import { useState, useEffect } from 'react';

export function useCountdown(endAt: number | null): number {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!endAt) { setRemaining(0); return; }

    const update = () => {
      const r = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setRemaining(r);
    };

    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, [endAt]);

  return remaining;
}
