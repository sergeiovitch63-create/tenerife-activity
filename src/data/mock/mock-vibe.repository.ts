import type { Vibe } from '@/core/entities/vibe'
import type { VibeRepository } from '@/core/ports/vibe.repository'

// Locked order as per requirements
const MOCK_VIBES: Vibe[] = [
  {
    id: '1',
    slug: 'vip-tours',
    title: 'VIP Tours',
    description: 'Exclusive premium tours',
    tagline: 'Exclusive access to Tenerife\'s most coveted experiences',
    order: 1,
  },
  {
    id: '2',
    slug: 'theme-parks',
    title: 'Theme Parks',
    description: 'Family fun and entertainment',
    tagline: 'Unforgettable family adventures await',
    order: 2,
  },
  {
    id: '3',
    slug: 'tickets-attractions',
    title: 'Tickets & Attractions',
    description: 'Skip-the-line tickets and attractions',
    tagline: 'Skip the queues, maximize your time',
    order: 3,
  },
  {
    id: '4',
    slug: 'bus-excursions',
    title: 'Bus Excursions',
    description: 'Guided bus tours around the island',
    tagline: 'Discover the island in comfort and style',
    order: 4,
  },
  {
    id: '5',
    slug: 'boat-trips-cruises',
    title: 'Boat Trips & Cruises',
    description: 'Ocean adventures and cruises',
    tagline: 'Set sail for unforgettable ocean moments',
    order: 5,
  },
  {
    id: '6',
    slug: 'shows-entertainment',
    title: 'Shows & Entertainment',
    description: 'Live shows and evening entertainment',
    tagline: 'Evenings filled with world-class performances',
    order: 6,
  },
  {
    id: '7',
    slug: 'water-sports',
    title: 'Water Sports',
    description: 'Aquatic activities and water fun',
    tagline: 'Dive into thrilling aquatic adventures',
    order: 7,
  },
  {
    id: '8',
    slug: 'cable-car-observatory',
    title: 'Cable Car & Observatory',
    description: 'Mountain views and stargazing',
    tagline: 'Reach new heights and gaze at the stars',
    order: 8,
  },
  {
    id: '9',
    slug: 'diving-fishing',
    title: 'Diving & Fishing',
    description: 'Underwater adventures and fishing trips',
    tagline: 'Explore the depths or cast your line',
    order: 9,
  },
  {
    id: '10',
    slug: 'adventure-nature',
    title: 'Adventure & Nature',
    description: 'Outdoor adventures and nature experiences',
    tagline: 'Connect with Tenerife\'s wild side',
    order: 10,
  },
  {
    id: '11',
    slug: 'gastronomy-tastings',
    title: 'Gastronomy & Tastings',
    description: 'Culinary experiences and tastings',
    tagline: 'Savor the authentic flavors of the Canaries',
    order: 11,
  },
  {
    id: '12',
    slug: 'car-rental',
    title: 'Car Rental',
    description: 'Vehicle rental services',
    tagline: 'Freedom to explore at your own pace',
    order: 12,
  },
  {
    id: '13',
    slug: 'bike-rental',
    title: 'Bike Rental',
    description: 'Bicycle rental services',
    tagline: 'Pedal through scenic routes',
    order: 13,
  },
  {
    id: '14',
    slug: 'transfers-transport',
    title: 'Transfers & Transport',
    description: 'Airport transfers and transport services',
    tagline: 'Seamless journeys from start to finish',
    order: 14,
  },
]

export class MockVibeRepository implements VibeRepository {
  async findAll(): Promise<Vibe[]> {
    return Promise.resolve([...MOCK_VIBES])
  }

  async findBySlug(slug: string): Promise<Vibe | null> {
    return Promise.resolve(
      MOCK_VIBES.find((vibe) => vibe.slug === slug) || null
    )
  }

  async findById(id: string): Promise<Vibe | null> {
    return Promise.resolve(
      MOCK_VIBES.find((vibe) => vibe.id === id) || null
    )
  }
}

