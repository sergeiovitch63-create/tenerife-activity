import 'server-only'
import { headers } from 'next/headers'

/**
 * Returns the public site URL for the current request (no trailing slash).
 *
 * Detection order:
 *   1. `host` + `x-forwarded-proto` headers (works for localhost, Vercel preview,
 *      Vercel production, custom domain, etc.).
 *   2. Fallback: `NEXT_PUBLIC_SITE_URL` env var.
 *   3. Last-resort: hard-coded production URL.
 *
 * Use this anywhere we need to build an absolute URL (e.g. magic links,
 * share URLs) so they point at whatever host the user is actually browsing.
 */
export function getSiteUrl(): string {
  const h = headers()
  const host = h.get('host')
  if (host) {
    const isLocalhost = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)
    const proto = h.get('x-forwarded-proto') || (isLocalhost ? 'http' : 'https')
    return `${proto}://${host}`
  }
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ||
    'https://www.tenerife-activity.com'
  )
}
