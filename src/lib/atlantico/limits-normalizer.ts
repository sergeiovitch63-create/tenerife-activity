/**
 * Normalize Atlantico loadLimits response to a consistent format
 * 
 * According to Atlantico API documentation, the response structure is:
 * { id, code, quote, dates: { date:[], limit:[], used:[], wdays:[], sessions:{} } }
 * 
 * So dates are in raw.dates.date and sessions in raw.dates.sessions.
 */

export interface NormalizedLimits {
  days: Record<string, {
    available: boolean
    status: 'available' | 'full' | 'none'
    sessions: Array<{
      time: string
      available?: number
      sessionId?: string
      raw?: unknown
    }>
  }>
  stats: {
    datesCount: number
    daysAvailableCount: number
    daysFullCount: number
    totalSessions: number
  }
}

/**
 * Convert date from YYYYMMDD to YYYY-MM-DD format
 */
function toISO(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null
  const trimmed = dateStr.trim()
  if (trimmed.length === 8 && /^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`
  }
  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }
  return null
}

/**
 * Normalize a raw loadLimits response to a consistent format
 */
export function normalizeLimits(raw: any): NormalizedLimits {
  const days: NormalizedLimits['days'] = {}
  let datesCount = 0
  let daysAvailableCount = 0
  let daysFullCount = 0
  let totalSessions = 0

  // Determine the container: raw.dates if it exists, otherwise raw itself
  const container = raw?.dates && typeof raw.dates === 'object' ? raw.dates : raw

  // Extract arrays from container
  const dateList = Array.isArray(container?.date) ? container.date :
                  Array.isArray(container?.dates) ? container.dates : []
  const limitList = Array.isArray(container?.limit) ? container.limit : []
  const usedList = Array.isArray(container?.used) ? container.used : []
  const sessionsMap = container?.sessions && typeof container.sessions === 'object' ? container.sessions : {}

  datesCount = dateList.length

  // Process each date by index
  for (let i = 0; i < dateList.length; i++) {
    const dateRaw = dateList[i]
    if (!dateRaw) continue

    // Convert date from YYYYMMDD to YYYY-MM-DD
    const isoDate = toISO(String(dateRaw))
    if (!isoDate) continue

    // Get limit and used for this date index
    const limit = Number(limitList[i] ?? 0)
    const used = Number(usedList[i] ?? 0)

    // Get sessions for this date (try both YYYYMMDD and YYYY-MM-DD keys)
    const dateKeyYYYYMMDD = String(dateRaw).replaceAll('-', '')
    const sessionsRaw = sessionsMap[dateKeyYYYYMMDD] ?? sessionsMap[isoDate] ?? sessionsMap[String(dateRaw)] ?? []

    if (!Array.isArray(sessionsRaw)) continue

    // Normalize sessions
    const sessionsByTime = new Map<string, NormalizedLimits['days'][string]['sessions'][0]>()

    for (const s of sessionsRaw) {
      if (!s || typeof s !== 'object') continue

      const time = String(s.time ?? s.hour ?? '').trim()
      if (!time) continue

      // Calculate available: use s.available if present, otherwise calculate from limit - used
      const available = s.available != null ? Number(s.available) :
                       (limit > 0 ? Math.max(limit - used, 0) : undefined)

      const sessionId = s.sessionId != null ? String(s.sessionId) : undefined

      // Deduplicate by time (keep first occurrence)
      if (!sessionsByTime.has(time)) {
        sessionsByTime.set(time, {
          time,
          available,
          sessionId,
          raw: s,
        })
      }
    }

    // Sort sessions by time (HH:mm format)
    const normalizedSessions = Array.from(sessionsByTime.values()).sort((a, b) => {
      const parseTime = (t: string) => {
        const m = t.match(/^(\d{1,2}):(\d{2})$/)
        if (m) return Number(m[1]) * 60 + Number(m[2])
        return 0
      }
      return parseTime(a.time) - parseTime(b.time)
    })

    totalSessions += normalizedSessions.length

    // Calculate total available across all sessions
    const totalAvailable = normalizedSessions.reduce((sum, s) => sum + (s.available ?? 0), 0)

    // Determine status
    let status: 'available' | 'full' | 'none'
    if (normalizedSessions.length === 0) {
      status = 'none'
    } else if (totalAvailable > 0) {
      status = 'available'
      daysAvailableCount++
    } else {
      status = 'full'
      daysFullCount++
    }

    days[isoDate] = {
      available: totalAvailable > 0,
      status,
      sessions: normalizedSessions,
    }
  }

  return {
    days,
    stats: {
      datesCount,
      daysAvailableCount,
      daysFullCount,
      totalSessions,
    },
  }
}

