/**
 * Cart Toast Component
 * 
 * Simple toast notification for cart actions
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/navigation'
import { Button } from '@/ui/components/shared/Button'
import { cn } from '@/ui/lib/cn'

interface CartToastProps {
  message: string
  onClose: () => void
  locale: string
}

export function CartToast({ message, onClose, locale }: CartToastProps) {
  const router = useRouter()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300) // Wait for animation
    }, 5000) // Auto-close after 5 seconds

    return () => clearTimeout(timer)
  }, [onClose])

  const handleViewCart = () => {
    router.push('/cart')
    onClose()
  }

  if (!visible) return null

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50',
        'bg-white border border-glass-200 rounded-lg shadow-lg p-4',
        'min-w-[300px] max-w-md',
        'animate-slide-up'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-glass-900 mb-2">{message}</p>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleViewCart}>
              View Cart
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Continue
            </Button>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-glass-400 hover:text-glass-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

