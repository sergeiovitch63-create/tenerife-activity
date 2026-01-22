import createMiddleware from 'next-intl/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { locales } from './src/i18n/request'

// Locale codes for regex matching
const localeCodes = ['en', 'es', 'de', 'fr', 'it', 'ru', 'pl']
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
  // Note: /_debug is handled by rewrite patterns below, not excluded here
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
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always',
})

export default function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // Early exit for asset paths - don't process locale normalization
  if (isAssetPath(pathname)) {
    return NextResponse.next()
  }

  // Rewrite legacy debug routes to canonical /:locale/debug/:path* structure
  // Must happen BEFORE next-intl middleware to ensure proper locale handling
  // Official route: /:locale/debug/:path* (e.g., /en/debug/atlantico)
  // Legacy routes supported via rewrite:
  
  // Pattern 1: /_debug/:locale/:path* -> /:locale/debug/:path*
  // Example: /_debug/en/atlantico -> /en/debug/atlantico
  const legacyDebugPattern1 = new RegExp(`^/_debug/${localePattern}(/.*)?$`)
  const legacyDebugMatch1 = pathname.match(legacyDebugPattern1)
  
  if (legacyDebugMatch1) {
    const locale = legacyDebugMatch1[1]
    const rest = legacyDebugMatch1[2] || ''
    const rewrittenPath = `/${locale}/debug${rest}`
    
    // Create new URL for rewrite
    const rewrittenUrl = new URL(rewrittenPath, request.url)
    
    // Log rewrite for debugging (server console only)
    if (process.env.NODE_ENV === 'development') {
      console.log('[MW_REWRITE]', { from: pathname, to: rewrittenPath, pattern: 'legacy /_debug/:locale/:path*' })
    }
    
    // Return rewritten response (rewrite, not redirect, to preserve URL in browser)
    return NextResponse.rewrite(rewrittenUrl)
  }

  // Pattern 2: /debug/:locale/:path* -> /:locale/debug/:path*
  // Example: /debug/en/atlantico -> /en/debug/atlantico
  const legacyDebugPattern2 = new RegExp(`^/debug/${localePattern}(/.*)?$`)
  const legacyDebugMatch2 = pathname.match(legacyDebugPattern2)
  
  if (legacyDebugMatch2) {
    const locale = legacyDebugMatch2[1]
    const rest = legacyDebugMatch2[2] || ''
    const rewrittenPath = `/${locale}/debug${rest}`
    
    // Create new URL for rewrite
    const rewrittenUrl = new URL(rewrittenPath, request.url)
    
    // Log rewrite for debugging (server console only)
    if (process.env.NODE_ENV === 'development') {
      console.log('[MW_REWRITE]', { from: pathname, to: rewrittenPath, pattern: 'legacy /debug/:locale/:path*' })
    }
    
    // Return rewritten response (rewrite, not redirect, to preserve URL in browser)
    return NextResponse.rewrite(rewrittenUrl)
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
    response.headers.set('x-mw-hit', '1')
    response.headers.set('x-mw-redirect', canonicalPath)
    return response
  }

  // Otherwise, use next-intl middleware for normal locale handling
  const response = intlMiddleware(request)
  if (response instanceof NextResponse) {
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
     * - files with extensions (e.g., .png, .jpg, .svg, etc.)
     * 
     * Debug routes /[locale]/debug/* are handled normally by next-intl
     * Legacy routes /_debug/:locale/:path* and /debug/:locale/:path* are rewritten to /[locale]/debug/:path*
     * Static files (favicon.ico, robots.txt, etc.) are excluded by extension pattern
     */
    '/((?!api|_next|.*\\..*).*)',
    // Also match root path explicitly
    '/',
  ],
}




