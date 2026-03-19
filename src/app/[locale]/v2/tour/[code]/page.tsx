import BookingWidget from '@/components/v2/BookingWidget'
import MapRouteModal from '@/components/v2/MapRouteModal'
import TourCard from '@/components/v2/TourCard'
import TourGallery from '@/components/v2/TourGallery'
import { formatDuration } from '@/lib/atlantico'
import { getEventDetail, getTourDetail, getTours } from '@/lib/atlantico.api'

const BASE = process.env.ATLANTICO_API_URL ?? 'https://api.atlanticoexcursiones.com'

type PageProps = {
  params: Promise<{ locale: string; code: string }>
}

export const dynamic = 'force-dynamic'

const cleanText = (text: string): string =>
  text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

const splitFaq = (faq: string): Array<{ q: string; a: string }> => {
  const lines = faq.split('\n').map((line) => line.trim()).filter(Boolean)
  const items: Array<{ q: string; a: string }> = []
  for (let i = 0; i < lines.length; i += 2) {
    items.push({ q: lines[i], a: lines[i + 1] ?? '' })
  }
  return items
}

export default async function V2TourDetailPage({ params }: PageProps) {
  const { locale, code } = await params
  const detail = await getTourDetail(code, locale)
  const eventIds = detail.ids.split(',').map((id) => id.trim()).filter(Boolean)
  const firstEvent = eventIds[0] ? await getEventDetail(eventIds[0], locale).catch(() => null) : null
  const categoryTours = await getTours(locale, detail.category).catch(() => [])
  const related = categoryTours.filter((tour) => tour.code !== detail.code).slice(0, 3)

  const gallery = detail.image.includes(',')
    ? detail.image.split(',').map((x) => x.trim()).filter(Boolean)
    : [detail.image].filter(Boolean)
  const faqItems = splitFaq(detail.faq || '')

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <TourGallery images={gallery} name={cleanText(detail.name)} />

          <section className="rounded-2xl border border-glass-200 bg-white/90 p-6 shadow-lg">
            <h1 className="text-3xl font-bold text-glass-900">{cleanText(detail.name)}</h1>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-ocean-50 px-3 py-1 text-ocean-700">{formatDuration(detail.duration)}</span>
              {detail.childAge && <span className="rounded-full bg-glass-100 px-3 py-1 text-glass-700">{cleanText(detail.childAge)}</span>}
              {detail.infantAge && <span className="rounded-full bg-glass-100 px-3 py-1 text-glass-700">{cleanText(detail.infantAge)}</span>}
            </div>
            <p className="mt-5 whitespace-pre-wrap text-glass-700">{cleanText(detail.desc || '')}</p>
          </section>

          {faqItems.length > 0 && (
            <section className="rounded-2xl border border-glass-200 bg-white/90 p-6 shadow-lg">
              <h2 className="mb-4 text-2xl font-semibold text-glass-900">FAQ</h2>
              <div className="space-y-3">
                {faqItems.map((item, idx) => (
                  <details key={`${item.q}-${idx}`} className="group rounded-xl border border-glass-200 bg-white p-3">
                    <summary className="cursor-pointer list-none font-medium text-glass-900">{cleanText(item.q)}</summary>
                    <p className="mt-2 text-sm text-glass-700">{cleanText(item.a)}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {firstEvent && (
            <section className="rounded-2xl border border-glass-200 bg-white/90 p-6 shadow-lg">
              <h2 className="mb-4 text-2xl font-semibold text-glass-900">Departure Info</h2>
              {!!firstEvent.route && <MapRouteModal route={firstEvent.route} />}
              <div className="mt-4 flex flex-wrap gap-2">
                {(firstEvent.days ?? []).map((day, idx) => (
                  <span key={`${day}-${idx}`} className="rounded-full bg-ocean-100 px-3 py-1 text-sm text-ocean-700">
                    Day {day}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(firstEvent.icons ?? []).map((icon) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={icon}
                    src={`${BASE}/icons/${icon}`}
                    alt={icon}
                    className="h-9 w-9 rounded-lg border border-glass-200 bg-white p-1"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {related.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-glass-900">Vous aimerez aussi</h2>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {related.map((tour) => (
                  <TourCard key={tour.code} tour={tour} locale={locale} />
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="lg:sticky lg:top-24 lg:h-fit">
          <BookingWidget tourCode={detail.code} eventIds={eventIds} locale={locale} />
        </div>
      </div>
    </main>
  )
}

