import type { Locale } from '@/lib/locale'
import { fr, type Dict } from './dictionaries/fr'
import { en } from './dictionaries/en'
import { es } from './dictionaries/es'
import { de } from './dictionaries/de'
import { it } from './dictionaries/it'
import { ru } from './dictionaries/ru'

const dicts: Record<Locale, Dict> = { fr, en, es, de, it, ru }

export function getDictionary(locale: Locale): Dict {
  return dicts[locale] ?? fr
}

export type { Dict }
