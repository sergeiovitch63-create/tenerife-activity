import { Section, Container, Stack } from '@/ui/components/layout'
import { VibePageClient } from './VibePageClient'
import { VipTourRowCard } from '../VipTourRowCard'
// VipTourCardSkeleton and VipTourPlaceholderCard removed - only showing connected tours
import { VIP_TOURS_MAPPING, getVipTourMappingBySlug } from '@/content/vibes/vip-tours.mapping'
import { vibeRepository } from '@/config/repositories'
import { experienceRepository } from '@/config/repositories'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { getTranslatedVibeTitle } from '@/ui/components/vibe/vibe-translations'
import { buildMetadata } from '@/lib/seo'
import { type Locale } from '@/i18n/request'
import { siteName } from '@/config/site'
import { loadCuration, applyCuration, sortExperiencesWithCuration } from '@/lib/vibes/curation'
import { mapLocaleToLang } from '@/lib/atlantico/locale'
import type { FullTour } from '@/lib/atlantico/catalog-types'
import { Link } from '@/navigation'

interface VibePageProps {
  params: Promise<{ locale: string; slug: string }>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({
  params,
}: VibePageProps): Promise<Metadata> {
  const { slug, locale } = await params
  const vibe = await vibeRepository.findBySlug(slug)

  const tSeo = await getTranslations({ locale, namespace: 'seo' })
  const tVibes = await getTranslations({ locale, namespace: 'vibes' })

  if (!vibe) {
    return {
      title: tSeo('vibe.notFoundTitle'),
    }
  }

  const translatedTitle = getTranslatedVibeTitle(vibe.slug, tVibes, vibe.title)

  return buildMetadata({
    locale: locale as Locale,
    pathname: `/vibe/${slug}`,
    title: tSeo('vibe.titleTemplate', { vibe: translatedTitle }),
    description: vibe.tagline || vibe.description || tSeo('vibe.descriptionTemplate', { vibe: translatedTitle }),
  })
}

export default async function VibePage({ params, searchParams }: VibePageProps & { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { slug, locale } = await params
  const vibe = await vibeRepository.findBySlug(slug)

  if (!vibe) {
    notFound()
  }

  // Special handling for "tours-vip" - use Super Catalog with vibe filter
  // Only displays tours with valid API data (no placeholders)
  if (slug === 'tours-vip' || slug === 'vip-tours') {
    return <VipToursPage locale={locale} vibe={vibe} />
  }

  // Get all experiences
  const all = await experienceRepository.findAll()
  
  // Load curation from database (if available)
  let curatedRows: Record<string, any> = {}
  try {
    curatedRows = await loadCuration()
  } catch (err) {
    // Silently fail if Supabase is not configured (dev mode)
    if (process.env.NODE_ENV === 'development') {
      console.warn('[VIBE] Curation not available:', err instanceof Error ? err.message : 'Unknown error')
    }
  }
  
  // Apply curation to experiences
  const curatedAll = applyCuration(all, curatedRows)
  
  // Filter by vibeId (after curation, which may have changed vibeId)
  const experiencesById = curatedAll.filter((exp) => exp.vibeId === vibe.id)

  let experiences = experiencesById

  // Fallback STRICT uniquement pour theme-parks
  let experiencesFallback: typeof curatedAll = []
  if (experiencesById.length === 0 && slug === 'theme-parks') {
    const { getKeywordsForVibe } = await import('@/lib/vibes/keywords-by-vibe')
    const keywords = getKeywordsForVibe('2') // vibeId "2" = theme-parks
    
    if (keywords.length > 0) {
      const matches = (exp: any) => {
        // Construire searchableText depuis tous les champs pertinents
        const text = [
          exp?.title,
          exp?.description,
          exp?.category,
          exp?._raw?.name,
          exp?._raw?.title,
          exp?._raw?.desc,
          exp?._raw?.groupName,
          exp?._raw?.classificationName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .trim()
        
        // Match sur keywords (normalisés en lowercase)
        return keywords.some((keyword) => {
          const normalizedKeyword = keyword.toLowerCase().trim()
          return text.includes(normalizedKeyword)
        })
      }
      experiencesFallback = curatedAll.filter(matches)
      experiences = experiencesFallback
    }
  }

  // Sort with curation priority
  experiences = sortExperiencesWithCuration(experiences)

  // Log DEV unique pour theme-parks
  if (process.env.NODE_ENV === 'development' && slug === 'theme-parks') {
    console.log('[THEME_PARKS_FALLBACK]', {
      totalAll: all.length,
      curatedCount: curatedAll.length,
      byVibeIdCount: experiencesById.length,
      fallbackCount: experiencesFallback.length,
    })
  }
  
  // Get translated vibe title
  const tVibes = await getTranslations({ locale, namespace: 'vibes' })
  const translatedTitle = getTranslatedVibeTitle(vibe.slug, tVibes, vibe.title)

  // Special handling for "cable-car-observatory": display 3 empty clickable cards
  if (slug === 'cable-car-observatory') {
    return (
      <>
        {/* Vibe Hero */}
        <Section variant="default" background="subtle">
          <Container size="lg">
            <div className="glass-panel p-6 md:p-8">
              <Stack direction="column" gap="md" align="start">
                <div className="space-y-3">
                  <h1 className="text-4xl md:text-5xl font-bold text-glass-900">
                    {translatedTitle}
                  </h1>
                  {vibe.tagline && (
                    <p className="text-xl text-glass-600 leading-relaxed max-w-2xl">
                      {vibe.tagline}
                    </p>
                  )}
                </div>
              </Stack>
            </div>
          </Container>
        </Section>

        {/* 3 Empty Cards Grid */}
        <Section variant="default" background="default">
          <Container size="lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link href="/activities/cable-car-1" className="block">
                <div className="bg-white border border-glass-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow min-h-[200px] cursor-pointer"></div>
              </Link>
              <Link href="/activities/cable-car-2" className="block">
                <div className="bg-white border border-glass-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow min-h-[200px] cursor-pointer"></div>
              </Link>
              <Link href="/activities/cable-car-3" className="block">
                <div className="bg-white border border-glass-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow min-h-[200px] cursor-pointer"></div>
              </Link>
            </div>
          </Container>
        </Section>
      </>
    )
  }

  return (
    <>
      {/* Vibe Hero */}
      <Section variant="default" background="subtle">
        <Container size="lg">
          <div className="glass-panel p-6 md:p-8">
            <Stack direction="column" gap="md" align="start">
              <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-bold text-glass-900">
                  {translatedTitle}
                </h1>
                {vibe.tagline && (
                  <p className="text-xl text-glass-600 leading-relaxed max-w-2xl">
                    {vibe.tagline}
                  </p>
                )}
              </div>
            </Stack>
          </div>
        </Container>
      </Section>

      {/* Filters & Experiences Listing (Client Component) */}
      <Suspense fallback={null}>
        <VibePageClient experiences={experiences} showFilters={false} />
      </Suspense>
    </>
  )
}

/**
 * VIP Tours Page - API-DRIVEN ONLY (by ID from mapping)
 * Only displays the 7 tours connected via atlanticoId (no filters, no matching, no allTours)
 */
async function VipToursPage({ locale, vibe }: { locale: string; vibe: any }) {
  // Map locale to Atlantico API language code (ENG, ESP, DEU, FRA, etc.)
  const atlLang = mapLocaleToLang(locale)

  // Build absolute URL for Server Component fetch
  const headersList = await import('next/headers').then((m) => m.headers)
  const hdrs = headersList()
  const host = hdrs.get('host') || 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || ''
  const origin = envBase ? envBase : `${protocol}://${host}`

  // Get translated vibe title
  const tVibes = await getTranslations({ locale, namespace: 'vibes' })
  const translatedTitle = getTranslatedVibeTitle(vibe.slug, tVibes, vibe.title)

  // Use ALL entries from VIP_TOURS_MAPPING (all 11 tours, ordered by mapping)
  // Build list UNIQUELY from mapping - no filters, no matching, just API resolution
  interface ResolvedTourItem {
    type: 'api'
    tour: FullTour // API tour data (required)
    mapping: typeof VIP_TOURS_MAPPING[0] // Mapping entry
  }
  
  // Fetch catalog full list once (for fallback search if needed)
  let catalogFull: FullTour[] | null = null
  
  // Helper: Search tour in catalog by keywords/fallbackTitle
  const findTourInCatalog = (mapping: typeof VIP_TOURS_MAPPING[0]): FullTour | null => {
    if (!catalogFull) return null
    
    const searchText = `${mapping.fallbackTitle} ${mapping.searchKeywords.join(' ')}`.toLowerCase()
    
    for (const tour of catalogFull) {
      const tourText = `${tour.title || ''} ${tour.displayTitle || ''} ${tour.slug || ''} ${(tour as any).raw?.name || ''}`.toLowerCase()
      
      // Check if any keyword matches
      const keywordMatch = mapping.searchKeywords.some(keyword => 
        tourText.includes(keyword.toLowerCase())
      )
      
      // Check if fallbackTitle matches (fuzzy)
      const titleMatch = tourText.includes(mapping.fallbackTitle.toLowerCase().substring(0, 10))
      
      if (keywordMatch || titleMatch) {
        return tour
      }
    }
    
    return null
  }
  
  // Fetch each tour from mapping (all 11, in parallel)
  const fetchPromises = VIP_TOURS_MAPPING.map(async (mapping): Promise<ResolvedTourItem | null> => {
    let apiTour: FullTour | null = null
    let endpoint: string | null = null
    let reason: string | null = null

    // STEP 1: Try by atlanticoId (highest priority)
    if (mapping.atlanticoId) {
      endpoint = `${origin}/api/catalog/item?id=${mapping.atlanticoId}&lang=${atlLang}&mode=sellable&merged=1&includeRaw=1`
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[VIP_RESOLVE] start', {
          internalSlug: mapping.internalSlug,
          atlanticoId: mapping.atlanticoId,
          atlanticoSlug: mapping.atlanticoSlug || 'none',
          endpoint: endpoint,
        })
      }

      try {
        const response = await fetch(endpoint, {
          cache: 'no-store' as RequestCache,
          next: { revalidate: 0 },
        })

        if (response.ok) {
          apiTour = await response.json()
          
          // Validate: must have id and title (required for display)
          if (!apiTour || !apiTour.id || !apiTour.title) {
            apiTour = null
            reason = 'Invalid API response: missing id or title'
          }
        } else {
          reason = `HTTP ${response.status}: ${response.statusText}`
        }
      } catch (err) {
        reason = err instanceof Error ? err.message : 'Unknown error'
      }
    }

    // STEP 2: If ID fetch failed, try by atlanticoSlug
    if (!apiTour && mapping.atlanticoSlug) {
      endpoint = `${origin}/api/catalog/item?slug=${mapping.atlanticoSlug}&lang=${atlLang}&mode=sellable&merged=1&includeRaw=1`
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[VIP_RESOLVE] start', {
          internalSlug: mapping.internalSlug,
          atlanticoId: mapping.atlanticoId || 'none',
          atlanticoSlug: mapping.atlanticoSlug,
          endpoint: endpoint,
          via: 'slug-fallback',
        })
      }

      try {
        const response = await fetch(endpoint, {
          cache: 'no-store' as RequestCache,
          next: { revalidate: 0 },
        })

        if (response.ok) {
          apiTour = await response.json()
          
          // Validate: must have id and title
          if (!apiTour || !apiTour.id || !apiTour.title) {
            apiTour = null
            reason = 'Invalid API response: missing id or title (slug fallback)'
          }
        } else {
          reason = `HTTP ${response.status}: ${response.statusText} (slug fallback)`
        }
      } catch (err) {
        reason = err instanceof Error ? err.message : 'Unknown error (slug fallback)'
      }
    }

    // STEP 3: If still not found, try searching in catalog/full by keywords
    if (!apiTour && !mapping.atlanticoId && !mapping.atlanticoSlug) {
      // Lazy load catalog if needed
      if (!catalogFull) {
        try {
          const catalogResponse = await fetch(
            `${origin}/api/catalog/full?lang=${atlLang}&mode=sellable&merged=1&thin=smart&includeRaw=0`,
            { next: { revalidate: 300 } }
          )
          if (catalogResponse.ok) {
            const catalog = await catalogResponse.json()
            catalogFull = catalog.items || []
          }
        } catch (err) {
          // Ignore catalog fetch errors
        }
      }
      
      const foundTour = findTourInCatalog(mapping)
      if (foundTour && foundTour.id) {
        // Found in catalog, now fetch full details by ID
        endpoint = `${origin}/api/catalog/item?id=${foundTour.id}&lang=${atlLang}&mode=sellable&merged=1&includeRaw=1`
        
        try {
          const response = await fetch(endpoint, {
            cache: 'no-store' as RequestCache,
            next: { revalidate: 0 },
          })
          
          if (response.ok) {
            apiTour = await response.json()
            
            // Validate: must have id and title
            if (!apiTour || !apiTour.id || !apiTour.title) {
              apiTour = null
              reason = 'Invalid API response: missing id or title (catalog search)'
            }
          } else {
            reason = `HTTP ${response.status}: ${response.statusText} (catalog search)`
          }
        } catch (err) {
          reason = err instanceof Error ? err.message : 'Unknown error (catalog search)'
        }
      } else {
        reason = 'Tour not found in catalog via searchKeywords/fallbackTitle'
      }
    }

    // Log result
    if (apiTour && apiTour.id && apiTour.title) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[VIP_RESOLVE] ok', {
          internalSlug: mapping.internalSlug,
          apiId: apiTour.id,
          apiSlug: apiTour.slug || 'none',
          title: apiTour.title || apiTour.displayTitle || 'NO_TITLE',
        })
      }
      return {
        type: 'api',
        tour: apiTour,
        mapping,
      }
    } else {
      // Failed - exclude from list but log
      if (process.env.NODE_ENV === 'development') {
        console.log('[VIP_RESOLVE] fail', {
          internalSlug: mapping.internalSlug,
          reason: reason || 'No valid API response',
          endpoint: endpoint || 'none',
        })
      }
      return null
    }
  })

  // Wait for all fetches to complete
  const resolvedTours = await Promise.all(fetchPromises)
  
  // Filter to only successful fetches (with valid API data: id + title required)
  const connectedTours = resolvedTours.filter(
    (item): item is ResolvedTourItem => 
      item !== null && 
      item.type === 'api' && 
      item.tour !== null &&
      item.tour !== undefined &&
      typeof item.tour.id === 'string' &&
      typeof item.tour.title === 'string' // Changed: require title instead of slug
  )
  
  // DEV: Log final status
  if (process.env.NODE_ENV === 'development') {
    const failedSlugs = VIP_TOURS_MAPPING
      .filter((mapping, index) => resolvedTours[index] === null)
      .map(m => m.internalSlug)
    
    console.log('[VIP_RESOLVE_FINAL]', {
      totalMapping: VIP_TOURS_MAPPING.length,
      connected: connectedTours.length,
      failed: VIP_TOURS_MAPPING.length - connectedTours.length,
      failedSlugs,
    })
  }

  return (
    <>
      {/* Vibe Hero */}
      <Section variant="default" background="subtle">
        <Container size="lg">
          <div className="glass-panel p-6 md:p-8">
            <Stack direction="column" gap="md" align="start">
              <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-bold text-glass-900">
                  {translatedTitle}
                </h1>
                {vibe.tagline && (
                  <p className="text-xl text-glass-600 leading-relaxed max-w-2xl">
                    {vibe.tagline}
                  </p>
                )}
              </div>
            </Stack>
          </div>
        </Container>
      </Section>

      {/* VIP Tours Listing */}
      <Section variant="default" background="default">
        <Container size="lg">
          {connectedTours.length > 0 ? (
            <div className="space-y-6">
              <div className="text-sm text-glass-600 mb-4">
                {connectedTours.length} {connectedTours.length === 1 ? 'tour VIP disponible' : 'tours VIP disponibles'}
              </div>
              {/* Only connected VIP tours (fetched by ID from mapping) */}
              {connectedTours.map((item) => (
                <VipTourRowCard 
                  key={`api-${item.tour.id}-${item.mapping.internalSlug}`} 
                  tour={item.tour}
                  internalSlug={item.mapping.internalSlug}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-glass-500 text-lg">
                No hay tours VIP disponibles.
              </p>
            </div>
          )}
        </Container>
      </Section>
    </>
  )
}

