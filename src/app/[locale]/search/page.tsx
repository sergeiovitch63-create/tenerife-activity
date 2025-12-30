import { Section, Container, Stack } from '@/ui/components/layout'
import { SearchPageClient } from './SearchPageClient'
import { experienceRepository } from '@/config/repositories'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { buildMetadata } from '@/lib/seo'
import { type Locale } from '@/i18n/request'
import { siteName } from '@/config/site'

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
  const query = q || ''
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
  const t = await getTranslations({ locale })

  // Fetch all experiences and filter by query
  let results = await experienceRepository.findAll()

  if (query) {
    // Use repository search method
    results = await experienceRepository.search(query)
  }

  return (
    <>
      {/* Search Header */}
      <Section variant="default" background="subtle">
        <Container size="lg">
          <div className="glass-panel p-6 md:p-8">
            <Stack direction="column" gap="md" align="start">
              <div className="space-y-3 max-w-3xl">
                <h1 className="text-4xl md:text-5xl font-bold text-glass-900">
                  {t('search.title')}
                </h1>
                {query && (
                  <p className="text-xl text-glass-600 leading-relaxed">
                    {t('search.for')} &quot;{query}&quot;
                  </p>
                )}
              </div>
            </Stack>
          </div>
        </Container>
      </Section>

      {/* Search Results (Client Component) */}
      <SearchPageClient initialResults={results} query={query} />
    </>
  )
}

