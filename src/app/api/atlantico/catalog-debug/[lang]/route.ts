/**
 * GET /api/atlantico/catalog-debug/[lang]
 * 
 * Debug endpoint for catalog analysis.
 * Returns summary statistics and sample data.
 * 
 * Route parameters:
 * - lang: Language code (e.g., 'ENG', 'ESP')
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getAtlanticoConfig } from '@/lib/atlantico/config'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lang: string }> }
) {
  try {
    const { lang } = await params
    const config = getAtlanticoConfig()

    // Check configuration
    if (!config.isValid) {
      return NextResponse.json(
        {
          error: 'Configuration error',
          message: config.error || 'Atlantico API configuration is invalid',
        },
        { status: 500 }
      )
    }

    // Fetch full catalog
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/atlantico/catalog/${lang}`, {
      next: { revalidate: 300 }, // 5 min cache for debug
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

    const catalog = await response.json()

    // Extract statistics
    const items = catalog.items || []
    const groupsUsed = catalog.groupsUsed || []
    const total = catalog.total || 0

    // Extract unique group values from raw.group
    const groupValues = new Set<string>()
    items.forEach((item: any) => {
      if (item && typeof item === 'object' && item.group) {
        const groupValue = String(item.group).trim()
        if (groupValue.length > 0) {
          groupValues.add(groupValue)
        }
      }
    })

    const topGroups = Array.from(groupValues)
      .sort()
      .slice(0, 20)

    // Get 5 sample items
    const samples = items.slice(0, 5).map((item: any) => ({
      id: item.id || item.code || 'N/A',
      code: item.code || 'N/A',
      group: item.group || 'N/A',
      image: item.image || 'N/A',
      price: item.price || 0,
      name: item.name || item.title || 'N/A',
    }))

    const debugData = {
      total,
      groupsUsed,
      topGroups,
      samples,
    }

    // Log in dev
    if (process.env.NODE_ENV === 'development') {
      console.log('[CATALOG_DEBUG]', {
        lang,
        total,
        groupsUsed: groupsUsed.length,
        topGroups: topGroups.length,
        samples: samples.length,
      })
    }

    return NextResponse.json(debugData, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60', // 5 min cache
      },
    })
  } catch (error) {
    console.error('[CATALOG_DEBUG] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to generate debug data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
























