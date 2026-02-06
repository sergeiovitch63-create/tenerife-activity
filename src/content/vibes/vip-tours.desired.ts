/**
 * Desired VIP Tours list - Source of truth
 * 
 * This file defines the 8 VIP tours that should ALWAYS be displayed on /en/vibe/vip-tours,
 * even if they are not yet connected to the API.
 * 
 * When a tour is found in the API, it will be displayed with real data.
 * When a tour is NOT found in the API, it will be displayed as a skeleton/placeholder card.
 */

export interface DesiredVipTour {
  slug: string
  title: string
  shortDescription?: string // Optional placeholder description
}

export const VIP_TOURS_DESIRED: DesiredVipTour[] = [
  {
    slug: 'masca-teide-vip',
    title: 'Masca + Teide VIP',
    shortDescription: 'Discover the stunning Masca Valley and the majestic Mount Teide in a private VIP experience.',
  },
  {
    slug: 'la-laguna-anaga-vip',
    title: 'La Laguna + Anaga VIP',
    shortDescription: 'Explore the historic city of San Cristóbal de La Laguna and the ancient Anaga Rural Park in this exclusive VIP tour.',
  },
  {
    slug: 'vuelta-a-la-isla-vip',
    title: 'Vuelta a La Isla VIP',
    shortDescription: 'Experience the complete island of Tenerife in this comprehensive VIP tour.',
  },
  {
    slug: 'tenerife-vip-tour',
    title: 'Tenerife VIP Tour',
    shortDescription: 'Discover the best of Tenerife in this exclusive VIP tour.',
  },
  {
    slug: 'teide-vip-tour',
    title: 'Teide VIP Tour',
    shortDescription: 'Explore the majestic Mount Teide, Spain\'s highest peak, in this exclusive VIP experience.',
  },
  {
    slug: 'vip-ascent-to-the-peak-on-foot',
    title: 'VIP Ascent to the Peak on foot',
    shortDescription: 'Challenge yourself with a guided VIP ascent to the peak of Mount Teide on foot.',
  },
  {
    slug: 'teide-tour-vip',
    title: 'Teide Tour VIP',
    shortDescription: 'Discover the wonders of Mount Teide in this exclusive VIP tour.',
  },
  {
    slug: 'masca-vip-tour',
    title: 'Masca VIP Tour',
    shortDescription: 'Explore the dramatic Masca Valley, one of Tenerife\'s most spectacular natural wonders, in this exclusive VIP experience.',
  },
]

/**
 * Get desired VIP tour by slug
 */
export function getDesiredVipTourBySlug(slug: string): DesiredVipTour | null {
  return VIP_TOURS_DESIRED.find(item => item.slug === slug) || null
}

/**
 * Get all desired VIP tour slugs
 */
export function getAllDesiredVipTourSlugs(): string[] {
  return VIP_TOURS_DESIRED.map(item => item.slug)
}












