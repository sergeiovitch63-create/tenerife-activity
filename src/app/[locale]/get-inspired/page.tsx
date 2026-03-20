import { Section, Container, Stack } from '@/ui/components/layout'
import { GetInspiredQuiz } from '@/ui/components/get-inspired/GetInspiredQuiz.client'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'
import { type Locale } from '@/i18n/request'
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
  const rawPrice =
    typeof experience.priceFrom === 'number'
      ? experience.priceFrom
      : typeof experience.price === 'number'
        ? experience.price
        : 0
  const budgetTag = rawPrice > 0
    ? priceToBudgetTag(rawPrice)
    : 'budget-2'
  const firstImage =
    (Array.isArray(experience.imageUrls) && experience.imageUrls[0]) ||
    experience.imageUrl ||
    '/logo.png'
  const id = String(experience.id ?? experience.code ?? experience.slug ?? Math.random())
  const slug = String(experience.slug ?? experience.code ?? id)
  const title = String(experience.title ?? experience.name ?? `Experience ${id}`)
  return {
    id,
    slug,
    title,
    vibeId: experience.vibeId != null ? String(experience.vibeId) : undefined,
    priceFrom: rawPrice,
    duration: experience.duration ?? '',
    location: experience.location ?? 'Tenerife',
    media: { type: 'image', src: firstImage },
    tags: [...vibeTags, budgetTag],
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'seo' })

  return buildMetadata({
    locale: locale as Locale,
    pathname: '/get-inspired',
    title: t('getInspired.title'),
    description: t('getInspired.description'),
  })
}

export default async function GetInspiredPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'getInspired.hero' })

  let activities: Activity[] = []
  try {
    const experiences = await experienceRepository.findAll()
    activities = experiences.map(mapExperienceToActivity)
  } catch {
    // Fallback to mock data so quiz results are never empty.
    const mockRepo = new MockExperienceRepository()
    const mockExperiences = await mockRepo.findAll()
    activities = mockExperiences.map(mapExperienceToActivity)
  }

  return (
    <>
      {/* Hero Section */}
      <Section variant="default" background="default" className="pt-24 md:pt-32 pb-12 md:pb-16">
        <Container size="lg">
          <Stack direction="column" gap="md" align="center">
            <div className="text-center space-y-4 max-w-3xl mx-auto px-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.35)' }}>
                {t('title')}
              </h1>
              <p className="text-lg md:text-xl text-white/85 leading-relaxed" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.35)' }}>
                {t('subtitle')}
              </p>
            </div>
          </Stack>
        </Container>
      </Section>

      {/* Quiz Section */}
      <Section variant="default" background="default" className="py-8 md:py-12">
        <GetInspiredQuiz activities={activities} />
      </Section>
    </>
  )
}
