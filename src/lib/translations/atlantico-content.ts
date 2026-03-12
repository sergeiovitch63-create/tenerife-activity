/**
 * Translate Atlantico API content (tour names, descriptions) by locale.
 * - Text lookup: keyed by normalized English text
 * - Descriptions: keyed by tour code (when available)
 */

import type { Locale } from '@/i18n/request'
import contentTranslations from '@/data/translations/atlantico-content.json'
import descriptionTranslations from '@/data/translations/atlantico-descriptions-by-code.json'

type ContentTranslations = Record<string, Partial<Record<Locale, string>>>
type DescByCode = Record<string, Partial<Record<Locale, string>>>

const translations = contentTranslations as ContentTranslations
const descByCode = descriptionTranslations as DescByCode

function normalizeKey(text: string): string {
  return (text || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+&\s+/g, ' and ')
    .trim()
}

/**
 * Translate Atlantico content (tour name, etc.) for the given locale.
 * Returns original text if locale is 'en' or no translation exists.
 */
export function translateContent(text: string | undefined | null, locale: Locale): string {
  if (!text || typeof text !== 'string') return ''
  if (locale === 'en') return text
  const key = normalizeKey(text)
  if (!key) return text
  const entry = translations[key]
  const translated = entry?.[locale]
  return translated ?? text
}

/**
 * Translate tour description by code. Prefer this when code is available.
 */
export function translateDescriptionByCode(
  code: string | undefined | null,
  fallbackText: string,
  locale: Locale
): string {
  if (!code || locale === 'en') return fallbackText
  const codeStr = String(code).trim()
  const entry = descByCode[codeStr]
  const translated = entry?.[locale]
  return translated ?? fallbackText
}

/**
 * Check if a translation exists for the given text and locale
 */
export function hasTranslation(text: string, locale: Locale): boolean {
  if (!text || locale === 'en') return false
  const key = normalizeKey(text)
  return Boolean(translations[key]?.[locale])
}
