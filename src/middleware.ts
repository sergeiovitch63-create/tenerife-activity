import createMiddleware from 'next-intl/middleware'
import { NextRequest } from 'next/server'
import { routing } from '@/i18n/routing'
import {
  AFFILIATE_REF_COOKIE_NAME,
  AFFILIATE_REF_COOKIE_MAX_AGE_S,
  parseAffiliateRef,
} from '@/lib/affiliate/ref'

const intlMiddleware = createMiddleware(routing)

export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request)

  const refRaw = request.nextUrl.searchParams.get('ref')
  const code = parseAffiliateRef(refRaw)

  if (code) {
    const secure = process.env.NODE_ENV === 'production'
    const value = encodeURIComponent(code)
    const line = `${AFFILIATE_REF_COOKIE_NAME}=${value}; Path=/; Max-Age=${AFFILIATE_REF_COOKIE_MAX_AGE_S}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`
    response.headers.append('Set-Cookie', line)
  }

  return response
}

export const config = {
  // Exclude /back-office and /affiliate from middleware entirely — they have
  // their own (authed) layouts that handle auth + redirect to their login page.
  // This avoids any next-intl locale rewrite on those namespaces.
  matcher: [
    '/((?!api|_next|r/|back-office|affiliate|favicon\\.ico|assets|images|fonts|.*\\..*).*)',
  ],
}
