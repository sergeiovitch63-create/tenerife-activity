import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin/auth'
import { resetAffiliatePassword } from '@/lib/back-office/affiliates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/affiliates/[code]/reset-password
 * Generates a new random password, stores its hash, invalidates active sessions,
 * and redirects back to the affiliate detail page with the plaintext in the
 * flash query string so the admin can copy it once.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.redirect(new URL('/back-office/login', request.nextUrl.origin), { status: 303 })
  }

  const code = decodeURIComponent(params.code)
  const plain = await resetAffiliatePassword(code)

  const flash = plain ? `resetpwd:${plain}` : 'error'
  return NextResponse.redirect(
    new URL(
      `/back-office/affiliates/${encodeURIComponent(code)}?flash=${encodeURIComponent(flash)}`,
      request.nextUrl.origin,
    ),
    { status: 303 },
  )
}
