import { Section, Container, Stack } from '@/ui/components/layout'
import { MustSeeExperienceCard } from './MustSeeExperienceCard'
import { MustSeeViewTracker } from './MustSeeViewTracker'
import { experienceRepository } from '@/config/repositories'
import type { Metadata } from 'next'
import type { Experience } from '@/core/entities/experience'
import { getTranslations } from 'next-intl/server'

interface MustSeeCategory {
  title: string
  description: string
  experiences: Experience[]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata.mustSee' })

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function MustSeePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale })
  const allMustSee = await experienceRepository.findMustSee()

  // Organize into categories (max 4, max 12 experiences total)
  // Manual curation based on experience IDs and characteristics
  const categories: MustSeeCategory[] = [
    {
      title: t('mustSee.categories.teideNature'),
      description: t('mustSee.categories.teideNatureDesc'),
      experiences: allMustSee.filter(
        (exp) =>
          exp.id === '1' || // Teide Sunset Tour
          exp.id === '5' // Skip the Line: Teide Cable Car
      ),
    },
    {
      title: t('mustSee.categories.iconicAttractions'),
      description: t('mustSee.categories.iconicAttractionsDesc'),
      experiences: allMustSee.filter(
        (exp) =>
          exp.id === '2' || // Siam Park Ticket
          exp.id === '4' // Loro Parque Ticket
      ),
    },
    {
      title: t('mustSee.categories.cultureLocal'),
      description: t('mustSee.categories.cultureLocalDesc'),
      experiences: allMustSee.filter(
        (exp) =>
          exp.id === '6' || // Full Island Bus Tour
          exp.id === '3' // Private VIP Tour
      ),
    },
  ].filter((cat) => cat.experiences.length > 0)

  return (
    <>
      <MustSeeViewTracker />

      {/* Must-See Hero */}
      <Section variant="default" background="subtle">
        <Container size="lg">
          <div className="glass-panel p-6 md:p-8">
            <Stack direction="column" gap="md" align="start">
              <div className="space-y-3 max-w-3xl">
                <h1 className="text-4xl md:text-5xl font-bold text-glass-900">
                  {t('mustSee.title')}
                </h1>
                <p className="text-xl text-glass-600 leading-relaxed">
                  {t('mustSee.subtitle')}
                </p>
              </div>
            </Stack>
          </div>
        </Container>
      </Section>

      {/* Editorial Introduction */}
      <Section variant="tight" background="default">
        <Container size="lg">
          <div className="glass-panel p-4 md:p-6 max-w-2xl">
            <p className="text-base text-glass-700 leading-relaxed">
              {t('mustSee.introduction')}
            </p>
          </div>
        </Container>
      </Section>

      {/* Must-See Categories */}
      {categories.map((category, idx) => (
        <Section
          key={idx}
          variant="default"
          background={idx % 2 === 0 ? 'default' : 'subtle'}
        >
          <Container size="lg">
            <div className="glass-panel p-6 md:p-8">
              <Stack direction="column" gap="md">
                <div className="space-y-2">
                  <h2 className="text-2xl md:text-3xl font-bold text-glass-900">
                    {category.title}
                  </h2>
                  <p className="text-base text-glass-600">
                    {category.description}
                  </p>
                </div>

                {/* Experience Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {category.experiences.slice(0, 4).map((experience) => (
                    <MustSeeExperienceCard
                      key={experience.id}
                      experience={experience}
                    />
                  ))}
                </div>
              </Stack>
            </div>
          </Container>
        </Section>
      ))}

      {/* Trust Strip */}
      <Section variant="tight" background="subtle">
        <Container size="lg">
          <div className="glass-panel p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <p className="font-semibold text-glass-900 mb-1">
                  {t('mustSee.trust.handPicked')}
                </p>
                <p className="text-sm text-glass-600">
                  {t('mustSee.trust.handPickedDesc')}
                </p>
              </div>
              <div>
                <p className="font-semibold text-glass-900 mb-1">
                  {t('mustSee.trust.trustedPartners')}
                </p>
                <p className="text-sm text-glass-600">
                  {t('mustSee.trust.trustedPartnersDesc')}
                </p>
              </div>
              <div>
                <p className="font-semibold text-glass-900 mb-1">
                  {t('mustSee.trust.secureBooking')}
                </p>
                <p className="text-sm text-glass-600">
                  {t('mustSee.trust.secureBookingDesc')}
                </p>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  )
}







