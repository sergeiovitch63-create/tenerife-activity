/**
 * GET /api/backoffice/visibility
 * PATCH /api/backoffice/visibility
 *
 * Manages visibility of groups and events on the frontend.
 * - hiddenGroupIds: groups not shown on tours-list / catalog
 * - hiddenEventIds: events not shown in group options
 */

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const VISIBILITY_PATH = path.join(process.cwd(), 'src', 'data', 'visibility.json')

export interface VisibilityConfig {
  hiddenGroupIds: string[]
  hiddenEventIds: string[]
}

function readVisibility(): VisibilityConfig {
  try {
    const raw = fs.readFileSync(VISIBILITY_PATH, 'utf-8')
    const data = JSON.parse(raw)
    return {
      hiddenGroupIds: Array.isArray(data.hiddenGroupIds) ? data.hiddenGroupIds : [],
      hiddenEventIds: Array.isArray(data.hiddenEventIds) ? data.hiddenEventIds : [],
    }
  } catch {
    return { hiddenGroupIds: [], hiddenEventIds: [] }
  }
}

function writeVisibility(config: VisibilityConfig): void {
  fs.writeFileSync(
    VISIBILITY_PATH,
    JSON.stringify(config, null, 2),
    'utf-8'
  )
}

export async function GET() {
  const config = readVisibility()
  return NextResponse.json(config)
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const config = readVisibility()

    if (Array.isArray(body.hiddenGroupIds)) {
      config.hiddenGroupIds = body.hiddenGroupIds.filter((id: unknown) => typeof id === 'string')
    }
    if (Array.isArray(body.hiddenEventIds)) {
      config.hiddenEventIds = body.hiddenEventIds.filter((id: unknown) => typeof id === 'string')
    }

    writeVisibility(config)
    return NextResponse.json(config)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid request' },
      { status: 400 }
    )
  }
}
