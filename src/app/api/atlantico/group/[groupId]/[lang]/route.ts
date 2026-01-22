import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { atlanticoGet } from '@/lib/atlantico/client'
import { getAtlanticoConfig } from '@/lib/atlantico/config'

/**
 * GET /api/atlantico/group/[groupId]/[lang]
 * 
 * Fetches group details from Atlantico API.
 * 
 * Route parameters:
 * - groupId: Group ID to fetch details for
 * - lang: Language code (e.g., 'ENG', 'ESP')
 * 
 * Proxies to: /groupDetails/{groupId}/{lang}
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; lang: string }> }
) {
  try {
    const { groupId, lang } = await params
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
    if (!groupId || !lang) {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          message: 'groupId and lang are required',
        },
        { status: 400 }
      )
    }

    // Fetch group details using unified client
    const data = await atlanticoGet(`/groupDetails/${groupId}/${lang}`)

    return NextResponse.json(data)
  } catch (error) {
    console.error('[Atlantico Group] Error:', error)

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

      const { groupId: errorGroupId, lang: errorLang } = await params
      return NextResponse.json(
        {
          error: 'Failed to fetch group details',
          message: error.message,
          endpoint: `/groupDetails/${errorGroupId}/${errorLang}`,
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

