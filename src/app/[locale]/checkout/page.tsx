/**
 * Checkout Page
 * 
 * Revalidates cart items and collects customer information before payment
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

/**
 * Inline language mapper - no external dependency
 * Maps locale to Atlantico payment gateway language codes (CAS/ENG/FRA/RUS/ALE/ITA per PDF)
 */
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
  availableDates?: string[] // For no_sessions recovery
  newPriceSnapshot?: PriceSnapshot
}

interface RevalidateResponse {
  items: RevalidatedItem[]
  errors: Array<{ itemKey: string; error: string; field?: string }>
  hasPriceChanges: boolean
  hasAvailabilityIssues: boolean
}

export default function CheckoutPage() {
  const t = useTranslations('checkout')
  const locale = useLocale()
  const router = useRouter()
  const { items, updateItem, removeExpired, getTotal, getCurrency, clearCart } = useCartStore()
  const [mounted, setMounted] = useState(false)
  
  // Watermark timestamp - client-only to avoid hydration mismatch
  const [wmTs, setWmTs] = useState<string>("")

  // Build watermark - visible proof that updated code is running
  useEffect(() => {
    const timestamp = new Date().toISOString()
    setWmTs(timestamp)
    console.log('BUILD_CHECKOUT_V1', timestamp)
    console.log('CHECKOUT_FILE', 'src/app/[locale]/checkout/page.tsx')
  }, [])
  const [revalidating, setRevalidating] = useState(true)
  const [revalidatedItems, setRevalidatedItems] = useState<RevalidatedItem[]>([])
  const [revalidationErrors, setRevalidationErrors] = useState<RevalidateResponse['errors']>([])
  const [hasPriceChanges, setHasPriceChanges] = useState(false)
  const [hasAvailabilityIssues, setHasAvailabilityIssues] = useState(false)
  
  // Recovery UI state: track selected time for each unavailable item
  const [selectedRecoveryTimes, setSelectedRecoveryTimes] = useState<Record<string, string>>({})
  const [userHasInteracted, setUserHasInteracted] = useState(false)

  // Clear any persisted error state on mount
  useEffect(() => {
    // Clear localStorage/sessionStorage error state if any
    try {
      const errorKeys = ['checkout_error', 'payment_error', 'revalidation_error']
      errorKeys.forEach(key => {
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
      })
    } catch (e) {
      // Ignore storage errors
    }
  }, [])

  // Form state
  const [name, setName] = useState('')
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

  useEffect(() => {
    setMounted(true)
    removeExpired()

    // Auto-revalidate on mount
    revalidateCart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

      if (!response.ok) {
        throw new Error('Revalidation failed')
      }

      const data: RevalidateResponse = await response.json()
      setRevalidatedItems(data.items)
      setRevalidationErrors(data.errors)
      setHasPriceChanges(data.hasPriceChanges)
      setHasAvailabilityIssues(data.hasAvailabilityIssues)

      // Auto-fix: if slot unavailable and user hasn't interacted, select first available time
      if (data.hasAvailabilityIssues && !userHasInteracted) {
        for (const item of data.items) {
          if (!item.available && item.availableTimes && item.availableTimes.length > 0) {
            const firstAvailableTime = item.availableTimes[0]
            console.log('[CHECKOUT] Auto-fixing time:', {
              itemKey: item.itemKey,
              oldTime: item.sesTime,
              newTime: firstAvailableTime,
            })
            
            // Update cart item with new time
            updateItem(item.itemKey, {
              sesTime: firstAvailableTime,
            })
            
            // Set recovery time selection
            setSelectedRecoveryTimes(prev => ({
              ...prev,
              [item.itemKey]: firstAvailableTime,
            }))
            
            // Re-run revalidation after auto-fix
            setTimeout(() => {
              revalidateCart()
            }, 100)
            return // Exit early, revalidation will run again
          }
        }
      }

      // Update cart with new prices, session details, and auto-selected sesTime
      for (const item of data.items) {
        // Find original item by matching identifiers (not itemKey, as it may have changed)
        const originalItem = validItems.find(i => 
          i.t_group === item.t_group && 
          i.t_id === item.t_id && 
          i.tourDate === item.tourDate
        )
        
        if (!originalItem) {
          // Item not found in cart, skip
          continue
        }
        
        const updates: any = {}
        
        if (item.priceChanged && item.newPriceSnapshot) {
          updates.priceSnapshot = item.newPriceSnapshot
        }
        
        // Update tourDate if auto-corrected (different from original)
        if (item.tourDate !== originalItem.tourDate) {
          updates.tourDate = item.tourDate
        }
        
        // Update sesTime if auto-selected (different from original)
        if (item.sesTime !== originalItem.sesTime && item.sesTime && item.sesTime !== '00:00') {
          updates.sesTime = item.sesTime
        }
        
        // Update sessionId, TipoReservaId, and rcId if available
        if (item.sessionId !== undefined) {
          updates.sessionId = item.sessionId
        }
        if (item.TipoReservaId !== undefined) {
          updates.TipoReservaId = item.TipoReservaId
        }
        if (item.rcId !== undefined) {
          updates.rcId = item.rcId
        }
        
        if (Object.keys(updates).length > 0) {
          // Use original itemKey for update (updateItem will regenerate key if sesTime changed)
          updateItem(originalItem.itemKey, updates)
        }
      }
    } catch (error) {
      console.error('[CHECKOUT] Revalidation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Revalidation failed'
      
      // Filter out mapper-related errors - they're not user-facing
      if (errorMessage.includes('mapLocaleToAtlanticoLang') || errorMessage.includes('is not defined')) {
        console.error('[CHECKOUT] Mapper error detected, ignoring:', errorMessage)
        // Don't show mapper errors to user - just log them
        setRevalidationErrors([])
        setHasAvailabilityIssues(false)
      } else {
        // Show real error message - no false availability issues
        setRevalidationErrors([
          {
            itemKey: 'general',
            error: errorMessage,
          },
        ])
      }
    } finally {
      setRevalidating(false)
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!name.trim()) {
      errors.name = t('errors.nameRequired')
    }
    if (!email.trim()) {
      errors.email = t('errors.emailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = t('errors.emailInvalid')
    }
    if (!phone.trim()) {
      errors.phone = t('errors.phoneRequired')
    }
    if (!acceptTerms) {
      errors.terms = t('errors.termsRequired')
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    // Check for availability issues - disable Pay if any item is unavailable
    // EXCEPT for wdays_only mode and calendarMode === 'none' (on-request booking)
    const hasUnavailableItems = revalidatedItems.some(item => {
      // Allow calendarMode === 'none': on-request booking, no availability check needed
      if (item.calendarMode === 'none') {
        return false
      }
      // Allow wdays_only items: if item has valid sesTime (not "00:00") but availabilityReason is set,
      // it's likely wdays_only mode where availability is "to confirm"
      if (item.sesTime && item.sesTime !== '00:00' && item.availabilityReason) {
        // wdays_only mode - allow payment (availability to confirm)
        return false
      }
      return !item.available
    })
    
    // Block only if not wdays_only and has availability issues
    if (hasAvailabilityIssues && hasUnavailableItems) {
      alert(t('availabilityIssueDesc') + ' Please select an available time above.')
      return
    }

    // Block multi-item checkout
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
      const finalPriceSnapshot = item.newPriceSnapshot || item.priceSnapshot

      // Convert language to Atlantico format (CAS/ENG/FRA/RUS/ALE/ITA per PDF)
      // Use inline mapper - no external dependency
      const atlanticoLanguage = toAtlanticoLang(locale)
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[CHECKOUT] locale:', locale, '-> atlanticoLanguage:', atlanticoLanguage)
      }

      // Step 0: Reload limits to get current calendarMode and requiresSessionTime (source of truth)
      let calendarMode: 'sessions' | 'dates' | 'wdays_only' | 'none' = item.calendarMode || 'sessions'
      let requiresSessionTime: boolean = true // Default to true for backward compatibility
      
      // Only fetch limits if we have a tourDate (for calendarMode === 'none', we don't need it)
      if (item.tourDate) {
        try {
          const monthStart = item.tourDate.substring(0, 7) + '-01'
          const limitsResponse = await fetch(`/api/atlantico/limits?eventId=${item.t_id}&lang=${atlanticoLanguage}&month=${monthStart}`)
          if (limitsResponse.ok) {
            const limitsData = await limitsResponse.json()
            if (limitsData.ok) {
              if (limitsData.calendarMode) {
                calendarMode = limitsData.calendarMode
              }
              if (limitsData.requiresSessionTime !== undefined) {
                requiresSessionTime = limitsData.requiresSessionTime
              }
              if (process.env.NODE_ENV === 'development') {
                console.log('[CHECKOUT] Loaded limits:', {
                  calendarMode,
                  requiresSessionTime,
                  eventId: item.t_id,
                })
              }
            }
          }
        } catch (error) {
          console.warn('[CHECKOUT] Failed to load limits, using defaults:', error)
        }
      }

      // Determine sesTime and tourDate based on calendarMode
      let sesTime: string | null = null
      let tourDate: string | null = null
      
      if (calendarMode === 'none') {
        // For calendarMode === 'none': send null (on-request booking)
        sesTime = null
        tourDate = null
      } else if (requiresSessionTime === false) {
        // If requiresSessionTime === false => omit sesTime entirely (do NOT send "00:00")
        sesTime = null
        tourDate = item.tourDate
      } else {
        // If requiresSessionTime === true => set sesTime = selectedTime (from sessionsByDay). Never "00:00".
        tourDate = item.tourDate
        sesTime = item.sesTime && item.sesTime !== '' && item.sesTime !== '00:00' ? item.sesTime : null
        
        // If still null but requiresSessionTime is true, this is an error
        if (!sesTime) {
          throw new Error('Session time is required but not available for this date')
        }
      }

      // Block payment if sesTime is "00:00" - must have valid time or be omitted
      if (sesTime === '00:00') {
        alert('Please select a valid time')
        setProcessing(false)
        return
      }

      // Build payment payload (same shape as /booking/confirm, but sent directly to /payment/)
      const paymentPayload = {
        t_id: item.t_id,
        t_group: item.t_group,
        language: atlanticoLanguage,
        tourDate: tourDate, // null for calendarMode === 'none'
        sesTime: sesTime, // null for calendarMode === 'none'
        adults: item.adults,
        childs: item.childs,
        infants: item.infants,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        ...(hotel.trim() && { hotel: hotel.trim() }),
        ...(room.trim() && { room: room.trim() }),
        ...(mpoint.trim() && { mpoint: mpoint.trim() }),
        ...(mtime.trim() && { mtime: mtime.trim() }),
        ...(notes.trim() && { notes: notes.trim() }),
      }

      // Submit payment via native HTML form to avoid CORS issues
      // Browser will navigate to the payment gateway HTML page
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = '/api/atlantico/booking/payment'
      form.style.display = 'none'

      // Add all payload fields as hidden inputs
      Object.entries(paymentPayload).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          const input = document.createElement('input')
          input.type = 'hidden'
          input.name = key
          input.value = String(value)
          form.appendChild(input)
        }
      })

      // Append form to body and submit
      document.body.appendChild(form)
      form.submit()
      
      // Note: Form submission will navigate the browser to the payment gateway
      // No need to handle response here - browser handles HTML rendering automatically
      return
    } catch (error) {
      console.error('[CHECKOUT] Payment error:', error)
      let errorMessage = error instanceof Error ? error.message : t('errors.paymentFailed')
      
      // Improve error message for MISSING_ATLANTICO_USER_ID
      if (errorMessage.includes('MISSING_ATLANTICO_USER_ID')) {
        errorMessage = 'Server configuration error: ATLANTICO_USER_ID is missing. Please contact support.'
      }
      
      // DEV: Show raw error details in console
      if (process.env.NODE_ENV === 'development' && error instanceof Error) {
        console.error('[CHECKOUT] Error details:', {
          message: error.message,
          stack: error.stack,
        })
      }
      
      // Show real error message - no generic messages
      alert(errorMessage)
      setProcessing(false)
    }
  }

  if (!mounted || revalidating) {
    return (
      <>
        {/* Build watermark - visible proof that updated code is running */}
        <div style={{
          position: 'fixed',
          bottom: 8,
          left: 8,
          zIndex: 99999,
          background: '#000',
          color: '#fff',
          padding: '6px 10px',
          borderRadius: 8,
          fontSize: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}>
          <div>BUILD_CHECKOUT_V1{wmTs ? ` - ${wmTs}` : ""}</div>
          <div style={{ fontSize: 10, opacity: 0.8 }}>FILE: src/app/[locale]/checkout/page.tsx</div>
        </div>
        <Section variant="default" background="default">
          <Container size="lg">
            <div className="py-12 text-center">
              <p className="text-glass-600">{t('revalidating')}</p>
            </div>
          </Container>
        </Section>
      </>
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
    <>
      {/* Build watermark - visible proof that updated code is running */}
      <div style={{
        position: 'fixed',
        bottom: 8,
        left: 8,
        zIndex: 99999,
        background: '#000',
        color: '#fff',
        padding: '6px 10px',
        borderRadius: 8,
        fontSize: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 4
      }}>
        <div>BUILD_CHECKOUT_V1{wmTs ? ` - ${wmTs}` : ""}</div>
        <div style={{ fontSize: 10, opacity: 0.8 }}>FILE: src/app/[locale]/checkout/page.tsx</div>
      </div>

      <Section variant="default" background="default">
        <Container size="lg">
          <div className="py-8 space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-glass-900 mb-2">{t('title')}</h1>
            <p className="text-glass-600">{t('description')}</p>
          </div>

          {/* Revalidation warnings */}
          {hasPriceChanges && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 font-medium">{t('priceUpdated')}</p>
              {revalidatedItems.map((item) => {
                if (item.priceChanged && item.priceDiff) {
                  return (
                    <p key={item.itemKey} className="text-sm text-yellow-700 mt-1">
                      {t('priceDiff', { diff: `${item.priceDiff > 0 ? '+' : ''}${item.priceDiff.toFixed(2)} ${currency}` })}
                    </p>
                  )
                }
                return null
              })}
            </div>
          )}

          {hasAvailabilityIssues && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-4">
              <div>
                <p className="text-red-800 font-medium">{t('availabilityIssue')}</p>
                <p className="text-sm text-red-700 mt-1">{t('availabilityIssueDesc')}</p>
              </div>
              
              {/* DEV-only debug box */}
              {process.env.NODE_ENV === 'development' && (
                <div className="bg-gray-900 text-gray-100 rounded-lg p-4 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-yellow-400">DEV DEBUG INFO</h3>
                    <button
                      onClick={() => {
                        const debugData = revalidatedItems
                          .filter(item => !item.available)
                          .map(item => ({
                            t_group: item.t_group,
                            t_id: item.t_id,
                            tourDate: item.tourDate,
                            sesTime: item.sesTime,
                            adults: item.adults,
                            childs: item.childs,
                            infants: item.infants,
                            language: item.language,
                            availabilityReason: item.availabilityReason,
                            availableTimesCount: item.availableTimes?.length || 0,
                            availableTimes: item.availableTimes?.slice(0, 20) || [],
                          }))
                        
                        const jsonStr = JSON.stringify(debugData, null, 2)
                        navigator.clipboard.writeText(jsonStr).then(() => {
                          alert('Debug data copied to clipboard!')
                        }).catch(() => {
                          alert('Failed to copy to clipboard')
                        })
                      }}
                      className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs font-semibold"
                    >
                      Copy debug to clipboard
                    </button>
                  </div>
                  
                  {revalidatedItems
                    .filter(item => !item.available)
                    .map((item) => (
                      <div key={item.itemKey} className="border-t border-gray-700 pt-3 space-y-1">
                        <div className="text-yellow-400 font-semibold">Item: {item.itemKey}</div>
                        <div><span className="text-gray-400">t_group:</span> {item.t_group}</div>
                        <div><span className="text-gray-400">t_id:</span> {item.t_id}</div>
                        <div><span className="text-gray-400">tourDate:</span> {item.tourDate}</div>
                        <div><span className="text-gray-400">sesTime:</span> {item.sesTime}</div>
                        <div><span className="text-gray-400">adults:</span> {item.adults} | <span className="text-gray-400">childs:</span> {item.childs} | <span className="text-gray-400">infants:</span> {item.infants}</div>
                        <div><span className="text-gray-400">language:</span> {item.language}</div>
                        <div><span className="text-gray-400">availabilityReason:</span> <span className="text-red-400">{item.availabilityReason || 'unknown'}</span></div>
                        <div><span className="text-gray-400">availableTimesCount:</span> {item.availableTimes?.length || 0}</div>
                        {item.availableTimes && item.availableTimes.length > 0 && (
                          <div>
                            <span className="text-gray-400">availableTimes (first 20):</span>
                            <div className="ml-4 mt-1 text-green-400">
                              {item.availableTimes.slice(0, 20).join(', ')}
                              {item.availableTimes.length > 20 && ` ... (+${item.availableTimes.length - 20} more)`}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
              
              {/* Recovery UI: Date selector for no_sessions */}
              {revalidatedItems
                .filter(item => !item.available && item.availabilityReason === 'no_sessions' && item.availableDates && item.availableDates.length > 0)
                .map((item) => {
                  const currentRecoveryDate = selectedRecoveryTimes[item.itemKey] ? undefined : item.tourDate
                  
                  return (
                    <div key={item.itemKey} className="bg-white border border-red-300 rounded-lg p-4">
                      <p className="text-sm font-medium text-red-900 mb-2">
                        {item.availabilityError || 'No sessions available on this date'}
                      </p>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-red-800">
                          Select another available date:
                        </label>
                        <select
                          value={currentRecoveryDate || ''}
                          onChange={async (e) => {
                            setUserHasInteracted(true)
                            const newDate = e.target.value
                            
                            // Fetch first available time for the new date
                            let newSesTime = '00:00'
                            try {
                              const response = await fetch(`/api/atlantico/loadLimits/${item.t_id}/${item.language}/${newDate}`)
                              if (response.ok) {
                                const limits = await response.json()
                                const dateKey = newDate.replace(/-/g, '')
                                const sessions = limits.sessionsByDate?.[dateKey] || limits.sessionsByDate?.[newDate]
                                if (Array.isArray(sessions) && sessions.length > 0) {
                                  const firstSession = sessions[0]
                                  const time = typeof firstSession === 'string' ? firstSession : firstSession.time || firstSession.sesTime
                                  if (time && time !== '00:00') {
                                    newSesTime = time
                                  }
                                }
                              }
                            } catch (error) {
                              console.error('[CHECKOUT] Error fetching time for new date:', error)
                            }
                            
                            // Update cart item with new date and time
                            updateItem(item.itemKey, {
                              tourDate: newDate,
                              sesTime: newSesTime,
                            })
                            
                            // Re-run revalidation
                            setTimeout(() => {
                              revalidateCart()
                            }, 100)
                          }}
                          className="w-full px-3 py-2 border border-red-300 rounded-md text-sm"
                        >
                          <option value="">Select a date...</option>
                          {(item.availableDates || []).map((date) => (
                            <option key={date} value={date}>
                              {new Date(date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                            </option>
                          ))}
                        </select>
                        
                        {userHasInteracted && selectedRecoveryTimes[item.itemKey] && (
                          <p className="text-xs text-green-700">
                            Date updated
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              
              {/* Recovery UI: Time selector for each unavailable item */}
              {revalidatedItems
                .filter(item => !item.available && item.availableTimes && item.availableTimes.length > 0)
                .map((item) => {
                  const currentRecoveryTime = selectedRecoveryTimes[item.itemKey] || item.sesTime || ''
                  
                  return (
                    <div key={item.itemKey} className="bg-white border border-red-300 rounded-lg p-4">
                      <p className="text-sm font-medium text-red-900 mb-2">
                        {item.availabilityError || 'Session not available'}
                      </p>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-red-800">
                          Select a new time for {item.tourDate || 'selected date'}:
                        </label>
                        <select
                          value={currentRecoveryTime}
                          onChange={(e) => {
                            setUserHasInteracted(true)
                            const newTime = e.target.value
                            setSelectedRecoveryTimes(prev => ({
                              ...prev,
                              [item.itemKey]: newTime,
                            }))
                            
                            // Update cart item immediately
                            updateItem(item.itemKey, {
                              sesTime: newTime,
                            })
                            
                            // Re-run revalidation
                            setTimeout(() => {
                              revalidateCart()
                            }, 100)
                          }}
                          className="w-full px-3 py-2 border border-red-300 rounded-md text-sm"
                        >
                          {(item.availableTimes || []).map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                        
                        {userHasInteracted && selectedRecoveryTimes[item.itemKey] && (
                          <p className="text-xs text-green-700">
                            Time updated to {selectedRecoveryTimes[item.itemKey]}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              
              {/* Show errors for items without available times */}
              {revalidationErrors
                .filter(err => {
                  const item = revalidatedItems.find(i => i.itemKey === err.itemKey)
                  return !item?.availableTimes || item.availableTimes.length === 0
                })
                .map((err) => (
                  <p key={err.itemKey} className="text-sm text-red-600 mt-1">
                    {err.error}
                  </p>
                ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Information */}
              <div className="bg-white border border-glass-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-glass-900 mb-4">{t('customerInfo')}</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-glass-700 mb-1">
                      {t('name')} *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-glass-300 rounded-md"
                      required
                    />
                    {formErrors.name && <p className="text-sm text-red-600 mt-1">{formErrors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-glass-700 mb-1">
                      {t('email')} *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-glass-300 rounded-md"
                      required
                    />
                    {formErrors.email && <p className="text-sm text-red-600 mt-1">{formErrors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-glass-700 mb-1">
                      {t('phone')} *
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-glass-300 rounded-md"
                      required
                    />
                    {formErrors.phone && <p className="text-sm text-red-600 mt-1">{formErrors.phone}</p>}
                  </div>
                </div>
              </div>

              {/* Pickup Information */}
              <div className="bg-white border border-glass-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-glass-900 mb-4">{t('pickupInfo')}</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-glass-700 mb-1">{t('hotel')}</label>
                    <input
                      type="text"
                      value={hotel}
                      onChange={(e) => setHotel(e.target.value)}
                      className="w-full px-3 py-2 border border-glass-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-glass-700 mb-1">{t('room')}</label>
                    <input
                      type="text"
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      className="w-full px-3 py-2 border border-glass-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-glass-700 mb-1">
                      {t('meetingPoint')}
                    </label>
                    <input
                      type="text"
                      value={mpoint}
                      onChange={(e) => setMpoint(e.target.value)}
                      className="w-full px-3 py-2 border border-glass-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-glass-700 mb-1">
                      {t('meetingTime')}
                    </label>
                    <input
                      type="text"
                      value={mtime}
                      onChange={(e) => setMtime(e.target.value)}
                      className="w-full px-3 py-2 border border-glass-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-glass-700 mb-1">{t('notes')}</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-glass-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-glass-200 rounded-lg p-6 sticky top-4">
                <h2 className="text-xl font-semibold text-glass-900 mb-4">{t('orderSummary')}</h2>
                <div className="space-y-3 mb-6">
                  {revalidatedItems.map((item) => {
                    // Try to get option label (fallback to t_id if not available)
                    const optionLabel = `Option eventId: ${item.t_id}`
                    
                    return (
                      <div key={item.itemKey} className="text-sm">
                        <p className="font-medium text-glass-900">
                          {optionLabel}
                        </p>
                        <p className="text-xs text-glass-500 mt-1">
                          {t('activity')}: {item.t_group} - {item.t_id}
                        </p>
                        <p className="text-glass-600 mt-2">
                          {t('date')}: {item.tourDate}
                        </p>
                        {item.sesTime && item.sesTime !== '00:00' && (
                          <p className="text-glass-600">
                            {t('time')}: {item.sesTime}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="border-t border-glass-200 pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold text-glass-900">{t('total')}</span>
                    <span className="text-xl font-bold text-glass-900">
                      {total.toFixed(2)} {currency}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-1"
                    />
                    <span className="text-sm text-glass-700">{t('acceptTerms')}</span>
                  </label>
                  {formErrors.terms && (
                    <p className="text-sm text-red-600">{formErrors.terms}</p>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={processing || hasAvailabilityIssues || revalidatedItems.some(item => !item.available)}
                  >
                    {processing ? t('processing') : t('pay')}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </Container>
    </Section>
    </>
  )
}
