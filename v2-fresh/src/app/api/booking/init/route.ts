import { NextRequest, NextResponse } from 'next/server'

/**
 * Server-side pass-through to Atlantico /payment/.
 * Accepts a form-urlencoded POST (from the checkout form) and pipes the
 * Atlantico response (302 redirect to Redsys OR HTML with auto-submit form)
 * back to the browser natively — no JS handling on the client.
 */
export async function POST(req: NextRequest) {
  const BASE = process.env.ATLANTICO_PROXY_URL ?? process.env.ATLANTICO_BASE_URL ?? 'https://api.tenerife-activity.com'
  const COLLABORATOR = process.env.ATLANTICO_USER_ID ?? '3645'

  // Forward the body as-is, ensuring userId is present
  const raw = await req.text()
  const params = new URLSearchParams(raw)
  if (!params.get('userId')) params.set('userId', COLLABORATOR)

  const upstream = await fetch(`${BASE}/payment/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      Accept: 'text/html,application/xhtml+xml,application/json',
    },
    body: params.toString(),
    redirect: 'manual',
    cache: 'no-store',
  })

  // Case 1: upstream redirects — forward the redirect to the browser
  const location = upstream.headers.get('location')
  if (location) {
    return NextResponse.redirect(location, { status: 303 })
  }

  // Case 2: upstream returns HTML (e.g. auto-submit form to Redsys) — pipe it through
  const contentType = upstream.headers.get('content-type') ?? 'text/html; charset=utf-8'
  const body = await upstream.text()

  return new NextResponse(body, {
    status: upstream.ok ? 200 : upstream.status,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
    },
  })
}
