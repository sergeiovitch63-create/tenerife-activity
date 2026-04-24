import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getSql } from '@/lib/db/postgres'
import { parseAffiliateRef } from '@/lib/affiliate/ref'
import { verifyPassword } from '@/lib/affiliate/password'
import { getAffiliateForLogin } from '@/lib/back-office/affiliates'
import {
  AFFILIATE_SESSION_COOKIE_NAME,
  AFFILIATE_SESSION_TTL_SECONDS,
} from '@/lib/affiliate/session-constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/affiliate/login
 * Verify an affiliate's code + password, create an affiliate_sessions row,
 * and set the session cookie. Redirects to /affiliate/dashboard on success.
 */
export async function POST(request: NextRequest) {
  let code = ''
  let password = ''
  try {
    const form = await request.formData()
    code = String(form.get('code') ?? '').trim()
    password = String(form.get('password') ?? '')
  } catch {
    // fall through — treated as bad credentials
  }

  const normalized = parseAffiliateRef(code)
  if (!normalized || !password) {
    return redirectToLogin(request, 'bad_credentials', code)
  }

  const affiliate = await getAffiliateForLogin(normalized)
  if (!affiliate || !affiliate.passwordHash) {
    return redirectToLogin(request, 'bad_credentials', code)
  }
  if (affiliate.status !== 'active') {
    return redirectToLogin(request, 'inactive', code)
  }

  if (!verifyPassword(password, affiliate.passwordHash)) {
    return redirectToLogin(request, 'bad_credentials', code)
  }

  const sql = getSql()
  if (!sql) return redirectToLogin(request, 'no_database', code)

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + AFFILIATE_SESSION_TTL_SECONDS * 1000)
  try {
    await sql`
      INSERT INTO affiliate_sessions (affiliate_code, token, expires_at)
      VALUES (${affiliate.code}, ${token}, ${expiresAt.toISOString()})
    `
  } catch (e) {
    console.error('[affiliate/login] session insert failed', e)
    return redirectToLogin(request, 'no_database', code)
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

function redirectToLogin(request: NextRequest, error: string, code: string) {
  const qs = new URLSearchParams({ error })
  if (code) qs.set('code', code)
  return NextResponse.redirect(
    new URL(`/affiliate/login?${qs.toString()}`, request.nextUrl.origin),
    { status: 303 },
  )
}
