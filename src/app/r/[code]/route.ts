import { NextRequest, NextResponse } from 'next/server'
import {
  AFFILIATE_REF_COOKIE_NAME,
  AFFILIATE_REF_COOKIE_MAX_AGE_S,
  parseAffiliateRef,
} from '@/lib/affiliate/ref'
import {
  AFFILIATE_VISITOR_COOKIE_NAME,
  AFFILIATE_VISITOR_COOKIE_MAX_AGE_S,
  getClientIp,
  hashIp,
  logAffiliateClick,
  readOrCreateVisitorId,
} from '@/lib/affiliate/clicks'

export const runtime = 'nodejs'

const DEFAULT_DESTINATION = '/en'

function sanitizeRedirectPath(raw: string | null): string {
  if (!raw) return DEFAULT_DESTINATION
  const trimmed = raw.trim()
  if (!trimmed.startsWith('/')) return DEFAULT_DESTINATION
  if (trimmed.startsWith('//')) return DEFAULT_DESTINATION
  if (trimmed.length > 500) return DEFAULT_DESTINATION
  return trimmed
}

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const code = parseAffiliateRef(params.code)
  const to = sanitizeRedirectPath(request.nextUrl.searchParams.get('to'))
  const activityCode = request.nextUrl.searchParams.get('a')?.trim() || null

  const destination = new URL(to, request.nextUrl.origin)
  const response = NextResponse.redirect(destination, { status: 302 })

  if (!code) return response

  const { visitorId, isNew } = readOrCreateVisitorId(request)
  const secure = process.env.NODE_ENV === 'production'

  const refCookie = `${AFFILIATE_REF_COOKIE_NAME}=${encodeURIComponent(code)}; Path=/; Max-Age=${AFFILIATE_REF_COOKIE_MAX_AGE_S}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`
  response.headers.append('Set-Cookie', refCookie)

  if (isNew) {
    const visitorCookie = `${AFFILIATE_VISITOR_COOKIE_NAME}=${visitorId}; Path=/; Max-Age=${AFFILIATE_VISITOR_COOKIE_MAX_AGE_S}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`
    response.headers.append('Set-Cookie', visitorCookie)
  }

  try {
    await logAffiliateClick({
      code,
      visitorId,
      landingUrl: destination.pathname + destination.search,
      activityCode,
      referrer: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent'),
      ipHash: hashIp(getClientIp(request)),
      country: request.headers.get('x-vercel-ip-country') || null,
    })
  } catch (e) {
    console.error('[r/code] click logging failed', e)
  }

  return response
}
