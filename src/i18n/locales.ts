export type LocaleInfo = {
  code: string
  label: string
  flag: string
}

export const LOCALES: LocaleInfo[] = [
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'es', label: 'ES', flag: '🇪🇸' },
  { code: 'de', label: 'DE', flag: '🇩🇪' },
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'it', label: 'IT', flag: '🇮🇹' },
  { code: 'ru', label: 'RU', flag: '🇷🇺' },
  { code: 'pl', label: 'PL', flag: '🇵🇱' },
] as const

export const DEFAULT_LOCALE = 'en'

/**
 * Get locale info by code, defaulting to 'en' if not found
 */
export function getLocaleInfo(code: string): LocaleInfo {
  const locale = LOCALES.find((loc) => loc.code === code)
  return locale || LOCALES.find((loc) => loc.code === DEFAULT_LOCALE)!
}

/**
 * Get locale codes array
 */
export function getLocaleCodes(): string[] {
  return LOCALES.map((loc) => loc.code)
}





