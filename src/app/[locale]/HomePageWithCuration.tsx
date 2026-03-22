import { Suspense } from 'react'
import { loadCuration } from '@/lib/vibes/curation'
import { fetchMustSeeItemsWithImages } from '@/lib/recommendations/enrich-must-see-with-images.server'
import { mapLocaleToLang } from '@/lib/atlantico/locale'
import { HomePageContent } from './HomePageContent'
import type { Vibe } from '@/core/entities/vibe'
import type { Experience } from '@/core/entities/experience'

interface HomePageWithCurationProps {
  locale: string
  vibes: Vibe[]
  allExperiences: Experience[]
  t: any
}

async function CurationLoader({
  locale,
  vibes,
  allExperiences,
  t,
}: HomePageWithCurationProps) {
  const curatedRows = await loadCuration()

  // Enrich Must See carousel with images from groupDetails (server-side)
  let mustSeeItems: { row1: Array<{ title: string; subtitleKey: string; image: string }>; row2: Array<{ title: string; subtitleKey: string; image: string }> } | null = null
  try {
    const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || ''
    const headersList = await import('next/headers').then((m) => m.headers)
    const hdrs = headersList()
    const host = hdrs.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const origin = envBase || `${protocol}://${host}`
    const atlLang = mapLocaleToLang(locale)
    mustSeeItems = await fetchMustSeeItemsWithImages(atlLang, origin)
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[HOME] Must See enrichment failed:', err instanceof Error ? err.message : 'Unknown error')
    }
  }

  return (
    <HomePageContent
      locale={locale}
      vibes={vibes}
      allExperiences={allExperiences}
      curatedRows={curatedRows}
      mustSeeItems={mustSeeItems}
      t={t}
    />
  )
}

export function HomePageWithCuration(props: HomePageWithCurationProps) {
  return (
    <Suspense fallback={
      <HomePageContent
        {...props}
        curatedRows={{}}
        mustSeeItems={null}
      />
    }>
      <CurationLoader {...props} />
    </Suspense>
  )
}
