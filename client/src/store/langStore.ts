import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Lang = 'ar' | 'en';

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: 'ar',
      setLang: (lang) => set({ lang }),
    }),
    { name: 'lang' }
  )
);
