import { Section, Container, Stack } from '@/ui/components/layout'
import { PackCard } from '@/ui/components/packs'
import { getTranslations } from 'next-intl/server'

/**
 * Static Activity Packs Data - Exactly 4 packs
 * 
 * Image structure: /images/activity-packs/{pack-slug}/{pack-slug}.jpg
 * Each pack has its own folder for easy image management.
 */
const packSlugs = ['twin-ticket', 'two-parks-ticket', 'special-packs', 'booster-packs'] as const

export async function ActivityPacksSection() {
  const t = await getTranslations('activityPacks')

  // Build pack data with translations
  const activityPacks = packSlugs.map((slug) => ({
    id: slug,
    slug,
    title: t(`packs.${slug}.title`),
    category: t(`packs.${slug}.category`),
    badge: t(`packs.${slug}.badge`),
    description: t(`packs.${slug}.description`),
    image: `/images/activity-packs/${slug}/${slug}.jpg`,
  }))

  return (
    <Section variant="default" background="default">
      <Container size="lg">
        <Stack direction="column" gap="lg">
          {/* Section Header */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
              {t('title')}
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto leading-relaxed font-light drop-shadow-md">
              {t('subtitle')}
            </p>
          </div>

          {/* Static Grid - 4 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {activityPacks.map((pack, index) => (
              <div
                key={pack.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s`, opacity: 0 }}
              >
                <PackCard pack={pack} />
              </div>
            ))}
          </div>
        </Stack>
      </Container>
    </Section>
  )
}



