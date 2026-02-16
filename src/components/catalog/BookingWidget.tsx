'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from '@/navigation'
import { useCartStore } from '@/lib/cart/store'
import { CartToast } from '@/components/cart/CartToast'
import { mapLocaleToAtlanticoLang } from '@/lib/atlantico/lang'
import type { BookingOption } from '@/lib/catalog/normalize'
import { buildWhatsAppUrl, buildCallUrl } from '@/lib/booking/contactHelpers'

type GroupDetails = {
  id?: string | number
  Code?: string
  code?: string
  name?: string
  Name?: string
  childAge?: string | number
  infantAge?: string | number
  [key: string]: unknown
}

type NormalizedSession = {
  date: string
  time?: string
  available: number
  price?: number
}

type CalendarRaw = {
  sessionsByDate?: Record<string, NormalizedSession[]>
}

type CalendarResponse = {
  ok: boolean
  eventId: string
  lang: string
  month: string
  dates: string[]
  error?: string
  sessionsByDate?: Record<string, NormalizedSession[]>
  raw?: CalendarRaw
  hasSessions?: boolean // true if sessions/sessionsByDate exists and has keys
  datesDate?: string[] // dates.date array in YYYYMMDD format (for sessionless events)
  hasDatesDate?: boolean // true if datesDate has items, false if empty (for sessionless)
  availableDateKeys?: string[] // Exact keys of available dates (YYYYMMDD format) - use these for calendar
}

type PricesResponseOk =
  | {
      ok: true
      type: 'per_person'
      adultPrice: number
      childPrice: number
      infantPrice: number
      currency?: 'EUR'
      raw?: any
    }
  | {
      ok: true
      type: 'per_day'
      tiers: Array<{ days: number; price: number }>
      currency?: 'EUR'
      raw?: any
    }

type PricesResponseError = { ok: false; raw?: any; reason: string }

type PriceStatus = 'idle' | 'loading' | 'ok' | 'error' | 'unsupported'

interface BookingWidgetProps {
  options: BookingOption[]
  groupKey: string
  groupDetails: GroupDetails | null
  lang: string
  locale: string
  activityName?: string // Optional activity name for WhatsApp message
  // Backward compatibility
  eventIds?: string[]
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number): number {
  const firstDay = new Date(year, month, 1).getDay()
  return firstDay === 0 ? 6 : firstDay - 1 // Monday = 0
}

function getPriceMode(pProd: string | undefined, apiType: PricesResponseOk['type']): PricesResponseOk['type'] {
  if (pProd === '0') return 'per_person'
  if (pProd === '2') return 'per_day'
  return apiType
}

/**
 * BookingWidget - Catalog booking sidebar
 * 
 * IMPORTANT: This component is used on activity detail pages (/catalog/[id]).
 * Customer fields (name/email/phone) are NOT collected here.
 * They are collected ONLY at checkout (/checkout).
 * 
 * If customer fields are needed in the future, they must be conditionally
 * rendered ONLY on checkout pages using: const isCheckout = pathname.includes('/checkout')
 */
export function BookingWidget({ options, groupKey, groupDetails, lang, locale, activityName, eventIds }: BookingWidgetProps) {
  const router = useRouter()
  const cart = useCartStore()
  const [showToast, setShowToast] = useState(false)

  // Backward compatibility: convert eventIds to options if needed
  const bookingOptions = useMemo<BookingOption[]>(() => {
    if (options && options.length > 0) {
      return options
    }
    // Fallback to eventIds if options not provided
    const fallbackIds = eventIds || []
    return fallbackIds.map((id) => ({ id, label: `Option ${id}` }))
  }, [options, eventIds])

  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [adults, setAdults] = useState(1)
  const [childs, setChilds] = useState(0)
  const [infants, setInfants] = useState(0)

  // Calendar state (from /api/atlantico/limits)
  const [sessionsByDay, setSessionsByDay] = useState<Record<string, Array<{ time: string; available: number; sessionId?: string }>>>({})
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [loadingCalendar, setLoadingCalendar] = useState(false)
  const [calendarError, setCalendarError] = useState<string | null>(null)
  const [availabilityMode, setAvailabilityMode] = useState<'NORMAL' | 'NO_SCHEDULE_PUBLISHED' | null>(null)
  const [calendarMode, setCalendarMode] = useState<'sessions' | 'dates' | 'wdays_only' | 'none' | null>(null)
  const [requiresSessionTime, setRequiresSessionTime] = useState<boolean>(true) // Default to true for backward compatibility
  const [projectedAvailableDates, setProjectedAvailableDates] = useState<string[]>([])
  const [eventDetailsTimes, setEventDetailsTimes] = useState<string[]>([]) // For wdays_only mode

  const [pricesData, setPricesData] = useState<PricesResponseOk | PricesResponseError | null>(null)
  const [priceStatus, setPriceStatus] = useState<PriceStatus>('idle')
  
  // Get selected option with pProd
  const selectedOption = useMemo(() => {
    if (!selectedEventId) return null
    return bookingOptions.find((opt) => opt.id === selectedEventId) || null
  }, [selectedEventId, bookingOptions])

  // Auto-select first eventId if only one
  useEffect(() => {
    if (bookingOptions.length === 1 && !selectedEventId) {
      setSelectedEventId(bookingOptions[0].id)
    }
  }, [bookingOptions, selectedEventId])

  // State for auto-switched month
  const [autoSwitchedMonth, setAutoSwitchedMonth] = useState<string | null>(null)
  const [noAvailabilityFound, setNoAvailabilityFound] = useState(false)

  // Fetch calendar (loadLimits) when eventId or month changes
  useEffect(() => {
    if (!selectedEventId) {
      setSessionsByDay({})
      setAvailableDates([])
      setSelectedDate('')
      setSelectedTime('')
      setAutoSwitchedMonth(null)
      setNoAvailabilityFound(false)
      return
    }

    setLoadingCalendar(true)
    setCalendarError(null)
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

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    fetch(`/api/atlantico/limits?eventId=${encodeURIComponent(selectedEventId)}&lang=${encodeURIComponent(lang)}&month=${encodeURIComponent(normalizedMonth)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        // Check HTTP status first - if 200, process the response even if data.ok === false
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Failed to fetch limits' }))
          setCalendarError(errorData.error || `HTTP ${res.status}: Failed to fetch limits`)
          setSessionsByDay({})
          setAvailableDates([])
          setAvailabilityMode(null)
          setCalendarMode(null)
          setProjectedAvailableDates([])
          return
        }
        
        const data = await res.json() as { ok: boolean; sessionsByDay?: Record<string, Array<{ time: string; available: number; sessionId?: string }>>; availableDates?: string[]; calendarMode?: 'sessions' | 'dates' | 'wdays_only' | 'none'; projectedAvailableDates?: string[]; availabilityMode?: 'NORMAL' | 'NO_SCHEDULE_PUBLISHED'; error?: string }
        
        // If HTTP 200, process the response even if data.ok === false (might be wdays_only with empty data)
        // Only set error if it's a real error (not just empty data)
        if (!data.ok && data.error) {
          // Only treat as error if it's a validation error (not empty data)
          if (data.error.includes('Missing parameters') || data.error.includes('Invalid event ID')) {
            setCalendarError(data.error)
            setSessionsByDay({})
            setAvailableDates([])
            setAvailabilityMode(null)
            setCalendarMode(null)
            setProjectedAvailableDates([])
            return
          }
          // Otherwise, continue processing (might be wdays_only with empty data)
          // Set default values if data.ok === false but no validation error
          if (!data.calendarMode && !data.availabilityMode) {
            setCalendarMode('none')
            setAvailabilityMode('NO_SCHEDULE_PUBLISHED')
            setSessionsByDay({})
            setAvailableDates([])
            setProjectedAvailableDates([])
            setCalendarError(null)
            return
          }
        }

        // Set calendarMode (default to 'sessions' if not specified)
        const mode = data.calendarMode || (data.availabilityMode === 'NO_SCHEDULE_PUBLISHED' ? 'none' : 'sessions')
        setCalendarMode(mode)

        // Check for wdays_only mode
        if (mode === 'wdays_only') {
          setAvailabilityMode('NO_SCHEDULE_PUBLISHED')
          setSessionsByDay({})
          setAvailableDates(data.projectedAvailableDates || [])
          setProjectedAvailableDates(data.projectedAvailableDates || [])
          setCalendarError(null)
          
          // Fetch eventDetails to get times
          if (selectedEventId) {
            try {
              const eventDetailsRes = await fetch(`/api/atlantico/event-details?eventId=${encodeURIComponent(selectedEventId)}&lang=${encodeURIComponent(lang)}`)
              if (eventDetailsRes.ok) {
                const eventDetails = await eventDetailsRes.json()
                const times = Array.isArray(eventDetails.times) ? eventDetails.times.filter((t: string) => t && t !== '00:00' && t !== '') : []
                setEventDetailsTimes(times)
              }
            } catch (e) {
              // Ignore errors
            }
          }
          return
        }

        // Check for NO_SCHEDULE_PUBLISHED mode (none)
        if (mode === 'none' || data.availabilityMode === 'NO_SCHEDULE_PUBLISHED') {
          setAvailabilityMode('NO_SCHEDULE_PUBLISHED')
          setSessionsByDay({})
          setAvailableDates([])
          setProjectedAvailableDates([])
          setCalendarError(null)
          return
        }

        setAvailabilityMode('NORMAL')
        // Always use the data for the requested month (no auto-switch)
        // If month is empty, just show empty calendar (user can navigate to next month)
        setSessionsByDay(data.sessionsByDay || {})
        setAvailableDates(data.availableDates || [])
        setProjectedAvailableDates([])
        setNoAvailabilityFound(false)
        setAutoSwitchedMonth(null)
      })
      .catch((e) => {
        if (e.name !== 'AbortError') {
          setCalendarError(e instanceof Error ? e.message : 'Failed to load calendar')
          setSessionsByDay({})
          setAvailableDates([])
        }
      })
      .finally(() => {
        clearTimeout(timeoutId)
        setLoadingCalendar(false)
      })
  }, [selectedEventId, currentMonth, lang])

  // Check if there are valid times for selected date
  const hasValidTimes = useMemo(() => {
    if (!selectedDate) return false
    
    // For wdays_only mode, check eventDetailsTimes
    if (calendarMode === 'wdays_only') {
      return eventDetailsTimes.length > 0
    }
    
    // For other modes, check sessionsByDay
    if (!sessionsByDay[selectedDate]) return false
    const sessions = sessionsByDay[selectedDate]
    const validSessions = sessions.filter(s => 
      s.available > 0 && s.time && s.time !== '00:00' && s.time !== '-'
    )
    const validTimes = Array.from(new Set(
      validSessions.map(s => s.time).filter(t => t && t !== '' && t !== '00:00' && t !== '-')
    ))
    return validTimes.length > 0
  }, [selectedDate, sessionsByDay, calendarMode, eventDetailsTimes])

  // Auto-select first time when date changes (earliest valid time)
  useEffect(() => {
    if (selectedDate && sessionsByDay[selectedDate]) {
      const sessions = sessionsByDay[selectedDate]
      const validSessions = sessions.filter(s => 
        s.available > 0 && s.time && s.time !== '00:00' && s.time !== '-'
      )
      
      // Get unique valid times, sorted
      const validTimes = Array.from(new Set(
        validSessions.map(s => s.time).filter(t => t && t !== '' && t !== '00:00' && t !== '-')
      )).sort()
      
      if (validTimes.length > 0) {
        // Select earliest time
        setSelectedTime(validTimes[0])
      } else {
        setSelectedTime('')
      }
    } else {
      setSelectedTime('')
    }
  }, [selectedDate, sessionsByDay])

  // Fetch prices when (eventId + date) changes
  useEffect(() => {
    if (!selectedEventId || !selectedDate) {
      setPricesData(null)
      setPriceStatus('idle')
      return
    }

    setPriceStatus('loading')
    setPricesData(null)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    fetch(`/api/atlantico/prices/${encodeURIComponent(selectedEventId)}?date=${encodeURIComponent(selectedDate)}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        }
        return res.json()
      })
      .then((data: PricesResponseOk | PricesResponseError) => {
        if (!data.ok) {
          setPriceStatus('error')
          setPricesData(data)
          return
        }
        
        setPricesData(data)
        const mode = getPriceMode(selectedOption?.pProd, data.type)
        
        if (mode === 'per_day') {
          setPriceStatus('unsupported')
          return
        }

        // per_person needs adultPrice at minimum
        if (data.type === 'per_person' && (typeof data.adultPrice !== 'number' || !Number.isFinite(data.adultPrice))) {
          setPriceStatus('error')
          return
        }

        setPriceStatus('ok')
      })
      .catch((e) => {
        if (e.name !== 'AbortError') {
          setPriceStatus('error')
        } else {
          setPriceStatus('idle')
        }
      })
      .finally(() => {
        clearTimeout(timeoutId)
      })
  }, [selectedEventId, selectedDate, selectedOption?.pProd])

  // Get price mode
  const priceMode = useMemo(() => {
    if (!pricesData || !pricesData.ok) return null
    return getPriceMode(selectedOption?.pProd, pricesData.type)
  }, [pricesData, selectedOption?.pProd])

  // Calculate total based on price mode
  const totalPrice = useMemo(() => {
    if (!selectedEventId || !selectedDate) return null

    if (priceStatus !== 'ok' || !pricesData || !pricesData.ok) return null

    const mode = priceMode
    if (!mode) return null

    if (mode === 'per_person') {
      if (pricesData.type !== 'per_person') return null
      const adult = pricesData.adultPrice
      const child = pricesData.childPrice ?? 0
      const infant = pricesData.infantPrice ?? 0
      if (typeof adult !== 'number' || !Number.isFinite(adult)) return null
      return adults * adult + childs * child + infants * infant
    }

    // per_day: not calculated yet
    return null
  }, [selectedEventId, selectedDate, priceStatus, pricesData, priceMode, adults, childs, infants])

  // Should show pax selectors?
  const showPaxSelectors = useMemo(() => {
    if (!priceMode) return true // Default to showing
    return priceMode === 'per_person'
  }, [priceMode])

  // Total display text
  const totalDisplay = useMemo(() => {
    if (!selectedEventId || !selectedDate) {
      return '—'
    }
    if (priceStatus === 'loading') {
      return 'Calculating…'
    }
    if (priceStatus === 'ok' && totalPrice !== null) {
      return formatPrice(totalPrice)
    }
    if (priceStatus === 'unsupported') {
      return 'Varies by duration'
    }
    if (priceStatus === 'error') {
      return '—'
    }
    return '—'
  }, [selectedEventId, selectedDate, priceStatus, totalPrice])

  // availableDates is already in state (from loadLimits)

  // Calendar grid data
  const calendarGrid = useMemo(() => {
    const [year, month] = currentMonth.split('-').map(Number)
    const daysInMonth = getDaysInMonth(year, month - 1)
    const firstDay = getFirstDayOfWeek(year, month - 1)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const days: Array<{ day: number; date: string; available: boolean; isToday: boolean; isSelected: boolean }> = []

    // Empty cells for days before month start
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: 0, date: '', available: false, isToday: false, isSelected: false })
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day)
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const isToday = date.getTime() === today.getTime()
      const isPast = date < today
      // For wdays_only mode, use projectedAvailableDates; otherwise use availableDates
      const datesToCheck = calendarMode === 'wdays_only' ? projectedAvailableDates : availableDates
      const available = !isPast && datesToCheck.includes(dateStr)
      const isSelected = dateStr === selectedDate

      days.push({ day, date: dateStr, available, isToday, isSelected })
    }

    return { year, month: month - 1, days }
  }, [currentMonth, availableDates, selectedDate])

  // Navigate months (dummy calendar)
  const changeMonth = useCallback((delta: number) => {
    const [year, month] = currentMonth.split('-').map(Number)
    const newDate = new Date(year, month - 1 + delta, 1)
    const newMonthStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-01`
    setCurrentMonth(newMonthStr)
  }, [currentMonth])

  // Validation for Add to Cart (no customer fields required)
  const canAddToCart = useMemo(() => {
    // Always require selectedEventId
    if (!selectedEventId || priceStatus !== 'ok') return false
    
    // If calendarMode === 'none': allow without date/time (on-request booking)
    if (calendarMode === 'none') {
      // Only validate pax
      if (priceMode === 'per_day') return false
      if (priceMode === 'per_person') {
        return adults >= 1
      }
      return true
    }
    
    // For other modes: require selectedDate
    if (!selectedDate) return false
    
    // If requiresSessionTime === true => require selectedTime from available sessions for that date
    if (requiresSessionTime) {
      if (selectedDate && !hasValidTimes) return false
    }
    // If requiresSessionTime === false => DO NOT require selectedTime (hide time dropdown OR show as optional info, but DO NOT block)
    // No validation needed for selectedTime when requiresSessionTime is false
    
    // Block if NO_SCHEDULE_PUBLISHED mode (but allow wdays_only)
    if (availabilityMode === 'NO_SCHEDULE_PUBLISHED' && calendarMode !== 'wdays_only') return false
    
    if (priceMode === 'per_day') return false
    if (priceMode === 'per_person') {
      return adults >= 1
    }
    return true
  }, [calendarMode, requiresSessionTime, availabilityMode, selectedEventId, selectedDate, selectedTime, priceStatus, priceMode, adults, hasValidTimes, eventDetailsTimes])

  // Validation for Buy Now (same as Add to Cart - customer fields collected at checkout)
  const canBuyNow = useMemo(() => {
    // Always require selectedEventId
    if (!selectedEventId || priceStatus !== 'ok') return false
    
    // If calendarMode === 'none': allow without date/time (on-request booking)
    if (calendarMode === 'none') {
      // Only validate pax
      if (priceMode === 'per_day') return false
      if (priceMode === 'per_person') {
        return adults >= 1
      }
      return true
    }
    
    // For other modes: require selectedDate
    if (!selectedDate) return false
    
    // If requiresSessionTime === true => require selectedTime from available sessions for that date
    if (requiresSessionTime) {
      if (selectedDate && !hasValidTimes) return false
    }
    // If requiresSessionTime === false => DO NOT require selectedTime (hide time dropdown OR show as optional info, but DO NOT block)
    // No validation needed for selectedTime when requiresSessionTime is false
    
    // Block if NO_SCHEDULE_PUBLISHED mode (but allow wdays_only)
    if (availabilityMode === 'NO_SCHEDULE_PUBLISHED' && calendarMode !== 'wdays_only') return false
    
    if (priceMode === 'per_day') return false
    if (priceMode === 'per_person') {
      return adults >= 1
    }
    return true
  }, [calendarMode, requiresSessionTime, availabilityMode, selectedEventId, selectedDate, selectedTime, priceStatus, priceMode, adults, hasValidTimes, eventDetailsTimes])

  // Age labels from groupDetails
  const childAgeLabel = groupDetails?.childAge ? `Children (${groupDetails.childAge})` : 'Children'
  const infantAgeLabel = groupDetails?.infantAge ? `Infants (${groupDetails.infantAge})` : 'Infants'

  // Removed: sessionsForDate - calendar is now dummy/static (no sessions)

  // Spots available (not provided by calendar response here)
  const spotsAvailable = null

  if (bookingOptions.length === 0) {
    return (
      <div className="bg-white border border-glass-200 rounded-lg p-6 shadow-sm sticky top-24">
        <h2 className="text-xl font-bold text-glass-900 mb-4">Manage your booking</h2>
        <div className="text-center py-8">
          <p className="text-glass-500 text-sm">Options not available</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="bg-white border border-glass-200 rounded-lg p-6 shadow-sm sticky top-24"
      style={{ position: 'relative', zIndex: 50, pointerEvents: 'auto' }}
    >
      <h2 className="text-xl font-bold text-glass-900 mb-4">Manage your booking</h2>

      {/* Event Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-glass-700 mb-2">Select Option</label>
        <select
          value={selectedEventId}
          onChange={(e) => {
            setSelectedEventId(e.target.value)
            setSelectedDate('')
          }}
          className="w-full px-4 py-2 border border-glass-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
        >
          <option value="">Choose an option...</option>
          {bookingOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* DEV Debug Panel - Only in development */}
      {process.env.NODE_ENV === 'development' && selectedEventId && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs space-y-1">
          <div className="font-semibold mb-2">🔍 DEV Debug:</div>
          <div>calendarMode: <strong className="text-blue-600">{calendarMode || 'null'}</strong></div>
          <div>requiresSessionTime: <strong className="text-blue-600">{requiresSessionTime ? 'true' : 'false'}</strong></div>
          <div>selectedDate: <strong className="text-green-600">{selectedDate || 'none'}</strong></div>
          <div>selectedTime: <strong className="text-green-600">{selectedTime || 'none'}</strong></div>
          <div>sesTime used: <strong className="text-purple-600">{
            requiresSessionTime === false ? '00:00' : (selectedTime || 'none')
          }</strong></div>
          <div>selectedGroupId (t_group): <strong className="text-red-600">{groupKey}</strong></div>
          <div>selectedEventId (t_id): <strong className="text-blue-600">{selectedEventId}</strong></div>
          <div>eventId origin: <strong className="text-purple-600">
            {(() => {
              const option = bookingOptions.find(opt => opt.id === selectedEventId)
              return option ? `option.value="${option.id}" (from bookingOptions)` : 'unknown'
            })()}
          </strong></div>
          <div>monthStart sent: <strong className="text-green-600">{(() => {
            const match = currentMonth.match(/^(\d{4}-\d{2})/)
            return match ? `${match[1]}-01` : currentMonth
          })()}</strong></div>
          <div>availableDates count: <strong>{availableDates.length}</strong></div>
          <div>projectedAvailableDates count: <strong>{projectedAvailableDates.length}</strong></div>
          <div>sessionsByDay keys: <strong>{Object.keys(sessionsByDay).length}</strong></div>
          <div>eventDetailsTimes: <strong>{eventDetailsTimes.length > 0 ? eventDetailsTimes.join(', ') : 'none'}</strong></div>
          {calendarError && (
            <div className="text-red-600">Error: {calendarError}</div>
          )}
        </div>
      )}

      {/* none mode or wdays_only with no times: Show CTA card */}
      {selectedEventId && (calendarMode === 'none' || (calendarMode === 'wdays_only' && eventDetailsTimes.length === 0)) && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
          <p className="text-sm text-blue-800 text-center">
            Availability on request. Contact us to confirm.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <a
              href={buildWhatsAppUrl({
                activityName: activityName || groupDetails?.name || groupDetails?.Name || 'Activity',
                eventId: selectedEventId,
                lang: lang,
                date: selectedDate || undefined,
                adults: adults > 0 ? adults : undefined,
                childs: childs > 0 ? childs : undefined,
                infants: infants > 0 ? infants : undefined,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors text-center text-sm"
            >
              WhatsApp
            </a>
            <a
              href={buildCallUrl()}
              className="flex-1 px-4 py-2 bg-white border-2 border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors text-center text-sm"
            >
              Call
            </a>
          </div>
        </div>
      )}

      {/* Calendar - show for wdays_only mode or normal mode (but hide if none mode) */}
      {selectedEventId && calendarMode !== 'none' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-glass-100 rounded transition-colors"
              aria-label="Previous month"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="text-sm font-semibold text-glass-900">
              {new Date(calendarGrid.year, calendarGrid.month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 hover:bg-glass-100 rounded transition-colors"
              aria-label="Next month"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Calendar - only dates in availableDates are clickable */}
          {loadingCalendar ? (
            <div className="text-center py-8 text-sm text-glass-500">Loading calendar...</div>
          ) : calendarError ? (
            <div className="text-center py-8 text-sm text-red-600">{calendarError}</div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-glass-600 py-1">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarGrid.days.map((day, idx) => {
                  if (day.day === 0) {
                    return <div key={idx} className="aspect-square" />
                  }
                  // For wdays_only mode, use projectedAvailableDates; otherwise use availableDates
                  const datesToCheck = calendarMode === 'wdays_only' ? projectedAvailableDates : availableDates
                  const isAvailable = datesToCheck.includes(day.date)
                  return (
                    <button
                      key={day.date}
                      onClick={() => {
                        if (isAvailable) {
                          setSelectedDate(day.date)
                        }
                      }}
                      disabled={!isAvailable}
                      className={`aspect-square text-sm rounded transition-colors ${
                        day.isSelected
                          ? 'bg-ocean-600 text-white font-semibold'
                          : day.isToday
                            ? 'bg-ocean-100 text-ocean-900 font-medium'
                            : isAvailable
                              ? 'bg-glass-50 text-glass-900 hover:bg-ocean-50 cursor-pointer'
                              : 'bg-glass-100 text-glass-400 cursor-not-allowed'
                      }`}
                    >
                      {day.day}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Time picker - show for wdays_only mode with eventDetailsTimes */}
      {selectedDate && calendarMode === 'wdays_only' && eventDetailsTimes.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-glass-700 mb-2">
            Time
            <span className="ml-2 text-xs text-blue-600 font-normal">(Availability to confirm)</span>
          </label>
          <select
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="w-full px-3 py-2 border border-glass-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
          >
            <option value="">Select time</option>
            {eventDetailsTimes.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Time picker - show for normal modes with sessions */}
      {selectedDate && calendarMode !== 'wdays_only' && calendarMode !== 'none' && sessionsByDay[selectedDate] && sessionsByDay[selectedDate].length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-glass-700 mb-2">Time</label>
          <select
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="w-full px-3 py-2 border border-glass-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
          >
            <option value="">Select time</option>
            {sessionsByDay[selectedDate]
              .filter(s => s.time && s.time !== '00:00' && s.time !== '-')
              .map((session) => (
                <option key={session.time} value={session.time}>
                  {session.time} {session.available > 0 ? `(${session.available} available)` : '(Sold out)'}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Pax Selectors - only show for per_person */}
      {showPaxSelectors && (
        <div className="mb-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-glass-700 mb-2">Adults</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAdults(Math.max(1, adults - 1))}
                disabled={adults <= 1}
                className="w-8 h-8 rounded border border-glass-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-glass-100"
              >
                −
              </button>
              <span className="w-12 text-center font-medium">{adults}</span>
              <button
                onClick={() => setAdults(Math.min(10, adults + 1))}
                disabled={adults >= 10}
                className="w-8 h-8 rounded border border-glass-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-glass-100"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-glass-700 mb-2">{childAgeLabel}</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setChilds(Math.max(0, childs - 1))}
                disabled={childs <= 0}
                className="w-8 h-8 rounded border border-glass-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-glass-100"
              >
                −
              </button>
              <span className="w-12 text-center font-medium">{childs}</span>
              <button
                onClick={() => setChilds(Math.min(10, childs + 1))}
                disabled={childs >= 10}
                className="w-8 h-8 rounded border border-glass-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-glass-100"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-glass-700 mb-2">{infantAgeLabel}</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setInfants(Math.max(0, infants - 1))}
                disabled={infants <= 0}
                className="w-8 h-8 rounded border border-glass-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-glass-100"
              >
                −
              </button>
              <span className="w-12 text-center font-medium">{infants}</span>
              <button
                onClick={() => setInfants(Math.min(10, infants + 1))}
                disabled={infants >= 10}
                className="w-8 h-8 rounded border border-glass-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-glass-100"
              >
                +
              </button>
            </div>
          </div>

          {spotsAvailable !== null && (
            <div className="text-xs text-glass-600">
              {spotsAvailable} {spotsAvailable === 1 ? 'spot' : 'spots'} left
            </div>
          )}
        </div>
      )}

      {/* Total Price */}
      <div className="mb-4 pt-4 border-t border-glass-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-glass-700">TOTAL</span>
          <span className={`text-xl font-bold ${
            priceStatus === 'ok' ? 'text-ocean-600' : 'text-glass-900'
          }`}>
            {totalDisplay}
          </span>
        </div>
        {priceStatus === 'error' && selectedEventId && selectedDate && (
          <div className="mt-2 text-xs text-glass-600">Pricing unavailable for selected date.</div>
        )}
      </div>

      {/* Action Buttons */}
      <div 
        className="space-y-2"
        style={{ position: 'relative', zIndex: 50, pointerEvents: 'auto' }}
      >
        <button
          type="button"
          disabled={!canAddToCart}
          onClick={() => {
            console.log('[BOOKING_WIDGET] ADD_TO_CART CLICK /catalog/[id]', {
              canAddToCart,
              selectedEventId,
              selectedDate,
              adults,
              childs,
              infants,
              totalPrice,
              priceStatus,
            })

            if (!canAddToCart || !selectedEventId || priceStatus !== 'ok' || !pricesData || !pricesData.ok) {
              console.warn('[BOOKING_WIDGET] Add to Cart blocked - missing requirements')
              return
            }
            
            // For calendarMode === 'none': allow without date
            if (calendarMode !== 'none' && !selectedDate) {
              console.warn('[BOOKING_WIDGET] Add to Cart blocked - date required for this mode')
              return
            }

            try {
              // Build cart item
              // Convert lang to lowercase format for cart (lang is 'ENG', 'ESP' etc., cart expects same format)
              const atlanticoLang = lang
              
              // Determine sesTime and tourDate based on calendarMode
              let sesTime: string | null = null
              let tourDate: string | null = null
              
              if (calendarMode === 'none') {
                // For calendarMode === 'none': send null (on-request booking)
                sesTime = null
                tourDate = null
              } else if (calendarMode === 'wdays_only') {
                // For wdays_only: use selectedTime from eventDetailsTimes
                if (!selectedTime || selectedTime === '' || selectedTime === '00:00') {
                  if (process.env.NODE_ENV === 'development') {
                    console.warn('[BOOKING_WIDGET] No time selected for wdays_only mode:', {
                      eventId: selectedEventId,
                      date: selectedDate,
                      eventDetailsTimes,
                    })
                  }
                  alert('Please select a time')
                  return
                }
                sesTime = selectedTime
                tourDate = selectedDate
              } else if (requiresSessionTime === false) {
                // If requiresSessionTime === false => set sesTime = "00:00" ALWAYS (ignore eventDetailsTimes)
                sesTime = '00:00'
                tourDate = selectedDate
              } else {
                // If requiresSessionTime === true => set sesTime = selectedTime (from sessionsByDay). Never "00:00".
                tourDate = selectedDate
                const sessions = sessionsByDay[selectedDate] || []
                const validSessions = sessions.filter(s => 
                  s.available > 0 && s.time && s.time !== '00:00' && s.time !== '-'
                )
                
                // Get unique valid times, sorted
                const validTimes = Array.from(new Set(
                  validSessions.map(s => s.time).filter(t => t && t !== '' && t !== '00:00' && t !== '-')
                )).sort()
                
                // CRITICAL: Never send '00:00' when requiresSessionTime is true - block booking if no valid time
                if (validTimes.length === 0) {
                  if (process.env.NODE_ENV === 'development') {
                    console.warn('[BOOKING_WIDGET] No times available - booking blocked:', {
                      eventId: selectedEventId,
                      date: selectedDate,
                      calendarMode,
                      requiresSessionTime,
                      sessionsCount: sessions.length,
                      sampleSessions: sessions.slice(0, 3),
                      sessionsByDayKeys: Object.keys(sessionsByDay),
                    })
                  }
                  alert('No times available for this date')
                  return
                }
                
                sesTime = validTimes[0] // Use earliest time
              }
              
              // Build price snapshot
              if (pricesData.type === 'per_person') {
                const priceSnapshot = {
                  adult: pricesData.adultPrice,
                  child: pricesData.childPrice ?? 0,
                  infant: pricesData.infantPrice ?? 0,
                  total: totalPrice || 0,
                }

                const itemData = {
                  t_group: groupKey,
                  t_id: selectedEventId,
                  language: atlanticoLang,
                  tourDate: selectedDate,
                  sesTime: sesTime,
                  adults,
                  childs,
                  infants,
                  priceSnapshot,
                  currency: pricesData.currency || 'EUR',
                }

                // DEV log
                if (process.env.NODE_ENV === 'development') {
                  console.log('[CART_ADD]', {
                    calendarMode,
                    selectedDate,
                    selectedTime,
                    sesTime,
                    payload: itemData,
                  })
                }

                console.log('[CART] before', cart.items.length)
                console.log('[BOOKING_WIDGET] Adding to cart:', itemData)
                cart.addItem(itemData)
                console.log('[CART] after', cart.items.length)
                setShowToast(true)
                console.log('[BOOKING_WIDGET] Item added successfully')
              } else {
                console.warn('[BOOKING_WIDGET] Unsupported price mode:', pricesData.type)
              }
            } catch (err) {
              console.error('[BOOKING_WIDGET] Add to cart error:', err)
            }
          }}
          className="w-full px-6 py-3 bg-ocean-600 text-white font-medium rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ pointerEvents: 'auto' }}
        >
          Add to Cart
        </button>
        <button
          type="button"
          disabled={!canBuyNow}
          onClick={async () => {
            console.log('[BOOKING_WIDGET] BUY_NOW CLICK /catalog/[id]', {
              canBuyNow,
              selectedEventId,
              selectedDate,
              adults,
              childs,
              infants,
              totalPrice,
              priceStatus,
            })

            if (!canBuyNow || !selectedEventId || priceStatus !== 'ok' || !pricesData || !pricesData.ok) {
              console.warn('[BOOKING_WIDGET] Buy Now blocked - missing requirements')
              return
            }
            
            // For calendarMode === 'none': allow without date
            if (calendarMode !== 'none' && !selectedDate) {
              console.warn('[BOOKING_WIDGET] Buy Now blocked - date required for this mode')
              return
            }

            try {
              // Build cart item
              const atlanticoLang = lang
              
              // Determine sesTime and tourDate based on calendarMode
              let sesTime: string | null = null
              let tourDate: string | null = null
              
              if (calendarMode === 'none') {
                // For calendarMode === 'none': send null (on-request booking)
                sesTime = null
                tourDate = null
              } else if (calendarMode === 'wdays_only') {
                // For wdays_only: use selectedTime from eventDetailsTimes
                if (!selectedTime || selectedTime === '' || selectedTime === '00:00') {
                  if (process.env.NODE_ENV === 'development') {
                    console.warn('[BOOKING_WIDGET] No time selected for wdays_only mode:', {
                      eventId: selectedEventId,
                      date: selectedDate,
                      eventDetailsTimes,
                    })
                  }
                  alert('Please select a time')
                  return
                }
                sesTime = selectedTime
                tourDate = selectedDate
              } else if (requiresSessionTime === false) {
                // If requiresSessionTime === false => set sesTime = "00:00" ALWAYS (ignore eventDetailsTimes)
                sesTime = '00:00'
                tourDate = selectedDate
              } else {
                // If requiresSessionTime === true => set sesTime = selectedTime (from sessionsByDay). Never "00:00".
                tourDate = selectedDate
                const sessions = sessionsByDay[selectedDate] || []
                const validSessions = sessions.filter(s => 
                  s.available > 0 && s.time && s.time !== '00:00' && s.time !== '-'
                )
                
                // Get unique valid times, sorted
                const validTimes = Array.from(new Set(
                  validSessions.map(s => s.time).filter(t => t && t !== '' && t !== '00:00' && t !== '-')
                )).sort()
                
                // CRITICAL: Never send '00:00' when requiresSessionTime is true - block booking if no valid time
                if (validTimes.length === 0) {
                  if (process.env.NODE_ENV === 'development') {
                    console.warn('[BOOKING_WIDGET] No times available - booking blocked:', {
                      eventId: selectedEventId,
                      date: selectedDate,
                      calendarMode,
                      requiresSessionTime,
                      sessionsCount: sessions.length,
                      sampleSessions: sessions.slice(0, 3),
                      sessionsByDayKeys: Object.keys(sessionsByDay),
                    })
                  }
                  alert('No times available for this date')
                  return
                }
                
                sesTime = validTimes[0] // Use earliest time
              }
              
              // Build price snapshot
              if (pricesData.type === 'per_person') {
                const priceSnapshot = {
                  adult: pricesData.adultPrice,
                  child: pricesData.childPrice ?? 0,
                  infant: pricesData.infantPrice ?? 0,
                  total: totalPrice || 0,
                }

                const itemData = {
                  t_group: groupKey,
                  t_id: selectedEventId,
                  language: atlanticoLang,
                  tourDate: selectedDate,
                  sesTime: sesTime,
                  adults,
                  childs,
                  infants,
                  priceSnapshot,
                  currency: pricesData.currency || 'EUR',
                }

                // DEV log
                if (process.env.NODE_ENV === 'development') {
                  console.log('[CART_ADD]', {
                    calendarMode,
                    selectedDate,
                    selectedTime,
                    sesTime,
                    payload: itemData,
                  })
                }

                // For Buy Now: call payment endpoint directly instead of going to checkout
                // Build customer data (will be collected from form or use defaults)
                const customerData = {
                  name: '', // Will be collected at payment page
                  email: '',
                  phone: '',
                }
                
                // Call payment endpoint - expect HTML that auto-posts to Atlantico /payment/
                try {
                  const paymentResponse = await fetch('/api/atlantico/booking/payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      t_id: selectedEventId,
                      t_group: groupKey,
                      language: atlanticoLang,
                      tourDate: selectedDate,
                      sesTime: sesTime,
                      adults,
                      childs,
                      infants,
                      name: customerData.name,
                      email: customerData.email,
                      phone: customerData.phone,
                    }),
                  })

                  const contentType = paymentResponse.headers.get('content-type') || ''

                  if (paymentResponse.ok && contentType.includes('text/html')) {
                    const html = await paymentResponse.text()
                    // CRITICAL: Replace entire page with payment form HTML
                    // This ensures the auto-submit script works correctly
                    document.open()
                    document.write(html)
                    document.close()
                    return
                  }
                  
                  // Also handle if response is HTML but content-type is not set correctly
                  if (paymentResponse.ok) {
                    const text = await paymentResponse.text()
                    // Check if it's HTML by looking for HTML tags
                    if (text.trim().startsWith('<html') || text.trim().startsWith('<!DOCTYPE') || text.includes('<form')) {
                      document.open()
                      document.write(text)
                      document.close()
                      return
                    }
                  }

                  // Payment failed - try to extract JSON error, otherwise fall back to cart
                  let paymentErrorPayload: any = null
                  try {
                    paymentErrorPayload = await paymentResponse.json()
                  } catch {
                    // ignore
                  }

                  let errorMessage = paymentErrorPayload?.reason || paymentErrorPayload?.message || 'Payment failed'
                  if (errorMessage.includes('MISSING_ATLANTICO_USER_ID')) {
                    errorMessage = 'Server configuration error: ATLANTICO_USER_ID is missing. Please contact support.'
                    alert(errorMessage)
                    return
                  }
                  
                  // Other errors - add to cart and go to checkout instead
                  console.warn('[BOOKING_WIDGET] Payment failed, adding to cart:', paymentErrorPayload?.reason || errorMessage)
                  console.log('[CART] before', cart.items.length)
                  console.log('[BOOKING_WIDGET] Adding to cart and navigating to checkout:', itemData)
                  cart.addItem(itemData)
                  console.log('[CART] after', cart.items.length)
                  router.push('/checkout')
                  console.log('[BOOKING_WIDGET] Navigation triggered')
                } catch (paymentError) {
                  // Payment error - add to cart and go to checkout instead
                  console.error('[BOOKING_WIDGET] Payment error, adding to cart:', paymentError)
                  console.log('[CART] before', cart.items.length)
                  console.log('[BOOKING_WIDGET] Adding to cart and navigating to checkout:', itemData)
                  cart.addItem(itemData)
                  console.log('[CART] after', cart.items.length)
                  router.push('/checkout')
                  console.log('[BOOKING_WIDGET] Navigation triggered')
                }
              } else {
                console.warn('[BOOKING_WIDGET] Unsupported price mode:', pricesData.type)
              }
            } catch (err) {
              console.error('[BOOKING_WIDGET] Buy Now error:', err)
            }
          }}
          className="w-full px-6 py-3 bg-glass-100 text-glass-700 font-medium rounded-lg hover:bg-glass-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ pointerEvents: 'auto' }}
        >
          Buy Now
        </button>
      </div>

      {/* Cart Toast */}
      {showToast && (
        <CartToast
          message="Item added to cart"
          onClose={() => setShowToast(false)}
          locale={locale}
        />
      )}
    </div>
  )
}

