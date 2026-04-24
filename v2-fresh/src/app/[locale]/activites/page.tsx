import ActivityCard from '@/components/ActivityCard'
import FilterBar from '@/components/FilterBar'
import LocaleLink from '@/components/LocaleLink'
import { getGroups, nextDatesForGroups } from '@/lib/atlantico/client'
import { applyFilters } from '@/lib/filter'
import { getDictionary } from '@/i18n'
import { isLocale, type Locale } from '@/lib/locale'
import { getLocalCovers } from '@/lib/local-images'

export const revalidate = 1800

type Props = {
  params: { locale: string }
  searchParams: { q?: string; max?: string; sort?: string }
}

export default async function ActivitiesPage({ params, searchParams }: Props) {
  const locale = (isLocale(params.locale) ? params.locale : 'fr') as Locale
  const t = getDictionary(locale)
  const groups = await getGroups(locale, { page: -1 })
  const filtered = applyFilters(groups, searchParams)
  const localCovers = getLocalCovers(filtered.map((g) => g.code))
  const nextDates = await nextDatesForGroups(filtered, locale)

  return (
    <div className="container-x py-10">
      <nav className="text-xs text-ink-500 mb-3">
        <LocaleLink href="/" className="hover:text-ink-800">{t.activity.breadcrumbHome}</LocaleLink>
        <span className="mx-1.5">/</span>
        <span className="text-ink-700">{t.listing.title}</span>
      </nav>

      <header className="mb-4">
        <h1 className="h-display text-4xl md:text-5xl">{t.listing.title}</h1>
        <p className="text-ink-500 mt-2">{t.listing.subtitle}</p>
      </header>

      <FilterBar total={filtered.length} />

      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-ink-500">{t.listing.empty}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((g) => (
            <ActivityCard
              key={g.id}
              group={g}
              coverOverride={localCovers[g.code]}
              nextDate={nextDates[g.code]}
            />
          ))}
        </div>
      )}
    </div>
  )
}
