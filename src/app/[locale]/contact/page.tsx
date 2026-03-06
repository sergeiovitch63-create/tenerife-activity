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

      {/* Contact Block - Card WhatsApp + Email */}
      <Section variant="default" background="default">
        <Container size="lg">
          <Stack direction="column" gap="lg" align="center">
            <div className="w-full max-w-2xl mx-auto space-y-8">
              {/* Card: WhatsApp + Email */}
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-glass-200/50 overflow-hidden">
                <div className="p-6 md:p-8 space-y-6">
                  <h2 className="text-xl md:text-2xl font-bold text-glass-900 text-center">
                    {t('title')}
                  </h2>
                  <p className="text-center text-glass-600 text-sm md:text-base">
                    {t('fastReply')}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-emerald-50 border border-emerald-200/80 hover:bg-emerald-100 hover:border-emerald-300 transition-all"
                    >
                      <span className="text-3xl" aria-hidden>💬</span>
                      <span className="font-semibold text-glass-900">{t('whatsapp')}</span>
                      <span className="text-sm text-glass-600 font-mono">+34 614 89 11 53</span>
                    </a>
                    <a
                      href={`mailto:${contactEmail}`}
                      className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-ocean-50 border border-ocean-200/80 hover:bg-ocean-100 hover:border-ocean-300 transition-all"
                    >
                      <span className="text-3xl" aria-hidden>✉️</span>
                      <span className="font-semibold text-glass-900">{t('email')}</span>
                      <span className="text-sm text-glass-600 break-all text-center">{contactEmail}</span>
                    </a>
                  </div>
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


