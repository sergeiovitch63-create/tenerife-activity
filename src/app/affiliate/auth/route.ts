import { NextRequest, NextResponse } from 'next/server'
import {
  AFFILIATE_SESSION_COOKIE_NAME,
  AFFILIATE_SESSION_TTL_SECONDS,
  verifyAffiliateSession,
} from '@/lib/affiliate/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Magic link landing.
 *   GET /affiliate/auth?token=XXX
 * Verifies the token and, on success, sets the session cookie and redirects
 * to the dashboard. On failure, redirects to /affiliate/login with error=bad_token.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')?.trim() || ''
  if (!token) {
    return NextResponse.redirect(
      new URL('/affiliate/login?error=missing_token', request.nextUrl.origin),
    )
  }

  const session = await verifyAffiliateSession(token)
  if (!session) {
    return NextResponse.redirect(
      new URL('/affiliate/login?error=bad_token', request.nextUrl.origin),
    )
  }

  const response = NextResponse.redirect(
    new URL('/affiliate/dashboard', request.nextUrl.origin),
    { status: 303 },
  )
  const secure = process.env.NODE_ENV === 'production'
  response.cookies.set(AFFILIATE_SESSION_COOKIE_NAME, token, {
    path: '/',
    maxAge: AFFILIATE_SESSION_TTL_SECONDS,
    httpOnly: true,
    sameSite: 'lax',
    secure,
  })
  return response
}
