/**
 * Locale → Atlántico language (3-letter uppercase).
 * Delegates to `mapLocaleToLang` in `./locale` (single source of truth).
 */

import { mapLocaleToLang } from './locale'

export type AtlanticoLang3 = 'ENG' | 'CAS' | 'FRA' | 'ALE' | 'ITA' | 'RUS' | 'POL'

const ATL_LANG3 = new Set<string>(['ENG', 'CAS', 'FRA', 'ALE', 'ITA', 'RUS', 'POL'])

/**
 * Same codes as groupDetails / loadLimits paths (uppercase).
 */
export function mapLocaleToAtlanticoLang(locale: string): AtlanticoLang3 {
  const code = mapLocaleToLang(locale)
  if (ATL_LANG3.has(code)) return code as AtlanticoLang3
  return 'ENG'
}

export function mapLocaleToAtlanticoLangUpper(locale: string): string {
  return mapLocaleToLang(locale)
}
