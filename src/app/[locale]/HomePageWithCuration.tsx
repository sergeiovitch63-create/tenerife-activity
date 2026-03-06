import { Suspense } from 'react'
import { loadCuration } from '@/lib/vibes/curation'
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
  // Load curation from database (if available)
  let curatedRows: Record<string, any> = {}
  try {
    curatedRows = await loadCuration()
  } catch (err) {
    // Silently fail if Supabase is not configured (dev mode)
    if (process.env.NODE_ENV === 'development') {
      console.warn('[HOME] Curation not available:', err instanceof Error ? err.message : 'Unknown error')
    }
  }

  return (
    <HomePageContent
      locale={locale}
      vibes={vibes}
      allExperiences={allExperiences}
      curatedRows={curatedRows}
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
      />
    }>
      <CurationLoader {...props} />
    </Suspense>
  )
}

