import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { InspiredMarcoPage } from './InspiredMarcoPage.client'
import { experienceRepository } from '@/config/repositories'
import type { Activity } from '@/core/entities/activity'
import { MockExperienceRepository } from '@/data/mock/mock-experience.repository'

const VIBE_TO_TAGS: Record<string, string[]> = {
  'vip-tours':             ['luxury', 'chill', 'couple'],
  'adventure-nature':      ['adventure', 'nature', 'high-intensity'],
  'water-sports':          ['adventure', 'nature', 'medium-intensity'],
  'diving-fishing':        ['adventure', 'nature', 'medium-intensity'],
  'theme-parks':           ['entertainment', 'family', 'medium-intensity'],
  'tickets-attractions':   ['culture', 'entertainment', 'low-intensity'],
  'bus-excursions':        ['culture', 'low-intensity', 'time-halfday'],
  'cable-car-observatory': ['nature', 'chill', 'low-intensity', 'time-1-2h'],
  'boat-trips-cruises':    ['adventure', 'nature', 'chill', 'time-halfday'],
  'shows-entertainment':   ['entertainment', 'chill', 'time-1-2h'],
  'gastronomy-tastings':   ['culture', 'chill', 'time-1-2h'],
  'car-rental':            ['adventure', 'time-fullday'],
  'bike-rental':           ['adventure', 'medium-intensity'],
}

function priceToBudgetTag(price: number): string {
  if (price <= 30) return 'budget-1'
  if (price <= 100) return 'budget-2'
  return 'budget-3'
}

function mapExperienceToActivity(experience: any): Activity {
  const vibeTags = (experience.vibeId && VIBE_TO_TAGS[experience.vibeId]) ?? []
  const budgetTag = typeof experience.price === 'number'
    ? priceToBudgetTag(experience.price)
    : 'budget-2'
  return {
    id: experience.id,
    slug: experience.slug,
    title: experience.title,
    priceFrom: typeof experience.price === 'number' ? experience.price : 0,
    duration: experience.duration ?? '',
    location: experience.location ?? 'Tenerife',
    media: {
      type: 'image',
      src:
        (Array.isArray(experience.imageUrls) && experience.imageUrls[0]) ||
        experience.imageUrl ||
        '/logo.png',
    },
    tags: [...vibeTags, budgetTag],
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata.inspired' })

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function InspiredPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  await params
  let experiences: any[] = []

  try {
    experiences = await experienceRepository.findAll()
  } catch {
    // Fallback to mock data if Atlantico repository fails
    const mockRepo = new MockExperienceRepository()
    experiences = await mockRepo.findAll()
  }

  if (!experiences || experiences.length === 0) {
    const mockRepo = new MockExperienceRepository()
    experiences = await mockRepo.findAll()
  }

  const activities = experiences.map(mapExperienceToActivity)

  return <InspiredMarcoPage activities={activities} />
}
