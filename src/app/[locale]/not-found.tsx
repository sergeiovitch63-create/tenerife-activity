import { Link } from '@/navigation'
import { Button } from '@/ui/components/shared/Button'
import { getTranslations } from 'next-intl/server'

export default async function NotFound() {
  const t = await getTranslations('notFound.page')
  
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-2xl md:text-3xl font-bold text-glass-900">
          {t('title')}
        </h1>
        <p className="text-glass-600">
          {t('description')}
        </p>
        <div>
          <Link href="/">
            <Button variant="primary" size="lg">
              {t('goToHome')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

