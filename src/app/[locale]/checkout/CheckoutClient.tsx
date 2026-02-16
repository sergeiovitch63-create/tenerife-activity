/**
 * Checkout Client Component
 * 
 * Handles cart revalidation and customer form
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCartStore } from '@/lib/cart/store'
import { isCartItemExpired, type CartItem } from '@/lib/cart/types'
import { Button } from '@/ui/components/shared/Button'
import { cn } from '@/ui/lib/cn'
import type { MeetingPoint } from '@/app/api/atlantico/event-details/route'
import { getMeetingPointName } from '@/components/booking/MeetingPointsDisplay'

interface CheckoutClientProps {
  locale: string
}

interface RevalidationResult {
  items: Array<CartItem & { revalidated: true; priceChanged: boolean; priceDiff?: number; available: boolean; newPriceSnapshot?: any }>
  errors: Array<{ itemKey: string; error: string; field?: string }>
  hasPriceChanges: boolean
  hasAvailabilityIssues: boolean
}

interface CustomerData {
  name: string
  email: string
  phone: string
  hotel?: string
  room?: string
  mpoint?: string
  mtime?: string
  notes?: string
  acceptTerms: boolean
}

export function CheckoutClient({ locale }: CheckoutClientProps) {
  const t = useTranslations('checkout')
  const router = useRouter()
  const { items, removeExpired, clearCart } = useCartStore()
  const [mounted, setMounted] = useState(false)
  const [revalidating, setRevalidating] = useState(false)
  const [revalidationResult, setRevalidationResult] = useState<RevalidationResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: '',
    email: '',
    phone: '',
    hotel: '',
    room: '',
    mpoint: '',
    mtime: '',
    notes: '',
    acceptTerms: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [meetingPoints, setMeetingPoints] = useState<Record<string, MeetingPoint[]>>({}) // itemKey -> meetingPoints
  const [loadingMeetingPoints, setLoadingMeetingPoints] = useState(false)

  useEffect(() => {
    setMounted(true)
    removeExpired()
    // Auto-revalidate on mount
    handleRevalidate()
    // Load meeting points for cart items
    loadMeetingPoints()
  }, [])

  /**
   * Load meeting points for all cart items
   */
  const loadMeetingPoints = async () => {
    if (validItems.length === 0) return

    setLoadingMeetingPoints(true)
    const pointsMap: Record<string, MeetingPoint[]> = {}

    try {
      // Fetch meeting points for each unique event ID
      const eventIds = Array.from(new Set(validItems.map(item => item.t_id)))
      
      await Promise.all(
        eventIds.map(async (eventId) => {
          try {
            const response = await fetch(`/api/atlantico/event-details?eventId=${eventId}&lang=${validItems[0]?.language || 'ENG'}`)
            if (response.ok) {
              const data = await response.json()
              if (data.meetingPoints && Array.isArray(data.meetingPoints)) {
                // Store for all items with this eventId
                validItems.forEach(item => {
                  if (item.t_id === eventId) {
                    pointsMap[item.itemKey] = data.meetingPoints
                  }
                })
              }
            }
          } catch (error) {
            console.error(`[CHECKOUT] Failed to load meeting points for event ${eventId}:`, error)
          }
        })
      )

      setMeetingPoints(pointsMap)
    } catch (error) {
      console.error('[CHECKOUT] Error loading meeting points:', error)
    } finally {
      setLoadingMeetingPoints(false)
    }
  }

  const validItems = mounted ? items.filter((item) => !isCartItemExpired(item)) : []

  const handleRevalidate = async () => {
    if (validItems.length === 0) return

    setRevalidating(true)
    try {
      const response = await fetch('/api/atlantico/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: validItems }),
      })

      if (!response.ok) {
        throw new Error('Revalidation failed')
      }

      const result: RevalidationResult = await response.json()
      setRevalidationResult(result)

      // Remove items with availability issues
      if (result.hasAvailabilityIssues) {
        result.errors.forEach((err) => {
          if (err.field === 'sesTime' || err.field === 'date') {
            // Item is not available, could remove it or show error
          }
        })
      }
    } catch (error) {
      console.error('[CHECKOUT] Revalidation error:', error)
    } finally {
      setRevalidating(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!customerData.name.trim()) {
      newErrors.name = t('errors.nameRequired')
    }
    if (!customerData.email.trim()) {
      newErrors.email = t('errors.emailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerData.email)) {
      newErrors.email = t('errors.emailInvalid')
    }
    if (!customerData.phone.trim()) {
      newErrors.phone = t('errors.phoneRequired')
    }
    if (!customerData.acceptTerms) {
      newErrors.acceptTerms = t('errors.termsRequired')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    if (validItems.length === 0) {
      alert(t('errors.cartEmpty'))
      return
    }

    // Block multi-item checkout (as per requirements)
    if (validItems.length > 1) {
      alert(t('errors.multiItemNotSupported'))
      return
    }

    // CRITICAL: Validate sesTime before proceeding
    const item = validItems[0]
    if (!item.sesTime || item.sesTime === '00:00' || !/^\d{2}:\d{2}$/.test(item.sesTime)) {
      alert(t('errors.invalidTime') || 'No valid time available for this booking. Please remove this item and select a different date.')
      return
    }

    setSubmitting(true)

    try {
      const priceSnapshot = revalidationResult?.items[0]?.newPriceSnapshot || item.priceSnapshot

      // Build payment payload
      const payload = {
        userId: process.env.NEXT_PUBLIC_ATLANTICO_USER_ID || '', // Will be overridden server-side
        t_id: item.t_id,
        t_group: item.t_group,
        language: item.language,
        tourDate: item.tourDate,
        sesTime: item.sesTime,
        adults: item.adults,
        childs: item.childs || 0,
        infants: item.infants || 0,
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        ...(customerData.hotel && { hotel: customerData.hotel }),
        ...(customerData.room && { room: customerData.room }),
        ...(customerData.mpoint && { mpoint: customerData.mpoint }),
        ...(customerData.mtime && { mtime: customerData.mtime }),
        ...(customerData.notes && { notes: customerData.notes }),
      }

      const response = await fetch('/api/atlantico/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Payment initiation failed')
      }

      if (data.redirectUrl) {
        // Redirect to payment gateway
        window.location.href = data.redirectUrl
      } else {
        throw new Error('No redirect URL received')
      }
    } catch (error) {
      console.error('[CHECKOUT] Payment error:', error)
      alert(error instanceof Error ? error.message : t('errors.paymentFailed'))
      setSubmitting(false)
    }
  }

  if (!mounted || validItems.length === 0) {
    return (
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-glass-900 mb-4">{t('title')}</h1>
        <p className="text-lg text-glass-600 mb-8">{t('empty')}</p>
        <Button onClick={() => router.push(`/${locale}/cart`)} variant="primary">
          {t('backToCart')}
        </Button>
      </div>
    )
  }

  const item = validItems[0]
  const revalidatedItem = revalidationResult?.items[0]
  const priceSnapshot = revalidatedItem?.newPriceSnapshot || item.priceSnapshot
  const priceChanged = revalidatedItem?.priceChanged || false

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold text-glass-900 mb-8">{t('title')}</h1>

      {/* Revalidation Status */}
      {revalidating && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800">{t('revalidating')}</p>
        </div>
      )}

      {revalidationResult && priceChanged && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 font-semibold">{t('priceUpdated')}</p>
          {revalidatedItem?.priceDiff && (
            <p className="text-yellow-700 text-sm">
              {t('priceDiff', {
                diff: revalidatedItem.priceDiff > 0 ? `+${revalidatedItem.priceDiff.toFixed(2)}` : revalidatedItem.priceDiff.toFixed(2),
              })}
            </p>
          )}
        </div>
      )}

      {revalidationResult && revalidationResult.hasAvailabilityIssues && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 font-semibold">{t('availabilityIssue')}</p>
          <p className="text-red-700 text-sm">{t('availabilityIssueDesc')}</p>
        </div>
      )}

      {/* Cart Summary */}
      <div className="bg-white border border-glass-200 rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold text-glass-900 mb-4">{t('orderSummary')}</h2>
        <div className="space-y-2 text-sm">
          <p>
            <strong>{t('activity')}:</strong> {item.t_group} - {item.t_id}
          </p>
          <p>
            <strong>{t('date')}:</strong> {item.tourDate}
          </p>
          {item.sesTime && item.sesTime !== '00:00' && (
            <p>
              <strong>{t('time')}:</strong> {item.sesTime}
            </p>
          )}
          <p>
            <strong>{t('total')}:</strong>{' '}
            {new Intl.NumberFormat(locale, {
              style: 'currency',
              currency: item.currency,
            }).format(priceSnapshot.total)}
          </p>
        </div>
      </div>

      {/* Customer Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-glass-200 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-glass-900 mb-6">{t('customerInfo')}</h2>

          {/* Required Fields */}
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-glass-700 mb-2">
                {t('name')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={customerData.name}
                onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                className={cn(
                  'w-full px-4 py-2 border rounded-lg',
                  errors.name ? 'border-red-500' : 'border-glass-300',
                  'focus:outline-none focus:ring-2 focus:ring-ocean-500'
                )}
                required
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-glass-700 mb-2">
                {t('email')} <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                value={customerData.email}
                onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                className={cn(
                  'w-full px-4 py-2 border rounded-lg',
                  errors.email ? 'border-red-500' : 'border-glass-300',
                  'focus:outline-none focus:ring-2 focus:ring-ocean-500'
                )}
                required
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-glass-700 mb-2">
                {t('phone')} <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                value={customerData.phone}
                onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                className={cn(
                  'w-full px-4 py-2 border rounded-lg',
                  errors.phone ? 'border-red-500' : 'border-glass-300',
                  'focus:outline-none focus:ring-2 focus:ring-ocean-500'
                )}
                required
              />
              {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
            </div>
          </div>

          {/* Optional Pickup Fields */}
          <div className="mt-6 pt-6 border-t border-glass-200">
            <h3 className="text-lg font-medium text-glass-900 mb-4">{t('pickupInfo')}</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="hotel" className="block text-sm font-medium text-glass-700 mb-2">
                  {t('hotel')}
                </label>
                <input
                  type="text"
                  id="hotel"
                  value={customerData.hotel}
                  onChange={(e) => setCustomerData({ ...customerData, hotel: e.target.value })}
                  className="w-full px-4 py-2 border border-glass-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                />
              </div>

              <div>
                <label htmlFor="room" className="block text-sm font-medium text-glass-700 mb-2">
                  {t('room')}
                </label>
                <input
                  type="text"
                  id="room"
                  value={customerData.room}
                  onChange={(e) => setCustomerData({ ...customerData, room: e.target.value })}
                  className="w-full px-4 py-2 border border-glass-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                />
              </div>

              <div>
                <label htmlFor="mpoint" className="block text-sm font-medium text-glass-700 mb-2">
                  {t('meetingPoint')}
                </label>
                {loadingMeetingPoints ? (
                  <div className="w-full px-4 py-2 border border-glass-300 rounded-lg bg-glass-50 text-glass-500">
                    Loading meeting points...
                  </div>
                ) : (() => {
                  // Get meeting points from first cart item (or combine all unique)
                  const firstItem = validItems[0]
                  const availablePoints = firstItem ? (meetingPoints[firstItem.itemKey] || []) : []
                  
                  if (availablePoints.length > 0) {
                    return (
                      <select
                        id="mpoint"
                        value={customerData.mpoint}
                        onChange={(e) => setCustomerData({ ...customerData, mpoint: e.target.value })}
                        className="w-full px-4 py-2 border border-glass-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                      >
                        <option value="">{t('selectMeetingPoint') || 'Select a meeting point'}</option>
                        {availablePoints.map((point, idx) => {
                          const name = getMeetingPointName(point)
                          const value = typeof point === 'string' ? point : JSON.stringify(point)
                          return (
                            <option key={idx} value={value}>
                              {name}
                            </option>
                          )
                        })}
                        <option value="__custom__">{t('customMeetingPoint') || 'Other (specify below)'}</option>
                      </select>
                    )
                  } else {
                    return (
                      <input
                        type="text"
                        id="mpoint"
                        value={customerData.mpoint}
                        onChange={(e) => setCustomerData({ ...customerData, mpoint: e.target.value })}
                        placeholder={t('meetingPointPlaceholder') || 'Enter meeting point'}
                        className="w-full px-4 py-2 border border-glass-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                      />
                    )
                  }
                })()}
                {customerData.mpoint === '__custom__' && (
                  <input
                    type="text"
                    id="mpoint-custom"
                    value=""
                    onChange={(e) => setCustomerData({ ...customerData, mpoint: e.target.value })}
                    placeholder={t('meetingPointPlaceholder') || 'Enter custom meeting point'}
                    className="w-full mt-2 px-4 py-2 border border-glass-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  />
                )}
              </div>

              <div>
                <label htmlFor="mtime" className="block text-sm font-medium text-glass-700 mb-2">
                  {t('meetingTime')}
                </label>
                <input
                  type="text"
                  id="mtime"
                  value={customerData.mtime}
                  onChange={(e) => setCustomerData({ ...customerData, mtime: e.target.value })}
                  className="w-full px-4 py-2 border border-glass-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                />
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-glass-700 mb-2">
                  {t('notes')}
                </label>
                <textarea
                  id="notes"
                  value={customerData.notes}
                  onChange={(e) => setCustomerData({ ...customerData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-glass-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                />
              </div>
            </div>
          </div>

          {/* Terms Checkbox */}
          <div className="mt-6">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={customerData.acceptTerms}
                onChange={(e) => setCustomerData({ ...customerData, acceptTerms: e.target.checked })}
                className="mt-1"
              />
              <span className="text-sm text-glass-700">
                {t('acceptTerms')} <span className="text-red-500">*</span>
              </span>
            </label>
            {errors.acceptTerms && (
              <p className="mt-1 text-sm text-red-600">{errors.acceptTerms}</p>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={submitting || revalidating || (revalidationResult?.hasAvailabilityIssues ?? false)}
        >
          {submitting ? t('processing') : t('pay')}
        </Button>
      </form>
    </div>
  )
}




