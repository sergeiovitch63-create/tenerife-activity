/**
 * Locale to Atlántico Language Mapping
 * 
 * Maps Next.js locale codes to Atlántico API language codes
 * Atlántico uses lowercase 2-letter codes: "en", "fr", "es", "de", "ru", "uk", "pl", "it"
 */

/**
 * Map Next.js locale to Atlántico language code.
 * Always returns ENG: same data logic for all locales (translations later).
 */
export function mapLocaleToAtlanticoLang(_locale: string): "CAS"|"ENG"|"FRA"|"RUS"|"ALE"|"ITA" {
  return "ENG"
}

/**
 * Map Next.js locale to Atlántico language code (uppercase).
 * Always returns ENG: same data logic for all locales (translations later).
 */
export function mapLocaleToAtlanticoLangUpper(_locale: string): string {
  return 'ENG'
}




