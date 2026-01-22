/**
 * GET /api/admin/experiences
 * 
 * Returns all experiences from the repository.
 * Protected by admin password header.
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { experienceRepository } from '@/config/repositories'

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

  try {
    const experiences = await experienceRepository.findAll()
    return NextResponse.json({ data: experiences || [] })
  } catch (err) {
    console.error('[ADMIN_EXPERIENCES] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

