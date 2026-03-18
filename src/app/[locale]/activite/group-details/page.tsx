/**
 * Activité - Group details (tour detail page)
 *
 * Same content as debug group-details but available in production.
 * Used when clicking a tour card from /activite/[slug].
 */

import type { Metadata } from 'next'
import { mapLocaleToLang } from '@/lib/atlantico/locale'
import { Section, Container } from '@/ui/components/layout'
import { buildAtlanticoImageUrl } from '@/lib/atlantico/client'
import { extractImageUrls } from '@/lib/atlantico/images.client'
import { GROUP_DETAILS_IMAGES } from '@/data/group-details-images.generated'
import { getLocalGroupImages } from '@/lib/atlantico/get-local-group-images.server'
import { Link } from '@/navigation'
import { decodeTextFromApi } from '@/lib/atlantico/htmlAssets'
import type { Locale } from '@/i18n/request'
import { getAtlanticoTranslation } from '@/lib/translations/atlantico-full'
import { GroupDetails508LuxLayout } from '@/app/[locale]/debug/group-details/GroupDetails508LuxLayout.client'
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
  route?: string
  itinerary?: string
  willDo?: string
  [key: string]: unknown
}

const REVALIDATE = 300

export async function generateMetadata({ params, searchParams }: PageParams): Promise<Metadata> {
  const { locale } = await params
  const query = (await searchParams) || {}
  const code = query.code || 'tour'

  return {
    title: `Tour – ${code} – ${locale}`,
  }
}

export default async function ActiviteGroupDetailsPage({ params, searchParams }: PageParams) {
  const { locale } = await params
  const query = (await searchParams) || {}

  // Force stable Atlantico base language (ENG) regardless of site locale
  const lang = 'ENG'
  const code = query.code || ''
  const tActivite = await getTranslations({ locale, namespace: 'activite' })
  const tGroupDetails = await getTranslations({ locale, namespace: 'groupDetails' })

  if (!code) {
    return (
      <Section variant="default" background="default">
        <Container size="lg" className="py-12">
          <div className="glass-panel p-6 text-center text-sm text-red-600">
            <p className="font-semibold">{tActivite('missingCode')}</p>
          </div>
        </Container>
      </Section>
    )
  }

  let details: GroupDetails | null = null
  let error: string | null = null
  let groupImagesData: { images?: string[] } | null = null

  const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || ''
  const headersList = await import('next/headers').then((m) => m.headers)
  const hdrs = headersList()
  const host = hdrs.get('host') || 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const origin = envBase || `${protocol}://${host}`

  const fetchOpts = { next: { revalidate: REVALIDATE } } as const

  try {
    const [detailsRes, imagesRes] = await Promise.all([
      fetch(
        `${origin}/api/atlantico/group-details/${encodeURIComponent(code)}/ENG`,
        fetchOpts
      ),
      fetch(
        `${origin}/api/atlantico/group-images/${encodeURIComponent(code)}?lang=${encodeURIComponent(lang)}`,
        fetchOpts
      ),
    ])

    if (!detailsRes.ok) {
      const text = await detailsRes.text().catch(() => '')
      error = `HTTP ${detailsRes.status}${text ? ` – ${text.slice(0, 200)}` : ''}`
    } else {
      details = (await detailsRes.json()) as GroupDetails
    }

    if (imagesRes.ok) {
      groupImagesData = (await imagesRes.json()) as { images?: string[] }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown error'
  }

  const codeStr = String((details as { code?: string; Code?: string })?.code ?? (details as { code?: string; Code?: string })?.Code ?? code ?? '').trim()

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
  if (galleryUrls.length === 0 && groupImagesData?.images && groupImagesData.images.length > 0) {
    galleryUrls = groupImagesData.images
  }
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

  const eventIds: string[] =
    details?.ids && typeof details.ids === 'string'
      ? details.ids
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      : []

  if (details) {
    const cancellationPolicy =
      (details.canDesc as string) ||
      (details.canTitle as string) ||
      (details.cancellationPolicy as string) ||
      (details.cancellation_policy as string) ||
      (details.cancellation as string) ||
      undefined

    const itinerary =
      codeStr === '508'
        ? tGroupDetails('overview.itinerary508')
        : (details.route as string) || (details.itinerary as string) || undefined

    const rawName = decodeTextFromApi(details.name) || `Tour ${code}`
    const rawDesc = decodeTextFromApi(details.desc)
    const rawItinerary = itinerary
    const rawWillDo = codeStr !== '340' ? details.willDo : undefined
    const rawFaq = decodeTextFromApi(details.faq)
    const rawCancel = cancellationPolicy

    const loc = locale as Locale

    const translatedName = getAtlanticoTranslation(codeStr, loc, 'name', { fallback: rawName })
    const translatedDesc =
      rawDesc != null
        ? getAtlanticoTranslation(codeStr, loc, 'desc', { fallback: rawDesc })
        : undefined
    const translatedItinerary =
      rawItinerary != null
        ? getAtlanticoTranslation(codeStr, loc, 'desc', { fallback: rawItinerary })
        : undefined
    const translatedWillDo =
      rawWillDo != null
        ? getAtlanticoTranslation(codeStr, loc, 'willDo', {
            fallback: String(rawWillDo),
          })
        : undefined
    const translatedFaq =
      rawFaq != null
        ? getAtlanticoTranslation(codeStr, loc, 'faq', { fallback: rawFaq })
        : undefined
    const translatedCancel =
      rawCancel != null
        ? getAtlanticoTranslation(codeStr, loc, 'cancellationPolicy', {
            fallback: String(rawCancel),
          })
        : undefined
    const translatedChildAge =
      details.childAge != null
        ? getAtlanticoTranslation(codeStr, loc, 'childAge', {
            fallback: decodeTextFromApi(details.childAge),
          })
        : undefined
    const translatedInfantAge =
      details.infantAge != null
        ? getAtlanticoTranslation(codeStr, loc, 'infantAge', {
            fallback: decodeTextFromApi(details.infantAge),
          })
        : undefined

    return (
      <GroupDetails508LuxLayout
        heroUrl={heroUrl}
        galleryUrls={galleryUrls}
        name={translatedName}
        code={codeStr}
        duration={details.duration}
        price={details.price}
        desc={translatedDesc}
        itinerary={translatedItinerary}
        willDo={translatedWillDo}
        faq={translatedFaq}
        cancellationPolicy={translatedCancel}
        childAge={translatedChildAge}
        infantAge={translatedInfantAge}
        eventIds={eventIds}
        locale={locale}
        lang={lang}
      />
    )
  }

  return (
    <Section variant="default" background="default">
      <Container size="lg" className="py-12">
        <div className="glass-panel p-6 text-center">
          <p className="text-red-600 font-semibold">
            {error || tActivite('loadError')}
          </p>
          <Link href="/" className="text-ocean-700 hover:underline mt-4 inline-block">
            {tActivite('backToHome')}
          </Link>
        </div>
      </Container>
    </Section>
  )
}
