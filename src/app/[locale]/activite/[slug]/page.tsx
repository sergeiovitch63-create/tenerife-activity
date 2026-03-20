/**
 * Activité - Tours list by vibe slug
 *
 * Same content as debug tours-list but resolved from vibe slug.
 * Clicking a vibe on home (e.g. VIP Tours) redirects here.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { mapLocaleToLang } from '@/lib/atlantico/locale'
import { Section, Container } from '@/ui/components/layout'
import { Link } from '@/navigation'
import { decodeTextFromApi } from '@/lib/atlantico/htmlAssets'
import { getClassificationIdForVibe, getClassificationNameForVibe } from '@/lib/vibes/vibe-classification-mapping'
import { ToursListCardImage } from '@/app/[locale]/debug/tours-list/ToursListCardImage.client'
import { getTranslations } from 'next-intl/server'
import { getTranslatedVibeTitle, getTranslatedVibeTagline } from '@/ui/components/vibe/vibe-translations'
import { vibeRepository } from '@/config/repositories'
import { locales, type Locale } from '@/i18n/request'
import { translateContent, translateDescriptionByCode } from '@/lib/translations/atlantico-content'
import { VibeVideo } from '@/app/[locale]/vibe/[slug]/VibeVideo'

interface PageParams {
  params: Promise<{ locale: string; slug: string }>
}

type Tour = {
  id: string | number
  code: string
  name: string
  desc?: string
  image?: string
  price?: number
  duration?: string
  ids?: (string | number)[]
}

const REVALIDATE = 60
const EXCLUDED_GROUPDETAIL_CODES = new Set(['476', '514', '552', '553'])

export async function generateStaticParams() {
  const vibes = await vibeRepository.findAll()
  const slugs = vibes.map((v) => v.slug)
  return locales.flatMap((locale) =>
    slugs.map((slug) => ({ locale, slug }))
  )
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale, slug } = await params
  const vibe = await vibeRepository.findBySlug(slug)
  const tVibes = await getTranslations({ locale, namespace: 'vibes' })
  const translatedTitle = vibe ? getTranslatedVibeTitle(vibe.slug, tVibes, vibe.title) : slug

  return {
    title: `${translatedTitle} | Tenerife Activity`,
  }
}

export default async function ActiviteSlugPage({ params }: PageParams) {
  const { locale, slug } = await params
  const vibe = await vibeRepository.findBySlug(slug)
  if (!vibe) {
    notFound()
  }

  const lang = mapLocaleToLang(locale)
  const hasClassificationId = !!getClassificationIdForVibe(slug)
  const hasClassificationName = !!getClassificationNameForVibe(slug)
  const tActivite = await getTranslations({ locale, namespace: 'activite' })

  if (!hasClassificationId && !hasClassificationName) {
    return (
      <Section variant="default" background="default">
        <Container size="lg" className="py-12">
          <div className="glass-panel p-6 text-center text-sm text-glass-600">
            <p className="font-semibold">{tActivite('notYetLinked')}</p>
            <Link href="/" className="text-ocean-700 hover:underline mt-2 inline-block">
              {tActivite('backToActivities')}
            </Link>
          </div>
        </Container>
      </Section>
    )
  }

  let tours: Tour[] = []
  let error: string | null = null

  const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || ''
  const headersList = await import('next/headers').then((m) => m.headers)
  const hdrs = headersList()
  const host = hdrs.get('host') || 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const origin = envBase || `${protocol}://${host}`

  try {
    const res = await fetch(
      `${origin}/api/atlantico/activite/${encodeURIComponent(slug)}?lang=${encodeURIComponent(lang)}`,
      { next: { revalidate: REVALIDATE } }
    )
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      error = `HTTP ${res.status}${text ? ` – ${text.slice(0, 200)}` : ''}`
    } else {
      const data = await res.json()
      if (data.ok && Array.isArray(data.tours)) {
        tours = data.tours
      } else if (data.error) {
        error = data.error
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown error'
  }

  const tVibes = await getTranslations({ locale, namespace: 'vibes' })
  const translatedTitle = getTranslatedVibeTitle(vibe.slug, tVibes, vibe.title)
  const translatedTagline = getTranslatedVibeTagline(vibe.slug, locale, vibe.tagline || '')
  const visibleTours = tours.filter((t) => !EXCLUDED_GROUPDETAIL_CODES.has(String(t.code ?? t.id ?? '').trim()))

  return (
    <>
      <Section variant="default" background="subtle">
        <Container size="lg">
          <div className="glass-panel p-6 md:p-8 space-y-6">
            <div className="space-y-2">
              <Link href="/" className="text-xs text-ocean-700 hover:underline">
                ← {tActivite('home')}
              </Link>
              <h1 className="text-3xl md:text-4xl font-bold text-glass-900">
                {translatedTitle}
              </h1>
              {translatedTagline && (
                <p className="text-lg text-glass-600 max-w-2xl">
                  {translatedTagline}
                </p>
              )}
            </div>

            {/* Vibe video placed inside the same card as the title */}
            <VibeVideo slug={vibe.slug} />
          </div>
        </Container>
      </Section>

      <Section variant="default" background="default">
        <Container size="lg" className="pt-4 pb-8">
          {error && (
            <div className="glass-panel p-6 mb-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}

          {visibleTours.length === 0 && !error && (
            <div className="glass-panel p-6 text-center text-sm text-glass-600">
              {tActivite('noToursAvailable')}
            </div>
          )}

          {visibleTours.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleTours.map((t) => {
                const codeStr = String(t.code ?? t.id ?? '').trim()
                return (
                  <Link
                    key={`${t.id}-${t.code}`}
                    href={`/activite/group-details?code=${encodeURIComponent(codeStr)}`}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 rounded-2xl"
                  >
                    <article className="glass-panel rounded-2xl border border-glass-200 overflow-hidden flex flex-col bg-white/90 hover:shadow-lg hover:-translate-y-1 smooth-transition cursor-pointer h-full">
                      <div className="relative w-full aspect-[4/3] bg-glass-100 overflow-hidden">
                        {codeStr ? (
                          <ToursListCardImage
                            code={codeStr}
                            alt={translateContent(t.name, locale as Locale)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-glass-400 text-sm">
                            {tActivite('noImage')}
                          </div>
                        )}
                      </div>
                      <div className="p-4 md:p-5 space-y-3 flex-1 flex flex-col">
                        <h2 className="text-lg font-semibold text-glass-900 line-clamp-2">
                          {translateContent(t.name, locale as Locale)}
                        </h2>
                        {t.desc && (
                          <p className="text-sm text-glass-700 leading-relaxed line-clamp-4">
                            {translateDescriptionByCode(codeStr, decodeTextFromApi(t.desc), locale as Locale)}
                          </p>
                        )}
                        {!t.desc && (
                          <p className="text-sm text-glass-400 italic">
                            {tActivite('noDescription')}
                          </p>
                        )}
                        <div className="mt-auto flex items-center justify-between gap-4 text-base font-semibold text-glass-900">
                          <span>
                            {t.duration ? `⏱ ${t.duration} ${tActivite('hours')}` : '\u00A0'}
                          </span>
                          {t.price !== undefined && !Number.isNaN(t.price) ? (
                            <span className="text-right">
                              {tActivite('startingFrom')} {Number(t.price).toFixed(2)} €
                            </span>
                          ) : (
                            <span className="text-right italic text-glass-400 font-normal">
                              {tActivite('priceNotAvailable')}
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  </Link>
                )
              })}
            </div>
          )}
        </Container>
      </Section>
    </>
  )
}
