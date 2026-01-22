/**
 * GET /api/atlantico/debug-images/[lang]
 * 
 * Debug endpoint to inspect image fields in catalog response
 * Returns analysis of image fields for first 50 items
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { headers } from 'next/headers'

const IMAGE_CANDIDATE_KEYS = [
  'image',
  'imageUrl',
  'img',
  'photo',
  'photos',
  'images',
  'gallery',
  'media',
  'cover',
  'thumbnail',
  'picture',
  'url',
  'fotos',
  'foto',
  'imagen',
  'imagenes',
]

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lang: string }> }
) {
  try {
    const { lang } = await params
    const hdrs = headers()
    const host = hdrs.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || ''
    const origin = envBase ? envBase : `${protocol}://${host}`

    // Fetch catalog
    const catalogUrl = `${origin}/api/atlantico/catalog/${lang}`
    const response = await fetch(catalogUrl, {
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Failed to fetch catalog',
          status: response.status,
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    const items = Array.isArray(data.items) ? data.items : []

    // Analyze first 50 items
    const analysis = items.slice(0, 50).map((item: any, index: number) => {
      const imageKeys: Record<string, any> = {}
      const allKeys = Object.keys(item || {})

      // Find all candidate image keys
      for (const key of IMAGE_CANDIDATE_KEYS) {
        if (key in item) {
          imageKeys[key] = item[key]
        }
      }

      // Also check _raw
      if (item._raw && typeof item._raw === 'object') {
        for (const key of IMAGE_CANDIDATE_KEYS) {
          if (key in item._raw && !(key in imageKeys)) {
            imageKeys[`_raw.${key}`] = item._raw[key]
          }
        }
      }

      // Check if current UI would find an image
      const currentUiImage = item.image || item.imageUrl || null
      const hasImage = !!currentUiImage

      return {
        index,
        code: item.code || item.id || `item-${index}`,
        title: item.title || item.name || 'Untitled',
        hasImage,
        currentUiImage,
        imageKeys,
        allKeys: allKeys.slice(0, 20), // First 20 keys for reference
      }
    })

    // Summary
    const withImage = analysis.filter((a: any) => a.hasImage).length
    const withoutImage = analysis.filter((a: any) => !a.hasImage).length
    const itemsWithoutImage = analysis.filter((a: any) => !a.hasImage)

    // Collect unique hostnames from all image URLs
    const hostnames = new Set<string>()
    analysis.forEach((a: any) => {
      Object.values(a.imageKeys).forEach((value) => {
        if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
          try {
            const url = new URL(value)
            hostnames.add(url.hostname)
          } catch {
            // Invalid URL, skip
          }
        }
      })
    })

    return NextResponse.json(
      {
        total: items.length,
        analyzed: analysis.length,
        summary: {
          withImage,
          withoutImage,
          percentageWithImage: ((withImage / analysis.length) * 100).toFixed(1) + '%',
        },
        hostnames: Array.from(hostnames).sort(),
        itemsWithoutImage: itemsWithoutImage.slice(0, 10), // First 10 examples
        analysis,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        },
      }
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to analyze images',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


