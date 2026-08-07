import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { setLocale } from './locale'
import de from './locales/de.json'
import en from './locales/en.json'
import nl from './locales/nl.json'
import es from './locales/es.json'
import pt from './locales/pt.json'
import fr from './locales/fr.json'
import it from './locales/it.json'

/** Unterstützte Sprachen (Eigenbezeichnung + Flagge für die Auswahl). */
export const SUPPORTED_LANGUAGES = [
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
] as const

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code']

const resources = {
  de: { translation: de },
  en: { translation: en },
  nl: { translation: nl },
  es: { translation: es },
  pt: { translation: pt },
  fr: { translation: fr },
  it: { translation: it },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    // 'de-DE' → 'de', 'pt-BR' → 'pt' usw.
    nonExplicitSupportedLngs: true,
    fallbackLng: 'en',
    detection: {
      // Nutzerwahl (localStorage) gewinnt, sonst Gerätesprache (navigator).
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'bh_lang',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
    returnNull: false,
  })

function syncLocale(lng: string): void {
  setLocale(lng)
  if (typeof document !== 'undefined') document.documentElement.lang = lng
}

syncLocale(i18n.resolvedLanguage ?? i18n.language ?? 'de')
i18n.on('languageChanged', (lng) => syncLocale(lng))

export default i18n
