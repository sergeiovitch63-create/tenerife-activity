/**
 * Add to Cart Button Component
 * 
 * Button to add activity to cart with validation
 */

'use client'

import { useState } from 'react'
import { useRouter } from '@/navigation'
import { useTranslations } from 'next-intl'
import { useCartStore } from '@/lib/cart/store'
import { createCartItem, type PriceSnapshot } from '@/lib/cart/types'
import { Button } from '@/ui/components/shared/Button'
import { CartToast } from './CartToast'

interface AddToCartButtonProps {
  t_group: string
  t_id: string
  language: string
  tourDate: string | null // YYYY-MM-DD or null for calendarMode === 'none'
  sesTime: string | null // HH:mm or null for calendarMode === 'none'
  adults: number
  childs?: number
  infants?: number
  priceSnapshot: PriceSnapshot
  currency: string
  locale: string
  variant?: 'add' | 'finalize'
}

export function AddToCartButton({
  t_group,
  t_id,
  language,
  tourDate,
  sesTime,
  adults,
  childs = 0,
  infants = 0,
  priceSnapshot,
  currency,
  locale,
  variant = 'add',
}: AddToCartButtonProps) {
  const t = useTranslations('cart')
  const router = useRouter()
  const { addItem } = useCartStore()
  const [showToast, setShowToast] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validate = (): boolean => {
    if (!t_id) {
      setError(t('errors.noOption'))
      return false
    }
    if (!tourDate) {
      setError(t('errors.noDate'))
      return false
    }
    if (adults < 1) {
      setError(t('errors.noParticipants'))
      return false
    }
    return true
  }

  const handleAddToCart = () => {
    setError(null)

    if (!validate()) {
      return
    }

    try {
      const item = createCartItem({
        t_group,
        t_id,
        language,
        tourDate,
        sesTime: sesTime || '00:00',
        adults,
        childs,
        infants,
        priceSnapshot,
        currency,
      })

      addItem(item)

      if (variant === 'add') {
        setShowToast(true)
      } else {
        // Finalize: add to cart and go to cart
        router.push('/cart')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.addFailed'))
    }
  }

  return (
    <>
      <div className="space-y-2">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleAddToCart}
        >
          {variant === 'add' ? t('addToCart') : t('finalizePurchases')}
        </Button>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>

      {showToast && (
        <CartToast
          message={t('addedToCart')}
          onClose={() => setShowToast(false)}
          locale={locale}
        />
      )}
    </>
  )
}

