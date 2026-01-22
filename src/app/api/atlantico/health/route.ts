import { NextResponse } from 'next/server'

/**
 * GET /api/atlantico/health
 * 
 * Health check endpoint for the Atlantico API wrapper.
 * Returns basic runtime information.
 */
export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      runtime: process.env.NODE_ENV || 'unknown',
      service: 'atlantico-api-wrapper',
    })
  } catch (error) {
    console.error('[Atlantico Health] Error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}



