import { NextRequest, NextResponse } from 'next/server'
import { defaultLocale, locales, type Locale } from './src/lib/locale'

export const config = {
  matcher: ['/((?!_next|api|images|favicon.ico|robots.txt|.*\\..*).*)'],
}

function pickLocale(req: NextRequest): Locale {
  const cookie = req.cookies.get('locale')?.value
  if (cookie && (locales as readonly string[]).includes(cookie)) return cookie as Locale

  const accept = req.headers.get('accept-language')?.toLowerCase() ?? ''
  for (const loc of locales) {
    if (accept.startsWith(loc) || accept.includes(`,${loc}`) || accept.includes(` ${loc}`)) {
      return loc
    }
  }
  return defaultLocale
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const segments = pathname.split('/').filter(Boolean)
  const first = segments[0]

  if (first && (locales as readonly string[]).includes(first)) {
    // Already on a locale path — forward the locale via header so the root layout can set <html lang>
    const res = NextResponse.next()
    res.headers.set('x-locale', first)
    return res
  }

  const locale = pickLocale(req)
  const url = req.nextUrl.clone()
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`
  const redirect = NextResponse.redirect(url)
  redirect.cookies.set('locale', locale, { path: '/', maxAge: 60 * 60 * 24 * 365 })
  return redirect
}
