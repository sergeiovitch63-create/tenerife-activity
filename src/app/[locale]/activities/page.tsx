/**
 * Activities Catalogue Page
 * 
 * Displays a grid of activity cards using Atlántico sync API (/api/atlantico/sync).
 * Uses EXACT PDF pipeline: clasificationList → groupsList → groupDetails → eventDetails
 * 
 * NO INVENT: Only uses data from API. No hardcoded activities.
 */

import { Link } from '@/navigation'
import { getTranslations } from 'next-intl/server'
import { ClientImage } from '../catalog/ClientImage'
import type { NormalizedCatalogItem } from '@/lib/atlantico/sync-catalog'

// Mark page as dynamic (uses headers())
export const dynamic = 'force-dynamic'


/**
 * Format price with currency
 */
function formatPrice(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Activity Card Component
 * Uses NormalizedCatalogItem from sync API
 */
async function ActivityCard({ item }: { item: NormalizedCatalogItem }) {
  const title = item.title
  // item.image is now a local path (from classification mapping), guaranteed to be non-null
  // normalizeItem() ensures item.image is always set to a valid path
  const imageUrl = item.image || '/images/hero-poster.jpg'
  const price = item.price ?? null
  const currency = item.currency || 'EUR'

  return (
    <div className="bg-white border border-glass-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image with fallback (ClientImage handles onError internally) */}
      <ClientImage src={imageUrl} alt={title} />

      {/* Content */}
      <div className="p-4 flex flex-col gap-3">
        {/* Title */}
        <h3 className="text-lg font-semibold text-glass-900 line-clamp-2 leading-tight">
          {title}
        </h3>

        {/* Price */}
        <div className="flex items-center justify-between text-sm">
          <div className="text-glass-600">
            {price !== null && price > 0 ? (
              <span className="font-medium text-glass-900">
                From {formatPrice(price, currency)}
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded bg-glass-100 text-glass-700 text-xs font-medium">
                —
              </span>
            )}
          </div>
        </div>

        {/* View Button */}
        <Link
          href={`/activity/${item.slug}`}
          className="mt-auto w-full px-4 py-2 bg-ocean-600 text-white text-center font-medium rounded-lg hover:bg-ocean-700 transition-colors focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2"
        >
          View
        </Link>
      </div>
    </div>
  )
}

/**
 * Activities Page
 * Uses Atlántico sync API (/api/atlantico/sync)
 */
export default async function ActivitiesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'activitiesPage' })
  
  // Map locale to Atlántico language code (ENG, ESP, etc.)
  // Default mapping (can be extended)
  const langMap: Record<string, string> = {
    en: 'ENG',
    es: 'ESP',
    fr: 'FRA',
    de: 'GER',
    it: 'ITA',
    pl: 'POL',
    ru: 'RUS',
    uk: 'UKR',
  }
  const lang = langMap[locale] || process.env.ATLANTICO_LANGUAGE_DEFAULT || 'ENG'

  // Fetch items from sync API (CACHE ONLY - no blocking)
  let items: NormalizedCatalogItem[] = []
  let error: string | null = null
  let stats: { classifications: number; groups: number; events: number } | undefined = undefined
  let isApiUnavailable = false

  if (process.env.NODE_ENV !== 'production') {
    console.log('[ActivitiesPage] Starting fetch:', { locale, lang })
  }

  try {
    // Build absolute URL for Server Component fetch
    // During build, avoid fetching if no base URL is configured
    const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || ''
    
    // If no base URL and we're in build phase, skip fetch
    if (!envBase && process.env.NEXT_PHASE === 'phase-production-build') {
      isApiUnavailable = true
      if (process.env.NODE_ENV !== 'production') {
        console.log('[ActivitiesPage] Skipping fetch during build (no base URL configured)')
      }
    } else {
      const headersList = await import('next/headers').then((m) => m.headers)
      const hdrs = headersList()
      const host = hdrs.get('host') || 'localhost:3000'
      const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
      const origin = envBase ? envBase : `${protocol}://${host}`

      const fetchUrl = `${origin}/api/atlantico/sync?lang=${lang}`
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('[ActivitiesPage] Fetching from:', { fetchUrl, lang })
      }

      // Fetch from sync API with 6s timeout (cache only, no blocking)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000) // 6s timeout

      try {
        const response = await fetch(
          fetchUrl,
          {
            signal: controller.signal,
            cache: 'no-store', // Use no-store for dynamic pages
          }
        )

        clearTimeout(timeoutId)

        if (!response.ok) {
          // If 202 (warming), treat as unavailable but don't error
          if (response.status === 202) {
            isApiUnavailable = true
            if (process.env.NODE_ENV !== 'production') {
              console.log('[ActivitiesPage] API warming (202):', { lang, status: response.status })
            }
          } else {
            error = `HTTP ${response.status}: ${response.statusText}`
            if (process.env.NODE_ENV !== 'production') {
              console.error('[ActivitiesPage] HTTP error:', { lang, status: response.status, statusText: response.statusText })
            }
          }
      } else {
        const data = await response.json()
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('[ActivitiesPage] Response received:', {
            lang,
            success: data.success,
            itemsCount: data.items?.length || 0,
            cached: data.cached,
            warming: data.warming,
            stats: data.stats,
            responseKeys: Object.keys(data),
          })
        }
        
        if (data.success) {
          items = data.items || []
          stats = data.stats
          
          if (process.env.NODE_ENV !== 'production') {
            console.log('[ActivitiesPage] Items loaded:', {
              itemsLength: items.length,
              firstItemKeys: items.length > 0 ? Object.keys(items[0]) : [],
              firstItemSlug: items.length > 0 ? items[0].slug : null,
            })
          }
        } else if (data.warming) {
          // Cache warming in progress
          isApiUnavailable = true
          if (process.env.NODE_ENV !== 'production') {
            console.log('[ActivitiesPage] Cache warming:', { lang })
          }
        } else {
          error = data.error || 'Failed to sync catalog'
          if (process.env.NODE_ENV !== 'production') {
            console.error('[ActivitiesPage] Sync failed:', { lang, error })
          }
        }
      }
    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      // Timeout or network error - treat as API unavailable
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        isApiUnavailable = true
        if (process.env.NODE_ENV !== 'production') {
          console.log('[ActivitiesPage] Fetch timeout (6s):', { lang })
        }
      } else {
        error = fetchError instanceof Error ? fetchError.message : 'Unknown error occurred'
        if (process.env.NODE_ENV !== 'production') {
          console.error('[ActivitiesPage] Fetch error:', { lang, error })
        }
      }
    }
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unknown error occurred'
    console.error('[ActivitiesPage] Error fetching sync:', err)
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[ActivitiesPage] Final state:', {
      itemsLength: items.length,
      hasError: !!error,
      isApiUnavailable,
      stats,
    })
  }

  return (
    <div className="min-h-screen bg-glass-50 py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-glass-900 mb-2">
            {t('title')}
          </h1>
          <p className="text-glass-600">
            {error
              ? t('unableToLoad')
              : items.length > 0
                ? stats
                  ? t('showingCountWithStats', { count: items.length, classifications: stats.classifications, groups: stats.groups, events: stats.events })
                  : t('showingCount', { count: items.length })
                : t('noActivitiesAvailable')}
          </p>
        </div>

        {/* API Unavailable Message */}
        {isApiUnavailable && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm mb-3">
              <strong>{t('apiUnavailableTitle')}</strong> {t('apiUnavailableDesc')}
            </p>
            <a
              href={`/api/atlantico/sync?lang=${lang}&full=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-ocean-600 text-white text-sm font-medium rounded-lg hover:bg-ocean-700 transition-colors"
            >
              {t('manualSync')}
            </a>
          </div>
        )}

        {/* Error Message */}
        {error && !isApiUnavailable && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        {/* Activities Grid */}
        {items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <ActivityCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-glass-500 text-lg">{t('noActivitiesFound')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

