'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Locale } from '@/lib/locale'
import type { Dict } from './dictionaries/fr'

type I18nValue = { locale: Locale; t: Dict }

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale
  dict: Dict
  children: ReactNode
}) {
  return <I18nContext.Provider value={{ locale, t: dict }}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}

export function useLocalePath() {
  const { locale } = useI18n()
  return (path: string) => {
    const clean = path.startsWith('/') ? path : `/${path}`
    return `/${locale}${clean === '/' ? '' : clean}`
  }
}
