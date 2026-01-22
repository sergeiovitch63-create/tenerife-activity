/**
 * GET /api/atlantico/debug/gomera-limits-dump
 * 
 * Truth dump endpoint for diagnosing Gomera VIP Tour availability via loadLimits.
 * Tests eventIds 2748 and 2749 with various language codes to find which combination
 * returns actual availability data.
 * 
 * Query parameters:
 * - monthStart (required): YYYY-MM-01 format
 * - lang (optional): Default "EN"
 * - forceLangs (optional boolean): If true, retry with other langs if empty response. Default true.
 * - eventId (optional): If provided, test only this eventId instead of both 2748 and 2749
 * 
 * Returns:
 * - Structured JSON with all attempts and best result for each eventId
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { fetchAtlantico } from '@/lib/atlantico/fetch'
import { normalizeLimits } from '@/lib/atlantico/limits-normalizer'

interface AttemptResult {
  lang: string
  monthStart: string
  httpStatus?: number
  rawKeys: string[]
  datesCount: number
  sessionsCount: number
  raw: any
  normalized?: ReturnType<typeof normalizeLimits>
  stats?: ReturnType<typeof normalizeLimits>['stats']
  error?: string
}

interface EventResult {
  eventId: string
  attempts: AttemptResult[]
  best: AttemptResult | null
}

export async function GET(request: NextRequest) {
  // DEV only - block in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'This endpoint is only available in development' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const monthStartParam = searchParams.get('monthStart')?.trim()
  const langParam = searchParams.get('lang')?.trim() || 'EN'
  const forceLangsParam = searchParams.get('forceLangs')
  const eventIdParam = searchParams.get('eventId')?.trim()

  // Validate monthStart format (YYYY-MM-01)
  if (!monthStartParam || !/^\d{4}-\d{2}-01$/.test(monthStartParam)) {
    return NextResponse.json(
      { error: 'monthStart is required and must be in format YYYY-MM-01' },
      { status: 400 }
    )
  }

  const monthStart = monthStartParam
  const forceLangs = forceLangsParam !== 'false' // Default true unless explicitly false
  const testedAt = new Date().toISOString()

  // Define eventIds to test
  const eventIds = eventIdParam ? [eventIdParam] : ['2748', '2749']

  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    console.log('[ATL_DEBUG] gomera dump monthStart:', monthStart)
    console.log('[ATL_DEBUG] gomera dump eventIds:', eventIds)
    console.log('[ATL_DEBUG] gomera dump initial lang:', langParam)
    console.log('[ATL_DEBUG] gomera dump forceLangs:', forceLangs)
  }

  const results: EventResult[] = []

  // Test each eventId
  for (const eventId of eventIds) {
    const attempts: AttemptResult[] = []
    let best: AttemptResult | null = null

    // Languages to try (in order)
    const langsToTry = [langParam]
    if (forceLangs) {
      // Add fallback langs if forceLangs is true
      const fallbackLangs = ['ES', 'ENG', 'en', 'es']
      for (const fallbackLang of fallbackLangs) {
        if (!langsToTry.includes(fallbackLang)) {
          langsToTry.push(fallbackLang)
        }
      }
    }

    // Try each language
    for (const lang of langsToTry) {
      try {
        const endpoint = `/loadLimits/${eventId}/${lang}/${monthStart}`
        
        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
          console.log(`[ATL_DEBUG] gomera loadLimits attempt: { eventId: ${eventId}, lang: ${lang}, monthStart: ${monthStart} }`)
        }

        const response = await fetchAtlantico(endpoint, { revalidate: 60 })
        const raw = await response.json().catch(() => null)

        const httpStatus = response.status
        const rawKeys = raw && typeof raw === 'object' ? Object.keys(raw) : []

        // Extract dates count
        let datesCount = 0
        if (raw && typeof raw === 'object') {
          if (Array.isArray(raw.dates)) {
            datesCount = raw.dates.length
          } else if (Array.isArray(raw.date)) {
            datesCount = raw.date.length
          } else if (raw.sessionsByDate && typeof raw.sessionsByDate === 'object') {
            datesCount = Object.keys(raw.sessionsByDate).length
          } else if (raw.days && typeof raw.days === 'object') {
            datesCount = Object.keys(raw.days).length
          }
        }

        // Extract sessions count
        let sessionsCount = 0
        if (raw && typeof raw === 'object') {
          if (raw.sessionsByDate && typeof raw.sessionsByDate === 'object') {
            for (const date in raw.sessionsByDate) {
              const sessions = raw.sessionsByDate[date]
              if (Array.isArray(sessions)) {
                sessionsCount += sessions.length
              }
            }
          } else if (raw.sessions && typeof raw.sessions === 'object') {
            for (const date in raw.sessions) {
              const sessions = raw.sessions[date]
              if (Array.isArray(sessions)) {
                sessionsCount += sessions.length
              }
            }
          } else if (raw.days && typeof raw.days === 'object') {
            for (const date in raw.days) {
              const dayData = raw.days[date]
              if (dayData && typeof dayData === 'object') {
                if (Array.isArray(dayData.sessions)) {
                  sessionsCount += dayData.sessions.length
                }
              }
            }
          }
        }

        // Normalize the response
        const normalized = raw ? normalizeLimits(raw) : undefined

        const attempt: AttemptResult = {
          lang,
          monthStart,
          httpStatus,
          rawKeys,
          datesCount,
          sessionsCount,
          raw,
          normalized,
          stats: normalized?.stats,
        }

        attempts.push(attempt)

        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
          console.log(`[ATL_DEBUG] gomera loadLimits attempt result: { eventId: ${eventId}, lang: ${lang}, datesCount: ${datesCount}, sessionsCount: ${sessionsCount}, rawKeys: [${rawKeys.join(', ')}] }`)
        }

        // Update best if this is better
        if (!best) {
          best = attempt
        } else {
          // Best = max datesCount, then max sessionsCount
          if (attempt.datesCount > best.datesCount) {
            best = attempt
          } else if (attempt.datesCount === best.datesCount && attempt.sessionsCount > best.sessionsCount) {
            best = attempt
          }
        }

        // If we got results and forceLangs is false, stop trying other langs
        if (!forceLangs && datesCount > 0) {
          break
        }

        // If we got results and this is the initial lang, we can stop
        if (lang === langParam && datesCount > 0) {
          break
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        const attempt: AttemptResult = {
          lang,
          monthStart,
          rawKeys: [],
          datesCount: 0,
          sessionsCount: 0,
          raw: null,
          error: errorMsg,
        }
        attempts.push(attempt)

        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
          console.error(`[ATL_DEBUG] gomera loadLimits attempt error: { eventId: ${eventId}, lang: ${lang}, error: ${errorMsg} }`)
        }
      }
    }

    results.push({
      eventId,
      attempts,
      best,
    })
  }

  return NextResponse.json({
    meta: {
      slug: 'gomera-vip-tour',
      monthStart,
      testedAt,
      forceLangs,
    },
    results,
  })
}

