/**
 * GET /api/debug/supabase
 * 
 * DEV ONLY endpoint to test Supabase connection.
 * Returns connection status without exposing secrets.
 * 
 * Disabled in production for security.
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  // Disable in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoint disabled in production' },
      { status: 403 }
    )
  }

  let supabase
  try {
    supabase = getAdminSupabase()
  } catch (configErr) {
    const url = (process.env.SUPABASE_URL ?? '').trim()
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
    return NextResponse.json({
      ok: false,
      step: 'config',
      message: configErr instanceof Error ? configErr.message : 'Configuration error',
      urlLength: url.length,
      urlStartsWithHttps: url.startsWith('https://'),
      urlContainsSupabase: url.includes('.supabase.co'),
      keyLength: key.length,
      keyStartsWith: key.substring(0, Math.min(10, key.length)),
      keyFormat: key.startsWith('eyJ') ? 'JWT' : key.startsWith('sb_') ? 'sb_' : 'unknown',
    })
  }

  try {

    // Test query: select one row
    const { data, error } = await supabase
      .from('curated_experiences')
      .select('experience_id')
      .limit(1)

    if (error) {
      return NextResponse.json({
        ok: false,
        step: 'query',
        message: error.message,
        code: error.code || null,
        details: error.details || null,
        hint: error.hint || null,
      })
    }

    return NextResponse.json({
      ok: true,
      rowCount: data?.length ?? 0,
    })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      step: 'client',
      message: err instanceof Error ? err.message : 'Unknown error',
      cause: err instanceof Error && err.cause ? String(err.cause) : null,
    })
  }
}

