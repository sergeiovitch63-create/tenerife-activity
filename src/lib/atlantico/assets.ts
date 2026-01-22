/**
 * Atlantico assets URL helper
 *
 * The Atlantico API often returns asset filenames (images/icons) without full URLs.
 * This module builds stable public URLs for those assets.
 *
 * REQUIRED: Set ATLANTICO_IMAGES_BASE_URL (or ATLANTICO_ASSETS_BASE_URL) to the correct base URL.
 * Use /api/atlantico/debug/resolve-image?file=<filename> to discover the correct base URL.
 *
 * IMPORTANT: We only build URLs (no binary proxying here).
 */

export type AtlanticoAssetKind = 'tour' | 'icon' | 'classification'

function trimSlashes(s: string): string {
  return s.replace(/\/+$/, '')
}

function isAbsoluteUrl(s: string): boolean {
  return /^https?:\/\//i.test(s)
}

/**
 * Get image base URL from environment variables.
 * Priority: ATLANTICO_IMAGES_BASE_URL > ATLANTICO_ASSETS_BASE_URL > NEXT_PUBLIC variants
 */
function getEnvImagesBaseUrl(): string | null {
  const v =
    process.env.ATLANTICO_IMAGES_BASE_URL ||
    process.env.ATLANTICO_ASSETS_BASE_URL ||
    process.env.NEXT_PUBLIC_ATLANTICO_IMAGES_BASE_URL ||
    process.env.NEXT_PUBLIC_ATLANTICO_ASSETS_BASE_URL
  if (!v || !v.trim()) return null
  return trimSlashes(v.trim())
}

/**
 * Build a proxy URL for an Atlantico asset filename.
 *
 * Returns a local proxy URL: /api/atlantico/image?file=<filename>
 * The proxy endpoint handles fetching from Atlantico server-to-server.
 *
 * - If filename is already a full URL, returns it unchanged (external images).
 * - For filenames, returns proxy URL: /api/atlantico/image?file=<filename>
 * - Returns null if filename is invalid or missing.
 *
 * @param filename - Asset filename (e.g., "garachico-san-miguel1.jpg")
 * @param kind - Asset kind ('tour', 'icon', 'classification') - currently unused but kept for API compatibility
 * @param logContext - Optional context for DEV logging (e.g., { activityId, page: 'list' })
 */
export async function atlanticoAssetUrl(
  filename: string,
  _kind: AtlanticoAssetKind,
  logContext?: { activityId?: string; page?: string }
): Promise<string | null> {
  if (!filename || typeof filename !== 'string') {
    if (process.env.NODE_ENV === 'development' && logContext) {
      // eslint-disable-next-line no-console
      console.log('[ATL_IMAGE_MISSING]', {
        ...logContext,
        filename: null,
        reason: 'filename is empty or invalid',
      })
    }
    return null
  }
  const trimmed = filename.trim()
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
    if (process.env.NODE_ENV === 'development' && logContext) {
      // eslint-disable-next-line no-console
      console.log('[ATL_IMAGE_MISSING]', {
        ...logContext,
        filename: trimmed,
        reason: 'filename is null/undefined string',
      })
    }
    return null
  }

  // Already a full URL - return as-is (external images)
  if (isAbsoluteUrl(trimmed) || trimmed.startsWith('//')) {
    const finalUrl = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed
    if (process.env.NODE_ENV === 'development' && logContext) {
      // eslint-disable-next-line no-console
      console.log('[ATL_IMAGE_DEBUG]', {
        ...logContext,
        filename: trimmed,
        finalImageUrl: finalUrl,
        source: 'already absolute URL (external)',
      })
    }
    return finalUrl
  }

  // For filenames, return proxy URL
  const cleanName = trimmed.replace(/^\/+/, '')
  const proxyUrl = `/api/atlantico/image?file=${encodeURIComponent(cleanName)}`

  if (process.env.NODE_ENV === 'development' && logContext) {
    // eslint-disable-next-line no-console
    console.log('[ATL_IMAGE_DEBUG]', {
      ...logContext,
      filename: trimmed,
      finalImageUrl: proxyUrl,
      source: 'proxy URL',
    })
  }

  return proxyUrl
}


