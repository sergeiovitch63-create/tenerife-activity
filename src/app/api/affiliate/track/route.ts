import { NextRequest, NextResponse } from 'next/server'
import {
  AFFILIATE_REF_COOKIE_MAX_AGE_S,
  AFFILIATE_REF_COOKIE_NAME,
  parseAffiliateRef,
} from '@/lib/affiliate/ref'

/**
 * GET /api/affiliate/track?ref=CODE
 * Sets HttpOnly affiliate cookie (Node route handler — reliable vs Edge middleware alone).
 */
export async function GET(request: NextRequest) {
  const ref = parseAffiliateRef(request.nextUrl.searchParams.get('ref'))
  if (!ref) {
    return NextResponse.json({ ok: false, error: 'invalid_ref' }, { status: 400 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(AFFILIATE_REF_COOKIE_NAME, ref, {
    path: '/',
    maxAge: AFFILIATE_REF_COOKIE_MAX_AGE_S,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
  return res
}
