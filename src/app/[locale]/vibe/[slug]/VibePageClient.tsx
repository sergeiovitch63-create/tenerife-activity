'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter, usePathname } from '@/navigation'
import { useTranslations } from 'next-intl'
import { Section, Container } from '@/ui/components/layout'
import { Chip } from '@/ui/components/shared'
import { ExperienceCard } from '@/ui/components/experience'
import {
  type ExperienceFilters,
  type SortOption,
  applyExperienceFilters,
  sortExperiences,
} from '@/lib/filters/experience-filters'
import { trackingProvider } from '@/config/tracking'
import type { Experience } from '@/core/entities/experience'
import { cn } from '@/ui/lib/cn'

interface VibePageClientProps {
  experiences: Experience[]
  showFilters?: boolean
}

/**
 * Parse URL search params into filter state
 */
function parseFiltersFromURL(searchParams: { get: (key: string) => string | null }): ExperienceFilters {
  return {
    price: (searchParams.get('price') as ExperienceFilters['price']) || 'all',
    duration:
      (searchParams.get('duration') as ExperienceFilters['duration']) || 'all',
    rating: (searchParams.get('rating') as ExperienceFilters['rating']) || 'all',
  }
}

function parseSortFromURL(searchParams: { get: (key: string) => string | null }): SortOption {
  return (searchParams.get('sort') as SortOption) || 'recommended'
}

/**
 * Update URL with current filter/sort state
 */
function updateURL(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  filters: ExperienceFilters,
  sort: SortOption
) {
  const params = new URLSearchParams()

  // Add filters/sort if not default
  if (filters.price !== 'all') params.set('price', filters.price)
  if (filters.duration !== 'all') params.set('duration', filters.duration)
  if (filters.rating !== 'all') params.set('rating', filters.rating)
  if (sort !== 'recommended') params.set('sort', sort)

  const queryString = params.toString()
  const newUrl = queryString ? `${pathname}?${queryString}` : pathname

  router.replace(newUrl, { scroll: false })
}

function VibePageClientContent({ experiences, showFilters = true }: VibePageClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const t = useTranslations('search')

  // Initialize state from URL
  const [filters, setFilters] = useState<ExperienceFilters>(() =>
    parseFiltersFromURL(searchParams)
  )
  const [sort, setSort] = useState<SortOption>(() => parseSortFromURL(searchParams))
  const [isInitialMount, setIsInitialMount] = useState(true)

  // Sync state with URL changes (back/forward navigation)
  useEffect(() => {
    setFilters(parseFiltersFromURL(searchParams))
    setSort(parseSortFromURL(searchParams))
  }, [searchParams])

  // Mark initial mount as complete after first render
  useEffect(() => {
    setIsInitialMount(false)
  }, [])

  // Apply filters and sorting
  const filteredAndSorted = useMemo(() => {
    const filtered = applyExperienceFilters(experiences, filters)
    return sortExperiences(filtered, sort)
  }, [experiences, filters, sort])

  // Update URL when filters/sort change (but not on initial mount)
  useEffect(() => {
    if (isInitialMount) return
    updateURL(router, pathname, filters, sort)
  }, [filters, sort, router, pathname, isInitialMount])

  const handleFilterChange = (
    type: keyof ExperienceFilters,
    value: ExperienceFilters[typeof type]
  ) => {
    const newFilters = { ...filters, [type]: value }
    setFilters(newFilters)

    if (!isInitialMount) {
      trackingProvider.track({
        type: 'filter_changed',
        filterType: type,
        value,
      })
    }
  }

  const handleSortChange = (newSort: SortOption) => {
    setSort(newSort)

    if (!isInitialMount) {
      trackingProvider.track({
        type: 'sort_changed',
        value: newSort,
      })
    }
  }

  const handleReset = () => {
    setFilters({ price: 'all', duration: 'all', rating: 'all' })
    setSort('recommended')
    router.replace(pathname, { scroll: false })

    if (!isInitialMount) {
      trackingProvider.track({ type: 'filters_reset' })
    }
  }

  const hasActiveFilters =
    filters.price !== 'all' ||
    filters.duration !== 'all' ||
    filters.rating !== 'all' ||
    sort !== 'recommended'

  return (
    <>
      {/* Filters Section - Only show if showFilters is true */}
      {showFilters && (
        <Section variant="tight" background="default">
          <Container size="lg">
            <div className="glass-panel p-6 md:p-8">
              <div className="space-y-4">
                {/* Filter Chips */}
                <div className="flex flex-wrap gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
                  {/* Price Filters */}
                  <Chip
                    active={filters.price === 'all'}
                    onClick={() => handleFilterChange('price', 'all')}
                  >
                    {t('search.filters.allPrices')}
                  </Chip>
                  <Chip
                    active={filters.price === 'under_50'}
                    onClick={() => handleFilterChange('price', 'under_50')}
                  >
                    {t('search.filters.under50')}
                  </Chip>
                  <Chip
                    active={filters.price === 'between_50_100'}
                    onClick={() => handleFilterChange('price', 'between_50_100')}
                  >
                    {t('search.filters.between50_100')}
                  </Chip>
                  <Chip
                    active={filters.price === 'over_100'}
                    onClick={() => handleFilterChange('price', 'over_100')}
                  >
                    {t('search.filters.over100')}
                  </Chip>

                  {/* Duration Filters */}
                  <Chip
                    active={filters.duration === 'short'}
                    onClick={() => handleFilterChange('duration', 'short')}
                  >
                    {t('search.filters.short')}
                  </Chip>
                  <Chip
                    active={filters.duration === 'half_day'}
                    onClick={() => handleFilterChange('duration', 'half_day')}
                  >
                    {t('search.filters.halfDay')}
                  </Chip>
                  <Chip
                    active={filters.duration === 'full_day'}
                    onClick={() => handleFilterChange('duration', 'full_day')}
                  >
                    {t('search.filters.fullDay')}
                  </Chip>
                  <Chip
                    active={filters.duration === 'multi_day'}
                    onClick={() => handleFilterChange('duration', 'multi_day')}
                  >
                    {t('search.filters.multiDay')}
                  </Chip>

                  {/* Rating Filters */}
                  <Chip
                    active={filters.rating === 'four_plus'}
                    onClick={() => handleFilterChange('rating', 'four_plus')}
                  >
                    {t('search.filters.fourPlus')}
                  </Chip>
                  <Chip
                    active={filters.rating === 'top_rated'}
                    onClick={() => handleFilterChange('rating', 'top_rated')}
                  >
                    {t('search.filters.topRated')}
                  </Chip>
                </div>

                {/* Sort & Reset Row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Sort Dropdown */}
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="sort-select"
                      className="text-sm font-medium text-glass-700"
                    >
                      {t('search.sortBy')}
                    </label>
                    <select
                      id="sort-select"
                      value={sort}
                      onChange={(e) => handleSortChange(e.target.value as SortOption)}
                      className={cn(
                        'px-4 py-2 text-sm border border-glass-300 rounded',
                        'bg-white text-glass-900',
                        'focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500',
                        'hover:border-glass-400 transition-colors'
                      )}
                    >
                      <option value="recommended">{t('search.sort.recommended')}</option>
                      <option value="price_low">{t('search.sort.priceLow')}</option>
                      <option value="price_high">{t('search.sort.priceHigh')}</option>
                      <option value="rating">{t('search.sort.rating')}</option>
                      <option value="popularity">{t('search.sort.popularity')}</option>
                    </select>
                  </div>

                  {/* Reset Button */}
                  {hasActiveFilters && (
                    <button
                      onClick={handleReset}
                      className="text-sm text-ocean-600 hover:text-ocean-700 font-medium transition-colors underline underline-offset-2"
                    >
                      {t('search.resetFilters')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Container>
        </Section>
      )}

      {/* Experiences Listing */}
      <Section variant="default" background="default">
        <Container size="lg">
          {filteredAndSorted.length > 0 ? (
            <div className="space-y-6">
              {/* Results Count */}
              <p className="text-base text-glass-600">
                {filteredAndSorted.length} experience
                {filteredAndSorted.length !== 1 ? 's' : ''} found
              </p>

              {/* Results List */}
              <div className="space-y-6">
                {filteredAndSorted.map((experience) => (
                  <ExperienceCard
                    key={experience.id}
                    experience={experience}
                    variant="list"
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="glass-panel p-6 md:p-8 text-center py-16 space-y-6">
              <h2 className="text-2xl font-semibold text-glass-900">
                {t('vibe.noExperiences')}
              </h2>
              <p className="text-lg text-glass-600 max-w-md mx-auto">
                {t('vibe.noExperiencesDesc')}
              </p>

              {hasActiveFilters && (
                <button
                  onClick={handleReset}
                  className="text-sm text-ocean-600 hover:text-ocean-700 font-medium transition-colors underline underline-offset-2 mt-4"
                >
                  {t('search.resetFilters')}
                </button>
              )}
            </div>
          )}
        </Container>
      </Section>
    </>
  )
}

export function VibePageClient(props: VibePageClientProps) {
  return (
    <Suspense fallback={null}>
      <VibePageClientContent {...props} />
    </Suspense>
  )
}

