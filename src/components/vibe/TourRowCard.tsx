'use client'

import { Link } from '@/navigation'
import { buildAtlanticoImageUrl } from '@/lib/atlantico/client'
import { cn } from '@/ui/lib/cn'

interface Tour {
  id: string | number
  code: string
  name: string
  desc?: string
  image?: string
  price?: number
  duration?: string
  classificationName?: string
}

interface AvailabilityPreview {
  weekdays?: string[]
  nextAvailableLabel?: string
  availableToday?: boolean
  availableTomorrow?: boolean
  loading?: boolean
  error?: boolean
  hasToday?: boolean
  hasTomorrow?: boolean
  nextAvailableDate?: string | null
  availableWeekdays?: string[] // Array of weekday names like ['Mon', 'Tue', 'Wed']
}

interface TourRowCardProps {
  tour: Tour
  availabilityPreview?: AvailabilityPreview
}

// Format date as "Tue 24" or "Mon 15"
function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return `${days[date.getDay()]} ${date.getDate()}`
}

// Parse duration to extract hours for icon display
function parseDuration(duration?: string): string {
  if (!duration) return ''
  // Return as-is, or extract just the number part if needed
  return duration
}

// Weekday labels (Monday-first to match Atlantico style)
const WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
const WEEKDAY_MAP: Record<string, number> = {
  'Mon': 0, // Monday -> MO
  'Tue': 1, // Tuesday -> TU
  'Wed': 2, // Wednesday -> WE
  'Thu': 3, // Thursday -> TH
  'Fri': 4, // Friday -> FR
  'Sat': 5, // Saturday -> SA
  'Sun': 6, // Sunday -> SU
}

export function TourRowCard({ tour, availabilityPreview }: TourRowCardProps) {
  // Determine active weekdays from availability preview
  const activeWeekdays = new Set<number>()
  
  if (availabilityPreview?.availableWeekdays && availabilityPreview.availableWeekdays.length > 0) {
    availabilityPreview.availableWeekdays.forEach(day => {
      const index = WEEKDAY_MAP[day]
      if (index !== undefined) {
        activeWeekdays.add(index)
      }
    })
  }

  // Get availability label
  let availabilityLabel: string | null = null
  if (availabilityPreview) {
    if (availabilityPreview.loading) {
      availabilityLabel = 'Loading...'
    } else if (availabilityPreview.error) {
      availabilityLabel = null
    } else if (availabilityPreview.hasToday || availabilityPreview.availableToday) {
      availabilityLabel = 'Available today'
    } else if (availabilityPreview.hasTomorrow || availabilityPreview.availableTomorrow) {
      availabilityLabel = 'Available tomorrow'
    } else if (availabilityPreview.nextAvailableDate) {
      availabilityLabel = `Next: ${formatShortDate(availabilityPreview.nextAvailableDate)}`
    } else if (availabilityPreview.availableWeekdays && availabilityPreview.availableWeekdays.length > 0) {
      availabilityLabel = availabilityPreview.availableWeekdays.join(', ')
    }
  }

  return (
    <Link
      href={`/activities/${tour.code}`}
      className={cn(
        'flex flex-row items-center gap-6 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden',
        'border border-glass-200 min-h-[200px]'
      )}
    >
      {/* Left: Image */}
      {tour.image && (
        <div className="w-[360px] h-[200px] flex-shrink-0 overflow-hidden rounded-l-xl">
          <img
            src={buildAtlanticoImageUrl(tour.image)}
            alt={tour.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Middle: Title + Description + Meta + Availability */}
      <div className="flex-[1.2] flex flex-col justify-between py-6 px-6 min-w-0">
        {/* Title */}
        <div className="mb-2">
          <h3 className="text-lg font-semibold text-ocean-600 line-clamp-2 leading-tight">
            {tour.name}
          </h3>
        </div>

        {/* Description */}
        {tour.desc && (
          <p className="text-sm text-glass-600 line-clamp-2 mb-3">
            {tour.desc}
          </p>
        )}

        {/* Meta Row: Icons for group size, collection service, duration */}
        <div className="flex items-center gap-4 text-xs text-glass-500 mb-2">
          {/* Group Size Icon (placeholder) */}
          <div className="flex items-center gap-1">
            <span>👥</span>
            <span>Small group</span>
          </div>

          {/* Collection Service Icon (placeholder) */}
          <div className="flex items-center gap-1">
            <span>🚌</span>
            <span>Collection</span>
          </div>

          {/* Duration */}
          {tour.duration && (
            <div className="flex items-center gap-1">
              <span>⏱</span>
              <span>{parseDuration(tour.duration)}</span>
            </div>
          )}
        </div>

        {/* Availability Strip: Weekdays */}
        <div className="flex items-center gap-1 text-xs mt-4 pt-3 border-t border-glass-200">
          {WEEKDAYS.map((day, index) => {
            const isActive = activeWeekdays.has(index)
            return (
              <span
                key={day}
                className={cn(
                  'px-1.5 py-0.5 rounded',
                  isActive
                    ? 'font-bold text-ocean-600 bg-ocean-50'
                    : 'text-glass-400'
                )}
              >
                {day}
              </span>
            )
          })}
          {availabilityLabel && (
            <span className="ml-2 text-glass-600">{availabilityLabel}</span>
          )}
        </div>
      </div>

      {/* Right: Classification + Price + Rating */}
      <div className="w-52 flex-shrink-0 flex flex-col items-end justify-between py-6 px-6 border-l border-glass-200 space-y-3">
        {/* Classification Label */}
        {tour.classificationName && (
          <div className="text-xs font-medium text-ocean-600">
            {tour.classificationName}
          </div>
        )}

        {/* Price Block */}
        {tour.price !== undefined && (
          <div className="text-right">
            <div className="text-xs text-glass-500 mb-1">from:</div>
            <div className="text-2xl font-bold text-glass-900">
              {tour.price.toFixed(2)}€
            </div>
          </div>
        )}

        {/* Rating */}
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1 text-sm text-glass-600 mb-1">
            <span className="text-yellow-500">★★★★☆</span>
          </div>
          <div className="text-xs text-glass-500">(0 reviews)</div>
        </div>
      </div>
    </Link>
  )
}

