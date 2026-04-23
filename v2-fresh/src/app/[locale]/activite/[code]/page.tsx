import { notFound } from 'next/navigation'
import { Star, MapPin, Clock, Share2, Heart } from 'lucide-react'
import Gallery from '@/components/Gallery'
import ActivityCard from '@/components/ActivityCard'
import LocaleLink from '@/components/LocaleLink'
import ActivityDetailLayout from '@/components/ActivityDetailLayout'
import {
  getGroupDetails, getEventDetails, getGroups, getClassifications, getPrices, getLimits,
} from '@/lib/atlantico/client'
import { getDictionary } from '@/i18n'
import { isLocale, type Locale } from '@/lib/locale'
import { parseIds, toAtlanticoDate } from '@/lib/atlantico/normalize'
import { parseFaq } from '@/lib/faq-parser'
import { findNextAvailableDate } from '@/lib/atlantico/availability'
import { atlanticoImageUrl, coverImage } from '@/lib/atlantico/images'
import { getLocalGroupImages } from '@/lib/local-images'

export const revalidate = 900

type Props = { params: { locale: string; code: string } }

function defaultPriceDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  return toAtlanticoDate(d)
}

export default async function ActivityPage({ params }: Props) {
  const locale = (isLocale(params.locale) ? params.locale : 'fr') as Locale
  const t = getDictionary(locale)

  const group = await getGroupDetails(params.code, locale)
  if (!group) notFound()

  const eventIds = parseIds(group.ids)
  const [events, related, categories] = await Promise.all([
    Promise.all(eventIds.map((id) => getEventDetails(id, locale))),
    getGroups(locale, { page: -1 }),
    getClassifications(locale),
  ])
  const validEvents = events.filter((e): e is NonNullable<typeof e> => !!e)

  const priceDate = defaultPriceDate()
  const [initialPrices, initialLimitsArr] = await Promise.all([
    getPrices(validEvents.map((e) => e.code), priceDate),
    Promise.all(validEvents.map((e) => getLimits(e.code, locale))),
  ])

  // Map limits by event code + compute next available date per option
  const nextDates: Record<string, string | null> = {}
  validEvents.forEach((e, i) => {
    nextDates[e.code] = findNextAvailableDate(initialLimitsArr[i])
  })

  const category = categories.find((c) => c.id === group.category)
  const relatedList = related
    .filter((g) => g.code !== group.code && g.category === group.category)
    .slice(0, 4)

  const localImages = getLocalGroupImages(group.code)
  const apiImages = [
    ...(group.images ?? []).map((s) => atlanticoImageUrl(s)).filter((u): u is string => !!u),
  ]
  const cover = coverImage(group)
  if (cover && !apiImages.includes(cover)) apiImages.unshift(cover)
  const imageList = localImages.length > 0 ? localImages : apiImages

  const reviews = Number(group.recom ?? 0) > 0 ? Number(group.recom) * 100 : 0
  const rating = 4.8
  const faq = parseFaq(group.faq)

  return (
    <>
      <div className="container-x pt-6">
        <nav className="text-xs text-ink-500 mb-3">
          <LocaleLink href="/" className="hover:text-ink-800">{t.activity.breadcrumbHome}</LocaleLink>
          <span className="mx-1.5">/</span>
          {category && (
            <>
              <LocaleLink href={`/categorie/${category.code}`} className="hover:text-ink-800">
                {category.name}
              </LocaleLink>
              <span className="mx-1.5">/</span>
            </>
          )}
          <span className="text-ink-700 line-clamp-1 inline">{group.name}</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
          <div className="max-w-3xl">
            {group.isNew === '1' && <span className="chip-ember mb-3 inline-flex">{t.home.featuredBadge}</span>}
            <h1 className="h-display text-3xl md:text-5xl leading-tight">{group.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {reviews > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Star className="w-4 h-4 fill-ember-500 text-ember-500" />
                  <strong>{rating.toFixed(1)}</strong>
                  <span className="text-ink-500">({reviews.toLocaleString()} {t.activity.reviews})</span>
                </span>
              )}
              {group.duration && (
                <span className="inline-flex items-center gap-1 text-ink-600">
                  <Clock className="w-4 h-4" /> {group.duration} h
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-ink-600">
                <MapPin className="w-4 h-4" /> Tenerife
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 rounded-full border border-ink-200 hover:bg-ink-50 inline-flex items-center justify-center" aria-label="Share">
              <Share2 className="w-4 h-4" />
            </button>
            <button className="w-10 h-10 rounded-full border border-ink-200 hover:bg-ink-50 inline-flex items-center justify-center" aria-label="Favorite">
              <Heart className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {imageList.length > 0 && (
        <div className="container-x mt-4">
          <Gallery images={imageList} alt={group.name} />
        </div>
      )}

      <ActivityDetailLayout
        group={group}
        events={validEvents}
        faq={faq}
        initialPrices={initialPrices}
        initialDate={priceDate}
        nextDates={nextDates}
        t={t}
        locale={locale}
      />

      {relatedList.length > 0 && (
        <section className="container-x mt-24">
          <h2 className="h-display text-3xl mb-6">{t.activity.related}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedList.map((g) => (
              <ActivityCard key={g.id} group={g} compact />
            ))}
          </div>
        </section>
      )}
    </>
  )
}
