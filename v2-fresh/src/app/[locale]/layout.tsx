import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CartProvider } from '@/lib/cart'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import AIGuide from '@/components/AIGuide'
import CartDrawer from '@/components/CartDrawer'
import { I18nProvider } from '@/i18n/context'
import { getDictionary } from '@/i18n'
import { isLocale, locales, type Locale } from '@/lib/locale'
import { getClassifications } from '@/lib/atlantico/client'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string }
}): Promise<Metadata> {
  const locale = (isLocale(params.locale) ? params.locale : 'fr') as Locale
  const dict = getDictionary(locale)
  return {
    title: `Tenerife Activity — ${dict.hero.titleLine2}`,
    description: dict.hero.subtitle,
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  if (!isLocale(params.locale)) notFound()
  const locale = params.locale as Locale
  const dict = getDictionary(locale)
  const categories = await getClassifications(locale)

  return (
    <I18nProvider locale={locale} dict={dict}>
      <CartProvider>
        <Header categories={categories} />
        <main className="min-h-screen">{children}</main>
        <Footer categories={categories} />
        <AIGuide />
        <CartDrawer />
      </CartProvider>
    </I18nProvider>
  )
}
