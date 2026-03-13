/**
 * DEBUG PAGE - Atlantico Classifications
 *
 * DEV ONLY – lists all classifications returned by:
 *   GET /api/atlantico/classifications?lang=XXX
 *
 * UI is aligned with current site style (Section/Container, cards).
 */

import type { Metadata } from 'next'
import { mapLocaleToLang } from '@/lib/atlantico/locale'
import { Section, Container, Stack } from '@/ui/components/layout'
import { buildAtlanticoImageUrl } from '@/lib/atlantico/client'
import { Link } from '@/navigation'
import { decodeTextFromApi } from '@/lib/atlantico/htmlAssets'
import { getTranslations } from 'next-intl/server'

interface PageParams {
  params: Promise<{ locale: string }>
}

type Classification = {
  id: string | number
  code: string
  name: string
  desc?: string
  image?: string
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params
  return {
    title: `Atlantico Classifications Debug – ${locale}`,
  }
}

export default async function ClassificationsDebugPage({ params }: PageParams) {
  const { locale } = await params
  const tCommon = await getTranslations('common')
  const lang = mapLocaleToLang(locale)

  // Disable in production for safety
  if (process.env.NODE_ENV === 'production') {
    return (
      <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
        <div
          style={{
            background: '#fee',
            border: '2px solid #f00',
            padding: '1rem',
            marginBottom: '1rem',
            borderRadius: '4px',
          }}
        >
          <strong>Classifications debug page disabled in production</strong>
        </div>
      </div>
    )
  }

  let classifications: Classification[] = []
  let error: string | null = null

  try {
    // Build absolute URL for Server Component fetch (same pattern as vibe page)
    const headersList = await import('next/headers').then((m) => m.headers)
    const hdrs = headersList()
    const host = hdrs.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || ''
    const origin = envBase ? envBase : `${protocol}://${host}`

    const res = await fetch(
      `${origin}/api/atlantico/classifications?lang=${encodeURIComponent(lang)}`,
      { cache: 'no-store' }
    )

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      error = `HTTP ${res.status} ${res.statusText}${text ? ` – ${text.slice(0, 200)}` : ''}`
    } else {
      const data = (await res.json()) as { ok: boolean; classifications: Classification[]; error?: string }
      if (data.ok && Array.isArray(data.classifications)) {
        classifications = data.classifications
      } else {
        error = data.error || 'Invalid response format from /api/atlantico/classifications'
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown error'
  }

  const statusMessage = error
    ? 'Erreur lors du chargement des classifications'
    : `${classifications.length} classification(s) chargée(s)`

  return (
    <>
      <Section variant="default" background="subtle">
        <Container size="lg">
          <div className="glass-panel p-6 md:p-8">
            <Stack direction="column" gap="md" align="start">
              <div className="flex flex-wrap items-start justify-between gap-4 w-full">
                <div className="space-y-2">
                  <h1 className="text-3xl md:text-4xl font-bold text-glass-900">
                    Atlantico – Tour lists (Classifications)
                  </h1>
                  <p className="text-glass-600">
                    Langue API&nbsp;: <span className="font-mono">{lang}</span>
                  </p>
                </div>
                <Link
                  href={`/${locale}/backoffice`}
                  className="px-4 py-2 bg-ocean-600 text-white text-sm font-medium rounded-lg hover:bg-ocean-700"
                >
                  Backoffice (visibilité) →
                </Link>
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
            </Stack>
          </div>
        </Container>
      </Section>

      <Section variant="default" background="default">
        <Container size="lg" className="py-8">
          {classifications.length === 0 && !error && (
            <div className="glass-panel p-6 text-center text-sm text-glass-600">
              Aucune classification retournée.
            </div>
          )}

          {classifications.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classifications.map((c) => {
                const imageUrl = c.image ? buildAtlanticoImageUrl(c.image) : null
                const href = `/debug/tours-list?classificationId=${encodeURIComponent(
                  String(c.id)
                )}&classificationCode=${encodeURIComponent(c.code)}&classificationName=${encodeURIComponent(
                  c.name
                )}`
                return (
                  <Link
                    key={`${c.id}-${c.code}`}
                    href={href}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 focus-visible:ring-offset-glass-50 rounded-2xl"
                  >
                    <article className="glass-panel rounded-2xl border border-glass-200 overflow-hidden flex flex-col bg-white/90 hover:shadow-lg hover:-translate-y-1 smooth-transition">
                      {/* Image */}
                      <div className="relative w-full aspect-[4/3] bg-glass-100 overflow-hidden">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={c.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-glass-400 text-sm">
                            {tCommon('noImage')}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4 md:p-5 space-y-3 flex-1 flex flex-col">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="text-lg font-semibold text-glass-900 line-clamp-2">
                            {decodeTextFromApi(c.name)}
                          </h2>
                          <span className="inline-flex items-center rounded-full bg-ocean-50 px-2 py-0.5 text-xs font-semibold text-ocean-700">
                            Code {c.code}
                          </span>
                        </div>
                        <p className="text-xs text-glass-500 font-mono">
                          ID&nbsp;: {c.id}
                        </p>
                        {c.desc && (
                          <p className="text-sm text-glass-700 leading-relaxed line-clamp-4">
                            {decodeTextFromApi(c.desc)}
                          </p>
                        )}
                        {!c.desc && (
                          <p className="text-sm text-glass-400 italic">
                            Aucune description.
                          </p>
                        )}
                        <p className="text-xs font-semibold text-ocean-700 mt-1">
                          Voir les tours de cette classification →
                        </p>
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

