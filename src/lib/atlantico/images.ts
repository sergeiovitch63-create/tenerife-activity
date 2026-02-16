/**
 * Image extraction utilities for Atlantico API responses
 * 
 * Handles various image field formats and normalizes to absolute URLs
 */

/**
 * Check if a URL is an IP address (to reject it)
 */
function isIPAddress(url: string): boolean {
  const ipPortPattern = /^https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?/
  return ipPortPattern.test(url)
}

/**
 * Get the base URL for Atlantico images
 * Uses the API base URL + /images path (e.g., https://api.atlanticoexcursiones.com/images)
 * NEVER uses IP addresses - always uses official domains
 */
export function getAtlanticoImageBaseUrl(): string {
  // Try to get from environment variable first
  const envBase = 
    process.env.ATLANTICO_IMAGES_BASE_URL ||
    process.env.ATLANTICO_ASSETS_BASE_URL ||
    process.env.NEXT_PUBLIC_ATLANTICO_IMAGES_BASE_URL ||
    process.env.NEXT_PUBLIC_ATLANTICO_ASSETS_BASE_URL

  if (envBase && envBase.trim()) {
    const base = envBase.trim().replace(/\/+$/, '')
    // Reject IP addresses
    if (isIPAddress(base)) {
      console.warn('[ATLANTICO_IMAGE_BASE] Rejected IP address in env var, using official domain')
    } else {
      return base
    }
  }

  // Fallback: use official API domain + /images (NEVER use IP addresses)
  // Use ATLANTICO_ENV to determine base
  const env = process.env.ATLANTICO_ENV?.toLowerCase().trim()
  if (env === 'test') {
    return 'https://testapi.atlanticoexcursiones.com/images'
  }
  
  // Default to production API (always use official domain, never IP)
  return 'https://api.atlanticoexcursiones.com/images'
}

/**
 * Normalize a single image URL string to a valid absolute URL
 * - Handles protocol-relative URLs (//example.com)
 * - Converts http to https (preferred)
 * - Handles filenames (e.g., "Teleferico.jpg") -> full URL
 * - Handles relative paths (/path/to/image.jpg) -> full URL
 * - Trims whitespace
 * - Filters out empty/null/undefined strings
 * 
 * Returns: Valid absolute HTTPS URL or null
 */
function normalizeImageUrl(url: string | null | undefined, baseUrl?: string): string | null {
  // Handle null/undefined
  if (!url || typeof url !== 'string') {
    return null
  }

  // Trim and check for empty
  let normalized = url.trim()
  if (normalized.length === 0 || normalized === 'null' || normalized === 'undefined') {
    return null
  }

  // Already a full HTTPS URL
  if (normalized.startsWith('https://')) {
    return normalized
  }

  // Convert http:// to https://
  if (normalized.startsWith('http://')) {
    normalized = normalized.replace('http://', 'https://')
    return normalized
  }

  // Protocol-relative URL (//example.com) -> https://example.com
  if (normalized.startsWith('//')) {
    return `https:${normalized}`
  }

  // Absolute path starting with / -> treat as path on Atlantico host
  if (normalized.startsWith('/')) {
    // Remove leading slash if present (we'll add it back)
    const path = normalized.startsWith('/') ? normalized : `/${normalized}`
    const imageBase = getAtlanticoImageBaseUrl()
    return `${imageBase}${path}`
  }

  // Looks like a filename (contains "." and no "http" or "/")
  // Examples: "Teleferico.jpg", "image.png", "photo.jpg"
  if (normalized.includes('.') && !normalized.includes('://') && !normalized.startsWith('/')) {
    // Build full URL with filename
    const imageBase = getAtlanticoImageBaseUrl()
    return `${imageBase}/${encodeURIComponent(normalized)}`
  }

  // If we get here and it's not a URL, assume it's a filename anyway
  // (some APIs might return filenames without extensions)
  if (!normalized.includes('://') && !normalized.startsWith('/')) {
    const imageBase = getAtlanticoImageBaseUrl()
    return `${imageBase}/${encodeURIComponent(normalized)}`
  }

  // If still not a valid URL, return null
  return null
}

/**
 * Extract image URL from various object formats
 */
function extractUrlFromObject(obj: any): string | null {
  if (!obj || typeof obj !== 'object') {
    return null
  }

  // Try common URL fields
  const urlFields = ['url', 'src', 'href', 'path', 'image', 'imageUrl', 'photo']
  for (const field of urlFields) {
    const value = obj[field]
    if (value && typeof value === 'string' && value.trim().length > 0) {
      return normalizeImageUrl(value)
    }
  }

  return null
}

/**
 * Extract image URLs from array (strings or objects)
 */
function extractFromArray(arr: any[]): string[] {
  const urls: string[] = []

  for (const item of arr) {
    if (typeof item === 'string') {
      const url = normalizeImageUrl(item)
      if (url) {
        urls.push(url)
      }
    } else if (item && typeof item === 'object') {
      const url = extractUrlFromObject(item)
      if (url) {
        urls.push(url)
      }
    }
  }

  return urls
}

/**
 * Extract image URLs from comma-separated string
 */
function extractFromCommaString(str: string): string[] {
  if (!str || typeof str !== 'string') {
    return []
  }

  return str
    .split(',')
    .map((s) => normalizeImageUrl(s))
    .filter((url): url is string => url !== null)
}

/**
 * Extract all image URLs from raw Atlantico response
 * Returns array of normalized absolute URLs
 */
export function extractImageUrls(raw: any, baseUrl?: string): string[] {
  if (!raw || typeof raw !== 'object') {
    return []
  }

  const urls: string[] = []
  const seen = new Set<string>()

  // Priority 1: Direct image fields (top-level)
  // Include imageFilename which is common in Atlantico responses
  const directFields = ['imageUrl', 'image', 'imageFilename', 'cover', 'thumbnail', 'img', 'photo', 'picture']
  for (const field of directFields) {
    const value = raw[field]
    if (value) {
      if (typeof value === 'string') {
        const url = normalizeImageUrl(value, baseUrl)
        if (url && !seen.has(url)) {
          urls.push(url)
          seen.add(url)
        }
      } else if (Array.isArray(value)) {
        const extracted = extractFromArray(value)
        for (const url of extracted) {
          if (!seen.has(url)) {
            urls.push(url)
            seen.add(url)
          }
        }
      }
    }
  }

  // Priority 2: images array/string
  if (raw.images) {
    if (Array.isArray(raw.images)) {
      const extracted = extractFromArray(raw.images)
      for (const url of extracted) {
        if (!seen.has(url)) {
          urls.push(url)
          seen.add(url)
        }
      }
    } else if (typeof raw.images === 'string') {
      // Could be comma-separated or single URL
      if (raw.images.includes(',')) {
        const extracted = extractFromCommaString(raw.images)
        for (const url of extracted) {
          if (!seen.has(url)) {
            urls.push(url)
            seen.add(url)
          }
        }
      } else {
        const url = normalizeImageUrl(raw.images, baseUrl)
        if (url && !seen.has(url)) {
          urls.push(url)
          seen.add(url)
        }
      }
    }
  }

  // Priority 3: photos array/string
  if (raw.photos) {
    if (Array.isArray(raw.photos)) {
      const extracted = extractFromArray(raw.photos)
      for (const url of extracted) {
        if (!seen.has(url)) {
          urls.push(url)
          seen.add(url)
        }
      }
    } else if (typeof raw.photos === 'string') {
      if (raw.photos.includes(',')) {
        const extracted = extractFromCommaString(raw.photos)
        for (const url of extracted) {
          if (!seen.has(url)) {
            urls.push(url)
            seen.add(url)
          }
        }
      } else {
        const url = normalizeImageUrl(raw.photos, baseUrl)
        if (url && !seen.has(url)) {
          urls.push(url)
          seen.add(url)
        }
      }
    }
  }

  // Priority 4: gallery array
  if (Array.isArray(raw.gallery)) {
    const extracted = extractFromArray(raw.gallery)
    for (const url of extracted) {
      if (!seen.has(url)) {
        urls.push(url)
        seen.add(url)
      }
    }
  }

  // Priority 5: media array (objects with url/src)
  if (Array.isArray(raw.media)) {
    const extracted = extractFromArray(raw.media)
    for (const url of extracted) {
      if (!seen.has(url)) {
        urls.push(url)
        seen.add(url)
      }
    }
  }

  // Priority 6: Check _raw nested fields (if wrapper nests data)
  if (raw._raw && typeof raw._raw === 'object') {
    const rawUrls = extractImageUrls(raw._raw, baseUrl)
    for (const url of rawUrls) {
      if (!seen.has(url)) {
        urls.push(url)
        seen.add(url)
      }
    }
  }

  // Also check common Atlantico-specific fields
  const atlanticoFields = ['fotos', 'foto', 'imagen', 'imagenes']
  for (const field of atlanticoFields) {
    const value = raw[field]
    if (value) {
      if (typeof value === 'string') {
        const url = normalizeImageUrl(value, baseUrl)
        if (url && !seen.has(url)) {
          urls.push(url)
          seen.add(url)
        }
      } else if (Array.isArray(value)) {
        const extracted = extractFromArray(value)
        for (const url of extracted) {
          if (!seen.has(url)) {
            urls.push(url)
            seen.add(url)
          }
        }
      }
    }
  }

  return urls
}

/**
 * Extract the first/cover image URL from raw Atlantico response
 * Returns single normalized absolute URL or null
 */
export function extractCoverImage(raw: any, baseUrl?: string): string | null {
  const urls = extractImageUrls(raw, baseUrl)
  return urls.length > 0 ? urls[0] : null
}

/**
 * Build Atlantico image URL from a filename
 * Uses the API base URL + /images path (e.g., https://api.atlanticoexcursiones.com/images/Teleferico.jpg)
 * 
 * NOTE: For server-side use, prefer getLocalAtlanticoImageUrl() which downloads images locally
 */
export function buildAtlanticoImageUrlFromFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return ''
  }
  
  const trimmed = filename.trim()
  if (!trimmed) {
    return ''
  }
  
  // If already a full URL, return as-is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  
  // Build URL using base + filename
  const imageBase = getAtlanticoImageBaseUrl()
  return `${imageBase}/${encodeURIComponent(trimmed)}`
}

/**
 * Get local image URL for an Atlantico image filename
 * Downloads the image if it doesn't exist locally
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
    const { getOrDownloadImage } = await import('./download-image')
    return await getOrDownloadImage(trimmed)
  } catch (error) {
    console.error('[GET_LOCAL_IMAGE] Error:', error)
    // Fallback to remote URL if download fails
    return buildAtlanticoImageUrlFromFilename(trimmed)
  }
}

