/**
 * GET /api/debug/normalize-sample
 * 
 * DEV-only endpoint that tests normalization on a single tour.
 * Calls hydrateFullCatalog with maxGroups=1, maxEventsPerGroup=1, includeRaw=1
 * Returns before/after normalization diff for: title/image/basePrice/times
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { hydrateFullCatalog } from '@/lib/atlantico/hydration'
import { normalizeTour, normalizeEvent } from '@/lib/atlantico/quality'
import type { FullTour, FullEvent } from '@/lib/atlantico/catalog-types'

export async function GET(request: NextRequest) {
  // DEV only
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const { searchParams } = request.nextUrl
    const lang = searchParams.get('lang') || 'ENG'

    // Hydrate a single tour with minimal events (full mode)
    const catalog = await hydrateFullCatalog({
      language: lang,
      maxGroups: 1,
      maxEventsPerGroup: 1,
      includeRaw: true,
      mode: 'full',
    })

    // Type guard: only FullCatalog has items
    if (!catalog || !('items' in catalog) || catalog.items.length === 0) {
      return NextResponse.json({
        error: 'No tour found',
        message: 'Hydration returned no items. Check Atlantico API connection.',
      })
    }

    const tour = catalog.items[0]
    const event = tour.events.length > 0 ? tour.events[0] : null

    // Build before normalization (reconstruct what it was before normalize)
    // Note: Since normalize is already applied, we'll show the normalized result
    // and simulate a before state by showing raw data
    const beforeTour: Partial<FullTour> = {
      title: tour.raw?.groupDetails?.name || tour.raw?.groupList?.name || tour.title,
      description: tour.raw?.groupDetails?.desc || tour.raw?.groupDetails?.description || tour.description,
      image: tour.raw?.groupDetails?.image || tour.raw?.groupList?.image || tour.image,
      basePrice: tour.basePrice,
      duration: tour.raw?.groupDetails?.duration || tour.duration,
      currency: tour.currency,
    }

    const afterTour: Partial<FullTour> = {
      title: tour.title,
      description: tour.description,
      image: tour.image,
      basePrice: tour.basePrice,
      duration: tour.duration,
      currency: tour.currency,
    }

    // Event diff if available
    let eventDiff: any = null
    if (event) {
      const beforeEvent: Partial<FullEvent> = {
        title: event.raw?.name || event.raw?.title || event.title,
        times: event.raw?.times || event.times,
        days: event.raw?.days || event.days,
      }

      const afterEvent: Partial<FullEvent> = {
        title: event.title,
        times: event.times,
        days: event.days,
      }

      eventDiff = {
        before: beforeEvent,
        after: afterEvent,
      }
    }

    // Calculate computed fields
    const computedFields = {
      basePriceCalculated: tour.basePrice !== null && tour.basePrice !== undefined && tour.basePrice > 0 ? '✓' : '✗',
      imageUrlComplete: tour.image && tour.image.startsWith('http') ? '✓' : '✗',
      titleSanitized: tour.title && !tour.title.includes('<') ? '✓' : '✗',
      descriptionSanitized: tour.description && !tour.description.includes('<') ? '✓' : '✗',
      timesNormalized: event?.times && Array.isArray(event.times) && event.times.length > 0 ? '✓' : '✗',
    }

    return NextResponse.json({
      success: true,
      tourId: tour.id,
      tourSlug: tour.slug,
      language: catalog.language,
      diff: {
        tour: {
          before: beforeTour,
          after: afterTour,
        },
        event: eventDiff,
      },
      computedFields,
      raw: {
        groupDetails: tour.raw?.groupDetails,
        groupList: tour.raw?.groupList,
        eventRaw: event?.raw,
      },
      normalized: {
        tour: {
          title: tour.title,
          description: tour.description?.substring(0, 100) + (tour.description?.length > 100 ? '...' : ''),
          image: tour.image,
          basePrice: tour.basePrice,
          currency: tour.currency,
          duration: tour.duration,
        },
        event: event ? {
          title: event.title,
          times: event.times,
          days: event.days,
        } : null,
      },
    })
  } catch (error) {
    console.error('[NORMALIZE_SAMPLE] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate normalization sample',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

