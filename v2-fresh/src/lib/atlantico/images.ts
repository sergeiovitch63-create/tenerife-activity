const IMAGE_BASE = process.env.NEXT_PUBLIC_ATLANTICO_IMAGES_BASE_URL
  ?? 'https://api.atlanticoexcursiones.com/images'

/**
 * Build an absolute URL from an Atlantico image filename.
 * Accepts: plain filename ("Teleferico.jpg"), relative path ("/images/x.jpg"),
 * or already absolute URL.
 */
export function atlanticoImageUrl(input: string | null | undefined): string | null {
  if (!input) return null
  const s = input.trim()
  if (!s) return null
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  if (s.startsWith('//')) return `https:${s}`
  if (s.startsWith('/')) return s // keep relative served by our own app
  // Encode each path segment for safety (spaces, accents…)
  return `${IMAGE_BASE}/${encodeURIComponent(s)}`
}

/**
 * Given a group object, extract the best-looking image URL.
 */
export function coverImage(obj: { image?: string | null; images?: string[] | null }): string | null {
  if (obj.images && obj.images.length > 0) {
    for (const i of obj.images) {
      const url = atlanticoImageUrl(i)
      if (url) return url
    }
  }
  return atlanticoImageUrl(obj.image ?? null)
}
