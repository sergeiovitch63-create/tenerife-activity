/**
 * GET /api/atlantico/debug/classifications?lang=ENG
 *
 * DEV-only endpoint to list all Atlantico classifications.
 * Used to build complete mapping coverage.
 */

import { NextRequest, NextResponse } from 'next/server'
import { atlanticoGet } from '@/lib/atlantico/client'

// DEV-only guard - check at runtime, not at import time
function checkDevOnly() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('This endpoint is DEV-only')
  }
}

interface Classification {
  id?: string | number
  code?: string
  name?: string
  [key: string]: unknown
}

export async function GET(request: NextRequest) {
  checkDevOnly()
  // DEV-only guard
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'This endpoint is DEV-only' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const lang = searchParams.get('lang') || 'ENG'
  const collaborator = process.env.ATLANTICO_COLLABORATOR || process.env.ATLANTICO_OFFICE || ''

  try {
    // Fetch classifications from Atlantico API
    const classifications = await atlanticoGet<Classification[]>(
      `/clasificationList/${lang}/${collaborator}`
    )

    if (!Array.isArray(classifications)) {
      return NextResponse.json(
        {
          error: 'Invalid response',
          message: 'Expected array of classifications',
        },
        { status: 500 }
      )
    }

    // Format for easy mapping
    const formatted = classifications.map((c) => ({
      id: c.id || c.code || 'unknown',
      code: c.code || String(c.id) || 'unknown',
      name: c.name || 'unknown',
      raw: c,
    }))

    return NextResponse.json({
      lang,
      total: classifications.length,
      classifications: formatted,
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[DEBUG_CLASSIFICATIONS] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch classifications',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}















