/**
 * Map locale code to Atlantico language code
 * Defaults to ENG if locale not mapped
 * 
 * Atlantico API expects 3-letter uppercase codes: ENG, ESP, DEU, FRA, RUS, UKR, etc.
 */
export function mapLocaleToLang(locale: string): string {
  const API_LANG_BY_LOCALE: Record<string, string> = {
    en: 'ENG',
    es: 'ESP',
    de: 'DEU',
    fr: 'FRA',
    it: 'ITA',
    ru: 'RUS',
    uk: 'UKR',
    pl: 'POL',
  }
  return API_LANG_BY_LOCALE[locale.toLowerCase()] || 'ENG'
}





