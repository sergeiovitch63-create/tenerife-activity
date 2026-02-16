import { NextRequest, NextResponse } from 'next/server'
import { getBaseUrl } from '@/lib/atlantico/client'

/**
 * DEV-only probe endpoint for Atlantico upstream.
 *
 * GET /api/atlantico/debug/probe?path=/xxx&method=GET|POST
 *
 * Returns:
 * { fullUrl, method, status, contentType, preview }
 */
export async function GET(request: NextRequest) {
  // Block in production
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    )
  }

  const { searchParams } = request.nextUrl
  const path = searchParams.get('path') || '/'
  const methodParam = (searchParams.get('method') || 'GET').toUpperCase()
  const method = methodParam === 'POST' ? 'POST' : 'GET'

  const baseUrl = getBaseUrl().replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const fullUrl = `${baseUrl}${normalizedPath}`

  const controller = new AbortController()
  const timeoutMs = 10_000
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  let status = 0
  let contentType: string | null = null
  let preview = ''

  try {
    const response = await fetch(fullUrl, {
      method,
      signal: controller.signal,
      // No body for now – pure probe
      headers: {
        Accept: '*/*',
      },
    })

    status = response.status
    contentType = response.headers.get('content-type')
    const text = await response.text()
    preview = text.substring(0, 800)
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      preview = `Timeout after ${timeoutMs}ms`
    } else if (error instanceof Error) {
      preview = error.message.substring(0, 800)
    } else {
      preview = 'Unknown error'
    }
  } finally {
    clearTimeout(timeoutId)
  }

  return NextResponse.json(
    {
      fullUrl,
      method,
      status,
      contentType,
      preview,
    },
    { status: 200 }
  )
}












