'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/ui/lib/cn'

type AvailabilityFilter = 'all' | 'today' | 'tomorrow' | 'dates'
type DurationFilter = 'all' | '0-3h' | '3-5h' | '5-7h' | '7h+'

interface VibeTopFiltersBarProps {
  availability: AvailabilityFilter
  duration: DurationFilter
  priceMin: number
  priceMax: number
  priceRange: { min: number; max: number }
  classificationName: string
  onAvailabilityChange: (value: AvailabilityFilter) => void
  onDurationChange: (value: DurationFilter) => void
  onPriceChange: (min: number, max: number) => void
}

function FilterPopover({
  isOpen,
  onClose,
  children,
  triggerRef,
}: {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  triggerRef: React.RefObject<HTMLButtonElement>
}) {
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose, triggerRef])

  if (!isOpen) return null

  return (
    <div
      ref={popoverRef}
      className="absolute top-full left-0 mt-2 z-50 bg-white rounded-lg shadow-lg border border-glass-200 p-4 min-w-[200px]"
    >
      {children}
    </div>
  )
}

export function VibeTopFiltersBar({
  availability,
  duration,
  priceMin,
  priceMax,
  priceRange,
  classificationName,
  onAvailabilityChange,
  onDurationChange,
  onPriceChange,
}: VibeTopFiltersBarProps) {
  const [openFilter, setOpenFilter] = useState<string | null>(null)
  const availabilityRef = useRef<HTMLButtonElement>(null)
  const durationRef = useRef<HTMLButtonElement>(null)
  const priceRef = useRef<HTMLButtonElement>(null)

  const getAvailabilityLabel = () => {
    switch (availability) {
      case 'today':
        return 'Today'
      case 'tomorrow':
        return 'Tomorrow'
      case 'dates':
        return 'Select Dates'
      default:
        return 'Availability'
    }
  }

  const getDurationLabel = () => {
    switch (duration) {
      case '0-3h':
        return '0-3 hours'
      case '3-5h':
        return '3-5 hours'
      case '5-7h':
        return '5-7 hours'
      case '7h+':
        return 'All day (7h+)'
      default:
        return 'Duration'
    }
  }

  const getPriceLabel = () => {
    if (priceMin === priceRange.min && priceMax === priceRange.max) {
      return 'Price'
    }
    return `€${priceMin} - €${priceMax}`
  }

  const hasActiveFilters = availability !== 'all' || duration !== 'all' || priceMin !== priceRange.min || priceMax !== priceRange.max

  return (
    <div className="sticky top-0 z-40 bg-white border-b border-glass-200 py-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {/* Dates / Availability Filter */}
        <div className="relative">
          <button
            ref={availabilityRef}
            onClick={() => setOpenFilter(openFilter === 'availability' ? null : 'availability')}
            className={cn(
              'px-4 py-2 rounded-full border transition-all text-sm font-medium',
              availability !== 'all'
                ? 'bg-ocean-50 border-ocean-600 text-ocean-900'
                : 'bg-white border-glass-300 text-glass-700 hover:border-ocean-300 hover:bg-glass-50'
            )}
          >
            {getAvailabilityLabel()}
            {availability !== 'all' && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-ocean-600 text-white text-xs">
                1
              </span>
            )}
          </button>
          <FilterPopover
            isOpen={openFilter === 'availability'}
            onClose={() => setOpenFilter(null)}
            triggerRef={availabilityRef}
          >
            <div className="space-y-2">
              <button
                onClick={() => {
                  onAvailabilityChange('all')
                  setOpenFilter(null)
                }}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg border transition-colors text-sm',
                  availability === 'all'
                    ? 'bg-ocean-50 border-ocean-600 text-ocean-900'
                    : 'bg-glass-50 border-glass-200 hover:border-ocean-300 text-glass-900'
                )}
              >
                All
              </button>
              <button
                onClick={() => {
                  onAvailabilityChange('today')
                  setOpenFilter(null)
                }}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg border transition-colors text-sm',
                  availability === 'today'
                    ? 'bg-ocean-50 border-ocean-600 text-ocean-900'
                    : 'bg-glass-50 border-glass-200 hover:border-ocean-300 text-glass-900'
                )}
              >
                Today
              </button>
              <button
                onClick={() => {
                  onAvailabilityChange('tomorrow')
                  setOpenFilter(null)
                }}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg border transition-colors text-sm',
                  availability === 'tomorrow'
                    ? 'bg-ocean-50 border-ocean-600 text-ocean-900'
                    : 'bg-glass-50 border-glass-200 hover:border-ocean-300 text-glass-900'
                )}
              >
                Tomorrow
              </button>
              <button
                onClick={() => {
                  onAvailabilityChange('dates')
                  setOpenFilter(null)
                }}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg border transition-colors text-sm',
                  availability === 'dates'
                    ? 'bg-ocean-50 border-ocean-600 text-ocean-900'
                    : 'bg-glass-50 border-glass-200 hover:border-ocean-300 text-glass-900'
                )}
              >
                Select Dates
              </button>
            </div>
          </FilterPopover>
        </div>

        {/* Duration Filter */}
        <div className="relative">
          <button
            ref={durationRef}
            onClick={() => setOpenFilter(openFilter === 'duration' ? null : 'duration')}
            className={cn(
              'px-4 py-2 rounded-full border transition-all text-sm font-medium',
              duration !== 'all'
                ? 'bg-ocean-50 border-ocean-600 text-ocean-900'
                : 'bg-white border-glass-300 text-glass-700 hover:border-ocean-300 hover:bg-glass-50'
            )}
          >
            {getDurationLabel()}
            {duration !== 'all' && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-ocean-600 text-white text-xs">
                1
              </span>
            )}
          </button>
          <FilterPopover
            isOpen={openFilter === 'duration'}
            onClose={() => setOpenFilter(null)}
            triggerRef={durationRef}
          >
            <div className="space-y-2">
              {(['all', '0-3h', '3-5h', '5-7h', '7h+'] as DurationFilter[]).map((dur) => (
                <button
                  key={dur}
                  onClick={() => {
                    onDurationChange(dur)
                    setOpenFilter(null)
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg border transition-colors text-sm',
                    duration === dur
                      ? 'bg-ocean-50 border-ocean-600 text-ocean-900'
                      : 'bg-glass-50 border-glass-200 hover:border-ocean-300 text-glass-900'
                  )}
                >
                  {dur === 'all' ? 'All' : dur === '0-3h' ? '0-3 hours' : dur === '3-5h' ? '3-5 hours' : dur === '5-7h' ? '5-7 hours' : 'All day (7h+)'}
                </button>
              ))}
            </div>
          </FilterPopover>
        </div>

        {/* Price Filter */}
        <div className="relative">
          <button
            ref={priceRef}
            onClick={() => setOpenFilter(openFilter === 'price' ? null : 'price')}
            className={cn(
              'px-4 py-2 rounded-full border transition-all text-sm font-medium',
              priceMin !== priceRange.min || priceMax !== priceRange.max
                ? 'bg-ocean-50 border-ocean-600 text-ocean-900'
                : 'bg-white border-glass-300 text-glass-700 hover:border-ocean-300 hover:bg-glass-50'
            )}
          >
            {getPriceLabel()}
            {(priceMin !== priceRange.min || priceMax !== priceRange.max) && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-ocean-600 text-white text-xs">
                1
              </span>
            )}
          </button>
          <FilterPopover
            isOpen={openFilter === 'price'}
            onClose={() => setOpenFilter(null)}
            triggerRef={priceRef}
          >
            <div className="space-y-4 min-w-[280px]">
              <div>
                <div className="text-sm font-semibold text-glass-700 mb-3">
                  Price: €{priceMin} - €{priceMax}
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-glass-600 mb-1">Min: €{priceMin}</label>
                    <input
                      type="range"
                      min={priceRange.min}
                      max={priceRange.max}
                      value={priceMin}
                      onChange={(e) => {
                        const newMin = parseInt(e.target.value)
                        onPriceChange(Math.min(newMin, priceMax), priceMax)
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-glass-600 mb-1">Max: €{priceMax}</label>
                    <input
                      type="range"
                      min={priceRange.min}
                      max={priceRange.max}
                      value={priceMax}
                      onChange={(e) => {
                        const newMax = parseInt(e.target.value)
                        onPriceChange(priceMin, Math.max(newMax, priceMin))
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </FilterPopover>
        </div>

        {/* Category Chip (non-editable) */}
        <div className="px-4 py-2 rounded-full bg-ocean-50 border border-ocean-600 text-ocean-900 text-sm font-medium">
          {classificationName}
        </div>

        {/* Clear Filters (if any active) */}
        {hasActiveFilters && (
          <button
            onClick={() => {
              onAvailabilityChange('all')
              onDurationChange('all')
              onPriceChange(priceRange.min, priceRange.max)
            }}
            className="px-4 py-2 rounded-full border border-glass-300 text-glass-700 hover:border-ocean-300 hover:bg-glass-50 text-sm font-medium transition-all"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  )
}

