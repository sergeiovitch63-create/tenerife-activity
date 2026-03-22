import createMiddleware from 'next-intl/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { parseAffiliateRef, setAffiliateRefCookie } from './src/lib/affiliate/ref'
import { routing } from './src/i18n/routing'

// Locale codes for regex matching
const localeCodes = routing.locales as readonly string[]
const localePattern = `(${localeCodes.join('|')})`

// Regex to match paths with two locale segments at the start: /<locale1>/<locale2>/(...)
// Matches: /en/es, /en/es/get-inspired, /fr/de/must-see, etc.
// Captures: [1] = first locale, [2] = second locale, [3] = rest of path (optional, with leading /)
const doubleLocalePattern = new RegExp(`^/${localePattern}/${localePattern}(/.*)?$`)

// Paths that should never be processed by locale normalization
const assetPathPatterns = [
  '/_next',
  '/api',
  '/images',
  '/videos',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/_debug', // Debug routes (DEV-only)
  '/payment', // Payment page (no locale needed)
]

/**
 * Check if a pathname should be excluded from locale normalization
 */
function isAssetPath(pathname: string): boolean {
  // Check for exact matches or paths starting with asset prefixes
  if (assetPathPatterns.some((pattern) => pathname === pattern || pathname.startsWith(`${pattern}/`))) {
    return true
  }
  
  // Check if path has a file extension (e.g., .png, .jpg, .svg, .ico)
  if (pathname.includes('.') && /\.\w+$/.test(pathname.split('/').pop() || '')) {
    return true
  }
  
  return false
}

// Create next-intl middleware
const intlMiddleware = createMiddleware(routing)

export default function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const affiliateRef = parseAffiliateRef(request.nextUrl.searchParams.get('ref'))

  // Block debug routes in production
  if (process.env.NODE_ENV === 'production') {
    if (pathname.startsWith('/api/debug/') || pathname.startsWith('/api/atlantico/debug/')) {
      return NextResponse.json(
        { error: 'Debug endpoints are disabled in production' },
        { status: 404 }
      )
    }
  }

  // Early exit for asset paths - don't process locale normalization
  if (isAssetPath(pathname)) {
    return NextResponse.next()
  }

  // Early exit for debug routes (DEV-only, under [locale] but should bypass i18n processing)
  // Matches: /en/_debug/..., /es/_debug/..., etc.
  if (pathname.includes('/_debug')) {
    return NextResponse.next()
  }

  // Safety net: Detect and fix nested locale paths
  // Examples: /en/es/get-inspired -> /es/get-inspired
  //           /es/es/get-inspired -> /es/get-inspired (duplicate locale fix)
  //           /fr/de -> /de
  //           /es/es -> /es (duplicate locale fix)
  const match = pathname.match(doubleLocalePattern)
  
  if (match) {
    // Extract captured groups:
    // match[1] = first locale (e.g., "en" or "es")
    // match[2] = second locale (e.g., "es" or "es")
    // match[3] = rest of path with leading slash (e.g., "/get-inspired") or undefined
    const firstLocale = match[1]
    const secondLocale = match[2]
    const restPath = match[3] || '' // Rest of the path after second locale
    
    // If both locales are the same (e.g., /es/es), use the first one and remove the duplicate
    // Otherwise, use the second locale (e.g., /en/es -> /es)
    const targetLocale = firstLocale === secondLocale ? firstLocale : secondLocale
    
    // Build canonical path: /{targetLocale}{restPath}
    // Examples:
    //   /en/es/get-inspired -> /es/get-inspired
    //   /es/es/get-inspired -> /es/get-inspired (duplicate removed)
    //   /es/es -> /es (duplicate removed)
    //   /fr/de/must-see -> /de/must-see
    const canonicalPath = `/${targetLocale}${restPath}`
    
    // Clone the request URL and update pathname (preserves query string automatically)
    const url = request.nextUrl.clone()
    url.pathname = canonicalPath
    
    // Log redirect for debugging (server console only)
    if (process.env.NODE_ENV === 'development') {
      console.log('[MW_REDIRECT]', { from: pathname, to: canonicalPath, search, reason: firstLocale === secondLocale ? 'duplicate-locale' : 'nested-locale' })
    }
    
    // Create permanent redirect (308) to canonical path
    // Using 308 instead of 301 to preserve POST method if needed
    const response = NextResponse.redirect(url, 308)
    if (affiliateRef) {
      setAffiliateRefCookie(response, affiliateRef)
    }
    response.headers.set('x-mw-hit', '1')
    response.headers.set('x-mw-redirect', canonicalPath)
    return response
  }

  // Otherwise, use next-intl middleware for normal locale handling
  const response = intlMiddleware(request)
  if (response instanceof NextResponse) {
    if (affiliateRef) {
      setAffiliateRefCookie(response, affiliateRef)
    }
    response.headers.set('x-mw-hit', '1')
  }
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /api/* (API routes)
     * - /_next/* (Next.js internal)
     * - /favicon.ico, /robots.txt, /sitemap.xml (root files)
     * - /images/*, /videos/* (static directories)
     * - /_debug/* or /[locale]/_debug/* (debug routes - DEV-only)
     * - files with extensions (e.g., .png, .jpg, .svg, etc.)
     */
    '/((?!api|_next|favicon\\.ico|robots\\.txt|sitemap\\.xml|images|videos|.*\\..*).*)',
    // Also match root path explicitly
    '/',
  ],
}




