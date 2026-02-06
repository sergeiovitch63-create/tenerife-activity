/**
 * GET /api/debug/atlantico
 * 
 * Debug endpoint to test Atlantico API connection.
 * Makes a lightweight call (groupsList page 1) and returns status.
 * 
 * DEV ONLY - Disabled in production.
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { atlanticoGet } from '@/lib/atlantico/client'

export async function GET(request: NextRequest) {
  // Disable in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoint disabled in production' },
      { status: 403 }
    )
  }

  try {
    const startTime = Date.now()

    // Make lightweight call: groupsList page 1 (ENG)
    const data = await atlanticoGet<any>('/groupsList/ENG/1')

    const duration = Date.now() - startTime

    // Extract sample keys from response (first item if array)
    let sampleKeys: string[] = []
    if (Array.isArray(data) && data.length > 0) {
      sampleKeys = Object.keys(data[0] || {})
    } else if (typeof data === 'object' && data !== null) {
      sampleKeys = Object.keys(data)
    }

    return NextResponse.json({
      ok: true,
      ms: duration,
      sampleKeys: sampleKeys.slice(0, 10), // Limit to 10 keys
      itemCount: Array.isArray(data) ? data.length : null,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
















