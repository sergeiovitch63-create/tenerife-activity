/**
 * GET /api/atlantico/backoffice?lang=ENG&fresh=1
 * 
 * Backoffice snapshot API - Returns complete API data structure
 * Based on EXACT PDF pipeline:
 * 1. clasificationList/{language}/{Collaborator}
 * 2. groupsList/{language}/-1/{classification code}
 * 3. groupDetails/{Code}/{language}
 * 4. eventDetails/{Code}/{language}
 * 
 * Query parameters:
 * - lang: Language code (e.g., 'ENG', 'ESP') - defaults to ATLANTICO_LANGUAGE_DEFAULT or 'ENG'
 * - fresh: If "1", bypass cache and force fresh fetch
 * 
 * Returns:
 * {
 *   ok: true,
 *   lang,
 *   collaborator,
 *   office,
 *   classifications: [...],
 *   groupsByClassification: { [classificationCode]: [...] },
 *   groupDetailsByGroupId: { [groupId]: {...} },
 *   eventDetailsByEventId: { [eventId]: {...} },
 *   timings: { classifications, groups, groupDetails, events },
 *   totals: { classifications, groups, events, failures }
 * }
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { atlanticoGet } from '@/lib/atlantico/client'
import { getAtlanticoConfig } from '@/lib/atlantico/config'

interface Classification {
  code: string
  name?: string
  id?: string | number
  [key: string]: unknown
}

interface Group {
  Code?: string
  code?: string
  name?: string
  id?: string | number
  price?: number | string
  duration?: number | string
  ids?: string | number | string[] | number[]
  image?: string
  [key: string]: unknown
}

interface GroupDetails {
  Code: string
  name?: string
  ids?: string[] | number[] | string
  price?: number | string
  image?: string
  desc?: string
  [key: string]: unknown
}

interface EventDetails {
  Code: string
  name?: string
  title?: string
  days?: unknown
  times?: unknown
  pProd?: unknown
  route?: unknown
  icons?: unknown
  desc?: string
  description?: string
  [key: string]: unknown
}

// Simple in-memory cache for backoffice (separate from sync cache)
const backofficeCache = new Map<string, { data: unknown; timestamp: number }>()
const BACKOFFICE_CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

/**
 * Concurrency limiter (max 6)
 */
async function mapLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  let index = 0
  const running: Promise<void>[] = []

  async function runNext(): Promise<void> {
    if (index >= items.length) {
      return
    }

    const item = items[index++]
    const promise = fn(item)
      .catch((error) => {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[BACKOFFICE] mapLimit error:', error)
        }
      })
      .then(() => runNext())

    running.push(promise)
  }

  for (let i = 0; i < Math.min(limit, items.length); i++) {
    runNext()
  }

  await Promise.all(running)
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const timings = {
    classifications: 0,
    groups: 0,
    groupDetails: 0,
    events: 0,
  }
  const totals = {
    classifications: 0,
    groups: 0,
    events: 0,
    failures: 0,
  }

  try {
    const { searchParams } = request.nextUrl
    const lang = searchParams.get('lang') || process.env.ATLANTICO_LANGUAGE_DEFAULT || 'ENG'
    const collaborator = process.env.ATLANTICO_COLLABORATOR || '12056'
    const office = process.env.ATLANTICO_OFFICE || '12056'
    const fresh = searchParams.get('fresh') === '1'

    // Validate lang
    if (!lang || typeof lang !== 'string') {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid lang parameter',
        },
        { status: 400 }
      )
    }

    // Check cache (unless fresh)
    if (!fresh) {
      const cached = backofficeCache.get(lang)
      if (cached) {
        const age = Date.now() - cached.timestamp
        if (age < BACKOFFICE_CACHE_TTL_MS) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[BACKOFFICE] Cache hit:', { lang, age: `${Math.round(age / 1000)}s` })
          }
          return NextResponse.json(cached.data as { ok: boolean })
        }
      }
    }

    const config = getAtlanticoConfig()

    if (!config.isValid) {
      return NextResponse.json(
        {
          ok: false,
          error: config.error || 'Atlantico API configuration is invalid',
        },
        { status: 500 }
      )
    }

    // STEP 1: clasificationList/{language}/{Collaborator}
    const step1Start = Date.now()
    let classifications: Classification[] = []
    try {
      classifications = await atlanticoGet<Classification[]>(
        `/clasificationList/${lang}/${collaborator}`
      )
      if (!Array.isArray(classifications)) {
        throw new Error('Invalid response from clasificationList: expected array')
      }
      totals.classifications = classifications.length
    } catch (error) {
      totals.failures++
      if (process.env.NODE_ENV !== 'production') {
        console.error('[BACKOFFICE] clasificationList failed:', error)
      }
    }
    timings.classifications = Date.now() - step1Start

    const groupsByClassification: Record<string, Group[]> = {}
    const groupDetailsByGroupId: Record<string, GroupDetails> = {}
    const eventDetailsByEventId: Record<string, EventDetails> = {}

    // STEP 2: groupsList/{language}/-1/{classification id}
    // PDF: "classification code = Id de la Classification list value"
    // So we use classification.id (not classification.code)
    const step2Start = Date.now()
    await mapLimit(classifications, 6, async (classification) => {
      // Use classification.id as per PDF specification
      const classificationId = classification.id !== undefined ? String(classification.id) : null
      if (!classificationId) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[BACKOFFICE] Classification missing id:', classification)
        }
        return
      }

      try {
        const groups = await atlanticoGet<Group[]>(
          `/groupsList/${lang}/-1/${classificationId}`
        )

        if (Array.isArray(groups)) {
          // Use String(classification.id) as key (exact match with PDF)
          const key = String(classification.id)
          groupsByClassification[key] = groups
          totals.groups += groups.length
          
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[BACKOFFICE] groupsList for classification.id=${classificationId}:`, {
              groupsCount: groups.length,
              firstGroup: groups[0] ? { Code: groups[0].Code, id: groups[0].id, name: groups[0].name } : null,
            })
          }
        }
      } catch (error) {
        totals.failures++
        if (process.env.NODE_ENV !== 'production') {
          console.error(`[BACKOFFICE] groupsList failed for classification.id=${classificationId}:`, error)
        }
      }
    })
    timings.groups = Date.now() - step2Start

    const classificationIdFilter = searchParams.get('classificationId')

    // STEP 3: groupDetails/{Code}/{language}
    // PDF: groupDetails/{Code}/{language} - Code is the GROUP CODE (not id unless id==Code)
    const step3Start = Date.now()
    const allGroups: Group[] = []
    if (classificationIdFilter && groupsByClassification[classificationIdFilter]) {
      allGroups.push(...groupsByClassification[classificationIdFilter])
    } else {
      for (const groups of Object.values(groupsByClassification)) {
        allGroups.push(...groups)
      }
    }

    await mapLimit(allGroups, 6, async (group) => {
      // Resolve groupCode: Priority: Code > code > id (only if string/number matches code shape)
      let groupCodeUsed: string | null = null
      
      if (typeof group.Code === 'string' && group.Code) {
        groupCodeUsed = group.Code
      } else if (typeof group.code === 'string' && group.code) {
        groupCodeUsed = group.code
      } else if (group.id !== undefined && group.id !== null) {
        // Fallback to id only if it's string/number and reasonably looks like a code
        const idStr = String(group.id).trim()
        if (idStr && idStr.length < 50 && /^[a-zA-Z0-9_-]+$/.test(idStr)) {
          groupCodeUsed = idStr
        }
      }

      if (!groupCodeUsed) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[BACKOFFICE] Group missing valid Code/code/id:', group)
        }
        return
      }

      try {
        const groupDetails = await atlanticoGet<GroupDetails>(
          `/groupDetails/${groupCodeUsed}/${lang}`
        )

        if (groupDetails && typeof groupDetails === 'object') {
          // Store with multiple keys for flexible lookup
          const keysToStore: string[] = []
          
          // Store by group.id if present
          if (group.id !== undefined) {
            keysToStore.push(String(group.id))
          }
          
          // Store by groupCodeUsed (the code we used for the API call)
          keysToStore.push(groupCodeUsed)
          
          // Store by group.Code if different
          if (group.Code && String(group.Code) !== groupCodeUsed) {
            keysToStore.push(String(group.Code))
          }
          
          // Store by group.code if different
          if (group.code && String(group.code) !== groupCodeUsed && String(group.code) !== String(group.Code)) {
            keysToStore.push(String(group.code))
          }
          
          // Store by groupDetails.Code if present and different
          if (groupDetails.Code && typeof groupDetails.Code === 'string' && !keysToStore.includes(groupDetails.Code)) {
            keysToStore.push(groupDetails.Code)
          }

          // Store in all keys
          for (const key of keysToStore) {
            groupDetailsByGroupId[key] = groupDetails
          }

          if (process.env.NODE_ENV !== 'production') {
            console.log(`[BACKOFFICE] groupDetails stored:`, {
              groupId: group.id,
              groupCodeUsed,
              storedKeys: keysToStore,
              groupDetailsCode: groupDetails.Code,
            })
          }
        }
      } catch (error) {
        totals.failures++
        if (process.env.NODE_ENV !== 'production') {
          console.error(`[BACKOFFICE] groupDetails failed for groupCode=${groupCodeUsed}:`, error)
        }
      }
    })
    timings.groupDetails = Date.now() - step3Start

    // STEP 4: eventDetails/{Code}/{language}
    const step4Start = Date.now()
    const allEventIds: string[] = []
    
    // DEV: Log first groupDetails sample to inspect structure
    if (process.env.NODE_ENV !== 'production' && Object.keys(groupDetailsByGroupId).length > 0) {
      const firstGroupDetailsKey = Object.keys(groupDetailsByGroupId)[0]
      const firstGroupDetails = groupDetailsByGroupId[firstGroupDetailsKey]
      console.log('[BACKOFFICE] First groupDetails sample:', {
        key: firstGroupDetailsKey,
        keys: Object.keys(firstGroupDetails),
        hasIds: 'ids' in firstGroupDetails,
        idsValue: firstGroupDetails.ids,
        idsType: typeof firstGroupDetails.ids,
        hasEvents: 'events' in firstGroupDetails,
        hasEvent: 'event' in firstGroupDetails,
        hasEventIds: 'eventIds' in firstGroupDetails,
        hasEventos: 'eventos' in firstGroupDetails,
        sample: JSON.stringify(firstGroupDetails).substring(0, 500),
      })
    }
    
    /**
     * Extract event IDs from group.ids (format ",184,546") or groupDetails.ids
     * Priority: group.ids > groupDetails.ids
     */
    function extractEventIdsFromString(idsValue: string | number | string[] | number[] | undefined): string[] {
      const eventIds: string[] = []
      
      if (idsValue === undefined || idsValue === null) {
        return eventIds
      }
      
      // If array, convert to string
      if (Array.isArray(idsValue)) {
        for (const id of idsValue) {
          const idStr = String(id).trim()
          if (idStr && !eventIds.includes(idStr)) {
            eventIds.push(idStr)
          }
        }
        return eventIds
      }
      
      // If string, parse format ",184,546" or "184,546" or "184"
      const idsStr = String(idsValue).trim()
      if (!idsStr) {
        return eventIds
      }
      
      // Split by comma and filter empty
      const parts = idsStr.split(',').map(s => s.trim()).filter(Boolean)
      for (const part of parts) {
        if (part && !eventIds.includes(part)) {
          eventIds.push(part)
        }
      }
      
      return eventIds
    }
    
    /**
     * Extract event IDs ONLY from groupDetails.ids (PDF usage + user requirement)
     */
    function extractEventIdsFromGroupDetails(groupDetails: GroupDetails): string[] {
      if (groupDetails.ids === undefined) return []
      return extractEventIdsFromString(groupDetails.ids)
    }
    
    // Extract eventIds from groups (priority) and groupDetails (fallback)
    for (const group of allGroups) {
      // Priority: extract from group.ids if present
      if (group.ids !== undefined) {
        const extracted = extractEventIdsFromString(group.ids)
        for (const eventId of extracted) {
          if (!allEventIds.includes(eventId)) {
            allEventIds.push(eventId)
          }
        }
      }
    }
    
    // Fallback: extract from groupDetails if group.ids was not available
    for (const groupDetails of Object.values(groupDetailsByGroupId)) {
      const extractedIds = extractEventIdsFromGroupDetails(groupDetails)
      for (const eventId of extractedIds) {
        if (!allEventIds.includes(eventId)) {
          allEventIds.push(eventId)
        }
      }
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('[BACKOFFICE] Extracted event IDs:', {
        totalUniqueEventIds: allEventIds.length,
        sampleEventIds: allEventIds.slice(0, 10),
      })
    }

    await mapLimit(allEventIds, 6, async (eventId) => {
      try {
        const eventDetails = await atlanticoGet<EventDetails>(
          `/eventDetails/${eventId}/${lang}`
        )

        if (eventDetails && typeof eventDetails === 'object') {
          eventDetailsByEventId[eventId] = eventDetails
          totals.events++
        }
      } catch (error) {
        totals.failures++
        if (process.env.NODE_ENV !== 'production') {
          console.error(`[BACKOFFICE] eventDetails failed for ${eventId}:`, error)
        }
      }
    })
    timings.events = Date.now() - step4Start

    // DEV: Log structure for debugging
    if (process.env.NODE_ENV !== 'production') {
      const firstClassification = classifications.length > 0 ? classifications[0] : null
      const firstGroupsKey = Object.keys(groupsByClassification)[0] || null
      console.log('[BACKOFFICE] Data structure:', {
        resultKeys: ['ok', 'lang', 'collaborator', 'office', 'classifications', 'groupsByClassification', 'groupDetailsByGroupId', 'eventDetailsByEventId', 'timings', 'totals'],
        firstClassification: firstClassification,
        firstClassificationId: firstClassification?.id,
        firstClassificationCode: firstClassification?.code,
        firstClassificationKeys: firstClassification ? Object.keys(firstClassification) : [],
        firstGroupsByClassificationKey: firstGroupsKey,
        firstGroupsByClassificationLength: firstGroupsKey 
          ? groupsByClassification[firstGroupsKey]?.length || 0 
          : 0,
        groupsByClassificationKeys: Object.keys(groupsByClassification).slice(0, 10),
        firstGroupDetailsKey: Object.keys(groupDetailsByGroupId)[0] || null,
        firstGroupDetailsSample: Object.keys(groupDetailsByGroupId).length > 0 
          ? groupDetailsByGroupId[Object.keys(groupDetailsByGroupId)[0]] 
          : null,
        firstGroupDetailsKeys: Object.keys(groupDetailsByGroupId).length > 0 
          ? Object.keys(groupDetailsByGroupId[Object.keys(groupDetailsByGroupId)[0]]) 
          : [],
      })
    }

    const result = {
      ok: true,
      lang,
      collaborator,
      office,
      classifications,
      groupsByClassification,
      groupDetailsByGroupId,
      // Alias (for clarity in UI/debugging)
      groupDetailsByKey: groupDetailsByGroupId,
      eventDetailsByEventId,
      timings,
      totals,
    }

    // Cache the result
    backofficeCache.set(lang, {
      data: result,
      timestamp: Date.now(),
    })

    if (process.env.NODE_ENV !== 'production') {
      console.log('[BACKOFFICE] Completed:', {
        lang,
        duration: `${Date.now() - startTime}ms`,
        timings,
        totals,
      })
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': fresh ? 'no-cache' : 'public, s-maxage=600, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error('[BACKOFFICE] Error:', error)

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timings,
        totals,
      },
      { status: 500 }
    )
  }
}

