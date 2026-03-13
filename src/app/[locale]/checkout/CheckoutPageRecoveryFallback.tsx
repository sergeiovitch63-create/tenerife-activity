/**
 * Checkout Page - Recovery Fallback
 *
 * Full checkout with recovery UI and auto-fix. Used when CheckoutPageServer
 * fails (ErrorBoundary) or when server-fetched data is unavailable.
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { useCartStore } from '@/lib/cart/store'
import type { CartItem, PriceSnapshot } from '@/lib/cart/types'
import { Button } from '@/ui/components/shared/Button'
import { Section, Container } from '@/ui/components/layout'
import { isCartItemExpired } from '@/lib/cart/types'
import { CartItemImage } from '@/components/cart/CartItemImage.client'
import { decodeTextFromApi } from '@/lib/atlantico/htmlAssets'
import { Link } from '@/navigation'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  if (!y || !m || !d) return dateStr
  return `${d} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m,10)-1]} ${y}`
}

function toAtlanticoLang(locale: string): "CAS"|"ENG"|"FRA"|"RUS"|"ALE"|"ITA" {
  const l = (locale || "").toLowerCase()
  if (l.startsWith("es")) return "CAS"
  if (l.startsWith("fr")) return "FRA"
  if (l.startsWith("ru")) return "RUS"
  if (l.startsWith("de")) return "ALE"
  if (l.startsWith("it")) return "ITA"
  return "ENG"
}

interface RevalidatedItem extends CartItem {
  revalidated: true
  priceChanged: boolean
  priceDiff?: number
  available: boolean
  availabilityError?: string
  availabilityReason?: 'time_not_found' | 'no_capacity' | 'no_sessions'
  availableTimes?: string[]
  availableDates?: string[]
  newPriceSnapshot?: PriceSnapshot
}

interface RevalidateResponse {
  items: RevalidatedItem[]
  errors: Array<{ itemKey: string; error: string; field?: string }>
  hasPriceChanges: boolean
  hasAvailabilityIssues: boolean
}

export function CheckoutPageRecoveryFallback() {
  const t = useTranslations('checkout')
  const locale = useLocale()
  const router = useRouter()
  const { items, updateItem, removeExpired, getTotal, getCurrency } = useCartStore()
  const [mounted, setMounted] = useState(false)

  const [revalidating, setRevalidating] = useState(true)
  const [revalidatedItems, setRevalidatedItems] = useState<RevalidatedItem[]>([])
  const [revalidationErrors, setRevalidationErrors] = useState<RevalidateResponse['errors']>([])
  const [hasPriceChanges, setHasPriceChanges] = useState(false)
  const [hasAvailabilityIssues, setHasAvailabilityIssues] = useState(false)

  const [selectedRecoveryTimes, setSelectedRecoveryTimes] = useState<Record<string, string>>({})
  const [userHasInteracted, setUserHasInteracted] = useState(false)

  useEffect(() => {
    try {
      ['checkout_error', 'payment_error', 'revalidation_error'].forEach((key) => {
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
      })
    } catch {
      // Ignore
    }
  }, [])

  const [name, setName] = useState('')
  const [surnames, setSurnames] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [hotel, setHotel] = useState('')
  const [room, setRoom] = useState('')
  const [mpoint, setMpoint] = useState('')
  const [mtime, setMtime] = useState('')
  const [notes, setNotes] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const revalidateCart = async () => {
    setRevalidating(true)
    setRevalidationErrors([])

    const validItems = items.filter((item) => !isCartItemExpired(item))

    if (validItems.length === 0) {
      router.push('/cart')
      return
    }

    try {
      const response = await fetch('/api/atlantico/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: validItems }),
      })

      if (!response.ok) throw new Error('Revalidation failed')

      const data: RevalidateResponse = await response.json()
      setRevalidatedItems(data.items)
      setRevalidationErrors(data.errors)
      setHasPriceChanges(data.hasPriceChanges)
      setHasAvailabilityIssues(data.hasAvailabilityIssues)

      if (data.hasAvailabilityIssues && !userHasInteracted) {
        for (const item of data.items) {
          if (!item.available && item.availableTimes && item.availableTimes.length > 0) {
            const firstAvailableTime = item.availableTimes[0]
            const currentTime = item.sesTime || '00:00'

            if (currentTime === '00:00' || currentTime === '' || !currentTime) {
              updateItem(item.itemKey, { sesTime: firstAvailableTime })
              setSelectedRecoveryTimes((prev) => ({ ...prev, [item.itemKey]: firstAvailableTime }))
              setTimeout(() => revalidateCart(), 100)
              return
            }
          }
        }
      }

      for (const item of data.items) {
        const originalItem = validItems.find(
          (i) => i.t_group === item.t_group && i.t_id === item.t_id && i.tourDate === item.tourDate
        )
        if (!originalItem) continue

        const updates: Record<string, unknown> = {}
        if (item.priceChanged && item.newPriceSnapshot) updates.priceSnapshot = item.newPriceSnapshot
        if (item.tourDate !== originalItem.tourDate) updates.tourDate = item.tourDate
        if (
          item.sesTime !== originalItem.sesTime &&
          item.sesTime &&
          item.sesTime !== '00:00'
        ) {
          updates.sesTime = item.sesTime
        }
        if (item.sessionId !== undefined) updates.sessionId = item.sessionId
        if (item.TipoReservaId !== undefined) updates.TipoReservaId = item.TipoReservaId
        if (item.rcId !== undefined) updates.rcId = item.rcId

        if (Object.keys(updates).length > 0) {
          updateItem(originalItem.itemKey, updates)
        }
      }
    } catch (error) {
      console.error('[CHECKOUT] Revalidation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Revalidation failed'
      if (
        !errorMessage.includes('mapLocaleToAtlanticoLang') &&
        !errorMessage.includes('is not defined')
      ) {
        setRevalidationErrors([{ itemKey: 'general', error: errorMessage }])
      }
    } finally {
      setRevalidating(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    removeExpired()
    revalidateCart()
  }, [])

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = t('errors.nameRequired')
    if (!email.trim()) errs.email = t('errors.emailRequired')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = t('errors.emailInvalid')
    if (!phone.trim()) errs.phone = t('errors.phoneRequired')
    if (!hotel.trim()) errs.hotel = t('errors.hotelRequired')
    if (!acceptTerms) errs.terms = t('errors.termsRequired')
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    const hasUnavailableItems = revalidatedItems.some((item) => {
      if (item.calendarMode === 'none') return false
      if (item.sesTime && item.sesTime !== '00:00' && item.availabilityReason) return false
      return !item.available
    })

    if (hasAvailabilityIssues && hasUnavailableItems) {
      alert(t('availabilityIssueDesc') + ' ' + t('pleaseSelectAvailableTime'))
      return
    }

    if (revalidatedItems.length > 1) {
      alert(t('errors.multiItemNotSupported'))
      return
    }

    if (revalidatedItems.length === 0) {
      alert(t('errors.cartEmpty'))
      router.push('/cart')
      return
    }

    setProcessing(true)

    try {
      const item = revalidatedItems[0]
      const atlanticoLanguage = toAtlanticoLang(locale)

      let calendarMode: 'sessions' | 'dates' | 'wdays_only' | 'none' = item.calendarMode || 'sessions'
      let requiresSessionTime = true

      if (item.tourDate) {
        try {
          const monthStart = item.tourDate.substring(0, 7) + '-01'
          const limitsResponse = await fetch(
            `/api/atlantico/limits?eventId=${item.t_id}&lang=${atlanticoLanguage}&month=${monthStart}`
          )
          if (limitsResponse.ok) {
            const limitsData = await limitsResponse.json()
            if (limitsData.ok) {
              if (limitsData.calendarMode) calendarMode = limitsData.calendarMode
              if (limitsData.requiresSessionTime !== undefined)
                requiresSessionTime = limitsData.requiresSessionTime
            }
          }
        } catch {
          // use defaults
        }
      }

      let sesTime: string | null = null
      let tourDate: string | null = null

      if (calendarMode === 'none') {
        sesTime = null
        tourDate = null
      } else if (requiresSessionTime === false) {
        sesTime = null
        tourDate = item.tourDate
      } else {
        tourDate = item.tourDate
        sesTime =
          item.sesTime && item.sesTime !== '' && item.sesTime !== '00:00'
            ? item.sesTime
            : null
        if (!sesTime) throw new Error(t('sessionTimeRequired'))
      }

      if (sesTime === '00:00') {
        alert(t('pleaseSelectValidTime'))
        setProcessing(false)
        return
      }

      const paymentPayload: Record<string, string | number | null> = {
        t_id: item.t_id,
        t_group: item.t_group,
        language: atlanticoLanguage,
        tourDate,
        sesTime,
        adults: item.adults,
        childs: item.childs,
        infants: item.infants,
        name: [name.trim(), surnames.trim()].filter(Boolean).join(' ').trim() || name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        ...(hotel.trim() && { hotel: hotel.trim() }),
        ...(room.trim() && { room: room.trim() }),
        ...(mpoint.trim() && { mpoint: mpoint.trim() }),
        ...(mtime.trim() && { mtime: mtime.trim() }),
        ...(notes.trim() && { notes: notes.trim() }),
      }
      if (item.isCombination && item.tourDate2) paymentPayload.tourDate2 = item.tourDate2
      if (item.isDateRange && item.tourDateEnd) paymentPayload.tourDateEnd = item.tourDateEnd

      const form = document.createElement('form')
      form.method = 'POST'
      form.action = '/api/atlantico/booking/payment'
      form.style.display = 'none'
      Object.entries(paymentPayload).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          const input = document.createElement('input')
          input.type = 'hidden'
          input.name = key
          input.value = String(value)
          form.appendChild(input)
        }
      })
      document.body.appendChild(form)
      form.submit()
      return
    } catch (error) {
      console.error('[CHECKOUT] Payment error:', error)
      let errorMessage = error instanceof Error ? error.message : t('errors.paymentFailed')
      if (errorMessage.includes('MISSING_ATLANTICO_USER_ID')) {
        errorMessage =
          'Server configuration error: ATLANTICO_USER_ID is missing. Please contact support.'
      }
      alert(errorMessage)
      setProcessing(false)
    }
  }

  if (!mounted || revalidating) {
    return (
      <Section variant="default" background="default">
        <Container size="lg">
          <div className="py-12 text-center">
            <p className="text-glass-600">{t('revalidating')}</p>
          </div>
        </Container>
      </Section>
    )
  }

  const validItems = items.filter((item) => !isCartItemExpired(item))
  const total = getTotal()
  const currency = getCurrency() || 'EUR'

  if (validItems.length === 0) {
    return (
      <Section variant="default" background="default">
        <Container size="lg">
          <div className="py-12 text-center space-y-6">
            <p className="text-lg text-glass-600">{t('empty')}</p>
            <Button variant="primary" onClick={() => router.push('/cart')}>
              {t('backToCart')}
            </Button>
          </div>
        </Container>
      </Section>
    )
  }

  return (
    <Section variant="default" background="default">
      <Container size="lg">
        <div className="flex items-center gap-2 py-6 border-b border-glass-200">
          <button
            type="button"
            onClick={() => router.push('/cart')}
            className="flex items-center gap-2 text-glass-600 hover:text-ocean-600"
          >
            <span className="w-8 h-8 rounded-full bg-glass-200 flex items-center justify-center text-sm font-bold">
              1
            </span>
            <span>{t('orderSummary')}</span>
          </button>
          <span className="text-glass-400">→</span>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-ocean-600 text-white flex items-center justify-center text-sm font-bold">
              2
            </span>
            <span className="font-semibold text-glass-900">{t('bookingDetails')}</span>
          </div>
          <span className="text-glass-400">→</span>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-glass-200 text-glass-500 flex items-center justify-center text-sm font-bold">
              3
            </span>
            <span className="text-glass-500">{t('paymentMethods')}</span>
          </div>
        </div>

        <div className="py-8 space-y-8">
          {hasPriceChanges && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 font-medium">{t('priceUpdated')}</p>
              {revalidatedItems.map((item) =>
                item.priceChanged && item.priceDiff ? (
                  <p key={item.itemKey} className="text-sm text-yellow-700 mt-1">
                    {t('priceDiff', {
                      diff: `${item.priceDiff > 0 ? '+' : ''}${item.priceDiff.toFixed(2)} ${currency}`,
                    })}
                  </p>
                ) : null
              )}
            </div>
          )}

          {hasAvailabilityIssues && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-4">
              <div>
                <p className="text-red-800 font-medium">{t('availabilityIssue')}</p>
                <p className="text-sm text-red-700 mt-1">{t('availabilityIssueDesc')}</p>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <div className="bg-gray-900 text-gray-100 rounded-lg p-4 space-y-3 font-mono text-xs">
                  <h3 className="text-sm font-semibold text-yellow-400">DEV DEBUG INFO</h3>
                  {revalidatedItems
                    .filter((item) => !item.available)
                    .map((item) => (
                      <div key={item.itemKey} className="border-t border-gray-700 pt-3">
                        <div className="text-yellow-400">Item: {item.itemKey}</div>
                        <div>tourDate: {item.tourDate} | sesTime: {item.sesTime}</div>
                        <div>availabilityReason: {item.availabilityReason}</div>
                        <div>availableTimes: {(item.availableTimes?.length ?? 0)}</div>
                      </div>
                    ))}
                </div>
              )}

              {revalidatedItems
                .filter(
                  (item) =>
                    !item.available &&
                    item.availabilityReason === 'no_sessions' &&
                    item.availableDates &&
                    item.availableDates.length > 0
                )
                .map((item) => {
                  const currentRecoveryDate = selectedRecoveryTimes[item.itemKey]
                    ? undefined
                    : item.tourDate
                  return (
                    <div key={item.itemKey} className="bg-white border border-red-300 rounded-lg p-4">
                      <p className="text-sm font-medium text-red-900 mb-2">
                        {item.availabilityError || t('noSessionsAvailable')}
                      </p>
                      <label className="block text-sm font-medium text-red-800">
                        {t('selectDate')}
                      </label>
                      <select
                        value={currentRecoveryDate || ''}
                        onChange={async (e) => {
                          setUserHasInteracted(true)
                          const newDate = e.target.value
                          let newSesTime = '00:00'
                          try {
                            const res = await fetch(
                              `/api/atlantico/loadLimits/${item.t_id}/${item.language}/${newDate}`
                            )
                            if (res.ok) {
                              const limits = await res.json()
                              const dateKey = newDate.replace(/-/g, '')
                              const sessions =
                                limits.sessionsByDate?.[dateKey] || limits.sessionsByDate?.[newDate]
                              if (Array.isArray(sessions) && sessions.length > 0) {
                                const first = sessions[0]
                                const time =
                                  typeof first === 'string'
                                    ? first
                                    : first.time || first.sesTime
                                if (time && time !== '00:00') newSesTime = time
                              }
                            }
                          } catch {
                            // ignore
                          }
                          updateItem(item.itemKey, { tourDate: newDate, sesTime: newSesTime })
                          setTimeout(() => revalidateCart(), 100)
                        }}
                        className="w-full px-3 py-2 border border-red-300 rounded-md text-sm mt-2"
                      >
                        <option value="">{t('selectDate')}</option>
                        {(item.availableDates || []).map((date) => (
                          <option key={date} value={date}>
                            {new Date(date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })}

              {revalidatedItems
                .filter(
                  (item) =>
                    !item.available &&
                    item.availableTimes &&
                    item.availableTimes.length > 0
                )
                .map((item) => {
                  const currentRecoveryTime =
                    selectedRecoveryTimes[item.itemKey] || item.sesTime || ''
                  return (
                    <div key={item.itemKey} className="bg-white border border-red-300 rounded-lg p-4">
                      <p className="text-sm font-medium text-red-900 mb-2">
                        {item.availabilityError || t('sessionNotAvailable')}
                      </p>
                      <label className="block text-sm font-medium text-red-800">
                        {t('selectNewTime', { date: item.tourDate || t('date') })}
                      </label>
                      <select
                        value={currentRecoveryTime}
                        onChange={(e) => {
                          setUserHasInteracted(true)
                          const newTime = e.target.value
                          setSelectedRecoveryTimes((prev) => ({ ...prev, [item.itemKey]: newTime }))
                          updateItem(item.itemKey, { sesTime: newTime })
                          setTimeout(() => revalidateCart(), 100)
                        }}
                        className="w-full px-3 py-2 border border-red-300 rounded-md text-sm mt-2"
                      >
                        {(item.availableTimes || []).map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })}

              {revalidatedItems
                .filter(
                  (item) =>
                    !item.available &&
                    (!item.availableTimes || item.availableTimes.length === 0)
                )
                .map((item) => (
                  <div key={item.itemKey} className="bg-white border border-red-300 rounded-lg p-4">
                    <p className="text-sm font-medium text-red-900">
                      {item.availabilityError || t('sessionNotAvailable')}
                    </p>
                    {item.availabilityReason === 'time_not_found' && (
                      <p className="text-xs text-red-700 mt-1">{t('timeRequiredMessage')}</p>
                    )}
                    {item.availabilityReason === 'no_sessions' && (
                      <p className="text-xs text-red-700 mt-1">{t('noSessionsMessage')}</p>
                    )}
                  </div>
                ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-glass-200 rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-bold text-glass-900 mb-6">{t('bookingDetails')}</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-glass-700 mb-1">
                        {t('name')} *
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2.5 border border-glass-300 rounded-lg"
                        required
                      />
                      {formErrors.name && (
                        <p className="text-sm text-red-600 mt-1">{formErrors.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-glass-700 mb-1">
                        {t('surnames')}
                      </label>
                      <input
                        type="text"
                        value={surnames}
                        onChange={(e) => setSurnames(e.target.value)}
                        className="w-full px-3 py-2.5 border border-glass-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-glass-700 mb-1">
                      {t('email')} *{' '}
                      <span className="text-glass-500 font-normal">({t('emailVoucher')})</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2.5 border border-glass-300 rounded-lg"
                      required
                    />
                    {formErrors.email && (
                      <p className="text-sm text-red-600 mt-1">{formErrors.email}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-glass-700 mb-1">
                      {t('phone')} *
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2.5 border border-glass-300 rounded-lg"
                      placeholder="+34 702 123 456"
                      required
                    />
                    {formErrors.phone && (
                      <p className="text-sm text-red-600 mt-1">{formErrors.phone}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-glass-700 mb-1">
                      {t('hotel')} *
                    </label>
                    <input
                      type="text"
                      value={hotel}
                      onChange={(e) => setHotel(e.target.value)}
                      className="w-full px-3 py-2.5 border border-glass-300 rounded-lg"
                      required
                    />
                    {formErrors.hotel && (
                      <p className="text-sm text-red-600 mt-1">{formErrors.hotel}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-glass-700 mb-1">
                      {t('comments')}
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2.5 border border-glass-300 rounded-lg"
                      placeholder={t('additionalInfoPlaceholder')}
                    />
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-1 rounded"
                    />
                    <span className="text-sm text-glass-700">
                      {t('acceptTermsPrefix')}
                      <Link
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ocean-600 hover:underline font-medium"
                      >
                        {t('termsLink')}
                      </Link>
                    </span>
                  </label>
                  {formErrors.terms && (
                    <p className="text-sm text-red-600">{formErrors.terms}</p>
                  )}
                </div>
              </div>

              <div>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={
                    processing ||
                    hasAvailabilityIssues ||
                    revalidatedItems.some((item) => !item.available)
                  }
                  className="flex-1 sm:flex-initial"
                >
                  {processing ? t('processing') : t('paymentMethods')}
                </Button>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white border border-glass-200 rounded-xl p-6 sticky top-4 shadow-sm">
                <h2 className="text-lg font-bold text-glass-900 mb-4">{t('orderSummary')}</h2>
                {revalidatedItems.map((item) => (
                  <div key={item.itemKey} className="flex gap-4">
                    <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-glass-100">
                      <CartItemImage
                        code={item.t_group}
                        alt={item.tourName || `Tour ${item.t_group}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-glass-900 line-clamp-2">
                        {item.tourName
                          ? decodeTextFromApi(item.tourName)
                          : `${item.t_group} - ${item.t_id}`}
                      </h3>
                      <p className="text-sm text-glass-600 mt-1">
                        {item.adults + item.childs + item.infants} Pax · {formatDate(item.tourDate)}{' '}
                        · {item.language}
                      </p>
                      <p className="text-lg font-bold text-ocean-600 mt-1">
                        {(item.newPriceSnapshot || item.priceSnapshot).total.toFixed(2)} {currency}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="border-t border-glass-200 pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-glass-900">{t('total')}</span>
                    <span className="text-xl font-bold text-glass-900">
                      {total.toFixed(2)} {currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </Container>
    </Section>
  )
}
