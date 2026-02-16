/**
 * Server-only image utilities for Atlantico API
 * 
 * This file contains server-only code (uses fs, server-only)
 * DO NOT import this file in client components
 */

import 'server-only'

// Re-export all client-safe functions
export {
  getAtlanticoImageBaseUrl,
  buildAtlanticoImageUrlFromFilename,
  extractImageUrls,
  extractCoverImage,
} from './images.client'

/**
 * Get local image URL for an Atlantico image filename
 * Downloads the image if it doesn't exist locally
 * 
 * NOTE: This function is SERVER-ONLY (uses fs module)
 * On the client, use buildAtlanticoImageUrlFromFilename() instead
 * 
 * @param filename - Image filename (e.g., "Teleferico.jpg")
 * @returns Local public URL (e.g., "/images/atlantico/Teleferico.jpg") or null if download failed
 */
export async function getLocalAtlanticoImageUrl(filename: string): Promise<string | null> {
  if (!filename || typeof filename !== 'string') {
    return null
  }

  const trimmed = filename.trim()
  if (!trimmed) {
    return null
  }

  // If already a full URL, return as-is (don't download external images)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }

  // Try to get or download local image
  try {
    const { getOrDownloadImage } = await import('./download-image.server')
    return await getOrDownloadImage(trimmed)
  } catch (error) {
    console.error('[GET_LOCAL_IMAGE] Error:', error)
    // Fallback to remote URL if download fails
    const { buildAtlanticoImageUrlFromFilename } = await import('./images.client')
    return buildAtlanticoImageUrlFromFilename(trimmed)
  }
}



