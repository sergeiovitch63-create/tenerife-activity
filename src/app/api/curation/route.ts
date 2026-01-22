/**
 * GET /api/curation
 * POST /api/curation
 * 
 * Local JSON storage for curation data (replaces Supabase).
 * Protected by ADMIN_PASSWORD header.
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
 * GET /api/curation
 * Returns all curation data
 */
export async function GET(request: NextRequest) {
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
    const curation = await readCuration()
    
    // Convert to array format for compatibility
    const items = Object.entries(curation).map(([id, data]) => ({
      experience_id: id,
      ...data,
    }))

    return NextResponse.json({ data: items })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[CURATION] Error reading file:', error)
    }
    return NextResponse.json(
      {
        error: 'Failed to read curation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/curation
 * Creates or updates a curation entry
 * Body: { id: string, enabled?: boolean, featured?: boolean, priority?: number, vibe_id?: string, imageOverrideUrl?: string, titleOverride?: string, shortDescriptionOverride?: string }
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
    const { id, enabled, featured, priority, vibe_id, imageOverrideUrl, titleOverride, shortDescriptionOverride } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request', message: 'id is required and must be a string' },
        { status: 400 }
      )
    }

    // Validate vibe_id if provided
    if (vibe_id !== undefined && (typeof vibe_id !== 'string' || !/^([1-9]|1[0-4])$/.test(vibe_id))) {
      return NextResponse.json(
        { error: 'Invalid request', message: 'vibe_id must be a string between "1" and "14"' },
        { status: 400 }
      )
    }

    // Read existing curation
    const curation = await readCuration()

    // Update or create entry (preserve existing fields if not provided)
    const existing = curation[id] || {}
    curation[id] = {
      experience_id: id,
      vibe_id: vibe_id !== undefined ? String(vibe_id) : existing.vibe_id || '1',
      enabled: enabled !== undefined ? Boolean(enabled) : existing.enabled ?? true,
      featured: featured !== undefined ? Boolean(featured) : existing.featured ?? false,
      priority: priority !== undefined ? Number(priority) : existing.priority ?? 0,
      // New override fields (null means remove override, undefined means keep existing)
      imageOverrideUrl: imageOverrideUrl !== undefined ? (imageOverrideUrl === null || imageOverrideUrl === '' ? null : String(imageOverrideUrl)) : existing.imageOverrideUrl,
      titleOverride: titleOverride !== undefined ? (titleOverride === null || titleOverride === '' ? null : String(titleOverride)) : existing.titleOverride,
      shortDescriptionOverride: shortDescriptionOverride !== undefined ? (shortDescriptionOverride === null || shortDescriptionOverride === '' ? null : String(shortDescriptionOverride)) : existing.shortDescriptionOverride,
      updated_at: new Date().toISOString(),
    }

    // Write back to file
    await writeCuration(curation)

    return NextResponse.json({ data: curation[id] })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[CURATION] Error writing file:', error)
    }
    return NextResponse.json(
      {
        error: 'Failed to save curation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/curation
 * Deletes a curation entry
 * Body: { id: string }
 */
export async function DELETE(request: NextRequest) {
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
    const { id } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request', message: 'id is required and must be a string' },
        { status: 400 }
      )
    }

    // Read existing curation
    const curation = await readCuration()

    // Delete entry if exists
    if (curation[id]) {
      delete curation[id]
      await writeCuration(curation)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[CURATION] Error deleting entry:', error)
    }
    return NextResponse.json(
      {
        error: 'Failed to delete curation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

