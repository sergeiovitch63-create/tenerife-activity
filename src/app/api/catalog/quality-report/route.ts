/**
 * GET /api/catalog/quality-report
 * 
 * DEV-only endpoint that generates a quality report for the catalog.
 * Shows which items are sellable vs non-sellable and why.
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { join } from 'path'
import { readJsonFile } from '@/lib/cache/jsonFile'
import { evaluateTourQuality } from '@/lib/atlantico/quality'
import type { FullCatalog, FullTour } from '@/lib/atlantico/catalog-types'

const CACHE_FILE = join(process.cwd(), 'data', 'atlantico_full_catalog.json')
const CURATION_FILE = join(process.cwd(), 'data', 'curation.json')

/**
 * Read curation data
 */
async function readCuration(): Promise<Record<string, any>> {
  try {
    const curation = await readJsonFile<Record<string, any>>(CURATION_FILE)
    return curation || {}
  } catch {
    return {}
  }
}

export async function GET(request: NextRequest) {
  // DEV only
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const { searchParams } = request.nextUrl
    const mergedParam = searchParams.get('merged')

    // Read cache
    const catalog = await readJsonFile<FullCatalog>(CACHE_FILE)

    if (!catalog) {
      return NextResponse.json(
        {
          error: 'Cache missing',
          message: 'Catalog cache not found. Call POST /api/catalog/refresh to generate it.',
        },
        { status: 404 }
      )
    }

    // Merge with curation if requested
    let items = catalog.items
    if (mergedParam === '1') {
      const curation = await readCuration()
      const curationMap: Record<string, any> = {}
      Object.values(curation).forEach((item: any) => {
        if (item && item.experience_id) {
          curationMap[item.experience_id] = item
        }
      })

      items = catalog.items.map((tour) => {
        const curationData = curationMap[tour.id]
        return {
          ...tour,
          enabled: curationData?.enabled ?? true,
          featured: curationData?.featured ?? false,
          priority: curationData?.priority ?? 0,
          vibe_id: curationData?.vibe_id || null,
        }
      })

      // Filter disabled if needed
      items = items.filter((tour) => tour.enabled !== false)
    }

    // Evaluate quality for all items
    const evaluations = items.map((tour) => ({
      tour,
      quality: evaluateTourQuality(tour),
    }))

    const sellable = evaluations.filter((e) => e.quality.sellable)
    const nonSellable = evaluations.filter((e) => !e.quality.sellable)

    // Aggregate reasons
    const reasonCounts: Record<string, number> = {}
    for (const eval_ of nonSellable) {
      for (const reason of eval_.quality.reasons) {
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1
      }
    }

    // Top reasons (sorted by count)
    const topReasons = Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([reason, count]) => ({ reason, count }))

    // Examples: 10 non-sellable items with their reasons
    const examples = nonSellable.slice(0, 10).map((eval_) => ({
      id: eval_.tour.id,
      title: eval_.tour.title,
      reasons: eval_.quality.reasons,
    }))

    return NextResponse.json({
      total: items.length,
      sellable: sellable.length,
      nonSellable: nonSellable.length,
      sellablePercentage: items.length > 0 ? Math.round((sellable.length / items.length) * 100) : 0,
      topReasons,
      examples,
      language: catalog.language,
      updatedAt: catalog.updatedAt,
    })
  } catch (error) {
    console.error('[QUALITY_REPORT] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate quality report',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

