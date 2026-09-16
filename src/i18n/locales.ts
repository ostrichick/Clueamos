import { type SupportedLocale } from './translations';

export const DEFAULT_LOCALE: SupportedLocale = 'ko';
export const LOCALE_STORAGE_KEY = 'clueamos_locale_v1';

export function getInitialLocale(): SupportedLocale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'en' || stored === 'es' || stored === 'ko') return stored;
  } catch {}
  try {
    const browserLang = (navigator.language || '').toLowerCase();
    if (browserLang.startsWith('es')) return 'es';
    if (browserLang.startsWith('en')) return 'en';
  } catch {}
  return DEFAULT_LOCALE;
}

export function persistLocale(locale: SupportedLocale): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {}
}