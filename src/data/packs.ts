/**
 * Activity Pack Data Structure
 * 
 * Activity Packs are curated collections of activities that can be purchased together
 * or presented as recommended bundles. This is temporary demo data until API integration.
 */

export interface ActivityPack {
  id: string
  title: string
  category: string
  activities: string[] // Activity slugs
  duration: string
  badge?: string // Optional badge text (e.g., "Popular", "New", "Best Value")
  image: string // Placeholder image path
  isFeatured: boolean
}

/**
 * Demo Activity Packs
 * 
 * These packs showcase different types of experiences available in Tenerife.
 * Activities are referenced by their slugs from the activities mock data.
 */
export const activityPacks: ActivityPack[] = [
  {
    id: 'pack-1',
    title: 'Best of Tenerife',
    category: 'Popular',
    activities: [
      'mount-teide-cable-car',
      'siam-park-water-park',
      'whale-dolphin-watching-cruise',
      'loro-parque-theme-park',
      'stargazing-teide-observatory',
      'full-island-bus-excursion',
    ],
    duration: '5-7 days',
    badge: 'Most Popular',
    image: '/images/packs/best-of-tenerife.jpg',
    isFeatured: true,
  },
  {
    id: 'pack-2',
    title: 'Adventure Pack',
    category: 'Adventure',
    activities: [
      'paragliding-flight',
      'jet-ski-adventure',
      'masca-valley-hiking',
      'kayaking-snorkeling-tour',
      'scuba-diving-experience',
      'car-rental-explore',
    ],
    duration: '3-5 days',
    badge: 'High Energy',
    image: '/images/packs/adventure-pack.jpg',
    isFeatured: true,
  },
  {
    id: 'pack-3',
    title: 'Family Pack',
    category: 'Family',
    activities: [
      'siam-park-water-park',
      'loro-parque-theme-park',
      'whale-dolphin-watching-cruise',
      'full-island-bus-excursion',
      'canarian-food-tasting',
      'stargazing-teide-observatory',
    ],
    duration: '4-6 days',
    badge: 'Family Favorite',
    image: '/images/packs/family-pack.jpg',
    isFeatured: true,
  },
  {
    id: 'pack-4',
    title: 'VIP Experience',
    category: 'Luxury',
    activities: [
      'vip-private-island-tour',
      'sunset-dinner-show',
      'wine-tasting-tacoronte',
      'car-rental-explore',
      'stargazing-teide-observatory',
      'canarian-food-tasting',
    ],
    duration: '2-4 days',
    badge: 'Premium',
    image: '/images/packs/vip-experience.jpg',
    isFeatured: true,
  },
  {
    id: 'pack-5',
    title: 'Nature & Sea',
    category: 'Nature',
    activities: [
      'mount-teide-cable-car',
      'stargazing-teide-observatory',
      'whale-dolphin-watching-cruise',
      'masca-valley-hiking',
      'kayaking-snorkeling-tour',
      'full-island-bus-excursion',
    ],
    duration: '4-5 days',
    badge: 'Eco-Friendly',
    image: '/images/packs/nature-sea.jpg',
    isFeatured: false,
  },
  {
    id: 'pack-6',
    title: 'Active Holidays',
    category: 'Sports',
    activities: [
      'masca-valley-hiking',
      'bike-rental-coastal',
      'kayaking-snorkeling-tour',
      'scuba-diving-experience',
      'jet-ski-adventure',
      'paragliding-flight',
    ],
    duration: '5-7 days',
    badge: 'Active',
    image: '/images/packs/active-holidays.jpg',
    isFeatured: false,
  },
]

/**
 * Get all activity packs
 */
export function getAllPacks(): ActivityPack[] {
  return activityPacks
}

/**
 * Get featured activity packs
 */
export function getFeaturedPacks(): ActivityPack[] {
  return activityPacks.filter((pack) => pack.isFeatured)
}

/**
 * Get pack by ID
 */
export function getPackById(id: string): ActivityPack | undefined {
  return activityPacks.find((pack) => pack.id === id)
}

/**
 * Get packs by category
 */
export function getPacksByCategory(category: string): ActivityPack[] {
  return activityPacks.filter((pack) => pack.category === category)
}

