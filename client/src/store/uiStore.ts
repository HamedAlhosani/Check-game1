import { create } from 'zustand';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UiStore {
  toasts: Toast[];
  soundEnabled: boolean;
  showRulesModal: boolean;
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
  toggleSound: () => void;
  setShowRulesModal: (v: boolean) => void;
}

export const useUiStore = create<UiStore>((set, get) => ({
  toasts: [],
  soundEnabled: true,
  showRulesModal: false,

  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => get().removeToast(id), 3500);
  },

  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
  toggleSound: () => set(s => ({ soundEnabled: !s.soundEnabled })),
  setShowRulesModal: (showRulesModal) => set({ showRulesModal }),
}));
