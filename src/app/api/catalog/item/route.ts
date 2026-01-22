/**
 * GET /api/catalog/item
 * 
 * Returns a single catalog item by id or slug.
 * Lightweight endpoint for detail pages.
 * 
 * Query parameters:
 * - id: Tour ID
 * - slug: Tour slug
 * - lang: Language (optional)
 * - merged: Merge with curation (0 or 1, default: 0)
 * - includeRaw: Include raw data (0 or 1, default: 0)
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { join } from 'path'
import { readJsonFile } from '@/lib/cache/jsonFile'
import { evaluateTourQuality } from '@/lib/atlantico/quality'
import type { FullCatalog, FullTour, CoreCatalog, DynamicCatalog, FullEvent } from '@/lib/atlantico/catalog-types'
import { getAtlanticoConfig } from '@/lib/atlantico/config'
import { fetchAtlantico } from '@/lib/atlantico/fetch'
import { extractCoverImage, extractImageUrls } from '@/lib/atlantico/images'
import { getFallbackImageForTour } from '@/lib/images/fallback'
import { assignVibeId } from '@/lib/vibes/assignVibe'
import type { AtlanticoEventDetails } from '@/lib/atlantico/mappers'

// Cache files (new split structure)
const CORE_CACHE_FILE = join(process.cwd(), 'data', 'atlantico_catalog_core.json')
const DYNAMIC_CACHE_FILE = join(process.cwd(), 'data', 'atlantico_catalog_dynamic.json')
// Legacy fallback
const FULL_CACHE_FILE = join(process.cwd(), 'data', 'atlantico_full_catalog.json')
const CURATION_FILE = join(process.cwd(), 'data', 'curation.json')

/**
 * Normalize Atlantico eventDetails to FullTour format
 */
async function normalizeEventDetailsToFullTour(
  eventDetails: AtlanticoEventDetails,
  lang: string
): Promise<FullTour> {
  const code = eventDetails.code || (eventDetails as any).id || ''
  const id = String(code || 'unknown')
  const slug = String(code || id)

  // Extract price
  let price = 0
  if (typeof (eventDetails as any).priceA === 'number' && (eventDetails as any).priceA > 0) {
    price = (eventDetails as any).priceA
  } else if (typeof (eventDetails as any).priceS === 'number' && (eventDetails as any).priceS > 0) {
    price = (eventDetails as any).priceS
  } else if (typeof (eventDetails as any).priceC === 'number' && (eventDetails as any).priceC > 0) {
    price = (eventDetails as any).priceC
  } else if (typeof (eventDetails as any).price === 'number' && (eventDetails as any).price > 0) {
    price = (eventDetails as any).price
  }

  // Extract images
  const extractedCoverImage = extractCoverImage(eventDetails)
  const extractedImages = extractImageUrls(eventDetails)
  const fallbackImage = getFallbackImageForTour({
    vibeId: (eventDetails as any).vibeId || null,
    groupCode: null,
    code,
    slug,
    title: eventDetails.name || eventDetails.title || '',
    description: (eventDetails as any).desc || (eventDetails as any).description || '',
    shortDescription: (eventDetails as any).shortDesc || (eventDetails as any).shortDescription || '',
  })
  const coverImage = extractedCoverImage || fallbackImage
  const images = extractedImages.length > 0 ? extractedImages : [fallbackImage]

  // Assign vibe ID
  const assignedVibeId = assignVibeId(eventDetails)

  // Create a single event from eventDetails
  const event: FullEvent = {
    id: code,
    code: code,
    title: eventDetails.name || eventDetails.title || '',
    price: price > 0 ? {
      adult: price,
      child: null,
      infant: null,
      date: new Date().toISOString().split('T')[0], // Required by EventPrice type
    } : undefined,
    availability: undefined,
    raw: eventDetails,
  }

  return {
    id,
    slug,
    title: eventDetails.name || eventDetails.title || '',
    displayTitle: eventDetails.name || eventDetails.title || '',
    description: (eventDetails as any).desc || (eventDetails as any).description || '',
    displayDescription: (eventDetails as any).desc || (eventDetails as any).description || '',
    shortDescription: (eventDetails as any).shortDesc || (eventDetails as any).shortDescription || '',
    duration: (eventDetails as any).duration || null,
    basePrice: price > 0 ? price : null,
    currency: (eventDetails as any).currency || 'EUR',
    image: coverImage,
    displayImage: coverImage,
    imageUrl: coverImage,
    imageUrls: images,
    events: [event],
    raw: eventDetails,
    vibe_id: assignedVibeId,
    enabled: true,
    featured: false,
    priority: 0,
  } as FullTour
}

/**
 * Fetch item directly from Atlantico API by ID
 */
async function fetchItemFromAtlantico(id: string, lang: string): Promise<FullTour | null> {
  try {
    const config = getAtlanticoConfig()
    if (!config.isValid) {
      return null
    }

    // Fetch eventDetails from Atlantico API
    const response = await fetchAtlantico(
      `/eventDetails/${id}/${lang}`,
      { revalidate: 0 } // No cache during debug
    )

    if (!response.ok) {
      return null
    }

    const eventDetails: AtlanticoEventDetails = await response.json()
    return await normalizeEventDetailsToFullTour(eventDetails, lang)
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[CATALOG_ITEM] Fetch from Atlantico failed:', error)
    }
    return null
  }
}

/**
 * Find item by id or slug, assembling core + dynamic if needed
 * If not found in cache and id is provided, try fetching directly from Atlantico API
 */
async function findItem(
  id?: string | null,
  slug?: string | null,
  lang?: string | null
): Promise<FullTour | null> {
  // Try new split structure first
  const coreCatalog = await readJsonFile<CoreCatalog>(CORE_CACHE_FILE)
  const dynamicCatalog = await readJsonFile<DynamicCatalog>(DYNAMIC_CACHE_FILE)

  if (coreCatalog && dynamicCatalog) {
    // Find in core
    const coreTour = coreCatalog.items.find((t) => (id && t.id === id) || (slug && (t.slug === slug || t.id === slug)))
    if (coreTour) {
      // Merge with dynamic data
      const dynamicData = dynamicCatalog.data[coreTour.id] || {}
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
    }
  }

  // Fallback to legacy full cache
  const legacyCatalog = await readJsonFile<FullCatalog>(FULL_CACHE_FILE)
  if (legacyCatalog) {
    const tour = legacyCatalog.items.find((t) => (id && t.id === id) || (slug && (t.slug === slug || t.id === slug)))
    if (tour) {
      return tour
    }
  }

  // If not found in cache and id is provided, try fetching directly from Atlantico API
  if (id && lang) {
    return await fetchItemFromAtlantico(id, lang)
  }

  return null
}

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const id = searchParams.get('id')
    const slug = searchParams.get('slug')
    const langFilter = searchParams.get('lang') || 'ENG' // Default to ENG if not provided
    const mergedParam = searchParams.get('merged')
    const includeRawParam = searchParams.get('includeRaw')
    const modeParam = searchParams.get('mode') || 'full' // 'full' | 'sellable'

    if (!id && !slug) {
      return NextResponse.json(
        { error: 'Invalid parameters', message: 'id or slug is required' },
        { status: 400 }
      )
    }

    // DEV: Log request
    if (process.env.NODE_ENV === 'development') {
      const endpointProvider = id ? 'atlantico_api' : 'cache'
      console.log('[CATALOG_ITEM]', {
        id: id || 'NOT_SET',
        slug: slug || 'NOT_SET',
        lang: langFilter,
        endpointProvider,
      })
    }

    // Find item (assembles core + dynamic if needed, or fetches from Atlantico API if id provided)
    let item = await findItem(id, slug, langFilter)

    if (!item) {
      // DEV: Log failure
      if (process.env.NODE_ENV === 'development') {
        console.log('[CATALOG_ITEM_FAIL]', {
          id: id || 'NOT_SET',
          slug: slug || 'NOT_SET',
          status: 404,
          message: 'Item not found in catalog or API',
        })
      }
      return NextResponse.json(
        { error: 'Not found', message: 'Item not found in catalog' },
        { status: 404 }
      )
    }

    // DEV: Log success
    if (process.env.NODE_ENV === 'development') {
      const imagesCount = item.imageUrls?.length || (item.image ? 1 : 0)
      console.log('[CATALOG_ITEM_OK]', {
        id: item.id,
        slug: item.slug,
        title: item.title || item.displayTitle || 'NO_TITLE',
        price: item.basePrice || 'NO_PRICE',
        imagesCount,
      })
    }

    // Get language from core or dynamic catalog for validation
    const coreCatalog = await readJsonFile<CoreCatalog>(CORE_CACHE_FILE)
    const dynamicCatalog = await readJsonFile<DynamicCatalog>(DYNAMIC_CACHE_FILE)
    const legacyCatalog = await readJsonFile<FullCatalog>(FULL_CACHE_FILE)
    const catalogLanguage = coreCatalog?.language || dynamicCatalog?.language || legacyCatalog?.language

    // Filter by language if requested
    if (langFilter && catalogLanguage && catalogLanguage !== langFilter) {
      return NextResponse.json(
        {
          error: 'Language mismatch',
          message: `Catalog is for language ${catalogLanguage}, requested ${langFilter}`,
        },
        { status: 400 }
      )
    }

    // Merge with curation if merged=1
    if (mergedParam === '1') {
      const curation = await readCuration()
      const curationData = Object.values(curation).find(
        (c: any) => c && c.experience_id === item!.id
      ) as any

      if (curationData) {
        // Merge curation fields
        const imageOverrideUrl = curationData.imageOverrideUrl ?? null
        const titleOverride = curationData.titleOverride ?? null
        const shortDescriptionOverride = curationData.shortDescriptionOverride ?? null
        
        // Compute display fields (override takes priority)
        const displayTitle = titleOverride ?? item!.title
        const displayDescription = shortDescriptionOverride ?? item!.description
        const displayImage = imageOverrideUrl ?? item!.image ?? null
        
        item = {
          ...item,
          enabled: curationData.enabled ?? true,
          featured: curationData.featured ?? false,
          priority: curationData.priority ?? 0,
          vibe_id: curationData.vibe_id || null,
          // Override fields
          imageOverrideUrl,
          titleOverride,
          shortDescriptionOverride,
          // Display fields (computed)
          displayTitle,
          displayDescription,
          displayImage,
        }
      } else {
        // No curation data - use original values for display
        item = {
          ...item,
          enabled: true,
          featured: false,
          priority: 0,
          vibe_id: null,
          imageOverrideUrl: null,
          titleOverride: null,
          shortDescriptionOverride: null,
          displayTitle: item!.title,
          displayDescription: item!.description,
          displayImage: item!.image ?? null,
        }
      }
    }

    // Remove raw data if includeRaw=0
    if (includeRawParam === '0' || (!includeRawParam && process.env.NODE_ENV === 'production')) {
      const { raw, ...itemWithoutRaw } = item
      item = {
        ...itemWithoutRaw,
        events: item.events.map((event) => {
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
    }

    // Apply quality filter if mode=sellable
    if (modeParam === 'sellable') {
      const quality = evaluateTourQuality(item)
      if (!quality.sellable) {
        return NextResponse.json(
          {
            ok: false,
            reason: 'not_sellable',
            message: 'Item does not meet sellable quality criteria',
            ...(process.env.NODE_ENV === 'development'
              ? { quality: { sellable: false, reasons: quality.reasons } }
              : {}),
          },
          { status: 404 }
        )
      }
      // Add quality info in DEV only
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json(
          {
            ...item,
            quality: {
              sellable: true,
              reasons: quality.reasons,
            },
          },
          {
            headers: {
              'Cache-Control':
                process.env.NODE_ENV === 'development'
                  ? 'public, max-age=60, stale-while-revalidate=30'
                  : 'public, max-age=3600, stale-while-revalidate=600',
            },
          }
        )
      }
    }

    // Log served item (PROD minimal)
    if (process.env.NODE_ENV === 'production') {
      console.log('[CATALOG_ITEM_SERVED]', {
        id: item.id,
        mode: modeParam,
        lang: item.raw ? 'unknown' : 'from_cache',
      })
    }

    // Temporarily disable cache during debug
    const cacheControl = process.env.NODE_ENV === 'development'
      ? 'no-store, no-cache, must-revalidate'
      : 'public, max-age=120, stale-while-revalidate=30'

    return NextResponse.json(item, {
      headers: {
        'Cache-Control': cacheControl,
        // Note: Next.js handles gzip compression automatically via middleware
      },
    })
  } catch (error) {
    console.error('[CATALOG_ITEM] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to read catalog item',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

