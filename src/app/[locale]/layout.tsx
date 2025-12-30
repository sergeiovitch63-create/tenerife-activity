import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Header } from '@/ui/components/navigation'
import { Footer } from '@/ui/components/navigation'
import { AttributionCapture } from '../AttributionCapture'
import { locales, type Locale } from '@/i18n/request'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { buildMetadata } from '@/lib/seo'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'seo' })

  const metadata = buildMetadata({
    locale: locale as Locale,
    pathname: '/',
    title: t('siteName'),
    description: t('defaultDescription'),
  })
  
  // Add icons metadata to prevent 404 for favicon
  return {
    ...metadata,
    icons: {
      icon: '/icon.svg',
      shortcut: '/icon.svg',
      apple: '/icon.svg',
    },
  }
}


export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // Validate locale - check if it's a valid locale
  if (!locale || !(locales as readonly string[]).includes(locale)) {
    notFound()
  }

  // Set the request locale for static rendering
  setRequestLocale(locale)

  // Get messages for the current locale
  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      <Suspense fallback={null}>
        <AttributionCapture />
      </Suspense>
      <Header />
      {children}
      <Footer locale={locale} />
    </NextIntlClientProvider>
  )
}
