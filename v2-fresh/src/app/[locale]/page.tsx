import { ArrowRight, Sparkles, ShieldCheck, Zap, Heart, Star, TrendingUp } from 'lucide-react'
import HeroSearch from '@/components/HeroSearch'
import CategoryCard from '@/components/CategoryCard'
import ActivityCard from '@/components/ActivityCard'
import LocaleLink from '@/components/LocaleLink'
import { getClassifications, getGroups, nextDatesForGroups } from '@/lib/atlantico/client'
import { getDictionary } from '@/i18n'
import { isLocale, type Locale } from '@/lib/locale'
import { themeFor } from '@/lib/category-theme'
import { coverImage } from '@/lib/atlantico/images'
import { getLocalCovers } from '@/lib/local-images'

export const revalidate = 1800

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
  // A group is displayable if it has either an API image or a local cover
  const withImage = groups.filter((g) => !!g.image || !!localCovers[g.code])
  const featured = withImage.slice(0, 6)
  const topRated = [...withImage].sort((a, b) => Number(b.recom ?? 0) - Number(a.recom ?? 0)).slice(0, 8)
  const bestSellers = withImage.slice(0, 4)

  // Compute next available date only for groups we actually render (featured + topRated)
  const cardedGroups = Array.from(
    new Map([...featured, ...topRated, ...bestSellers].map((g) => [g.code, g])).values(),
  )
  const nextDates = await nextDatesForGroups(cardedGroups, locale)

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="absolute inset-0 bg-grid opacity-30 mix-blend-overlay" />
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-ember-500/20 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-ocean-500/20 blur-[120px]" />

        <div className="relative container-x pt-20 pb-32 text-white">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 backdrop-blur-xl px-3 py-1 text-xs font-medium text-white/90">
            <Sparkles className="w-3.5 h-3.5 text-ember-300" />
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
                <Zap className="w-3.5 h-3.5 text-ember-300" />
              </span>
              {t.hero.trustInstant}
            </span>
            <span className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white/10 border border-white/20 inline-flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              </span>
              {t.hero.trustCancel}
            </span>
            <span className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white/10 border border-white/20 inline-flex items-center justify-center">
                <Heart className="w-3.5 h-3.5 text-rose-300" />
              </span>
              {t.hero.trustPrice}
            </span>
            <span className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white/10 border border-white/20 inline-flex items-center justify-center">
                <Star className="w-3.5 h-3.5 text-amber-300" />
              </span>
              {t.hero.trustRating}
            </span>
          </div>
        </div>

        <svg className="block w-full h-[60px] text-white" viewBox="0 0 1440 60" preserveAspectRatio="none" fill="currentColor" aria-hidden>
          <path d="M0,60 C240,20 480,10 720,20 C960,30 1200,50 1440,30 L1440,60 L0,60 Z" />
        </svg>
      </section>

      <section className="container-x -mt-10 relative z-10">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="h-display text-3xl md:text-4xl">{t.home.categoriesTitle}</h2>
            <p className="text-ink-500 mt-1">{t.home.categoriesSubtitle}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {sortedCategories.map((c) => (
            <CategoryCard key={c.id} category={c} />
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="container-x mt-24">
          <div className="flex items-end justify-between mb-6">
            <div>
              <span className="chip-ember mb-2">{t.home.featuredBadge}</span>
              <h2 className="h-display text-3xl md:text-4xl">{t.home.featuredTitle}</h2>
            </div>
            <LocaleLink href="/activites" className="hidden md:inline-flex items-center gap-1 text-sm font-medium text-ink-700 link-underline">
              {t.home.seeAll} <ArrowRight className="w-4 h-4" />
            </LocaleLink>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map((g) => (
              <ActivityCard key={g.id} group={g} coverOverride={localCovers[g.code]} nextDate={nextDates[g.code]} />
            ))}
          </div>
        </section>
      )}

      <section id="teo" className="container-x mt-28">
        <div className="relative overflow-hidden rounded-3xl bg-hero-gradient text-white p-8 md:p-14">
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-ember-500/20 blur-3xl" />
          <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-ocean-500/20 blur-3xl" />
          <div className="relative grid md:grid-cols-[1.2fr_1fr] gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 backdrop-blur px-3 py-1 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5 text-ember-300" />
                {t.teoPromo.badge}
              </div>
              <h2 className="h-display text-4xl md:text-5xl mt-4">
                {t.teoPromo.titleLine1}<br />{t.teoPromo.titleLine2}
              </h2>
              <p className="mt-4 text-white/75 text-lg max-w-lg">{t.teoPromo.text}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                {t.teoPromo.chips.map((chip) => (
                  <span key={chip} className="chip bg-white/10 text-white border-white/15">{chip}</span>
                ))}
              </div>
              <p className="mt-6 text-xs text-white/60">{t.teoPromo.hint}</p>
            </div>
            <div className="relative">
              <div className="relative mx-auto w-64 aspect-square rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur flex items-center justify-center">
                <div className="w-40 h-40 rounded-full relative shadow-glow animate-float-slow" style={{ background: 'radial-gradient(circle at 30% 25%, #CFFAFE 0%, #06B6D4 35%, #0E7490 75%, #0F172A 100%)' }}>
                  <div className="absolute teo-eye rounded-full animate-blink" style={{ width: 28, height: 28, left: 44, top: 70 }} />
                  <div className="absolute teo-eye rounded-full animate-blink" style={{ width: 28, height: 28, right: 44, top: 70 }} />
                  <div className="absolute rounded-full border-b-2 border-white/80" style={{ width: 48, height: 24, left: '50%', transform: 'translateX(-50%)', top: 110 }} />
                </div>
              </div>
              <div className="absolute -left-4 top-8 rounded-2xl rounded-bl-sm bg-white text-ink-900 text-xs px-3 py-2 shadow-card max-w-[220px]">
                {t.teoPromo.userBubble}
              </div>
              <div className="absolute -right-4 bottom-8 rounded-2xl rounded-br-sm bg-ember-500 text-white text-xs px-3 py-2 shadow-card max-w-[220px]">
                {t.teoPromo.teoBubble}
              </div>
            </div>
          </div>
        </div>
      </section>

      {topRated.length > 0 && (
        <section className="container-x mt-24">
          <div className="flex items-end justify-between mb-6">
            <div>
              <span className="chip mb-2"><TrendingUp className="w-3 h-3" /> {t.home.topRatedBadge}</span>
              <h2 className="h-display text-3xl md:text-4xl">{t.home.topRatedTitle}</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {topRated.map((g) => (
              <ActivityCard key={g.id} group={g} compact coverOverride={localCovers[g.code]} nextDate={nextDates[g.code]} />
            ))}
          </div>
        </section>
      )}

      <section className="container-x mt-24">
        <div className="grid md:grid-cols-4 gap-6">
          {Object.entries(t.home.valueProps).map(([key, vp]) => {
            const Icon = key === 'instant' ? Zap : key === 'safe' ? ShieldCheck : key === 'curated' ? Heart : Sparkles
            return (
              <div key={key} className="card p-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ocean-500 to-ocean-700 text-white flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-ink-900">{vp.title}</h3>
                <p className="text-sm text-ink-500 mt-1">{vp.text}</p>
              </div>
            )
          })}
        </div>
      </section>

      {bestSellers.length >= 4 && (
        <section className="container-x mt-24 mb-24">
          <div className="relative overflow-hidden rounded-3xl p-10 md:p-16 bg-gradient-to-br from-ember-500 via-ember-600 to-rose-600 text-white">
            <div className="absolute inset-0 bg-grid opacity-20 mix-blend-overlay" />
            <div className="relative grid md:grid-cols-[1.4fr_1fr] gap-8 items-center">
              <div>
                <h2 className="h-display text-4xl md:text-5xl leading-tight">
                  {t.home.finalCta.title}<br />{t.home.finalCta.subtitle}
                </h2>
                <LocaleLink href="/activites" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white text-ink-900 px-6 py-3 font-semibold hover:bg-ink-50">
                  {t.home.finalCta.button} <ArrowRight className="w-4 h-4" />
                </LocaleLink>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {bestSellers.map((g) => {
                  const img = localCovers[g.code] ?? coverImage(g)
                  return (
                    <LocaleLink key={g.id} href={`/activite/${g.code}`} className="rounded-xl overflow-hidden aspect-[4/5] relative group">
                      {img && <img src={img} alt={g.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      <div className="absolute inset-x-2 bottom-2 text-xs font-semibold line-clamp-2 text-white">{g.name}</div>
                    </LocaleLink>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  )
}
