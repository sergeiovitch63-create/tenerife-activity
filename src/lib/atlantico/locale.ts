import { mapLocaleToAtlanticoLang } from './lang'

/**
 * Map Next.js locale to Atlantico language code.
 *
 * Used mainly by debug pages and some server helpers.
 * Returns 2‑letter lowercase codes: en, fr, es, de, ru, pl, it.
 */
export function mapLocaleToLang(locale: string): string {
  return mapLocaleToAtlanticoLang(locale)
}
