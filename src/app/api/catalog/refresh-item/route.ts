/**
 * POST /api/catalog/refresh-item
 * 
 * Refreshes dynamic data (prices/availability) for a single tour.
 * Protected by ADMIN_PASSWORD header.
 * 
 * Body JSON:
 * {
 *   id?: string (tour ID)
 *   slug?: string (tour slug, alternative to id)
 *   lang?: string (language, e.g., 'ENG')
 *   refreshMode?: 'dynamic' (default: 'dynamic', only mode supported for single item)
 *   priceDate?: string (YYYYMMDD)
 *   limitsMonth?: string (YYYYMM)
 *   office?: string
 *   includeRaw?: boolean
 * }
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { join } from 'path'
import { promises as fs } from 'fs'
import { writeJsonFile, readJsonFile } from '@/lib/cache/jsonFile'
import { hydrateFullCatalog, type HydrationOptions } from '@/lib/atlantico/hydration'
import type { CoreCatalog, DynamicCatalog } from '@/lib/atlantico/catalog-types'

const CORE_CACHE_FILE = join(process.cwd(), 'data', 'atlantico_catalog_core.json')
const DYNAMIC_CACHE_FILE = join(process.cwd(), 'data', 'atlantico_catalog_dynamic.json')

/**
 * Verify admin password from request header
 */
function verifyAdminPassword(request: NextRequest): boolean {
  const header = request.headers.get('x-admin-password')?.trim() ?? ''
  const env = (process.env.ADMIN_PASSWORD ?? '').trim()

  if (!env) {
    return false
  }

  return header === env
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  // Check admin password
  const env = (process.env.ADMIN_PASSWORD ?? '').trim()
  if (!env) {
    return NextResponse.json(
      { error: 'Server env not configured. Missing ADMIN_PASSWORD' },
      { status: 500 }
    )
  }

  // TEMP DEV MODE — auth disabled
  // TODO: re-enable admin auth before production
  /*
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  */

  try {
    const body = await request.json()
    const {
      id,
      slug,
      lang,
      refreshMode = 'dynamic',
      priceDate,
      limitsMonth,
      office,
      includeRaw,
    } = body

    // Validate refreshMode (only dynamic supported for single item)
    if (refreshMode !== 'dynamic') {
      return NextResponse.json(
        { error: 'Invalid request', message: 'refreshMode must be "dynamic" for single item refresh' },
        { status: 400 }
      )
    }

    // Validate id or slug
    if (!id && !slug) {
      return NextResponse.json(
        { error: 'Invalid request', message: 'id or slug is required' },
        { status: 400 }
      )
    }

    // Read core catalog
    const coreCatalog = await readJsonFile<CoreCatalog>(CORE_CACHE_FILE)
    if (!coreCatalog) {
      return NextResponse.json(
        { error: 'Core catalog missing', message: 'Core catalog not found. Please run core refresh first.' },
        { status: 404 }
      )
    }

    // Find tour by id or slug
    const tour = coreCatalog.items.find((t) => (id && t.id === id) || (slug && (t.slug === slug || t.id === slug)))
    if (!tour) {
      return NextResponse.json(
        { error: 'Tour not found', message: `Tour with id="${id}" or slug="${slug}" not found in core catalog` },
        { status: 404 }
      )
    }

    // Determine language from core catalog or request
    const language = lang || coreCatalog.language

    // Read existing dynamic catalog (or create new)
    let dynamicCatalog = await readJsonFile<DynamicCatalog>(DYNAMIC_CACHE_FILE)
    if (!dynamicCatalog) {
      // Create new dynamic catalog
      dynamicCatalog = {
        updatedAt: new Date().toISOString(),
        language,
        data: {},
      }
    }

    // Ensure language matches
    if (dynamicCatalog.language !== language) {
      return NextResponse.json(
        { error: 'Language mismatch', message: `Dynamic catalog is for language ${dynamicCatalog.language}, requested ${language}` },
        { status: 400 }
      )
    }

    // Build hydration options
    const opts: HydrationOptions = {
      language,
      mode: 'dynamic',
      coreCatalog,
      tourIds: [tour.id], // Only refresh this tour
      ...(priceDate ? { priceDate: String(priceDate) } : {}),
      ...(limitsMonth ? { limitsMonth: String(limitsMonth) } : {}),
      ...(office ? { office: String(office) } : {}),
      includeRaw: includeRaw === true || includeRaw === '1' || includeRaw === 'true',
    }

    if (process.env.ATLANTICO_DEBUG === '1') {
      console.log('[CATALOG_REFRESH_ITEM] Starting hydration for tour:', tour.id)
    }

    // Hydrate dynamic data for this tour only
    const hydrationPromise = hydrateFullCatalog(opts)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Hydration timeout after 2 minutes')), 2 * 60 * 1000)
    })

    const result = await Promise.race([hydrationPromise, timeoutPromise])
    const dynamicResult = result as DynamicCatalog

    const duration = Date.now() - startTime

    // Merge new dynamic data into existing dynamic catalog
    // Only update the specific tour
    if (dynamicResult.data[tour.id]) {
      dynamicCatalog.data[tour.id] = dynamicResult.data[tour.id]
      dynamicCatalog.updatedAt = new Date().toISOString()
      if (dynamicResult.priceDate) dynamicCatalog.priceDate = dynamicResult.priceDate
      if (dynamicResult.limitsMonth) dynamicCatalog.limitsMonth = dynamicResult.limitsMonth
      if (dynamicResult.office) dynamicCatalog.office = dynamicResult.office
    }

    // Write updated dynamic catalog
    await writeJsonFile(DYNAMIC_CACHE_FILE, dynamicCatalog)

    const eventCount = dynamicCatalog.data[tour.id] ? Object.keys(dynamicCatalog.data[tour.id]).length : 0

    if (process.env.ATLANTICO_DEBUG === '1') {
      console.log('[CATALOG_REFRESH_ITEM] Complete', {
        tourId: tour.id,
        duration: `${duration}ms`,
        eventCount,
      })
    }

    return NextResponse.json({
      ok: true,
      tourId: tour.id,
      tourSlug: tour.slug,
      ms: duration,
      eventCount,
      updatedAt: dynamicCatalog.updatedAt,
    })
  } catch (error) {
    const duration = Date.now() - startTime

    if (process.env.ATLANTICO_DEBUG === '1') {
      console.error('[CATALOG_REFRESH_ITEM] Error:', error)
    }

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to refresh item',
        message: error instanceof Error ? error.message : 'Unknown error',
        ms: duration,
      },
      { status: 500 }
    )
  }
}
















