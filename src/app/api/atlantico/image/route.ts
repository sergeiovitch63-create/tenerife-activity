/**
 * GET /api/atlantico/image?file=<filename>
 *
 * Server-side image proxy for Atlantico images.
 * Fetches images from Atlantico (server-to-server) and streams them to the client.
 * This allows images to work even if Atlantico images are not publicly accessible.
 *
 * Query parameters:
 * - file: Image filename (required, e.g., "garachico-san-miguel1.jpg")
 *
 * Returns:
 * - Image stream with appropriate Content-Type header
 * - 404 if image not found
 * - 400 if file parameter is missing or invalid
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAtlanticoConfig } from '@/lib/atlantico/config'

// Mark route as dynamic (uses searchParams)
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Validate filename - allow only safe characters and image extensions
 */
function isValidImageFilename(filename: string): boolean {
  // Allow: alphanumeric, dots, underscores, hyphens
  // Must end with .jpg, .jpeg, .png, .webp (case-insensitive)
  const safePattern = /^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/i
  return safePattern.test(filename)
}

/**
 * Check if file has valid image extension
 */
function hasValidImageExtension(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop()
  return ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp'
}

/**
 * Check if a URL hostname is our own domain (tenerife-activity.com)
 */
function isOurDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return hostname === 'tenerife-activity.com' || hostname.endsWith('.tenerife-activity.com')
  } catch {
    return false
  }
}

/**
 * Get Atlantico images base URL from environment variables ONLY
 * NEVER uses our own domain or request host
 */
function getAtlanticoImagesBaseUrl(): string | null {
  // Priority 1: Explicit image base URL
  const envUrl =
    process.env.ATLANTICO_IMAGES_BASE_URL ||
    process.env.ATLANTICO_ASSETS_BASE_URL ||
    process.env.NEXT_PUBLIC_ATLANTICO_IMAGES_BASE_URL ||
    process.env.NEXT_PUBLIC_ATLANTICO_ASSETS_BASE_URL

  if (envUrl && envUrl.trim()) {
    const base = envUrl.trim().replace(/\/+$/, '')
    // Guard: reject our own domain
    if (isOurDomain(base)) {
      return null // Will trigger error later
    }
    return base
  }

  return null
}

/**
 * Extract hostname from URL
 */
function hostnameFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

/**
 * Test if a URL returns a valid image (200 or 206)
 */
async function testImageUrl(url: string): Promise<{ ok: boolean; status: number; finalUrl?: string }> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Range: 'bytes=0-0',
        },
        redirect: 'follow',
        cache: 'no-store',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // 200 (full response) or 206 (partial content) are both valid
      const status = response.status
      const isOk = status === 200 || status === 206

      return {
        ok: isOk,
        status,
        finalUrl: response.url, // Final URL after redirects
      }
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return { ok: false, status: 0 } // Timeout
      }
      throw fetchError
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
    }
  }
}

// In-memory cache for resolved base URL (DEV only)
let RESOLVED_BASE: string | null = null
let resolvingBase: Promise<{ base: string | null; tried: string[] }> | null = null

/**
 * Discover Atlantico image base URL (DEV only)
 * Tests multiple host + path combinations and returns first working one
 */
async function discoverImageBaseUrlDev(
  filename: string
): Promise<{ base: string | null; tried: string[] }> {
  if (process.env.NODE_ENV !== 'development') {
    return { base: null, tried: [] }
  }

  // Return cached result if available
  if (RESOLVED_BASE) {
    return { base: RESOLVED_BASE, tried: [] }
  }

  // If already resolving, wait for it
  if (resolvingBase) return resolvingBase

  // Start resolution
  resolvingBase = (async () => {
    const encodedFile = encodeURIComponent(filename)

    // Candidate hosts (common Atlantico domains)
    const hosts = [
      'https://api.atlanticoexcursiones.com',
      'https://testapi.atlanticoexcursiones.com',
      'https://atlanticoexcursiones.com',
      'https://www.atlanticoexcursiones.com',
      'https://admin.atlanticoexcursiones.com',
      'https://backoffice.atlanticoexcursiones.com',
    ]

    // Also try ATLANTICO_BASE_URL if set (but guard against our domain)
    const cfg = getAtlanticoConfig()
    if (cfg.isValid) {
      const base = cfg.baseUrl.trim().replace(/\/+$/, '')
      // Only add if it's NOT our domain
      if (!isOurDomain(base) && !hosts.includes(base)) {
        hosts.unshift(base) // Prefer env base
      }
    }

    // Candidate paths
    const paths = [
      '', // root
      '/img',
      '/images',
      '/uploads',
      '/files',
      '/resources',
      '/public',
      '/media',
      '/storage',
    ]

    // Build all candidate URLs
    const candidates: Array<{ url: string; base: string }> = []
    for (const host of hosts) {
      // Skip our own domain
      if (isOurDomain(host)) continue

      for (const path of paths) {
        const cleanPath = path ? path.replace(/^\/+/, '').replace(/\/+$/, '') : ''
        const url = cleanPath ? `${host}/${cleanPath}/${encodedFile}` : `${host}/${encodedFile}`
        const base = cleanPath ? `${host}/${cleanPath}` : host
        candidates.push({ url, base })
      }
    }

    // Test candidates in batches
    const batchSize = 10
    const tried: string[] = []

    for (let i = 0; i < candidates.length; i += batchSize) {
      const batch = candidates.slice(i, i + batchSize)
      const results = await Promise.all(
        batch.map(async (candidate) => {
          tried.push(candidate.url)
          const result = await testImageUrl(candidate.url)
          if (result.ok) {
            return candidate.base
          }
          return null
        })
      )

      // Check if we found a working base
      for (const base of results) {
        if (base) {
          RESOLVED_BASE = base.replace(/\/+$/, '')
          // eslint-disable-next-line no-console
          console.log('[ATL_IMAGE_PROXY] Discovered base URL:', RESOLVED_BASE)
          return { base: RESOLVED_BASE, tried }
        }
      }

      // Stop after testing first 30 candidates max
      if (i >= batchSize * 3) break
    }

    // No working base found
    return { base: null, tried }
  })()

  return resolvingBase
}

export async function GET(request: NextRequest) {
  // Wrap entire handler in try/catch to prevent 500 errors
  try {
    const { searchParams } = request.nextUrl
    const file = searchParams.get('file')

    if (!file || !file.trim()) {
      return NextResponse.json(
        {
          error: 'Missing file parameter',
          message: 'file parameter is required (e.g., ?file=garachico-san-miguel1.jpg)',
        },
        { status: 400 }
      )
    }

    const filename = file.trim()

    // Safety guard: validate image extension first
    if (!hasValidImageExtension(filename)) {
      return NextResponse.json(
        {
          error: 'Invalid file extension',
          message: 'File must have a valid image extension (.jpg, .jpeg, .png, .webp)',
          filename,
        },
        { status: 404 }
      )
    }

    // Validate filename format - allow short filenames like "2.webp"
    if (!isValidImageFilename(filename)) {
      // Log in dev to help debug
      if (process.env.NODE_ENV === 'development') {
        console.warn('[ATL_IMAGE_PROXY] Invalid filename format:', filename)
      }
      return NextResponse.json(
        {
          error: 'Invalid filename',
          message: 'Filename must contain only [a-zA-Z0-9._-] and end with .jpg, .jpeg, .png, or .webp',
          filename,
        },
        { status: 404 }
      )
    }

    // Build upstream URL
    let upstream: string | null = null
    let triedUrls: string[] = []
    const envBase = getAtlanticoImagesBaseUrl()

    if (envBase) {
      // Use env base URL (already validated to not be our domain)
      upstream = `${envBase}/${encodeURIComponent(filename)}`
    } else if (process.env.NODE_ENV === 'development') {
      // DEV: Try to discover base URL
      const discovery = await discoverImageBaseUrlDev(filename)
      if (discovery.base) {
        upstream = `${discovery.base}/${encodeURIComponent(filename)}`
      }
      triedUrls = discovery.tried
    } else {
      // Production: require env var, but return 404 instead of 500
      if (process.env.NODE_ENV === 'development') {
        console.warn('[ATL_IMAGE_PROXY] No ATLANTICO_IMAGES_BASE_URL set, attempting discovery')
        // Will fall through to discovery logic above
      } else {
        // In production, return 404 (not 500) for missing configuration
        return NextResponse.json(
          {
            error: 'Image not found',
            message: 'Image service is not configured',
          },
          { status: 404 }
        )
      }
    }

    // Guard: NEVER allow our own domain
    if (upstream && isOurDomain(upstream)) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[ATL_IMAGE_PROXY] Misconfigured base URL points to our domain:', upstream)
        return NextResponse.json(
          {
            error: 'Misconfigured ATLANTICO_IMAGES_BASE_URL (points to our domain)',
            upstream,
            message: 'ATLANTICO_IMAGES_BASE_URL must point to an Atlantico host, not tenerife-activity.com',
          },
          { status: 404 } // Return 404 instead of 500
        )
      }
      // In production, return 404 (not 500) for misconfiguration
      return NextResponse.json(
        {
          error: 'Image not found',
          message: 'Image service configuration error',
        },
        { status: 404 }
      )
    }

    if (!upstream) {
      // In DEV, provide helpful error with tried URLs
      if (process.env.NODE_ENV === 'development') {
        console.error('[ATL_IMAGE_PROXY] No upstream URL found:', {
          filename,
          triedUrls: triedUrls.slice(0, 5),
        })
        return NextResponse.json(
          {
            error: 'No working Atlantico image base found',
            tried: triedUrls.slice(0, 10),
            message: 'Use /api/atlantico/debug/resolve-image?file=<filename> to discover the correct base URL',
            filename,
          },
          { status: 404 } // Return 404 instead of 500 for missing images
        )
      }

      // In production, return 404 (not 500) for missing images
      return NextResponse.json(
        {
          error: 'Image not found',
          message: 'Unable to determine Atlantico images base URL',
        },
        { status: 404 }
      )
    }

    // DEV log
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[ATL_IMAGE_PROXY]', {
        filename,
        upstream,
        hostname: hostnameFromUrl(upstream),
      })
    }

    // Fetch image from Atlantico (server-to-server)
    const upstreamRes = await fetch(upstream, {
      cache: 'no-store',
      // Include Range header if present in request (for partial content support)
      headers: request.headers.get('range') ? { Range: request.headers.get('range')! } : undefined,
    })

    // Only return 200 when response is ok AND body exists
    if (!upstreamRes.ok) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('[ATL_IMAGE_PROXY] Fetch failed:', {
          filename,
          upstream,
          status: upstreamRes.status,
          statusText: upstreamRes.statusText,
        })
      }

      // Return 404 (not 500/502) when upstream fails
      return NextResponse.json(
        {
          error: 'Image not found',
          upstream,
          status: upstreamRes.status,
          statusText: upstreamRes.statusText,
        },
        { status: 404 }
      )
    }

    // Critical: Check if body exists before returning 200
    if (!upstreamRes.body) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('[ATL_IMAGE_PROXY] No response body:', {
          filename,
          upstream,
          status: upstreamRes.status,
        })
      }

      // Return 404 (not 500/502) when body is null
      return NextResponse.json(
        {
          error: 'Image not found',
          message: 'Upstream response has no body',
          upstream,
        },
        { status: 404 }
      )
    }

    // Get content type from upstream response (required for Next/Image)
    const contentType = upstreamRes.headers.get('content-type') || 'image/jpeg'

    // Critical: Validate content-type is an image
    // Only return 200 when content-type starts with "image/"
    if (!contentType.startsWith('image/')) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('[ATL_IMAGE_PROXY] Invalid content-type:', {
          filename,
          upstream,
          contentType,
        })
      }

      // Return 404 (not 500) when content-type is not an image
      return NextResponse.json(
        {
          error: 'Image not found',
          message: `Invalid content-type: ${contentType}`,
          upstream,
        },
        { status: 404 }
      )
    }

    // Build response headers
    const responseHeaders = new Headers()
    responseHeaders.set('Content-Type', contentType)
    responseHeaders.set('Cache-Control', 'public, max-age=86400') // Cache for 1 day

    // Forward content-length if available
    const contentLength = upstreamRes.headers.get('content-length')
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength)
    }

    // Forward content-range if available (for partial content / Range requests)
    const contentRange = upstreamRes.headers.get('content-range')
    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange)
    }

    // Support Range requests
    const acceptRanges = upstreamRes.headers.get('accept-ranges')
    if (acceptRanges) {
      responseHeaders.set('Accept-Ranges', acceptRanges)
    }

    // Stream the response body directly (don't buffer in memory)
    // Only return 200 when: upstreamRes.ok AND body exists AND content-type is image/*
    return new Response(upstreamRes.body, {
      status: 200,
      headers: responseHeaders,
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[ATL_IMAGE_PROXY] Error:', error)

    // Never return 500 - always return 404 for missing images
    return NextResponse.json(
      {
        error: 'Image not found',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 404 }
    )
  }
}
