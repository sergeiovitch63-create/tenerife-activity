import { Section, Container, Stack } from '@/ui/components/layout'
import { InspiredPageClient } from './InspiredPageClient'
import { vibeRepository } from '@/config/repositories'
import { experienceRepository } from '@/config/repositories'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata.inspired' })

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function InspiredPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale })

  // Load all data on server
  const [allVibes, allExperiences] = await Promise.all([
    vibeRepository.findAll(),
    experienceRepository.findAll(),
  ])

  return (
    <>
      {/* Page Header */}
      <Section variant="default" background="subtle">
        <Container size="lg">
          <div className="glass-panel p-6 md:p-8">
            <Stack direction="column" gap="md" align="start">
              <div className="space-y-3 max-w-2xl">
                <h1 className="text-4xl md:text-5xl font-bold text-glass-900">
                  {t('inspired.title')}
                </h1>
                <p className="text-xl text-glass-600 leading-relaxed">
                  {t('inspired.subtitle')}
                </p>
              </div>
            </Stack>
          </div>
        </Container>
      </Section>

      {/* Interactive Recommendations */}
      <InspiredPageClient allVibes={allVibes} allExperiences={allExperiences} />
    </>
  )
}








