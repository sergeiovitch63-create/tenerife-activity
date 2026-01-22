/**
 * GET /api/catalog/status
 * 
 * Returns catalog cache metadata without loading the full JSON.
 * Reads from meta file if available, otherwise parses minimal info from main file.
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { join } from 'path'
import { promises as fs } from 'fs'
import { readJsonFile } from '@/lib/cache/jsonFile'

// Cache files
const CORE_CACHE_FILE = join(process.cwd(), 'data', 'atlantico_catalog_core.json')
const DYNAMIC_CACHE_FILE = join(process.cwd(), 'data', 'atlantico_catalog_dynamic.json')
const FULL_CACHE_FILE = join(process.cwd(), 'data', 'atlantico_full_catalog.json') // Legacy

// Meta files
const CORE_META_FILE = join(process.cwd(), 'data', 'atlantico_catalog_core.meta.json')
const DYNAMIC_META_FILE = join(process.cwd(), 'data', 'atlantico_catalog_dynamic.meta.json')
const FULL_META_FILE = join(process.cwd(), 'data', 'atlantico_full_catalog.meta.json') // Legacy

interface CatalogMeta {
  updatedAt: string
  language: string
  itemCount: number
  totalEvents: number
  lastRefreshMs: number
}

/**
 * Read metadata from meta file
 */
async function readMetaFile(metaFile: string): Promise<CatalogMeta | null> {
  try {
    const meta = await readJsonFile<CatalogMeta>(metaFile)
    return meta
  } catch {
    return null
  }
}

/**
 * Read minimal info from main cache file (first few KB only)
 * For dynamic mode, count tours from data object
 */
async function readMinimalInfo(cacheFile: string, mode: string): Promise<CatalogMeta | null> {
  try {
    // Read only first 10KB to get metadata
    const fd = await fs.open(cacheFile, 'r')
    const buffer = Buffer.alloc(10240) // 10KB
    const { bytesRead } = await fd.read(buffer, 0, 10240, 0)
    await fd.close()

    if (bytesRead === 0) {
      return null
    }

    const content = buffer.toString('utf-8', 0, bytesRead)
    
    if (mode === 'dynamic') {
      // For dynamic, count tours from data object keys
      const dataMatch = content.match(/"data"\s*:\s*\{/)
      if (!dataMatch) {
        return null
      }
      
      // Try to count top-level keys in data object (tour IDs)
      const tourKeysMatches = content.match(/"([^"]+)"\s*:\s*\{/g)
      const itemCount = tourKeysMatches ? tourKeysMatches.length : 0
      
      // Count total events by counting second-level keys
      const eventKeysMatches = content.match(/"([^"]+)"\s*:\s*\{[^}]*"eventId"/g)
      const totalEvents = eventKeysMatches ? eventKeysMatches.length : 0
      
      const updatedAtMatch = content.match(/"updatedAt"\s*:\s*"([^"]+)"/)
      const languageMatch = content.match(/"language"\s*:\s*"([^"]+)"/)
      
      if (updatedAtMatch && languageMatch) {
        return {
          updatedAt: updatedAtMatch[1],
          language: languageMatch[1],
          itemCount,
          totalEvents,
          lastRefreshMs: 0,
        }
      }
    } else {
      // For core/full, standard parsing
      const updatedAtMatch = content.match(/"updatedAt"\s*:\s*"([^"]+)"/)
      const languageMatch = content.match(/"language"\s*:\s*"([^"]+)"/)
      const itemCountMatch = content.match(/"itemCount"\s*:\s*(\d+)/)
      
      if (updatedAtMatch && languageMatch && itemCountMatch) {
        // Count events by counting "events": [ patterns (rough estimate)
        const eventsMatches = content.match(/"events"\s*:\s*\[/g)
        const totalEvents = eventsMatches ? eventsMatches.length : 0

        return {
          updatedAt: updatedAtMatch[1],
          language: languageMatch[1],
          itemCount: parseInt(itemCountMatch[1], 10),
          totalEvents,
          lastRefreshMs: 0, // Not available from file alone
        }
      }
    }

    return null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const mode = searchParams.get('mode') || 'full' // 'core' | 'dynamic' | 'full'

    // Validate mode
    if (mode !== 'core' && mode !== 'dynamic' && mode !== 'full') {
      return NextResponse.json(
        {
          exists: false,
          error: 'Invalid mode',
          message: 'mode must be "core", "dynamic", or "full"',
        },
        { status: 400 }
      )
    }

    // Determine files based on mode
    const cacheFile = mode === 'core' ? CORE_CACHE_FILE : mode === 'dynamic' ? DYNAMIC_CACHE_FILE : FULL_CACHE_FILE
    const metaFile = mode === 'core' ? CORE_META_FILE : mode === 'dynamic' ? DYNAMIC_META_FILE : FULL_META_FILE

    // Try meta file first (fastest)
    let meta = await readMetaFile(metaFile)
    
    if (!meta) {
      // Fallback: try to read minimal info from main file
      meta = await readMinimalInfo(cacheFile, mode)
    }

    if (!meta) {
      // Check if cache file exists at all
      try {
        await fs.access(cacheFile)
        // File exists but we couldn't parse it
        return NextResponse.json(
          {
            exists: true,
            mode,
            error: 'Unable to read cache metadata',
          },
          { status: 500 }
        )
      } catch {
        // File doesn't exist
        return NextResponse.json({
          exists: false,
          mode,
          message: `${mode} cache missing`,
        })
      }
    }

    return NextResponse.json({
      exists: true,
      mode,
      ...meta,
    })
  } catch (error) {
    console.error('[CATALOG_STATUS] Error:', error)
    return NextResponse.json(
      {
        exists: false,
        error: 'Failed to read cache status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

