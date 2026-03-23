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

/** Normalize "9:30" → "09:30"; null if empty or invalid */
function normalizeSesTimeHHmm(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (s === '') return null
  const m = s.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = parseInt(m[1], 10)
  const mm = m[2]
  if (h < 0 || h > 23 || !/^\d{2}$/.test(mm)) return null
  return `${String(h).padStart(2, '0')}:${mm}`
}

/** Booking panel uses 00:00 when there is no session clock; Atlantico accepts that with a date. */
function isSesTimeOkForCheckout(item: CartItem): boolean {
  if (item.calendarMode === 'none') return true

  const n = normalizeSesTimeHHmm(item.sesTime ?? undefined)

  if (n == null) return false

  if (n === '00:00') {
    return item.tourDate != null && String(item.tourDate).trim() !== ''
  }

  return true
}

/** Revalidation result from API (server returns looser type than client CartItem) */
type RevalidationResultProp = {
  items: Array<Record<string, unknown> & { itemKey: string; priceChanged?: boolean; priceDiff?: number; available?: boolean; newPriceSnapshot?: unknown }>
  errors: Array<{ itemKey: string; error: string; field?: string }>
  hasPriceChanges: boolean
  hasAvailabilityIssues: boolean
}

interface CheckoutClientProps {
  locale: string
  /** Server-fetched revalidation result. When provided, skips client revalidate. */
  initialRevalidationResult?: RevalidationResultProp | null
  /** Server-fetched meeting points. When provided, skips client loadMeetingPoints. */
  initialMeetingPoints?: Record<string, MeetingPoint[]>
}

interface RevalidationResult {
  items: Array<CartItem & { revalidated: true; priceChanged: boolean; priceDiff?: number; available: boolean; newPriceSnapshot?: unknown }>
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

export function CheckoutClient({
  locale,
  initialRevalidationResult = null,
  initialMeetingPoints = {},
}: CheckoutClientProps) {
  const t = useTranslations('checkout')
  const router = useRouter()
  const { items, removeExpired } = useCartStore()
  const [mounted, setMounted] = useState(false)
  const hasInitialRevalidation = initialRevalidationResult != null
  const hasInitialMeetingPoints = Object.keys(initialMeetingPoints ?? {}).length > 0
  const [revalidating, setRevalidating] = useState(!hasInitialRevalidation)
  const [revalidationResult, setRevalidationResult] = useState<RevalidationResult | RevalidationResultProp | null>(
    initialRevalidationResult ?? null
  )
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
  const [meetingPoints, setMeetingPoints] = useState<Record<string, MeetingPoint[]>>(
    initialMeetingPoints ?? {}
  )
  const [loadingMeetingPoints, setLoadingMeetingPoints] = useState(!hasInitialMeetingPoints)
  const [meetingPointsError, setMeetingPointsError] = useState(false)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)

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

  const loadMeetingPoints = async () => {
    if (validItems.length === 0) return

    setLoadingMeetingPoints(true)
    setMeetingPointsError(false)
    const pointsMap: Record<string, MeetingPoint[]> = {}

    try {
      const eventIds = Array.from(new Set(validItems.map((item) => item.t_id)))
      await Promise.all(
        eventIds.map(async (eventId) => {
          try {
            const response = await fetch(
              `/api/atlantico/event-details?eventId=${eventId}&lang=ENG`
            )
            if (response.ok) {
              const data = await response.json()
              if (data.meetingPoints && Array.isArray(data.meetingPoints)) {
                validItems.forEach((item) => {
                  if (item.t_id === eventId) {
                    pointsMap[item.itemKey] = data.meetingPoints
                  }
                })
              }
            } else {
              setMeetingPointsError(true)
            }
          } catch (error) {
            console.error(`[CHECKOUT] Failed to load meeting points for event ${eventId}:`, error)
            setMeetingPointsError(true)
          }
        })
      )
      setMeetingPoints(pointsMap)
    } catch (error) {
      console.error('[CHECKOUT] Error loading meeting points:', error)
      setMeetingPointsError(true)
    } finally {
      setLoadingMeetingPoints(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    removeExpired()
  }, [removeExpired])

  useEffect(() => {
    if (!mounted) return
    const valid = items.filter((item) => !isCartItemExpired(item))
    if (valid.length === 0) return

    if (!hasInitialRevalidation) {
      handleRevalidate()
    }
    if (!hasInitialMeetingPoints) {
      loadMeetingPoints()
    }
  }, [mounted, hasInitialRevalidation, hasInitialMeetingPoints])

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

    const item = validItems[0]
    if (!isSesTimeOkForCheckout(item)) {
      alert(t('errors.invalidTime'))
      return
    }

    setSubmitting(true)

    try {
      const priceSnapshot = revalidationResult?.items[0]?.newPriceSnapshot || item.priceSnapshot

      // Build payment payload
      const sesTimeForApi =
        item.calendarMode === 'none'
          ? item.sesTime
          : normalizeSesTimeHHmm(item.sesTime ?? undefined) ?? item.sesTime

      const payload = {
        userId: process.env.NEXT_PUBLIC_ATLANTICO_USER_ID || '', // Will be overridden server-side
        t_id: item.t_id,
        t_group: item.t_group,
        language: item.language,
        tourDate: item.tourDate,
        sesTime: sesTimeForApi,
        adults: item.adults,
        childs: item.childs || 0,
        infants: item.infants || 0,
        currency: item.currency,
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
  const priceSnapshot = ((revalidatedItem?.newPriceSnapshot as { total: number } | undefined) || item.priceSnapshot) as { total: number }
  const priceChanged = revalidatedItem?.priceChanged || false
  const firstItemTotal = priceSnapshot.total
  const originalFirstItemTotal = item.priceSnapshot.total
  const cartTotal = validItems.reduce((sum, ci) => sum + ci.priceSnapshot.total, 0) - originalFirstItemTotal + firstItemTotal
  const canSubmitPayment = !submitting && !revalidating && !(revalidationResult?.hasAvailabilityIssues ?? false)

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold text-glass-900 mb-8">{t('title')}</h1>

      {/* 3-step flow with Atlantico-like circles */}
      <div className="mb-6 rounded-lg border border-glass-200 bg-white p-4">
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: 1 as const, label: 'Order Summary' },
            { id: 2 as const, label: 'Booking Details' },
            { id: 3 as const, label: 'Payment methods' },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                if (s.id === 3) {
                  if (validateForm()) setCurrentStep(3)
                  return
                }
                setCurrentStep(s.id)
              }}
              className="flex items-center justify-center gap-2 rounded-md py-2 hover:bg-glass-50"
            >
              <span
                className={cn(
                  'inline-flex h-7 w-7 items-center justify-center rounded-full border text-sm font-semibold',
                  currentStep === s.id
                    ? 'border-ocean-600 bg-ocean-600 text-white'
                    : 'border-glass-300 bg-white text-glass-700'
                )}
              >
                {s.id}
              </span>
              <span
                className={cn(
                  'text-sm font-semibold',
                  currentStep === s.id ? 'text-ocean-700' : 'text-glass-700'
                )}
              >
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </div>

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

      {/* Cart Summary (Step 1, also shown on Step 3) */}
      {(currentStep === 1 || currentStep === 3) && (
      <div className={cn('mb-8 grid gap-6', currentStep === 1 ? 'lg:grid-cols-[2fr_1fr]' : 'lg:grid-cols-[1.7fr_1fr]')}>
      <div className="bg-white border border-glass-200 rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-glass-900 mb-4">{t('orderSummary')}</h2>
        <div className="space-y-4 text-sm">
          {validItems.map((cartItem, idx) => {
            const itemTotal = idx === 0 ? firstItemTotal : cartItem.priceSnapshot.total
            return (
              <div key={cartItem.itemKey} className="rounded-md border border-glass-100 p-3">
                <p>
                  <strong>{t('activity')}:</strong> {cartItem.t_group} - {cartItem.t_id}
                </p>
                <p>
                  <strong>{t('date')}:</strong> {cartItem.tourDate}
                </p>
                {cartItem.sesTime && cartItem.sesTime !== '00:00' && (
                  <p>
                    <strong>{t('time')}:</strong> {cartItem.sesTime}
                  </p>
                )}
                <p>
                  <strong>{t('total')}:</strong>{' '}
                  {new Intl.NumberFormat(locale, {
                    style: 'currency',
                    currency: cartItem.currency,
                  }).format(itemTotal)}
                </p>
              </div>
            )
          })}
          <p className="pt-2 border-t border-glass-200">
            <strong>{t('total')}:</strong>{' '}
            {new Intl.NumberFormat(locale, {
              style: 'currency',
              currency: item.currency,
            }).format(cartTotal)}
          </p>
        </div>
      </div>
      <div className="bg-white border border-glass-200 rounded-lg p-6 h-fit">
        <h3 className="text-xl font-semibold text-glass-900 mb-4">Basket Summary</h3>
        <p className="text-sm text-glass-600 mb-2">{validItems.length} Product/s in Shopping Cart</p>
        <p className="text-3xl font-bold text-glass-900 mb-6">
          {new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: item.currency,
          }).format(cartTotal)}
        </p>
        {currentStep === 1 && (
          <Button
            type="button"
            variant="primary"
            fullWidth
            onClick={() => setCurrentStep(2)}
          >
            Booking Details
          </Button>
        )}
      </div>
      </div>
      )}

      {/* Customer Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {currentStep === 2 && (
        <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
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
                ) : meetingPointsError ? (
                  <>
                    <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">
                      {t('errors.meetingPointsLoadFailed')}
                    </p>
                    <input
                      type="text"
                      id="mpoint"
                      value={customerData.mpoint}
                      onChange={(e) => setCustomerData({ ...customerData, mpoint: e.target.value })}
                      placeholder={t('meetingPointPlaceholder') || 'Enter meeting point'}
                      className="w-full px-4 py-2 border border-glass-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                    />
                  </>
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
        <div className="bg-white border border-glass-200 rounded-lg p-6 h-fit">
          <h3 className="text-lg font-semibold text-glass-900 mb-3">Selected activity</h3>
          <p className="text-sm"><strong>{t('activity')}:</strong> {item.t_group} - {item.t_id}</p>
          <p className="text-sm"><strong>{t('date')}:</strong> {item.tourDate}</p>
          {item.sesTime && item.sesTime !== '00:00' && (
            <p className="text-sm"><strong>{t('time')}:</strong> {item.sesTime}</p>
          )}
          <p className="text-sm mt-2">
            <strong>{t('total')}:</strong>{' '}
            {new Intl.NumberFormat(locale, {
              style: 'currency',
              currency: item.currency,
            }).format(firstItemTotal)}
          </p>
        </div>
        </div>
        )}

        {currentStep === 3 && (
          <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <div className="bg-white border border-glass-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-glass-900 mb-4">{t('orderSummary')}</h2>
            <div className="space-y-3 text-sm">
              {validItems.map((cartItem) => (
                <div key={cartItem.itemKey} className="rounded border border-glass-100 p-3">
                  <p><strong>{t('activity')}:</strong> {cartItem.t_group} - {cartItem.t_id}</p>
                  <p><strong>{t('date')}:</strong> {cartItem.tourDate}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-glass-200 rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-glass-900 mb-4">Payment methods</h2>
            <div className="space-y-3 mb-5">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked readOnly />
                Credit card
              </label>
              <label className="flex items-center gap-2 text-sm text-glass-400">
                <input type="radio" disabled />
                PayPal
              </label>
              <label className="flex items-center gap-2 text-sm text-glass-400">
                <input type="radio" disabled />
                Bizum
              </label>
              <label className="flex items-center gap-2 text-sm text-glass-400">
                <input type="radio" disabled />
                Apple Pay
              </label>
              <label className="flex items-center gap-2 text-sm text-glass-400">
                <input type="radio" disabled />
                Google Pay
              </label>
            </div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={!canSubmitPayment}
            >
              {submitting ? t('processing') : t('pay')}
            </Button>
          </div>
          </div>
        )}

        {/* Navigation buttons between steps */}
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setCurrentStep((prev) => (prev === 1 ? 1 : ((prev - 1) as 1 | 2 | 3)))}
          >
            Back
          </Button>
          {currentStep < 3 ? (
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                if (currentStep === 2 && !validateForm()) return
                setCurrentStep((prev) => (prev === 3 ? 3 : ((prev + 1) as 1 | 2 | 3)))
              }}
              disabled={revalidating}
            >
              Continue
            </Button>
          ) : (
            <div />
          )}
        </div>
      </form>
    </div>
  )
}




