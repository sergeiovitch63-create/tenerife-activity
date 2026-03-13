/**
 * Activity Booking Panel
 * 
 * Universal booking panel component with date/time/participant selection and cart buttons
 * Single source of truth for all Atlántico groupDetails activities
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/navigation'
import { useCartStore } from '@/lib/cart/store'
import { createCartItem, type PriceSnapshot } from '@/lib/cart/types'
import { Button } from '@/ui/components/shared/Button'
import { CartToast } from '@/components/cart/CartToast'
import { dispatchFlyToCart } from '@/components/cart/FlyToCartAnimation'
import { mapLocaleToAtlanticoLang } from '@/lib/atlantico/lang'
import { sanitizeAtlanticoHtml } from '@/lib/atlantico/htmlAssets'

import type { MeetingPoint } from '@/app/api/atlantico/event-details/route'
import { MeetingPointsDisplay } from '@/components/booking/MeetingPointsDisplay'
import { isDateRangeGroup } from '@/config/date-range-tours'

interface ActivityBookingPanelProps {
  t_group: string
  initialEventId: string
  events: Array<{ t_id: string; title: string }>
  locale: string
  /** Tour display name for cart (from group details page) */
  tourName?: string
  language: string // Atlántico language param (e.g., 'ENG', 'ESP')
  duration?: string | number // Activity duration
  startingPrice?: number | string // Starting price
  cancellationPolicy?: string // Cancellation policy text
  cancellationTitle?: string // Cancellation policy title
  childAge?: string // e.g. "0-11"
  infantAge?: string // e.g. "0-2" or "NO"
  meetingPoints?: MeetingPoint[] // Meeting points and pickup points
  /** Show Children selector. When false, only Adults. Based on Prices section. */
  showChildSelector?: boolean
  /** Show Infants selector. When false, hide. Based on Prices section. */
  showInfantSelector?: boolean
  /** Use "Quantity" instead of "Adults" when price > 200€ */
  useQuantityLabel?: boolean
  /** Twin Ticket (group 168): two dates - Siam Park + Loro Parque */
  isCombination?: boolean
}

interface BookingReadinessState {
  ready: boolean
  missing: string[]
  readyForAddToCart: boolean
  readyForBuyNow: boolean
}

/**
 * Universal validation function for booking readiness
 */
function getBookingReadinessState(
  t_group: string | null,
  selectedEventId: string | null,
  tourDate: string | null,
  sesTime: string | null,
  hasSessions: boolean,
  adults: number,
  childs: number,
  infants: number,
  priceSnapshot: PriceSnapshot | null,
  loadingPrices: boolean,
  loadingSessions: boolean,
  forBuyNow: boolean = false,
  isCombination: boolean = false,
  tourDate2: string | null = null,
  isDateRange: boolean = false,
  tourDateEnd: string | null = null
): BookingReadinessState {
  const missing: string[] = []

  // Required: t_group
  if (!t_group) {
    missing.push('tourGroupRequired')
  }

  // Required: selectedEventId (t_id)
  if (!selectedEventId) {
    missing.push('pleaseSelectOption')
  }

  // Required: tourDate
  if (!tourDate) {
    missing.push('pleaseSelectDate')
  }

  // Combination: require second date (Loro Parque)
  if (isCombination && !tourDate2) {
    missing.push('pleaseSelectDateLoroParque')
  }
  // Combination: Siam Park and Loro Parque must be different days
  if (isCombination && tourDate && tourDate2 && tourDate === tourDate2) {
    missing.push('siamLoroDifferentDays')
  }

  // Date range (car rental): require end date and end >= start
  if (isDateRange && !tourDateEnd) {
    missing.push('pleaseSelectEndDate')
  }
  if (isDateRange && tourDate && tourDateEnd && tourDateEnd < tourDate) {
    missing.push('endDateAfterStart')
  }

  // Pax total must be >= 1 (skip for date range: no participant selectors, use 1 by default)
  if (!isDateRange) {
    const paxTotal = adults + childs + infants
    if (paxTotal < 1) {
      missing.push('atLeastOneParticipant')
    } else if (adults < 1) {
      missing.push('atLeastOneAdult')
    }
  }

  // If sessions exist -> require sesTime
  // If no sessions -> sesTime = "00:00" automatically
  if (hasSessions && !sesTime) {
    missing.push('pleaseSelectTime')
  }

  // Prices: allow clicking even if not loaded (will show spinner during final recalculation)
  // But if we have a priceSnapshot, it's better
  const hasPrice = priceSnapshot !== null
  if (!hasPrice && !loadingPrices) {
    // Only warn if not loading (user should see prices before booking)
    missing.push('pricesBeingCalculated')
  }

  // Customer fields (name/email/phone) are NOT required here
  // They will be collected at checkout, not on the activity page

  const ready = missing.length === 0 && !loadingSessions
  const readyForAddToCart = ready && hasPrice
  const readyForBuyNow = readyForAddToCart // Same requirements for now

  return {
    ready,
    missing,
    readyForAddToCart,
    readyForBuyNow,
  }
}

export function ActivityBookingPanel({
  t_group,
  initialEventId,
  events,
  locale,
  language,
  duration,
  startingPrice,
  cancellationPolicy,
  cancellationTitle,
  childAge,
  infantAge,
  meetingPoints,
  showChildSelector = true,
  showInfantSelector = true,
  useQuantityLabel = false,
  isCombination = false,
  tourName,
}: ActivityBookingPanelProps) {
  const t = useTranslations('bookingPanel')
  const tErrors = useTranslations('bookingPanel.errors')
  const router = useRouter()
  const { addItem } = useCartStore()
  const [selectedEventId, setSelectedEventId] = useState(initialEventId)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedDate2, setSelectedDate2] = useState('') // Loro Parque date for combinations
  const [selectedDateEnd, setSelectedDateEnd] = useState('') // End date for date range (car rental)
  const [selectedTime, setSelectedTime] = useState('')
  const [adults, setAdults] = useState(1)
  const [childs, setChilds] = useState(0)
  const [infants, setInfants] = useState(0)
  const [priceSnapshot, setPriceSnapshot] = useState<PriceSnapshot | null>(null)
  const [loadingPrices, setLoadingPrices] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [hasSessions, setHasSessions] = useState(false)
  const [currency, setCurrency] = useState('EUR')
  const [showToast, setShowToast] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Calendar state for available dates
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [loadingCalendar, setLoadingCalendar] = useState(false)
  const [sessionsByDay, setSessionsByDay] = useState<Record<string, Array<{ time: string; available: number }>>>({})
  
  const currentTId = selectedEventId || initialEventId

  // Auto-set sesTime to "00:00" when no sessions
  useEffect(() => {
    if (!hasSessions && selectedTime !== '00:00') {
      setSelectedTime('00:00')
    }
  }, [hasSessions, selectedTime])

  // Load sessions when date changes
  useEffect(() => {
    if (selectedDate && currentTId) {
      loadSessions()
    } else {
      setAvailableTimes([])
      setHasSessions(false)
      setSelectedTime('00:00')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, currentTId])

  // Load calendar (available dates) when event or month changes
  useEffect(() => {
    if (currentTId) {
      loadCalendar()
    } else {
      setAvailableDates([])
      setSessionsByDay({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTId, currentMonth])

  // Load prices when date/event/participants change
  useEffect(() => {
    if (selectedDate && currentTId) {
      loadPriceData()
    } else {
      setPriceSnapshot(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, currentTId, adults, childs, infants])

  const loadCalendar = async () => {
    if (!currentTId) return

    setLoadingCalendar(true)
    try {
      const langCode = language.length === 3 
        ? language.toLowerCase().substring(0, 2)
        : language.toLowerCase().substring(0, 2)
      const langForLimits = mapLocaleToAtlanticoLang(langCode)
      const dateMonth = currentMonth.substring(0, 7) + '-01'
      
      const response = await fetch(
        `/api/atlantico/limits?eventId=${currentTId}&lang=${langForLimits}&month=${dateMonth}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to load calendar')
      }
      
      const data = await response.json()
      
      // Extract available dates
      if (data.availableDates && Array.isArray(data.availableDates)) {
        setAvailableDates(data.availableDates)
      } else {
        setAvailableDates([])
      }
      
      // Extract sessions by day
      if (data.sessionsByDay && typeof data.sessionsByDay === 'object') {
        setSessionsByDay(data.sessionsByDay)
      } else {
        setSessionsByDay({})
      }
    } catch (error) {
      console.error('Failed to load calendar:', error)
      setAvailableDates([])
      setSessionsByDay({})
    } finally {
      setLoadingCalendar(false)
    }
  }

  const loadSessions = async () => {
    if (!selectedDate || !currentTId) return

    setLoadingSessions(true)
    try {
      // Load limits to get available sessions for the date
      // Convert language to lowercase format (ENG -> en, ESP -> es, etc.)
      // Language prop might be uppercase (ENG) or already lowercase (en)
      const langCode = language.length === 3 
        ? language.toLowerCase().substring(0, 2) // ENG -> en
        : language.toLowerCase().substring(0, 2) // en -> en
      const langForLimits = mapLocaleToAtlanticoLang(langCode)
      const dateMonth = selectedDate.substring(0, 7) + '-01' // YYYY-MM-01
      const response = await fetch(
        `/api/atlantico/loadLimits/${currentTId}/${langForLimits}/${dateMonth}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to load sessions')
      }
      
      const data = await response.json()
      
      // Extract sessions for the selected date
      const dateStr = selectedDate.replace(/-/g, '') // YYYYMMDD
      let sessions: string[] = []
      
      if (data.sessionsByDate && data.sessionsByDate[dateStr]) {
        sessions = Array.isArray(data.sessionsByDate[dateStr])
          ? data.sessionsByDate[dateStr].map((s: any) => {
              if (typeof s === 'string') return s
              return s.time || s.sesTime || s
            })
          : []
      } else if (data.avail && data.avail[dateStr]) {
        const availData = data.avail[dateStr]
        if (Array.isArray(availData.times)) {
          sessions = availData.times
        }
      }
      
      // Filter and normalize session times
      sessions = sessions
        .filter((s): s is string => typeof s === 'string' && s.length > 0)
        .map((s) => {
          // Normalize to HH:mm format
          const match = s.match(/(\d{1,2}):(\d{2})/)
          if (match) {
            const hours = String(parseInt(match[1], 10)).padStart(2, '0')
            const minutes = match[2]
            return `${hours}:${minutes}`
          }
          return s
        })
        .filter((s, i, arr) => arr.indexOf(s) === i) // Remove duplicates
        .sort()
      
      setAvailableTimes(sessions)
      setHasSessions(sessions.length > 0)
      
      // Auto-select first session if only one available
      if (sessions.length === 1 && !selectedTime) {
        setSelectedTime(sessions[0])
      } else if (sessions.length === 0) {
        setSelectedTime('00:00')
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
      setAvailableTimes([])
      setHasSessions(false)
      setSelectedTime('00:00')
    } finally {
      setLoadingSessions(false)
    }
  }

  const loadPriceData = async () => {
    if (!selectedDate || !currentTId) return

    setLoadingPrices(true)
    try {
      const response = await fetch(`/api/atlantico/prices?eventId=${currentTId}&date=${selectedDate}&lang=${language}`)
      if (!response.ok) {
        throw new Error('Failed to load prices')
      }
      const data = await response.json()
      
      let adultPrice: number
      let childPrice: number
      let infantPrice: number
      let total: number

      if (data.type === 'per_day' && Array.isArray(data.tiers) && data.tiers.length > 0) {
        const tier = data.tiers[0] as { days: number; price: number }
        const pricePerDay = tier.days > 0 ? tier.price / tier.days : tier.price
        adultPrice = pricePerDay
        childPrice = 0
        infantPrice = 0
        total = pricePerDay
      } else {
        adultPrice = data.adult ?? data.PVPA ?? data.priceAdult ?? 0
        childPrice = data.child ?? data.PVPC ?? data.priceChild ?? 0
        infantPrice = data.infant ?? data.PVPOS ?? data.priceInfant ?? 0
        total = adultPrice * adults + childPrice * childs + infantPrice * infants

        // Fallback: API may return type:'unknown' with raw for per_day (car rental)
        if (total === 0 && data.raw && typeof data.raw === 'object') {
          const r = data.raw as Record<string, unknown>
          const pvpa = r.PVPA ?? r.pvpa ?? r.VPVA ?? r.vpva ?? r.priceA ?? r.price ?? r.PVP
          const p = typeof pvpa === 'number' ? pvpa : typeof pvpa === 'string' ? parseFloat(pvpa) : NaN
          if (!isNaN(p) && p > 0) {
            adultPrice = p
            total = p
          }
        }
      }

      // Date range: if still 0, use startingPrice as daily rate fallback
      const isDateRangeLocal = isDateRangeGroup(t_group)
      if (isDateRangeLocal && total === 0 && startingPrice != null) {
        const sp = typeof startingPrice === 'number' ? startingPrice : parseFloat(String(startingPrice))
        if (!isNaN(sp) && sp > 0) {
          adultPrice = sp
          childPrice = 0
          infantPrice = 0
          total = sp
        }
      }

      setPriceSnapshot({
        adult: adultPrice,
        child: childPrice,
        infant: infantPrice,
        total,
      })
      setError(null)
    } catch (error) {
      console.error('Failed to load prices:', error)
      setError('Failed to load prices. Please try again.')
    } finally {
      setLoadingPrices(false)
    }
  }

  const isDateRange = isDateRangeGroup(t_group)

  const numberOfDays = useMemo(() => {
    if (!isDateRange || !selectedDate || !selectedDateEnd) return 1
    const d1 = new Date(selectedDate)
    const d2 = new Date(selectedDateEnd)
    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(1, diff + 1)
  }, [isDateRange, selectedDate, selectedDateEnd])

  const displayTotal = useMemo(() => {
    if (!priceSnapshot) return 0
    return isDateRange ? priceSnapshot.total * numberOfDays : priceSnapshot.total
  }, [priceSnapshot, isDateRange, numberOfDays])

  // Calculate readiness state
  const readiness = useMemo(() => {
    const finalSesTime = hasSessions && selectedTime ? selectedTime : '00:00'
    return getBookingReadinessState(
      t_group,
      currentTId,
      selectedDate,
      finalSesTime,
      hasSessions,
      adults,
      childs,
      infants,
      priceSnapshot,
      loadingPrices,
      loadingSessions,
      false,
      isCombination,
      isCombination ? selectedDate2 || null : null,
      isDateRange,
      isDateRange ? selectedDateEnd || null : null
    )
  }, [
    t_group,
    currentTId,
    selectedDate,
    selectedTime,
    hasSessions,
    adults,
    childs,
    infants,
    priceSnapshot,
    loadingPrices,
    loadingSessions,
    isCombination,
    selectedDate2,
    isDateRange,
    selectedDateEnd,
  ])

  // Debug click handler (DEV only)
  const debugClick = (label: string) => (e: React.MouseEvent<HTMLButtonElement>) => {
    const target = e.currentTarget as HTMLButtonElement
    const computedStyle = window.getComputedStyle(target)
    console.log(`[BOOKING_PANEL] ${label} CLICK`, {
      disabled: target.disabled,
      pointerEvents: computedStyle.pointerEvents,
      readiness: readiness,
      priceSnapshot: priceSnapshot,
      selectedDate,
      currentTId,
    })
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[BOOKING_PANEL] ${label} - Check above for details`)
    }
  }

  // Handle Add to Cart
  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget
    console.log('[BOOKING_PANEL] handleAddToCart called', {
      disabled: button.disabled,
      readiness: readiness,
      priceSnapshot: priceSnapshot,
    })

    setError(null)

    if (!readiness.readyForAddToCart || !priceSnapshot) {
      console.warn('[BOOKING_PANEL] Add to Cart blocked:', {
        readyForAddToCart: readiness.readyForAddToCart,
        hasPriceSnapshot: !!priceSnapshot,
        missing: readiness.missing,
      })
      return
    }

    try {
      const finalSesTime = hasSessions && selectedTime ? selectedTime : '00:00'
      const finalPriceSnapshot = priceSnapshot
        ? { ...priceSnapshot, total: displayTotal }
        : null
      if (!finalPriceSnapshot) throw new Error('Price snapshot required')
      const itemData: Parameters<typeof addItem>[0] = {
        t_group,
        t_id: currentTId,
        tourName,
        language,
        tourDate: selectedDate,
        sesTime: finalSesTime,
        adults: isDateRange ? 1 : adults,
        childs: isDateRange ? 0 : childs,
        infants: isDateRange ? 0 : infants,
        priceSnapshot: finalPriceSnapshot,
        currency,
      }
      if (isCombination && selectedDate2) {
        itemData.tourDate2 = selectedDate2
        itemData.isCombination = true
      }
      if (isDateRange && selectedDateEnd) {
        itemData.tourDateEnd = selectedDateEnd
        itemData.isDateRange = true
      }

      console.log('[BOOKING_PANEL] Adding item to cart:', itemData)
      addItem(itemData)
      dispatchFlyToCart(button)
      setShowToast(true)
      console.log('[BOOKING_PANEL] Item added successfully')
    } catch (err) {
      console.error('[BOOKING_PANEL] Add to cart error:', err)
      setError(err instanceof Error ? err.message : 'Failed to add to cart')
    }
  }

  // Handle Buy Now
  const handleBuyNow = (e: React.MouseEvent<HTMLButtonElement>) => {
    const target = e.currentTarget as HTMLButtonElement
    console.log('[BOOKING_PANEL] handleBuyNow called', {
      disabled: target.disabled,
      readiness: readiness,
      priceSnapshot: priceSnapshot,
    })

    setError(null)

    if (!readiness.readyForBuyNow || !priceSnapshot) {
      console.warn('[BOOKING_PANEL] Buy Now blocked:', {
        readyForBuyNow: readiness.readyForBuyNow,
        hasPriceSnapshot: !!priceSnapshot,
        missing: readiness.missing,
      })
      return
    }

    try {
      const finalSesTime = hasSessions && selectedTime ? selectedTime : '00:00'
      const finalPriceSnapshot = priceSnapshot
        ? { ...priceSnapshot, total: displayTotal }
        : null
      if (!finalPriceSnapshot) throw new Error('Price snapshot required')
      const itemData: Parameters<typeof addItem>[0] = {
        t_group,
        t_id: currentTId,
        tourName,
        language,
        tourDate: selectedDate,
        sesTime: finalSesTime,
        adults: isDateRange ? 1 : adults,
        childs: isDateRange ? 0 : childs,
        infants: isDateRange ? 0 : infants,
        priceSnapshot: finalPriceSnapshot,
        currency,
      }
      if (isCombination && selectedDate2) {
        itemData.tourDate2 = selectedDate2
        itemData.isCombination = true
      }
      if (isDateRange && selectedDateEnd) {
        itemData.tourDateEnd = selectedDateEnd
        itemData.isDateRange = true
      }

      console.log('[BOOKING_PANEL] Adding item and navigating to checkout:', itemData)
      // Add to cart first (if not already there)
      addItem(itemData)

      // Navigate directly to checkout (customer info will be collected there)
      router.push('/checkout')
      console.log('[BOOKING_PANEL] Navigation triggered')
    } catch (err) {
      console.error('[BOOKING_PANEL] Buy Now error:', err)
      setError(err instanceof Error ? err.message : 'Failed to proceed to checkout')
    }
  }

  // DEV: Capture click events to detect overlays
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

    const el = document.querySelector('[data-booking-panel-root]')
    if (!el) {
      console.warn('[BOOKING_PANEL] Root element not found')
      return
    }

    const onDocClick: EventListener = (ev) => {
      const e = ev as globalThis.MouseEvent
      console.log('[BOOKING_PANEL] CAPTURE', {
        target: e.target,
        currentTarget: e.currentTarget,
        button: (e.target as HTMLElement)?.tagName,
      })
    }

    el.addEventListener('click', onDocClick, true)
    return () => el.removeEventListener('click', onDocClick, true)
  }, [])

  // Format price
  const formatPrice = (price: number | string | undefined): string => {
    if (!price) return ''
    if (typeof price === 'number') {
      return `€${price.toFixed(2)}`
    }
    return String(price)
  }

  return (
    <div 
      data-booking-panel-root
      className="bg-white border border-glass-200 rounded-xl p-6 space-y-6 shadow-lg"
      style={{ position: 'relative', zIndex: 50, pointerEvents: 'auto' }}
    >
      <h3 className="text-xl font-bold text-glass-900 mb-4">Manage your booking</h3>

      {/* Premium Info Cards - Duration & Starting Price */}
      <div className="grid grid-cols-1 gap-3 pb-4 border-b border-glass-200">
        {duration && (
          <div className="bg-gradient-to-br from-ocean-50 to-blue-50 rounded-xl p-4 border border-ocean-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-ocean-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-ocean-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-ocean-600 uppercase tracking-wide mb-1">Duration</div>
                <div className="text-lg font-bold text-glass-900">
                  {typeof duration === 'number' ? `${duration} hours` : `${duration} hours`}
                </div>
              </div>
            </div>
          </div>
        )}
        {startingPrice && (
          <div className="bg-gradient-to-br from-ocean-50 to-blue-50 rounded-xl p-4 border border-ocean-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-ocean-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-ocean-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.25 7.756a4.5 4.5 0 1 0 0 8.488M7.5 10.5h5.25m-5.25 3h5.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-ocean-600 uppercase tracking-wide mb-1">Starting from</div>
                <div className="text-lg font-bold text-glass-900">
                  {formatPrice(startingPrice)}
                </div>
              </div>
            </div>
          </div>
        )}
        {cancellationPolicy && (
          <div className="bg-gradient-to-br from-ocean-50 to-blue-50 rounded-xl p-4 border border-ocean-100">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-ocean-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-ocean-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                {cancellationTitle && (
                  <div className="text-sm font-bold text-ocean-800 mb-2">{cancellationTitle}</div>
                )}
                <div 
                  className="text-xs text-ocean-700 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={sanitizeAtlanticoHtml(cancellationPolicy)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Date Selection - Calendar */}
      {isDateRange ? (
        /* Date range (car rental): start + end, days in between highlighted in blue */
        <div>
          <label className="block text-sm font-medium text-glass-700 mb-2">
            Select start and end date *
          </label>
          <p className="text-xs text-glass-500 mb-2">Click to select start date, then end date. Days in between will be highlighted.</p>
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                const [y, m] = currentMonth.split('-').map(Number)
                const d = new Date(y, m - 2, 1)
                setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`)
              }}
              className="px-2 py-1 text-sm text-glass-600 hover:text-glass-900"
              disabled={loadingCalendar}
            >
              ← Prev
            </button>
            <span className="text-sm font-medium text-glass-900">
              {new Date(currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={() => {
                const [y, m] = currentMonth.split('-').map(Number)
                const d = new Date(y, m, 1)
                setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`)
              }}
              className="px-2 py-1 text-sm text-glass-600 hover:text-glass-900"
              disabled={loadingCalendar}
            >
              Next →
            </button>
          </div>
          {selectedDate && !selectedDateEnd && (
            <p className="text-sm text-ocean-600 font-medium mb-2">Choose your end date</p>
          )}
          {loadingCalendar ? (
            <div className="text-sm text-glass-600 text-center py-4">Loading calendar...</div>
          ) : (
            <div className="border border-glass-200 rounded-lg p-2 bg-white">
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-glass-600 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const [year, month] = currentMonth.split('-').map(Number)
                  const lastDay = new Date(year, month, 0)
                  const daysInMonth = lastDay.getDate()
                  const firstDay = new Date(year, month - 1, 1)
                  const startingDayOfWeek = (firstDay.getDay() + 6) % 7
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  const days: JSX.Element[] = []
                  for (let i = 0; i < startingDayOfWeek; i++) {
                    days.push(<div key={`re-${i}`} className="aspect-square" />)
                  }
                  for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    const date = new Date(year, month - 1, day)
                    const isPast = date < today
                    const available = !isPast && availableDates.includes(dateStr)
                    const isStart = dateStr === selectedDate
                    const isEnd = dateStr === selectedDateEnd
                    const inRange = selectedDate && selectedDateEnd && dateStr >= selectedDate && dateStr <= selectedDateEnd
                    const handleClick = () => {
                      if (!available || isPast) return
                      if (!selectedDate) {
                        setSelectedDate(dateStr)
                        setSelectedDateEnd('')
                        setPriceSnapshot(null)
                      } else if (!selectedDateEnd) {
                        if (dateStr >= selectedDate) {
                          setSelectedDateEnd(dateStr)
                          // Do NOT clear priceSnapshot - daily rate stays same, displayTotal = total * numberOfDays
                        } else {
                          setSelectedDate(dateStr)
                          setSelectedDateEnd('')
                          setPriceSnapshot(null)
                        }
                      } else {
                        setSelectedDate(dateStr)
                        setSelectedDateEnd('')
                        setPriceSnapshot(null)
                      }
                    }
                    const isSelectable = available && !isPast
                    const showBlue = inRange || (isStart && !selectedDateEnd)
                    days.push(
                      <button
                        key={day}
                        type="button"
                        onClick={handleClick}
                        disabled={!isSelectable}
                        className={`aspect-square p-1 rounded text-sm border transition-colors ${
                          isPast ? 'bg-glass-100 text-glass-400 cursor-not-allowed' :
                          showBlue ? 'bg-ocean-500 text-white border-ocean-500' :
                          isSelectable ? 'bg-white text-glass-900 hover:bg-ocean-50 cursor-pointer border-glass-200' :
                          'bg-glass-100 text-glass-400 cursor-not-allowed'
                        } ${date.getTime() === today.getTime() ? 'ring-2 ring-ocean-300' : ''}`}
                      >
                        {day}
                      </button>
                    )
                  }
                  return days
                })()}
              </div>
            </div>
          )}
        </div>
      ) : (
      <div>
        <label className="block text-sm font-medium text-glass-700 mb-2">
          {isCombination ? 'Siam Park – Select date *' : 'Select a date *'}
        </label>
        
        {/* Calendar Navigation */}
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              const [year, month] = currentMonth.split('-').map(Number)
              const newDate = new Date(year, month - 2, 1)
              setCurrentMonth(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-01`)
            }}
            className="px-2 py-1 text-sm text-glass-600 hover:text-glass-900"
            disabled={loadingCalendar}
          >
            ← Prev
          </button>
          <span className="text-sm font-medium text-glass-900">
            {new Date(currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button
            type="button"
            onClick={() => {
              const [year, month] = currentMonth.split('-').map(Number)
              const newDate = new Date(year, month, 1)
              setCurrentMonth(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-01`)
            }}
            className="px-2 py-1 text-sm text-glass-600 hover:text-glass-900"
            disabled={loadingCalendar}
          >
            Next →
          </button>
        </div>

        {/* Calendar Grid */}
        {loadingCalendar ? (
          <div className="text-sm text-glass-600 text-center py-4">
            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-ocean-600 mr-2"></div>
            Loading calendar...
          </div>
        ) : (
          <div className="border border-glass-200 rounded-lg p-2 bg-white">
            {/* Day headers - Monday first */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-glass-600 py-1">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {(() => {
                const [year, month] = currentMonth.split('-').map(Number)
                const firstDay = new Date(year, month - 1, 1)
                const lastDay = new Date(year, month, 0)
                const daysInMonth = lastDay.getDate()
                // Monday=0, Sunday=6 (European week start)
                const startingDayOfWeek = (firstDay.getDay() + 6) % 7
                const today = new Date()
                today.setHours(0, 0, 0, 0)

                const days: JSX.Element[] = []

                // Empty cells for days before month start
                for (let i = 0; i < startingDayOfWeek; i++) {
                  days.push(<div key={`empty-${i}`} className="aspect-square" />)
                }

                // Days of month
                for (let day = 1; day <= daysInMonth; day++) {
                  const date = new Date(year, month - 1, day)
                  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const isToday = date.getTime() === today.getTime()
                  const isPast = date < today
                  const available = !isPast && availableDates.includes(dateStr)
                  const blockedByLoro = isCombination && dateStr === selectedDate2
                  const isSelectable = available && !blockedByLoro
                  const isSelected = dateStr === selectedDate

                  days.push(
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        if (isSelectable) {
                          setSelectedDate(dateStr)
                          setSelectedTime('')
                          setPriceSnapshot(null)
                        }
                      }}
                      disabled={!isSelectable || isPast}
                      className={`aspect-square p-1 rounded text-sm transition-colors ${
                        isPast
                          ? 'bg-glass-100 text-glass-400 border-glass-200 opacity-60 cursor-not-allowed'
                          : isSelectable
                          ? isSelected
                            ? 'bg-ocean-600 text-white border-ocean-600'
                            : 'bg-white text-glass-900 border-glass-200 hover:bg-ocean-50 hover:border-ocean-300 cursor-pointer'
                          : 'bg-glass-100 text-glass-400 border-glass-200 cursor-not-allowed opacity-60'
                      } ${isToday ? 'ring-2 ring-ocean-300' : ''} border`}
                    >
                      {day}
                    </button>
                  )
                }

                return days
              })()}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Second date – Loro Parque (combinations only) */}
      {isCombination && (
        <div>
          <label className="block text-sm font-medium text-glass-700 mb-2">
            Loro Parque – Select date *
          </label>
          {loadingCalendar ? (
            <div className="text-sm text-glass-600 text-center py-4">{t('loading')}</div>
          ) : (
            <div className="border border-glass-200 rounded-lg p-2 bg-white">
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-glass-600 py-1">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const [year, month] = currentMonth.split('-').map(Number)
                  const firstDay = new Date(year, month - 1, 1)
                  const lastDay = new Date(year, month, 0)
                  const daysInMonth = lastDay.getDate()
                  const startingDayOfWeek = (firstDay.getDay() + 6) % 7
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  const days: JSX.Element[] = []
                  for (let i = 0; i < startingDayOfWeek; i++) {
                    days.push(<div key={`e-${i}`} className="aspect-square" />)
                  }
                  for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    const date = new Date(year, month - 1, day)
                    const isPast = date < today
                    const available = !isPast && availableDates.includes(dateStr)
                    const blockedBySiam = dateStr === selectedDate
                    const isSelectable = available && !blockedBySiam
                    const isSelected = dateStr === selectedDate2
                    days.push(
                      <button
                        key={day}
                        type="button"
                        onClick={() => isSelectable && setSelectedDate2(dateStr)}
                        disabled={!isSelectable || isPast}
                        className={`aspect-square p-1 rounded text-sm border transition-colors ${
                          isPast ? 'bg-glass-100 text-glass-400 cursor-not-allowed' :
                          isSelectable ? (isSelected ? 'bg-ocean-600 text-white' : 'bg-white text-glass-900 hover:bg-ocean-50 cursor-pointer') :
                          'bg-glass-100 text-glass-400 cursor-not-allowed'
                        }`}
                      >
                        {day}
                      </button>
                    )
                  }
                  return days
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Time Selection (if has sessions) */}
      {loadingSessions && (
        <div className="text-sm text-glass-600">Loading available times...</div>
      )}
      {!loadingSessions && hasSessions && (
        <div>
          <label className="block text-sm font-medium text-glass-700 mb-2">
            {t('selectTime')}
          </label>
          <select
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="w-full px-3 py-2 border border-glass-300 rounded-md"
            required
          >
            <option value="">Select time</option>
            {availableTimes.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Participants - hidden for date range (car rental): price = daily rate × days only */}
      {!isDateRange && (
      <div>
        <label className="block text-xs font-medium text-glass-700 mb-1">
          Number of participants *
        </label>
        <div className="flex flex-col gap-4 items-center">
          <div className="flex flex-col items-center w-full max-w-[7rem]">
            <label className="block text-[10px] text-glass-600 mb-0.5 text-center">{useQuantityLabel ? t('quantity') : t('adults')}</label>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setAdults((v) => Math.max(1, v - 1))}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-ocean-100 hover:bg-ocean-200 text-ocean-600 font-bold text-sm leading-none shadow-sm hover:shadow transition-shadow"
                aria-label="Decrease adults"
              >
                −
              </button>
              <span className="text-sm font-bold text-glass-900 w-5 text-center">
                {adults}
              </span>
              <button
                type="button"
                onClick={() => setAdults((v) => v + 1)}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-ocean-100 hover:bg-ocean-200 text-ocean-600 font-bold text-sm leading-none shadow-sm hover:shadow transition-shadow"
                aria-label="Increase adults"
              >
                +
              </button>
            </div>
          </div>
          {showChildSelector && (
          <div className="flex flex-col items-center w-full max-w-[7rem]">
            <label className="block text-[10px] text-glass-600 mb-0.5 text-center">
              Children {childAge ? `(${childAge})` : ''}
            </label>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setChilds((v) => Math.max(0, v - 1))}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-ocean-100 hover:bg-ocean-200 text-ocean-600 font-bold text-sm leading-none shadow-sm hover:shadow transition-shadow"
                aria-label="Decrease children"
              >
                −
              </button>
              <span className="text-sm font-bold text-glass-900 w-5 text-center">
                {childs}
              </span>
              <button
                type="button"
                onClick={() => setChilds((v) => v + 1)}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-ocean-100 hover:bg-ocean-200 text-ocean-600 font-bold text-sm leading-none shadow-sm hover:shadow transition-shadow"
                aria-label="Increase children"
              >
                +
              </button>
            </div>
          </div>
          )}
          {showInfantSelector && (
          <div className="flex flex-col items-center w-full max-w-[7rem]">
            <label className="block text-[10px] text-glass-600 mb-0.5 text-center">
              Infants {infantAge ? `(${infantAge})` : ''}
            </label>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setInfants((v) => Math.max(0, v - 1))}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-ocean-100 hover:bg-ocean-200 text-ocean-600 font-bold text-sm leading-none shadow-sm hover:shadow transition-shadow"
                aria-label="Decrease infants"
              >
                −
              </button>
              <span className="text-sm font-bold text-glass-900 w-5 text-center">
                {infants}
              </span>
              <button
                type="button"
                onClick={() => setInfants((v) => v + 1)}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-ocean-100 hover:bg-ocean-200 text-ocean-600 font-bold text-sm leading-none shadow-sm hover:shadow transition-shadow"
                aria-label="Increase infants"
              >
                +
              </button>
            </div>
          </div>
          )}
        </div>
      </div>
      )}

      {/* Meeting Points / Pickup Points */}
      {(() => {
        // Debug log
        if (process.env.NODE_ENV === 'development' && t_group === '508') {
          console.log('[ACTIVITY_508_BOOKING_PANEL] Meeting points check:', {
            hasMeetingPoints: !!meetingPoints,
            isArray: Array.isArray(meetingPoints),
            length: Array.isArray(meetingPoints) ? meetingPoints.length : 0,
            meetingPoints,
          })
        }
        
        if (meetingPoints && Array.isArray(meetingPoints) && meetingPoints.length > 0) {
          return (
            <div className="border-t border-glass-200 pt-4 mt-4">
              <MeetingPointsDisplay
                meetingPoints={meetingPoints}
                showTitle={true}
                title={t('meetingPickupPoints')}
                className="text-sm"
              />
            </div>
          )
        }
        return null
      })()}

      {/* Price Display */}
      {priceSnapshot && (
        <div className="border-t border-glass-200 pt-4">
          {isDateRange && selectedDateEnd && (
            <p className="text-xs text-glass-500 mb-1">
              {priceSnapshot.total.toFixed(2)} €/day × {numberOfDays} day{numberOfDays > 1 ? 's' : ''} = {displayTotal.toFixed(2)} €
            </p>
          )}
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-glass-600">Total</span>
            <span className="text-xl font-bold text-glass-900">
              {displayTotal.toFixed(2)} {currency}
            </span>
          </div>
        </div>
      )}

      {loadingPrices && (
        <div className="text-sm text-glass-600 text-center py-2">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-ocean-600 mr-2"></div>
          Loading prices...
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}

      {/* Missing Requirements (shown inline) */}
      {!readiness.ready && readiness.missing.length > 0 && (
        <div className="text-sm text-glass-600 space-y-1">
          {readiness.missing.map((key, idx) => (
            <div key={idx} className="flex items-start">
              <span className="text-red-500 mr-2">•</span>
              <span>{tErrors(key)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Cart Buttons - ALWAYS VISIBLE */}
      <div className="space-y-3" style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10 }}>
        {/* Add to Cart Button */}
        <button
          type="button"
          onClick={(e) => {
            debugClick('ADD_TO_CART')(e)
            handleAddToCart(e)
          }}
          disabled={!readiness.readyForAddToCart || loadingPrices || loadingSessions}
          className="w-full px-6 py-3 bg-ocean-600 text-white font-medium rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ pointerEvents: 'auto', touchAction: 'manipulation' }}
          onMouseEnter={(e) => {
            if (process.env.NODE_ENV === 'development') {
              const btn = e.currentTarget
              const r = btn.getBoundingClientRect()
              const centerX = r.left + r.width / 2
              const centerY = r.top + r.height / 2
              const elementAtPoint = document.elementFromPoint(centerX, centerY)
              console.log('[BOOKING_PANEL] Button hover - element at center:', {
                element: elementAtPoint,
                isButton: elementAtPoint === btn,
                button: btn,
              })
            }
          }}
        >
          Add to Cart
        </button>

        {/* Buy Now Button */}
        <button
          type="button"
          onClick={(e) => {
            debugClick('BUY_NOW')(e)
            handleBuyNow(e)
          }}
          disabled={!readiness.readyForBuyNow || loadingPrices || loadingSessions}
          className="w-full px-6 py-3 bg-ocean-700 text-white font-medium rounded-lg hover:bg-ocean-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ pointerEvents: 'auto' }}
          onMouseEnter={(e) => {
            if (process.env.NODE_ENV === 'development') {
              const btn = e.currentTarget
              const r = btn.getBoundingClientRect()
              const centerX = r.left + r.width / 2
              const centerY = r.top + r.height / 2
              const elementAtPoint = document.elementFromPoint(centerX, centerY)
              console.log('[BOOKING_PANEL] Button hover - element at center:', {
                element: elementAtPoint,
                isButton: elementAtPoint === btn,
                button: btn,
              })
            }
          }}
        >
          Buy Now
        </button>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <CartToast
          message={t('itemAddedToCart')}
          onClose={() => setShowToast(false)}
          locale={locale}
        />
      )}
    </div>
  )
}
