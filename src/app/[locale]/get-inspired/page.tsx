import { Section, Container, Stack } from '@/ui/components/layout'
import { GetInspiredQuiz } from '@/ui/components/get-inspired/GetInspiredQuiz.client'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
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
    pathname: '/get-inspired',
    title: t('getInspired.title'),
    description: t('getInspired.description'),
  })
}

export default async function GetInspiredPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'getInspired.hero' })

  return (
    <>
      {/* Hero Section */}
      <Section variant="default" background="default" className="pt-24 md:pt-32 pb-12 md:pb-16">
        <Container size="lg">
          <Stack direction="column" gap="md" align="center">
            <div className="text-center space-y-4 max-w-3xl mx-auto px-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.35)' }}>
                {t('title')}
              </h1>
              <p className="text-lg md:text-xl text-white/85 leading-relaxed" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.35)' }}>
                {t('subtitle')}
              </p>
            </div>
          </Stack>
        </Container>
      </Section>

      {/* Quiz Section */}
      <Section variant="default" background="default" className="py-8 md:py-12">
        <GetInspiredQuiz />
      </Section>
    </>
  )
}
