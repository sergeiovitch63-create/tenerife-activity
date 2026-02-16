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
import { extractCoverImage, extractImageUrls } from '@/lib/atlantico/images'
import { atlanticoAssetUrl } from '@/lib/atlantico/assets'
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
  image?: string | null // Image URL for this event
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
        groupDetailsImage: groupDetails?.image,
      })
    }

    // SPECIAL CASE: Event 303 - Use local images from /images/events/303/
    if (item.groupCode === '303' || slug === '303') {
      // Use A.webp as hero (main image)
      heroImageUrl = '/images/events/303/A.webp'
      if (process.env.NODE_ENV === 'development') {
        console.log('[ACTIVITY_303] Using local hero image:', heroImageUrl)
      }
    } else {
      // Extract image from groupDetails according to PDF Atlantico API
      // Priority:
      // 1) groupDetails.images[0] when it's a full URL (e.g. https://www.atlanticoexcursiones.com/zeus/pictures/GRP303/B.jpg)
      // 2) groupDetails.image (filename) resolved via Atlantico image base
      // 3) item.image (local classification-based fallback)
      let resolvedHero: string | null = null

      // 1) Use first entry of groupDetails.images if it's an absolute URL
      const rawImages = (groupDetails as any)?.images
      if (Array.isArray(rawImages) && rawImages.length > 0) {
        const firstImg = String(rawImages[0]).trim()
        if (firstImg.startsWith('http://') || firstImg.startsWith('https://')) {
          resolvedHero = firstImg
        }
      }

      // 2) If no full URL from images[], use groupDetails.image (filename)
      if (!resolvedHero && groupDetails?.image && typeof groupDetails.image === 'string' && groupDetails.image.trim()) {
        const imageFilename = groupDetails.image.trim()
        const { getLocalAtlanticoImageUrl, buildAtlanticoImageUrlFromFilename } = await import('@/lib/atlantico/images')
        const localImageUrl = await getLocalAtlanticoImageUrl(imageFilename)
        resolvedHero = localImageUrl || buildAtlanticoImageUrlFromFilename(imageFilename)
      }

      // 3) Fallback to item.image or generic hero image
      heroImageUrl = resolvedHero || item.image || '/images/hero-poster.jpg'
    }

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

        // Extract image from eventDetails according to PDF Atlantico API
        // Download and use local images for better performance
        let eventImage: string | null = null
        
        // Extract image using extractCoverImage - this returns full URL or filename
        const extractedImage = extractCoverImage(details as any)
        
        if (extractedImage) {
          // If it's already a full URL, try to extract filename and download locally
          if (extractedImage.startsWith('http://') || extractedImage.startsWith('https://')) {
            // Extract filename from URL
            const urlParts = extractedImage.split('/')
            const filename = urlParts[urlParts.length - 1]
            if (filename && /\.(jpg|jpeg|png|webp)$/i.test(filename)) {
              // Try to download locally
              const { getLocalAtlanticoImageUrl } = await import('@/lib/atlantico/images')
              eventImage = await getLocalAtlanticoImageUrl(filename) || extractedImage
            } else {
              eventImage = extractedImage
            }
          } else {
            // It's a filename, download locally
            const { getLocalAtlanticoImageUrl } = await import('@/lib/atlantico/images')
            eventImage = await getLocalAtlanticoImageUrl(extractedImage) || extractedImage
          }
        } else {
          // Fallback: try direct fields and download locally
          const { getLocalAtlanticoImageUrl } = await import('@/lib/atlantico/images')
          const imageFields = ['image', 'imageUrl', 'imageFilename', 'img', 'photo', 'picture', 'cover']
          for (const field of imageFields) {
            const value = (details as any)[field]
            if (value && typeof value === 'string' && value.trim()) {
              const trimmed = value.trim()
              // If already full URL, try to extract filename
              if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                const urlParts = trimmed.split('/')
                const filename = urlParts[urlParts.length - 1]
                if (filename && /\.(jpg|jpeg|png|webp)$/i.test(filename)) {
                  eventImage = await getLocalAtlanticoImageUrl(filename) || trimmed
                } else {
                  eventImage = trimmed
                }
                break
              }
              // Otherwise it's a filename, download locally
              eventImage = await getLocalAtlanticoImageUrl(trimmed)
              if (eventImage) break
            }
          }
        }

        options.push({
          eventId: String(eventCode), // Use CODE, not internal id
          label: name,
          pProd,
          icons,
          image: eventImage, // Add resolved image URL
        })

        if (process.env.NODE_ENV === 'development') {
          console.log('[ATL_ACTIVITY_DEBUG] eventDetails', {
            eventIdFromGroup,
            eventCode,
            internalId: (details as any).id,
            name,
            pProd,
            image: eventImage,
            extractedImage,
            imageFields: {
              image: (details as any).image,
              imageUrl: (details as any).imageUrl,
              imageFilename: (details as any).imageFilename,
              img: (details as any).img,
              photo: (details as any).photo,
              picture: (details as any).picture,
              cover: (details as any).cover,
            },
            allKeys: Object.keys(details || {}),
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


