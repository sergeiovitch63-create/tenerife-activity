/**
 * DEBUG PAGE - Atlantico groupDetails
 *
 * For a given tour code, displays full groupDetails payload:
 *   GET /api/atlantico/group-details/[code]/[lang]
 *
 * Fields highlighted: id, code, category, faq, desc, image, price, ids, video,
 * childAge, infantAge, duration.
 */

import type { Metadata } from 'next'
import { mapLocaleToLang } from '@/lib/atlantico/locale'
import { Section, Container, Stack } from '@/ui/components/layout'
import { buildAtlanticoImageUrl } from '@/lib/atlantico/client'
import { extractImageUrls } from '@/lib/atlantico/images.client'
import { GROUP_DETAILS_IMAGES } from '@/data/group-details-images.generated'
import { getLocalGroupImages } from '@/lib/atlantico/get-local-group-images.server'
import { Link } from '@/navigation'
import { decodeTextFromApi, sanitizeAtlanticoHtml } from '@/lib/atlantico/htmlAssets'
import { FaqSections } from '@/components/atlantico/FaqSections'
import { GroupDetails508LuxLayout } from './GroupDetails508LuxLayout.client'
import { GroupDetailsHeroCarousel } from './GroupDetailsHeroCarousel.client'
import { getTranslations } from 'next-intl/server'

interface PageParams {
  params: Promise<{ locale: string }>
  searchParams?: Promise<{ code?: string }>
}

type GroupDetails = {
  id?: string
  code?: string
  name?: string
  category?: string
  faq?: string
  desc?: string
  image?: string
  price?: string | number
  ids?: string
  video?: string
  childAge?: string
  infantAge?: string
  duration?: string | number
  [key: string]: unknown
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params, searchParams }: PageParams): Promise<Metadata> {
  const { locale } = await params
  const query = (await searchParams) || {}
  const code = query.code || 'tour'

  return {
    title: `Tour details – ${code} – ${locale}`,
  }
}

export default async function GroupDetailsDebugPage({ params, searchParams }: PageParams) {
  const { locale } = await params
  const query = (await searchParams) || {}

  const lang = mapLocaleToLang(locale) // Atlantico format: ENG, ESP, etc.
  const code = query.code || ''

  if (!code) {
    return (
      <Section variant="default" background="default">
        <Container size="lg" className="py-12">
          <div className="glass-panel p-6 text-center text-sm text-red-600">
            <p className="font-semibold">Missing tour code in query string.</p>
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
            <p className="font-semibold">Group details debug page disabled in production.</p>
          </div>
        </Container>
      </Section>
    )
  }

  let details: GroupDetails | null = null
  let error: string | null = null

  try {
    const headersList = await import('next/headers').then((m) => m.headers)
    const hdrs = headersList()
    const host = hdrs.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || ''
    const origin = envBase ? envBase : `${protocol}://${host}`

    const res = await fetch(
      `${origin}/api/atlantico/group-details/${encodeURIComponent(code)}/${encodeURIComponent(lang)}`,
      { cache: 'no-store' }
    )

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      error = `HTTP ${res.status} ${res.statusText}${text ? ` – ${text.slice(0, 200)}` : ''}`
    } else {
      details = (await res.json()) as GroupDetails
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown error'
  }

  const statusMessage = error
    ? 'Erreur lors du chargement du tour'
    : details
      ? 'Détails du tour chargés'
      : 'Aucune donnée de tour'

  const codeStr = String((details as { code?: string; Code?: string })?.code ?? (details as { code?: string; Code?: string })?.Code ?? code ?? '').trim()
  // Gallery images: local folder (no scan) > manifest > groupDetails > group-images API
  let galleryUrls: string[] = getLocalGroupImages(codeStr)
  if (galleryUrls.length === 0) {
    galleryUrls = GROUP_DETAILS_IMAGES[codeStr] ?? []
  }
  if (galleryUrls.length === 0 && details) {
    galleryUrls = extractImageUrls(details)
  }
  if (galleryUrls.length === 0 && details?.image) {
    const url = buildAtlanticoImageUrl(String(details.image))
    if (url) galleryUrls = [url]
  }
  // Fallback: fetch from group-images API (tries groupDetails + eventDetails + zeus pattern)
  if (galleryUrls.length === 0 && codeStr) {
    try {
      const headersList = await import('next/headers').then((m) => m.headers)
      const hdrs = headersList()
      const host = hdrs.get('host') || 'localhost:3000'
      const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
      const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || ''
      const origin = envBase || `${protocol}://${host}`
      const res = await fetch(
        `${origin}/api/atlantico/group-images/${encodeURIComponent(codeStr)}?lang=${encodeURIComponent(lang)}`,
        { cache: 'no-store' }
      )
      if (res.ok) {
        const data = (await res.json()) as { images?: string[] }
        if (data.images && Array.isArray(data.images) && data.images.length > 0) {
          galleryUrls = data.images
        }
      }
    } catch {
      // Ignore, keep galleryUrls empty
    }
  }
  // For 508: fallback to events folder or pictures (same as VIP tour pages)
  if (codeStr === '508' && galleryUrls.length === 0) {
    galleryUrls = [
      '/images/events/508/A.jpg',
      '/images/events/508/B.jpg',
      '/images/events/508/C.jpg',
      '/images/events/508/D.jpg',
      '/images/pictures/tours-vip/508/group-details-2.jpg',
      '/images/pictures/tours-vip/508/group-details-3.jpg',
      '/images/pictures/tours-vip/508/group-details-4.jpg',
      '/images/pictures/tours-vip/508/group-details-5.jpg',
    ].filter(Boolean)
  }
  // Skip first image (often white/placeholder in Atlantico responses)
  // Exception: 476, 492, 514, 551 or images from local folder (tours-vip) - keep ALL, no slice
  const MANUAL_HERO_CODES = ['476', '492', '514', '551']
  const isLocalFolderImage = galleryUrls[0]?.startsWith('/images/pictures/tours-vip/')
  const hadSingleWhiteImage = galleryUrls.length === 1
  if (!isLocalFolderImage) {
    if (galleryUrls.length > 1) {
      galleryUrls = galleryUrls.slice(1)
    } else if (galleryUrls.length === 1 && !MANUAL_HERO_CODES.includes(codeStr)) {
      galleryUrls = []
    }
  }

  // Hero image: prefer first gallery image, then Atlantico image (skip details.image when we removed the only white image)
  let heroUrl: string | null = galleryUrls[0] ?? null
  if (!heroUrl && !hadSingleWhiteImage && details?.image) {
    heroUrl = buildAtlanticoImageUrl(String(details.image))
  }
  if (!heroUrl) {
    if (codeStr === '508') {
      heroUrl = '/images/events/508/A.jpg'
    } else if (codeStr === '3') {
      heroUrl = '/images/home/must-see/row-1/Loro-Parque.png'
    } else if (MANUAL_HERO_CODES.includes(codeStr)) {
      const manual = GROUP_DETAILS_IMAGES[codeStr]
      heroUrl = (manual && manual[0]) ?? null
    }
  }
  const idsClean =
    details?.ids && typeof details.ids === 'string'
      ? details.ids
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
          .join(', ')
      : null
  const eventIds: string[] =
    details?.ids && typeof details.ids === 'string'
      ? details.ids
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      : []

  // Use 508 layout for all group details (same form for every group)
  if (details) {
    const cancellationPolicy =
      (details.canDesc as string) ||
      (details.canTitle as string) ||
      (details.cancellationPolicy as string) ||
      (details.cancellation_policy as string) ||
      (details.cancellation as string) ||
      undefined

    // Get translations for itinerary
    const tGroupDetails = await getTranslations({ locale, namespace: 'groupDetails' })
    const itinerary =
      codeStr === '508'
        ? tGroupDetails('overview.itinerary508')
        : (details.route as string) || (details.itinerary as string) || undefined

    return (
      <GroupDetails508LuxLayout
        heroUrl={heroUrl}
        galleryUrls={galleryUrls}
        name={decodeTextFromApi(details.name) || `Tour ${code}`}
        code={codeStr}
        duration={details.duration}
        price={details.price}
        desc={decodeTextFromApi(details.desc)}
        itinerary={itinerary}
        willDo={codeStr !== '340' ? details.willDo : undefined}
        faq={decodeTextFromApi(details.faq)}
        cancellationPolicy={cancellationPolicy}
        childAge={decodeTextFromApi(details.childAge)}
        infantAge={decodeTextFromApi(details.infantAge)}
        eventIds={eventIds}
        locale={locale}
        lang={lang}
      />
    )
  }

  return (
    <>
      <Section variant="default" background="subtle">
        <Container size="lg">
          <div className="glass-panel p-6 md:p-8">
            <Stack direction="column" gap="md" align="start">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-glass-500">Atlantico · Debug</p>
                <h1 className="text-3xl md:text-4xl font-bold text-glass-900">
                  {decodeTextFromApi(details?.name) || `Tour ${code}`}
                </h1>
                <p className="text-sm text-glass-600 space-x-4">
                  <span>
                    Code&nbsp;: <span className="font-mono">{details?.code || code}</span>
                  </span>
                  {details?.id && (
                    <span>
                      ID&nbsp;: <span className="font-mono">{details.id}</span>
                    </span>
                  )}
                  <span>
                    Langue API&nbsp;: <span className="font-mono">{lang}</span>
                  </span>
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
              <Link
                href="/debug/classifications"
                className="text-xs text-ocean-700 hover:underline"
              >
                ← Retour aux classifications
              </Link>
            </Stack>
          </div>
        </Container>
      </Section>

      <Section variant="default" background="default">
        <Container size="lg" className="py-10 space-y-10">
          {/* Hero carousel - same photo logic as 508 layout for all group details */}
          <div className="relative w-full overflow-hidden rounded-3xl bg-glass-100 shadow-xl">
            <GroupDetailsHeroCarousel
              galleryUrls={galleryUrls}
              heroUrl={heroUrl}
              alt={details?.name || `Tour ${code}`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent pointer-events-none" />

            {/* Overlay contenu hero */}
            <div className="absolute inset-x-6 bottom-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4 text-white">
              <div className="space-y-2 max-w-xl">
                <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-white/70">
                  Tour VIP Atlantico
                </p>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold leading-tight drop-shadow-sm">
                  {details?.name || `Tour ${code}`}
                </h1>
                <p className="text-xs md:text-sm text-white/80 space-x-3">
                  <span>
                    Code&nbsp;:{' '}
                    <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded-full text-[11px] md:text-xs">
                      {details?.code || code}
                    </span>
                  </span>
                  {details?.id && (
                    <span>
                      ID&nbsp;:{' '}
                      <span className="font-mono text-[11px] md:text-xs opacity-80">{details.id}</span>
                    </span>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 md:justify-end">
                {details?.duration && (
                  <div className="px-3 py-1.5 rounded-full bg-white/12 backdrop-blur text-[11px] md:text-xs flex items-center gap-1.5">
                    <span className="font-medium">Durée</span>
                    <span className="font-mono">{String(details.duration)} h</span>
                  </div>
                )}
                {details?.price != null && (
                  <div className="px-3 py-1.5 rounded-full bg-ocean-500/90 backdrop-blur text-[11px] md:text-xs font-semibold">
                    À partir de {String(details.price)} €
                  </div>
                )}
                {details?.childAge && (
                  <div className="px-3 py-1.5 rounded-full bg-white/12 backdrop-blur text-[11px] md:text-xs">
                    Enfants : {decodeTextFromApi(details.childAge)}
                  </div>
                )}
                {details?.infantAge && (
                  <div className="px-3 py-1.5 rounded-full bg-white/12 backdrop-blur text-[11px] md:text-xs">
                    Bébés&nbsp;: {details.infantAge}
                  </div>
                )}
                {details?.category && (
                  <div className="px-3 py-1.5 rounded-full bg-white/12 backdrop-blur text-[11px] md:text-xs">
                    Catégorie : {decodeTextFromApi(details.category)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contenu principal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Colonne gauche : description + photos */}
            <div className="space-y-6 lg:col-span-2">
              {details?.willDo && codeStr !== '340' && (
                <div className="glass-panel rounded-2xl p-5 md:p-6 space-y-3">
                  <h2 className="text-lg md:text-xl font-semibold text-glass-900">
                    What you do
                  </h2>
                  <div
                    className="prose prose-sm max-w-none text-glass-700 leading-relaxed"
                    dangerouslySetInnerHTML={sanitizeAtlanticoHtml(decodeTextFromApi(details.willDo))}
                  />
                </div>
              )}
              <div className="glass-panel rounded-2xl p-5 md:p-6 space-y-3">
                <h2 className="text-lg md:text-xl font-semibold text-glass-900">
                  Overview
                </h2>
                    {details?.desc ? (
                  (() => {
                    const plainDesc = decodeTextFromApi(details.desc).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
                    const sentences = plainDesc.split('. ').filter(Boolean)
                    const highlights = sentences.slice(0, 2)
                    return highlights.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 mb-3">
                        <span>🌟</span>
                        <span className="font-semibold text-gray-800">{s}{!s.endsWith('.') ? '.' : ''}</span>
                      </div>
                    ))
                  })()
                ) : (
                  <p className="text-sm text-glass-400 italic">Aucune description.</p>
                )}
              </div>

              {details?.desc && (() => {
                const plainDesc = decodeTextFromApi(details.desc).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
                const sentences = plainDesc.split('. ').filter(Boolean)
                const rest = sentences.slice(2).join('. ')
                return rest ? (
                  <div className="glass-panel rounded-2xl p-5 md:p-6 space-y-3">
                    <h2 className="text-lg md:text-xl font-semibold text-glass-900">Description</h2>
                    <p className="text-sm text-gray-500 leading-relaxed">{rest}{!rest.endsWith('.') && !rest.endsWith('!') && !rest.endsWith('?') ? '.' : ''}</p>
                  </div>
                ) : null
              })()}
            </div>

            {/* Colonne droite : inclus, vidéo, options */}
            <div className="space-y-6">
              <div className="glass-panel rounded-2xl p-5 md:p-6 space-y-3">
                <h2 className="text-lg md:text-xl font-semibold text-glass-900">
                  What's Included
                </h2>
                {details?.faq ? (
                  <FaqSections faq={details.faq} fallbackRaw />
                ) : (
                  <p className="text-sm text-glass-400 italic">
                    Aucune FAQ / informations incluses.
                  </p>
                )}
              </div>

              {details?.video && (
                <div className="glass-panel rounded-2xl p-4 md:p-5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-glass-900">
                      Vidéo de présentation
                    </h2>
                  </div>
                  <div className="aspect-video rounded-xl overflow-hidden bg-black/80">
                    <iframe
                      src={String(details.video)}
                      title="Tour video"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              <div className="glass-panel rounded-2xl p-5 md:p-6 space-y-3">
                <h2 className="text-lg md:text-xl font-semibold text-glass-900">
                  Options du tour
                </h2>
                <p className="text-xs text-glass-500">
                  Chaque option ouvre la page debug <span className="font-mono">eventDetails</span>.
                </p>
                {eventIds.length === 0 && (
                  <p className="text-xs text-glass-400 mt-1">Aucun eventId trouvé dans ids.</p>
                )}
                {eventIds.length > 0 && (
                  <ul className="space-y-1.5 text-xs mt-2">
                    {eventIds.map((eid) => (
                      <li key={eid}>
                        <Link
                          href={`/debug/event-details?eventId=${encodeURIComponent(eid)}`}
                          className="text-ocean-700 hover:underline font-semibold"
                        >
                          Option {eid} → détails eventDetails
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {idsClean && (
                  <p className="text-[11px] text-glass-400 mt-3">
                    Ids bruts&nbsp;: <span className="font-mono">{idsClean}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  )
}

