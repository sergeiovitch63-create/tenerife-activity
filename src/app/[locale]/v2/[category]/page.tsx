import TourCard from '@/components/v2/TourCard'
import { getTours } from '@/lib/atlantico.api'

type PageProps = {
  params: Promise<{ locale: string; category: string }>
}

export const dynamic = 'force-dynamic'
export const revalidate = 1800

export default async function V2CategoryPage({ params }: PageProps) {
  const { locale, category } = await params
  const tours = await getTours(locale, decodeURIComponent(category)).catch(() => [])

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold text-glass-900">{decodeURIComponent(category)}</h1>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {tours.map((tour) => (
          <TourCard key={tour.code} tour={tour} locale={locale} />
        ))}
      </div>
      {tours.length === 0 && (
        <div className="mt-6 rounded-2xl border border-glass-200 bg-white/90 p-6 text-glass-600 shadow-lg">
          No tours available for this category right now.
        </div>
      )}
    </main>
  )
}

