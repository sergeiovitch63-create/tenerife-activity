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
import { extractCoverImage, extractImageUrls } from '@/lib/atlantico/images.server'
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

// Mark page as dynamic (uses headers())
export const dynamic = 'force-dynamic'

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
    // During build, avoid fetching if no base URL is configured
    const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || ''
    
    // If no base URL and we're in build phase, return null
    if (!envBase && process.env.NEXT_PHASE === 'phase-production-build') {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[ActivityDetailPage] Skipping fetch during build (no base URL configured)')
      }
      return null
    }
    
    const headersList = await import('next/headers').then((m) => m.headers)
    const hdrs = headersList()
    const host = hdrs.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const origin = envBase ? envBase : `${protocol}://${host}`

    // Fetch from sync API
    const response = await fetch(
      `${origin}/api/atlantico/sync?lang=${lang}`,
      {
        cache: 'no-store', // Use no-store for dynamic pages
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
        const { getLocalAtlanticoImageUrl, buildAtlanticoImageUrlFromFilename } = await import('@/lib/atlantico/images.server')
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
              const { getLocalAtlanticoImageUrl } = await import('@/lib/atlantico/images.server')
              eventImage = await getLocalAtlanticoImageUrl(filename) || extractedImage
            } else {
              eventImage = extractedImage
            }
          } else {
            // It's a filename, download locally
            const { getLocalAtlanticoImageUrl } = await import('@/lib/atlantico/images.server')
            eventImage = await getLocalAtlanticoImageUrl(extractedImage) || extractedImage
          }
        } else {
          // Fallback: try direct fields and download locally
          const { getLocalAtlanticoImageUrl } = await import('@/lib/atlantico/images.server')
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

    // Group 216: keep only "From the South area" option
    // Group 326: remove Naviera Armas - From The South Area & Naviera Armas - From Puerto de la Cruz
    let finalOptions = options
    if (item.groupCode === '216') {
      const fromSouthArea = options.filter((opt) => (opt.label || '').trim() === 'from the south area')
      if (fromSouthArea.length > 0) finalOptions = fromSouthArea
    } else if (item.groupCode === '326') {
      const exclude = ['Naviera Armas - From The South Area', 'Naviera Armas - From Puerto de la Cruz']
      finalOptions = options.filter((opt) => !exclude.some((ex) => (opt.label || '').trim() === ex))
    } else if (item.groupCode === '11') {
      const fromSouthArea = options.filter((opt) => /From The South Area/i.test(opt.label || ''))
      if (fromSouthArea.length > 0) finalOptions = fromSouthArea
    } else if (item.groupCode === '78') {
      finalOptions = options.filter((opt) => !/with lunch included from the South/i.test(opt.label || ''))
    } else if (item.groupCode === '16') {
      const desdeZonaSur = options.filter((opt) => /Desde zona sur/i.test(opt.label || ''))
      if (desdeZonaSur.length > 0) finalOptions = desdeZonaSur
    } else if (item.groupCode === '319') {
      finalOptions = options.filter((opt) => !/^Los Tilos$/i.test((opt.label || '').trim()))
    } else if (item.groupCode === '322') {
      const exclude = [
        'Visite nocturne VIP du Teide (personne supplémentaire)',
        'Visite nocturne VIP du Teide',
      ]
      finalOptions = options.filter((opt) => !exclude.some((ex) => (opt.label || '').trim() === ex))
    } else if (item.groupCode === '35') {
      const allowed = ['Spa Entrance', 'Spa Vip', 'Spa Resident', 'Spa Vip Resident']
      const filtered = options.filter((opt) =>
        allowed.some((a) => (opt.label || '').trim().toLowerCase() === a.toLowerCase())
      )
      if (filtered.length > 0) finalOptions = filtered
    } else if (item.groupCode === '330') {
      const allowed = ['Ticket', 'Entrada + Hamaca Residente', 'Adult > 65 years old']
      const filtered = options.filter((opt) =>
        allowed.some((a) => (opt.label || '').trim().toLowerCase() === a.toLowerCase())
      )
      if (filtered.length > 0) finalOptions = filtered
    } else if (item.groupCode === '362') {
      finalOptions = options.filter((opt) => (opt.label || '').trim().toLowerCase() !== 'entrada brunch')
    } else if (item.groupCode === '281') {
      const allowed = ['Astronomical Observation at El Teide']
      const filtered = options.filter((opt) =>
        allowed.some((a) => (opt.label || '').trim().toLowerCase() === a.toLowerCase())
      )
      if (filtered.length > 0) finalOptions = filtered
    } else if (item.groupCode === '134') {
      const allowed = [
        'Ticket (Guided tour)',
        'Ticket +Teide Tour from the South area',
        'Ticket + Teide Tour from Puerto de la Cruz',
      ]
      const filtered = options.filter((opt) =>
        allowed.some((a) => (opt.label || '').trim().toLowerCase() === a.toLowerCase())
      )
      if (filtered.length > 0) finalOptions = filtered
    } else if (item.groupCode === '165') {
      const exclude = [
        'Oferta Especial 4 días Nissan Micra o Fiat Panda por 89€',
        'Oferta Especial 3 días Nissan Micra o Fiat Panda por 79€',
        'Jeep Renegade',
      ]
      finalOptions = options.filter(
        (opt) => !exclude.some((ex) => (opt.label || '').trim().toLowerCase() === ex.toLowerCase())
      )
    } else if (item.groupCode === '166') {
      const exclude = [
        'Skoda Fabia Combi o similar',
        'VW T-CROSS o similar',
        'Renault Megane o similar',
        'Suzuki Vitara (SUV)',
        'FIAT 500 o similar',
        'Mercedes Vito AUT',
        'VW T-Rock Cabrio',
      ]
      finalOptions = options.filter(
        (opt) => !exclude.some((ex) => (opt.label || '').trim().toLowerCase() === ex.toLowerCase())
      )
    } else if (item.groupCode === '189') {
      const exclude = [
        'Grupo A - Honda PCX 125 cc',
        'Grupo B - Honda Forza 300 cc',
        'Grupo C - Suzuki Bourgman 400 cc',
        'Grupo D - Honda CB 125 F',
        'Grupo E - Honda CB 500 X',
      ]
      finalOptions = options.filter(
        (opt) => !exclude.some((ex) => (opt.label || '').trim().toLowerCase() === ex.toLowerCase())
      )
    } else if (item.groupCode === '127') {
      const exclude = [
        'Road Bike Carbono Disc Break',
        'Road Bike Aluminum',
        'E-City Bicicleta eléctrica',
        'E-City Bicicleta elécrtica',
        'Mountain Bike',
        'City Bike (from Periphery)',
        'Mountain Bike (from Periphery)',
        'Pro Mountain Bike (from Periphery)',
        'Road Bike (from Periphery)',
        'E-Mountain Bike Bicicleta eléctrica',
        'Kids Bike (from Periphery)',
      ]
      finalOptions = options.filter(
        (opt) => !exclude.some((ex) => (opt.label || '').trim().toLowerCase() === ex.toLowerCase())
      )
    } else if (item.groupCode === '97') {
      const allowed = [
        'Dîner pique-nique + bus de la zone nord',
        'Dîner pique-nique + bus de la zone sud',
      ]
      const filtered = options.filter((opt) => allowed.some((a) => (opt.label || '').trim() === a))
      if (filtered.length > 0) finalOptions = filtered
    } else if (item.groupCode === '310') {
      const exclude = [
        'Lone Star - Solo observación',
        'Lone Star - Dinner Included (self drive)',
      ]
      finalOptions = options.filter((opt) => !exclude.some((ex) => (opt.label || '').trim() === ex))
    } else if (item.groupCode === '137') {
      const exclude = [
        'VIP - Excursion privée - (Personne supplémentaire)',
        'VIP - Excursion privée',
      ]
      finalOptions = options.filter((opt) => !exclude.some((ex) => (opt.label || '').trim() === ex))
    } else if (item.groupCode === '245') {
      const exclude = [/Ticket \+?Teide Tour from Puerto de la Cruz/i]
      const allowed = [
        /From South/i,
        /From Puerto de La Cruz/i,
        /Desde Playa Paraíso y Los Gigantes/i,
        /Desde Santa Cruz y Candelaria/i,
      ]
      finalOptions = options.filter(
        (opt) =>
          allowed.some((re) => re.test(opt.label || '')) &&
          !exclude.some((re) => re.test(opt.label || ''))
      )
    }
    // Apply backoffice visibility
    const visibility = (await import('@/lib/backoffice/visibility.server')).getVisibilityConfig()
    eventOptions = finalOptions.filter((opt) => !visibility.hiddenEventIds.includes(opt.eventId))

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


