import { defineRouting } from 'next-intl/routing'
import { locales } from './request'

export const routing = defineRouting({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always',
})






