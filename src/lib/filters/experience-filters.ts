import type { Experience } from '@/core/entities/experience'

/**
 * Filter and sort types for experience listings
 */

export type PriceFilter = 'all' | 'under_50' | 'between_50_100' | 'over_100'
export type DurationFilter = 'all' | 'short' | 'half_day' | 'full_day' | 'multi_day'
export type RatingFilter = 'all' | 'four_plus' | 'top_rated'
export type SortOption = 'recommended' | 'price_low' | 'price_high' | 'rating' | 'popularity'

export interface ExperienceFilters {
  price: PriceFilter
  duration: DurationFilter
  rating: RatingFilter
}

/**
 * Parse duration string to approximate minutes
 * Assumptions:
 * - "2-3 hours" or "2 hours" → 150 minutes (average)
 * - "Half day" → 240 minutes (4 hours)
 * - "Full day" → 480 minutes (8 hours)
 * - "Multi day" → 1440+ minutes (24+ hours)
 */
function parseDurationToMinutes(duration?: string): number {
  if (!duration) return 0

  const lower = duration.toLowerCase()

  if (lower.includes('multi') || lower.includes('day') && lower.includes('multi')) {
    return 1440 // 24 hours
  }
  if (lower.includes('full day') || lower.includes('full-day')) {
    return 480 // 8 hours
  }
  if (lower.includes('half day') || lower.includes('half-day')) {
    return 240 // 4 hours
  }

  // Try to extract hours from strings like "2-3 hours", "4 hours", "2h"
  const hourMatch = lower.match(/(\d+)\s*-?\s*(\d+)?\s*(?:hour|h)/)
  if (hourMatch) {
    const start = parseInt(hourMatch[1], 10)
    const end = hourMatch[2] ? parseInt(hourMatch[2], 10) : start
    return ((start + end) / 2) * 60 // Average hours to minutes
  }

  return 0
}

/**
 * Apply filters to experiences
 */
export function applyExperienceFilters(
  experiences: Experience[],
  filters: ExperienceFilters
): Experience[] {
  return experiences.filter((exp) => {
    // Price filter
    if (filters.price !== 'all') {
      if (filters.price === 'under_50' && exp.price >= 50) return false
      if (filters.price === 'between_50_100' && (exp.price < 50 || exp.price > 100))
        return false
      if (filters.price === 'over_100' && exp.price <= 100) return false
    }

    // Duration filter
    if (filters.duration !== 'all') {
      const minutes = exp.durationMinutes || parseDurationToMinutes(exp.duration)
      if (filters.duration === 'short' && minutes >= 240) return false // < 4 hours
      if (filters.duration === 'half_day' && (minutes < 180 || minutes >= 480))
        return false // 3-8 hours
      if (filters.duration === 'full_day' && (minutes < 480 || minutes >= 1440))
        return false // 8-24 hours
      if (filters.duration === 'multi_day' && minutes < 1440) return false // 24+ hours
    }

    // Rating filter
    if (filters.rating !== 'all') {
      if (!exp.rating) return false
      if (filters.rating === 'four_plus' && exp.rating < 4) return false
      if (filters.rating === 'top_rated' && exp.rating < 4.5) return false
    }

    return true
  })
}

/**
 * Sort experiences
 * 
 * "recommended" uses a simple heuristic: rating + log(reviewCount + 1)
 * This balances quality (rating) with popularity (reviewCount) in a deterministic way
 */
export function sortExperiences(
  experiences: Experience[],
  sort: SortOption
): Experience[] {
  const sorted = [...experiences]

  switch (sort) {
    case 'price_low':
      return sorted.sort((a, b) => a.price - b.price)

    case 'price_high':
      return sorted.sort((a, b) => b.price - a.price)

    case 'rating':
      return sorted.sort((a, b) => {
        const ratingA = a.rating || 0
        const ratingB = b.rating || 0
        if (ratingA !== ratingB) return ratingB - ratingA
        // Secondary sort by review count
        return (b.reviewCount || 0) - (a.reviewCount || 0)
      })

    case 'popularity':
      return sorted.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))

    case 'recommended':
    default:
      return sorted.sort((a, b) => {
        // Heuristic: rating + log(reviewCount + 1)
        const scoreA =
          (a.rating || 0) + Math.log((a.reviewCount || 0) + 1) / 10
        const scoreB =
          (b.rating || 0) + Math.log((b.reviewCount || 0) + 1) / 10
        return scoreB - scoreA
      })
  }
}







