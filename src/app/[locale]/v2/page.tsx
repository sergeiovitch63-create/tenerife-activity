import Link from 'next/link'
import TourCard from '@/components/v2/TourCard'
import { getClassifications, getTours } from '@/lib/atlantico.api'
import { toImageUrl } from '@/lib/atlantico'
import type { ApiClassification, ApiTour } from '@/lib/atlantico.types'

export const dynamic = 'force-dynamic'

const fallbackImage =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop stop-color='%230ea5e9'/><stop offset='1' stop-color='%230285c7'/></linearGradient></defs><rect width='100%' height='100%' fill='url(%23g)'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='60'>🏝️</text></svg>"

const cleanText = (text: string): string =>
  text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

const shortText = (text: string, max = 120): string => {
  const value = cleanText(text)
  if (value.length <= max) return value
  return `${value.slice(0, max).trim()}...`
}

export default async function V2Page({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  let classifications: ApiClassification[] = []
  let tours: ApiTour[] = []

  try {
    const data = await getClassifications(locale)
    classifications = Array.isArray(data) ? data : []
  } catch (e) {
    console.error('getClassifications failed:', e)
    classifications = []
  }

  try {
    const data = await getTours(locale)
    tours = Array.isArray(data) ? data : []
  } catch (e) {
    console.error('getTours failed:', e)
    tours = []
  }

  const mustSee = tours.slice(0, 12)

  return (
    <main className="pb-16">
      <section className="relative overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-ocean-700 via-ocean-600 to-ocean-500 px-6 py-20 text-white shadow-2xl">
        <div className="mx-auto max-w-6xl text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Tenerife Activity
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-white/90 md:text-lg">
            Discover unforgettable Atlantic adventures with the new experience.
          </p>
          <div className="mt-8">
            <Link
              href={`/${locale}/inspired`}
              className="inline-flex rounded-2xl border border-white/30 bg-white/20 px-6 py-3 font-semibold text-white backdrop-blur transition hover:scale-[1.02] hover:bg-white/30"
            >
              Get Inspired
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-4">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-2xl font-semibold text-glass-900">Categories</h2>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {classifications.map((classification) => (
            <Link
              key={classification.code}
              href={`/${locale}/v2/${encodeURIComponent(classification.code)}`}
              className="group overflow-hidden rounded-2xl border border-glass-200 bg-white/90 shadow-lg transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl"
            >
              <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-ocean-500/20 to-ocean-700/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={toImageUrl(classification.image)}
                  alt={cleanText(classification.name || 'Category')}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src = fallbackImage
                  }}
                />
              </div>
              <div className="space-y-2 p-5">
                <h3 className="line-clamp-1 text-lg font-semibold text-glass-900">
                  {cleanText(classification.name || 'Category')}
                </h3>
                <p className="line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-glass-600">
                  {shortText(classification.desc || '', 130) || 'Explore this category'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-7xl px-4">
        <h2 className="mb-5 text-2xl font-semibold text-glass-900">Must See</h2>
        <div className="flex gap-5 overflow-x-auto pb-3">
          {mustSee.map((tour) => (
            <div key={tour.code} className="min-w-[300px] max-w-[340px] flex-shrink-0">
              <TourCard tour={tour} locale={locale} />
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

