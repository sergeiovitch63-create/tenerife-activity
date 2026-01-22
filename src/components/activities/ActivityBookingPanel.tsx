/**
 * Activity Booking Panel
 * 
 * Universal booking panel component with date/time/participant selection and cart buttons
 * Single source of truth for all Atlántico groupDetails activities
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from '@/navigation'
import { useCartStore } from '@/lib/cart/store'
import { createCartItem, type PriceSnapshot } from '@/lib/cart/types'
import { Button } from '@/ui/components/shared/Button'
import { CartToast } from '@/components/cart/CartToast'
import { mapLocaleToAtlanticoLang } from '@/lib/atlantico/lang'

interface ActivityBookingPanelProps {
  t_group: string
  initialEventId: string
  events: Array<{ t_id: string; title: string }>
  locale: string
  language: string // Atlántico language param (e.g., 'ENG', 'ESP')
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
  tourDate: string,
  sesTime: string,
  hasSessions: boolean,
  adults: number,
  childs: number,
  infants: number,
  priceSnapshot: PriceSnapshot | null,
  loadingPrices: boolean,
  loadingSessions: boolean,
  forBuyNow: boolean = false
): BookingReadinessState {
  const missing: string[] = []

  // Required: t_group
  if (!t_group) {
    missing.push('Tour group is required')
  }

  // Required: selectedEventId (t_id)
  if (!selectedEventId) {
    missing.push('Please select an option')
  }

  // Required: tourDate
  if (!tourDate) {
    missing.push('Please select a date')
  }

  // Pax total must be >= 1
  const paxTotal = adults + childs + infants
  if (paxTotal < 1) {
    missing.push('At least 1 participant is required')
  } else if (adults < 1) {
    missing.push('At least 1 adult is required')
  }

  // If sessions exist -> require sesTime
  // If no sessions -> sesTime = "00:00" automatically
  if (hasSessions && !sesTime) {
    missing.push('Please select a time')
  }

  // Prices: allow clicking even if not loaded (will show spinner during final recalculation)
  // But if we have a priceSnapshot, it's better
  const hasPrice = priceSnapshot !== null
  if (!hasPrice && !loadingPrices) {
    // Only warn if not loading (user should see prices before booking)
    missing.push('Prices are being calculated')
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
}: ActivityBookingPanelProps) {
  const router = useRouter()
  const { addItem } = useCartStore()
  const [selectedEventId, setSelectedEventId] = useState(initialEventId)
  const [selectedDate, setSelectedDate] = useState('')
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

  // Load prices when date/event/participants change
  useEffect(() => {
    if (selectedDate && currentTId) {
      loadPriceData()
    } else {
      setPriceSnapshot(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, currentTId, adults, childs, infants])

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
      const response = await fetch(`/api/atlantico/prices?eventId=${currentTId}&date=${selectedDate}`)
      if (!response.ok) {
        throw new Error('Failed to load prices')
      }
      const data = await response.json()
      
      // Parse prices from response (may be in various formats)
      const adultPrice = data.adult || data.PVPA || data.priceAdult || 0
      const childPrice = data.child || data.PVPC || data.priceChild || 0
      const infantPrice = data.infant || data.PVPOS || data.priceInfant || 0
      
      const total = adultPrice * adults + childPrice * childs + infantPrice * infants

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
      false
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
      alert(`${label} clicked - Check console for details`)
    }
  }

  // Handle Add to Cart
  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    const target = e.currentTarget as HTMLButtonElement
    console.log('[BOOKING_PANEL] handleAddToCart called', {
      disabled: target.disabled,
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
      const itemData = {
        t_group,
        t_id: currentTId,
        language,
        tourDate: selectedDate,
        sesTime: finalSesTime,
        adults,
        childs,
        infants,
        priceSnapshot,
        currency,
      }

      console.log('[BOOKING_PANEL] Adding item to cart:', itemData)
      addItem(itemData)
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
      const itemData = {
        t_group,
        t_id: currentTId,
        language,
        tourDate: selectedDate,
        sesTime: finalSesTime,
        adults,
        childs,
        infants,
        priceSnapshot,
        currency,
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

  return (
    <div 
      data-booking-panel-root
      className="bg-white border border-glass-200 rounded-lg p-6 space-y-6"
      style={{ position: 'relative', zIndex: 50, pointerEvents: 'auto' }}
    >
      <h3 className="text-lg font-semibold text-glass-900">Manage your booking</h3>

      {/* Event Selection (if multiple events) */}
      {events.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-glass-700 mb-2">
            Select option *
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value)
              setSelectedTime('')
              setPriceSnapshot(null)
            }}
            className="w-full px-3 py-2 border border-glass-300 rounded-md"
            required
          >
            {events.map((event) => (
              <option key={event.t_id} value={event.t_id}>
                {event.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Date Selection */}
      <div>
        <label className="block text-sm font-medium text-glass-700 mb-2">
          Select a date *
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value)
            setSelectedTime('')
            setPriceSnapshot(null)
          }}
          min={new Date().toISOString().split('T')[0]}
          className="w-full px-3 py-2 border border-glass-300 rounded-md"
          required
        />
      </div>

      {/* Time Selection (if has sessions) */}
      {loadingSessions && (
        <div className="text-sm text-glass-600">Loading available times...</div>
      )}
      {!loadingSessions && hasSessions && (
        <div>
          <label className="block text-sm font-medium text-glass-700 mb-2">
            Select a time *
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

      {/* Participants */}
      <div>
        <label className="block text-sm font-medium text-glass-700 mb-2">
          Number of participants *
        </label>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-glass-600 mb-1">Adults</label>
            <input
              type="number"
              min="1"
              value={adults}
              onChange={(e) => setAdults(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-glass-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs text-glass-600 mb-1">Children</label>
            <input
              type="number"
              min="0"
              value={childs}
              onChange={(e) => setChilds(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-glass-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs text-glass-600 mb-1">Infants</label>
            <input
              type="number"
              min="0"
              value={infants}
              onChange={(e) => setInfants(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-glass-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Price Display */}
      {priceSnapshot && (
        <div className="border-t border-glass-200 pt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-glass-600">Total</span>
            <span className="text-xl font-bold text-glass-900">
              {priceSnapshot.total.toFixed(2)} {currency}
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
          {readiness.missing.map((msg, idx) => (
            <div key={idx} className="flex items-start">
              <span className="text-red-500 mr-2">•</span>
              <span>{msg}</span>
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
          message="Item added to cart"
          onClose={() => setShowToast(false)}
          locale={locale}
        />
      )}
    </div>
  )
}
