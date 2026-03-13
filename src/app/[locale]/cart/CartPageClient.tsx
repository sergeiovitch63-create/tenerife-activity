'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { useCartStore } from '@/lib/cart/store'
import type { CartItem } from '@/lib/cart/types'
import { Button } from '@/ui/components/shared/Button'
import { Section, Container } from '@/ui/components/layout'
import { isCartItemExpired } from '@/lib/cart/types'
import { CartItemImage } from '@/components/cart/CartItemImage.client'
import { decodeTextFromApi } from '@/lib/atlantico/htmlAssets'
import { mapLocaleToLang } from '@/lib/atlantico/locale'
import { setCartCookie, type CartCookieFullItem } from '@/lib/cart/cookie'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  if (!y || !m || !d) return dateStr
  return `${d}/${m}/${y}`
}

/** Fallback: fetch group name client-side when server didn't provide it */
function useGroupName(tGroup: string, lang: string, fallback: string): string {
  const [name, setName] = useState(fallback)
  useEffect(() => {
    if (fallback) {
      setName(fallback)
      return
    }
    let cancelled = false
    fetch(`/api/atlantico/group-details/${encodeURIComponent(tGroup)}/${encodeURIComponent(lang)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { name?: string } | null) => {
        if (!cancelled && data?.name) setName(decodeTextFromApi(data.name))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [tGroup, lang, fallback])
  return name
}

type GroupNamesMap = Record<string, string>

interface CartItemCardProps {
  item: CartItem
  currency: string
  onRemove: (itemKey: string) => void
  onUpdate: (itemKey: string, patch: Partial<CartItem>) => void
  t: ReturnType<typeof useTranslations<'cart'>>
  lang: string
  groupNames: GroupNamesMap
}

function CartItemCard({ item, currency, onRemove, onUpdate, t, lang, groupNames }: CartItemCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [adults, setAdults] = useState(item.adults)
  const [childs, setChilds] = useState(item.childs)
  const [infants, setInfants] = useState(item.infants)

  const serverName = groupNames[`${item.t_group}:${item.language}`]
  const fallbackName = useGroupName(item.t_group, item.language, item.tourName || '')
  const displayName = serverName ?? (item.tourName || fallbackName)

  const handleSave = () => {
    if (adults < 1) {
      alert(t('errors.noParticipants'))
      return
    }
    const newTotal =
      item.priceSnapshot.adult * adults +
      item.priceSnapshot.child * childs +
      item.priceSnapshot.infant * infants
    onUpdate(item.itemKey, {
      adults,
      childs,
      infants,
      priceSnapshot: { ...item.priceSnapshot, total: newTotal },
    })
    setIsEditing(false)
  }

  return (
    <div className="bg-white border border-glass-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex flex-col sm:flex-row">
        <div className="sm:w-48 flex-shrink-0 aspect-[4/3] bg-glass-100">
          <CartItemImage
            code={item.t_group}
            alt={displayName || `Tour ${item.t_group}`}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-glass-900 mb-2 line-clamp-2">
              {displayName || t('itemTitle', { t_group: item.t_group, t_id: item.t_id })}
            </h3>
            <div className="space-y-1 text-sm text-glass-600">
              <p><span className="font-medium text-glass-700">{t('date')}:</span> {formatDate(item.tourDate)}</p>
              {item.sesTime && item.sesTime !== '00:00' && (
                <p><span className="font-medium text-glass-700">{t('time')}:</span> {item.sesTime}</p>
              )}
              {item.isCombination && item.tourDate2 && (
                <p><span className="font-medium text-glass-700">{t('loroParque')}:</span> {formatDate(item.tourDate2)}</p>
              )}
              {item.isDateRange && item.tourDateEnd && (
                <p><span className="font-medium text-glass-700">{t('end')}:</span> {formatDate(item.tourDateEnd)}</p>
              )}
            </div>

            {!isEditing ? (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-glass-600">
                <span>{item.adults} {t('adults')} {item.priceSnapshot.adult.toFixed(2)} {currency}</span>
                {item.childs > 0 && (
                  <span>{item.childs} {t('children')} {item.priceSnapshot.child.toFixed(2)} {currency}</span>
                )}
                {item.infants > 0 && (
                  <span>{item.infants} {t('infants')} {item.priceSnapshot.infant.toFixed(2)} {currency}</span>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-3 pt-4 border-t border-glass-200">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-glass-600 mb-1">{t('adults')}</label>
                    <input
                      type="number"
                      min={1}
                      value={adults}
                      onChange={(e) => setAdults(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-glass-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-glass-600 mb-1">{t('children')}</label>
                    <input
                      type="number"
                      min={0}
                      value={childs}
                      onChange={(e) => setChilds(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-glass-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-glass-600 mb-1">{t('infants')}</label>
                    <input
                      type="number"
                      min={0}
                      value={infants}
                      onChange={(e) => setInfants(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-glass-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={handleSave}>{t('save')}</Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>{t('cancel')}</Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-4">
            <p className="text-xl font-bold text-glass-900">
              {item.priceSnapshot.total.toFixed(2)} {currency}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="p-2 text-glass-500 hover:text-ocean-600"
                title={t('edit')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onRemove(item.itemKey)}
                className="p-2 text-glass-500 hover:text-red-600"
                title={t('remove')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface CartPageClientProps {
  groupNames: GroupNamesMap
}

export function CartPageClient({ groupNames }: CartPageClientProps) {
  const t = useTranslations('cart')
  const locale = useLocale()
  const lang = mapLocaleToLang(locale)
  const router = useRouter()
  const { items, removeItem, updateItem, removeExpired, getTotal, getCurrency } = useCartStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    removeExpired()
  }, [removeExpired])

  // Sync cart to cookie for next server render (e.g. refresh or return visit)
  useEffect(() => {
    if (!mounted) return
    const valid = items.filter((i) => !isCartItemExpired(i))
    if (valid.length > 0) {
      setCartCookie(valid as unknown as CartCookieFullItem[])
    }
  }, [mounted, items])

  const validItems = items.filter((item) => !isCartItemExpired(item))
  const total = getTotal()
  const currency = getCurrency() || 'EUR'

  const handleRemove = (itemKey: string) => {
    if (confirm(t('remove') + '?')) removeItem(itemKey)
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
          <div className="py-12 text-center text-glass-600">{t('loading')}</div>
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
        <div className="flex gap-2 py-6 border-b border-glass-200">
          <div className="flex gap-2">
            <span className="w-8 h-8 rounded-full bg-ocean-600 text-white flex items-center justify-center text-sm font-bold">1</span>
            <span className="font-semibold text-glass-900">{t('title')}</span>
          </div>
          <span className="text-glass-400">→</span>
          <div className="flex gap-2">
            <span className="w-8 h-8 rounded-full bg-glass-200 text-glass-500 flex items-center justify-center text-sm font-bold">2</span>
            <span className="text-glass-500">{t('bookingDetails')}</span>
          </div>
          <span className="text-glass-400">→</span>
          <div className="flex gap-2">
            <span className="w-8 h-8 rounded-full bg-glass-200 text-glass-500 flex items-center justify-center text-sm font-bold">3</span>
            <span className="text-glass-500">{t('payment')}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-8">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold text-glass-900">{t('orderSummary')}</h2>
            <div className="space-y-4">
              {validItems.map((item) => (
                <CartItemCard
                  key={item.itemKey}
                  item={item}
                  currency={currency}
                  onRemove={handleRemove}
                  onUpdate={updateItem}
                  t={t}
                  lang={lang}
                  groupNames={groupNames}
                />
              ))}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-4 bg-white border border-glass-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-glass-900 mb-2">{t('basketSummary')}</h2>
              <p className="text-sm text-glass-600 mb-4">
                {validItems.length} {validItems.length === 1 ? t('product') : t('products')} {t('inCart')}
              </p>
              <div className="border-t border-glass-200 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-glass-900">Total</span>
                  <span className="text-2xl font-bold text-glass-900">
                    {total.toFixed(2)} {currency}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button variant="ghost" fullWidth onClick={() => router.push('/')}>
                  {t('continueShopping')}
                </Button>
                <Button variant="primary" size="lg" fullWidth onClick={handleProceedToCheckout}>
                  {t('bookingDetails')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  )
}
