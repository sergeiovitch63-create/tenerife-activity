/**
 * Utility functions for video thumbnail handling
 */

/**
 * Get thumbnail paths from video source path
 * Returns both webp and jpg paths for fallback support
 * 
 * @param videoSrc - Video source path (e.g., "/videos/boat-trips-cruises.mp4")
 * @returns Object with webp and jpg paths
 */
export function getThumbnailPaths(videoSrc: string | null): {
  webp: string | null
  jpg: string | null
} {
  if (!videoSrc) {
    return { webp: null, jpg: null }
  }

  // Extract basename without extension
  const pathParts = videoSrc.split('/')
  const filename = pathParts[pathParts.length - 1]
  const basenameWithoutExt = filename.replace(/\.[^/.]+$/, '')

  // Return thumbnail paths in thumbnails subfolder
  const dirPath = videoSrc.substring(0, videoSrc.lastIndexOf('/'))
  return {
    webp: `${dirPath}/thumbnails/${basenameWithoutExt}.webp`,
    jpg: `${dirPath}/thumbnails/${basenameWithoutExt}.jpg`,
  }
}

/**
 * Get primary thumbnail path (webp preferred)
 * 
 * @param videoSrc - Video source path (e.g., "/videos/boat-trips-cruises.mp4")
 * @returns Thumbnail path (e.g., "/videos/thumbnails/boat-trips-cruises.webp")
 * @deprecated Use getThumbnailPaths for better fallback support
 */
export function getThumbnailPath(videoSrc: string | null): string | null {
  return getThumbnailPaths(videoSrc).webp
}

