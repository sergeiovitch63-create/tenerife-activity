/**
 * GET /api/atlantico/sync?lang=ENG&full=1
 * 
 * Syncs catalog using EXACT PDF pipeline:
 * clasificationList → groupsList → groupDetails → eventDetails
 * 
 * Query parameters:
 * - lang: Language code (e.g., 'ENG', 'ESP') - defaults to ATLANTICO_LANGUAGE_DEFAULT or 'ENG'
 * - full: If "1", force full sync (bypass cache). Otherwise, return cached data if available.
 * 
 * Returns:
 * - success: boolean
 * - items: NormalizedCatalogItem[] (catalog items)
 * - stats: { classifications, groups, events }
 * - cached: boolean (true if served from cache)
 * - warming: boolean (true if cache miss and sync started in background)
 * - error?: string
 * 
 * Cache: 6-12 hours (catalog data)
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { syncCatalog, type NormalizedCatalogItem } from '@/lib/atlantico/sync-catalog'
import { getCachedSync, setCachedSync, hasCachedSync } from '@/lib/atlantico/sync-cache'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = request.nextUrl
    const lang = searchParams.get('lang') || process.env.ATLANTICO_LANGUAGE_DEFAULT || 'ENG'
    const collaborator = process.env.ATLANTICO_COLLABORATOR || '3645'
    const forceFull = searchParams.get('full') === '1'

    // Validate lang
    if (!lang || typeof lang !== 'string') {
      return NextResponse.json(
        {
          success: false,
          items: [],
          error: 'Invalid lang parameter',
        },
        { status: 400 }
      )
    }

    // Check cache first (unless forceFull)
    if (!forceFull) {
      const cached = getCachedSync(lang)
      if (cached) {
        const duration = Date.now() - startTime
        if (process.env.NODE_ENV !== 'production') {
          console.log('[SYNC] Cache hit:', { lang, duration: `${duration}ms`, itemsCount: cached.items.length })
        }

        const cacheSeconds = parseInt(process.env.ATLANTICO_CATALOG_CACHE_SECONDS || '21600', 10)
        return NextResponse.json(
          {
            success: true,
            items: cached.items,
            stats: cached.stats,
            cached: true,
          },
          {
            headers: {
              'Cache-Control': `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${Math.floor(cacheSeconds / 2)}`,
            },
          }
        )
      }

      // Cache miss - return immediately with warming flag, trigger background sync
      if (process.env.NODE_ENV !== 'production') {
        console.log('[SYNC] Cache miss, starting background sync:', { lang })
      }

      // Trigger background sync (non-blocking)
      setTimeout(() => {
        syncCatalog(lang, collaborator)
          .then((result) => {
            if (result.success) {
              setCachedSync(lang, result.items, result.stats)
              const duration = Date.now() - startTime
              if (process.env.NODE_ENV !== 'production') {
                console.log('[SYNC] Background sync completed:', {
                  lang,
                  duration: `${duration}ms`,
                  itemsCount: result.items.length,
                  stats: result.stats,
                })
              }
            } else {
              if (process.env.NODE_ENV !== 'production') {
                console.error('[SYNC] Background sync failed:', { lang, error: result.error })
              }
            }
          })
          .catch((error) => {
            if (process.env.NODE_ENV !== 'production') {
              console.error('[SYNC] Background sync error:', { lang, error: error instanceof Error ? error.message : 'Unknown' })
            }
          })
      }, 0)

      // Return 202 (Accepted) with warming flag
      return NextResponse.json(
        {
          success: false,
          items: [],
          cached: false,
          warming: true,
          message: 'Cache warming in progress',
        },
        {
          status: 202,
          headers: {
            'Cache-Control': 'no-cache',
          },
        }
      )
    }

    // Force full sync (full=1 parameter)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[SYNC] Starting full sync:', { lang })
    }

    const result = await syncCatalog(lang, collaborator)
    const duration = Date.now() - startTime

    if (!result.success) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[SYNC] Full sync failed:', { lang, duration: `${duration}ms`, error: result.error })
      }
      return NextResponse.json(
        {
          success: false,
          items: [],
          error: result.error || 'Failed to sync catalog',
          stats: result.stats,
          cached: false,
        },
        { status: 500 }
      )
    }

    // Cache the result
    setCachedSync(lang, result.items, result.stats)

    if (process.env.NODE_ENV !== 'production') {
      console.log('[SYNC] Full sync completed:', {
        lang,
        duration: `${duration}ms`,
        itemsCount: result.items.length,
        stats: result.stats,
      })
    }

    // Return with cache headers (6-12 hours)
    const cacheSeconds = parseInt(process.env.ATLANTICO_CATALOG_CACHE_SECONDS || '21600', 10)

    return NextResponse.json(
      {
        success: true,
        items: result.items,
        stats: result.stats,
        cached: false,
      },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${Math.floor(cacheSeconds / 2)}`,
        },
      }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[SYNC] Error:', error)

    if (process.env.NODE_ENV !== 'production') {
      console.error('[SYNC] Sync error:', { duration: `${duration}ms`, error: error instanceof Error ? error.message : 'Unknown' })
    }

    return NextResponse.json(
      {
        success: false,
        items: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        cached: false,
      },
      { status: 500 }
    )
  }
}

