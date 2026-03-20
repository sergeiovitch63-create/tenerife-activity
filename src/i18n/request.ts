import { getRequestConfig } from 'next-intl/server'

export const locales = ['en', 'es', 'de', 'fr', 'it', 'ru', 'pl'] as const
export type Locale = (typeof locales)[number]

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale

  // Validate locale - if invalid, default to 'en' instead of calling notFound()
  // notFound() cannot be called in root layout context, so we default here
  // Invalid locales will be caught in src/app/[locale]/layout.tsx
  if (!locale || !locales.includes(locale as Locale)) {
    locale = 'en'
  }

  // Load messages for the current locale
  const messages = (await import(`../../messages/${locale}.json`)).default

  return {
    locale,
    messages,
  }
})




