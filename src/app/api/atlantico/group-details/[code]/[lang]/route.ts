/**
 * GET /api/atlantico/group-details/[code]/[lang]
 * 
 * Fetches group details from Atlantico API using group code (not ID).
 * This is for tour detail pages.
 * 
 * Route parameters:
 * - code: Group code (tour code)
 * - lang: Language code (e.g., 'ENG', 'ESP')
 * 
 * Proxies to: /groupDetails/{code}/{lang}
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getAtlanticoConfig } from '@/lib/atlantico/config'
import { fetchAtlantico } from '@/lib/atlantico/fetch'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; lang: string }> }
) {
  try {
    const { code, lang } = await params
    const config = getAtlanticoConfig()

    if (!config.isValid) {
      return NextResponse.json(
        {
          error: 'Configuration error',
          message: config.error || 'Atlantico API configuration is invalid',
        },
        { status: 500 }
      )
    }

    if (!code || !lang) {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          message: 'code and lang are required',
        },
        { status: 400 }
      )
    }

    // Fetch group details
    const response = await fetchAtlantico(
      `/groupDetails/${code}/${lang}`,
      { revalidate: 3600 } // Cache 1 hour
    )

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Failed to fetch group details',
          message: `HTTP ${response.status}: ${response.statusText}`,
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    // DEV log
    if (process.env.NODE_ENV === 'development') {
      console.log('[GROUP_DETAILS]', {
        code,
        lang,
        hasData: !!data,
        hasIds: !!(data as any)?.ids,
      })
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600', // 1 hour cache
      },
    })
  } catch (error) {
    console.error('[GROUP_DETAILS] Error:', error)

    if (error instanceof Error) {
      if (error.message.includes('Atlantico API configuration')) {
        return NextResponse.json(
          {
            error: 'Configuration error',
            message: error.message,
          },
          { status: 500 }
        )
      }

      const { code: errorCode, lang: errorLang } = await params
      return NextResponse.json(
        {
          error: 'Failed to fetch group details',
          message: error.message,
          endpoint: `/groupDetails/${errorCode}/${errorLang}`,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}


























