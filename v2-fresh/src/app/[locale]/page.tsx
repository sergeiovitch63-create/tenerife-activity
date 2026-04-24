import { Sparkles, ShieldCheck, Zap, Star } from 'lucide-react'
import HeroSearch from '@/components/HeroSearch'
import CategoryCard from '@/components/CategoryCard'
import { ContextualBanner } from '@/components/home/ContextualBanner'
import { HeroVideoBackground } from '@/components/home/HeroVideoBackground'
import { ThisWeekSection } from '@/components/home/ThisWeekSection'
import { TrustBar } from '@/components/home/TrustBar'
import { RegionsSection } from '@/components/home/RegionsSection'
import { PacksSection } from '@/components/home/PacksSection'
import { WhyUs } from '@/components/home/WhyUs'
import { Newsletter } from '@/components/home/Newsletter'
import { getClassifications, getGroups, nextDatesForGroups } from '@/lib/atlantico/client'
import type { AtlanticoGroup } from '@/lib/atlantico/types'
import { getDictionary } from '@/i18n'
import { isLocale, type Locale } from '@/lib/locale'
import { themeFor } from '@/lib/category-theme'
import { getLocalCovers } from '@/lib/local-images'
import { pickThisWeek } from '@/lib/home/contextual'

export const revalidate = 1800

/**
 * Compute per-category aggregates (count + min price) in a single pass.
 * Returns a map keyed by classification id. Groups with no price are
 * skipped for the "from" figure but still counted.
 */
function aggregateByCategory(
  groups: AtlanticoGroup[],
): Record<string, { count: number; fromPrice: number | null }> {
  const acc: Record<string, { count: number; fromPrice: number | null }> = {}
  for (const g of groups) {
    const cat = g.category
    if (!cat) continue
    const entry = acc[cat] ?? { count: 0, fromPrice: null }
    entry.count += 1
    const p = g.price ? parseFloat(g.price) : NaN
    if (Number.isFinite(p) && p > 0) {
      entry.fromPrice =
        entry.fromPrice === null ? p : Math.min(entry.fromPrice, p)
    }
    acc[cat] = entry
  }
  return acc
}

export default async function Home({ params }: { params: { locale: string } }) {
  const locale = (isLocale(params.locale) ? params.locale : 'fr') as Locale
  const t = getDictionary(locale)

  const [categories, groups] = await Promise.all([
    getClassifications(locale),
    getGroups(locale, { page: -1 }),
  ])

  const sortedCategories = [...categories].sort(
    (a, b) => themeFor(a.id).order - themeFor(b.id).order,
  )

  const localCovers = getLocalCovers(groups.map((g) => g.code))
  const withImage = groups.filter((g) => !!g.image || !!localCovers[g.code])
  const categoryAggregates = aggregateByCategory(groups)

  // Contextual "This week" — 3 picks based on hour + month + group keywords.
  const picks = pickThisWeek(withImage)
  const pickedGroups = picks.map((p) => p.group)
  const nextDates = pickedGroups.length
    ? await nextDatesForGroups(pickedGroups, locale)
    : {}

  return (
    <>
      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="absolute inset-0 bg-grid opacity-30 mix-blend-overlay" />
        <HeroVideoBackground src="https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Hero.mp4">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-brand-gold-500/20 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-brand-turquoise-500/20 blur-[120px] pointer-events-none" />

        <div className="relative container-x pt-20 pb-32 text-white">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 backdrop-blur-xl px-3 py-1 text-xs font-medium text-white/90">
            <Sparkles className="w-3.5 h-3.5 text-brand-gold-300" />
            {t.hero.badge}
          </div>
          <h1 className="mt-6 h-display text-5xl md:text-7xl leading-[1.05] max-w-4xl">
            {t.hero.titleLine1}<br />
            <span className="gradient-text">{t.hero.titleLine2}</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-white/75 max-w-2xl">{t.hero.subtitle}</p>

          <div className="mt-10 max-w-4xl">
            <HeroSearch />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-white/80">
            <span className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white/10 border border-white/20 inline-flex items-center justify-center">
                <Star className="w-3.5 h-3.5 text-amber-300" />
              </span>
              {t.hero.trustRating}
            </span>
            <span className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white/10 border border-white/20 inline-flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              </span>
              {t.hero.trustCancel}
            </span>
            <span className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white/10 border border-white/20 inline-flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-brand-gold-300" />
              </span>
              {t.hero.trustInstant}
            </span>
          </div>
        </div>

        </HeroVideoBackground>

        <svg className="relative block w-full h-[60px] text-white" viewBox="0 0 1440 60" preserveAspectRatio="none" fill="currentColor" aria-hidden>
          <path d="M0,60 C240,20 480,10 720,20 C960,30 1200,50 1440,30 L1440,60 L0,60 Z" />
        </svg>
      </section>

      {/* ---- Live calima visual (only renders in calima months) ---- */}
      <ContextualBanner
        title={t.home.calima.title}
        body={t.home.calima.body}
        indexLabel={t.home.calima.indexLabel}
        lowLabel={t.home.calima.low}
        moderateLabel={t.home.calima.moderate}
        highLabel={t.home.calima.high}
      />

      {/* ---- This Week — 3 contextual picks with urgency badges ---- */}
      <ThisWeekSection
        picks={picks}
        covers={localCovers}
        nextDates={nextDates}
        dict={t.home.thisWeek}
        sectionTitle={t.home.thisWeek.title}
        sectionSubtitle={t.home.thisWeek.subtitle}
        seeAllLabel={t.home.seeAll}
        seeAllHref="/activites"
      />

      {/* ---- Régions — Coins de Tenerife ---- */}
      <RegionsSection dict={t.home.regions} />

      {/* ---- Choose Your Vibe — categories with info density ---- */}
      <section className="container-x mt-20 md:mt-24">
        <div className="mb-6 md:mb-8 text-center max-w-2xl mx-auto">
          <h2 className="h-display text-3xl md:text-4xl">{t.home.categoriesTitle}</h2>
          <p className="text-ink-500 mt-2">{t.home.categoriesSubtitle}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {sortedCategories.map((c) => {
            const agg = categoryAggregates[c.id]
            return (
              <CategoryCard
                key={c.id}
                category={c}
                groupsCount={agg?.count}
                fromPrice={agg?.fromPrice ?? null}
              />
            )
          })}
        </div>
      </section>

      {/* ---- Packs / Combos ---- */}
      <PacksSection dict={t.home.packs} seeAllLabel={t.home.discover} />

      {/* ---- Why us — objection handling ---- */}
      <WhyUs dict={t.home.whyUs} />

      {/* ---- Trust bar ---- */}
      <TrustBar
        headline={t.home.trust.headline}
        stats={t.home.trust.stats}
      />

      {/* ---- Newsletter capture ---- */}
      <Newsletter dict={t.home.newsletter} />
    </>
  )
}
