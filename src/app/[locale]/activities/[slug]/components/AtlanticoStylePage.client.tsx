/**
 * Atlántico Style Page Client Component
 * For teide-de-noche-vip slug only
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { HeroGallery } from './HeroGallery'
import { Tabs } from './Tabs'
import { Accordion } from './Accordion'
import { AtlanticoBookingWidget } from '@/components/booking/AtlanticoBookingWidget'
import { astronomicTourVipMedia } from '@/content/activities/astronomic-tour-vip.media'
import { MobileBookingFab } from './MobileBookingFab'
import type { VipTourMockData } from '@/content/vibes/vip-tours.mock'
import { sanitizeAtlanticoHtml } from '@/lib/atlantico/htmlAssets'
// AtlanticoDebugPanel removed - no debug UI for VIP activities

interface Event {
  id: string
  title?: string
  price?: {
    adult?: number | null
    child?: number | null
    infant?: number | null
  }
  raw?: any
}

interface AtlanticoStylePageProps {
  tour: {
    id: string
    title: string
    description: string
    shortDescription?: string
    duration: number | null
    imageUrls: string[]
    events: Event[]
    basePrice?: number | null
    raw?: any
    // Curation overrides
    shortDescriptionOverride?: string | null
    cancellationPolicyOverride?: string | null
    // Placeholder flag
    _isPlaceholder?: boolean
  }
  locale: string
  slug: string // Activity slug (e.g., 'teide-de-noche-vip', 'astronomic-tour-vip')
  eventOptions?: Array<{ eventId: string; event: any; error?: string | null }> // For gomera-vip-tour
  groupCode?: string // For gomera-vip-tour fallback (e.g., '511')
  mockData?: VipTourMockData | null // Mock data for VIP tours (when not using API)
}

export function AtlanticoStylePage({ tour, locale, slug, eventOptions, groupCode, mockData }: AtlanticoStylePageProps) {
  const t = useTranslations('activities.gomeraVipTour.includes')
  const tPage = useTranslations('atlanticoStylePage')
  const tTabs = useTranslations('atlanticoStylePage.tabs')
  const [activeTab, setActiveTab] = useState('what-youll-do')
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [selectedSession, setSelectedSession] = useState<string | null>(null)

  // Availability state (gomera-vip-tour only)
  const [limitsLoading, setLimitsLoading] = useState(false)
  const [limitsError, setLimitsError] = useState<string | null>(null)
  const [limitsData, setLimitsData] = useState<{
    eventId: string
    rangeStart: string
    rangeEnd: string
    days: Record<string, { available: boolean; sessions: Array<{ time: string; quote?: number; used?: number; limit?: number; raw?: any }> }>
  } | null>(null)
  const [displayMonth, setDisplayMonth] = useState<Date>(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Weekly availability fallback (gomera-vip-tour only)
  // Some Atlantico activities appear available on a fixed weekday but return no availability via loadLimits.
  const [weeklyModeByEventId, setWeeklyModeByEventId] = useState<Record<string, { weekdayIndex: number; weekdayLabel: string }>>({})

  // Prices state (gomera-vip-tour only)
  const [pricesLoading, setPricesLoading] = useState(false)
  const [pricesError, setPricesError] = useState<string | null>(null)
  const [pricesData, setPricesData] = useState<{
    adult: number | null
    child: number | null
    infant: number | null
    raw?: any
  } | null>(null)
  
  // Single source of truth for which accordion section is open
  // For all VIP activities: start with only "prices" open (as per requirements)
  // This ensures consistent UX across all VIP tours
  const initialOpenSection = 'prices'
  const [openSection, setOpenSection] = useState<string | null>(initialOpenSection)
  
  // Toggle accordion section: opens selected section and closes others
  // If clicking the open section, it closes (sets to null)
  const toggleSection = (sectionId: string) => {
    setOpenSection(openSection === sectionId ? null : sectionId)
  }
  
  // Helper to check if section is open
  const isSectionOpen = (sectionId: string) => openSection === sectionId

  const isDev = process.env.NODE_ENV !== 'production'

  const selectedEventDetails = useMemo(() => {
    if (!eventOptions || !selectedEventId) return null
    const found = eventOptions.find((o) => o.eventId === selectedEventId)
    return found?.event || null
  }, [eventOptions, selectedEventId])

  const selectedEventHasWeeklyMode = !!(selectedEventId && weeklyModeByEventId[selectedEventId])
  const selectedWeeklyInfo = selectedEventId ? weeklyModeByEventId[selectedEventId] : undefined

  const weekdayLabelFromIndex = (idx: number): string => {
    // JS getDay(): 0=Sun ... 6=Sat
    const labels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return labels[idx] || 'Unknown'
  }

  const detectWeeklyDay = (event: any): { weekdayIndex: number; weekdayLabel: string } | null => {
    if (!event || typeof event !== 'object') return null
    const raw = event as any
    const candidates: unknown[] = []

    // Common shapes we’ve seen / might see in Atlantico eventDetails
    if (Array.isArray(raw.weekDays)) candidates.push(...raw.weekDays)
    if (Array.isArray(raw.weekdays)) candidates.push(...raw.weekdays)
    if (Array.isArray(raw.days)) candidates.push(...raw.days)
    if (Array.isArray(raw.day)) candidates.push(...raw.day)
    if (typeof raw.weekDay === 'string' || typeof raw.weekDay === 'number') candidates.push(raw.weekDay)
    if (typeof raw.weekday === 'string' || typeof raw.weekday === 'number') candidates.push(raw.weekday)
    if (typeof raw.dayOfWeek === 'string' || typeof raw.dayOfWeek === 'number') candidates.push(raw.dayOfWeek)

    const normalizeString = (s: string): number | null => {
      const v = s.trim().toLowerCase()
      const map: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
        // Spanish (common)
        domingo: 0,
        lunes: 1,
        martes: 2,
        miercoles: 3,
        miércoles: 3,
        jueves: 4,
        viernes: 5,
        sabado: 6,
        sábado: 6,
      }
      return map[v] ?? null
    }

    const normalizeNumber = (n: number): number | null => {
      // Support 0..6 (JS style) or 1..7 (Mon=1..Sun=7)
      if (!Number.isFinite(n)) return null
      if (n >= 0 && n <= 6) return n
      if (n >= 1 && n <= 7) {
        // 7 => Sunday
        return n === 7 ? 0 : n
      }
      return null
    }

    for (const c of candidates) {
      if (typeof c === 'string') {
        const idx = normalizeString(c)
        if (idx !== null) return { weekdayIndex: idx, weekdayLabel: weekdayLabelFromIndex(idx) }
      }
      if (typeof c === 'number') {
        const idx = normalizeNumber(c)
        if (idx !== null) return { weekdayIndex: idx, weekdayLabel: weekdayLabelFromIndex(idx) }
      }
    }

    return null
  }

  const generateNextWeeklyDates = (weekdayIndex: number, count: number = 6): string[] => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const pad = (n: number) => String(n).padStart(2, '0')
    const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

    const dates: string[] = []
    // Find first occurrence (including today if it matches)
    const delta = (weekdayIndex - today.getDay() + 7) % 7
    let current = new Date(today)
    current.setDate(current.getDate() + delta)

    while (dates.length < count) {
      if (current >= today) dates.push(toDateStr(current))
      current = new Date(current)
      current.setDate(current.getDate() + 7)
    }
    return dates
  }

  const weeklyDatesForSelectedEvent = useMemo(() => {
    if (!selectedEventHasWeeklyMode || !selectedWeeklyInfo) return []
    return generateNextWeeklyDates(selectedWeeklyInfo.weekdayIndex, 6)
  }, [selectedEventHasWeeklyMode, selectedWeeklyInfo])

  const weeklySessionsForSelectedEvent = useMemo(() => {
    if (!selectedEventHasWeeklyMode || !selectedEventDetails) return []
    const timesRaw = (selectedEventDetails as any).times
    const times = Array.isArray(timesRaw)
      ? timesRaw.filter((t: any) => typeof t === 'string' && t.trim().length > 0).map((t: string) => t.trim())
      : []
    return times.map(
      (t: string): { time: string; quote?: number; used?: number; limit?: number; raw?: any } => ({
        time: t,
        raw: { source: 'weekly' },
      })
    )
  }, [selectedEventHasWeeklyMode, selectedEventDetails])

  // Fetch limits on option selection (gomera-vip-tour only)
  useEffect(() => {
    if (slug !== 'gomera-vip-tour') return
    if (!selectedEventId) return
    if (weeklyModeByEventId[selectedEventId]) {
      // Weekly mode detected for this eventId: do not call loadLimits again.
      if (isDev) {
        console.log('[ATL_DEBUG] availability mode:', 'weekly')
      }
      setLimitsLoading(false)
      setLimitsError(null)
      setLimitsData(null)
      return
    }

    let cancelled = false
    const run = async () => {
      const startedAt = Date.now()
      setLimitsLoading(true)
      setLimitsError(null)
      setLimitsData(null)
      setSelectedDate(null)

      if (isDev) {
        console.log('[ATL_DEBUG] selectedEventId:', selectedEventId)
        console.log('[ATL_DEBUG] limits fetch start:', { selectedEventId })
      }

      try {
        const params = new URLSearchParams({
          eventId: selectedEventId,
          lang: locale,
          months: '12',
        })
        // Add groupCode for gomera fallback
        if (groupCode) {
          params.set('groupCode', groupCode)
        }
        const res = await fetch(`/api/atlantico/limits?${params.toString()}`)
        const json = await res.json()

        if (!res.ok) {
          throw new Error(json?.message || json?.error || `HTTP ${res.status}`)
        }

        if (cancelled) return
        setLimitsData(json)

        // Set display month to rangeStart month (so user can navigate from start)
        if (json?.rangeStart && typeof json.rangeStart === 'string') {
          const m = new Date(`${json.rangeStart}T00:00:00`)
          if (!isNaN(m.getTime())) setDisplayMonth(m)
        }

        if (isDev) {
          const duration = Date.now() - startedAt
          const days = json?.days && typeof json.days === 'object' ? Object.values(json.days) : []
          const availableDays = days.filter((d: any) => d?.available).length
          const totalSessions = days.reduce((acc: number, d: any) => acc + (Array.isArray(d?.sessions) ? d.sessions.length : 0), 0)
          console.log('[ATL_DEBUG] limits fetch end + duration:', { durationMs: duration })
          console.log('[ATL_DEBUG] total available days + total sessions:', { availableDays, totalSessions })
        }

        // Weekly availability detection:
        // If loadLimits returns 0 available days AND eventDetails contains a weekly pattern,
        // switch to weekly mode (and do not call loadLimits again for this eventId).
        const daysValues = json?.days && typeof json.days === 'object' ? Object.values(json.days) : []
        const availableDaysCount = daysValues.filter((d: any) => d?.available).length
        if (availableDaysCount === 0) {
          const weekly = detectWeeklyDay(selectedEventDetails)
          if (weekly && selectedEventId) {
            const generated = generateNextWeeklyDates(weekly.weekdayIndex, 6)
            setWeeklyModeByEventId((prev) => ({ ...prev, [selectedEventId]: weekly }))
            setLimitsData(null)
            setLimitsError(null)
            setLimitsLoading(false)

            if (isDev) {
              console.log('[ATL_DEBUG] availability mode:', 'weekly')
              console.log('[ATL_DEBUG] weekly day detected:', weekly.weekdayLabel)
              console.log('[ATL_DEBUG] generated weekly dates:', generated)
            }
          }
        }
      } catch (e) {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : 'Failed to load availability'
        setLimitsError(msg)
      } finally {
        if (!cancelled) setLimitsLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [slug, selectedEventId, locale, isDev, weeklyModeByEventId, selectedEventDetails])

  const monthLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale || 'en', { month: 'long', year: 'numeric' })
    return fmt.format(displayMonth)
  }, [displayMonth, locale])

  const monthRange = useMemo(() => {
    if (!limitsData) return null
    const start = new Date(`${limitsData.rangeStart}T00:00:00`)
    const end = new Date(`${limitsData.rangeEnd}T00:00:00`)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null
    return { start, end }
  }, [limitsData])

  const canGoPrevMonth = useMemo(() => {
    if (!monthRange) return false
    const prev = new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1, 1)
    return prev >= new Date(monthRange.start.getFullYear(), monthRange.start.getMonth(), 1)
  }, [displayMonth, monthRange])

  const canGoNextMonth = useMemo(() => {
    if (!monthRange) return false
    const next = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 1)
    return next <= new Date(monthRange.end.getFullYear(), monthRange.end.getMonth(), 1)
  }, [displayMonth, monthRange])

  const daysForCalendar = useMemo(() => {
    const year = displayMonth.getFullYear()
    const month = displayMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay() // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const pad = (n: number) => String(n).padStart(2, '0')
    const items: Array<{ label: string; dateStr: string | null; available: boolean }> = []

    // Pad before first day (make Monday-first grid: convert Sunday=0 to 7)
    const mondayFirst = (d: number) => (d === 0 ? 7 : d)
    const padCount = mondayFirst(firstDay) - 1
    for (let i = 0; i < padCount; i++) items.push({ label: '', dateStr: null, available: false })

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`
      const available = !!limitsData?.days?.[dateStr]?.available
      items.push({ label: String(day), dateStr, available })
    }
    return items
  }, [displayMonth, limitsData])

  const sessionsForSelectedDate = useMemo(() => {
    if (!selectedDate) return []
    if (selectedEventHasWeeklyMode) return weeklySessionsForSelectedEvent
    if (!limitsData) return []
    return Array.isArray(limitsData.days?.[selectedDate]?.sessions) ? limitsData.days[selectedDate].sessions : []
  }, [limitsData, selectedDate, selectedEventHasWeeklyMode, weeklySessionsForSelectedEvent])

  // Fetch prices when eventId + date are selected (gomera-vip-tour only)
  useEffect(() => {
    if (slug !== 'gomera-vip-tour' || !selectedEventId || !selectedDate) {
      setPricesData(null)
      setPricesError(null)
      return
    }

    let cancelled = false

    const fetchPrices = async () => {
      setPricesLoading(true)
      setPricesError(null)
      setPricesData(null)

      try {
        // Map locale to lang (e.g., 'en' -> 'ENG')
        const langMap: Record<string, string> = {
          en: 'ENG',
          es: 'ESP',
          de: 'GER',
          fr: 'FRA',
          it: 'ITA',
          ru: 'RUS',
          pl: 'POL',
        }
        const lang = langMap[locale] || 'ENG'

        if (process.env.NODE_ENV === 'development') {
          console.log('[ATL_DEBUG] loadPrices called:', {
            eventId: selectedEventId,
            date: selectedDate,
            lang,
          })
        }

        const response = await fetch(`/api/atlantico/prices?eventId=${encodeURIComponent(selectedEventId)}&date=${encodeURIComponent(selectedDate)}&lang=${lang}`)

        if (cancelled) return

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()

        if (cancelled) return

        // Extract prices from response
        const adultPrice = data.adult ?? data.priceAdult ?? data.price?.adult ?? null
        const childPrice = data.child ?? data.priceChild ?? data.price?.child ?? null
        const infantPrice = data.infant ?? data.priceInfant ?? data.price?.infant ?? null

        setPricesData({
          adult: adultPrice !== null && adultPrice !== undefined ? parseFloat(String(adultPrice)) : null,
          child: childPrice !== null && childPrice !== undefined ? parseFloat(String(childPrice)) : null,
          infant: infantPrice !== null && infantPrice !== undefined ? parseFloat(String(infantPrice)) : null,
          raw: data,
        })
      } catch (err) {
        if (cancelled) return
        const errorMsg = err instanceof Error ? err.message : 'Failed to load prices'
        setPricesError(errorMsg)
        setPricesData(null)
      } finally {
        if (!cancelled) {
          setPricesLoading(false)
        }
      }
    }

    fetchPrices()

    return () => {
      cancelled = true
    }
  }, [slug, selectedEventId, selectedDate, locale])

  // Reset selectedSession when date changes
  useEffect(() => {
    setSelectedSession(null)
  }, [selectedDate])

  const tabs = [
    { id: 'what-youll-do', label: tTabs('whatYoullDo'), sectionId: 'section-what-youll-do' },
    { id: 'description', label: tTabs('description'), sectionId: 'section-description' },
    { id: 'details', label: tTabs('details'), sectionId: 'section-details' },
    { id: 'prices', label: tTabs('prices'), sectionId: 'section-prices' },
    { id: 'reviews', label: tTabs('reviews'), sectionId: 'section-reviews' },
  ]

  // Extract "What you'll do" - first sentence or short description
  // Use mock data if available, otherwise use tour data
  const whatYoullDo = mockData?.shortDescription ||
    tour.shortDescriptionOverride || 
    tour.shortDescription ||
    (tour.description ? tour.description.split(/[.!?]/)[0] + '.' : '') ||
    tPage('fallbackDescription')

  // Description text
  const description = mockData?.fullDescription || tour.description || ''

  // Format duration
  const formatDuration = (hours: number | null): string => {
    if (!hours) return ''
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    if (h > 0 && m > 0) {
      return `${h} - ${h + 1} hrs`
    } else if (h > 0) {
      return `${h} hrs`
    }
    return ''
  }

  /**
   * Parse data into bullet points array
   * Handles arrays, strings with line breaks, and various separators
   */
  const parseToBulletPoints = (data: any): string[] => {
    if (!data) return []
    
    // If already an array, return as-is (filter out empty items)
    if (Array.isArray(data)) {
      return data
        .map(item => String(item).trim())
        .filter(item => item.length > 0)
    }
    
    // If string, try to parse by line breaks or separators
    if (typeof data === 'string') {
      const trimmed = data.trim()
      if (!trimmed) return []
      
      // Try splitting by newlines first
      const lines = trimmed.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0)
      if (lines.length > 1) {
        return lines
      }
      
      // Try splitting by common separators (semicolon, pipe, bullet points)
      const separators = [/;\s*/, /\|\s*/, /•\s*/, /-\s*/, /,\s*(?=[A-Z])/]
      for (const separator of separators) {
        const parts = trimmed.split(separator).map(part => part.trim()).filter(part => part.length > 0)
        if (parts.length > 1) {
          return parts
        }
      }
      
      // If no separators found, return as single item
      return [trimmed]
    }
    
    return []
  }

  /**
   * Extract includes list from tour data
   * Priority: included[] > highlights[] > details string > description string
   * TODO: Add translation support for "INCLUDES:" label when i18n keys are available
   */
  const getIncludesList = (): string[] => {
    // Priority 1: included array
    const included = tour.raw?.included || tour.raw?.includes
    if (included) {
      const parsed = parseToBulletPoints(included)
      if (parsed.length > 0) return parsed
    }
    
    // Priority 2: highlights array
    const highlights = tour.raw?.highlights || tour.raw?.features
    if (highlights) {
      const parsed = parseToBulletPoints(highlights)
      if (parsed.length > 0) return parsed
    }
    
    // Priority 3: details string
    const details = tour.raw?.details || tour.raw?.desc || tour.raw?.description || tour.raw?._raw?.desc
    if (details) {
      const parsed = parseToBulletPoints(details)
      if (parsed.length > 0) return parsed
    }
    
    // Priority 4: description string (fallback - only if it looks like a list)
    if (tour.description) {
      const parsed = parseToBulletPoints(tour.description)
      // Only use description if it was successfully parsed into multiple items
      if (parsed.length > 1) return parsed
    }
    
    return []
  }

  // Find min adult price
  let minAdultPrice: number | null = null
  for (const event of tour.events) {
    if (event.price?.adult !== null && event.price?.adult !== undefined && event.price.adult > 0) {
      if (minAdultPrice === null || event.price.adult < minAdultPrice) {
        minAdultPrice = event.price.adult
      }
    }
  }

  return (
    <div className="min-h-screen bg-white pb-24 lg:pb-0">
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 max-w-7xl py-4">
        <nav className="text-sm text-glass-600">
          <span>Tours VIP</span>
          <span className="mx-2">›</span>
          <span className="text-glass-900">{tour.title}</span>
        </nav>
      </div>

      <div className="container mx-auto px-4 max-w-7xl">
        {/* Title + Meta Icons */}
        <div className="py-6 border-b border-glass-200 relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold text-glass-900 mb-4">{tour.title}</h1>
          
          {/* Static header price badge - Show for all VIP activities if min price available */}
          {(() => {
            // For astronomic-tour-vip, use dedicated badge
            if (slug === 'astronomic-tour-vip' && astronomicTourVipMedia.headerPriceBadge) {
              return (
                <div className="mb-4">
                  <span className="inline-flex items-center rounded-full bg-glass-100 px-3 py-1 text-sm font-semibold text-ocean-600">
                    {astronomicTourVipMedia.headerPriceBadge}
                  </span>
                </div>
              )
            }
            
            // For other VIP activities, show "From €XX" if min price available
            if (minAdultPrice !== null && minAdultPrice > 0) {
              return (
                <div className="mb-4">
                  <span className="inline-flex items-center rounded-full bg-glass-100 px-3 py-1 text-sm font-semibold text-ocean-600">
                    From €{minAdultPrice.toFixed(0)}
                  </span>
                </div>
              )
            }
            
            return null
          })()}

          {/* Meta Icons */}
          <div className="flex flex-wrap gap-4 text-sm text-glass-600">
            {/* Small group - only if available in data */}
            {tour.raw?.groupSize && (
              <div className="flex items-center gap-2">
                <span>👥</span>
                <span>{tPage('smallGroup')}</span>
              </div>
            )}
            
            {/* Pickup service - only if available */}
            {tour.raw?.pickup && (
              <div className="flex items-center gap-2">
                <span>🚐</span>
                <span>{tPage('pickupService')}</span>
              </div>
            )}
            
            {/* Accessible - only if available */}
            {tour.raw?.accessible && (
              <div className="flex items-center gap-2">
                <span>♿</span>
                <span>Accessible</span>
              </div>
            )}
            
            {/* Duration */}
            {tour.duration && (
              <div className="flex items-center gap-2">
                <span>⏱</span>
                <span>{formatDuration(tour.duration)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Hero Gallery - now placed under the title to avoid overlap */}
        <div className="mt-6">
          <HeroGallery
            images={tour.imageUrls}
            title={tour.title}
            // Enable mobile slider for all VIP activities
            enableMobileSlider={true}
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-8">
          {/* Left Column: Content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Sections */}
            <div className="py-8">
              {/* What you'll do */}
              <Accordion
                id="section-what-youll-do"
                title="What you'll do"
                isOpen={isSectionOpen('what-youll-do')}
                onToggle={() => toggleSection('what-youll-do')}
              >
                <p className="text-glass-700">{whatYoullDo}</p>
              </Accordion>

              {/* Description */}
              <Accordion
                id="section-description"
                title="Description"
                isOpen={isSectionOpen('description')}
                onToggle={() => toggleSection('description')}
              >
                <div>
                  {mockData ? (
                    // Mock data: plain text (no HTML)
                    <div>
                      <p className={`text-glass-700 whitespace-pre-line ${!showFullDescription && 'line-clamp-6'}`}>
                        {description}
                      </p>
                      {description.length > 300 && (
                        <button
                          onClick={() => setShowFullDescription(!showFullDescription)}
                          className="mt-4 text-ocean-600 hover:text-ocean-700 font-medium"
                        >
                          {showFullDescription ? tPage('showLess') : tPage('showMore')}
                        </button>
                      )}
                    </div>
                  ) : (
                    // Real data: may contain HTML
                    <div>
                      <div
                        className={`text-glass-700 ${!showFullDescription && 'line-clamp-6'}`}
                        dangerouslySetInnerHTML={sanitizeAtlanticoHtml(description)}
                      />
                      {description.length > 300 && (
                        <button
                          onClick={() => setShowFullDescription(!showFullDescription)}
                          className="mt-4 text-ocean-600 hover:text-ocean-700 font-medium"
                        >
                          {showFullDescription ? tPage('showLess') : tPage('showMore')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </Accordion>

              {/* Details */}
              {(() => {
                // For mock VIP tours, use mock data
                if (mockData && mockData.detailsBullets.length > 0) {
                  return (
                    <Accordion
                      id="section-details"
                      title="Details"
                      isOpen={isSectionOpen('details')}
                      onToggle={() => toggleSection('details')}
                    >
                      <div>
                        <h4 className="font-semibold text-glass-900 mb-3">INCLUDES:</h4>
                        <ul className="list-disc list-inside text-glass-700 space-y-1">
                          {mockData.detailsBullets.map((item: string, idx: number) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </Accordion>
                  )
                }
                
                // For gomera-vip-tour, use exact Atlantico content with i18n
                if (slug === 'gomera-vip-tour') {
                  return (
                    <Accordion
                      id="section-details"
                      title="Details"
                      isOpen={isSectionOpen('details')}
                      onToggle={() => toggleSection('details')}
                    >
                      <div>
                        <h4 className="font-semibold text-glass-900 mb-3">{t('title')}</h4>
                        <ul className="list-disc list-inside text-glass-700 space-y-1">
                          <li>{t('items.ferry')}</li>
                          <li>{t('items.stops')}</li>
                          <li>{t('items.driver')}</li>
                          <li>{t('items.lunch')}</li>
                          <li>{t('items.explanations')}</li>
                          <li>{t('items.vehicle')}</li>
                          <li>{t('items.transport')}</li>
                          <li>{t('items.insurance')}</li>
                        </ul>
                      </div>
                    </Accordion>
                  )
                }
                
                // Get includes list using helper function
                const includesList = getIncludesList()
                
                // For astronomic-tour-vip, use static Atlantico content
                if (slug === 'astronomic-tour-vip') {
                  return (
                    <Accordion
                      id="section-details"
                      title="Details"
                      isOpen={isSectionOpen('details')}
                      onToggle={() => toggleSection('details')}
                    >
                      <div>
                        <h4 className="font-semibold text-glass-900 mb-3">INCLUDES:</h4>
                        <ul className="list-disc list-inside text-glass-700 space-y-1">
                          <li>Professional astronomy guide</li>
                          <li>Telescope observation session</li>
                          <li>Transportation (pickup and drop-off)</li>
                          <li>VIP private experience</li>
                          <li>Refreshments</li>
                        </ul>
                      </div>
                    </Accordion>
                  )
                }
                
                // For other activities, use parsed includes list
                // TODO: Add translation support for "Details" and "INCLUDES:" labels when i18n keys are available
                if (includesList.length === 0) {
                  // If no includes found, don't render the section
                  return null
                }
                
                return (
                  <Accordion
                    id="section-details"
                    title="Details"
                    isOpen={isSectionOpen('details')}
                    onToggle={() => toggleSection('details')}
                  >
                    <div>
                      <h4 className="font-semibold text-glass-900 mb-3">INCLUDES:</h4>
                      <ul className="list-disc list-inside text-glass-700 space-y-1">
                        {includesList.map((item: string, idx: number) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </Accordion>
                )
              })()}

              {/* Free Cancellation - gomera-vip-tour and mock VIP tours */}
              {(slug === 'gomera-vip-tour' || (mockData && mockData.freeCancellationText)) && (
                <Accordion
                  id="section-free-cancellation"
                  title={tPage('cancellation.title')}
                  isOpen={isSectionOpen('free-cancellation')}
                  onToggle={() => toggleSection('free-cancellation')}
                >
                  <p className="text-glass-700">
                    {mockData?.freeCancellationText || tPage('cancellation.free')}
                  </p>
                </Accordion>
              )}

              {/* Cancellation Policy */}
              {(() => {
                // Skip cancellation policy for gomera-vip-tour and mock tours (use Free Cancellation section above)
                if (slug === 'gomera-vip-tour' || mockData) {
                  return null
                }
                
                // For astronomic-tour-vip, use static Atlantico cancellation policy
                if (slug === 'astronomic-tour-vip') {
                  return (
                    <Accordion
                      id="section-cancellation"
                      title={tPage('cancellation.policy')}
                      isOpen={isSectionOpen('cancellation')}
                      onToggle={() => toggleSection('cancellation')}
                    >
                      <div className="text-glass-700">
                        <ul className="list-disc list-inside space-y-1">
                          <li><strong>Free cancellation:</strong> You can cancel free of charge up to 72 hours before the start of the activity.</li>
                          <li><strong>50% refund:</strong> If you cancel between 72 and 24 hours before the start, you will receive a 50% refund.</li>
                          <li><strong>No refund:</strong> If you cancel less than 24 hours before the start or do not show up, no refund will be provided.</li>
                          <li><strong>Weather conditions:</strong> If the activity is cancelled due to adverse weather conditions, you will receive a full refund or the option to reschedule for another date.</li>
                          <li><strong>Changes:</strong> Changes to the booking can be made up to 72 hours before the start time, subject to availability.</li>
                        </ul>
                      </div>
                    </Accordion>
                  )
                }
                
                // For other activities, extract cancellation policy from raw data
                let cancellationPolicy = 
                  tour.cancellationPolicyOverride || 
                  tour.raw?.cancellationPolicy || 
                  tour.raw?.cancellation_policy ||
                  tour.raw?.cancellation ||
                  tour.raw?.refundPolicy ||
                  tour.raw?.refund_policy ||
                  null
                
                // Check events for cancellation policy if not in tour
                if (!cancellationPolicy && tour.events.length > 0) {
                  for (const event of tour.events) {
                    const eventPolicy = 
                      event.raw?.cancellationPolicy ||
                      event.raw?.cancellation_policy ||
                      event.raw?.cancellation ||
                      null
                    if (eventPolicy) {
                      cancellationPolicy = eventPolicy
                      break
                    }
                  }
                }
                
                if (!cancellationPolicy) {
                  return null // Don't render the accordion if no policy
                }
                
                // Parse cancellation policy into bullet points
                const cancellationPoints = parseToBulletPoints(cancellationPolicy)
                
                // Determine title: "Free cancellation" if policy mentions free cancellation, otherwise "Cancellation"
                const policyText = String(cancellationPolicy).toLowerCase()
                const hasFreeCancellation = policyText.includes('free cancellation') || policyText.includes('free cancel')
                const cancellationTitle = hasFreeCancellation ? tPage('cancellation.title') : tPage('cancellation.policy')
                
                return (
                  <Accordion
                    id="section-cancellation"
                    title={cancellationTitle}
                    isOpen={isSectionOpen('cancellation')}
                    onToggle={() => toggleSection('cancellation')}
                  >
                    {cancellationPoints.length > 1 ? (
                      <ul className="list-disc list-inside text-glass-700 space-y-1">
                        {cancellationPoints.map((point: string, idx: number) => (
                          <li key={idx}>{point}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-glass-700">{String(cancellationPolicy)}</p>
                    )}
                  </Accordion>
                )
              })()}

              {/* Prices */}
              <Accordion
                id="section-prices"
                title="Prices"
                isOpen={isSectionOpen('prices')}
                onToggle={() => toggleSection('prices')}
              >
                <div className="relative">
                  {/* "From €XXX" removed - prices now shown in option labels */}
                  <div className="overflow-x-auto mt-6">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-glass-200">
                          <th className="text-left py-3 px-4 font-semibold text-glass-900">{tPage('option')}</th>
                          <th className="text-right py-3 px-4 font-semibold text-glass-900">{tPage('adults')}</th>
                          <th className="text-right py-3 px-4 font-semibold text-glass-900">{tPage('children')}</th>
                          <th className="text-right py-3 px-4 font-semibold text-glass-900">{tPage('infants')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockData ? (
                          // Mock data: single row with prices from mockData
                          <tr className="border-b border-glass-100">
                            <td className="py-3 px-4 text-glass-700">{mockData.title}</td>
                            <td className="py-3 px-4 text-right text-glass-700">
                              {mockData.prices.adult > 0 ? `€${mockData.prices.adult}` : '-'}
                            </td>
                            <td className="py-3 px-4 text-right text-glass-700">
                              {mockData.prices.child !== null && mockData.prices.child !== undefined && mockData.prices.child > 0
                                ? `€${mockData.prices.child}`
                                : '-'}
                            </td>
                            <td className="py-3 px-4 text-right text-glass-700">
                              {mockData.prices.infant !== null && mockData.prices.infant !== undefined && mockData.prices.infant > 0
                                ? `€${mockData.prices.infant}`
                                : '-'}
                            </td>
                          </tr>
                        ) : (
                          // Real data: map events
                          tour.events.map((event) => {
                            const eventTitle = event.title || event.id
                            return (
                              <tr key={event.id} className="border-b border-glass-100">
                                <td className="py-3 px-4 text-glass-700">{eventTitle}</td>
                                <td className="py-3 px-4 text-right text-glass-700">
                                  {event.price?.adult !== null && event.price?.adult !== undefined && event.price.adult > 0
                                    ? `€${event.price.adult}`
                                    : '-'}
                                </td>
                                <td className="py-3 px-4 text-right text-glass-700">
                                  {event.price?.child !== null && event.price?.child !== undefined && event.price.child > 0
                                    ? `€${event.price.child}`
                                    : '-'}
                                </td>
                                <td className="py-3 px-4 text-right text-glass-700">
                                  {event.price?.infant !== null && event.price?.infant !== undefined && event.price.infant > 0
                                    ? `€${event.price.infant}`
                                    : '-'}
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Accordion>

              {/* Reviews */}
              <Accordion
                id="section-reviews"
                title="Reviews"
                isOpen={isSectionOpen('reviews')}
                onToggle={() => toggleSection('reviews')}
              >
                <p className="text-glass-500 italic">{tPage('reviewsComingSoon')}</p>
              </Accordion>
            </div>
          </div>

          {/* Right Column: Booking Widget */}
          <div className="lg:col-span-1">
            <section id="booking-widget" className="scroll-mt-6">
              {tour._isPlaceholder ? (
                <div className="bg-white border border-glass-200 rounded-lg p-6 shadow-lg">
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-glass-200 to-glass-300 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-glass-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-glass-900 mb-2">
                      Booking Coming Soon
                    </h3>
                    <p className="text-glass-600 mb-4">
                      This VIP tour is currently being set up. Please check back soon for availability, pricing, and booking options.
                    </p>
                    <p className="text-sm text-glass-500">
                      API connection pending
                    </p>
                  </div>
                </div>
              ) : (
                <AtlanticoBookingWidget
                  tour={{
                    id: tour.id,
                    events: tour.events.map((e) => ({
                      id: e.id,
                      code: e.raw?.code || e.id,
                      title: e.title,
                      price: e.price,
                      raw: e.raw,
                    })),
                    raw: tour.raw, // Pass raw catalog data to extract t_group
                  }}
                  locale={locale}
                  slug={slug}
                />
              )}
            </section>
            
            {/* API Debug Panel removed for VIP activities */}
          </div>
        </div>
      </div>

      {/* Mobile Booking Floating Action Button */}
      <MobileBookingFab />
    </div>
  )
}

