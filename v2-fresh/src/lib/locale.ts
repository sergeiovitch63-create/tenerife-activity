export const locales = ['fr', 'en', 'es', 'de', 'it', 'ru'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'fr'

// Atlantico API language codes (per the official PDF)
export const atlanticoLangMap: Record<Locale, 'CAS' | 'ENG' | 'FRA' | 'RUS' | 'ALE' | 'ITA'> = {
  fr: 'FRA',
  en: 'ENG',
  es: 'CAS',
  de: 'ALE',
  it: 'ITA',
  ru: 'RUS',
}

export const localeLabels: Record<Locale, { native: string; flag: string }> = {
  fr: { native: 'Français', flag: '🇫🇷' },
  en: { native: 'English', flag: '🇬🇧' },
  es: { native: 'Español', flag: '🇪🇸' },
  de: { native: 'Deutsch', flag: '🇩🇪' },
  it: { native: 'Italiano', flag: '🇮🇹' },
  ru: { native: 'Русский', flag: '🇷🇺' },
}

export function isLocale(s: string | undefined | null): s is Locale {
  return !!s && (locales as readonly string[]).includes(s)
}

export function pathWithLocale(locale: Locale, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  return `/${locale}${clean === '/' ? '' : clean}`
}

export function detectLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return defaultLocale
  const header = acceptLanguage.toLowerCase()
  for (const loc of locales) {
    if (header.startsWith(loc) || header.includes(`,${loc}`) || header.includes(` ${loc}`)) {
      return loc
    }
  }
  return defaultLocale
}

export function localeCurrency(locale: Locale): string {
  // Atlantico is EUR-only; we keep EUR across locales but could adapt.
  return 'EUR'
}

export function localeIntl(locale: Locale): string {
  switch (locale) {
    case 'fr': return 'fr-FR'
    case 'en': return 'en-GB'
    case 'es': return 'es-ES'
    case 'de': return 'de-DE'
    case 'it': return 'it-IT'
    case 'ru': return 'ru-RU'
  }
}
