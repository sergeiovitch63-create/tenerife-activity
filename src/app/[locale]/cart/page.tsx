/**
 * Cart Page
 * 
 * Displays cart items with edit/remove functionality
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { useCartStore } from '@/lib/cart/store'
import type { CartItem } from '@/lib/cart/types'
import { Button } from '@/ui/components/shared/Button'
import { Section, Container } from '@/ui/components/layout'
import { isCartItemExpired } from '@/lib/cart/types'

export default function CartPage() {
  const t = useTranslations('cart')
  const locale = useLocale()
  const router = useRouter()
  const { items, removeItem, updateItem, removeExpired, getTotal, getCurrency } = useCartStore()
  const [mounted, setMounted] = useState(false)

  // Remove expired items on mount
  useEffect(() => {
    setMounted(true)
    removeExpired()
  }, [removeExpired])

  // Filter out expired items
  const validItems = items.filter((item) => !isCartItemExpired(item))
  const total = getTotal()
  const currency = getCurrency() || 'EUR'

  const handleRemove = (itemKey: string) => {
    if (confirm(t('remove') + '?')) {
      removeItem(itemKey)
    }
  }

  const handleProceedToCheckout = () => {
    if (validItems.length === 0) {
      alert(t('empty'))
      return
    }
    router.push('/checkout')
  }

  if (!mounted) {
    return (
      <Section variant="default" background="default">
        <Container size="lg">
          <div className="py-12 text-center">
            <p className="text-glass-600">{t('loading')}</p>
          </div>
        </Container>
      </Section>
    )
  }

  if (validItems.length === 0) {
    return (
      <Section variant="default" background="default">
        <Container size="lg">
          <div className="py-12 text-center space-y-6">
            <h1 className="text-3xl font-bold text-glass-900">{t('title')}</h1>
            <p className="text-lg text-glass-600">{t('empty')}</p>
            <Button variant="primary" onClick={() => router.push('/')}>
              {t('continueShopping')}
            </Button>
          </div>
        </Container>
      </Section>
    )
  }

  return (
    <Section variant="default" background="default">
      <Container size="lg">
        <div className="py-8 space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-glass-900 mb-2">{t('title')}</h1>
            <p className="text-glass-600">{t('description')}</p>
          </div>

          <div className="space-y-4">
            {validItems.map((item) => (
              <CartItemCard
                key={item.itemKey}
                item={item}
                currency={currency}
                onRemove={handleRemove}
                onUpdate={updateItem}
                t={t}
              />
            ))}
          </div>

          <div className="border-t border-glass-200 pt-6">
            <div className="flex justify-between items-center mb-6">
              <span className="text-xl font-semibold text-glass-900">{t('total')}</span>
              <span className="text-2xl font-bold text-glass-900">
                {total.toFixed(2)} {currency}
              </span>
            </div>
            <Button variant="primary" size="lg" fullWidth onClick={handleProceedToCheckout}>
              {t('proceedToCheckout')}
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  )
}

interface CartItemCardProps {
  item: CartItem
  currency: string
  onRemove: (itemKey: string) => void
  onUpdate: (itemKey: string, patch: Partial<CartItem>) => void
  t: any
}

function CartItemCard({ item, currency, onRemove, onUpdate, t }: CartItemCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [adults, setAdults] = useState(item.adults)
  const [childs, setChilds] = useState(item.childs)
  const [infants, setInfants] = useState(item.infants)

  const handleSave = () => {
    if (adults < 1) {
      alert(t('errors.noParticipants'))
      return
    }

    // Recalculate total
    const newTotal =
      item.priceSnapshot.adult * adults +
      item.priceSnapshot.child * childs +
      item.priceSnapshot.infant * infants

    onUpdate(item.itemKey, {
      adults,
      childs,
      infants,
      priceSnapshot: {
        ...item.priceSnapshot,
        total: newTotal,
      },
    })

    setIsEditing(false)
  }

  return (
    <div className="bg-white border border-glass-200 rounded-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-glass-900 mb-2">
            {t('itemTitle', { t_group: item.t_group, t_id: item.t_id })}
          </h3>
          <div className="space-y-1 text-sm text-glass-600">
            <p>
              <span className="font-medium">{t('date')}:</span> {item.tourDate}
            </p>
            {item.sesTime && item.sesTime !== '00:00' && (
              <p>
                <span className="font-medium">{t('time')}:</span> {item.sesTime}
              </p>
            )}
            <p>
              <span className="font-medium">{t('language')}:</span> {item.language}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-glass-900">
            {item.priceSnapshot.total.toFixed(2)} {currency}
          </p>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3 pt-4 border-t border-glass-200">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-glass-700 mb-1">
                {t('adults')}
              </label>
              <input
                type="number"
                min="1"
                value={adults}
                onChange={(e) => setAdults(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-glass-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-glass-700 mb-1">
                {t('children')}
              </label>
              <input
                type="number"
                min="0"
                value={childs}
                onChange={(e) => setChilds(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-glass-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-glass-700 mb-1">
                {t('infants')}
              </label>
              <input
                type="number"
                min="0"
                value={infants}
                onChange={(e) => setInfants(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-glass-300 rounded-md"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleSave}>
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center pt-4 border-t border-glass-200">
          <div className="text-sm text-glass-600">
            <p>
              {item.adults} {t('adults')}
              {item.childs > 0 && `, ${item.childs} ${t('children')}`}
              {item.infants > 0 && `, ${item.infants} ${t('infants')}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              {t('edit')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onRemove(item.itemKey)}>
              {t('remove')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
