import Link from 'next/link'
import { getClassifications, getTours } from '@/lib/atlantico.api'
import { toImageUrl } from '@/lib/atlantico'
import TourCard from '@/components/v2/TourCard'

type PageProps = {
  params: Promise<{ locale: string }>
}

export default async function V2HomePage({ params }: PageProps) {
  const { locale } = await params
  const [classifications, tours] = await Promise.all([
    getClassifications(locale),
    getTours(locale),
  ])

  const mustSee = tours.slice(0, 6)

  return (
    <main className="pb-16">
      <section className="relative overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-ocean-700 via-ocean-600 to-ocean-500 px-6 py-20 text-white shadow-2xl">
        <div className="mx-auto max-w-6xl text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">Tenerife Activity</h1>
          <p className="mx-auto mt-4 max-w-2xl text-white/90 md:text-lg">
            Discover unforgettable Atlantic adventures with the new experience.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-6xl px-4">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-2xl font-semibold text-glass-900">Categories</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classifications.map((c) => (
            <Link
              key={c.code}
              href={`/${locale}/v2/${encodeURIComponent(c.code)}`}
              className="group overflow-hidden rounded-2xl border border-glass-200 bg-white/90 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
            >
              <div className="aspect-[4/3] overflow-hidden bg-glass-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={toImageUrl(c.image)}
                  alt={c.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src =
                      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'><rect width='100%' height='100%' fill='%23e5e7eb'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='60'>🏝️</text></svg>"
                  }}
                />
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-glass-900">{c.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-4">
        <h2 className="mb-5 text-2xl font-semibold text-glass-900">Must See</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {mustSee.map((tour) => (
            <TourCard key={tour.code} tour={tour} locale={locale} />
          ))}
        </div>
      </section>
    </main>
  )
}

