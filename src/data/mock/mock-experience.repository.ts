import type { Experience } from '@/core/entities/experience'
import type { ExperienceRepository } from '@/core/ports/experience.repository'

// Minimal mock data - no UI coupling
const MOCK_EXPERIENCES: Experience[] = [
  {
    id: '1',
    slug: 'teide-sunset-tour',
    title: 'Teide Sunset Tour',
    description:
      'Experience the breathtaking sunset from Mount Teide, Spain\'s highest peak. This guided tour takes you to the summit where you\'ll witness one of nature\'s most spectacular displays as the sun sets over the Canary Islands. Includes cable car access, expert guide commentary, and time to explore the volcanic landscape.',
    shortDescription: 'Sunset tour to Mount Teide',
    price: 45,
    currency: 'EUR',
    vibeId: '1',
    location: 'Mount Teide',
    duration: '4 hours',
    rating: 4.5,
    reviewCount: 120,
    highlights: [
      'Cable car ride to summit',
      'Expert local guide',
      'Sunset viewing platform',
      'Volcanic landscape exploration',
    ],
    included: [
      'Cable car tickets',
      'Professional guide',
      'Hotel pickup and drop-off',
      'Small group experience',
    ],
    meetingPoint: 'Hotel pickup available or meet at cable car base station',
    cancellationPolicy: 'Free cancellation up to 24 hours before start time',
    language: 'English, Spanish',
    groupSize: 'Small groups up to 16 people',
    availabilityHint: 'Multiple departures daily',
    durationMinutes: 240, // 4 hours
  },
  {
    id: '2',
    slug: 'siam-park-ticket',
    title: 'Siam Park Ticket',
    description:
      'Enjoy full day access to Siam Park, one of the world\'s best water parks. Experience thrilling water slides, lazy rivers, wave pools, and family-friendly attractions. Perfect for all ages, with dining options and relaxation areas throughout the park.',
    shortDescription: 'Full day water park access',
    price: 38,
    currency: 'EUR',
    vibeId: '2',
    location: 'Costa Adeje',
    duration: 'Full day',
    rating: 4.8,
    reviewCount: 450,
    highlights: [
      'Skip-the-line entry',
      'All attractions included',
      'Family-friendly',
      'Multiple dining options',
    ],
    included: [
      'Full day park admission',
      'Access to all attractions',
      'Locker rental available',
    ],
    meetingPoint: 'Direct entry at Siam Park main entrance',
    cancellationPolicy: 'Free cancellation up to 48 hours before visit date',
    availabilityHint: 'Available daily, year-round',
    durationMinutes: 480, // Full day (8 hours)
  },
  {
    id: '3',
    slug: 'private-vip-tour',
    title: 'Private VIP Tour',
    description: 'Exclusive private tour with personal guide',
    shortDescription: 'Private guided experience',
    price: 150,
    currency: 'EUR',
    vibeId: '1',
    location: 'Tenerife',
    duration: '6 hours',
    rating: 4.9,
    reviewCount: 85,
    durationMinutes: 360, // 6 hours
  },
  {
    id: '4',
    slug: 'loro-parque-ticket',
    title: 'Loro Parque Ticket',
    description: 'Access to Loro Parque theme park',
    shortDescription: 'Theme park admission',
    price: 42,
    currency: 'EUR',
    vibeId: '2',
    location: 'Puerto de la Cruz',
    duration: 'Full day',
    rating: 4.7,
    reviewCount: 320,
    durationMinutes: 480, // Full day (8 hours)
  },
  {
    id: '5',
    slug: 'skip-line-teide',
    title: 'Skip the Line: Teide Cable Car',
    description: 'Priority access to Mount Teide cable car',
    shortDescription: 'Skip-the-line cable car ticket',
    price: 28,
    currency: 'EUR',
    vibeId: '3',
    location: 'Mount Teide',
    duration: '2 hours',
    rating: 4.6,
    reviewCount: 280,
    durationMinutes: 120, // 2 hours
  },
  {
    id: '6',
    slug: 'island-bus-tour',
    title: 'Full Island Bus Tour',
    description: 'Comprehensive bus tour around Tenerife',
    shortDescription: 'Complete island exploration',
    price: 35,
    currency: 'EUR',
    vibeId: '4',
    location: 'Tenerife',
    duration: '8 hours',
    rating: 4.4,
    reviewCount: 195,
    durationMinutes: 480, // 8 hours
  },
]

export class MockExperienceRepository implements ExperienceRepository {
  async findAll(): Promise<Experience[]> {
    return Promise.resolve([...MOCK_EXPERIENCES])
  }

  async findBySlug(slug: string): Promise<Experience | null> {
    return Promise.resolve(
      MOCK_EXPERIENCES.find((exp) => exp.slug === slug) || null
    )
  }

  async findById(id: string): Promise<Experience | null> {
    return Promise.resolve(
      MOCK_EXPERIENCES.find((exp) => exp.id === id) || null
    )
  }

  async findByVibeId(vibeId: string): Promise<Experience[]> {
    return Promise.resolve(
      MOCK_EXPERIENCES.filter((exp) => exp.vibeId === vibeId)
    )
  }

  async search(query: string): Promise<Experience[]> {
    const lowerQuery = query.toLowerCase()
    return Promise.resolve(
      MOCK_EXPERIENCES.filter(
        (exp) =>
          exp.title.toLowerCase().includes(lowerQuery) ||
          exp.shortDescription?.toLowerCase().includes(lowerQuery) ||
          exp.description.toLowerCase().includes(lowerQuery) ||
          exp.location?.toLowerCase().includes(lowerQuery)
      )
    )
  }

  /**
   * Returns curated must-see experiences
   * Manual selection based on quality, popularity, and operator reliability
   * Fixed order, intentional curation
   */
  async findMustSee(): Promise<Experience[]> {
    // Curated list: high quality, popular, reliable operators
    // Order is intentional - represents priority recommendations
    const mustSeeIds = ['1', '2', '5', '4', '3', '6'] // Teide, Siam Park, Cable Car, Loro Parque, VIP Tour, Bus Tour
    return Promise.resolve(
      mustSeeIds
        .map((id) => MOCK_EXPERIENCES.find((exp) => exp.id === id))
        .filter((exp): exp is Experience => exp !== undefined)
    )
  }
}

