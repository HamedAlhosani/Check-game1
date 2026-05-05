import { create } from 'zustand';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  action?: ToastAction;
}

interface UiStore {
  toasts: Toast[];
  soundEnabled: boolean;
  showRulesModal: boolean;
  addToast: (message: string, type?: Toast['type'], duration?: number, action?: ToastAction) => void;
  removeToast: (id: string) => void;
  toggleSound: () => void;
  setShowRulesModal: (v: boolean) => void;
}

export const useUiStore = create<UiStore>((set, get) => ({
  toasts: [],
  soundEnabled: true,
  showRulesModal: false,

  addToast: (message, type = 'info', duration = 3500, action) => {
    const id = Math.random().toString(36).slice(2);
    set(s => ({ toasts: [...s.toasts, { id, message, type, action }] }));
    setTimeout(() => get().removeToast(id), duration);
  },

  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
  toggleSound: () => set(s => ({ soundEnabled: !s.soundEnabled })),
  setShowRulesModal: (showRulesModal) => set({ showRulesModal }),
}));
