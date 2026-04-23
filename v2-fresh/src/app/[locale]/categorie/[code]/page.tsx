import { notFound } from 'next/navigation'
import ActivityCard from '@/components/ActivityCard'
import FilterBar from '@/components/FilterBar'
import LocaleLink from '@/components/LocaleLink'
import { getClassifications, getGroups, nextDatesForGroups } from '@/lib/atlantico/client'
import { applyFilters } from '@/lib/filter'
import { getDictionary } from '@/i18n'
import { isLocale, type Locale } from '@/lib/locale'
import { themeFor } from '@/lib/category-theme'
import { cleanText } from '@/lib/atlantico/normalize'
import { getLocalCovers } from '@/lib/local-images'

export const revalidate = 1800

type Props = {
  params: { locale: string; code: string }
  searchParams: { q?: string; max?: string; sort?: string }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const locale = (isLocale(params.locale) ? params.locale : 'fr') as Locale
  const t = getDictionary(locale)

  const [allCategories, groups] = await Promise.all([
    getClassifications(locale),
    getGroups(locale, { page: -1, classificationCode: params.code }),
  ])

  const category = allCategories.find((c) => c.code === params.code)
  if (!category) notFound()

  const theme = themeFor(category.id)
  const filtered = applyFilters(groups, searchParams)
  const localCovers = getLocalCovers(filtered.map((g) => g.code))
  const nextDates = await nextDatesForGroups(filtered, locale)

  return (
    <>
      <section
        className="relative overflow-hidden text-white py-16"
        style={{ background: `linear-gradient(135deg, ${theme.gradient[0]}, ${theme.gradient[1]})` }}
      >
        <div className="absolute inset-0 bg-grid opacity-20 mix-blend-overlay" />
        <div className="relative container-x">
          <nav className="text-xs text-white/70 mb-3">
            <LocaleLink href="/" className="hover:text-white">{t.activity.breadcrumbHome}</LocaleLink>
            <span className="mx-1.5">/</span>
            <LocaleLink href="/activites" className="hover:text-white">{t.activity.breadcrumbAll}</LocaleLink>
            <span className="mx-1.5">/</span>
            <span className="text-white">{category.name}</span>
          </nav>
          <h1 className="h-display text-4xl md:text-6xl">{category.name}</h1>
          {category.desc && (
            <p className="text-white/80 mt-3 text-lg max-w-2xl">{cleanText(category.desc)}</p>
          )}
          <p className="mt-4 text-sm text-white/70">
            {groups.length} {groups.length > 1 ? t.listing.foundPlural : t.listing.found}
          </p>
        </div>
      </section>

      <div className="container-x py-8">
        <FilterBar total={filtered.length} categoryName={category.name} />

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

        <div className="mt-12 pt-8 border-t border-ink-100">
          <h3 className="text-sm font-semibold text-ink-700 mb-4">{t.listing.explore}</h3>
          <div className="flex flex-wrap gap-2">
            {allCategories
              .filter((c) => c.id !== category.id)
              .map((c) => (
                <LocaleLink key={c.id} href={`/categorie/${c.code}`} className="chip hover:bg-ink-100 transition">
                  {c.name}
                </LocaleLink>
              ))}
          </div>
        </div>
      </div>
    </>
  )
}
