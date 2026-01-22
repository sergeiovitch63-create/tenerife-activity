/**
 * GET /api/debug/image-host
 * 
 * DEV-only endpoint that discovers the correct image base URL by testing various candidates.
 * Fetches a sample tour from Atlantico and tests different URL patterns to find which one works.
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { atlanticoGet } from '@/lib/atlantico/client'
import { getAtlanticoConfig } from '@/lib/atlantico/config'

/**
 * Test if a URL is accessible (HEAD request with timeout, fallback to GET if HEAD not allowed)
 */
async function testImageUrl(url: string, timeoutMs: number = 2000): Promise<{ ok: boolean; status: number; error?: string }> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    // Try HEAD first
    let response: Response
    try {
      response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Next.js Image Diagnostic)',
        },
      })
    } catch (headError) {
      // If HEAD fails, try GET
      response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Next.js Image Diagnostic)',
        },
      })
    }

    clearTimeout(timeoutId)

    return {
      ok: response.ok && (response.status === 200 || response.status === 304),
      status: response.status,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        ok: false,
        status: 0,
        error: 'timeout',
      }
    }
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : 'unknown',
    }
  }
}

/**
 * Extract all image candidates from raw data
 * Scans direct fields, arrays, nested objects, and events
 */
function extractImageCandidates(raw: any, events?: any[]): string[] {
  const candidates: string[] = []

  // Direct image fields
  if (raw?.image && typeof raw.image === 'string') {
    candidates.push(raw.image.trim())
  }
  if (raw?.img && typeof raw.img === 'string') {
    candidates.push(raw.img.trim())
  }
  if (raw?.photo && typeof raw.photo === 'string') {
    candidates.push(raw.photo.trim())
  }
  if (raw?.picture && typeof raw.picture === 'string') {
    candidates.push(raw.picture.trim())
  }

  // Array fields
  if (Array.isArray(raw?.images) && raw.images.length > 0) {
    for (const img of raw.images) {
      if (typeof img === 'string') {
        candidates.push(img.trim())
      } else if (img?.url && typeof img.url === 'string') {
        candidates.push(img.url.trim())
      }
    }
  }
  if (Array.isArray(raw?.photos) && raw.photos.length > 0) {
    for (const photo of raw.photos) {
      if (typeof photo === 'string') {
        candidates.push(photo.trim())
      } else if (photo?.url && typeof photo.url === 'string') {
        candidates.push(photo.url.trim())
      }
    }
  }
  if (Array.isArray(raw?.gallery) && raw.gallery.length > 0) {
    for (const item of raw.gallery) {
      if (typeof item === 'string') {
        candidates.push(item.trim())
      } else if (item?.url && typeof item.url === 'string') {
        candidates.push(item.url.trim())
      }
    }
  }
  if (Array.isArray(raw?.media) && raw.media.length > 0) {
    for (const media of raw.media) {
      if (typeof media === 'string') {
        candidates.push(media.trim())
      } else if (media?.url && typeof media.url === 'string') {
        candidates.push(media.url.trim())
      }
    }
  }

  // Scan events if available
  if (Array.isArray(events) && events.length > 0) {
    for (const event of events) {
      if (event?.image && typeof event.image === 'string') {
        candidates.push(event.image.trim())
      }
      if (event?.raw?.image && typeof event.raw.image === 'string') {
        candidates.push(event.raw.image.trim())
      }
      if (Array.isArray(event?.images) && event.images.length > 0) {
        for (const img of event.images) {
          if (typeof img === 'string') {
            candidates.push(img.trim())
          }
        }
      }
    }
  }

  // Deduplicate and filter empty
  return Array.from(new Set(candidates.filter((c) => c.length > 0)))
}

/**
 * Generate URL candidates to test
 */
function generateUrlCandidates(filename: string, baseUrl: string, imagesBaseUrl?: string): string[] {
  const candidates: string[] = []

  // Skip if filename is empty
  if (!filename || filename.trim().length === 0) {
    return candidates
  }

  const trimmed = filename.trim()

  // If already a full URL, test it directly
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    candidates.push(trimmed)
    // Normalize http to https
    if (trimmed.startsWith('http://')) {
      candidates.push(trimmed.replace('http://', 'https://'))
    }
    return candidates
  }

  // Protocol-relative URL
  if (trimmed.startsWith('//')) {
    candidates.push(`https:${trimmed}`)
    return candidates
  }

  // Remove leading slash if present
  const cleanFilename = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed

  // Pattern a) ATLANTICO_IMAGES_BASE_URL + '/' + filename
  if (imagesBaseUrl) {
    candidates.push(`${imagesBaseUrl}/${cleanFilename}`)
  }

  // Pattern b) ATLANTICO_BASE_URL + '/images/' + filename
  candidates.push(`${baseUrl}/images/${cleanFilename}`)

  // Pattern c) ATLANTICO_BASE_URL + '/public/images/' + filename
  candidates.push(`${baseUrl}/public/images/${cleanFilename}`)

  // Pattern d) ATLANTICO_BASE_URL + '/static/images/' + filename
  candidates.push(`${baseUrl}/static/images/${cleanFilename}`)

  // Pattern e) ATLANTICO_BASE_URL + '/' + filename
  candidates.push(`${baseUrl}/${cleanFilename}`)

  // Pattern f) If filename contains '/images/' keep as-is with base
  if (cleanFilename.includes('/images/')) {
    candidates.push(`${baseUrl}/${cleanFilename}`)
  }

  // Pattern g) If filename is already a path like /images/xxx.jpg, use base + filename
  if (trimmed.startsWith('/')) {
    candidates.push(`${baseUrl}${trimmed}`)
  }

  return Array.from(new Set(candidates)) // Deduplicate
}

export async function GET(request: NextRequest) {
  // DEV only
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const config = getAtlanticoConfig()
    if (!config.isValid) {
      return NextResponse.json({
        error: 'Configuration error',
        message: config.error || 'Atlantico API configuration is invalid',
      })
    }

    // Get environment values
    const baseUrl = config.baseUrl
    const imagesBaseUrl = process.env.ATLANTICO_IMAGES_BASE_URL || undefined

    // Fetch groupsList to get first group
    const groupsList = await atlanticoGet<any[]>('/groupsList/ENG/1')
    if (!Array.isArray(groupsList) || groupsList.length === 0) {
      return NextResponse.json({
        error: 'No groups found',
        message: 'Failed to fetch groups from Atlantico API',
      })
    }

    const firstGroup = groupsList[0]
    const groupId = firstGroup.code || firstGroup.id || String(firstGroup)

    // Fetch groupDetails
    const groupDetails = await atlanticoGet<any>(`/groupDetails/${groupId}/ENG`)

    // Extract events if available (for scanning event images)
    const events = groupDetails?.events || groupDetails?.ids || []

    // Extract image candidates from groupDetails (and events if available)
    const imageCandidates = extractImageCandidates(groupDetails, events)

    if (imageCandidates.length === 0) {
      return NextResponse.json({
        error: 'No image candidates found',
        message: 'No image fields found in groupDetails or events',
        groupDetails: {
          id: groupId,
          keys: Object.keys(groupDetails || {}),
          eventsCount: Array.isArray(events) ? events.length : 0,
        },
      })
    }

    // Check if any candidate is already a full URL (source of truth)
    const fullUrlCandidate = imageCandidates.find(
      (c) => c.startsWith('http://') || c.startsWith('https://')
    )

    let extractedRawCandidates = imageCandidates
    let filename = imageCandidates[0]
    let inferredImagesBaseUrl: string | null = null
    let urlCandidates: string[] = []

    if (fullUrlCandidate) {
      // Found full URL - this is the source of truth
      filename = fullUrlCandidate
      
      try {
        const urlObj = new URL(fullUrlCandidate)
        // Extract base URL (everything except filename)
        const pathParts = urlObj.pathname.split('/').filter((p) => p.length > 0)
        if (pathParts.length > 0) {
          pathParts.pop() // Remove filename
        }
        const basePath = pathParts.length > 0 ? `/${pathParts.join('/')}` : '/images'
        inferredImagesBaseUrl = `${urlObj.origin}${basePath}`
        
        // Test the full URL directly
        urlCandidates = [fullUrlCandidate]
      } catch {
        // If URL parsing fails, use as-is
        urlCandidates = [fullUrlCandidate]
      }
    } else {
      // No full URL found - generate candidates based on base URL
      filename = imageCandidates[0]
      urlCandidates = generateUrlCandidates(filename, baseUrl, imagesBaseUrl)
    }

    // Test all candidates
    const results = await Promise.all(
      urlCandidates.map(async (url) => {
        const testResult = await testImageUrl(url, 2000)
        return {
          url,
          ok: testResult.ok,
          status: testResult.status,
          error: testResult.error,
        }
      })
    )

    // Find best URL (first one that returns 200)
    const bestUrl = results.find((r) => r.ok)?.url || null

    // Infer images base URL from best URL
    if (bestUrl && !inferredImagesBaseUrl) {
      try {
        const urlObj = new URL(bestUrl)
        const pathParts = urlObj.pathname.split('/').filter((p) => p.length > 0)
        if (pathParts.length > 0) {
          pathParts.pop() // Remove filename
        }
        const basePath = pathParts.length > 0 ? `/${pathParts.join('/')}` : '/images'
        inferredImagesBaseUrl = `${urlObj.origin}${basePath}`
      } catch {
        const lastSlash = bestUrl.lastIndexOf('/')
        if (lastSlash > 0) {
          inferredImagesBaseUrl = bestUrl.substring(0, lastSlash)
        }
      }
    }

    // Generate recommendation environment line
    let recommendationEnvLine: string | null = null
    if (inferredImagesBaseUrl) {
      recommendationEnvLine = `ATLANTICO_IMAGES_BASE_URL=${inferredImagesBaseUrl}`
    } else if (bestUrl) {
      const lastSlash = bestUrl.lastIndexOf('/')
      if (lastSlash > 0) {
        recommendationEnvLine = `ATLANTICO_IMAGES_BASE_URL=${bestUrl.substring(0, lastSlash)}`
      }
    }

    return NextResponse.json({
      filename,
      extractedRawCandidates,
      baseUrl,
      imagesBaseUrl: imagesBaseUrl || null,
      urlCandidates: results,
      bestUrl,
      inferredImagesBaseUrl,
      recommendationEnvLine,
      hasFullUrlInRaw: !!fullUrlCandidate,
      sourceOfTruth: fullUrlCandidate || null,
    })
  } catch (error) {
    console.error('[IMAGE_HOST] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to discover image host',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
