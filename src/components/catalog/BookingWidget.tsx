'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from '@/navigation'
import { useCartStore } from '@/lib/cart/store'
import { CartToast } from '@/components/cart/CartToast'
import { mapLocaleToAtlanticoLang } from '@/lib/atlantico/lang'
import type { BookingOption } from '@/lib/catalog/normalize'

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
export function BookingWidget({ options, groupKey, groupDetails, lang, locale, eventIds }: BookingWidgetProps) {
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
      .then((res) => res.json())
      .then(async (data: { ok: boolean; sessionsByDay?: Record<string, Array<{ time: string; available: number; sessionId?: string }>>; availableDates?: string[]; error?: string }) => {
        if (!data.ok) {
          setCalendarError(data.error || 'Failed to load calendar')
          setSessionsByDay({})
          setAvailableDates([])
          return
        }

        const hasAvailability = (data.availableDates && data.availableDates.length > 0) || 
                                (data.sessionsByDay && Object.keys(data.sessionsByDay).length > 0)

        if (hasAvailability) {
          // Month has availability, use it
          setSessionsByDay(data.sessionsByDay || {})
          setAvailableDates(data.availableDates || [])
        } else {
          // Month is empty, find next available month
          const { findNextAvailableMonth } = await import('@/lib/atlantico/findNextAvailableMonth')
          const nextMonth = await findNextAvailableMonth(selectedEventId, lang, normalizedMonth, 12)
          
          if (nextMonth) {
            // Found next available month, fetch it
            setAutoSwitchedMonth(nextMonth)
            
            const nextResponse = await fetch(`/api/atlantico/limits?eventId=${encodeURIComponent(selectedEventId)}&lang=${encodeURIComponent(lang)}&month=${encodeURIComponent(nextMonth)}`, {
              signal: controller.signal,
            })
            
            if (nextResponse.ok) {
              const nextData = await nextResponse.json()
              if (nextData.ok) {
                setSessionsByDay(nextData.sessionsByDay || {})
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

  // Auto-select first time when date changes
  useEffect(() => {
    if (selectedDate && sessionsByDay[selectedDate]) {
      const sessions = sessionsByDay[selectedDate]
      const allowedTimes = sessions.map(s => s.time).filter(t => t && t !== '00:00' && t !== '-')
      if (allowedTimes.length > 0 && !selectedTime) {
        setSelectedTime(allowedTimes[0])
      } else if (allowedTimes.length === 0) {
        setSelectedTime('00:00')
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
      const available = !isPast && availableDates.includes(dateStr)
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
    if (!selectedEventId || !selectedDate || priceStatus !== 'ok') return false
    if (priceMode === 'per_day') return false
    if (priceMode === 'per_person') {
      return adults >= 1
    }
    return true
  }, [selectedEventId, selectedDate, priceStatus, priceMode, adults])

  // Validation for Buy Now (same as Add to Cart - customer fields collected at checkout)
  const canBuyNow = useMemo(() => {
    if (!selectedEventId || !selectedDate || priceStatus !== 'ok') return false
    if (priceMode === 'per_day') return false
    if (priceMode === 'per_person') {
      return adults >= 1
    }
    return true
  }, [selectedEventId, selectedDate, priceStatus, priceMode, adults])

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
          <div>sessionsByDay keys: <strong>{Object.keys(sessionsByDay).length}</strong></div>
          {calendarError && (
            <div className="text-red-600">Error: {calendarError}</div>
          )}
        </div>
      )}

      {/* Calendar */}
      {selectedEventId && (
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
                  const isAvailable = availableDates.includes(day.date)
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

      {/* Removed: Sessions/Time picker - calendar is now dummy/static (no sessions) */}

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

            if (!canAddToCart || !selectedEventId || !selectedDate || priceStatus !== 'ok' || !pricesData || !pricesData.ok) {
              console.warn('[BOOKING_WIDGET] Add to Cart blocked - missing requirements')
              return
            }

            try {
              // Build cart item
              // Convert lang to lowercase format for cart (lang is 'ENG', 'ESP' etc., cart expects same format)
              const atlanticoLang = lang
              // Use selectedTime if available, otherwise '00:00' only if no sessions
              const sessions = sessionsByDay[selectedDate] || []
              const allowedTimes = sessions.map(s => s.time).filter(t => t && t !== '00:00' && t !== '-')
              const sesTime = allowedTimes.length > 0 ? (selectedTime || allowedTimes[0] || '00:00') : '00:00'
              
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
          onClick={() => {
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

            if (!canBuyNow || !selectedEventId || !selectedDate || priceStatus !== 'ok' || !pricesData || !pricesData.ok) {
              console.warn('[BOOKING_WIDGET] Buy Now blocked - missing requirements')
              return
            }

            try {
              // Build cart item
              const atlanticoLang = lang
              // Use selectedTime if available, otherwise '00:00' only if no sessions
              const sessions = sessionsByDay[selectedDate] || []
              const allowedTimes = sessions.map(s => s.time).filter(t => t && t !== '00:00' && t !== '-')
              const sesTime = allowedTimes.length > 0 ? (selectedTime || allowedTimes[0] || '00:00') : '00:00'
              
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

                console.log('[CART] before', cart.items.length)
                console.log('[BOOKING_WIDGET] Adding to cart and navigating to checkout:', itemData)
                cart.addItem(itemData)
                console.log('[CART] after', cart.items.length)
                router.push('/checkout')
                console.log('[BOOKING_WIDGET] Navigation triggered')
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

