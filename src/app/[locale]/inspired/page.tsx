import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { InspiredMarcoPage } from './InspiredMarcoPage.client'
import { experienceRepository } from '@/config/repositories'
import type { Activity } from '@/core/entities/activity'
import { MockExperienceRepository } from '@/data/mock/mock-experience.repository'

function mapExperienceToActivity(experience: any): Activity {
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
    tags: [],
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
