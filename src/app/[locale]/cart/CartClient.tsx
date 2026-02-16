/**
 * Cart Client Component
 * 
 * Client-side cart management UI
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCartStore } from '@/lib/cart/store'
import { isCartItemExpired } from '@/lib/cart/types'
import { Section, Container } from '@/ui/components/layout'
import { Button } from '@/ui/components/shared/Button'
import { cn } from '@/ui/lib/cn'

interface CartClientProps {
  locale: string
}

export function CartClient({ locale }: CartClientProps) {
  const t = useTranslations('cart')
  const router = useRouter()
  const { items, removeItem, updateItem, getTotal, getCurrency, removeExpired } = useCartStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    removeExpired()
  }, [removeExpired])

  // Filter out expired items
  const validItems = mounted ? items.filter((item) => !isCartItemExpired(item)) : []

  const total = getTotal()
  const currency = getCurrency() || 'EUR'

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr + 'T00:00:00')
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date)
    } catch {
      return dateStr
    }
  }

  if (!mounted) {
    return <div>{t('loading')}</div>
  }

  if (validItems.length === 0) {
    return (
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-glass-900 mb-4">{t('title')}</h1>
        <p className="text-lg text-glass-600 mb-8">{t('empty')}</p>
        <Button onClick={() => router.push(`/${locale}`)} variant="primary">
          {t('continueShopping')}
        </Button>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-4xl font-bold text-glass-900 mb-8">{t('title')}</h1>

      <div className="space-y-6">
        {validItems.map((item) => (
          <div
            key={item.itemKey}
            className="bg-white border border-glass-200 rounded-lg p-6 shadow-sm"
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-glass-900 mb-2">
                  {t('itemTitle', { t_group: item.t_group, t_id: item.t_id })}
                </h3>
                <div className="space-y-1 text-sm text-glass-600">
                  <p>
                    <strong>{t('date')}:</strong> {item.tourDate ? formatDate(item.tourDate) : t('dateNotSelected')}
                  </p>
                  {item.sesTime && item.sesTime !== '00:00' && (
                    <p>
                      <strong>{t('time')}:</strong> {item.sesTime}
                    </p>
                  )}
                  <p>
                    <strong>{t('participants')}:</strong>{' '}
                    {item.adults > 0 && `${item.adults} ${t('adults')}`}
                    {item.childs > 0 && `, ${item.childs} ${t('children')}`}
                    {item.infants > 0 && `, ${item.infants} ${t('infants')}`}
                  </p>
                  <p>
                    <strong>{t('language')}:</strong> {item.language}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="text-2xl font-bold text-glass-900">
                  {formatPrice(item.priceSnapshot.total)}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // TODO: Implement edit functionality (open modal or navigate to activity page)
                      router.push(`/${locale}/activities/${item.t_id}`)
                    }}
                  >
                    {t('edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.itemKey)}
                    className="text-red-600 hover:text-red-700"
                  >
                    {t('remove')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-glass-50 border border-glass-200 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xl font-semibold text-glass-900">{t('total')}</span>
          <span className="text-3xl font-bold text-glass-900">{formatPrice(total)}</span>
        </div>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => router.push(`/${locale}/checkout`)}
        >
          {t('proceedToCheckout')}
        </Button>
      </div>
    </div>
  )
}















