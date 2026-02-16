/**
 * GET /api/catalog/full
 * 
 * Returns the full catalog from cache JSON file.
 * 
 * Query parameters:
 * - lang: Language filter (optional, doesn't change cache, only filters response)
 * - includeRaw: Include raw data if available (0 or 1, default: 0)
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { join } from 'path'
import { readJsonFile } from '@/lib/cache/jsonFile'
import { evaluateTourQuality } from '@/lib/atlantico/quality'
import type { FullCatalog, FullTour, CoreCatalog, DynamicCatalog, FullEvent } from '@/lib/atlantico/catalog-types'

// Mark route as dynamic (uses searchParams)
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Cache files (new split structure)
const CORE_CACHE_FILE = join(process.cwd(), 'data', 'atlantico_catalog_core.json')
const DYNAMIC_CACHE_FILE = join(process.cwd(), 'data', 'atlantico_catalog_dynamic.json')
// Legacy fallback
const FULL_CACHE_FILE = join(process.cwd(), 'data', 'atlantico_full_catalog.json')
const CURATION_FILE = join(process.cwd(), 'data', 'curation.json')

/**
 * Read curation data
 */
async function readCuration(): Promise<Record<string, any>> {
  try {
    const curation = await readJsonFile<Record<string, any>>(CURATION_FILE)
    return curation || {}
  } catch {
    return {}
  }
}

/**
 * Apply thin mode: remove heavy data
 * thin=1: legacy mode (keep 7 days of sessions)
 * thin=smart: minimal mode (only nextAvailableDate and minPrice)
 */
function applyThinMode(catalog: FullCatalog, mode: '1' | 'smart' = '1'): FullCatalog {
  if (mode === 'smart') {
    return applySmartThinMode(catalog)
  }

  // Legacy thin=1 mode
  const today = new Date()
  const sevenDaysLater = new Date(today)
  sevenDaysLater.setDate(today.getDate() + 7)

  return {
    ...catalog,
    items: catalog.items.map((tour) => ({
      ...tour,
      raw: undefined,
      events: tour.events.map((event) => {
        const { raw, ...eventWithoutRaw } = event
        let availability = event.availability

        // Keep only next 7 days of sessions
        if (availability && availability.sessionsByDate) {
          const filteredSessions: Record<string, any[]> = {}
          for (const [dateStr, sessions] of Object.entries(availability.sessionsByDate)) {
            const date = new Date(dateStr)
            if (date >= today && date <= sevenDaysLater) {
              filteredSessions[dateStr] = sessions
            }
          }
          availability = {
            ...availability,
            sessionsByDate: filteredSessions,
            raw: undefined,
          }
        }

        return {
          ...eventWithoutRaw,
          price: event.price
            ? {
                ...event.price,
                raw: undefined,
              }
            : undefined,
          availability,
        }
      }),
    })),
  }
}

/**
 * Apply smart thin mode: minimal data (nextAvailableDate + minPrice only)
 */
function applySmartThinMode(catalog: FullCatalog): FullCatalog {
  const { pickNextAvailableDateFromLimits } = require('@/lib/atlantico/limits')

  return {
    ...catalog,
    items: catalog.items.map((tour) => ({
      ...tour,
      raw: undefined,
      events: tour.events.map((event) => {
        const { raw, ...eventWithoutRaw } = event

        // Compute minPrice from event.price or sessions
        let minPrice: number | null = null
        if (event.price?.adult && event.price.adult > 0) {
          minPrice = event.price.adult
        }
        if (event.availability?.sessionsByDate) {
          for (const sessions of Object.values(event.availability.sessionsByDate)) {
            if (Array.isArray(sessions)) {
              for (const session of sessions) {
                if (session.price && session.price > 0) {
                  if (minPrice === null || session.price < minPrice) {
                    minPrice = session.price
                  }
                }
              }
            }
          }
        }

        // Compute nextAvailableDate from availability
        let nextAvailableDate: string | null = null
        if (event.availability) {
          nextAvailableDate = pickNextAvailableDateFromLimits(
            event.availability.raw || event.availability,
            event.availability.month
          )
        }

        // Return minimal event data (smart mode)
        // Note: We use 'any' for availability in smart mode since it's a simplified structure
        const smartEvent: any = {
          ...eventWithoutRaw,
        }

        if (minPrice !== null) {
          smartEvent.price = {
            date: event.price?.date || new Date().toISOString().substring(0, 10),
            adult: minPrice,
            child: undefined,
            infant: undefined,
          }
        }

        if (nextAvailableDate) {
          smartEvent.availability = {
            month: event.availability?.month || '',
            nextAvailableDate,
            // sessionsByDate removed in smart mode
          }
        }

        return smartEvent
      }),
    })),
  }
}

/**
 * Assemble core + dynamic into FullCatalog
 */
async function assembleCatalog(): Promise<FullCatalog | null> {
  // Try new split structure first
  const coreCatalog = await readJsonFile<CoreCatalog>(CORE_CACHE_FILE)
  const dynamicCatalog = await readJsonFile<DynamicCatalog>(DYNAMIC_CACHE_FILE)

  if (coreCatalog && dynamicCatalog) {
    // Merge core + dynamic
    const mergedItems: FullTour[] = coreCatalog.items.map((coreTour) => {
      const dynamicData = dynamicCatalog.data[coreTour.id] || {}
      
      // Merge events with dynamic data
      const mergedEvents: FullEvent[] = coreTour.events.map((coreEvent) => {
        const dynamicEvent = dynamicData[coreEvent.id]
        if (dynamicEvent) {
          return {
            ...coreEvent,
            price: dynamicEvent.price,
            availability: dynamicEvent.availability,
          } as FullEvent
        }
        return coreEvent as FullEvent
      })

      return {
        ...coreTour,
        events: mergedEvents,
      } as FullTour
    })

    return {
      updatedAt: dynamicCatalog.updatedAt, // Use most recent timestamp
      language: coreCatalog.language,
      itemCount: mergedItems.length,
      items: mergedItems,
    }
  }

  // Fallback to legacy full cache
  const legacyCatalog = await readJsonFile<FullCatalog>(FULL_CACHE_FILE)
  return legacyCatalog
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const langFilter = searchParams.get('lang')
    const includeRawParam = searchParams.get('includeRaw')
    const mergedParam = searchParams.get('merged')
    const includeDisabledParam = searchParams.get('includeDisabled')
    const thinParam = searchParams.get('thin')
    const modeParam = searchParams.get('mode') || 'full' // 'full' | 'sellable'
    const vibeParam = searchParams.get('vibe') // 'tours-vip' | null

    // Assemble catalog from core + dynamic (or fallback to legacy)
    const catalog = await assembleCatalog()

    if (!catalog) {
      return NextResponse.json(
        {
          error: 'Cache missing',
          message: 'Catalog cache not found. Call POST /api/catalog/refresh to generate it.',
        },
        { status: 404 }
      )
    }

    // Filter by language if requested
    let filteredCatalog = catalog
    if (langFilter && catalog.language !== langFilter) {
      // If language doesn't match, return empty (cache is for one language)
      filteredCatalog = {
        ...catalog,
        items: [],
        itemCount: 0,
      }
    }

    // Merge with curation if merged=1
    if (mergedParam === '1') {
      const curation = await readCuration()
      const curationMap: Record<string, any> = {}
      Object.values(curation).forEach((item: any) => {
        if (item && item.experience_id) {
          curationMap[item.experience_id] = item
        }
      })

      filteredCatalog = {
        ...filteredCatalog,
        items: filteredCatalog.items.map((tour) => {
          const curationData = curationMap[tour.id]
          // Merge curation fields
          const imageOverrideUrl = curationData?.imageOverrideUrl ?? null
          const titleOverride = curationData?.titleOverride ?? null
          const shortDescriptionOverride = curationData?.shortDescriptionOverride ?? null
          
          // Compute display fields (override takes priority)
          const displayTitle = titleOverride ?? tour.title
          const displayDescription = shortDescriptionOverride ?? tour.description
          const displayImage = imageOverrideUrl ?? tour.image ?? null
          
          return {
            ...tour,
            enabled: curationData?.enabled ?? true,
            featured: curationData?.featured ?? false,
            priority: curationData?.priority ?? 0,
            vibe_id: curationData?.vibe_id || null,
            // Override fields
            imageOverrideUrl,
            titleOverride,
            shortDescriptionOverride,
            // Display fields (computed)
            displayTitle,
            displayDescription,
            displayImage,
          }
        }),
      }

      // Filter disabled items if includeDisabled=0 (default)
      if (includeDisabledParam !== '1') {
        filteredCatalog = {
          ...filteredCatalog,
          items: filteredCatalog.items.filter((tour) => tour.enabled !== false),
        }
      }

      // Sort: priority DESC, featured DESC, title ASC
      filteredCatalog.items.sort((a, b) => {
        // Priority DESC
        if ((b.priority || 0) !== (a.priority || 0)) {
          return (b.priority || 0) - (a.priority || 0)
        }
        // Featured DESC
        if (b.featured !== a.featured) {
          return b.featured ? 1 : -1
        }
        // Title ASC
        return a.title.localeCompare(b.title)
      })

      filteredCatalog.itemCount = filteredCatalog.items.length
    }

    // Filter by vibe if provided (MANUAL CURATION ONLY - no automatic detection)
    // vibe=vip-tours means vibe_id="1" in curation (vip-tours has id "1")
    if (vibeParam === 'vip-tours' || vibeParam === 'tours-vip') {
      // REQUIRED: merged=1 must be set to use vibe filter (vibe_id comes from curation)
      if (mergedParam !== '1') {
        return NextResponse.json(
          {
            error: 'Invalid parameters',
            message: 'vibe filter requires merged=1 (vibe_id comes from curation)',
          },
          { status: 400 }
        )
      }

      // Filter ONLY items with vibe_id="1" (vip-tours) from curation
      // No automatic detection - explicit curation only
      filteredCatalog = {
        ...filteredCatalog,
        items: filteredCatalog.items.filter((tour) => {
          // Only include if explicitly set to vibe_id="1" in curation AND enabled
          return tour.vibe_id === '1' && tour.enabled !== false
        }),
      }
      filteredCatalog.itemCount = filteredCatalog.items.length

      // DEV log if ATLANTICO_DEBUG=1
      if (process.env.ATLANTICO_DEBUG === '1') {
        console.log('[CATALOG_VIP_FILTER_MANUAL]', {
          totalBefore: catalog.items.length,
          vipCount: filteredCatalog.items.length,
          sampleIds: filteredCatalog.items.slice(0, 5).map((t) => t.id),
          message: 'VIP tours from curation only (vibe_id="1")',
        })
      }
    }

    // Remove raw data if includeRaw=0
    if (includeRawParam === '0' || (!includeRawParam && process.env.NODE_ENV === 'production')) {
      filteredCatalog = {
        ...filteredCatalog,
        items: filteredCatalog.items.map((tour) => {
          const { raw, ...tourWithoutRaw } = tour
          return {
            ...tourWithoutRaw,
            events: tour.events.map((event) => {
              const { raw: eventRaw, rawError, ...eventWithoutRaw } = event
              return {
                ...eventWithoutRaw,
                price: event.price
                  ? {
                      ...event.price,
                      raw: undefined,
                    }
                  : undefined,
                availability: event.availability
                  ? {
                      ...event.availability,
                      raw: undefined,
                    }
                  : undefined,
              }
            }),
          }
        }),
      }
    }

    // Apply thin mode if thin=1
    if (thinParam === '1') {
      filteredCatalog = applyThinMode(filteredCatalog)
    }

    // Apply quality filter if mode=sellable
    if (modeParam === 'sellable') {
      const sellableItems: FullTour[] = []
      const qualityMap: Record<string, any> = {}

      for (const tour of filteredCatalog.items) {
        const quality = evaluateTourQuality(tour)
        if (quality.sellable) {
          sellableItems.push(tour)
          // Add quality info in DEV only
          if (process.env.NODE_ENV === 'development') {
            qualityMap[tour.id] = {
              sellable: true,
              reasons: quality.reasons,
            }
          }
        } else if (process.env.NODE_ENV === 'development') {
          qualityMap[tour.id] = {
            sellable: false,
            reasons: quality.reasons,
          }
        }
      }

      filteredCatalog = {
        ...filteredCatalog,
        items: sellableItems,
        itemCount: sellableItems.length,
        ...(process.env.NODE_ENV === 'development' && Object.keys(qualityMap).length > 0
          ? { quality: qualityMap }
          : {}),
      }
    }

    // Log served catalog (PROD minimal)
    if (process.env.NODE_ENV === 'production') {
      console.log('[CATALOG_SERVED]', {
        mode: modeParam,
        thin: thinParam || 'none',
        items: filteredCatalog.itemCount,
        lang: filteredCatalog.language,
      })
    }

    return NextResponse.json(filteredCatalog, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
        // Note: Next.js handles gzip compression automatically via middleware
        // No need to set Content-Encoding manually
      },
    })
  } catch (error) {
    console.error('[CATALOG_FULL] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to read catalog',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

