/**
 * API Route to get all VIP Tours groups (classification 308)
 */

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Fetch from backoffice API
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/atlantico/backoffice?lang=ENG`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    })
    
    if (!response.ok) {
      throw new Error(`Backoffice API returned ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data || !data.groupsByClassification) {
      return NextResponse.json({ 
        success: false, 
        groups: [],
        error: 'No groups found in backoffice response' 
      })
    }

    // Find VIP Tours classification (308 or 1750147182)
    const vipToursClassification = Object.keys(data.groupsByClassification).find((key: string) => {
      // Check if this classification has VIP Tours
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

