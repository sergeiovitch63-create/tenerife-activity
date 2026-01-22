'use client'

/**
 * Activity Detail Client Component
 * 
 * Displays activity details with:
 * - Hero image
 * - Title
 * - Price "from" (if available)
 * - Tabs: What you do / Description / Details / Prices / Cancellation / Reviews
 * - Calendar component (loadLimits)
 * - Prices component (loadPrices)
 * - Booking form (POST confirm/)
 * - Cancel booking (POST cancel)
 */

import { SafeImage } from '@/components/SafeImage'
import { useEffect, useMemo, useState } from 'react'
import { atlanticoAssetUrl } from '@/lib/atlantico/assets'
import type { NormalizedCatalogItem } from '@/lib/atlantico/sync-catalog'
import { sanitizeAtlanticoHtml } from '@/lib/atlantico/htmlAssets'

type EventOption = {
  eventId: string
  label: string
  pProd?: '0' | '1' | '2' | '3'
  icons?: string[]
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

interface ActivityDetailClientProps {
  item: NormalizedCatalogItem
  locale: string
  lang: string
  groupDetails: unknown | null
  groupBasePrice: number | null
  eventOptions: EventOption[]
  heroImageUrl: string | null
}

function formatEUR(n: number): string {
  return `€${n.toFixed(2)}`
}

function iconAltFromFilename(filename: string): string {
  const base = filename.split('/').pop() || filename
  return base.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim() || 'icon'
}

function EventIcon({ filename }: { filename: string }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const url = await atlanticoAssetUrl(filename, 'icon')
      if (!cancelled) setSrc(url)
    })().catch(() => {
      if (!cancelled) setSrc(null)
    })
    return () => {
      cancelled = true
    }
  }, [filename])

  // Always render - SafeImage handles fallback

  // SafeImage handles fallback automatically - no need for failed state
  return (
    <span className="inline-flex items-center gap-2 px-2 py-1 bg-glass-50 border border-glass-200 rounded text-xs text-glass-700">
      <SafeImage
        src={src || undefined}
        alt={iconAltFromFilename(filename)}
        width={18}
        height={18}
        className="object-contain"
      />
      <span>{iconAltFromFilename(filename)}</span>
    </span>
  )
}

function getPriceMode(pProd: EventOption['pProd'], apiType: PricesResponseOk['type']): PricesResponseOk['type'] {
  if (pProd === '0') return 'per_person'
  if (pProd === '2') return 'per_day'
  return apiType
}

export function ActivityDetailClient({
  item,
  lang,
  groupBasePrice,
  eventOptions,
  heroImageUrl,
}: ActivityDetailClientProps) {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'description' | 'details' | 'prices' | 'cancellation' | 'reviews'>('overview')

  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [selectedDate, setSelectedDate] = useState<string>('')
  // Removed: selectedTime, availableDates, sessionsByDay, loadingCalendar - calendar is now dummy/static

  const [pricesData, setPricesData] = useState<PricesResponseOk | PricesResponseError | null>(null)
  const [priceStatus, setPriceStatus] = useState<PriceStatus>('idle')

  const [bookingForm, setBookingForm] = useState({
    adults: 1,
    children: 0,
    infants: 0,
    name: '',
    email: '',
    phone: '',
  })
  const [isBooking, setIsBooking] = useState(false)
  const [bookingResult, setBookingResult] = useState<{ success: boolean; message: string } | null>(null)

  // Auto-select first event option if only one
  useEffect(() => {
    if (eventOptions.length === 1 && !selectedEventId) {
      setSelectedEventId(eventOptions[0].eventId)
    }
  }, [eventOptions, selectedEventId])

  const selectedOption = useMemo(() => {
    if (!selectedEventId) return null
    return eventOptions.find((opt) => opt.eventId === selectedEventId) || null
  }, [eventOptions, selectedEventId])


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

    fetch(`/api/atlantico/limits?eventId=${encodeURIComponent(selectedEventId)}&lang=${encodeURIComponent(lang)}&month=${encodeURIComponent(normalizedMonth)}`)
      .then((res) => res.json())
      .then(async (data: { ok: boolean; sessionsByDay?: Record<string, Array<{ time: string; available: number; sessionId?: string }>>; availableDates?: string[]; error?: string }) => {
        if (!data.ok) {
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
            
            const nextResponse = await fetch(`/api/atlantico/limits?eventId=${encodeURIComponent(selectedEventId)}&lang=${encodeURIComponent(lang)}&month=${encodeURIComponent(nextMonth)}`)
            
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
      .catch((error) => {
        console.error('[ActivityDetail] Error fetching calendar:', error)
        setSessionsByDay({})
        setAvailableDates([])
      })
      .finally(() => {
        setLoadingCalendar(false)
      })
  }, [selectedEventId, lang, currentMonth])

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

  // Available dates from loadLimits (real availability)
  const availableDatesSet = useMemo(() => {
    return new Set(availableDates)
  }, [availableDates])

  // Fetch prices (loadPrices) when event + date changes
  useEffect(() => {
    if (!selectedEventId || !selectedDate) {
      setPricesData(null)
      setPriceStatus('idle')
      return
    }

    const fetchPrices = async () => {
      setPriceStatus('loading')
      setPricesData(null)

      const url = `/api/atlantico/prices/${encodeURIComponent(selectedEventId)}?date=${encodeURIComponent(
        selectedDate,
      )}`

      if (process.env.NODE_ENV === 'development') {
        console.log('[ATL_ACTIVITY_DEBUG] loadPrices fetch', { selectedEventId, selectedDate, url })
      }

      try {
        const response = await fetch(url)
        if (!response.ok) {
          setPriceStatus('error')
          return
        }
        const data: PricesResponseOk | PricesResponseError = await response.json()
        if (!data.ok) {
          setPricesData(data)
          setPriceStatus('error')
          return
        }

        setPricesData(data)
        const mode = getPriceMode(selectedOption?.pProd, data.type)

        if (mode === 'per_day') {
          setPriceStatus('unsupported')
          return
        }

        if (data.type === 'per_person' && (typeof data.adultPrice !== 'number' || !Number.isFinite(data.adultPrice))) {
          setPriceStatus('error')
          return
        }

        setPriceStatus('ok')
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          setPriceStatus('idle')
        } else {
          setPriceStatus('error')
        }
      }
    }

    fetchPrices()
  }, [selectedEventId, selectedDate, selectedOption?.pProd])

  const priceMode = useMemo(() => {
    if (!pricesData || !pricesData.ok) return null
    return getPriceMode(selectedOption?.pProd, pricesData.type)
  }, [pricesData, selectedOption?.pProd])

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
      return (
        bookingForm.adults * adult + bookingForm.children * child + bookingForm.infants * infant
      )
    }

    // per_day not supported for total yet
    return null
  }, [selectedEventId, selectedDate, priceStatus, pricesData, priceMode, bookingForm])

  const totalDisplay = useMemo(() => {
    if (!selectedEventId || !selectedDate) return '—'
    if (priceStatus === 'loading') return 'Calculating…'
    if (priceStatus === 'ok' && totalPrice !== null) return formatEUR(totalPrice)
    if (priceStatus === 'unsupported') return 'Varies by duration'
    if (priceStatus === 'error') return '—'
    return '—'
  }, [selectedEventId, selectedDate, priceStatus, totalPrice])

  const availableDatesSet = useMemo(() => new Set(availableDates), [availableDates])

  const changeMonth = (delta: number) => {
    const [yearStr, monthStr] = currentMonth.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)
    const newDate = new Date(year, month - 1 + delta, 1)
    const y = newDate.getFullYear()
    const m = newDate.getMonth() + 1
    setCurrentMonth(`${y}-${String(m).padStart(2, '0')}-01`)
  }

  // Handle booking
  const handleBooking = async () => {
    if (!selectedDate || !selectedEventId || bookingForm.adults < 1) {
      setBookingResult({ success: false, message: 'Please fill in all required fields' })
      return
    }

    // Use selectedTime if available, otherwise '00:00' only if no sessions
    const sessions = sessionsByDay[selectedDate] || []
    const allowedTimes = sessions.map(s => s.time).filter(t => t && t !== '00:00' && t !== '-')
    const sesTime = allowedTimes.length > 0 ? (selectedTime || allowedTimes[0] || '00:00') : '00:00'

    setIsBooking(true)
    setBookingResult(null)

    try {
      const response = await fetch('/api/atlantico/booking/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          t_id: selectedEventId,
          t_group: item.groupCode,
          language: lang,
          tourDate: selectedDate,
          sesTime,
          adults: bookingForm.adults,
          childs: bookingForm.children || 0,
          infants: bookingForm.infants || 0,
          name: bookingForm.name,
          email: bookingForm.email,
          phone: bookingForm.phone,
        }),
      })

      const data = await response.json()

      if (data.ok && data.reference) {
        setBookingResult({ success: true, message: `Booking confirmed! Reference: ${data.reference}` })
      } else {
        setBookingResult({ success: false, message: data.reason || data.message || 'Booking failed' })
      }
    } catch (error) {
      setBookingResult({ success: false, message: error instanceof Error ? error.message : 'Booking failed' })
    } finally {
      setIsBooking(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Image */}
      {/* Hero image - SafeImage handles fallback automatically */}
      <div className="relative w-full h-96 bg-ocean-600">
        <SafeImage
          src={heroImageUrl || item.image || undefined}
          alt={item.title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </div>

      <div className="container mx-auto px-4 max-w-7xl py-8">
        {/* Title */}
        <h1 className="text-4xl font-bold text-glass-900 mb-4">{item.title}</h1>

        {/* Price "from" */}
        {groupBasePrice && groupBasePrice > 0 && (
          <div className="mb-6">
            <span className="text-2xl font-semibold text-ocean-600">
              From {formatEUR(groupBasePrice)}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Available Options */}
            {eventOptions.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-glass-900 mb-2">Available Options</h2>
                <div className="flex flex-wrap gap-2">
                  {eventOptions.map((opt) => (
                    <button
                      key={opt.eventId}
                      type="button"
                      onClick={() => setSelectedEventId(opt.eventId)}
                      className={`px-3 py-1 rounded-full border text-sm ${
                        selectedEventId === opt.eventId
                          ? 'bg-ocean-600 text-white border-ocean-600'
                          : 'bg-white text-glass-800 border-glass-300 hover:border-ocean-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Event icons (from eventDetails.icons filenames) */}
                {selectedOption?.icons && selectedOption.icons.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedOption.icons.map((filename) => (
                      <EventIcon key={filename} filename={filename} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tabs */}
            <div className="border-b border-glass-200 mb-6">
              <div className="flex space-x-4">
                {(['overview', 'description', 'details', 'prices', 'cancellation', 'reviews'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedTab(tab)}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                      selectedTab === tab
                        ? 'border-ocean-600 text-ocean-600'
                        : 'border-transparent text-glass-600 hover:text-glass-900'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="prose max-w-none">
              {selectedTab === 'overview' && (
                <div>
                  <h2>What you do</h2>
                  {item.description ? (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={sanitizeAtlanticoHtml(item.description)}
                    />
                  ) : (
                    <p className="text-glass-500">No overview available.</p>
                  )}
                </div>
              )}

              {selectedTab === 'description' && (
                <div>
                  <h2>Description</h2>
                  {item.description ? (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={sanitizeAtlanticoHtml(item.description)}
                    />
                  ) : (
                    <p className="text-glass-500">No description available.</p>
                  )}
                </div>
              )}

              {selectedTab === 'details' && (
                <div>
                  <h2>Details</h2>
                  <dl className="grid grid-cols-2 gap-4">
                    <dt className="font-medium">Group Code:</dt>
                    <dd>{item.groupCode}</dd>
                    {selectedEventId && (
                      <>
                        <dt className="font-medium">Selected Event ID:</dt>
                        <dd>{selectedEventId}</dd>
                      </>
                    )}
                  </dl>
                </div>
              )}

              {selectedTab === 'prices' && (
                <div>
                  <h2>Prices</h2>
                  {!selectedEventId || !selectedDate ? (
                    <p className="text-glass-500">Select an option and date to see prices.</p>
                  ) : priceStatus === 'loading' ? (
                    <p className="text-glass-500">Loading prices...</p>
                  ) : priceStatus === 'error' || !pricesData ? (
                    <p className="text-glass-500">Pricing unavailable for selected date.</p>
                  ) : !pricesData.ok ? (
                    <p className="text-glass-500">Pricing unavailable for selected date.</p>
                  ) : pricesData.type === 'per_person' ? (
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <dt className="text-glass-600">Adult</dt>
                      <dd className="text-glass-900">{formatEUR(pricesData.adultPrice)}</dd>
                      {typeof pricesData.childPrice === 'number' && Number.isFinite(pricesData.childPrice) && (
                        <>
                          <dt className="text-glass-600">Child</dt>
                          <dd className="text-glass-900">{formatEUR(pricesData.childPrice)}</dd>
                        </>
                      )}
                      {typeof pricesData.infantPrice === 'number' && Number.isFinite(pricesData.infantPrice) && (
                        <>
                          <dt className="text-glass-600">Infant</dt>
                          <dd className="text-glass-900">{formatEUR(pricesData.infantPrice)}</dd>
                        </>
                      )}
                    </dl>
                  ) : (
                    <div className="space-y-2">
                      {pricesData.tiers.map((tier) => (
                        <div key={`${tier.days}-${tier.price}`} className="flex justify-between gap-4">
                          <div className="text-glass-600">Up to {tier.days} days</div>
                          <div className="text-glass-900 font-medium">{formatEUR(tier.price)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedTab === 'cancellation' && (
                <div>
                  <h2>Cancellation Policy</h2>
                  <p className="text-glass-500">Cancellation policy information not available.</p>
                </div>
              )}

              {selectedTab === 'reviews' && (
                <div>
                  <h2>Reviews</h2>
                  <p className="text-glass-500">No reviews available.</p>
                </div>
              )}
            </div>

            {/* DEV Debug Panel - Only in development */}
            {process.env.NODE_ENV === 'development' && selectedEventId && (
              <div className="mt-8 mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs space-y-1">
                <div className="font-semibold mb-2">🔍 DEV Debug:</div>
                <div>selectedEventId (t_id): <strong className="text-blue-600">{selectedEventId}</strong></div>
                <div>eventId origin: <strong className="text-purple-600">
                  {(() => {
                    const option = eventOptions.find(opt => opt.eventId === selectedEventId)
                    return option ? `eventOption.eventId="${option.eventId}" (from eventOptions)` : 'unknown'
                  })()}
                </strong></div>
                <div>t_group: <strong className="text-red-600">{item.groupCode}</strong></div>
                <div>monthStart sent: <strong className="text-green-600">{(() => {
                  const match = currentMonth.match(/^(\d{4}-\d{2})/)
                  return match ? `${match[1]}-01` : currentMonth
                })()}</strong></div>
                <div>availableDates count: <strong>{availableDates.length}</strong></div>
                <div>sessionsByDay keys: <strong>{Object.keys(sessionsByDay).length}</strong></div>
              </div>
            )}

            {/* Calendar */}
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4">Select a Date</h2>
              {!selectedEventId ? (
                <p className="text-glass-500">Select an option to see availability.</p>
              ) : loadingCalendar ? (
                <p className="text-glass-500">Loading calendar...</p>
              ) : noAvailabilityFound ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                  <div className="font-medium mb-2">⚠️ No availability found</div>
                  <div>No availability found for the next 12 months for this option. Please try a different option.</div>
                </div>
              ) : (
                <>
                  {/* Auto-switched month notice */}
                  {autoSwitchedMonth && (
                    <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                      <span className="font-medium">ℹ️</span> No availability this month → showing{' '}
                      <strong>{new Date(autoSwitchedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
                    </div>
                  )}
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 31 }).map((_, idx) => {
                    const [yearStr, monthStr] = currentMonth.split('-')
                    const year = Number(yearStr)
                    const month = Number(monthStr)
                    const day = idx + 1
                    const date = new Date(year, month - 1, day)
                    if (date.getMonth() !== month - 1) return null
                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    const isAvailable = availableDatesSet.has(dateStr)
                    const isSelected = selectedDate === dateStr
                    return (
                      <button
                        key={dateStr}
                        onClick={() => {
                          if (isAvailable) {
                            setSelectedDate(dateStr)
                          }
                        }}
                        disabled={!isAvailable}
                        className={`p-2 rounded border text-sm ${
                          isSelected
                            ? 'bg-ocean-600 text-white border-ocean-600'
                            : isAvailable
                              ? 'bg-white border-glass-200 hover:border-ocean-300'
                              : 'bg-glass-100 text-glass-400 border-glass-200 cursor-not-allowed'
                        }`}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Time selector - only show if date selected and sessions available */}
              {selectedDate && sessionsByDay[selectedDate] && (() => {
                const sessions = sessionsByDay[selectedDate]
                const allowedTimes = sessions.map(s => s.time).filter(t => t && t !== '00:00' && t !== '-')
                
                if (allowedTimes.length === 0) {
                  return null // No time selection needed
                }

                return (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">Select a Time</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {allowedTimes.map((time) => {
                        const session = sessions.find(s => s.time === time)
                        return (
                          <button
                            key={time}
                            onClick={() => setSelectedTime(time)}
                            className={`px-4 py-2 rounded border text-sm ${
                              selectedTime === time
                                ? 'bg-ocean-600 text-white border-ocean-600'
                                : 'bg-white border-glass-200 hover:border-ocean-300'
                            }`}
                          >
                            {time}
                            {session && session.available !== undefined && (
                              <span className="ml-2 text-xs opacity-75">
                                ({session.available} left)
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-glass-50 border border-glass-200 rounded-lg p-6 sticky top-8">
              <h3 className="text-xl font-bold mb-4">Book Now</h3>

              {/* Option selector (simple) */}
              {eventOptions.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Option</label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => {
                      setSelectedEventId(e.target.value)
                      setSelectedDate('')
                    }}
                    className="w-full px-3 py-2 border border-glass-300 rounded"
                  >
                    <option value="">Choose an option...</option>
                    {eventOptions.map((opt) => (
                      <option key={opt.eventId} value={opt.eventId}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Booking Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Adults *</label>
                  <input
                    type="number"
                    min="1"
                    value={bookingForm.adults}
                    onChange={(e) => setBookingForm({ ...bookingForm, adults: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-glass-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Children</label>
                  <input
                    type="number"
                    min="0"
                    value={bookingForm.children}
                    onChange={(e) => setBookingForm({ ...bookingForm, children: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-glass-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Infants</label>
                  <input
                    type="number"
                    min="0"
                    value={bookingForm.infants}
                    onChange={(e) => setBookingForm({ ...bookingForm, infants: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-glass-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    value={bookingForm.name}
                    onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-glass-300 rounded"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    value={bookingForm.email}
                    onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-glass-300 rounded"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Phone *</label>
                  <input
                    type="tel"
                    value={bookingForm.phone}
                    onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-glass-300 rounded"
                    required
                  />
                </div>

                <button
                  onClick={handleBooking}
                  disabled={isBooking || !selectedEventId || !selectedDate || bookingForm.adults < 1}
                  className="w-full px-6 py-3 bg-ocean-600 text-white font-medium rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBooking ? 'Booking...' : 'Confirm Booking'}
                </button>

                {/* Total price */}
                <div className="pt-4 border-t border-glass-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-glass-700">TOTAL</span>
                    <span
                      className={`text-xl font-bold ${
                        priceStatus === 'ok' ? 'text-ocean-600' : 'text-glass-900'
                      }`}
                    >
                      {totalDisplay}
                    </span>
                  </div>
                  {priceStatus === 'error' && selectedEventId && selectedDate && (
                    <div className="mt-1 text-xs text-glass-600">Pricing unavailable for selected date.</div>
                  )}
                </div>

                {bookingResult && (
                  <div className={`p-4 rounded ${bookingResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    {bookingResult.message}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


