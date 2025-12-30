import { Section, Container, Stack } from '@/ui/components/layout'
import { Button } from '@/ui/components/shared/Button'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { buildMetadata } from '@/lib/seo'
import { type Locale } from '@/i18n/request'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'seo' })
  
  return buildMetadata({
    locale: locale as Locale,
    pathname: '/partners',
    title: t('partners.title'),
    description: t('partners.description'),
  })
}

export default async function PartnersPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'partners' })

  return (
    <>
      {/* Hero Section */}
      <Section variant="default" background="default" className="pt-24 md:pt-32 pb-12 md:pb-16">
        <Container size="lg">
          <Stack direction="column" gap="md" align="center">
            <div className="text-center space-y-4 max-w-3xl mx-auto px-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.35)' }}>
                {t('hero.title')}
              </h1>
              <p className="text-lg md:text-xl text-white/85 leading-relaxed" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.35)' }}>
                {t('hero.subtitle')}
              </p>
            </div>
          </Stack>
        </Container>
      </Section>

      {/* How It Works */}
      <Section variant="default" background="default">
        <Container size="lg">
          <Stack direction="column" gap="lg">
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                {t('howItWorks.title')}
              </h2>
              <div className="space-y-4 text-white/90 leading-relaxed">
                <p className="text-lg">
                  {t('howItWorks.paragraph1')}
                </p>
                <p className="text-lg">
                  {t('howItWorks.paragraph2')}
                </p>
              </div>
            </div>
          </Stack>
        </Container>
      </Section>

      {/* Why It Benefits Accommodations */}
      <Section variant="default" background="default">
        <Container size="lg">
          <Stack direction="column" gap="lg">
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                {t('benefits.title')}
              </h2>
              <div className="space-y-4 text-white/90 leading-relaxed">
                <p className="text-lg">
                  {t('benefits.paragraph1')}
                </p>
                <p className="text-lg">
                  {t('benefits.paragraph2')}
                </p>
                <p className="text-lg">
                  {t('benefits.paragraph3')}
                </p>
              </div>
            </div>
          </Stack>
        </Container>
      </Section>

      {/* What Partners Earn */}
      <Section variant="default" background="default">
        <Container size="lg">
          <Stack direction="column" gap="lg">
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                {t('earnings.title')}
              </h2>
              <div className="space-y-4 text-white/90 leading-relaxed">
                <p className="text-lg">
                  {t('earnings.paragraph1', { 
                    commission: t('earnings.commission') 
                  }).split(t('earnings.commission')).map((part, i, arr) => 
                    i === 0 ? (
                      <span key={i}>
                        {part}
                        <strong className="text-white font-semibold">{t('earnings.commission')}</strong>
                      </span>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </p>
                <p className="text-lg">
                  {t('earnings.paragraph2')}
                </p>
                <p className="text-lg">
                  {t('earnings.paragraph3')}
                </p>
              </div>
            </div>
          </Stack>
        </Container>
      </Section>

      {/* What You Don't Have to Manage */}
      <Section variant="default" background="default">
        <Container size="lg">
          <Stack direction="column" gap="lg">
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                {t('management.title')}
              </h2>
              <div className="space-y-4 text-white/90 leading-relaxed">
                <p className="text-lg">
                  {t('management.paragraph1')}
                </p>
                <ul className="space-y-3 list-none">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-ocean-400 mt-2.5" />
                    <span>{t('management.items.selection')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-ocean-400 mt-2.5" />
                    <span>{t('management.items.booking')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-ocean-400 mt-2.5" />
                    <span>{t('management.items.payment')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-ocean-400 mt-2.5" />
                    <span>{t('management.items.suppliers')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-ocean-400 mt-2.5" />
                    <span>{t('management.items.marketing')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-ocean-400 mt-2.5" />
                    <span>{t('management.items.technology')}</span>
                  </li>
                </ul>
                <p className="text-lg">
                  {t('management.paragraph2')}
                </p>
              </div>
            </div>
          </Stack>
        </Container>
      </Section>

      {/* Legal & Professional Framework */}
      <Section variant="default" background="default">
        <Container size="lg">
          <Stack direction="column" gap="lg">
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                {t('legal.title')}
              </h2>
              <div className="space-y-4 text-white/90 leading-relaxed">
                <p className="text-lg">
                  {t('legal.paragraph1')}
                </p>
                <p className="text-lg">
                  {t('legal.paragraph2')}
                </p>
                <p className="text-lg">
                  {t('legal.paragraph3')}
                </p>
                <p className="text-lg">
                  {t('legal.paragraph4')}
                </p>
              </div>
            </div>
          </Stack>
        </Container>
      </Section>

      {/* CTA Section */}
      <Section variant="default" background="default" className="pb-24 md:pb-32">
        <Container size="lg">
          <Stack direction="column" gap="lg" align="center">
            <div className="text-center space-y-6 max-w-2xl">
              <p className="text-lg md:text-xl text-white/90 leading-relaxed">
                {t('cta.question')}
              </p>
              <Button variant="secondary" size="lg" disabled>
                {t('cta.button')}
              </Button>
              <p className="text-sm text-white/70">
                {t('cta.disclaimer')}
              </p>
            </div>
          </Stack>
        </Container>
      </Section>
    </>
  )
}
