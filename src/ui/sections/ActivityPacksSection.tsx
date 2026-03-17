import { Section, Container, Stack } from '@/ui/components/layout'
import { PackCard } from '@/ui/components/packs'
import { getTranslations } from 'next-intl/server'
import { getGroupDetails } from '@/lib/atlantico'
import { mapLocaleToAtlanticoLang } from '@/lib/atlantico/lang'
import { decodeTextFromApi } from '@/lib/atlantico/htmlAssets'
import { buildAtlanticoImageUrl } from '@/lib/atlantico/client'

const GROUP_CODES = ['168', '169', '102', '41'] as const

// Static cover images stored in public/images/home/must-see/*
// Order must match GROUP_CODES.
const MUST_SEE_STATIC_IMAGES: string[] = [
  '/images/home/must-see/Loro-Parque.png', // Twin Ticket (Loro + Siam)
  '/images/home/must-see/Aqualand.png',    // Two Parks Ticket (Aqualand + Jungle)
  '/images/home/must-see/buggy.jpg',       // Booster Packs (adrenaline / ocean)
  '/images/home/must-see/scandal-dinner-show.jpg', // Special Packs (evening shows / water)
]

function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return ''
  // First decode HTML entities, then strip HTML tags, then clean whitespace
  let cleaned = decodeTextFromApi(html)
  cleaned = cleaned.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 180)
  return cleaned
}

export async function ActivityPacksSection({ locale }: { locale: string }) {
  const t = await getTranslations('activityPacks')
  const tCommon = await getTranslations('common')
  const lang = mapLocaleToAtlanticoLang(locale)

  // Static covers for when Atlantico images are missing
  const staticImageFallback = (index: number) =>
    MUST_SEE_STATIC_IMAGES[index] || '/images/hero-poster.jpg'
  // Generic fallback of last resort
  const genericFallbackImage = '/images/hero-poster.jpg'

  // Fetch group details for each code (including images)
  const activityPacks = await Promise.all(
    GROUP_CODES.map(async (code, index) => {
      let title = tCommon('activityFallback', { code })
      let description = ''
      let image: string = ''
      // Fallback used when the primary Atlantico image fails to load
      let fallbackImage: string | undefined = staticImageFallback(index) || genericFallbackImage
      let fromPrice: number | null = null

      try {
        const details = await getGroupDetails(code, lang)
        title = (details.name ?? details.Name ?? title) as string
        const rawDesc = (details.desc ?? details.description ?? '') as string
        description = stripHtml(rawDesc)

        // "À partir de" price – use groupDetails.price when available
        const rawPrice = details.price
        if (typeof rawPrice === 'number') {
          fromPrice = rawPrice
        } else if (typeof rawPrice === 'string') {
          const normalized = rawPrice.replace(',', '.')
          const parsed = parseFloat(normalized)
          if (Number.isFinite(parsed)) {
            fromPrice = parsed
          }
        }

        // Use first Atlantico image (group cover / tour list) as primary
        let imageFilename: string | null = null
        if (details.image && typeof details.image === 'string' && details.image.trim()) {
          imageFilename = (details.image as string).trim()
        } else if (Array.isArray(details.images) && details.images.length > 0) {
          const first = details.images[0]
          if (typeof first === 'string' && first.trim()) {
            imageFilename = first.trim()
          }
        }
        if (imageFilename) {
          const url = buildAtlanticoImageUrl(imageFilename)
          if (url) {
            image = url
          }
        }
      } catch {
        // Fallback if API unavailable (e.g. during build)
      }

      if (!image) {
        image = fallbackImage ?? genericFallbackImage
      }

      return {
        id: code,
        slug: code,
        title,
        description: description || t('subtitle'),
        image,
        fallbackImage,
        href: `/activite/group-details?code=${encodeURIComponent(code)}`,
        fromPrice,
      }
    })
  )

  return (
    <Section variant="default" background="default">
      <Container size="lg">
        <Stack direction="column" gap="lg">
          {/* Section Header */}
          <div className="text-center space-y-5">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white drop-shadow-lg tracking-tight">
              {t('title')}
            </h2>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed font-light drop-shadow-md">
              {t('subtitle')}
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {activityPacks.map((pack, index) => (
              <div
                key={pack.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s`, opacity: 0 }}
              >
                <PackCard pack={pack} href={pack.href} />
              </div>
            ))}
          </div>
        </Stack>
      </Container>
    </Section>
  )
}
