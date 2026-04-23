import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_SESSION_COOKIE_NAME, destroyAdminSession } from '@/lib/admin/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value ?? null
  await destroyAdminSession(token)

  const response = NextResponse.redirect(new URL('/back-office/login', request.nextUrl.origin), {
    status: 303,
  })
  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
  })
  return response
}
