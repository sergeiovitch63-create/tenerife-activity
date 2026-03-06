/**
 * GET /api/atlantico/group-images/[code]?lang=ENG
 *
 * Returns image URLs for a group using fallback chain:
 * 1. groupDetails (image, images, photos, gallery)
 * 2. eventDetails of first event (from groupDetails.ids)
 * 3. Zeus pattern fallback (zeus/pictures/GRP{code}/)
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchAtlantico } from '@/lib/atlantico/fetch'
import { getAtlanticoConfig } from '@/lib/atlantico/config'
import {
  resolveFromGroupDetails,
  resolveFromEventDetails,
  getZeusFallbackUrls,
} from '@/lib/atlantico/resolve-group-images'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const { searchParams } = request.nextUrl
    const lang = searchParams.get('lang') || 'ENG'

    if (!code || !code.trim()) {
      return NextResponse.json(
        { error: 'Missing code', images: [] },
        { status: 400 }
      )
    }

    const config = getAtlanticoConfig()
    if (!config.isValid) {
      return NextResponse.json(
        { error: config.error || 'Configuration error', images: [] },
        { status: 500 }
      )
    }

    let images: string[] = []

    // 1. Fetch groupDetails
    const groupDetailsRes = await fetchAtlantico(
      `/groupDetails/${encodeURIComponent(code.trim())}/${lang}`,
      { revalidate: 3600 }
    )

    if (groupDetailsRes.ok) {
      const groupDetails = (await groupDetailsRes.json()) as Record<string, unknown>
      images = resolveFromGroupDetails(groupDetails)

      // 2. If no images, try first event
      if (images.length === 0) {
        const ids = groupDetails?.ids
        let eventIds: string[] = []
        if (typeof ids === 'string') {
          eventIds = ids.split(',').map((id) => id.trim()).filter(Boolean)
        } else if (Array.isArray(ids)) {
          eventIds = ids.map((id) => String(id).trim()).filter(Boolean)
        }
        if (eventIds.length > 0) {
          const eventRes = await fetchAtlantico(
            `/eventDetails/${encodeURIComponent(eventIds[0])}/${lang}`,
            { revalidate: 3600 }
          )
          if (eventRes.ok) {
            const eventDetails = (await eventRes.json()) as Record<string, unknown>
            images = resolveFromEventDetails(eventDetails)
          }
        }
      }
    }

    // 3. Zeus fallback (return as additional candidates - client can try them)
    const zeusUrls = getZeusFallbackUrls(code)
    const allUrls = [...images]
    for (const z of zeusUrls) {
      if (!allUrls.includes(z)) allUrls.push(z)
    }

    return NextResponse.json(
      {
        images,
        zeusFallback: zeusUrls,
        allCandidates: allUrls,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
        },
      }
    )
  } catch (error) {
    console.error('[GROUP_IMAGES] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        images: [],
      },
      { status: 500 }
    )
  }
}
