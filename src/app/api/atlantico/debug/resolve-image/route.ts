/**
 * GET /api/atlantico/debug/resolve-image?file=<filename>
 *
 * DEV-only endpoint to discover the correct Atlantico image base URL.
 * Tests multiple host + path combinations and returns the first working URL.
 *
 * Usage:
 * 1. Start dev server
 * 2. Open: /api/atlantico/debug/resolve-image?file=garachico-san-miguel1.jpg
 * 3. Extract base from firstOkUrl and set ATLANTICO_IMAGES_BASE_URL
 */

import { NextRequest, NextResponse } from 'next/server'

// DEV-only guard
if (process.env.NODE_ENV === 'production') {
  throw new Error('This endpoint is DEV-only')
}

/**
 * Test if a URL returns a valid image (200, 206, or redirects to valid image)
 */
async function testImageUrl(url: string): Promise<{ ok: boolean; status: number; finalUrl?: string }> {
  try {
    // Use Range header to request only first byte (avoid downloading full image)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Range: 'bytes=0-0',
        },
        redirect: 'follow', // Follow redirects
        cache: 'no-store',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // 200 (full response) or 206 (partial content) are both valid
      // fetch follows redirects automatically, so we'll see the final status
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

export async function GET(request: NextRequest) {
  // DEV-only guard
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'This endpoint is DEV-only' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const file = searchParams.get('file')

  if (!file || !file.trim()) {
    return NextResponse.json(
      {
        error: 'Missing file parameter',
        example: '/api/atlantico/debug/resolve-image?file=garachico-san-miguel1.jpg',
      },
      { status: 400 }
    )
  }

  const filename = file.trim()
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

  // Also try ATLANTICO_BASE_URL if set
  const atlanticoBase = process.env.ATLANTICO_BASE_URL
  if (atlanticoBase && atlanticoBase.trim()) {
    const base = atlanticoBase.trim().replace(/\/+$/, '')
    if (!hosts.includes(base)) {
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
  const candidates: Array<{ url: string; host: string; path: string }> = []
  for (const host of hosts) {
    for (const path of paths) {
      const cleanPath = path ? path.replace(/^\/+/, '').replace(/\/+$/, '') : ''
      const url = cleanPath ? `${host}/${cleanPath}/${encodedFile}` : `${host}/${encodedFile}`
      candidates.push({ url, host, path: cleanPath || '/' })
    }
  }

  // Test candidates in parallel (with concurrency limit)
  const matches: Array<{ url: string; status: number; host: string; path: string }> = []
  let firstOkUrl: string | null = null
  let loggedOnce = false

  // Test in batches of 10 to avoid overwhelming the server
  const batchSize = 10
  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map(async (candidate) => {
        const result = await testImageUrl(candidate.url)
        if (result.ok) {
          return {
            url: result.finalUrl || candidate.url,
            status: result.status,
            host: candidate.host,
            path: candidate.path,
          }
        }
        return null
      })
    )

    for (const result of results) {
      if (result && !firstOkUrl) {
        firstOkUrl = result.url
        // Extract base URL (everything before the filename)
        const baseMatch = result.url.match(/^(https?:\/\/[^\/]+(?:\/[^\/]+)*)\//)
        if (baseMatch && !loggedOnce) {
          loggedOnce = true
          const baseUrl = baseMatch[1]
          // eslint-disable-next-line no-console
          console.log('[ATL_IMAGE_RESOLVE]', {
            file: filename,
            firstOkUrl: result.url,
            baseUrl,
            host: result.host,
            path: result.path,
            recommendation: `ATLANTICO_IMAGES_BASE_URL=${baseUrl}`,
          })
        }
        matches.push(result)
      }
    }

    // Stop after finding first working URL (we only need one)
    if (firstOkUrl) {
      break
    }
  }

  // Extract base URL from firstOkUrl if found
  let baseUrl: string | null = null
  if (firstOkUrl) {
    const baseMatch = firstOkUrl.match(/^(https?:\/\/[^\/]+(?:\/[^\/]+)*)\//)
    if (baseMatch) {
      baseUrl = baseMatch[1]
    }
  }

  return NextResponse.json({
    file: filename,
    matches: matches.slice(0, 5), // Return first 5 matches
    firstOkUrl,
    baseUrl,
    recommendation: baseUrl
      ? `Set in .env.local:\nATLANTICO_IMAGES_BASE_URL=${baseUrl}\nNEXT_PUBLIC_ATLANTICO_IMAGES_BASE_URL=${baseUrl}`
      : 'No working URL found. Check filename and network connectivity.',
    totalCandidates: candidates.length,
    tested: matches.length > 0 ? matches.length : 'none (all failed)',
  })
}

