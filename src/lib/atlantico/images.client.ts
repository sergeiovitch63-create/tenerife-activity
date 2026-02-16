/**
 * Image extraction utilities for Atlantico API responses (CLIENT-SAFE)
 * 
 * Handles various image field formats and normalizes to absolute URLs
 * This file contains NO server-only code (no fs, no server-only imports)
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

  // Use provided baseUrl if available
  if (baseUrl) {
    const base = baseUrl.replace(/\/+$/, '')
    return `${base}/${encodeURIComponent(normalized)}`
  }

  // Fallback: treat as filename and use default base
  const imageBase = getAtlanticoImageBaseUrl()
  return `${imageBase}/${encodeURIComponent(normalized)}`
}

/**
 * Build Atlantico image URL from filename
 * 
 * @param filename - Image filename (e.g., "Teleferico.jpg")
 * @returns Full URL (e.g., "https://api.atlanticoexcursiones.com/images/Teleferico.jpg") or null
 */
export function buildAtlanticoImageUrlFromFilename(filename: string | null | undefined): string | null {
  if (!filename || typeof filename !== 'string') {
    return null
  }

  const trimmed = filename.trim()
  if (!trimmed) {
    return null
  }

  // If already a full URL, return as-is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }

  // Build URL from filename
  const imageBase = getAtlanticoImageBaseUrl()
  return `${imageBase}/${encodeURIComponent(trimmed)}`
}

/**
 * Extract image URLs from various field formats in raw API response
 * Handles arrays, comma-separated strings, nested objects, etc.
 * 
 * @param raw - Raw API response object
 * @param baseUrl - Optional base URL for relative paths
 * @returns Array of normalized absolute image URLs
 */
export function extractImageUrls(raw: any, baseUrl?: string): string[] {
  if (!raw || typeof raw !== 'object') {
    return []
  }

  const urls: string[] = []
  const seen = new Set<string>()

  // Helper to extract from array
  const extractFromArray = (arr: any[]): string[] => {
    const extracted: string[] = []
    for (const item of arr) {
      if (typeof item === 'string') {
        const url = normalizeImageUrl(item, baseUrl)
        if (url) extracted.push(url)
      } else if (item && typeof item === 'object') {
        // Handle objects with url/src/image fields
        const urlFields = ['url', 'src', 'image', 'photo', 'picture', 'cover', 'thumbnail']
        for (const field of urlFields) {
          if (item[field] && typeof item[field] === 'string') {
            const url = normalizeImageUrl(item[field], baseUrl)
            if (url) {
              extracted.push(url)
              break // Use first valid field
            }
          }
        }
      }
    }
    return extracted
  }

  // Helper to extract from comma-separated string
  const extractFromCommaString = (str: string): string[] => {
    return str
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => normalizeImageUrl(s, baseUrl))
      .filter((url): url is string => url !== null)
  }

  // Priority 1: image field (single string or object)
  if (raw.image) {
    if (typeof raw.image === 'string') {
      const url = normalizeImageUrl(raw.image, baseUrl)
      if (url && !seen.has(url)) {
        urls.push(url)
        seen.add(url)
      }
    } else if (raw.image && typeof raw.image === 'object') {
      const extracted = extractFromArray([raw.image])
      for (const url of extracted) {
        if (!seen.has(url)) {
          urls.push(url)
          seen.add(url)
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

  return urls
}

/**
 * Extract the first/primary cover image from raw API response
 * Uses same priority as extractImageUrls but returns only the first result
 * 
 * @param raw - Raw API response object
 * @param baseUrl - Optional base URL for relative paths
 * @returns First normalized absolute image URL or null
 */
export function extractCoverImage(raw: any, baseUrl?: string): string | null {
  const urls = extractImageUrls(raw, baseUrl)
  return urls.length > 0 ? urls[0] : null
}



