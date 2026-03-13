/**
 * Server-side helper: Enrich groups with cover image from groupDetails.
 *
 * Used by VibePage to pre-populate tour.image so TourCard renders images
 * on first paint instead of loading them in useEffect.
 */

const CONCURRENCY = 5
const TIMEOUT_MS = 8000

export interface EnrichedGroup {
  id: string | number
  code: string
  name: string
  desc?: string
  image?: string
  price?: number
  duration?: string
  ids?: (string | number)[]
}

async function fetchGroupDetails(
  code: string,
  lang: string,
  origin: string
): Promise<{ image?: string } | null> {
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

    let image: string | undefined
    if (data.image && typeof data.image === 'string' && data.image.trim()) {
      image = data.image.trim()
    } else if (Array.isArray(data.images) && data.images.length > 0) {
      const first = data.images[0]
      if (typeof first === 'string' && first.trim()) {
        image = first.trim()
      }
    }
    return image ? { image } : null
  } catch {
    clearTimeout(timeoutId)
    return null
  }
}

/**
 * Enrich groups with image from groupDetails.
 * Groups that already have image are left as-is.
 * Uses concurrency limit to avoid overloading the API.
 */
export async function enrichGroupsWithImages(
  groups: EnrichedGroup[],
  atlLang: string,
  origin: string
): Promise<EnrichedGroup[]> {
  if (groups.length === 0) return groups

  const needsEnrichment = groups.filter((g) => !g.image || !String(g.image).trim())
  if (needsEnrichment.length === 0) return groups

  const queue = [...needsEnrichment]
  const results = new Map<string, string>()

  const worker = async () => {
    while (queue.length > 0) {
      const group = queue.shift()
      if (!group) break
      const code = String(group.code)
      const details = await fetchGroupDetails(code, atlLang, origin)
      if (details?.image) {
        results.set(code, details.image)
      }
    }
  }

  const workers = Array(Math.min(CONCURRENCY, queue.length))
    .fill(null)
    .map(() => worker())
  await Promise.all(workers)

  return groups.map((g) => {
    const code = String(g.code)
    const enrichedImage = results.get(code)
    if (enrichedImage) {
      return { ...g, image: enrichedImage }
    }
    return g
  })
}
