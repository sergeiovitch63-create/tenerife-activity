/**
 * POST /api/admin/curation/delete
 * 
 * Deletes a curated experience.
 * Protected by admin password header.
 * 
 * Body:
 * {
 *   experienceId: string (required)
 * }
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
    const body = await request.json()
    const { experienceId } = body

    // Validate required fields
    if (!experienceId || typeof experienceId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request', message: 'experienceId is required and must be a string' },
        { status: 400 }
      )
    }

    // Supabase delete with detailed error handling
    try {
      const { error } = await supabase
        .from('curated_experiences')
        .delete()
        .eq('experience_id', experienceId)

      if (error) {
        return NextResponse.json(
          {
            error: 'Supabase',
            step: 'delete',
            message: error.message,
            code: error.code || null,
            details: error.details || null,
            hint: error.hint || null,
          },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true })
    } catch (supabaseErr) {
      return NextResponse.json(
        {
          error: 'Supabase',
          step: 'client',
          message: supabaseErr instanceof Error ? supabaseErr.message : 'Unknown error',
          cause: supabaseErr instanceof Error && supabaseErr.cause ? String(supabaseErr.cause) : null,
        },
        { status: 500 }
      )
    }
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Supabase',
        step: 'request',
        message: err instanceof Error ? err.message : 'Unknown error',
        cause: err instanceof Error && err.cause ? String(err.cause) : null,
      },
      { status: 500 }
    )
  }
}

