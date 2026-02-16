/**
 * GET /api/debug/all-groupdetails
 * 
 * DEV-only endpoint that returns ALL groupDetails with complete structure
 * Shows every field and endpoint available in groupDetails responses
 */

import { NextRequest, NextResponse } from 'next/server'
import { atlanticoGet } from '@/lib/atlantico/client'

// DEV-only guard - check at runtime, not at import time
function checkDevOnly() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('This endpoint is DEV-only')
  }
}

interface GroupDetailsAnalysis {
  groupId: string
  groupCode: string
  groupName: string
  rawData: any
  allKeys: string[]
  allValues: Record<string, any>
  imageFields: Array<{ key: string; value: any; type: string }>
  eventIds: string[]
  eventCodes: string[]
  fieldTypes: Record<string, string>
  fieldExamples: Record<string, any>
}

export async function GET(request: NextRequest) {
  checkDevOnly()
  try {
    // Fetch backoffice data with fresh=1 to bypass cache and get ALL groups
    const backofficeResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/atlantico/backoffice?lang=ENG&fresh=1`)
    if (!backofficeResponse.ok) {
      throw new Error('Failed to fetch backoffice data')
    }
    const backofficeData = await backofficeResponse.json()

    console.log('[DEBUG_ALL_GROUPDETAILS] Backoffice data:', {
      classifications: backofficeData.classifications?.length || 0,
      groupsByClassification: Object.keys(backofficeData.groupsByClassification || {}).length,
      totalGroupsInClassifications: Object.values(backofficeData.groupsByClassification || {}).reduce((sum: number, groups: any) => sum + (Array.isArray(groups) ? groups.length : 0), 0),
      groupDetailsCount: Object.keys(backofficeData.groupDetailsByGroupId || {}).length,
      totals: backofficeData.totals,
    })

    // Get groupDetails
    const groupDetailsMap = backofficeData.groupDetailsByGroupId || {}
    const groupDetailsList = Object.entries(groupDetailsMap)

    console.log('[DEBUG_ALL_GROUPDETAILS] Processing', groupDetailsList.length, 'groups')

    const groupsData: GroupDetailsAnalysis[] = []

    for (const [groupId, groupDetailsRaw] of groupDetailsList) {
      try {
        const groupDetails = groupDetailsRaw as Record<string, unknown>
        const groupCode = (groupDetails?.code as string) || (groupDetails?.Code as string) || groupId
        const groupName = (groupDetails?.name as string) || (groupDetails?.title as string) || 'Sans nom'

        // Extract all keys
        const allKeys = Object.keys(groupDetails || {}).sort()

        // Extract all values with types
        const allValues: Record<string, any> = {}
        const fieldTypes: Record<string, string> = {}
        const fieldExamples: Record<string, any> = {}

        allKeys.forEach(key => {
          const value = groupDetails[key]
          allValues[key] = value
          fieldTypes[key] = typeof value
          
          // Store example (truncate if too long)
          if (value !== null && value !== undefined) {
            if (typeof value === 'string' && value.length > 100) {
              fieldExamples[key] = value.substring(0, 100) + '...'
            } else if (Array.isArray(value) && value.length > 5) {
              fieldExamples[key] = value.slice(0, 5)
            } else {
              fieldExamples[key] = value
            }
          }
        })

        // Extract image-related fields
        const imageFields: Array<{ key: string; value: any; type: string }> = []
        const imageKeys = ['image', 'imageUrl', 'imageFilename', 'img', 'photo', 'picture', 'cover', 'fotos', 'foto', 'imagen', 'imagenes', 'thumbnail', 'images']
        imageKeys.forEach(key => {
          if (groupDetails && key in groupDetails) {
            imageFields.push({
              key,
              value: groupDetails[key],
              type: typeof groupDetails[key],
            })
          }
        })

        // Extract event IDs
        const ids = groupDetails?.ids
        let eventIds: string[] = []
        let eventCodes: string[] = []

        if (typeof ids === 'string') {
          eventIds = ids.split(',').map(id => id.trim()).filter(id => id && id !== '')
        } else if (Array.isArray(ids)) {
          eventIds = ids.map(id => String(id).trim()).filter(id => id && id !== '')
        }

        // Also check events array if available
        if (Array.isArray(groupDetails?.events)) {
          eventCodes = (groupDetails.events as unknown[]).map((e: unknown) => String(e).trim()).filter((e: string) => e && e !== '')
        }

        groupsData.push({
          groupId: String(groupId),
          groupCode: String(groupCode),
          groupName: String(groupName),
          rawData: groupDetails,
          allKeys,
          allValues,
          imageFields,
          eventIds,
          eventCodes,
          fieldTypes,
          fieldExamples,
        })
      } catch (err) {
        console.error(`[DEBUG_ALL_GROUPDETAILS] Error processing group ${groupId}:`, err)
      }
    }

    // Sort by groupCode
    groupsData.sort((a, b) => {
      const codeA = parseInt(a.groupCode) || 0
      const codeB = parseInt(b.groupCode) || 0
      return codeA - codeB
    })

    // Summary statistics
    const summary = {
      totalGroups: groupsData.length,
      groupsWithImage: groupsData.filter(g => g.imageFields.some(f => f.key === 'image')).length,
      groupsWithEventIds: groupsData.filter(g => g.eventIds.length > 0).length,
      groupsWithEventCodes: groupsData.filter(g => g.eventCodes.length > 0).length,
      allUniqueKeys: Array.from(new Set(groupsData.flatMap(g => g.allKeys))).sort(),
      commonKeys: groupsData.length > 0 
        ? groupsData[0].allKeys.filter(key => 
            groupsData.every(g => g.allKeys.includes(key))
          )
        : [],
    }

    return NextResponse.json({
      summary,
      groups: groupsData,
    })
  } catch (error) {
    console.error('[DEBUG_ALL_GROUPDETAILS] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch groupDetails',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

