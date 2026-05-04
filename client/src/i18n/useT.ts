import { useLangStore } from '../store/langStore';
import { T, TranslationKey } from './translations';

export function useT() {
  const { lang } = useLangStore();
  return (key: TranslationKey): string => T[lang][key] as string;
}

export function useLang() {
  return useLangStore(s => s.lang);
}
