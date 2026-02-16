/**
 * GET /api/debug/classification-groups?classificationId=<id>&lang=ENG
 * 
 * DEV-only endpoint that returns all groups and their groupDetails for a specific classification
 */

import { NextRequest, NextResponse } from 'next/server'
import { atlanticoGet } from '@/lib/atlantico/client'

// DEV-only guard
if (process.env.NODE_ENV === 'production') {
  throw new Error('This endpoint is DEV-only')
}

interface GroupDetailsAnalysis {
  groupId: string
  groupCode: string
  groupName: string
  rawData: any
  allKeys: string[]
  imageFields: Array<{ key: string; value: any; type: string }>
  eventIds: string[]
  eventCodes: string[]
  status: 'success' | 'error'
  error?: string
  groupCodeUsed?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const classificationId = searchParams.get('classificationId')
    const lang = searchParams.get('lang') || 'ENG'

    if (!classificationId) {
      return NextResponse.json(
        {
          error: 'Missing classificationId',
          message: 'classificationId query parameter is required',
        },
        { status: 400 }
      )
    }

    // Step 1: Fetch groups for this classification
    const groups = await atlanticoGet<any[]>(
      `/groupsList/${lang}/-1/${classificationId}`
    )

    if (!Array.isArray(groups)) {
      return NextResponse.json(
        {
          error: 'Invalid response',
          message: 'groupsList did not return an array',
        },
        { status: 500 }
      )
    }

    console.log(`[DEBUG_CLASSIFICATION_GROUPS] Found ${groups.length} groups for classification ${classificationId}`)

    // Step 2: Fetch groupDetails for each group
    const groupsData: GroupDetailsAnalysis[] = []

    for (const group of groups) {
      // Resolve groupCode
      let groupCodeUsed: string | null = null
      
      if (typeof group.Code === 'string' && group.Code) {
        groupCodeUsed = group.Code
      } else if (typeof group.code === 'string' && group.code) {
        groupCodeUsed = group.code
      } else if (group.id !== undefined && group.id !== null) {
        const idStr = String(group.id).trim()
        if (idStr && idStr.length < 50 && /^[a-zA-Z0-9_-]+$/.test(idStr)) {
          groupCodeUsed = idStr
        }
      }

      const groupId = String(group.id || groupCodeUsed || '')
      const groupCode = String(group.Code || group.code || group.id || '')
      const groupName = String(group.name || 'Sans nom')

      if (!groupCodeUsed) {
        groupsData.push({
          groupId,
          groupCode,
          groupName,
          rawData: null,
          allKeys: [],
          imageFields: [],
          eventIds: [],
          eventCodes: [],
          status: 'error',
          error: 'Missing valid Code/code/id',
        })
        continue
      }

      // Try to fetch groupDetails
      try {
        const groupDetails = await atlanticoGet<any>(
          `/groupDetails/${groupCodeUsed}/${lang}`
        )

        if (groupDetails && typeof groupDetails === 'object') {
          // Extract all keys
          const allKeys = Object.keys(groupDetails).sort()

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

          if (Array.isArray(groupDetails?.events)) {
            eventCodes = groupDetails.events.map((e: any) => String(e).trim()).filter((e: string) => e && e !== '')
          }

          groupsData.push({
            groupId,
            groupCode,
            groupName,
            rawData: groupDetails,
            allKeys,
            imageFields,
            eventIds,
            eventCodes,
            status: 'success',
            groupCodeUsed,
          })
        } else {
          groupsData.push({
            groupId,
            groupCode,
            groupName,
            rawData: null,
            allKeys: [],
            imageFields: [],
            eventIds: [],
            eventCodes: [],
            status: 'error',
            error: 'Invalid groupDetails response',
            groupCodeUsed,
          })
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        groupsData.push({
          groupId,
          groupCode,
          groupName,
          rawData: null,
          allKeys: [],
          imageFields: [],
          eventIds: [],
          eventCodes: [],
          status: 'error',
          error: `API error: ${errorMessage}`,
          groupCodeUsed,
        })
      }
    }

    // Summary
    const summary = {
      classificationId,
      totalGroups: groups.length,
      successGroups: groupsData.filter(g => g.status === 'success').length,
      errorGroups: groupsData.filter(g => g.status === 'error').length,
      groupsWithImage: groupsData.filter(g => g.imageFields.length > 0).length,
      groupsWithEvents: groupsData.filter(g => g.eventIds.length > 0 || g.eventCodes.length > 0).length,
    }

    return NextResponse.json({
      summary,
      groups: groupsData,
    })
  } catch (error) {
    console.error('[DEBUG_CLASSIFICATION_GROUPS] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch classification groups',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

