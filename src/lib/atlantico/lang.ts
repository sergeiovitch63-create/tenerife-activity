/**
 * Locale to Atlántico Language Mapping
 * 
 * Maps Next.js locale codes to Atlántico API language codes
 * Atlántico uses lowercase 2-letter codes: "en", "fr", "es", "de", "ru", "uk", "pl", "it"
 */

/**
 * Map Next.js locale to Atlántico language code
 * 
 * Per Atlantico API PDF (page 9-10): language codes are CAS/ENG/FRA/RUS/ALE/ITA
 * 
 * @param locale - Next.js locale (e.g., "en", "fr", "es", "de", "ru", "it")
 * @returns Atlántico language code (CAS|ENG|FRA|RUS|ALE|ITA)
 */
export function mapLocaleToAtlanticoLang(locale: string): "CAS"|"ENG"|"FRA"|"RUS"|"ALE"|"ITA" {
  const l = (locale || "").toLowerCase().trim()
  
  // Map to Atlantico payment gateway language codes per PDF
  if (l.startsWith("es")) return "CAS"
  if (l.startsWith("en")) return "ENG"
  if (l.startsWith("fr")) return "FRA"
  if (l.startsWith("ru")) return "RUS"
  if (l.startsWith("de")) return "ALE"
  if (l.startsWith("it")) return "ITA"
  
  // Default fallback
  return "ENG"
}

/**
 * Map Next.js locale to Atlántico language code (uppercase for some endpoints)
 * Some endpoints like groupDetails/eventDetails use uppercase (ENG, FRA, ESP)
 * 
 * @param locale - Next.js locale
 * @returns Uppercase 3-letter code (ENG, FRA, ESP, etc.)
 */
export function mapLocaleToAtlanticoLangUpper(locale: string): string {
  const mapping: Record<string, string> = {
    en: 'ENG',
    fr: 'FRA',
    es: 'ESP',
    de: 'DEU',
    ru: 'RUS',
    uk: 'UKR',
    pl: 'POL',
    it: 'ITA',
  }
  
  const normalized = locale.toLowerCase().trim()
  const lang = mapping[normalized]
  
  if (lang) {
    return lang
  }
  
  // Fallback
  const defaultLang = process.env.ATLANTICO_DEFAULT_LANG || 'ENG'
  return defaultLang.toUpperCase()
}




