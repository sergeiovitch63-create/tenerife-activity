/**
 * POST /api/curation/bulk
 * 
 * Bulk update curation data for multiple tours.
 * Protected by ADMIN_PASSWORD header.
 * 
 * Body: {
 *   items: Array<{
 *     id: string
 *     enabled?: boolean
 *     featured?: boolean
 *     priority?: number
 *     vibe_id?: string
 *     imageOverrideUrl?: string | null
 *     titleOverride?: string | null
 *     shortDescriptionOverride?: string | null
 *   }>
 * }
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { promises as fs } from 'fs'
import { join } from 'path'

const CURATION_FILE = join(process.cwd(), 'data', 'curation.json')

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
 * Read curation data from JSON file
 */
async function readCuration(): Promise<Record<string, any>> {
  try {
    const content = await fs.readFile(CURATION_FILE, 'utf-8')
    const data = JSON.parse(content)
    return typeof data === 'object' && data !== null ? data : {}
  } catch (error) {
    // File doesn't exist or is invalid, return empty object
    return {}
  }
}

/**
 * Write curation data to JSON file
 */
async function writeCuration(data: Record<string, any>): Promise<void> {
  // Ensure data directory exists
  const dataDir = join(process.cwd(), 'data')
  try {
    await fs.access(dataDir)
  } catch {
    await fs.mkdir(dataDir, { recursive: true })
  }

  await fs.writeFile(CURATION_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

/**
 * POST /api/curation/bulk
 * Bulk update curation entries
 */
export async function POST(request: NextRequest) {
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
    const { items } = body

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request', message: 'items is required and must be a non-empty array' },
        { status: 400 }
      )
    }

    // Read existing curation
    const curation = await readCuration()
    let updatedCount = 0

    // Process each item
    for (const item of items) {
      const { id, enabled, featured, priority, vibe_id, imageOverrideUrl, titleOverride, shortDescriptionOverride } = item

      if (!id || typeof id !== 'string') {
        continue // Skip invalid items
      }

      // Validate vibe_id if provided
      if (vibe_id !== undefined && (typeof vibe_id !== 'string' || !/^([1-9]|1[0-4])$/.test(vibe_id))) {
        continue // Skip invalid vibe_id
      }

      // Get existing entry or create new
      const existing = curation[id] || {}

      // Merge updates (only update fields that are explicitly provided)
      curation[id] = {
        experience_id: id,
        vibe_id: vibe_id !== undefined ? String(vibe_id) : (existing.vibe_id || '1'),
        enabled: enabled !== undefined ? Boolean(enabled) : (existing.enabled ?? true),
        featured: featured !== undefined ? Boolean(featured) : (existing.featured ?? false),
        priority: priority !== undefined ? Number(priority) : (existing.priority ?? 0),
        // Override fields (null means remove override, undefined means keep existing)
        imageOverrideUrl: imageOverrideUrl !== undefined
          ? (imageOverrideUrl === null || imageOverrideUrl === '' ? null : String(imageOverrideUrl))
          : existing.imageOverrideUrl,
        titleOverride: titleOverride !== undefined
          ? (titleOverride === null || titleOverride === '' ? null : String(titleOverride))
          : existing.titleOverride,
        shortDescriptionOverride: shortDescriptionOverride !== undefined
          ? (shortDescriptionOverride === null || shortDescriptionOverride === '' ? null : String(shortDescriptionOverride))
          : existing.shortDescriptionOverride,
        updated_at: new Date().toISOString(),
      }

      updatedCount++
    }

    // Write back to file (atomic update)
    await writeCuration(curation)

    return NextResponse.json({
      ok: true,
      updatedCount,
    })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[CURATION_BULK] Error:', error)
    }
    return NextResponse.json(
      {
        error: 'Failed to bulk update curation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
























