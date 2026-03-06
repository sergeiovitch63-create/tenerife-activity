/**
 * Resolve images for a group using multiple fallback sources
 *
 * Priority:
 * 1. groupDetails (image, images, photos, gallery)
 * 2. eventDetails of first event (from groupDetails.ids)
 * 3. Zeus pattern URLs: www.atlanticoexcursiones.com/zeus/pictures/GRP{code}/
 */

import { extractImageUrls } from './images.client'
import { buildAtlanticoImageUrl } from './client'

const ZEUS_BASE = 'https://www.atlanticoexcursiones.com/zeus/pictures'

export function getZeusFallbackUrls(groupCode: string): string[] {
  const code = String(groupCode).trim()
  if (!code) return []
  const letters = ['A', 'B', 'C', 'D', 'E']
  const exts = ['jpg', 'webp', 'png']
  const urls: string[] = []
  for (const letter of letters) {
    for (const ext of exts) {
      urls.push(`${ZEUS_BASE}/GRP${code}/${letter}.${ext}`)
    }
  }
  return urls
}

export function resolveFromGroupDetails(groupDetails: Record<string, unknown> | null): string[] {
  if (!groupDetails || typeof groupDetails !== 'object') return []
  const urls = extractImageUrls(groupDetails)
  if (urls.length > 0) return urls
  const image = groupDetails.image
  if (image && typeof image === 'string' && image.trim()) {
    const url = buildAtlanticoImageUrl(image.trim())
    if (url) return [url]
  }
  return []
}

export function resolveFromEventDetails(eventDetails: Record<string, unknown> | null): string[] {
  if (!eventDetails || typeof eventDetails !== 'object') return []
  return extractImageUrls(eventDetails)
}
