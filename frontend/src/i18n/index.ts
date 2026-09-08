import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enIN from './locales/en-IN.json';
import taIN from './locales/ta-IN.json';
import hiIN from './locales/hi-IN.json';
import teIN from './locales/te-IN.json';
import mlIN from './locales/ml-IN.json';
import knIN from './locales/kn-IN.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en-IN', label: '🇮🇳 English' },
  { code: 'ta-IN', label: 'தமிழ்' },
  { code: 'hi-IN', label: 'हिन्दी' },
  { code: 'te-IN', label: 'తెలుగు' },
  { code: 'ml-IN', label: 'മലയാളം' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ' },
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

const STORAGE_KEY = 'safesphere_language';

function getInitialLanguage(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.some(l => l.code === stored)) return stored;
    const browser = navigator.language || 'en-IN';
    if (SUPPORTED_LANGUAGES.some(l => l.code === browser)) return browser;
  } catch { /* SSR/private-mode fallback */ }
  return 'en-IN';
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'en-IN': { translation: enIN },
      'ta-IN': { translation: taIN },
      'hi-IN': { translation: hiIN },
      'te-IN': { translation: teIN },
      'ml-IN': { translation: mlIN },
      'kn-IN': { translation: knIN },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'en-IN',
    interpolation: { escapeValue: false },
    returnNull: false,
  });

export default i18n;
