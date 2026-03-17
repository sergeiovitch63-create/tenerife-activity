/**
 * Locale to Atlántico Language Mapping
 * 
 * Maps Next.js locale codes to Atlántico API language codes
 * Atlántico uses lowercase 2-letter codes: "en", "fr", "es", "de", "ru", "uk", "pl", "it"
 */

/**
 * Map Next.js locale to Atlántico language code (lowercase, 2 letters).
 *
 * Tenerife Activity uses locales like "fr", "es", "de", "en", "ru", "pl", "it".
 * Atlantico API accepte les mêmes codes en minuscules.
 */
export function mapLocaleToAtlanticoLang(locale: string): 'en' | 'fr' | 'es' | 'de' | 'ru' | 'pl' | 'it' {
  const normalized = (locale || '').toLowerCase()

  switch (normalized) {
    case 'fr':
      return 'fr'
    case 'es':
      return 'es'
    case 'de':
      return 'de'
    case 'ru':
      return 'ru'
    case 'pl':
      return 'pl'
    case 'it':
      return 'it'
    case 'en':
    default:
      return 'en'
  }
}

/**
 * Map Next.js locale to Atlántico language code (uppercase, 2 letters).
 * Kept for compatibility with any legacy callers expecting uppercase.
 */
export function mapLocaleToAtlanticoLangUpper(locale: string): string {
  return mapLocaleToAtlanticoLang(locale).toUpperCase()
}




