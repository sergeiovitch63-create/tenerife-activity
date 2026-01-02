import { Section, Container, Stack } from '@/ui/components/layout'
import { Button } from '@/ui/components/shared/Button'
import { Link } from '@/navigation'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { buildMetadata } from '@/lib/seo'
import { type Locale } from '@/i18n/request'
import { whatsappUrl, contactEmail } from '@/config/contact'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'seo' })
  
  return buildMetadata({
    locale: locale as Locale,
    pathname: '/contact',
    title: t('contact.title'),
    description: t('contact.description'),
  })
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'contact' })

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

      {/* Contact Block */}
      <Section variant="default" background="default">
        <Container size="lg">
          <Stack direction="column" gap="lg" align="center">
            <div className="w-full max-w-2xl mx-auto space-y-8">
              {/* Main Contact */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 md:p-8 space-y-6">
                <div className="space-y-4">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="primary" size="lg" fullWidth>
                      {t('whatsapp')}
                    </Button>
                  </a>
                  <a
                    href={`mailto:${contactEmail}`}
                    className="block text-center text-white/90 hover:text-white transition-colors"
                  >
                    {t('email')}: {contactEmail}
                  </a>
                  <p className="text-sm text-white/70 text-center">
                    {t('fastReply')}
                  </p>
                </div>
              </div>

              {/* For Partners */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 md:p-8 space-y-4">
                <h2 className="text-xl md:text-2xl font-bold text-white">
                  {t('forPartners')}
                </h2>
                <p className="text-white/90">
                  {t('forPartnersDescription')}
                </p>
                <Link href="/partners">
                  <Button variant="secondary" size="md" fullWidth>
                    {t('partnersCta')}
                  </Button>
                </Link>
              </div>
            </div>
          </Stack>
        </Container>
      </Section>
    </>
  )
}


