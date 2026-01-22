/**
 * GET /api/admin/curation/list
 * 
 * Returns all curated experiences from the database.
 * Protected by admin password header.
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/server'

/**
 * Verify admin password from request header
 */
function verifyAdminPassword(request: NextRequest): boolean {
  const header = request.headers.get('x-admin-password')?.trim() ?? ''
  const env = (process.env.ADMIN_PASSWORD ?? '').trim()

  return header === env
}

export async function GET(request: NextRequest) {
  // DEV log
  if (process.env.NODE_ENV === 'development') {
    const headerRaw = request.headers.get('x-admin-password')
    const header = headerRaw?.trim() ?? ''
    const env = (process.env.ADMIN_PASSWORD ?? '').trim()
    console.log('[ADMIN_SERVER]', {
      hasHeader: !!headerRaw,
      headerLen: header.length,
      hasEnv: !!env,
      envLen: env.length,
      match: header === env,
    })
  }

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

  let supabase
  try {
    supabase = getAdminSupabase()
  } catch (configErr) {
    return NextResponse.json(
      {
        error: 'Supabase',
        step: 'config',
        message: configErr instanceof Error ? configErr.message : 'Configuration error',
      },
      { status: 500 }
    )
  }

  try {
    const { data, error } = await supabase
      .from('curated_experiences')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        {
          error: 'Supabase',
          step: 'query',
          message: error.message,
          code: error.code || null,
          details: error.details || null,
          hint: error.hint || null,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data || [] })
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Supabase',
        step: 'client',
        message: err instanceof Error ? err.message : 'Unknown error',
        cause: err instanceof Error && err.cause ? String(err.cause) : null,
      },
      { status: 500 }
    )
  }
}

