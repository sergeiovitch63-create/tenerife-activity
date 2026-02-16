/**
 * GET /api/debug/all-images
 * 
 * DEV-only endpoint that fetches all events and tests all possible image URLs
 * Returns a comprehensive list of all images found for each event
 */

import { NextRequest, NextResponse } from 'next/server'
import { atlanticoGet } from '@/lib/atlantico/client'

// DEV-only guard - check at runtime, not at import time
function checkDevOnly() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('This endpoint is DEV-only')
  }
}

interface ImageTest {
  field: string
  value: string
  url: string
  status: number
  contentType?: string
  found: boolean
}

interface EventImages {
  eventId: string
  eventCode: string
  eventName: string
  images: ImageTest[]
}

/**
 * Test if an image URL is accessible
 */
async function testImageUrl(url: string): Promise<{ status: number; contentType?: string; found: boolean }> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Tenerife-Activity/1.0',
      },
    })

    clearTimeout(timeoutId)

    return {
      status: response.status,
      contentType: response.headers.get('content-type') || undefined,
      found: response.ok,
    }
  } catch (error) {
    return {
      status: 0,
      found: false,
    }
  }
}

/**
 * Build all possible image URLs from a filename or URL
 */
function buildImageUrls(filenameOrUrl: string): string[] {
  const urls: string[] = []

  // If already a full URL, use it
  if (filenameOrUrl.startsWith('http://') || filenameOrUrl.startsWith('https://')) {
    urls.push(filenameOrUrl)
    return urls
  }

  // Build URLs with different base paths
  const bases = [
    'https://api.atlanticoexcursiones.com/images',
    'https://api.atlanticoexcursiones.com/img',
    'https://api.atlanticoexcursiones.com/uploads',
    'https://api.atlanticoexcursiones.com/files',
    'https://api.atlanticoexcursiones.com/resources',
    'https://api.atlanticoexcursiones.com/public',
    'https://api.atlanticoexcursiones.com/media',
    'https://testapi.atlanticoexcursiones.com/images',
    'https://testapi.atlanticoexcursiones.com/img',
  ]

  for (const base of bases) {
    urls.push(`${base}/${encodeURIComponent(filenameOrUrl)}`)
  }

  return urls
}

export async function GET(request: NextRequest) {
  checkDevOnly()
  try {
    // Fetch backoffice data via our API route
    const backofficeResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/atlantico/backoffice?lang=ENG`)
    if (!backofficeResponse.ok) {
      throw new Error('Failed to fetch backoffice data')
    }
    const backofficeData = await backofficeResponse.json()

    const events: EventImages[] = []
    
    // Extract events from eventDetailsByEventId (it's an object, not an array)
    const eventDetailsByEventId = backofficeData.eventDetailsByEventId || {}
    const allEvents = Object.values(eventDetailsByEventId) as any[]

    // Process each event (limit to first 50 for performance)
    const eventsToProcess = allEvents.slice(0, 50)

    for (const event of eventsToProcess) {
      const eventId = String(event.id || event.code || '')
      const eventCode = String(event.code || event.id || '')
      const eventName = String(event.name || event.title || '')

      // Extract all possible image fields
      const imageFields = [
        'image',
        'imageUrl',
        'imageFilename',
        'img',
        'photo',
        'picture',
        'cover',
        'fotos',
        'foto',
        'imagen',
        'imagenes',
        'thumbnail',
      ]

      const images: ImageTest[] = []

      for (const field of imageFields) {
        const value = event[field]
        if (value && typeof value === 'string' && value.trim()) {
          const trimmed = value.trim()
          if (trimmed && trimmed !== 'null' && trimmed !== 'undefined' && trimmed !== '') {
            // Build possible URLs
            const possibleUrls = buildImageUrls(trimmed)

            // Test each URL
            for (const url of possibleUrls) {
              const testResult = await testImageUrl(url)
              images.push({
                field,
                value: trimmed,
                url,
                ...testResult,
              })

              // If found, no need to test other URLs for this field
              if (testResult.found) {
                break
              }
            }
          }
        }
      }

      // Also check arrays
      if (Array.isArray(event.images)) {
        for (let idx = 0; idx < event.images.length; idx++) {
          const img = event.images[idx]
          if (typeof img === 'string' && img.trim()) {
            const possibleUrls = buildImageUrls(img.trim())
            for (const url of possibleUrls) {
              const testResult = await testImageUrl(url)
              images.push({
                field: `images[${idx}]`,
                value: img.trim(),
                url,
                ...testResult,
              })
              if (testResult.found) {
                break
              }
            }
          }
        }
      }

      if (images.length > 0 || eventId) {
        events.push({
          eventId,
          eventCode,
          eventName,
          images,
        })
      }
    }

    // Summary
    const totalEvents = events.length
    const eventsWithImages = events.filter(e => e.images.some(img => img.found)).length
    const totalImages = events.reduce((sum, e) => sum + e.images.length, 0)
    const foundImages = events.reduce((sum, e) => sum + e.images.filter(img => img.found).length, 0)

    return NextResponse.json({
      summary: {
        totalEvents,
        eventsWithImages,
        totalImages,
        foundImages,
      },
      events,
    })
  } catch (error) {
    console.error('[DEBUG_ALL_IMAGES] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch images',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

