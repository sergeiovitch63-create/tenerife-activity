'use client'

import { useEffect } from 'react'
import { useRouter } from '@/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/ui/components/shared/Button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const t = useTranslations('error')

  useEffect(() => {
    // Log the error to console
    console.error('Error caught by locale error boundary:', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-2xl md:text-3xl font-bold text-glass-900">
          {t('title')}
        </h1>
        <p className="text-glass-600">
          {t('description')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={reset} variant="primary" size="lg">
            {t('tryAgain')}
          </Button>
          <Button
            onClick={() => router.push('/')}
            variant="secondary"
            size="lg"
          >
            {t('goToHome')}
          </Button>
        </div>
      </div>
    </div>
  )
}



