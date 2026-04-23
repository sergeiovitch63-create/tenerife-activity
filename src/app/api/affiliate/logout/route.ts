import { NextRequest, NextResponse } from 'next/server'
import {
  AFFILIATE_SESSION_COOKIE_NAME,
  destroyAffiliateSession,
} from '@/lib/affiliate/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const token = request.cookies.get(AFFILIATE_SESSION_COOKIE_NAME)?.value ?? null
  await destroyAffiliateSession(token)

  const response = NextResponse.redirect(
    new URL('/affiliate/login', request.nextUrl.origin),
    { status: 303 },
  )
  response.cookies.set(AFFILIATE_SESSION_COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
  })
  return response
}
