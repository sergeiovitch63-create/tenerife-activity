/**
 * Server-side helper: Enrich Must See carousel items with cover images from groupDetails.
 *
 * Same approach as enrich-groups-with-images.server.ts for VibePage.
 * Fetches groupDetails per activity and resolves image URLs so the carousel
 * renders images on first paint instead of relying on client-side loading.
 */

import { MUST_SEE_ORDERED } from '@/data/must-see-group-mapping'
import { buildAtlanticoImageUrl } from '@/lib/atlantico/client'

const CONCURRENCY = 5
const TIMEOUT_MS = 8000

/** Title -> subtitleKey mapping (matches RecommendationsCarousel) */
const TITLE_TO_SUBTITLE: Record<string, string> = {
  'Club Termal': 'relaxation',
  'Loro Parque': 'zoo',
  'Flamenco': 'show',
  'Siam Park': 'themePark',
  'Jungle Park': 'zoo',
  'Shogun Boat': 'boatTour',
  'Aqualand': 'waterPark',
  'Buggy': 'adventure',
  'La Palma con Almuerzo': 'islandTour',
  'Poema del Mar Gran Canaria': 'aquarium',
  'Scandal Dinner Show': 'nightShow',
  'Teide by Night': 'stargazing',
  'Teide Tour with Cable Car': 'nature',
  'Utopia': 'party',
  'Sky of Tenerife': 'paragliding',
}

/** Static fallback images when API has no image */
const STATIC_IMAGE_FALLBACK: Record<string, string> = {
  'Club Termal': '/images/home/must-see/club-termal.jpg',
  'Loro Parque': '/images/home/must-see/Loro-Parque.png',
  'Flamenco': '/images/home/must-see/flamenco.png',
  'Siam Park': '/images/home/must-see/Siam-Park.png',
  'Jungle Park': '/images/home/must-see/Jungle-Park.png',
  'Shogun Boat': '/images/home/must-see/Shogun-Boat.jpg',
  'Aqualand': '/images/home/must-see/Aqualand.png',
  'Buggy': '/images/home/must-see/buggy.jpg',
  'La Palma con Almuerzo': '/images/home/must-see/la-palma-con-almuerzo.jpg',
  'Poema del Mar Gran Canaria': '/images/home/must-see/poema-del-mar-gran-canaria.jpg',
  'Scandal Dinner Show': '/images/home/must-see/scandal-dinner-show.jpg',
  'Teide by Night': '/images/home/must-see/teide-by-night.jpg',
  'Teide Tour with Cable Car': '/images/home/must-see/teide-tour-with-cable-car.jpg',
  'Utopia': '/images/home/must-see/utopia.jpg',
  'Sky of Tenerife': '/images/home/must-see/sky-of-tenerife.jpg',
}

export interface MustSeeItem {
  title: string
  subtitleKey: string
  image: string
  code: string
}

async function fetchGroupImage(
  code: string,
  lang: string,
  origin: string
): Promise<string | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(
      `${origin}/api/atlantico/group/${encodeURIComponent(code)}/${encodeURIComponent(lang)}`,
      { signal: controller.signal, cache: 'no-store' }
    )
    clearTimeout(timeoutId)
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    if (!data || typeof data !== 'object') return null

    let filename: string | null = null
    if (data.image && typeof data.image === 'string' && data.image.trim()) {
      filename = data.image.trim()
    } else if (Array.isArray(data.images) && data.images.length > 0) {
      const first = data.images[0]
      if (typeof first === 'string' && first.trim()) {
        filename = first.trim()
      }
    }
    if (filename) {
      return buildAtlanticoImageUrl(filename)
    }
    return null
  } catch {
    clearTimeout(timeoutId)
    return null
  }
}

export async function fetchMustSeeItemsWithImages(
  atlLang: string,
  origin: string
): Promise<{ row1: MustSeeItem[]; row2: MustSeeItem[] }> {
  const row1Codes = MUST_SEE_ORDERED.slice(0, 7)   // first 7 = row1
  const row2Codes = MUST_SEE_ORDERED.slice(7, 16)  // next 8 = row2

  const toMustSeeItem = (item: { title: string; code: string }): MustSeeItem => {
    const image = STATIC_IMAGE_FALLBACK[item.title] ?? ''
    return {
      title: item.title,
      subtitleKey: TITLE_TO_SUBTITLE[item.title] ?? item.title.toLowerCase().replace(/\s+/g, ''),
      image,
      code: item.code,
    }
  }

  return {
    row1: row1Codes.map(toMustSeeItem),
    row2: row2Codes.map(toMustSeeItem),
  }
}
