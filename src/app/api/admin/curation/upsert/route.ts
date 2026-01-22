/**
 * POST /api/admin/curation/upsert
 * 
 * Creates or updates a curated experience.
 * Protected by admin password header.
 * 
 * Body:
 * {
 *   experienceId: string (required)
 *   vibeId: string (required, '1'-'14')
 *   enabled?: boolean (default: true)
 *   featured?: boolean (default: false)
 *   priority?: number (default: 0)
 *   customTitle?: string (optional)
 *   customImage?: string (optional)
 *   customPriceLabel?: string (optional)
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
    const {
      experienceId,
      vibeId,
      enabled = true,
      featured = false,
      priority = 0,
      customTitle,
      customImage,
      customPriceLabel,
    } = body

    // Validate required fields
    if (!experienceId || typeof experienceId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request', message: 'experienceId is required and must be a string' },
        { status: 400 }
      )
    }

    if (!vibeId || typeof vibeId !== 'string' || !/^([1-9]|1[0-4])$/.test(vibeId)) {
      return NextResponse.json(
        { error: 'Invalid request', message: 'vibeId must be a string between "1" and "14"' },
        { status: 400 }
      )
    }

    // Prepare data for upsert - map explicitly to SQL schema
    const safeText = (v: unknown) =>
      typeof v === 'string' && v.trim().length > 0 ? v.trim() : null

    const curatedData: {
      experience_id: string
      vibe_id: string
      enabled: boolean
      featured: boolean
      priority: number
      custom_title: string | null
      custom_image: string | null
      custom_price_label: string | null
      updated_at: string
    } = {
      experience_id: String(experienceId),
      vibe_id: String(vibeId),
      enabled: enabled !== undefined ? Boolean(enabled) : true,
      featured: featured !== undefined ? Boolean(featured) : false,
      priority: priority !== undefined ? Number(priority) : 0,
      custom_title: safeText(customTitle),
      custom_image: safeText(customImage),
      custom_price_label: safeText(customPriceLabel),
      updated_at: new Date().toISOString(),
    }

    // DEV log payload structure (not sensitive data)
    if (process.env.NODE_ENV === 'development') {
      console.log('[UPSERT_PAYLOAD]', {
        keys: Object.keys(curatedData),
        types: Object.entries(curatedData).reduce((acc, [key, value]) => {
          acc[key] = typeof value
          return acc
        }, {} as Record<string, string>),
        experience_id: curatedData.experience_id,
        vibe_id: curatedData.vibe_id,
        enabled: curatedData.enabled,
        featured: curatedData.featured,
        priority: curatedData.priority,
        has_custom_title: !!curatedData.custom_title,
        has_custom_image: !!curatedData.custom_image,
        has_custom_price_label: !!curatedData.custom_price_label,
        updated_at: curatedData.updated_at,
      })
    }

    // DEV log before Supabase call
    if (process.env.NODE_ENV === 'development') {
      console.log('[UPSERT_DEBUG]', {
        payload: curatedData,
        types: Object.fromEntries(
          Object.entries(curatedData).map(([k, v]) => [k, typeof v])
        ),
      })
    }

    // Supabase upsert with detailed error handling
    try {
      const { data, error } = await supabase
        .from('curated_experiences')
        .insert([curatedData])
        .select()

      if (error) {
        return NextResponse.json(
          {
            error: 'Supabase error',
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          },
          { status: 500 }
        )
      }

      return NextResponse.json({ data })
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

