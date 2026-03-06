import { Section, Container, Stack } from '@/ui/components/layout'
import { PackCard } from '@/ui/components/packs'
import { getTranslations } from 'next-intl/server'
import { getGroupDetails } from '@/lib/atlantico'
import { mapLocaleToAtlanticoLang } from '@/lib/atlantico/lang'
import { decodeTextFromApi } from '@/lib/atlantico/htmlAssets'

/**
 * Activity Packs Section - 4 featured group details (168, 169, 102, 41)
 *
 * Fetches group details from Atlantico API and displays cards linking to activity pages.
 * Images: /images/tours-list/{code}/cover.png
 */
const GROUP_CODES = ['168', '169', '102', '41'] as const

function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return ''
  // First decode HTML entities, then strip HTML tags, then clean whitespace
  let cleaned = decodeTextFromApi(html)
  cleaned = cleaned.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 180)
  return cleaned
}

export async function ActivityPacksSection({ locale }: { locale: string }) {
  const t = await getTranslations('activityPacks')
  const lang = mapLocaleToAtlanticoLang(locale)

  // Fetch group details for each code
  const activityPacks = await Promise.all(
    GROUP_CODES.map(async (code) => {
      let title = `Activity ${code}`
      let description = ''

      try {
        const details = await getGroupDetails(code, lang)
        title = (details.name ?? details.Name ?? title) as string
        const rawDesc = (details.desc ?? details.description ?? '') as string
        description = stripHtml(rawDesc)
      } catch {
        // Fallback if API unavailable (e.g. during build)
      }

      const imagePath = `/images/tours-list/${code}/cover.png`

      return {
        id: code,
        slug: code,
        title,
        description: description || t('subtitle'),
        image: imagePath,
        href: `/activities/${code}`,
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
