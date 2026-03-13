/**
 * DEBUG PAGE - Atlantico Tours List (groupsList)
 *
 * For a given classification, lists all tours returned by:
 *   GET /api/atlantico/groups?lang=XXX&classificationId=ID&page=-1
 *
 * Card images: ONLY from public/images/tours-list/{code}/cover.jpg
 * Create a folder per tour and put cover.jpg inside.
 */

import type { Metadata } from 'next'
import { mapLocaleToLang } from '@/lib/atlantico/locale'
import { Section, Container, Stack } from '@/ui/components/layout'
import { Link } from '@/navigation'
import { decodeTextFromApi } from '@/lib/atlantico/htmlAssets'
import { getTranslations } from 'next-intl/server'
import { ToursListCardImage } from './ToursListCardImage.client'

interface PageParams {
  params: Promise<{ locale: string }>
  searchParams?: Promise<{
    classificationId?: string
    classificationCode?: string
    classificationName?: string
  }>
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

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params, searchParams }: PageParams): Promise<Metadata> {
  const { locale } = await params
  const query = (await searchParams) || {}
  const classificationName = query.classificationName || 'Tours'

  return {
    title: `Tours – ${classificationName} – ${locale}`,
  }
}

export default async function ToursListDebugPage({ params, searchParams }: PageParams) {
  const { locale } = await params
  const query = (await searchParams) || {}
  const tCommon = await getTranslations('common')

  const lang = mapLocaleToLang(locale)
  const classificationId = query.classificationId || ''
  const classificationCode = query.classificationCode || ''
  const classificationName = query.classificationName || 'Unknown classification'

  // Safety: require classificationId
  if (!classificationId) {
    return (
      <Section variant="default" background="default">
        <Container size="lg" className="py-12">
          <div className="glass-panel p-6 text-center text-sm text-red-600">
            <p className="font-semibold">Missing classificationId in query string.</p>
          </div>
        </Container>
      </Section>
    )
  }

  // Disable in production
  if (process.env.NODE_ENV === 'production') {
    return (
      <Section variant="default" background="default">
        <Container size="lg" className="py-12">
          <div className="glass-panel p-6 text-center text-sm text-glass-700">
            <p className="font-semibold">Tours list debug page disabled in production.</p>
          </div>
        </Container>
      </Section>
    )
  }

  let tours: Tour[] = []
  let error: string | null = null

  const headersList = await import('next/headers').then((m) => m.headers)
  const hdrs = headersList()
  const host = hdrs.get('host') || 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || ''
  const origin = envBase ? envBase : `${protocol}://${host}`

  try {
    const res = await fetch(
      `${origin}/api/atlantico/groups?lang=${encodeURIComponent(
        lang
      )}&page=-1&classificationId=${encodeURIComponent(String(classificationId))}`,
      { cache: 'no-store' }
    )

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      error = `HTTP ${res.status} ${res.statusText}${text ? ` – ${text.slice(0, 200)}` : ''}`
    } else {
      const data = (await res.json()) as { ok: boolean; groups: Tour[]; error?: string }
      if (data.ok && Array.isArray(data.groups)) {
        tours = data.groups
      } else {
        error = data.error || 'Invalid response format from /api/atlantico/groups'
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown error'
  }

  // Exclude: hardcoded codes + backoffice visibility
  const excludedCodes = ['222', '551', '492', '476', '514']
  let hiddenGroupIds: string[] = []
  try {
    const visRes = await fetch(`${origin}/api/backoffice/visibility`, { cache: 'no-store' })
    if (visRes.ok) {
      const vis = await visRes.json()
      hiddenGroupIds = vis.hiddenGroupIds || []
    }
  } catch {
    // Ignore
  }
  const allExcluded = [...new Set([...excludedCodes, ...hiddenGroupIds])]
  tours = tours.filter((t) => !allExcluded.includes(String(t.code ?? t.id ?? '').trim()))

  // Card images: ONLY from public/images/tours-list/{code}/cover.{jpg|png|webp}
  const toursWithImage: Tour[] = tours

  const statusMessage = error
    ? 'Erreur lors du chargement des tours'
    : `${tours.length} tour(s) chargé(s)`

  return (
    <>
      <Section variant="default" background="subtle">
        <Container size="lg">
          <div className="glass-panel p-6 md:p-8">
            <Stack direction="column" gap="md" align="start">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-glass-500">Atlantico · Debug</p>
                <h1 className="text-3xl md:text-4xl font-bold text-glass-900">
                  {classificationName}
                </h1>
                <p className="text-sm text-glass-600 space-x-4">
                  <span>
                    Langue API&nbsp;: <span className="font-mono">{lang}</span>
                  </span>
                  <span>
                    ID&nbsp;: <span className="font-mono">{classificationId}</span>
                  </span>
                  {classificationCode && (
                    <span>
                      Code&nbsp;: <span className="font-mono">{classificationCode}</span>
                    </span>
                  )}
                </p>
              </div>
              <div
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  error
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {statusMessage}
                {error && (
                  <span className="block text-xs text-red-500 mt-1">
                    Détail&nbsp;: {error}
                  </span>
                )}
              </div>
              <Link href="/debug/classifications" className="text-xs text-ocean-700 hover:underline">
                ← Retour aux classifications
              </Link>
            </Stack>
          </div>
        </Container>
      </Section>

      <Section variant="default" background="default">
        <Container size="lg" className="py-8">
          {tours.length === 0 && !error && (
            <div className="glass-panel p-6 text-center text-sm text-glass-600">
              Aucun tour retourné pour cette classification.
            </div>
          )}

          {toursWithImage.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {toursWithImage.map((t) => {
                const codeStr = String(t.code ?? t.id ?? '').trim()

                return (
                  <Link
                    key={`${t.id}-${t.code}`}
                    href={`/debug/group-details?code=${encodeURIComponent(codeStr)}`}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 rounded-2xl"
                  >
                    <article
                      className="glass-panel rounded-2xl border border-glass-200 overflow-hidden flex flex-col bg-white/90 hover:shadow-lg hover:-translate-y-1 smooth-transition cursor-pointer h-full"
                    >
                      {/* Image */}
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

                      {/* Content */}
                      <div className="p-4 md:p-5 space-y-3 flex-1 flex flex-col">
                        <h2 className="text-lg font-semibold text-glass-900 line-clamp-2">
                          {t.name}
                        </h2>
                        {t.desc && (
                          <p className="text-sm text-glass-700 leading-relaxed line-clamp-4">
                            {decodeTextFromApi(t.desc)}
                          </p>
                        )}
                        {!t.desc && (
                          <p className="text-sm text-glass-400 italic">
                            Aucune description.
                          </p>
                        )}
                        <div className="mt-auto flex items-center justify-between gap-4 text-base font-semibold text-glass-900">
                          <span>
                            {t.duration ? `⏱ ${t.duration} h` : '\u00A0'}
                          </span>
                          {t.price !== undefined && !Number.isNaN(t.price) ? (
                            <span className="text-right">
                              À partir de {Number(t.price).toFixed(2)} €
                            </span>
                          ) : (
                            <span className="text-right italic text-glass-400 font-normal">Prix non disponible</span>
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

