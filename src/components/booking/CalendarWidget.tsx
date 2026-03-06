'use client'

/**
 * CalendarWidget Component
 * 
 * Displays a calendar for selecting tour dates and sessions.
 * Fetches availability from /api/atlantico/limits endpoint.
 */

import { useState, useEffect, useCallback } from 'react'

interface Session {
  time: string
  available: number
  precio: number | null
  bruto: number | null
  sessionId: string | null
  rcId: string | null
  TipoReservaId: string | null
}

interface LimitsResponse {
  quote: number | null
  wdays: number[]
  dates: Array<{
    limit: number
    date: string
    used: number
  }>
  sessionsByDay: Record<string, Session[]>
}

interface CalendarWidgetProps {
  eventId: string
  lang: string
  onDateSelect?: (date: string) => void
  onSessionSelect?: (date: string, session: Session) => void
  selectedDate?: string | null
  selectedSession?: Session | null
}

export function CalendarWidget({
  eventId,
  lang,
  onDateSelect,
  onSessionSelect,
  selectedDate,
  selectedSession,
}: CalendarWidgetProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  })
  
  // Calendar state (from /api/atlantico/limits)
  const [sessionsByDay, setSessionsByDay] = useState<Record<string, Session[]>>({})
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(selectedDate || null)
  const [selectedDaySessions, setSelectedDaySessions] = useState<Session[]>([])
  const [autoSwitchedMonth, setAutoSwitchedMonth] = useState<string | null>(null)
  const [noAvailabilityFound, setNoAvailabilityFound] = useState(false)

  // Fetch limits for current month
  useEffect(() => {
    if (!eventId || !lang) {
      setSessionsByDay({})
      setAvailableDates([])
      setAutoSwitchedMonth(null)
      setNoAvailabilityFound(false)
      return
    }

    setLoading(true)
    setError(null)
    setAutoSwitchedMonth(null)
    setNoAvailabilityFound(false)

    // Normalize month to YYYY-MM-01
    const normalizedMonth = (() => {
      const match = currentMonth.match(/^(\d{4}-\d{2})/)
      if (match) {
        return `${match[1]}-01`
      }
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    })()

    fetch(`/api/atlantico/limits?eventId=${encodeURIComponent(eventId)}&lang=${encodeURIComponent(lang)}&month=${encodeURIComponent(normalizedMonth)}`)
      .then((res) => res.json())
      .then(async (data: { ok: boolean; sessionsByDay?: Record<string, Session[]>; availableDates?: string[]; error?: string }) => {
        if (!data.ok) {
          setError(data.error || 'Failed to fetch limits')
          setSessionsByDay({})
          setAvailableDates([])
          return
        }

        const hasAvailability = (data.availableDates && data.availableDates.length > 0) || 
                                (data.sessionsByDay && Object.keys(data.sessionsByDay).length > 0)

        if (hasAvailability) {
          // Month has availability, use it
          const convertedSessionsByDay: Record<string, Session[]> = {}
          for (const [date, sessions] of Object.entries(data.sessionsByDay || {})) {
            convertedSessionsByDay[date] = sessions.map(s => ({
              time: s.time,
              available: s.available,
              precio: null,
              bruto: null,
              sessionId: s.sessionId || null,
              rcId: null,
              TipoReservaId: null,
            }))
          }

          setSessionsByDay(convertedSessionsByDay)
          setAvailableDates(data.availableDates || [])
        } else {
          // Month is empty, find next available month
          const { findNextAvailableMonth } = await import('@/lib/atlantico/findNextAvailableMonth')
          const nextMonth = await findNextAvailableMonth(eventId, lang, normalizedMonth, 12)
          
          if (nextMonth) {
            // Found next available month, fetch it
            setAutoSwitchedMonth(nextMonth)
            
            const nextResponse = await fetch(`/api/atlantico/limits?eventId=${encodeURIComponent(eventId)}&lang=${encodeURIComponent(lang)}&month=${encodeURIComponent(nextMonth)}`)
            
            if (nextResponse.ok) {
              const nextData = await nextResponse.json()
              if (nextData.ok) {
                const convertedSessionsByDay: Record<string, Session[]> = {}
                for (const [date, sessions] of Object.entries(nextData.sessionsByDay || {})) {
                  convertedSessionsByDay[date] = (sessions as Array<{ time: string; available: number; sessionId?: string }>).map(s => ({
                    time: s.time,
                    available: s.available,
                    precio: null,
                    bruto: null,
                    sessionId: s.sessionId || null,
                    rcId: null,
                    TipoReservaId: null,
                  }))
                }

                setSessionsByDay(convertedSessionsByDay)
                setAvailableDates(nextData.availableDates || [])
                // Update currentMonth to the found month
                setCurrentMonth(nextMonth)
              }
            }
          } else {
            // No availability found in next 12 months
            setNoAvailabilityFound(true)
            setSessionsByDay({})
            setAvailableDates([])
          }
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to fetch availability')
        setSessionsByDay({})
        setAvailableDates([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [currentMonth, eventId, lang, onDateSelect])

  // Update selected day sessions when limits change
  useEffect(() => {
    if (selectedDay && sessionsByDay[selectedDay]) {
      const sessions = sessionsByDay[selectedDay]
      setSelectedDaySessions(sessions)
    } else {
      setSelectedDaySessions([])
    }
  }, [selectedDay, sessionsByDay])

  // Navigate to previous month
  const goToPreviousMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number)
    const date = new Date(year, month - 2, 1)
    setCurrentMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`)
  }

  // Navigate to next month
  const goToNextMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number)
    const date = new Date(year, month, 1)
    setCurrentMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`)
  }

  // Get month name
  const getMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number)
    const date = new Date(year, month - 1, 1)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  // Get days in month (from loadLimits - real availability)
  const getDaysInMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number)
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const daysInMonth = lastDay.getDate()
    // Monday=0, Sunday=6 (European week start)
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const days: Array<{ date: number; dateStr: string; available: boolean; sessions: Session[] }> = []

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ date: 0, dateStr: '', available: false, sessions: [] })
    }

    // Add days of month (only dates in availableDates are available)
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const sessions = sessionsByDay[dateStr] || []
      const isAvailable = availableDates.includes(dateStr) && sessions.some((s) => s.available > 0)
      
      days.push({
        date: day,
        dateStr,
        available: isAvailable,
        sessions,
      })
    }

    return days
  }

  // Handle day click
  const handleDayClick = (dateStr: string, sessions: Session[]) => {
    if (sessions.length === 0 || !sessions.some((s) => s.available > 0)) {
      return // Don't allow selection if no available sessions
    }

    setSelectedDay(dateStr)
    if (onDateSelect) {
      onDateSelect(dateStr)
    }

    // If only one session, auto-select it
    const availableSessions = sessions.filter((s) => s.available > 0)
    if (availableSessions.length === 1 && onSessionSelect) {
      onSessionSelect(dateStr, availableSessions[0])
    }
  }

  // Handle session click
  const handleSessionClick = (session: Session) => {
    if (!selectedDay) return
    if (onSessionSelect) {
      onSessionSelect(selectedDay, session)
    }
  }

  const days = getDaysInMonth()
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <div className="w-full">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousMonth}
          className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous month"
        >
          ← Prev
        </button>
        <h3 className="text-lg font-semibold text-gray-900">
          {getMonthName(currentMonth)}
        </h3>
        <button
          onClick={goToNextMonth}
          className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next month"
        >
          Next →
        </button>
      </div>

      {/* Auto-switched month notice */}
      {autoSwitchedMonth && (
        <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
          <span className="font-medium">ℹ️</span> No availability this month → showing{' '}
          <strong>{new Date(autoSwitchedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
        </div>
      )}

      {/* No availability found notice */}
      {noAvailabilityFound && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          <div className="font-medium mb-1">⚠️ No availability found</div>
          <div>No availability found for the next 12 months for this option. Please try a different option.</div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8 text-gray-500">
          Loading availability...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-8 text-red-600">
          {error}
        </div>
      )}

      {/* Calendar Grid */}
      {!loading && !error && (
        <>
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-gray-700 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (day.date === 0) {
                return <div key={`empty-${index}`} className="aspect-square" />
              }

              const isToday = day.dateStr === todayStr
              const isSelected = day.dateStr === selectedDay
              const isPast = new Date(day.dateStr) < today
              const isClickable = day.available && !isPast

              return (
                <button
                  key={day.dateStr}
                  onClick={() => isClickable && handleDayClick(day.dateStr, day.sessions)}
                  disabled={!isClickable}
                  className={`
                    aspect-square p-1 text-sm rounded border transition-colors
                    ${isSelected ? 'bg-blue-600 text-white border-blue-700' : ''}
                    ${!isSelected && isToday ? 'bg-blue-50 text-blue-700 border-blue-300' : ''}
                    ${!isSelected && !isToday && isClickable ? 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50' : ''}
                    ${!isClickable ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : ''}
                  `}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <span>{day.date}</span>
                    {day.sessions.length > 0 && (
                      <span className="text-xs mt-0.5">
                        {day.sessions.filter((s) => s.available > 0).length}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Selected Day Sessions */}
          {selectedDay && selectedDaySessions.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Available Sessions for {selectedDay}
              </h4>
              <div className="space-y-2">
                {selectedDaySessions
                  .filter((s) => s.available > 0)
                  .map((session, index) => {
                    const isSelected = selectedSession?.time === session.time && selectedSession?.sessionId === session.sessionId
                    return (
                      <button
                        key={index}
                        onClick={() => handleSessionClick(session)}
                        className={`
                          w-full text-left px-4 py-2 rounded border transition-colors
                          ${isSelected ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'}
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{session.time}</span>
                            {session.precio !== null && (
                              <span className="ml-2 text-sm text-gray-600">
                                €{session.precio.toFixed(2)}
                              </span>
                            )}
                          </div>
                          <div className="text-sm">
                            {session.available} available
                          </div>
                        </div>
                      </button>
                    )
                  })}
              </div>
            </div>
          )}

          {/* No sessions message */}
          {selectedDay && selectedDaySessions.length === 0 && (
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg text-yellow-800 text-sm">
              No available sessions for this date.
            </div>
          )}
        </>
      )}
    </div>
  )
}

