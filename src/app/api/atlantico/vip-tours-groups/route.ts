/**
 * API Route to get all VIP Tours groups (classification 308)
 */

import { NextResponse } from 'next/server'

// Mark route as dynamic (fetches from internal API)
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Extract VIP Tours from backoffice data
 */
function extractVipTours(data: any): any[] {
  if (!data || !data.groupsByClassification) {
    return []
  }

  // Find VIP Tours classification (308 or 1750147182)
  const vipToursClassification = Object.keys(data.groupsByClassification).find((key: string) => {
    const classification = data.classifications?.find((c: any) => String(c.id) === key)
    return classification && (
      String(classification.id) === '308' || 
      String(classification.id) === '1750147182' ||
      String(classification.code) === '308'
    )
  })

  let vipTours: any[] = []
  
  if (vipToursClassification && data.groupsByClassification[vipToursClassification]) {
    vipTours = data.groupsByClassification[vipToursClassification]
  } else {
    // Fallback: search in all groups
    for (const groups of Object.values(data.groupsByClassification) as any[][]) {
      if (Array.isArray(groups)) {
        vipTours.push(...groups.filter((g: any) => {
          const category = String(g.category || '')
          return category === '308' || category === '1750147182'
        }))
      }
    }
  }

  return vipTours
}

export async function GET() {
  try {
    // Fetch from backoffice API
    // During build, NEXT_PUBLIC_BASE_URL might not be set
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || 'http://localhost:3000'
    
    // Try to fetch from backoffice API
    // Use catch to handle build-time errors gracefully
    const response = await fetch(`${baseUrl}/api/atlantico/backoffice?lang=ENG`, {
      cache: 'no-store', // Use no-store for dynamic routes
    }).catch((fetchError) => {
      // During build, if fetch fails, return empty response
      if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
        console.warn('[VIP_TOURS_GROUPS] Fetch failed during build:', fetchError)
        return null
      }
      // Re-throw in runtime
      throw fetchError
    })
    
    if (!response || !response.ok) {
      return NextResponse.json({ 
        success: false, 
        groups: [],
        error: 'Backoffice API unavailable' 
      })
    }
    
    const data = await response.json()
    
    if (!data || !data.groupsByClassification) {
      return NextResponse.json({ 
        success: false, 
        groups: [],
        error: 'No groups found in backoffice response' 
      })
    }

    const vipTours = extractVipTours(data)

    return NextResponse.json({
      success: true,
      groups: vipTours,
      count: vipTours.length,
    })
  } catch (error) {
    console.error('[VIP_TOURS_GROUPS] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        groups: [],
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

