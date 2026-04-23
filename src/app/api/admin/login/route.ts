import { NextRequest, NextResponse } from 'next/server'
import {
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSession,
} from '@/lib/admin/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function sanitizeNext(raw: string | null | undefined): string {
  if (!raw) return '/back-office'
  if (!raw.startsWith('/')) return '/back-office'
  if (raw.startsWith('//')) return '/back-office'
  if (raw.length > 300) return '/back-office'
  return raw
}

export async function POST(request: NextRequest) {
  let password = ''
  let next = '/back-office'

  try {
    const form = await request.formData()
    password = String(form.get('password') ?? '')
    next = sanitizeNext(String(form.get('next') ?? ''))
  } catch {
    // fall through — will be treated as bad_password
  }

  const result = await createAdminSession(password)

  if (!result.ok) {
    const qs = new URLSearchParams({ error: result.reason })
    if (next !== '/back-office') qs.set('next', next)
    return NextResponse.redirect(new URL(`/back-office/login?${qs.toString()}`, request.nextUrl.origin), {
      status: 303,
    })
  }

  const response = NextResponse.redirect(new URL(next, request.nextUrl.origin), { status: 303 })
  const secure = process.env.NODE_ENV === 'production'
  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, result.token, {
    path: '/',
    maxAge: ADMIN_SESSION_TTL_SECONDS,
    httpOnly: true,
    sameSite: 'lax',
    secure,
  })
  return response
}
