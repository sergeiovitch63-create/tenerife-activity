/**
 * Must See Page
 * Displays all activities from the Must See carousel with cards linking to group-details.
 * Same card design as /activite/[slug].
 */

import type { Metadata } from 'next'
import { mapLocaleToLang } from '@/lib/atlantico/locale'
import { Section, Container } from '@/ui/components/layout'
import { Link } from '@/navigation'
import { decodeTextFromApi } from '@/lib/atlantico/htmlAssets'
import { ToursListCardImage } from '@/app/[locale]/debug/tours-list/ToursListCardImage.client'
import { getTranslations } from 'next-intl/server'
import { buildMetadata } from '@/lib/seo'
import type { Locale } from '@/i18n/request'
import { formatDurationLabel } from '@/lib/duration'

type Tour = {
  id: string
  code: string
  name: string
  desc?: string
  price?: number
  duration?: string
}

const REVALIDATE = 300

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata.mustSee' })
  return buildMetadata({
    locale: locale as Locale,
    pathname: '/must-see',
    title: t('title'),
    description: t('description'),
  })
}

export default async function MustSeePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('mustSee')
  const tCommon = await getTranslations('common')
  const tActivite = await getTranslations('activite')
  const lang = mapLocaleToLang(locale)

  let tours: Tour[] = []
  let error: string | null = null

  const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || ''
  const headersList = await import('next/headers').then((m) => m.headers)
  const host = headersList().get('host') || 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const origin = envBase || `${protocol}://${host}`

  try {
    const res = await fetch(
      `${origin}/api/atlantico/must-see?lang=${encodeURIComponent(lang)}`,
      { next: { revalidate: REVALIDATE } }
    )
    if (!res.ok) {
      error = `HTTP ${res.status}`
    } else {
      const data = await res.json()
      if (data.ok && Array.isArray(data.tours)) {
        tours = data.tours
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown error'
  }

  return (
    <>
      <Section variant="default" background="subtle">
        <Container size="lg">
          <div className="glass-panel p-6 md:p-8">
            <div className="space-y-2">
              <Link href="/" className="text-xs text-ocean-700 hover:underline">
                ← {tActivite('home')}
              </Link>
              <h1 className="text-3xl md:text-4xl font-bold text-glass-900">
                {t('title')}
              </h1>
              <p className="text-lg text-glass-600 max-w-2xl">
                {t('subtitle')}
              </p>
            </div>
          </div>
        </Container>
      </Section>

      <Section variant="default" background="default">
        <Container size="lg" className="py-8">
          {error && (
            <div className="glass-panel p-6 mb-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}

          {tours.length === 0 && !error && (
            <div className="glass-panel p-6 text-center text-sm text-glass-600">
              Aucune activité disponible.
            </div>
          )}

          {tours.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tours.map((t) => {
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
                            alt={t.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-glass-400 text-sm">
                            {tCommon('noImage')}
                          </div>
                        )}
                      </div>
                      <div className="p-4 md:p-5 space-y-3 flex-1 flex flex-col">
                        <h2 className="text-lg font-semibold text-glass-900 line-clamp-2">
                          {t.name}
                        </h2>
                        {t.desc ? (
                          <p className="text-sm text-glass-700 leading-relaxed line-clamp-4">
                            {decodeTextFromApi(t.desc)}
                          </p>
                        ) : (
                          <p className="text-sm text-glass-400 italic">
                            Aucune description.
                          </p>
                        )}
                        <div className="mt-auto flex items-center justify-between gap-4 text-base font-semibold text-glass-900">
                          <span>
                            {t.duration ? `⏱ ${formatDurationLabel(t.duration)}` : '\u00A0'}
                          </span>
                          {t.price !== undefined &&
                          !Number.isNaN(t.price) &&
                          t.price > 0 ? (
                            <span className="text-right">
                              À partir de {Number(t.price).toFixed(2)} €
                            </span>
                          ) : (
                            <span className="text-right italic text-glass-400 font-normal">
                              Prix non disponible
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
