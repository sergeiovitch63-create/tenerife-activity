import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { InspiredMarcoPage } from './InspiredMarcoPage.client'
import type { Activity } from '@/core/entities/activity'
import { mapLocaleToLang } from '@/lib/atlantico/locale'

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

function mapTourToActivity(tour: any): Activity {
  // Derive "vibe-like" tags from tour.code using mapping table.
  // tours-enriched uses groupsList as source of truth; we only use
  // a lightweight vibe mapping here for recommendation scoring.
  const vibeTags =
    (tour.vibeId && VIBE_TO_TAGS[String(tour.vibeId)]) ??
    ((tour._raw?.groupDetails?.classificationCode ||
      tour._raw?.groupList?.classificationCode) &&
      VIBE_TO_TAGS[
        String(
          tour._raw?.groupDetails?.classificationCode ||
            tour._raw?.groupList?.classificationCode
        )
      ]) ??
    []

  const price =
    typeof tour.fromPrice === 'number'
      ? tour.fromPrice
      : typeof tour.price === 'number'
        ? tour.price
        : 0

  const budgetTag = price > 0 ? priceToBudgetTag(price) : 'budget-2'

  return {
    id: String(tour.code ?? tour.id),
    slug: String(tour.code ?? tour.id),
    title: tour.title,
    priceFrom: price,
    duration:
      typeof tour.durationHours === 'number' && tour.durationHours > 0
        ? `${tour.durationHours} h`
        : '',
    location: 'Tenerife',
    media: {
      type: 'image',
      src: tour.imageUrl || '/logo.png',
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
  const { locale } = await params
  const lang = mapLocaleToLang(locale)

  const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || ''
  const headersList = await import('next/headers').then((m) => m.headers)
  const hdrs = headersList()
  const host = hdrs.get('host') || 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const origin = envBase || `${protocol}://${host}`

  let tours: any[] = []

  try {
    const res = await fetch(
      `${origin}/api/atlantico/tours-enriched/${encodeURIComponent(lang)}`,
      { next: { revalidate: 600 } }
    )

    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data.items)) {
        tours = data.items
      }
    }
  } catch {
    // In case of failure, keep tours as empty array; InspiredMarcoPage
    // will gracefully fallback to an empty recommendations list.
  }

  const activities: Activity[] = tours.map(mapTourToActivity)

  return <InspiredMarcoPage activities={activities} />
}
