/**
 * Recommendation mapping for /inspired page
 * 
 * Simple, deterministic rules mapping user selections (mood/time/group) to vibes and experiences.
 * This is a placeholder for future ranking/ML logic - easy to replace.
 * 
 * Structure: mood + time + group → vibe slugs → experiences via repository
 */

export type Mood = 'relax' | 'adventure' | 'romantic' | 'family' | 'culture' | 'ocean'
export type TimeAvailable = '2-3hours' | 'halfday' | 'fullday' | 'evening' | 'multiday'
export type GroupType = 'couple' | 'family' | 'friends' | 'solo' | 'seniors'

/**
 * Mood to Vibe mapping
 * Each mood maps to 1-3 vibe slugs (in priority order)
 */
const MOOD_TO_VIBES: Record<Mood, string[]> = {
  relax: ['vip-tours', 'cable-car-observatory', 'boat-trips-cruises'],
  adventure: ['adventure-nature', 'water-sports', 'diving-fishing'],
  romantic: ['vip-tours', 'boat-trips-cruises', 'shows-entertainment'],
  family: ['theme-parks', 'tickets-attractions', 'bus-excursions'],
  culture: ['tickets-attractions', 'bus-excursions', 'gastronomy-tastings'],
  ocean: ['boat-trips-cruises', 'water-sports', 'diving-fishing'],
}

/**
 * Time to Vibe mapping
 * Filters vibes based on typical duration
 */
const TIME_TO_VIBES: Record<TimeAvailable, string[]> = {
  '2-3hours': ['tickets-attractions', 'cable-car-observatory', 'gastronomy-tastings'],
  halfday: ['vip-tours', 'bus-excursions', 'water-sports'],
  fullday: ['theme-parks', 'boat-trips-cruises', 'adventure-nature'],
  evening: ['shows-entertainment', 'gastronomy-tastings'],
  multiday: ['car-rental', 'bike-rental'],
}

/**
 * Group to Vibe mapping
 * Adjusts recommendations based on group type
 */
const GROUP_TO_VIBES: Record<GroupType, string[]> = {
  couple: ['vip-tours', 'boat-trips-cruises', 'shows-entertainment', 'gastronomy-tastings'],
  family: ['theme-parks', 'tickets-attractions', 'bus-excursions', 'water-sports'],
  friends: ['adventure-nature', 'water-sports', 'boat-trips-cruises', 'shows-entertainment'],
  solo: ['tickets-attractions', 'bus-excursions', 'cable-car-observatory', 'gastronomy-tastings'],
  seniors: ['bus-excursions', 'vip-tours', 'tickets-attractions', 'shows-entertainment'],
}

/**
 * Get recommended vibe slugs based on user selections
 * 
 * Logic: Intersect mood + time + group vibes, return top matches
 * If no selections, return empty array
 */
export function getRecommendedVibes(
  mood: Mood | null,
  time: TimeAvailable | null,
  group: GroupType | null
): string[] {
  if (!mood && !time && !group) {
    return []
  }

  const vibeSets: string[][] = []

  if (mood) {
    vibeSets.push(MOOD_TO_VIBES[mood])
  }
  if (time) {
    vibeSets.push(TIME_TO_VIBES[time])
  }
  if (group) {
    vibeSets.push(GROUP_TO_VIBES[group])
  }

  // If only one selection, return those vibes
  if (vibeSets.length === 1) {
    return vibeSets[0].slice(0, 6)
  }

  // Find intersection (vibes that appear in all selected sets)
  const intersection = vibeSets.reduce((acc, current) => {
    return acc.filter((vibe) => current.includes(vibe))
  })

  // If intersection is empty, return union of all (fallback)
  if (intersection.length === 0) {
    const union = new Set<string>()
    vibeSets.forEach((set) => set.forEach((vibe) => union.add(vibe)))
    return Array.from(union).slice(0, 6)
  }

  return intersection.slice(0, 6)
}

