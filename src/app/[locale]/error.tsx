'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/ui/components/shared/Button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
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
          <a
            href="/"
            className="inline-flex items-center justify-center font-medium px-8 py-4 text-lg bg-glass-200 text-glass-900 hover:bg-glass-300 active:bg-glass-400 rounded-lg transition-all"
          >
            {t('goToHome')}
          </a>
        </div>
      </div>
    </div>
  )
}



