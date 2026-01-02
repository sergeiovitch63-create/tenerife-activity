import { Section, Container, Stack } from '@/ui/components/layout'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'demo' })

  return {
    title: `${t('title')} | Tenerife Activity`,
    description: t('subtitle'),
  }
}

export default async function DemoPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'demo' })

  return (
    <>
      <Section variant="default" background="subtle">
        <Container size="lg">
          <div className="glass-panel p-6 md:p-8">
            <Stack direction="column" gap="md" align="start">
              <h1 className="text-4xl md:text-5xl font-bold text-glass-900">
                {t('title')}
              </h1>
              <p className="text-xl text-glass-600 leading-relaxed max-w-3xl">
                {t('subtitle')}
              </p>
            </Stack>
          </div>
        </Container>
      </Section>
    </>
  )
}








