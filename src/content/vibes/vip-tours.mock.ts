/**
 * Mock data for VIP Tours activities
 * 
 * Used for displaying 8 additional VIP activities until API integration is complete.
 * These activities will be replaced with real API data later.
 */

export interface VipTourMockData {
  slug: string
  title: string
  fromPrice: number
  shortDescription: string
  fullDescription: string
  bullets: {
    smallGroup: string | null // "Yes" or null
    pickup: string | null // "Yes" or null
    duration: string | null // e.g., "8 hrs", "Full day"
  }
  detailsBullets: string[] // Array of bullet points for "Details" section
  freeCancellationText: string
  prices: {
    adult: number
    child: number | null
    infant: number | null
  }
  image: string | null // Image URL or null for placeholder
  durationHours: number | null // Duration in hours for calculation
}

/**
 * Mock data for 8 additional VIP activities
 */
export const vipToursMockData: VipTourMockData[] = [
  {
    slug: 'masca-teide-vip',
    title: 'Masca + Teide VIP',
    fromPrice: 850,
    shortDescription: 'Discover the stunning Masca Valley and the majestic Mount Teide in a private VIP experience. Explore the most beautiful landscapes of Tenerife with a professional guide.',
    fullDescription: 'Discover the stunning Masca Valley and the majestic Mount Teide in a private VIP experience. Explore the most beautiful landscapes of Tenerife with a professional guide. This exclusive tour takes you through the dramatic Masca Gorge, one of the most spectacular natural wonders of the Canary Islands, followed by a visit to Mount Teide National Park. Enjoy personalized attention, comfortable transportation, and breathtaking views throughout your journey.',
    bullets: {
      smallGroup: 'Yes',
      pickup: 'Yes',
      duration: 'Full day',
    },
    detailsBullets: [
      'Private VIP experience',
      'Professional guide',
      'Transport from your hotel or nearby',
      'Visit to Masca Valley',
      'Mount Teide National Park access',
      'Civil liability insurance',
    ],
    freeCancellationText: 'Free cancellation up to 24 hours before the excursion. If you cancel within 24 hours of the excursion, there will not be a refund.',
    prices: {
      adult: 850,
      child: 650,
      infant: 0,
    },
    image: null,
    durationHours: 8,
  },
  {
    slug: 'la-laguna-anaga-vip',
    title: 'La Laguna + Anaga VIP',
    fromPrice: 720,
    shortDescription: 'Explore the historic city of San Cristóbal de La Laguna, a UNESCO World Heritage Site, and the ancient Anaga Rural Park in this exclusive VIP tour.',
    fullDescription: 'Explore the historic city of San Cristóbal de La Laguna, a UNESCO World Heritage Site, and the ancient Anaga Rural Park in this exclusive VIP tour. Discover the rich cultural heritage of Tenerife\'s former capital and immerse yourself in the pristine nature of Anaga, one of the oldest forests in Europe. This private experience offers personalized attention and comfortable transportation throughout your journey.',
    bullets: {
      smallGroup: 'Yes',
      pickup: 'Yes',
      duration: 'Full day',
    },
    detailsBullets: [
      'Private VIP experience',
      'Professional guide',
      'Transport from your hotel or nearby',
      'Visit to San Cristóbal de La Laguna',
      'Anaga Rural Park exploration',
      'Civil liability insurance',
    ],
    freeCancellationText: 'Free cancellation up to 24 hours before the excursion. If you cancel within 24 hours of the excursion, there will not be a refund.',
    prices: {
      adult: 720,
      child: 550,
      infant: 0,
    },
    image: null,
    durationHours: 8,
  },
  {
    slug: 'vuelta-a-la-isla-vip',
    title: 'Vuelta a La Isla VIP',
    fromPrice: 950,
    shortDescription: 'Experience the complete island of Tenerife in this comprehensive VIP tour. Visit the most important landmarks, natural wonders, and cultural sites in one unforgettable day.',
    fullDescription: 'Experience the complete island of Tenerife in this comprehensive VIP tour. Visit the most important landmarks, natural wonders, and cultural sites in one unforgettable day. From the volcanic landscapes of Teide to the charming coastal towns, from the lush forests of Anaga to the dramatic cliffs of Los Gigantes, discover the diverse beauty of Tenerife with personalized attention and expert guidance.',
    bullets: {
      smallGroup: 'Yes',
      pickup: 'Yes',
      duration: 'Full day',
    },
    detailsBullets: [
      'Private VIP experience',
      'Professional guide',
      'Transport from your hotel or nearby',
      'Complete island tour',
      'Multiple stops at key locations',
      'Civil liability insurance',
    ],
    freeCancellationText: 'Free cancellation up to 24 hours before the excursion. If you cancel within 24 hours of the excursion, there will not be a refund.',
    prices: {
      adult: 950,
      child: 750,
      infant: 0,
    },
    image: null,
    durationHours: 10,
  },
  {
    slug: 'tenerife-vip-tour',
    title: 'Tenerife VIP Tour',
    fromPrice: 880,
    shortDescription: 'Discover the best of Tenerife in this exclusive VIP tour. Visit iconic landmarks, natural wonders, and cultural sites with personalized attention and comfortable transportation.',
    fullDescription: 'Discover the best of Tenerife in this exclusive VIP tour. Visit iconic landmarks, natural wonders, and cultural sites with personalized attention and comfortable transportation. This comprehensive experience takes you to the island\'s most spectacular locations, from the volcanic peaks of Teide to the charming historic towns, ensuring you see the very best of Tenerife in style and comfort.',
    bullets: {
      smallGroup: 'Yes',
      pickup: 'Yes',
      duration: 'Full day',
    },
    detailsBullets: [
      'Private VIP experience',
      'Professional guide',
      'Transport from your hotel or nearby',
      'Visit to key landmarks',
      'Multiple scenic stops',
      'Civil liability insurance',
    ],
    freeCancellationText: 'Free cancellation up to 24 hours before the excursion. If you cancel within 24 hours of the excursion, there will not be a refund.',
    prices: {
      adult: 880,
      child: 680,
      infant: 0,
    },
    image: null,
    durationHours: 9,
  },
  {
    slug: 'teide-vip-tour',
    title: 'Teide VIP Tour',
    fromPrice: 780,
    shortDescription: 'Explore the majestic Mount Teide, Spain\'s highest peak, in this exclusive VIP experience. Enjoy personalized attention and comfortable transportation to the summit.',
    fullDescription: 'Explore the majestic Mount Teide, Spain\'s highest peak, in this exclusive VIP experience. Enjoy personalized attention and comfortable transportation to the summit. Discover the unique volcanic landscape of Teide National Park, a UNESCO World Heritage Site, and learn about the geological history of the Canary Islands from your expert guide.',
    bullets: {
      smallGroup: 'Yes',
      pickup: 'Yes',
      duration: '8 hrs',
    },
    detailsBullets: [
      'Private VIP experience',
      'Professional guide',
      'Transport from your hotel or nearby',
      'Mount Teide National Park access',
      'Cable car tickets (if applicable)',
      'Civil liability insurance',
    ],
    freeCancellationText: 'Free cancellation up to 24 hours before the excursion. If you cancel within 24 hours of the excursion, there will not be a refund.',
    prices: {
      adult: 780,
      child: 580,
      infant: 0,
    },
    image: null,
    durationHours: 8,
  },
  {
    slug: 'vip-ascent-to-the-peak-on-foot',
    title: 'VIP Ascent to the Peak on foot',
    fromPrice: 1200,
    shortDescription: 'Challenge yourself with a guided VIP ascent to the peak of Mount Teide on foot. This exclusive experience offers personalized attention and expert guidance for this demanding adventure.',
    fullDescription: 'Challenge yourself with a guided VIP ascent to the peak of Mount Teide on foot. This exclusive experience offers personalized attention and expert guidance for this demanding adventure. Climb to the summit of Spain\'s highest peak with a professional mountain guide, enjoying breathtaking views and a sense of achievement as you reach the top.',
    bullets: {
      smallGroup: 'Yes',
      pickup: 'Yes',
      duration: 'Full day',
    },
    detailsBullets: [
      'Private VIP experience',
      'Professional mountain guide',
      'Transport from your hotel or nearby',
      'Mount Teide summit ascent',
      'Safety equipment',
      'Civil liability insurance',
    ],
    freeCancellationText: 'Free cancellation up to 24 hours before the excursion. If you cancel within 24 hours of the excursion, there will not be a refund.',
    prices: {
      adult: 1200,
      child: 900,
      infant: null,
    },
    image: null,
    durationHours: 10,
  },
  {
    slug: 'teide-tour-vip',
    title: 'Teide Tour VIP',
    fromPrice: 790,
    shortDescription: 'Discover the wonders of Mount Teide in this exclusive VIP tour. Visit the national park, learn about the volcanic landscape, and enjoy stunning panoramic views.',
    fullDescription: 'Discover the wonders of Mount Teide in this exclusive VIP tour. Visit the national park, learn about the volcanic landscape, and enjoy stunning panoramic views. This personalized experience takes you to the heart of Teide National Park, where you\'ll explore the unique flora and fauna, learn about the geological history, and witness some of the most spectacular views in the Canary Islands.',
    bullets: {
      smallGroup: 'Yes',
      pickup: 'Yes',
      duration: '8 hrs',
    },
    detailsBullets: [
      'Private VIP experience',
      'Professional guide',
      'Transport from your hotel or nearby',
      'Mount Teide National Park access',
      'Geological and natural history insights',
      'Civil liability insurance',
    ],
    freeCancellationText: 'Free cancellation up to 24 hours before the excursion. If you cancel within 24 hours of the excursion, there will not be a refund.',
    prices: {
      adult: 790,
      child: 590,
      infant: 0,
    },
    image: null,
    durationHours: 8,
  },
  {
    slug: 'masca-vip-tour',
    title: 'Masca VIP Tour',
    fromPrice: 680,
    shortDescription: 'Explore the dramatic Masca Valley, one of Tenerife\'s most spectacular natural wonders, in this exclusive VIP experience with personalized attention.',
    fullDescription: 'Explore the dramatic Masca Valley, one of Tenerife\'s most spectacular natural wonders, in this exclusive VIP experience with personalized attention. Discover the hidden gem of Masca, a remote village nestled in a dramatic gorge, and learn about its history and culture from your expert guide. Enjoy breathtaking views and comfortable transportation throughout your journey.',
    bullets: {
      smallGroup: 'Yes',
      pickup: 'Yes',
      duration: 'Half day',
    },
    detailsBullets: [
      'Private VIP experience',
      'Professional guide',
      'Transport from your hotel or nearby',
      'Visit to Masca Valley',
      'Scenic viewpoints',
      'Civil liability insurance',
    ],
    freeCancellationText: 'Free cancellation up to 24 hours before the excursion. If you cancel within 24 hours of the excursion, there will not be a refund.',
    prices: {
      adult: 680,
      child: 500,
      infant: 0,
    },
    image: null,
    durationHours: 5,
  },
]

/**
 * Get mock data by slug
 */
export function getVipTourMockBySlug(slug: string): VipTourMockData | null {
  return vipToursMockData.find(item => item.slug === slug) || null
}

/**
 * Get all mock slugs
 */
export function getAllVipTourMockSlugs(): string[] {
  return vipToursMockData.map(item => item.slug)
}












