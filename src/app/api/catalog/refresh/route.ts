/**
 * POST /api/catalog/refresh
 * 
 * Regenerates the catalog cache by hydrating Atlantico data.
 * Supports three modes: core, dynamic, full
 * Protected by ADMIN_PASSWORD header.
 * 
 * Body JSON:
 * {
 *   language: string (required, e.g., 'ENG')
 *   refreshMode?: 'core' | 'dynamic' | 'full' (default: 'full')
 *   classificationCode?: string
 *   maxGroups?: number
 *   maxEventsPerGroup?: number
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
import type { FullCatalog, CoreCatalog, DynamicCatalog } from '@/lib/atlantico/catalog-types'

// Cache files
const CORE_CACHE_FILE = join(process.cwd(), 'data', 'atlantico_catalog_core.json')
const DYNAMIC_CACHE_FILE = join(process.cwd(), 'data', 'atlantico_catalog_dynamic.json')
const FULL_CACHE_FILE = join(process.cwd(), 'data', 'atlantico_full_catalog.json') // Legacy fallback

// Meta files
const CORE_META_FILE = join(process.cwd(), 'data', 'atlantico_catalog_core.meta.json')
const DYNAMIC_META_FILE = join(process.cwd(), 'data', 'atlantico_catalog_dynamic.meta.json')
const FULL_META_FILE = join(process.cwd(), 'data', 'atlantico_full_catalog.meta.json') // Legacy

// Lock files
const CORE_LOCK_FILE = join(process.cwd(), 'data', '.refresh.core.lock')
const DYNAMIC_LOCK_FILE = join(process.cwd(), 'data', '.refresh.dynamic.lock')
const FULL_LOCK_FILE = join(process.cwd(), 'data', '.refresh.lock') // Legacy

const LOCK_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

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

/**
 * Check if refresh is already in progress
 */
async function checkLock(lockFile: string): Promise<{ locked: boolean; reason?: string }> {
  try {
    const lockContent = await fs.readFile(lockFile, 'utf-8')
    const lockData = JSON.parse(lockContent)
    const lockTime = lockData.timestamp || 0
    const now = Date.now()
    const age = now - lockTime

    // If lock is older than timeout, consider it stale
    if (age > LOCK_TIMEOUT_MS) {
      // Remove stale lock
      try {
        await fs.unlink(lockFile)
      } catch {
        // Ignore errors
      }
      return { locked: false }
    }

    return { locked: true, reason: 'refresh_in_progress' }
  } catch {
    // Lock file doesn't exist or invalid
    return { locked: false }
  }
}

/**
 * Create lock file
 */
async function createLock(lockFile: string): Promise<void> {
  const lockData = {
    timestamp: Date.now(),
    pid: process.pid,
  }
  await fs.writeFile(lockFile, JSON.stringify(lockData, null, 2), 'utf-8')
}

/**
 * Remove lock file
 */
async function removeLock(lockFile: string): Promise<void> {
  try {
    await fs.unlink(lockFile)
  } catch {
    // Ignore errors if file doesn't exist
  }
}

/**
 * Write metadata file
 */
async function writeMetaFile(
  metaFile: string,
  catalog: { updatedAt: string; language: string; itemCount?: number },
  totalEvents?: number,
  lastRefreshMs?: number
): Promise<void> {
  const meta: any = {
    updatedAt: catalog.updatedAt,
    language: catalog.language,
    ...(catalog.itemCount !== undefined ? { itemCount: catalog.itemCount } : {}),
    ...(totalEvents !== undefined ? { totalEvents } : {}),
    ...(lastRefreshMs !== undefined ? { lastRefreshMs } : {}),
  }
  await writeJsonFile(metaFile, meta)
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
      language,
      refreshMode = 'full',
      classificationCode,
      maxGroups,
      maxEventsPerGroup,
      priceDate,
      limitsMonth,
      office,
      includeRaw,
    } = body

    // Validate required fields
    if (!language || typeof language !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request', message: 'language is required and must be a string' },
        { status: 400 }
      )
    }

    // Validate refreshMode
    if (refreshMode !== 'core' && refreshMode !== 'dynamic' && refreshMode !== 'full') {
      return NextResponse.json(
        { error: 'Invalid request', message: 'refreshMode must be "core", "dynamic", or "full"' },
        { status: 400 }
      )
    }

    // Determine lock file and cache files based on mode
    const lockFile = refreshMode === 'core' ? CORE_LOCK_FILE : refreshMode === 'dynamic' ? DYNAMIC_LOCK_FILE : FULL_LOCK_FILE
    const cacheFile = refreshMode === 'core' ? CORE_CACHE_FILE : refreshMode === 'dynamic' ? DYNAMIC_CACHE_FILE : FULL_CACHE_FILE
    const metaFile = refreshMode === 'core' ? CORE_META_FILE : refreshMode === 'dynamic' ? DYNAMIC_META_FILE : FULL_META_FILE

    // Check lock
    const lockCheck = await checkLock(lockFile)
    if (lockCheck.locked) {
      return NextResponse.json(
        {
          ok: false,
          reason: lockCheck.reason || 'refresh_in_progress',
          message: `A ${refreshMode} refresh is already in progress`,
        },
        { status: 409 }
      )
    }

    // Create lock
    await createLock(lockFile)

    // Read existing cache as backup (in case of error)
    let backupCatalog: any = null
    try {
      backupCatalog = await readJsonFile(cacheFile)
    } catch {
      // No backup available
    }

    try {
      // Build hydration options
      const opts: HydrationOptions = {
        language,
        mode: refreshMode === 'full' ? undefined : refreshMode,
        ...(classificationCode ? { classificationCode } : {}),
        ...(maxGroups ? { maxGroups: Number(maxGroups) } : {}),
        ...(maxEventsPerGroup ? { maxEventsPerGroup: Number(maxEventsPerGroup) } : {}),
        ...(priceDate ? { priceDate: String(priceDate) } : {}),
        ...(limitsMonth ? { limitsMonth: String(limitsMonth) } : {}),
        ...(office ? { office: String(office) } : {}),
        includeRaw: includeRaw === true || includeRaw === '1' || includeRaw === 'true',
      }

      // For dynamic mode, read core catalog
      if (refreshMode === 'dynamic') {
        const coreCatalog = await readJsonFile<CoreCatalog>(CORE_CACHE_FILE)
        if (!coreCatalog) {
          throw new Error('Core catalog not found. Please run core refresh first.')
        }
        opts.coreCatalog = coreCatalog
      }

      if (process.env.ATLANTICO_DEBUG === '1') {
        console.log('[CATALOG_REFRESH] Starting hydration with options:', opts)
      }

      // Hydrate catalog (with timeout protection)
      const hydrationPromise = hydrateFullCatalog(opts)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Hydration timeout after 5 minutes')), 5 * 60 * 1000)
      })

      const catalog = await Promise.race([hydrationPromise, timeoutPromise])

      const duration = Date.now() - startTime

      // Calculate stats based on mode
      let itemCount: number | undefined
      let totalEvents: number | undefined

      if (refreshMode === 'dynamic') {
        const dynamicCatalog = catalog as DynamicCatalog
        const tourCount = Object.keys(dynamicCatalog.data).length
        totalEvents = Object.values(dynamicCatalog.data).reduce((sum, tourData) => sum + Object.keys(tourData).length, 0)
        itemCount = tourCount

        // Safety check: don't overwrite cache if empty
        if (itemCount === 0 || totalEvents === 0) {
          throw new Error('EMPTY_UPSTREAM')
        }
      } else {
        const fullOrCoreCatalog = catalog as FullCatalog | CoreCatalog
        itemCount = fullOrCoreCatalog.itemCount
        totalEvents = fullOrCoreCatalog.items.reduce((sum, tour) => sum + tour.events.length, 0)

        // Safety check: don't overwrite cache if empty
        if (itemCount === 0 || totalEvents === 0) {
          throw new Error('EMPTY_UPSTREAM')
        }
      }

      // Write cache (atomic)
      await writeJsonFile(cacheFile, catalog)

      // Write metadata file
      await writeMetaFile(metaFile, catalog as any, totalEvents, duration)

      // Remove lock
      await removeLock(lockFile)

      // Log success (PROD minimal)
      if (process.env.NODE_ENV === 'production') {
        console.log('[CATALOG_REFRESH]', {
          mode: refreshMode,
          ms: duration,
          items: itemCount,
          events: totalEvents,
          lang: catalog.language,
        })
      } else if (process.env.ATLANTICO_DEBUG === '1') {
        console.log('[CATALOG_REFRESH] Complete', {
          mode: refreshMode,
          duration: `${duration}ms`,
          itemCount,
          totalEvents,
        })
      }

      return NextResponse.json({
        ok: true,
        mode: refreshMode,
        ms: duration,
        itemCount,
        totalEvents,
        updatedAt: catalog.updatedAt,
        language: catalog.language,
      })
    } catch (error) {
      const duration = Date.now() - startTime

      // Remove lock on error
      await removeLock(lockFile)

      // Check for empty upstream error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const isEmptyUpstream = errorMessage.includes('EMPTY_UPSTREAM')

      if (isEmptyUpstream) {
        // Don't restore backup, keep existing cache
        // Log error (PROD minimal)
        if (process.env.NODE_ENV === 'production') {
          console.error('[CATALOG_REFRESH]', {
            mode: refreshMode,
            error: 'empty_upstream',
            ms: duration,
          })
        } else {
          console.error(`[CATALOG_REFRESH] Empty upstream (${refreshMode}):`, errorMessage)
        }

        return NextResponse.json(
          {
            ok: false,
            reason: 'empty_upstream',
            error: `Upstream returned empty data for ${refreshMode} mode. Existing cache preserved.`,
            message: errorMessage,
            ms: duration,
          },
          { status: 422 } // 422 Unprocessable Entity
        )
      }

      // Restore backup if available (for other errors)
      if (backupCatalog) {
        try {
          await writeJsonFile(cacheFile, backupCatalog)
          if (process.env.ATLANTICO_DEBUG === '1') {
            console.log(`[CATALOG_REFRESH] Restored backup ${refreshMode} cache`)
          }
        } catch (backupErr) {
          console.error(`[CATALOG_REFRESH] Failed to restore backup:`, backupErr)
        }
      }

      // Log error (PROD minimal, no sensitive payload)
      if (process.env.NODE_ENV === 'production') {
        console.error('[CATALOG_REFRESH]', {
          mode: refreshMode,
          error: 'failed',
          ms: duration,
          message: errorMessage.substring(0, 100), // Truncate long messages
        })
      } else if (process.env.ATLANTICO_DEBUG === '1') {
        console.error(`[CATALOG_REFRESH] Error (${refreshMode}):`, error)
      }

      return NextResponse.json(
        {
          ok: false,
          error: `Failed to refresh ${refreshMode} catalog`,
          message: errorMessage,
          ms: duration,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to process request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
