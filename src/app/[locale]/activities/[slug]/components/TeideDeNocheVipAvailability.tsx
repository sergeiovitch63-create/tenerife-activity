/**
 * Teide de Noche VIP Availability Calendar
 * 
 * COMPONENT LOCAL: Uniquement pour l'activité "Teide de Noche VIP"
 * 
 * Affiche un calendrier mensuel interactif avec les disponibilités réelles
 * depuis l'API Atlántico loadLimits.
 */

'use client'

import { useState, useEffect, useMemo } from 'react'

// Export TimeSlot interface for use in parent
export interface TimeSlot {
  time: string // "HH:mm"
  price: number
  currency: string
}

interface DateAvailability {
  [date: string]: {
    slots: TimeSlot[]
  }
}

interface LoadLimitsResponse {
  ok: boolean
  dates: string[] // ["YYYY-MM-DD", ...]
  raw?: any // Raw response en DEV
}

interface TeideDeNocheVipAvailabilityProps {
  code: string // Code Atlantico pour loadLimits (eventCode ou idExc)
  lang?: string // Language code (default: 'FRA')
  onDateSelect?: (date: string | null, slots: TimeSlot[]) => void // Callback when date is selected
  onPriceChange?: (date: string | null, sessionTime: string | null, sessionPrice: number | null, currency: string) => void // Callback for price changes (sessionTime is always null for day-based activity)
}

export function TeideDeNocheVipAvailability({ 
  code, 
  lang = 'FRA',
  onDateSelect,
  onPriceChange,
}: TeideDeNocheVipAvailabilityProps) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [availability, setAvailability] = useState<DateAvailability>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Format date as YYYY-MM-01 (first day of month) - STRING ONLY, no ISO
  const formatMonthStart = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}-01`
  }

  // Format date as YYYY-MM-DD - STRING ONLY, no ISO
  const formatDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Convert various date formats to YYYY-MM-DD
  // Supports: YYYYMMDD (8 digits, format Atlántico doc), YYYY-MM-DD, DD/MM/YYYY, YYYY/MM/DD
  // Selon doc Atlántico: format YYYYMMDD ("20180612", "20220801")
  const normalizeDateString = (dateStr: string): string | null => {
    if (!dateStr || typeof dateStr !== 'string') {
      return null
    }

    const trimmed = dateStr.trim()
    if (!trimmed) {
      return null
    }

    // YYYYMMDD format (8 digits) - PRIORITÉ selon doc Atlántico
    // Format: "20220801" -> "2022-08-01"
    if (/^\d{8}$/.test(trimmed)) {
      const year = trimmed.substring(0, 4)
      const month = trimmed.substring(4, 6)
      const day = trimmed.substring(6, 8)
      // Validation: month should be 01-12, day should be 01-31
      const monthNum = parseInt(month, 10)
      const dayNum = parseInt(day, 10)
      if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
        // Additional validation: check if date is valid
        const dateObj = new Date(parseInt(year, 10), monthNum - 1, dayNum)
        if (
          dateObj.getFullYear() === parseInt(year, 10) &&
          dateObj.getMonth() === monthNum - 1 &&
          dateObj.getDate() === dayNum
        ) {
          return `${year}-${month}-${day}`
        }
      }
      // Si month > 12, peut-être DDMMYYYY - heuristique
      // Mais selon doc Atlántico, c'est toujours YYYYMMDD, donc on ignore ce cas
    }

    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      // Validate the date
      const [year, month, day] = trimmed.split('-').map(Number)
      const dateObj = new Date(year, month - 1, day)
      if (
        dateObj.getFullYear() === year &&
        dateObj.getMonth() === month - 1 &&
        dateObj.getDate() === day
      ) {
        return trimmed
      }
    }

    // DD/MM/YYYY format
    const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch
      const dayNum = parseInt(day, 10)
      const monthNum = parseInt(month, 10)
      const yearNum = parseInt(year, 10)
      if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
    }

    // YYYY/MM/DD format
    const yyyymmddMatch = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
    if (yyyymmddMatch) {
      const [, year, month, day] = yyyymmddMatch
      const monthNum = parseInt(month, 10)
      const dayNum = parseInt(day, 10)
      if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
    }

    // Unknown format
    return null
  }

  // Fetch availability for current month
  useEffect(() => {
    const fetchAvailability = async () => {
      setLoading(true)
      setError(null)

      // Log month displayed
      const year = currentMonth.getFullYear()
      const monthIndex = currentMonth.getMonth()
      const monthStart = formatMonthStart(currentMonth)
      
      // URL avec date dans le PATH (format doc Atlántico: loadLimits/{Code}/{Language}/{Date})
      // Date = "yyyy-mm-dd" (first date of the month)
      // Language = majuscules selon doc (FRA, ENG, etc.)
      const url = `/api/atlantico/loadLimits/${code}/${lang.toUpperCase()}/${monthStart}`

      // DEV logs: month info + URL avec PATH (diagnostic complet)
      if (process.env.NODE_ENV === 'development') {
        console.log('[TEIDE_AVAILABILITY] Fetching:', {
          monthDisplayed: { year, monthIndex, monthName: currentMonth.toLocaleString('en', { month: 'long' }) },
          dateInPath: monthStart,
          dateType: typeof monthStart,
          code,
          lang: lang.toUpperCase(),
          url,
          monthPrefix: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
        })
        // Additional log for astronomic-tour-vip
        console.log('[ASTRO_CAL] loadLimits url + nb dates:', {
          url,
          code,
          lang: lang.toUpperCase(),
          dateInPath: monthStart,
        })
      }

      try {
        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        // Parse JSON response
        const data: LoadLimitsResponse = await response.json()

        // DEV logs: response status + payload info (diagnostic complet)
        if (process.env.NODE_ENV === 'development') {
          const payloadSize = JSON.stringify(data).length
          const nbDates = data.dates?.length || 0
          console.log('[TEIDE_AVAILABILITY] Response status:', {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            hasData: !!data,
            payloadSizeBytes: payloadSize,
            nbDates,
          })
          // Additional log for astronomic-tour-vip
          console.log('[ASTRO_CAL] loadLimits url + nb dates:', {
            url: response.url,
            code,
            lang: lang.toUpperCase(),
            nbDates,
          })
        }

        if (!data.ok || !Array.isArray(data.dates)) {
          throw new Error('Invalid response format')
        }

        // Extract time slots from raw data if available
        const dateSlots: DateAvailability = {}
        const rawData = data.raw || {}

        // DEV logs: sessionsByDate keys format (source of truth)
        let sessionsByDateKeys: string[] = []
        let sessionsByDateFormat = 'NONE'
        if (rawData.sessionsByDate && typeof rawData.sessionsByDate === 'object') {
          sessionsByDateKeys = Object.keys(rawData.sessionsByDate)
          const first10Keys = sessionsByDateKeys.slice(0, 10)
          const sortedKeys = [...sessionsByDateKeys].sort()
          const minKey = sortedKeys[0] || null
          const maxKey = sortedKeys[sortedKeys.length - 1] || null
          
          // Detect format
          if (first10Keys.length > 0) {
            const sampleKey = first10Keys[0]
            if (/^\d{8}$/.test(sampleKey)) {
              sessionsByDateFormat = 'YYYYMMDD'
            } else if (/^\d{4}-\d{2}-\d{2}$/.test(sampleKey)) {
              sessionsByDateFormat = 'YYYY-MM-DD'
            } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(sampleKey)) {
              sessionsByDateFormat = 'DD/MM/YYYY'
            } else if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(sampleKey)) {
              sessionsByDateFormat = 'YYYY/MM/DD'
            } else {
              sessionsByDateFormat = 'UNKNOWN'
            }
          }
          
          if (process.env.NODE_ENV === 'development') {
            console.log('[TEIDE_AVAILABILITY] sessionsByDate keys (raw):', {
              totalKeys: sessionsByDateKeys.length,
              first10Keys,
              minKey,
              maxKey,
              detectedFormat: sessionsByDateFormat,
            })
          }
        }

        // DEV logs: data.dates format (fallback)
        let datesFormat = 'NONE'
        if (Array.isArray(data.dates) && data.dates.length > 0) {
          const first10Dates = data.dates.slice(0, 10)
          const sampleDate = first10Dates[0]
          if (/^\d{8}$/.test(sampleDate)) {
            datesFormat = 'YYYYMMDD'
          } else if (/^\d{4}-\d{2}-\d{2}$/.test(sampleDate)) {
            datesFormat = 'YYYY-MM-DD'
          } else {
            datesFormat = 'OTHER'
          }
          
          if (process.env.NODE_ENV === 'development') {
            const sortedDates = [...data.dates].sort()
            console.log('[TEIDE_AVAILABILITY] data.dates (raw):', {
              totalDates: data.dates.length,
              first10Dates,
              minDate: sortedDates[0] || null,
              maxDate: sortedDates[sortedDates.length - 1] || null,
              detectedFormat: datesFormat,
            })
          }
        }

        // SOURCE OF TRUTH: sessionsByDate keys (car sessions = disponibilité réelle)
        // Extract sessionsByDate: iterate on ALL keys (not just data.dates)
        if (rawData.sessionsByDate && typeof rawData.sessionsByDate === 'object') {
          // Iterate over all keys in sessionsByDate, not just data.dates
          for (const rawDateKey of Object.keys(rawData.sessionsByDate)) {
            // Normalize date key to YYYY-MM-DD format (supporte YYYYMMDD, YYYY-MM-DD, etc.)
            const normalizedDateKey = normalizeDateString(rawDateKey)
            if (!normalizedDateKey) {
              if (process.env.NODE_ENV === 'development') {
                console.warn('[TEIDE_AVAILABILITY] Skipping invalid date format:', rawDateKey)
              }
              continue
            }

            const sessions = rawData.sessionsByDate[rawDateKey]
            if (Array.isArray(sessions) && sessions.length > 0) {
              const slots: TimeSlot[] = []
              for (const session of sessions) {
                if (session && typeof session === 'object') {
                  const time = session.time || session.start || session.hour || ''
                  // Extract price: priority precio (doc Atlántico), then price/priceAdult
                  let price = 0
                  if (typeof session.precio === 'number') {
                    price = session.precio
                  } else if (typeof session.precio === 'string') {
                    const parsed = parseFloat(session.precio)
                    if (!isNaN(parsed)) price = parsed
                  } else if (typeof session.bruto === 'number') {
                    price = session.bruto
                  } else if (typeof session.quote === 'number') {
                    price = session.quote
                  } else if (typeof session.price === 'number') {
                    price = session.price
                  } else if (typeof session.priceAdult === 'number') {
                    price = session.priceAdult
                  } else if (typeof session.price === 'string') {
                    const parsed = parseFloat(session.price)
                    if (!isNaN(parsed)) price = parsed
                  }
                  
                  const currency = session.currency || 'EUR'
                  // Include slot even if price is 0 (may be filled later via loadPrices)
                  if (time) {
                    slots.push({ time, price, currency })
                  }
                }
              }
              // Date avec sessions = disponible (même si pas de slots extraits)
              dateSlots[normalizedDateKey] = { slots }
            }
          }
        }

        // FALLBACK: Include dates from data.dates (normaliser format YYYYMMDD si besoin)
        for (const dateStr of data.dates) {
          const normalizedDateStr = normalizeDateString(dateStr)
          if (normalizedDateStr && !dateSlots[normalizedDateStr]) {
            // Si pas dans sessionsByDate, marquer comme disponible mais sans slots
            dateSlots[normalizedDateStr] = { slots: [] }
          }
        }

        // GUARD: Only update availability for the current month being fetched
        // Don't merge with previous months to avoid stale data
        // monthPrefix doit correspondre au mois demandé dans l'URL path
        const monthPrefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}`
        const currentMonthSlots: DateAvailability = {}
        for (const [dateStr, slots] of Object.entries(dateSlots)) {
          // Filtrer strictement par monthPrefix (YYYY-MM)
          if (dateStr.startsWith(monthPrefix)) {
            currentMonthSlots[dateStr] = slots
          } else {
            // Log en DEV si on trouve des dates hors du mois demandé
            if (process.env.NODE_ENV === 'development') {
              console.warn('[TEIDE_AVAILABILITY] Date outside requested month:', {
                dateStr,
                monthPrefix,
                requestedMonth: monthPrefix,
              })
            }
          }
        }

        // Merge with existing availability (keep other months' data)
        setAvailability((prev) => {
          const merged = { ...prev }
          // Remove old data for this month first
          for (const key of Object.keys(merged)) {
            if (key.startsWith(monthPrefix)) {
              delete merged[key]
            }
          }
          // Add new data for this month
          return { ...merged, ...currentMonthSlots }
        })

        // DEV logs: result (diagnostic complet)
        if (process.env.NODE_ENV === 'development') {
          console.log('[TEIDE_AVAILABILITY] Loaded:', {
            monthPrefix,
            monthStart,
            requestedMonth: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
            nbDatesFromAPI: data.dates.length,
            nbDatesFromSessionsByDate: Object.keys(dateSlots).length,
            nbDatesAfterMonthFilter: Object.keys(currentMonthSlots).length,
            datesAfterFilter: Object.keys(currentMonthSlots).slice(0, 10),
            allDatesBeforeFilter: Object.keys(dateSlots).slice(0, 20),
          })
        }
        
        // Si aucune disponibilité après filtrage, log en DEV
        if (Object.keys(currentMonthSlots).length === 0 && process.env.NODE_ENV === 'development') {
          console.warn('[TEIDE_AVAILABILITY] No availability after month filter:', {
            monthPrefix,
            monthStart,
            nbDatesFromSessionsByDate: Object.keys(dateSlots).length,
            sampleDatesFromSessionsByDate: Object.keys(dateSlots).slice(0, 10),
          })
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load availability'
        setError(errorMsg)
        console.error('[TEIDE_AVAILABILITY] Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAvailability()
  }, [currentMonth, code, lang])

  // Get available dates for current month
  const availableDates = useMemo(() => {
    const monthPrefix = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`
    return Object.keys(availability).filter((date) => date.startsWith(monthPrefix))
  }, [availability, currentMonth])

  // Calendar helpers
  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfWeek = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const isDateAvailable = (dateStr: string): boolean => {
    return availableDates.includes(dateStr)
  }

  const isPastDate = (dateStr: string): boolean => {
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    date.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  // Calendar days
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = getFirstDayOfWeek(currentMonth)
    const days: Array<{ date: Date | null; dateStr: string | null; isAvailable: boolean; isPast: boolean }> = []

    // Empty cells before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: null, dateStr: null, isAvailable: false, isPast: false })
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      const dateStr = formatDate(date)
      days.push({
        date,
        dateStr,
        isAvailable: isDateAvailable(dateStr),
        isPast: isPastDate(dateStr),
      })
    }

    return days
  }, [currentMonth, availableDates])

  // Navigation
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
    setSelectedDate(null)
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
    setSelectedDate(null)
  }

  // Get slots for selected date (for price extraction only, not for UI selection)
  const selectedDateSlots = selectedDate ? availability[selectedDate]?.slots || [] : []
  
  // Notify parent when selectedDate changes
  // For day-based activity: extract price from first slot if available, otherwise fallback to prices endpoint
  useEffect(() => {
    if (selectedDate) {
      onDateSelect?.(selectedDate, selectedDateSlots)
      
      // Try to extract price from first slot if available (for teide-de-noche-vip)
      let extractedPrice: number | null = null
      let extractedCurrency: string = 'EUR'
      
      if (selectedDateSlots.length > 0) {
        const firstSlot = selectedDateSlots[0]
        if (firstSlot.price > 0) {
          extractedPrice = firstSlot.price
          extractedCurrency = firstSlot.currency
        }
      }
      
      // Notify parent: price from sessionsByDate (may be null, will fallback to prices endpoint)
      onPriceChange?.(selectedDate, null, extractedPrice, extractedCurrency)
    } else {
      onDateSelect?.(null, [])
      onPriceChange?.(null, null, null, 'EUR')
    }
  }, [selectedDate, selectedDateSlots, onDateSelect, onPriceChange])

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="w-full">
      {/* Calendar */}
      <div className="border border-glass-200 rounded-lg p-4 bg-white">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-glass-100 rounded transition-colors"
            aria-label="Previous month"
          >
            <span className="text-glass-600">←</span>
          </button>
          <h3 className="text-lg font-semibold text-glass-900">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-glass-100 rounded transition-colors"
            aria-label="Next month"
          >
            <span className="text-glass-600">→</span>
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="text-center py-8 text-glass-500">Loading availability...</div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="text-center py-8 text-red-600">
            <div className="font-medium">Error loading availability</div>
            <div className="text-sm mt-1">{error}</div>
          </div>
        )}

        {/* No availability state */}
        {!loading && !error && availableDates.length === 0 && (
          <div className="text-center py-8 text-glass-500">
            <div className="font-medium">No availability returned for this month</div>
            <div className="text-sm mt-1">
              Please check back later or try a different month
            </div>
          </div>
        )}

        {/* Calendar Grid */}
        {!loading && !error && (
          <>
            {/* Day names header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map((day) => (
                <div key={day} className="text-center text-sm font-medium text-glass-600 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                if (!day.date) {
                  return <div key={idx} className="aspect-square" />
                }

                const isSelected = day.dateStr === selectedDate
                const isClickable = day.isAvailable && !day.isPast

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (isClickable) {
                        const dateStr = day.dateStr!
                        setSelectedDate(dateStr)
                        const slots = availability[dateStr]?.slots || []
                        
                        // Extract price from first slot if available (day-based activity)
                        let extractedPrice: number | null = null
                        let extractedCurrency: string = 'EUR'
                        if (slots.length > 0 && slots[0].price > 0) {
                          extractedPrice = slots[0].price
                          extractedCurrency = slots[0].currency
                        }
                        
                        onDateSelect?.(dateStr, slots)
                        onPriceChange?.(dateStr, null, extractedPrice, extractedCurrency)
                      }
                    }}
                    disabled={!isClickable}
                    className={`
                      aspect-square rounded-md text-sm font-medium transition-colors
                      ${isSelected ? 'bg-ocean-600 text-white' : ''}
                      ${isClickable && !isSelected ? 'hover:bg-ocean-50 text-glass-900 cursor-pointer' : ''}
                      ${!day.isAvailable || day.isPast ? 'text-glass-400 cursor-not-allowed bg-glass-50' : ''}
                    `}
                  >
                    {day.date?.getDate()}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Selected Date Info (day-based activity, no time slots) */}
      {selectedDate && (
        <div className="mt-4 border border-glass-200 rounded-lg p-4 bg-white">
          <div className="text-center py-2">
            <div className="text-sm text-glass-600 mb-1">Selected date</div>
            <div className="text-lg font-semibold text-glass-900">{selectedDate}</div>
            <div className="text-xs text-glass-500 mt-2">Available on this date</div>
          </div>
        </div>
      )}
    </div>
  )
}

