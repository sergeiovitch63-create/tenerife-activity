/**
 * Activity Detail Page
 * 
 * Uses EXACT PDF pipeline data from sync API.
 * Displays activity details with tabs, calendar, prices, and booking form.
 * 
 * NO INVENT: Only uses data from API. No hardcoded activities.
 */

import { notFound } from 'next/navigation'
import { ActivityDetailClient } from './ActivityDetailClient'
import type { NormalizedCatalogItem } from '@/lib/atlantico/sync-catalog'
import {
  addDays,
  getEventDetails,
  getEventPrices,
  getGroupDetails,
  getTodayDate,
  parseEventIds,
  type GroupDetailsResponse,
} from '@/lib/atlantico'
import { mapLocaleToAtlanticoLang } from '@/lib/atlantico/lang'

/**
 * Map locale to Atlántico language code
 * IMPORTANT: Use proper mapping (CAS/ENG/FRA/RUS/ALE/ITA) for loadLimits/loadPrices
 */
function mapLocaleToLang(locale: string): string {
  // Use the proper mapping function that returns CAS/ENG/FRA/RUS/ALE/ITA
  return mapLocaleToAtlanticoLang(locale)
}

/**
 * Fetch activity by slug from sync API
 */
async function fetchActivityBySlug(slug: string, lang: string): Promise<NormalizedCatalogItem | null> {
  try {
    const headersList = await import('next/headers').then((m) => m.headers)
    const hdrs = headersList()
    const host = hdrs.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || ''
    const origin = envBase ? envBase : `${protocol}://${host}`

    // Fetch from sync API
    const response = await fetch(
      `${origin}/api/atlantico/sync?lang=${lang}`,
      {
        next: { revalidate: 21600 }, // 6 hours cache
      }
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    if (!data.success || !Array.isArray(data.items)) {
      return null
    }

    // Find item by slug
    const item = data.items.find((item: NormalizedCatalogItem) => item.slug === slug)
    return item || null
  } catch (error) {
    console.error('[ActivityDetailPage] Error fetching activity:', error)
    return null
  }
}

/**
 * Fetch group details for additional info
 */
function parseGroupBasePrice(group: GroupDetailsResponse | null): number | null {
  if (!group) return null
  const raw = group.price
  if (raw === undefined || raw === null) return null
  const n = typeof raw === 'number' ? raw : Number.parseFloat(String(raw))
  return Number.isFinite(n) && n > 0 ? n : null
}

type EventOption = {
  eventId: string
  label: string
  pProd?: '0' | '1' | '2' | '3'
  icons?: string[]
}

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params

  // Guard: if slug looks like an image filename, this is not a valid activity
  if (/\.(png|jpe?g|webp|avif)$/i.test(slug)) {
    notFound()
  }

  const lang = mapLocaleToLang(locale)

  // Fetch activity from sync API
  const item = await fetchActivityBySlug(slug, lang)

  if (!item) {
    notFound()
  }

  // Dynamic pricing (no-store) via Atlantico API
  let groupDetails: GroupDetailsResponse | null = null
  let eventOptions: EventOption[] = []
  let heroImageUrl: string | null = null

  try {
    groupDetails = await getGroupDetails(item.groupCode, lang)
    const rawIds = groupDetails?.ids
    const eventIds = parseEventIds(rawIds as any)

    if (process.env.NODE_ENV === 'development') {
      console.log('[ATL_ACTIVITY_DEBUG] groupDetails', {
        tourId: item.groupCode,
        rawIds,
        parsedEventIds: eventIds,
      })
    }

    // Use local image from item (based on classification mapping)
    // item.image is now a local path, guaranteed to be non-null
    // normalizeItem() ensures item.image is always set to a valid path
    heroImageUrl = item.image || '/images/hero-poster.jpg'

    // Build event options from eventDetails
    // IMPORTANT: Use CODE from eventDetails, not the internal id
    // groupDetails.ids contains event codes (e.g., "184,546") which are the CODE values
    const uniqueIds = Array.from(new Set(eventIds))
    const options: EventOption[] = []

    for (const eventIdFromGroup of uniqueIds) {
      try {
        const details = await getEventDetails(eventIdFromGroup, lang)
        
        // Extract CODE from eventDetails (this is what we must use for loadLimits/loadPrices)
        // eventDetails returns { id:"569", code:"184" } - we need the CODE (184)
        const eventCode = 
          (details as any).code || 
          (details as any).Code || 
          eventIdFromGroup // Fallback to original if code not found
        
        const name =
          (typeof details.name === 'string' && details.name) ||
          (typeof details.title === 'string' && details.title) ||
          eventCode
        const pProdRaw =
          details.pProd !== undefined && details.pProd !== null ? String(details.pProd).trim() : undefined
        const pProd: EventOption['pProd'] =
          pProdRaw === '0' || pProdRaw === '1' || pProdRaw === '2' || pProdRaw === '3' ? pProdRaw : undefined

        const icons =
          Array.isArray((details as any).icons)
            ? (details as any).icons.filter((x: any) => typeof x === 'string' && x.trim().length > 0).map((x: string) => x.trim())
            : undefined

        options.push({
          eventId: String(eventCode), // Use CODE, not internal id
          label: name,
          pProd,
          icons,
        })

        if (process.env.NODE_ENV === 'development') {
          console.log('[ATL_ACTIVITY_DEBUG] eventDetails', {
            eventIdFromGroup,
            eventCode,
            internalId: (details as any).id,
            name,
            pProd,
          })
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ATL_ACTIVITY_DEBUG] getEventDetails failed', { eventIdFromGroup, error })
        }
      }
    }

    eventOptions = options

    // DEV sanity check for first eventId: try loadPrices for today
    if (process.env.NODE_ENV === 'development' && uniqueIds.length > 0) {
      const firstId = uniqueIds[0]
      const office =
        process.env.ATLANTICO_COLLABORATOR?.trim() || process.env.ATLANTICO_OFFICE?.trim() || undefined
      const today = getTodayDate()
      const sanityDate = today

      try {
        const raw = await getEventPrices(firstId, sanityDate, office)
        console.log('[ATL_ACTIVITY_DEBUG] sanity loadPrices', {
          eventId: firstId,
          dateTried: sanityDate,
          office,
          raw,
        })
      } catch (error) {
        console.warn('[ATL_ACTIVITY_DEBUG] sanity loadPrices failed', {
          eventId: firstId,
          dateTried: sanityDate,
          error,
        })
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[ActivityDetailPage] getGroupDetails or eventOptions failed', {
        tourId: item.groupCode,
        error,
      })
    }
  }

  return (
    <ActivityDetailClient
      item={item}
      locale={locale}
      lang={lang}
      groupDetails={groupDetails}
      groupBasePrice={parseGroupBasePrice(groupDetails)}
      eventOptions={eventOptions}
      heroImageUrl={heroImageUrl}
    />
  )
}


