import { Section, Container } from '@/ui/components/layout'
import { Link } from '@/navigation'
import { Button } from '@/ui/components/shared'
import { getTranslations } from 'next-intl/server'

export default async function NotFound({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'notFound.experience' })

  return (
    <Section variant="default" background="default">
      <Container size="lg">
        <div className="glass-panel p-6 md:p-8 text-center py-16 space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold text-glass-900">
            {t('title')}
          </h1>
          <p className="text-lg text-glass-600 max-w-md mx-auto">
            {t('description')}
          </p>
          <Link href="/">
            <Button variant="primary" size="lg">
              {t('backToHome')}
            </Button>
          </Link>
        </div>
      </Container>
    </Section>
  )
}






