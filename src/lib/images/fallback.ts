/**
 * Fallback image utilities
 * 
 * Provides deterministic fallback images when API doesn't provide one
 */

/**
 * List of available placeholder images
 * These should exist in /public/placeholders/
 */
const PLACEHOLDER_IMAGES = [
  'hiking.jpg',
  'ocean.jpg',
  'boat.jpg',
  'city.jpg',
  'jeep.jpg',
  'karting.jpg',
  'spa.jpg',
  'nightlife.jpg',
  'beach.jpg',
  'mountain.jpg',
  'adventure.jpg',
  'culture.jpg',
  'food.jpg',
  'sunset.jpg',
  'wildlife.jpg',
] as const

/**
 * Vibe-based image mapping
 * Maps vibe IDs or keywords to specific placeholder images
 */
const VIBE_TO_IMAGE: Record<string, string> = {
  // Hiking/Adventure
  hiking: 'hiking.jpg',
  trekking: 'hiking.jpg',
  adventure: 'adventure.jpg',
  mountain: 'mountain.jpg',
  
  // Water activities
  ocean: 'ocean.jpg',
  boat: 'boat.jpg',
  sailing: 'boat.jpg',
  beach: 'beach.jpg',
  swimming: 'ocean.jpg',
  
  // City/Urban
  city: 'city.jpg',
  urban: 'city.jpg',
  culture: 'culture.jpg',
  
  // Vehicles
  jeep: 'jeep.jpg',
  karting: 'karting.jpg',
  safari: 'jeep.jpg',
  
  // Relaxation
  spa: 'spa.jpg',
  wellness: 'spa.jpg',
  relaxation: 'spa.jpg',
  
  // Nightlife
  nightlife: 'nightlife.jpg',
  party: 'nightlife.jpg',
  food: 'food.jpg',
  restaurant: 'food.jpg',
  
  // Nature
  wildlife: 'wildlife.jpg',
  nature: 'wildlife.jpg',
  sunset: 'sunset.jpg',
}

/**
 * Simple hash function for deterministic selection
 * Returns a number between 0 and max-1
 */
function simpleHash(str: string, max: number): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash) % max
}

/**
 * Get fallback image path for a tour/activity
 * 
 * @param tour - Tour/activity object with vibeId, groupCode, slug, etc.
 * @returns Path to placeholder image (e.g., "/placeholders/hiking.jpg")
 */
export function getFallbackImageForTour(tour: any): string {
  // Try vibe-based selection first
  if (tour.vibeId && typeof tour.vibeId === 'string') {
    const vibeLower = tour.vibeId.toLowerCase()
    const mappedImage = VIBE_TO_IMAGE[vibeLower]
    if (mappedImage) {
      return `/placeholders/${mappedImage}`
    }
  }

  // Try title/name keywords
  const title = (tour.title || tour.name || '').toLowerCase()
  for (const [keyword, image] of Object.entries(VIBE_TO_IMAGE)) {
    if (title.includes(keyword)) {
      return `/placeholders/${image}`
    }
  }

  // Try description keywords
  const description = (tour.description || tour.shortDescription || '').toLowerCase()
  for (const [keyword, image] of Object.entries(VIBE_TO_IMAGE)) {
    if (description.includes(keyword)) {
      return `/placeholders/${image}`
    }
  }

  // Deterministic selection based on groupCode or slug
  const identifier = tour.groupCode || tour.code || tour.slug || tour.id || 'default'
  const index = simpleHash(String(identifier), PLACEHOLDER_IMAGES.length)
  const selectedImage = PLACEHOLDER_IMAGES[index]

  return `/placeholders/${selectedImage}`
}

/**
 * Get all available placeholder images
 * Useful for preloading or validation
 */
export function getAllPlaceholderImages(): readonly string[] {
  return PLACEHOLDER_IMAGES
}

























