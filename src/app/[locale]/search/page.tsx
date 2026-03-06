/**
 * Search page - displays groupDetails (activities) matching the search query by title.
 * Used when user searches from the header loupe.
 */

import { Section, Container } from '@/ui/components/layout'
import { Link } from '@/navigation'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { buildMetadata } from '@/lib/seo'
import type { Locale } from '@/i18n/request'
import { siteName } from '@/config/site'
import { mapLocaleToLang } from '@/lib/atlantico/locale'
import { decodeTextFromApi } from '@/lib/atlantico/htmlAssets'
import { SearchResultCard } from './SearchResultCard'

interface SearchPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string }>
}

export async function generateMetadata({
  params,
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const { locale } = await params
  const { q } = await searchParams
  const query = q?.trim() || ''
  const t = await getTranslations({ locale, namespace: 'seo' })
  const tSearch = await getTranslations({ locale, namespace: 'search' })

  if (!query) {
    return buildMetadata({
      locale: locale as Locale,
      pathname: '/search',
      title: t('search.title'),
      description: t('search.description'),
    })
  }

  return buildMetadata({
    locale: locale as Locale,
    pathname: `/search?q=${encodeURIComponent(query)}`,
    title: `${tSearch('title')} "${query}" | ${siteName}`,
    description: `${tSearch('for')} "${query}"`,
  })
}

export default async function SearchPage({
  params,
  searchParams,
}: SearchPageProps) {
  const { locale } = await params
  const { q } = await searchParams
  const query = q?.trim() || ''
  const t = await getTranslations('search')
  const tCommon = await getTranslations('common')

  const lang = mapLocaleToLang(locale)

  let groups: Array<{
    code: string
    name: string
    desc?: string
    image?: string
    price?: number
    duration?: string
  }> = []

  if (query) {
    try {
      const headersList = await import('next/headers').then((m) => m.headers)
      const hdrs = headersList()
      const host = hdrs.get('host') || 'localhost:3000'
      const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
      const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || ''
      const origin = envBase || `${protocol}://${host}`

      const res = await fetch(
        `${origin}/api/atlantico/search?q=${encodeURIComponent(query)}&lang=${encodeURIComponent(lang)}`,
        { next: { revalidate: 120 } }
      )
      if (res.ok) {
        const data = await res.json()
        if (data.ok && Array.isArray(data.groups)) {
          groups = data.groups
          // Sort by price: cheapest first (items without price go last)
          groups.sort((a, b) => {
            const pa = a.price ?? Infinity
            const pb = b.price ?? Infinity
            return pa - pb
          })
        }
      }
    } catch {
      groups = []
    }
  }

  return (
    <>
      <Section variant="default" background="subtle">
        <Container size="lg">
          <div className="glass-panel p-6 md:p-8">
            <div className="space-y-3 max-w-3xl">
              <h1 className="text-4xl md:text-5xl font-bold text-glass-900">
                {t('title')}
              </h1>
              {query ? (
                <p className="text-xl text-glass-600 leading-relaxed">
                  {t('for')} &quot;{query}&quot;
                </p>
              ) : (
                <p className="text-lg text-glass-600">{t('emptyStateDescription')}</p>
              )}
            </div>
          </div>
        </Container>
      </Section>

      <Section variant="default" background="default">
        <Container size="lg">
          {!query ? (
            <div className="text-center py-16 space-y-6">
              <p className="text-lg text-glass-600 max-w-md mx-auto">
                {t('emptyStateDescription')}
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 text-base font-medium bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors"
              >
                {tCommon('backToHome')}
              </Link>
            </div>
          ) : groups.length > 0 ? (
            <div className="space-y-6">
              <p className="text-base text-glass-600">
                {groups.length === 1
                  ? t('resultsCount', { count: 1 })
                  : t('resultsCount_plural', { count: groups.length })}{' '}
                found
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map((g) => (
                  <SearchResultCard
                    key={g.code}
                    code={g.code}
                    name={decodeTextFromApi(g.name)}
                    desc={g.desc}
                    price={g.price}
                    duration={g.duration}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 space-y-6">
              <h2 className="text-2xl font-semibold text-glass-900">
                {t('noResults')}
              </h2>
              <p className="text-lg text-glass-600 max-w-md mx-auto">
                {t('noResultsDesc')}
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-4">
                <Link href="/search?q=teide">
                  <span className="inline-flex items-center px-4 py-2 rounded-full bg-glass-100 text-glass-800 hover:bg-glass-200 transition-colors">
                    {t('suggestions.teide')}
                  </span>
                </Link>
                <Link href="/search?q=boat">
                  <span className="inline-flex items-center px-4 py-2 rounded-full bg-glass-100 text-glass-800 hover:bg-glass-200 transition-colors">
                    {t('suggestions.boat')}
                  </span>
                </Link>
                <Link href="/search?q=siam park">
                  <span className="inline-flex items-center px-4 py-2 rounded-full bg-glass-100 text-glass-800 hover:bg-glass-200 transition-colors">
                    {t('suggestions.siamPark')}
                  </span>
                </Link>
              </div>
            </div>
          )}
        </Container>
      </Section>
    </>
  )
}
