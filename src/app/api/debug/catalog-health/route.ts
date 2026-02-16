/**
 * GET /api/debug/catalog-health
 * 
 * DEV-only endpoint that returns catalog health status.
 * Shows core/dynamic cache status, counts, and warnings.
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { join } from 'path'
import { readJsonFile } from '@/lib/cache/jsonFile'
import { evaluateTourQuality } from '@/lib/atlantico/quality'
import type { CoreCatalog, DynamicCatalog, FullCatalog, FullTour } from '@/lib/atlantico/catalog-types'

const CORE_CACHE_FILE = join(process.cwd(), 'data', 'atlantico_catalog_core.json')
const DYNAMIC_CACHE_FILE = join(process.cwd(), 'data', 'atlantico_catalog_dynamic.json')
const FULL_CACHE_FILE = join(process.cwd(), 'data', 'atlantico_full_catalog.json') // Legacy

export async function GET(request: NextRequest) {
  // DEV only
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const warnings: string[] = []
    const health: any = {
      coreExists: false,
      dynamicExists: false,
      lastCoreUpdate: null,
      lastDynamicUpdate: null,
      itemCount: 0,
      sellableCount: 0,
      warnings: [],
    }

    // Check core cache
    const coreCatalog = await readJsonFile<CoreCatalog>(CORE_CACHE_FILE)
    if (coreCatalog) {
      health.coreExists = true
      health.lastCoreUpdate = coreCatalog.updatedAt
      health.itemCount = coreCatalog.itemCount

      // Check age (warn if older than 7 days)
      const coreAge = Date.now() - new Date(coreCatalog.updatedAt).getTime()
      const coreAgeDays = Math.floor(coreAge / (1000 * 60 * 60 * 24))
      if (coreAgeDays > 7) {
        warnings.push(`Core cache is ${coreAgeDays} days old`)
      }
    } else {
      warnings.push('Core cache missing')
    }

    // Check dynamic cache
    const dynamicCatalog = await readJsonFile<DynamicCatalog>(DYNAMIC_CACHE_FILE)
    if (dynamicCatalog) {
      health.dynamicExists = true
      health.lastDynamicUpdate = dynamicCatalog.updatedAt

      // Check age (warn if older than 24 hours)
      const dynamicAge = Date.now() - new Date(dynamicCatalog.updatedAt).getTime()
      const dynamicAgeHours = Math.floor(dynamicAge / (1000 * 60 * 60))
      if (dynamicAgeHours > 24) {
        warnings.push(`Dynamic cache is ${dynamicAgeHours} hours old (should be refreshed daily)`)
      }

      // Count tours with dynamic data
      const toursWithData = Object.keys(dynamicCatalog.data).length
      if (toursWithData === 0) {
        warnings.push('Dynamic cache exists but contains no tour data')
      }
    } else {
      warnings.push('Dynamic cache missing')
    }

    // Check legacy full cache (fallback)
    const legacyCatalog = await readJsonFile<FullCatalog>(FULL_CACHE_FILE)
    if (legacyCatalog && !health.coreExists) {
      health.coreExists = true // Legacy serves as core
      health.lastCoreUpdate = legacyCatalog.updatedAt
      health.itemCount = legacyCatalog.itemCount
      warnings.push('Using legacy full cache (split cache not available)')
    }

    // Calculate sellable count if we have catalog data
    if (coreCatalog || legacyCatalog) {
      const catalog = coreCatalog || legacyCatalog
      if (catalog && 'items' in catalog) {
        const items = catalog.items as FullTour[]
        let sellableCount = 0

        // Try to assemble with dynamic if available
        if (coreCatalog && dynamicCatalog) {
          for (const tour of items) {
            const dynamicData = dynamicCatalog.data[tour.id]
            if (dynamicData) {
              // Merge events with dynamic data
              const mergedEvents = tour.events.map((coreEvent) => {
                const dynamicEvent = dynamicData[coreEvent.id]
                if (dynamicEvent) {
                  return {
                    ...coreEvent,
                    price: dynamicEvent.price,
                    availability: dynamicEvent.availability,
                  } as FullTour['events'][0]
                  }
                return coreEvent
              })

              const mergedTour: FullTour = {
                ...tour,
                events: mergedEvents,
              }

              const quality = evaluateTourQuality(mergedTour)
              if (quality.sellable) {
                sellableCount++
              }
            } else {
              // No dynamic data, evaluate core only
              const quality = evaluateTourQuality(tour as FullTour)
              if (quality.sellable) {
                sellableCount++
              }
            }
          }
        } else {
          // Legacy or core only
          for (const tour of items) {
            const quality = evaluateTourQuality(tour as FullTour)
            if (quality.sellable) {
              sellableCount++
            }
          }
        }

        health.sellableCount = sellableCount
      }
    }

    health.warnings = warnings

    return NextResponse.json(health)
  } catch (error) {
    console.error('[CATALOG_HEALTH] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate health report',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}






















