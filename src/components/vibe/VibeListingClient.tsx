'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Link } from '@/navigation'
import { buildAtlanticoImageUrl } from '@/lib/atlantico/client'
import { isVipTourGroup, getVipTourCoverImageSync, getVipTourLocalImages } from '@/lib/atlantico/vip-tours-images'
import { parseEventIds } from '@/lib/atlantico'
import { mapLocaleToAtlanticoLang } from '@/lib/atlantico/lang'
import { Chip } from '@/ui/components/shared/Chip'
import { cn } from '@/ui/lib/cn'
import { TourRowCard } from './TourRowCard'
import { InlineFilterDropdown } from './InlineFilterDropdown'
import { SafeImage } from '@/components/SafeImage'

interface Tour {
  id: string | number
  code: string
  name: string
  desc?: string
  image?: string
  price?: number
  duration?: string
  ids?: (string | number)[]
}

interface AvailabilityPreview {
  hasToday: boolean
  hasTomorrow: boolean
  nextAvailableDate: string | null
  availableWeekdays: string[]
  loading: boolean
  error: boolean
}

interface VibeListingClientProps {
  initialTours: Tour[]
  locale: string
  classificationName: string
}

type SortOption = 'popularity' | 'price-asc' | 'price-desc' | 'duration-asc' | 'duration-desc' | 'name-az'
type ViewMode = 'grid' | 'list'
type DurationFilter = 'all' | '0-3h' | '3-5h' | '5-7h' | '7h+'
type AvailabilityFilter = 'all' | 'today' | 'tomorrow' | 'dates'

interface Filters {
  duration: DurationFilter
  availability: AvailabilityFilter
  priceMin: number
  priceMax: number
  search: string
}

// Parse duration string to hours (e.g., "3h" -> 3, "2.5h" -> 2.5, "30min" -> 0.5)
function parseDurationHours(duration?: string): number | null {
  if (!duration) return null
  const str = duration.toLowerCase().trim()
  
  // Match patterns like "3h", "2.5h", "30min", "1 hour", etc.
  const hourMatch = str.match(/(\d+\.?\d*)\s*h(?:our)?s?/i)
  if (hourMatch) {
    return parseFloat(hourMatch[1])
  }
  
  const minMatch = str.match(/(\d+)\s*min(?:ute)?s?/i)
  if (minMatch) {
    return parseFloat(minMatch[1]) / 60
  }
  
  return null
}

// Format date as "Tue 24" or "Mon 15"
function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return `${days[date.getDay()]} ${date.getDate()}`
}

// Get weekday names from event details days array
function getWeekdayNames(days: number[]): string[] {
  const weekdayMap: Record<number, string> = {
    0: 'Sun',
    1: 'Mon',
    2: 'Tue',
    3: 'Wed',
    4: 'Thu',
    5: 'Fri',
    6: 'Sat',
  }
  return days.map(d => weekdayMap[d] || '').filter(Boolean)
}

export function VibeListingClient({ initialTours, locale, classificationName }: VibeListingClientProps) {
  const [tours] = useState<Tour[]>(initialTours)
  const [sort] = useState<SortOption>('popularity') // Keep state for compatibility but unused
  const viewMode: ViewMode = 'grid' // Force grid view only
  const [filters, setFilters] = useState<Filters>({
    duration: 'all',
    availability: 'all',
    priceMin: 0,
    priceMax: 1000,
    search: '',
  })
  
  // Availability previews (lazy loaded per tour)
  const [availabilityPreviews, setAvailabilityPreviews] = useState<Record<string, AvailabilityPreview>>({})
  const [loadingAvailability, setLoadingAvailability] = useState<Set<string>>(new Set())
  
  const atlLang = mapLocaleToAtlanticoLang(locale)

  // Calculate price range from tours
  const priceRange = useMemo(() => {
    const prices = tours
      .map(t => t.price)
      .filter((p): p is number => p !== undefined && p > 0)
    
    if (prices.length === 0) {
      return { min: 0, max: 1000 }
    }
    
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    }
  }, [tours])

  // Initialize price filter range
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      priceMin: priceRange.min,
      priceMax: priceRange.max,
    }))
  }, [priceRange])

  // Load availability preview for a tour
  const loadAvailabilityPreview = useCallback(async (tour: Tour) => {
    const tourKey = `${tour.id}-${tour.code}`
    
    // Skip if already loading or loaded
    if (loadingAvailability.has(tourKey) || availabilityPreviews[tourKey]) {
      return
    }

    // Parse event IDs from tour.ids
    const eventIds = parseEventIds(tour.ids)
    if (eventIds.length === 0) {
      return
    }

    const primaryEventId = eventIds[0]
    
    setLoadingAvailability(prev => new Set(prev).add(tourKey))
    
    try {
      // Fetch event details and limits in parallel
      const [eventDetailsRes, limitsRes] = await Promise.all([
        fetch(`/api/atlantico/event-details?eventId=${encodeURIComponent(primaryEventId)}&lang=${encodeURIComponent(atlLang)}`).catch(() => null),
        (async () => {
          const now = new Date()
          const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
          return fetch(`/api/atlantico/limits?eventId=${encodeURIComponent(primaryEventId)}&lang=${encodeURIComponent(atlLang)}&month=${monthStart}`).catch(() => null)
        })(),
      ])

      const eventDetails = eventDetailsRes?.ok ? await eventDetailsRes.json().catch(() => null) : null
      const limits = limitsRes?.ok ? await limitsRes.json().catch(() => null) : null

      // Compute availability info
      const today = new Date().toISOString().split('T')[0]
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      let hasToday = false
      let hasTomorrow = false
      let nextAvailableDate: string | null = null
      const availableWeekdays: string[] = []

      // Check limits for today/tomorrow
      if (limits?.ok && limits.availableDates) {
        hasToday = limits.availableDates.includes(today)
        hasTomorrow = limits.availableDates.includes(tomorrow)
        
        // Find next available date (first date >= today with valid sessions)
        const validDates = limits.availableDates
          .filter((d: string) => d >= today)
          .sort()
        
        if (validDates.length > 0) {
          // Check if first date has valid sessions (not just "00:00")
          const firstDate = validDates[0]
          const sessions = limits.sessionsByDay?.[firstDate] || []
          const hasValidSessions = sessions.some((s: any) => s.time && s.time !== '00:00' && s.time !== '-')
          
          if (hasValidSessions || sessions.length === 0) {
            nextAvailableDate = firstDate
          } else if (validDates.length > 1) {
            nextAvailableDate = validDates[1]
          }
        }
      }

      // Get weekdays from event details
      // Handle both array and number formats
      if (eventDetails?.days) {
        if (Array.isArray(eventDetails.days)) {
          const weekdays = getWeekdayNames(eventDetails.days)
          availableWeekdays.push(...weekdays)
        } else if (typeof eventDetails.days === 'number') {
          // If days is a single number, convert to array
          const weekdays = getWeekdayNames([eventDetails.days])
          availableWeekdays.push(...weekdays)
        }
      }

      setAvailabilityPreviews(prev => ({
        ...prev,
        [tourKey]: {
          hasToday,
          hasTomorrow,
          nextAvailableDate,
          availableWeekdays: [...new Set(availableWeekdays)],
          loading: false,
          error: false,
        },
      }))
    } catch (error) {
      // Silently fail - don't show error, just mark as not available
      setAvailabilityPreviews(prev => ({
        ...prev,
        [tourKey]: {
          hasToday: false,
          hasTomorrow: false,
          nextAvailableDate: null,
          availableWeekdays: [],
          loading: false,
          error: true,
        },
      }))
    } finally {
      setLoadingAvailability(prev => {
        const next = new Set(prev)
        next.delete(tourKey)
        return next
      })
    }
  }, [atlLang, loadingAvailability, availabilityPreviews])

  // Filter and sort tours
  const filteredAndSortedTours = useMemo(() => {
    let filtered = [...tours]

    // Search filter
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(searchLower) ||
        (t.desc && t.desc.toLowerCase().includes(searchLower))
      )
    }

    // Duration filter
    if (filters.duration !== 'all') {
      filtered = filtered.filter(t => {
        const hours = parseDurationHours(t.duration)
        if (hours === null) return false
        
        switch (filters.duration) {
          case '0-3h':
            return hours >= 0 && hours < 3
          case '3-5h':
            return hours >= 3 && hours < 5
          case '5-7h':
            return hours >= 5 && hours < 7
          case '7h+':
            return hours >= 7
          default:
            return true
        }
      })
    }

    // Price filter
    filtered = filtered.filter(t => {
      if (t.price === undefined) return true
      return t.price >= filters.priceMin && t.price <= filters.priceMax
    })

    // Availability filter (client-side check on previews)
    if (filters.availability !== 'all') {
      filtered = filtered.filter(t => {
        const tourKey = `${t.id}-${t.code}`
        const preview = availabilityPreviews[tourKey]
        if (!preview || preview.loading) return true // Include if not loaded yet
        
        switch (filters.availability) {
          case 'today':
            return preview.hasToday
          case 'tomorrow':
            return preview.hasTomorrow
          case 'dates':
            return preview.nextAvailableDate !== null
          default:
            return true
        }
      })
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sort) {
        case 'price-asc':
          return (a.price || 0) - (b.price || 0)
        case 'price-desc':
          return (b.price || 0) - (a.price || 0)
        case 'duration-asc': {
          const aHours = parseDurationHours(a.duration) || 0
          const bHours = parseDurationHours(b.duration) || 0
          return aHours - bHours
        }
        case 'duration-desc': {
          const aHours = parseDurationHours(a.duration) || 0
          const bHours = parseDurationHours(b.duration) || 0
          return bHours - aHours
        }
        case 'name-az':
          return a.name.localeCompare(b.name)
        case 'popularity':
        default:
          // Default: keep original order (could be enhanced with popularity data)
          return 0
      }
    })

    return filtered
  }, [tours, filters, sort, availabilityPreviews])

  // Load availability for visible tours (first 12, then on scroll)
  useEffect(() => {
    const visibleTours = filteredAndSortedTours.slice(0, 12)
    
    // Filter out tours that already have availability loaded or are loading
    const toursToLoad = visibleTours.filter(tour => {
      const tourKey = `${tour.id}-${tour.code}`
      return !availabilityPreviews[tourKey] && !loadingAvailability.has(tourKey)
    })
    
    if (toursToLoad.length === 0) return
    
    // Limit concurrency to 4-6 parallel fetches
    const concurrencyLimit = 4
    let activeCount = 0
    const queue: Tour[] = [...toursToLoad]
    
    const processQueue = async () => {
      while (queue.length > 0 || activeCount > 0) {
        if (activeCount < concurrencyLimit && queue.length > 0) {
          const tour = queue.shift()!
          activeCount++
          loadAvailabilityPreview(tour).finally(() => {
            activeCount--
          })
        } else {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    }
    
    void processQueue()
  }, [filteredAndSortedTours, loadAvailabilityPreview, availabilityPreviews, loadingAvailability])

  return (
    <div className="space-y-3">
      {/* Filters Row */}
      <div className="flex items-center gap-2 flex-wrap">
          {/* Availability Filter */}
          <InlineFilterDropdown
            label="Availability"
            value={filters.availability === 'all' ? 'Availability' : filters.availability === 'today' ? 'Today' : filters.availability === 'tomorrow' ? 'Tomorrow' : 'Select Dates'}
            options={[
              { value: 'all', label: 'All' },
              { value: 'today', label: 'Today' },
              { value: 'tomorrow', label: 'Tomorrow' },
              { value: 'dates', label: 'Select Dates' },
            ]}
            selectedValue={filters.availability}
            onChange={(value) => setFilters(prev => ({ ...prev, availability: value as AvailabilityFilter }))}
          />

          {/* Duration Filter */}
          <InlineFilterDropdown
            label="Duration"
            value={filters.duration === 'all' ? 'Duration' : filters.duration === '0-3h' ? '0-3 hours' : filters.duration === '3-5h' ? '3-5 hours' : filters.duration === '5-7h' ? '5-7 hours' : 'All day (7h+)'}
            options={[
              { value: 'all', label: 'All' },
              { value: '0-3h', label: '0-3 hours' },
              { value: '3-5h', label: '3-5 hours' },
              { value: '5-7h', label: '5-7 hours' },
              { value: '7h+', label: 'All day (7h+)' },
            ]}
            selectedValue={filters.duration}
            onChange={(value) => setFilters(prev => ({ ...prev, duration: value as DurationFilter }))}
          />

          {/* Price Filter */}
          <InlineFilterDropdown
            label="Price"
            value={filters.priceMin === priceRange.min && filters.priceMax === priceRange.max ? 'Price' : `€${filters.priceMin} - €${filters.priceMax}`}
            options={[]}
            selectedValue=""
            onChange={() => {}}
            customContent={
              <div className="space-y-4 min-w-[280px] p-2">
                <div>
                  <div className="text-sm font-semibold text-glass-700 mb-3">
                    Price: €{filters.priceMin} - €{filters.priceMax}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-glass-600 mb-1">Min: €{filters.priceMin}</label>
                      <input
                        type="range"
                        min={priceRange.min}
                        max={priceRange.max}
                        value={filters.priceMin}
                        onChange={(e) => {
                          const newMin = parseInt(e.target.value)
                          setFilters(prev => ({ 
                            ...prev, 
                            priceMin: Math.min(newMin, prev.priceMax) 
                          }))
                        }}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-glass-600 mb-1">Max: €{filters.priceMax}</label>
                      <input
                        type="range"
                        min={priceRange.min}
                        max={priceRange.max}
                        value={filters.priceMax}
                        onChange={(e) => {
                          const newMax = parseInt(e.target.value)
                          setFilters(prev => ({ 
                            ...prev, 
                            priceMax: Math.max(newMax, prev.priceMin) 
                          }))
                        }}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            }
          />
      </div>

      {/* Tour Cards */}
      {filteredAndSortedTours.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <p className="text-glass-600 text-lg">No tours match your filters.</p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedTours.map((tour) => (
            <TourCard
              key={`${tour.id}-${tour.code}`}
              tour={tour}
              locale={locale}
              availabilityPreview={availabilityPreviews[`${tour.id}-${tour.code}`]}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Tour Card Component
interface TourCardProps {
  tour: Tour
  locale: string
  availabilityPreview?: AvailabilityPreview
}

function TourCard({ tour, locale, availabilityPreview }: TourCardProps) {
  const [vipTourImage, setVipTourImage] = useState<string | null>(null)
  const isVipTour = isVipTourGroup(tour.code)
  
  // Load VIP Tour images dynamically
  useEffect(() => {
    if (isVipTour) {
      getVipTourLocalImages(tour.code)
        .then(images => {
          if (images.length > 0) {
            setVipTourImage(images[0]) // Use first available image
          }
        })
        .catch(() => {
          // Fallback to sync version if API fails
          const fallback = getVipTourCoverImageSync(tour.code)
          if (fallback) {
            setVipTourImage(fallback)
          }
        })
    }
  }, [isVipTour, tour.code])
  
  // Determine card image: VIP local image > API image > fallback
  const cardImage = useMemo(() => {
    if (isVipTour && vipTourImage) {
      return vipTourImage
    }
    if (tour.image) {
      return buildAtlanticoImageUrl(tour.image)
    }
    return null
  }, [isVipTour, vipTourImage, tour.image])

  return (
    <Link
      href={`/activities/${tour.code}`}
      className="glass-panel p-6 hover:shadow-lg transition-all duration-200 block"
    >
      {/* Image */}
      <div className="mb-4 aspect-video overflow-hidden rounded-lg relative bg-glass-100">
        {cardImage ? (
          <SafeImage
            src={cardImage}
            alt={tour.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-glass-400 text-sm">
            No image
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-glass-900 mb-2 line-clamp-2">
        {tour.name}
      </h3>

      {/* Description */}
      {tour.desc && (
        <p className="text-glass-600 text-sm mb-3 line-clamp-2">
          {tour.desc}
        </p>
      )}

      {/* Duration & Price */}
      <div className="flex items-center justify-between text-sm text-glass-500 mb-3">
        {tour.duration && <span>{tour.duration}</span>}
        {tour.price !== undefined && (
          <span className="font-semibold text-glass-900">From €{tour.price.toFixed(2)}</span>
        )}
      </div>

      {/* Rating Placeholder */}
      <div className="flex items-center gap-1 mb-3 text-sm text-glass-500">
        <span>★★★★☆</span>
        <span className="text-xs">(0)</span>
      </div>

      {/* Availability Preview */}
      {availabilityPreview && (
        <div className="mt-3 pt-3 border-t border-glass-200">
          {availabilityPreview.loading ? (
            <div className="text-xs text-glass-500">Loading availability...</div>
          ) : availabilityPreview.error ? (
            <div className="text-xs text-glass-400">Availability not available</div>
          ) : (
            <div className="text-xs text-glass-600">
              {availabilityPreview.hasToday ? (
                <span className="text-ocean-600 font-medium">Available today</span>
              ) : availabilityPreview.hasTomorrow ? (
                <span className="text-ocean-600 font-medium">Available tomorrow</span>
              ) : availabilityPreview.nextAvailableDate ? (
                <span>Next: {formatShortDate(availabilityPreview.nextAvailableDate)}</span>
              ) : availabilityPreview.availableWeekdays.length > 0 ? (
                <span>{availabilityPreview.availableWeekdays.join(', ')}</span>
              ) : (
                <span className="text-glass-400">Check availability</span>
              )}
            </div>
          )}
        </div>
      )}
    </Link>
  )
}

