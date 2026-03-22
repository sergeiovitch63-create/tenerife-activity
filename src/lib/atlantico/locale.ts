/**
 * Map Next.js locale to Atlántico API 3-letter language codes.
 * Used by groupDetails, must-see, activite listings, etc.
 *
 * Aligns with `toApiLang` in `atlantico.ts` and checkout recovery (CAS for Spanish, ALE for German).
 */
export function mapLocaleToLang(locale: string): string {
  const l = String(locale || 'en').toLowerCase().split('-')[0]
  const map: Record<string, string> = {
    en: 'ENG',
    es: 'CAS',
    fr: 'FRA',
    de: 'ALE',
    it: 'ITA',
    ru: 'RUS',
    pl: 'POL',
  }
  return map[l] ?? 'ENG'
}
