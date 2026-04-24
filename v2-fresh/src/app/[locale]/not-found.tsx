import LocaleLink from '@/components/LocaleLink'
import { getDictionary } from '@/i18n'
import { isLocale, type Locale } from '@/lib/locale'

export default function NotFound() {
  const locale: Locale = 'fr'
  const t = getDictionary(locale)
  return (
    <div className="container-x py-24 text-center">
      <span className="chip mb-4">404</span>
      <h1 className="h-display text-4xl md:text-5xl">{t.notFound.title}</h1>
      <p className="text-ink-500 mt-3">{t.notFound.subtitle}</p>
      <LocaleLink href="/" className="btn-primary mt-6 inline-flex">{t.notFound.home}</LocaleLink>
    </div>
  )
}
