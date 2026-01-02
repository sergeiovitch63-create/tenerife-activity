'use client'

import { useEffect } from 'react'
import { Button } from '@/ui/components/shared/Button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console
    console.error('Error caught by root error boundary:', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-2xl md:text-3xl font-bold text-glass-900">
          Something went wrong
        </h1>
        <p className="text-glass-600">
          An unexpected error occurred. Please try again.
        </p>
        <div>
          <Button onClick={reset} variant="primary" size="lg">
            Try again
          </Button>
        </div>
      </div>
    </div>
  )
}





