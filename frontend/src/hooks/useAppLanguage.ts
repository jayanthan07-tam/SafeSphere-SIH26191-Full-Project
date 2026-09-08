import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type SupportedLanguageCode } from '../i18n';

const STORAGE_KEY = 'safesphere_language';

export function useAppLanguage() {
  const { i18n } = useTranslation();

  const setLanguage = useCallback((code: SupportedLanguageCode) => {
    i18n.changeLanguage(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch { /* private mode */ }
  }, [i18n]);

  return {
    language: i18n.language as SupportedLanguageCode,
    setLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}
