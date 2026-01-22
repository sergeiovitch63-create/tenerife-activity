import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getAtlanticoConfig } from '@/lib/atlantico/config'
import { fetchAtlantico } from '@/lib/atlantico/fetch'

/**
 * GET /api/atlantico/event/[eventCode]/[lang]
 * 
 * Fetches event details from Atlantico API.
 * 
 * Route parameters:
 * - eventCode: Event code to fetch details for
 * - lang: Language code (e.g., 'ENG', 'ESP')
 * 
 * Proxies to: /eventDetails/{eventCode}/{lang}
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventCode: string; lang: string }> }
) {
  try {
    const { eventCode, lang } = await params
    const config = getAtlanticoConfig()

    // Check configuration
    if (!config.isValid) {
      return NextResponse.json(
        {
          error: 'Configuration error',
          message: config.error || 'Atlantico API configuration is invalid',
        },
        { status: 500 }
      )
    }

    // Validate parameters
    if (!eventCode || !lang) {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          message: 'eventCode and lang are required',
        },
        { status: 400 }
      )
    }

    // Fetch event details
    const response = await fetchAtlantico(
      `/eventDetails/${eventCode}/${lang}`,
      { revalidate: config.revalidateSeconds }
    )

    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error('[Atlantico Event] Error:', error)

    if (error instanceof Error) {
      // Configuration errors
      if (error.message.includes('Atlantico API configuration')) {
        return NextResponse.json(
          {
            error: 'Configuration error',
            message: error.message,
          },
          { status: 500 }
        )
      }

      const { eventCode: errorEventCode, lang: errorLang } = await params
      return NextResponse.json(
        {
          error: 'Failed to fetch event details',
          message: error.message,
          endpoint: `/eventDetails/${errorEventCode}/${errorLang}`,
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

