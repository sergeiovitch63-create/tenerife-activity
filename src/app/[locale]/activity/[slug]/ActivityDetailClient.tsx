'use client'

/**
 * Activity Detail Client Component
 *
 * Displays activity details with:
 * - Hero image
 * - Title
 * - Price "from" (if available)
 * - Tabs: What you do / Description / Details / Prices / Cancellation / Reviews
 * - Calendar component (loadLimits)
 * - Prices component (loadPrices)
 * - Booking form (POST /payment/ - redirects to payment gateway)
 * - Cancel booking (POST cancel)
 */

import { SafeImage } from '@/components/SafeImage'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { atlanticoAssetUrl } from '@/lib/atlantico/assets'
import type { NormalizedCatalogItem } from '@/lib/atlantico/sync-catalog'
import { decodeTextFromApi, sanitizeAtlanticoHtml } from '@/lib/atlantico/htmlAssets'
import { FaqSections } from '@/components/atlantico/FaqSections'
import { OverviewInfoBar } from '@/components/atlantico/OverviewInfoBar'
import { buildWhatsAppUrl, buildCallUrl } from '@/lib/booking/contactHelpers'
import { MeetingPointsDisplay } from '@/components/booking/MeetingPointsDisplay'
import { extractImageUrls } from '@/lib/atlantico/images.client'
import { GROUP_DETAILS_IMAGES } from '@/data/group-details-images.generated'

type EventOption = {
  eventId: string
  label: string
  pProd?: '0' | '1' | '2' | '3'
  icons?: string[]
  image?: string | null // Image URL for this event
}

type PricesResponseOk =
  | {
      ok: true
      type: 'per_person'
      adultPrice: number
      childPrice: number
      infantPrice: number
      currency?: 'EUR'
      raw?: any
    }
  | {
      ok: true
      type: 'per_day'
      tiers: Array<{ days: number; price: number }>
      currency?: 'EUR'
      raw?: any
    }

type PricesResponseError = { ok: false; raw?: any; reason: string }

type PriceStatus = 'idle' | 'loading' | 'ok' | 'error' | 'unsupported'

interface ActivityDetailClientProps {
  item: NormalizedCatalogItem
  locale: string
  lang: string
  groupDetails: unknown | null
  groupBasePrice: number | null
  eventOptions: EventOption[]
  heroImageUrl: string | null
}

function formatEUR(n: number): string {
  return `€${n.toFixed(2)}`
}

function iconAltFromFilename(filename: string): string {
  const base = filename.split('/').pop() || filename
  return base.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim() || 'icon'
}

/**
 * Parse FAQ/Includes text into a clean list of items
 * Handles formats like "INCLUDES:\n\n\t\n\tItem 1\n\t\n\t\n\tItem 2"
 */
function parseIncludesList(faqText: string | null | undefined): string[] {
  if (!faqText || typeof faqText !== 'string') return []
  
  // Remove "INCLUDES:" prefix if present
  let text = faqText.replace(/^INCLUDES:\s*/i, '').trim()
  
  // Split by newlines and tabs, filter empty, clean up
  const items = text
    .split(/\n|\t/)
    .map(item => item.trim())
    .filter(item => item.length > 0 && !item.match(/^\s*$/))
  
  return items
}

function EventIcon({ filename }: { filename: string }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const url = await atlanticoAssetUrl(filename, 'icon')
      if (!cancelled) setSrc(url)
    })().catch(() => {
      if (!cancelled) setSrc(null)
    })
    return () => {
      cancelled = true
    }
  }, [filename])

  // Always render - SafeImage handles fallback

  // SafeImage handles fallback automatically - no need for failed state
  return (
    <span className="inline-flex items-center gap-2 px-2 py-1 bg-glass-50 border border-glass-200 rounded text-xs text-glass-700">
      <SafeImage
        src={src || undefined}
        alt={iconAltFromFilename(filename)}
        width={18}
        height={18}
        className="object-contain"
      />
      <span>{iconAltFromFilename(filename)}</span>
    </span>
  )
}

function getPriceMode(pProd: EventOption['pProd'], apiType: PricesResponseOk['type']): PricesResponseOk['type'] {
  if (pProd === '0') return 'per_person'
  if (pProd === '2') return 'per_day'
  return apiType
}

export function ActivityDetailClient({
  item,
  lang,
  groupBasePrice,
  eventOptions,
  heroImageUrl,
}: ActivityDetailClientProps) {
  const tGroup = useTranslations('groupDetails')
  const tDetail = useTranslations('activityDetail')
  const [selectedTab, setSelectedTab] = useState<'overview' | 'whats-included' | 'description' | 'what-you-do' | 'details' | 'prices' | 'cancellation' | 'reviews'>('overview')
  
  // Check if this is activity 508 for custom tab layout
  const isActivity508 = item.groupCode === '508' || item.slug === '508'
  
  // Debug log - Always log to help debug
  useEffect(() => {
    console.log('[ACTIVITY_508_CHECK]', {
      groupCode: item.groupCode,
      slug: item.slug,
      isActivity508,
      itemTitle: item.title,
      willRenderPremium: isActivity508,
    })
  }, [item.groupCode, item.slug, isActivity508, item.title])

  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')

  // Calendar state (from /api/atlantico/limits)
  const [sessionsByDay, setSessionsByDay] = useState<Record<string, Array<{ time: string; available: number; sessionId?: string }>>>({})
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [loadingCalendar, setLoadingCalendar] = useState(false)
  const [availabilityMode, setAvailabilityMode] = useState<'NORMAL' | 'NO_SCHEDULE_PUBLISHED' | null>(null)
  const [calendarMode, setCalendarMode] = useState<'sessions' | 'dates' | 'wdays_only' | 'none' | null>(null)
  const [requiresSessionTime, setRequiresSessionTime] = useState<boolean>(true) // Default to true for backward compatibility
  const [projectedAvailableDates, setProjectedAvailableDates] = useState<string[]>([])
  const [eventDetailsTimes, setEventDetailsTimes] = useState<string[]>([]) // For wdays_only mode

  // Complete Atlantico info state
  const [eventDetails, setEventDetails] = useState<any>(null)
  const [groupDetails, setGroupDetails] = useState<any>(null)
  const [limitsInfo, setLimitsInfo] = useState<any>(null)
  
  // API error states (user-visible)
  const [groupDetailsError, setGroupDetailsError] = useState(false)
  const [eventDetailsError, setEventDetailsError] = useState(false)
  const [limitsError, setLimitsError] = useState(false)
  
  // Image states
  const [eventImageUrl, setEventImageUrl] = useState<string | null>(null)
  const [groupImageUrl, setGroupImageUrl] = useState<string | null>(null)
  // Carousel state for event 303
  const [heroCarouselIndex, setHeroCarouselIndex] = useState<number>(0)
  // Carousel state for mobile gallery (default layout)
  const [mobileGalleryIndex, setMobileGalleryIndex] = useState<number>(0)
  const mobileGalleryTouchStart = useRef<number>(0)
  // All images from API (for gallery)
  const [allImages, setAllImages] = useState<string[]>([])
  // Local curated images from /public/images/pictures/tours-vip/{code}
  const [localGroupImages, setLocalGroupImages] = useState<string[]>([])
  
  // Debug log for activity 508
  useEffect(() => {
    if (isActivity508 && process.env.NODE_ENV === 'development') {
      console.log('[ACTIVITY_508] Detected activity 508', {
        groupCode: item.groupCode,
        hasGroupDetails: !!groupDetails,
        hasAllImages: allImages.length > 0,
        selectedTab,
      })
    }
  }, [isActivity508, item.groupCode, groupDetails, allImages.length, selectedTab])

  const [pricesData, setPricesData] = useState<PricesResponseOk | PricesResponseError | null>(null)
  const [priceStatus, setPriceStatus] = useState<PriceStatus>('idle')

  const [bookingForm, setBookingForm] = useState({
    adults: 1,
    children: 0,
    infants: 0,
    name: '',
    email: '',
    phone: '',
  })
  const [isBooking, setIsBooking] = useState(false)
  const [bookingResult, setBookingResult] = useState<{ success: boolean; message: string } | null>(null)

  // Auto-select first event option if available
  useEffect(() => {
    if (eventOptions.length > 0 && !selectedEventId) {
      // Auto-select first option automatically
      setSelectedEventId(eventOptions[0].eventId)
    }
  }, [eventOptions, selectedEventId])

  const selectedOption = useMemo(() => {
    if (!selectedEventId) return null
    return eventOptions.find((opt) => opt.eventId === selectedEventId) || null
  }, [eventOptions, selectedEventId])


  // State for auto-switched month
  const [autoSwitchedMonth, setAutoSwitchedMonth] = useState<string | null>(null)
  const [noAvailabilityFound, setNoAvailabilityFound] = useState(false)

  // Fetch calendar (loadLimits) when eventId or month changes
  useEffect(() => {
    if (!selectedEventId) {
      setSessionsByDay({})
      setAvailableDates([])
      setSelectedDate('')
      setSelectedTime('')
      setAutoSwitchedMonth(null)
      setNoAvailabilityFound(false)
      return
    }

    setLoadingCalendar(true)
    setAutoSwitchedMonth(null)
    setNoAvailabilityFound(false)

    // Normalize month to YYYY-MM-01
    const normalizedMonth = (() => {
      const match = currentMonth.match(/^(\d{4}-\d{2})/)
      if (match) {
        return `${match[1]}-01`
      }
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    })()

    fetch(`/api/atlantico/limits?eventId=${encodeURIComponent(selectedEventId)}&lang=${encodeURIComponent(lang)}&month=${encodeURIComponent(normalizedMonth)}`)
      .then(async (res) => {
        // Check HTTP status first - if 200, process the response even if data.ok === false
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Failed to fetch limits' }))
          setSessionsByDay({})
          setAvailableDates([])
          setAvailabilityMode(null)
          setCalendarMode(null)
          setProjectedAvailableDates([])
          return
        }
        
        const data = await res.json() as { ok: boolean; sessionsByDay?: Record<string, Array<{ time: string; available: number; sessionId?: string }>>; availableDates?: string[]; calendarMode?: 'sessions' | 'dates' | 'wdays_only' | 'none'; projectedAvailableDates?: string[]; availabilityMode?: 'NORMAL' | 'NO_SCHEDULE_PUBLISHED'; requiresSessionTime?: boolean; error?: string }
        
        // If HTTP 200, process the response even if data.ok === false (might be wdays_only with empty data)
        // Only set error if it's a real error (not just empty data)
        if (!data.ok && data.error) {
          // Only treat as error if it's a validation error (not empty data)
          if (data.error.includes('Missing parameters') || data.error.includes('Invalid event ID')) {
            setSessionsByDay({})
            setAvailableDates([])
            setAvailabilityMode(null)
            setCalendarMode(null)
            setProjectedAvailableDates([])
            return
          }
          // Otherwise, continue processing (might be wdays_only with empty data)
          // Set default values if data.ok === false but no validation error
          if (!data.calendarMode && !data.availabilityMode) {
            setCalendarMode('none')
            setAvailabilityMode('NO_SCHEDULE_PUBLISHED')
            setSessionsByDay({})
            setAvailableDates([])
            setProjectedAvailableDates([])
            return
          }
        }

        // Set calendarMode (default to 'sessions' if not specified)
        const mode = data.calendarMode || (data.availabilityMode === 'NO_SCHEDULE_PUBLISHED' ? 'none' : 'sessions')
        setCalendarMode(mode)
        
        // Set requiresSessionTime (default to true if not specified for backward compatibility)
        const requiresTime = data.requiresSessionTime ?? (mode === 'sessions')
        setRequiresSessionTime(requiresTime)

        // Check for wdays_only mode
        if (mode === 'wdays_only') {
          setAvailabilityMode('NO_SCHEDULE_PUBLISHED')
          setSessionsByDay({})
          setAvailableDates(data.projectedAvailableDates || [])
          setProjectedAvailableDates(data.projectedAvailableDates || [])
          
          // Fetch eventDetails to get times
          if (selectedEventId) {
            try {
              const eventDetailsRes = await fetch(`/api/atlantico/event-details?eventId=${encodeURIComponent(selectedEventId)}&lang=ENG`)
              if (eventDetailsRes.ok) {
                const eventDetails = await eventDetailsRes.json()
                const times = Array.isArray(eventDetails.times) ? eventDetails.times.filter((t: string) => t && t !== '00:00' && t !== '') : []
                setEventDetailsTimes(times)
              }
            } catch (e) {
              // Ignore errors
            }
          }
          return
        }

        // Check for NO_SCHEDULE_PUBLISHED mode (none)
        if (mode === 'none' || data.availabilityMode === 'NO_SCHEDULE_PUBLISHED') {
          setAvailabilityMode('NO_SCHEDULE_PUBLISHED')
          setSessionsByDay({})
          setAvailableDates([])
          setProjectedAvailableDates([])
          return
        }

        setAvailabilityMode('NORMAL')
        // Always use the data for the requested month (no auto-switch)
        // If month is empty, just show empty calendar (user can navigate to next month)
        setSessionsByDay(data.sessionsByDay || {})
        setAvailableDates(data.availableDates || [])
        setProjectedAvailableDates([])
        setNoAvailabilityFound(false)
        setAutoSwitchedMonth(null)
      })
      .catch((error) => {
        console.error('[ActivityDetail] Error fetching calendar:', error)
        setSessionsByDay({})
        setAvailableDates([])
      })
      .finally(() => {
        setLoadingCalendar(false)
      })
  }, [selectedEventId, lang, currentMonth])

  // Fetch groupDetails immediately (always available)
  useEffect(() => {
    setGroupDetailsError(false)
    setLocalGroupImages([])
    // SPECIAL CASE: Event 303 - Use local images
    if (item.groupCode === '303') {
      setGroupImageUrl('/images/events/303/A.webp')
      // Still fetch groupDetails for other data, but override images with local ones
      fetch(`/api/atlantico/group/${item.groupCode}/${lang}`)
        .then(res => res.ok ? res.json() : null)
        .then((data) => {
          if (data) {
            // Override images array with local images
            const localImages = [
              '/images/events/303/A.webp',
              '/images/events/303/B.jpg',
              '/images/events/303/C.jpg',
              '/images/events/303/D.jpg',
              '/images/events/303/E.jpg',
            ]
            setGroupDetails({
              ...data,
              images: localImages,
              image: 'A.webp', // Main image
            })
          }
        })
        .catch(() => setGroupDetailsError(true))
      return
    }

    fetch(`/api/atlantico/group/${item.groupCode}/${lang}`)
      .then(res => res.ok ? res.json() : null)
      .then(async (data) => {
        if (data) {
          setGroupDetails(data)
          const localImages = await fetch(`/api/atlantico/local-group-images/${encodeURIComponent(item.groupCode)}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((payload: { images?: string[] } | null) => payload?.images ?? [])
            .catch(() => [])
          if (localImages.length > 0) {
            setLocalGroupImages(localImages)
          }
          
          // Collect ALL images from groupDetails - resolve filenames to URLs
          const images: string[] = []
          const { buildAtlanticoImageUrlFromFilename } = await import('@/lib/atlantico/images.client')
          
          // 1. Extract from data.images array (can be URLs or filenames)
          if (Array.isArray(data.images) && data.images.length > 0) {
            for (const img of data.images) {
              if (typeof img === 'string' && img.trim()) {
                const trimmed = img.trim()
                // If it's already a full URL, use it directly
                if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                  if (!images.includes(trimmed)) {
                    images.push(trimmed)
                  }
                } else {
                  // It's a filename, resolve it to a URL
                  const url = buildAtlanticoImageUrlFromFilename(trimmed)
                  if (url && !images.includes(url)) {
                    images.push(url)
                  }
                }
              }
            }
          }
          
          // 2. Extract from data.image (single image field) - resolve immediately
          if (data.image && typeof data.image === 'string' && data.image.trim()) {
            const imageFilename = data.image.trim()
            // Resolve filename to URL immediately (synchronously)
            const imageUrl = buildAtlanticoImageUrlFromFilename(imageFilename)
            if (imageUrl && !images.includes(imageUrl)) {
              images.push(imageUrl)
            }
            
            // Also try to download locally via API (async, for better performance)
            fetch(`/api/atlantico/download-image?filename=${encodeURIComponent(imageFilename)}`)
              .then(res => res.ok ? res.json() : null)
              .then(async (result) => {
                if (result?.url) {
                  setGroupImageUrl(result.url)
                  // Update allImages if we got a local URL (replace remote with local)
                  setAllImages(prev => {
                    const updated = prev.map(img => img === imageUrl ? result.url : img)
                    if (!updated.includes(result.url)) {
                      updated.push(result.url)
                    }
                    return updated.filter((img, idx, arr) => arr.indexOf(img) === idx) // Remove duplicates
                  })
                } else {
                  // Fallback: use remote URL
                  setGroupImageUrl(imageUrl)
                }
              })
              .catch(async () => {
                // Fallback: use remote URL
                setGroupImageUrl(imageUrl)
              })
          } else if (Array.isArray(data.images) && data.images.length > 0) {
            // Use first image from images array as group image
            const firstImg = String(data.images[0]).trim()
            if (firstImg.startsWith('http://') || firstImg.startsWith('https://')) {
              setGroupImageUrl(firstImg)
            } else {
              const url = buildAtlanticoImageUrlFromFilename(firstImg)
              if (url) {
                setGroupImageUrl(url)
              }
            }
          }
          
          // 3. Also try extractImageUrls as fallback (handles other fields like photos, gallery, etc.)
          const extractedImages = extractImageUrls(data)
          for (const img of extractedImages) {
            if (img && !images.includes(img)) {
              images.push(img)
            }
          }

          // Prepend local curated photos when available.
          const combinedWithLocal = [...localImages, ...images].filter(
            (img, idx, arr) => Boolean(img) && arr.indexOf(img) === idx
          )
          if (localImages.length > 0) {
            setGroupImageUrl((prev) => prev || localImages[0])
          }
          
          // Store all collected images
          if (combinedWithLocal.length > 0) {
            setAllImages(prev => {
              const combined = [...combinedWithLocal]
              // Add any existing images that aren't in the new list (preserve event images)
              for (const img of prev) {
                if (!combined.includes(img)) {
                  combined.push(img)
                }
              }
              return combined
            })
          }
        }
      })
      .catch(() => setGroupDetailsError(true))
  }, [item.groupCode, lang])

  // Fetch complete Atlantico info when eventId is selected
  useEffect(() => {
    if (!selectedEventId) {
      setEventDetails(null)
      setLimitsInfo(null)
      setEventImageUrl(null)
      setEventDetailsError(false)
      setLimitsError(false)
      // Reset allImages to only group images when no event is selected
      if (groupDetails) {
        const groupImages = extractImageUrls(groupDetails)
        const mergedGroupImages = [...localGroupImages, ...groupImages].filter(
          (img, idx, arr) => Boolean(img) && arr.indexOf(img) === idx
        )
        setAllImages(mergedGroupImages)
      } else {
        setAllImages(localGroupImages)
      }
      return
    }

    // Fetch eventDetails
    setEventDetailsError(false)
    fetch(`/api/atlantico/event/${selectedEventId}/${lang}`)
      .then(res => res.ok ? res.json() : null)
      .then(async (data) => {
        if (data) {
          setEventDetails(data)
          
          // Collect ALL images from eventDetails - resolve filenames to URLs
          const eventImages: string[] = []
          const { buildAtlanticoImageUrlFromFilename } = await import('@/lib/atlantico/images.client')
          
          // 1. Extract from data.images array (can be URLs or filenames)
          if (Array.isArray(data.images) && data.images.length > 0) {
            for (const img of data.images) {
              if (typeof img === 'string' && img.trim()) {
                const trimmed = img.trim()
                // If it's already a full URL, use it directly
                if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                  if (!eventImages.includes(trimmed)) {
                    eventImages.push(trimmed)
                  }
                } else {
                  // It's a filename, resolve it to a URL
                  const url = buildAtlanticoImageUrlFromFilename(trimmed)
                  if (url && !eventImages.includes(url)) {
                    eventImages.push(url)
                  }
                }
              }
            }
          }
          
          // 2. Extract from data.image (single image field) - resolve immediately
          if (data.image && typeof data.image === 'string' && data.image.trim()) {
            const imageFilename = data.image.trim()
            // Resolve filename to URL immediately
            const url = buildAtlanticoImageUrlFromFilename(imageFilename)
            if (url && !eventImages.includes(url)) {
              eventImages.push(url)
            }
            
            // Also try to download locally via API (async, for better performance)
            fetch(`/api/atlantico/download-image?filename=${encodeURIComponent(imageFilename)}`)
              .then(res => res.ok ? res.json() : null)
              .then(async (result) => {
                if (result?.url && result.url !== url) {
                  // Update allImages if we got a local URL (replace remote with local)
                  setAllImages(prev => {
                    const updated = prev.map(img => img === url ? result.url : img)
                    if (!updated.includes(result.url)) {
                      updated.push(result.url)
                    }
                    return updated.filter((img, idx, arr) => arr.indexOf(img) === idx) // Remove duplicates
                  })
                }
              })
              .catch(() => {
                // Ignore errors, use remote URL
              })
          }
          
          // 3. Also try extractImageUrls as fallback (handles other fields like photos, gallery, etc.)
          const extractedImages = extractImageUrls(data)
          for (const img of extractedImages) {
            if (img && !eventImages.includes(img)) {
              eventImages.push(img)
            }
          }
          
          // Merge event images with existing group images (avoid duplicates)
          if (eventImages.length > 0) {
            setAllImages(prev => {
              const combined = [...prev]
              for (const img of eventImages) {
                if (!combined.includes(img)) {
                  combined.push(img)
                }
              }
              return combined
            })
          }
          
          // Extract image using extractCoverImage (same logic as server-side)
          // Download and use local images for better performance
          const { extractCoverImage } = await import('@/lib/atlantico/images.client')
          const extractedImage = extractCoverImage(data)
          
          if (extractedImage) {
            // If it's a full URL, try to download locally via API
            if (extractedImage.startsWith('http://') || extractedImage.startsWith('https://')) {
              // Extract filename from URL
              const urlParts = extractedImage.split('/')
              const filename = urlParts[urlParts.length - 1]
              if (filename && /\.(jpg|jpeg|png|webp)$/i.test(filename)) {
                // Download via API
                fetch(`/api/atlantico/download-image?filename=${encodeURIComponent(filename)}`)
                  .then(res => res.ok ? res.json() : null)
                  .then(result => {
                    if (result?.url) {
                      setEventImageUrl(result.url)
                    } else {
                      setEventImageUrl(extractedImage) // Fallback to remote URL
                    }
                  })
                  .catch(() => setEventImageUrl(extractedImage))
              } else {
                setEventImageUrl(extractedImage)
              }
            } else {
              // It's a filename, download via API
              fetch(`/api/atlantico/download-image?filename=${encodeURIComponent(extractedImage)}`)
                .then(res => res.ok ? res.json() : null)
                .then(async (result) => {
                  if (result?.url) {
                    setEventImageUrl(result.url)
                  } else {
                    // Fallback: build remote URL
                    const { buildAtlanticoImageUrlFromFilename } = await import('@/lib/atlantico/images.client')
                    setEventImageUrl(buildAtlanticoImageUrlFromFilename(extractedImage))
                  }
                })
                .catch(() => {
                  // Fallback: build remote URL
                  import('@/lib/atlantico/images.client').then(({ buildAtlanticoImageUrlFromFilename }) => {
                    setEventImageUrl(buildAtlanticoImageUrlFromFilename(extractedImage))
                  })
                })
            }
          } else {
            // Fallback: try direct fields
            const imageFields = ['image', 'imageUrl', 'imageFilename', 'img', 'photo', 'picture', 'cover']
            let found = false
            for (const field of imageFields) {
              const value = data[field]
              if (value && typeof value === 'string' && value.trim()) {
                const trimmed = value.trim()
                // If already full URL, try to extract filename
                if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                  const urlParts = trimmed.split('/')
                  const filename = urlParts[urlParts.length - 1]
                  if (filename && /\.(jpg|jpeg|png|webp)$/i.test(filename)) {
                    fetch(`/api/atlantico/download-image?filename=${encodeURIComponent(filename)}`)
                      .then(res => res.ok ? res.json() : null)
                      .then(result => {
                        if (result?.url) {
                          setEventImageUrl(result.url)
                        } else {
                          setEventImageUrl(trimmed)
                        }
                      })
                      .catch(() => setEventImageUrl(trimmed))
                  } else {
                    setEventImageUrl(trimmed)
                  }
                  found = true
                  break
                }
                // Otherwise it's a filename, download via API
                fetch(`/api/atlantico/download-image?filename=${encodeURIComponent(trimmed)}`)
                  .then(res => res.ok ? res.json() : null)
                  .then(async (result) => {
                    if (result?.url) {
                      setEventImageUrl(result.url)
                    } else {
                      const { buildAtlanticoImageUrlFromFilename } = await import('@/lib/atlantico/images.client')
                      setEventImageUrl(buildAtlanticoImageUrlFromFilename(trimmed))
                    }
                  })
                  .catch(() => {
                    import('@/lib/atlantico/images.client').then(({ buildAtlanticoImageUrlFromFilename }) => {
                      setEventImageUrl(buildAtlanticoImageUrlFromFilename(trimmed))
                    })
                  })
                found = true
                break
              }
            }
            if (!found) {
              setEventImageUrl(null)
            }
          }
        }
      })
      .catch(() => setEventDetailsError(true))

    // Store limits info when fetched
    const normalizedMonth = (() => {
      const match = currentMonth.match(/^(\d{4}-\d{2})/)
      if (match) {
        return `${match[1]}-01`
      }
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    })()

    setLimitsError(false)
    fetch(`/api/atlantico/limits?eventId=${encodeURIComponent(selectedEventId)}&lang=${encodeURIComponent(lang)}&month=${encodeURIComponent(normalizedMonth)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setLimitsInfo(data)
      })
      .catch(() => setLimitsError(true))
  }, [selectedEventId, lang, currentMonth, groupDetails, localGroupImages])

  // Check if there are valid times for selected date
  const hasValidTimes = useMemo(() => {
    if (!selectedDate) return false
    
    // If requiresSessionTime === false, don't require times
    if (!requiresSessionTime) {
      return true // Allow booking without time selection
    }
    
    // If requiresSessionTime === true, check sessionsByDay
    
    // For other modes, check sessionsByDay
    if (!sessionsByDay[selectedDate]) return false
    const sessions = sessionsByDay[selectedDate]
    const validSessions = sessions.filter(s => 
      s.available > 0 && s.time && s.time !== '00:00' && s.time !== '-'
    )
    const validTimes = Array.from(new Set(
      validSessions.map(s => s.time).filter(t => t && t !== '' && t !== '00:00' && t !== '-')
    ))
    return validTimes.length > 0
  }, [selectedDate, sessionsByDay, calendarMode]) // eventDetailsTimes not used in this calculation

  // Auto-select first time when date changes (earliest valid time)
  useEffect(() => {
    if (selectedDate && sessionsByDay[selectedDate]) {
      const sessions = sessionsByDay[selectedDate]
      const validSessions = sessions.filter(s => 
        s.available > 0 && s.time && s.time !== '00:00' && s.time !== '-'
      )
      
      // Get unique valid times, sorted
      const validTimes = Array.from(new Set(
        validSessions.map(s => s.time).filter(t => t && t !== '' && t !== '00:00' && t !== '-')
      )).sort()
      
      if (validTimes.length > 0) {
        // Select earliest time
        setSelectedTime(validTimes[0])
      } else {
        setSelectedTime('')
      }
    } else {
      setSelectedTime('')
    }
  }, [selectedDate, sessionsByDay])

  // Available dates from loadLimits (real availability)
  // For wdays_only mode, use projectedAvailableDates; otherwise use availableDates
  const availableDatesSet = useMemo(() => {
    const datesToUse = calendarMode === 'wdays_only' ? projectedAvailableDates : availableDates
    return new Set(datesToUse)
  }, [availableDates, projectedAvailableDates, calendarMode])

  // Fetch prices (loadPrices) when event + date changes
  useEffect(() => {
    if (!selectedEventId || !selectedDate) {
      setPricesData(null)
      setPriceStatus('idle')
      return
    }

    const fetchPrices = async () => {
      setPriceStatus('loading')
      setPricesData(null)

      const url = `/api/atlantico/prices/${encodeURIComponent(selectedEventId)}?date=${encodeURIComponent(
        selectedDate,
      )}`

      if (process.env.NODE_ENV === 'development') {
        console.log('[ATL_ACTIVITY_DEBUG] loadPrices fetch', { selectedEventId, selectedDate, url })
      }

      try {
        const response = await fetch(url)
        if (!response.ok) {
          setPriceStatus('error')
          return
        }
        const data: PricesResponseOk | PricesResponseError = await response.json()
        if (!data.ok) {
          setPricesData(data)
          setPriceStatus('error')
          return
        }

        setPricesData(data)
        const mode = getPriceMode(selectedOption?.pProd, data.type)

        if (mode === 'per_day') {
          setPriceStatus('unsupported')
          return
        }

        if (data.type === 'per_person' && (typeof data.adultPrice !== 'number' || !Number.isFinite(data.adultPrice))) {
          setPriceStatus('error')
          return
        }

        setPriceStatus('ok')
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          setPriceStatus('idle')
        } else {
          setPriceStatus('error')
        }
      }
    }

    fetchPrices()
  }, [selectedEventId, selectedDate, selectedOption?.pProd])

  const priceMode = useMemo(() => {
    if (!pricesData || !pricesData.ok) return null
    return getPriceMode(selectedOption?.pProd, pricesData.type)
  }, [pricesData, selectedOption?.pProd])

  const totalPrice = useMemo(() => {
    if (!selectedEventId || !selectedDate) return null

    if (priceStatus !== 'ok' || !pricesData || !pricesData.ok) return null

    const mode = priceMode
    if (!mode) return null

    if (mode === 'per_person') {
      if (pricesData.type !== 'per_person') return null
      const adult = pricesData.adultPrice
      const child = pricesData.childPrice ?? 0
      const infant = pricesData.infantPrice ?? 0
      if (typeof adult !== 'number' || !Number.isFinite(adult)) return null
      return (
        bookingForm.adults * adult + bookingForm.children * child + bookingForm.infants * infant
      )
    }

    // per_day not supported for total yet
    return null
  }, [selectedEventId, selectedDate, priceStatus, pricesData, priceMode, bookingForm])

  const totalDisplay = useMemo(() => {
    if (!selectedEventId || !selectedDate) return '—'
    if (priceStatus === 'loading') return 'Calculating…'
    if (priceStatus === 'ok' && totalPrice !== null) return formatEUR(totalPrice)
    if (priceStatus === 'unsupported') return 'Varies by duration'
    if (priceStatus === 'error') return '—'
    return '—'
  }, [selectedEventId, selectedDate, priceStatus, totalPrice])


  const changeMonth = (delta: number) => {
    const [yearStr, monthStr] = currentMonth.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)
    const newDate = new Date(year, month - 1 + delta, 1)
    const y = newDate.getFullYear()
    const m = newDate.getMonth() + 1
    setCurrentMonth(`${y}-${String(m).padStart(2, '0')}-01`)
  }

  // Handle booking
  const handleBooking = async () => {
    if (!selectedDate || !selectedEventId || bookingForm.adults < 1) {
      setBookingResult({ success: false, message: 'Please fill in all required fields' })
      return
    }

    // Determine sesTime based on requiresSessionTime
    let sesTime: string
    
    if (requiresSessionTime === false) {
      // If requiresSessionTime === false => set sesTime = "00:00" ALWAYS (ignore eventDetailsTimes)
      sesTime = '00:00'
    } else {
      // If requiresSessionTime === true => set sesTime = selectedTime (from sessionsByDay). Never "00:00".
      const sessions = sessionsByDay[selectedDate] || []
      const validSessions = sessions.filter(s => 
        s.available > 0 && s.time && s.time !== '00:00' && s.time !== '-'
      )
      
      // Get unique valid times, sorted
      const validTimes = Array.from(new Set(
        validSessions.map(s => s.time).filter(t => t && t !== '' && t !== '00:00' && t !== '-')
      )).sort()
      
      // CRITICAL: Never send '00:00' when requiresSessionTime is true - block booking if no valid time
      if (validTimes.length === 0) {
        setBookingResult({ 
          success: false, 
          message: 'No times available for this date' 
        })
        setIsBooking(false)
        
        // DEV log for debugging
        if (process.env.NODE_ENV === 'development') {
          console.warn('[BOOKING] No times available - booking blocked:', {
            eventId: selectedEventId,
            date: selectedDate,
            calendarMode,
            requiresSessionTime,
            sessionsCount: sessions.length,
            sampleSessions: sessions.slice(0, 3),
            sessionsByDayKeys: Object.keys(sessionsByDay),
          })
        }
        return
      }
      
      sesTime = validTimes[0] // Use earliest time
    }

    setIsBooking(true)
    setBookingResult(null)

    try {
      // Submit payment via native HTML form to avoid CORS issues
      // Browser will navigate to the payment gateway HTML page
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = '/api/atlantico/booking/payment'
      form.style.display = 'none'

      // Add all payload fields as hidden inputs
      const paymentPayload = {
        t_id: selectedEventId,
        t_group: item.groupCode,
        language: lang,
        tourDate: selectedDate,
        sesTime,
        adults: bookingForm.adults,
        childs: bookingForm.children || 0,
        infants: bookingForm.infants || 0,
        name: bookingForm.name,
        email: bookingForm.email,
        phone: bookingForm.phone,
      }

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
      let errorMessage = error instanceof Error ? error.message : 'Booking failed'
      // Improve error message for MISSING_ATLANTICO_USER_ID
      if (errorMessage.includes('MISSING_ATLANTICO_USER_ID')) {
        errorMessage = 'Server configuration error: ATLANTICO_USER_ID is missing. Please contact support.'
      }
      setBookingResult({ success: false, message: errorMessage })
      setIsBooking(false)
    }
  }

  // Images for event 303 carousel
  const event303Images = useMemo(() => [
    '/images/events/303/A.webp',
    '/images/events/303/B.jpg',
    '/images/events/303/C.jpg',
    '/images/events/303/D.jpg',
    '/images/events/303/E.jpg',
  ], [])

  // Determine which image to show in hero: event image if selected, otherwise groupDetails.image, then default
  // Priority: eventImageUrl (from eventDetails - loaded dynamically) > selectedOption.image (from server - immediate) > groupImageUrl (from groupDetails.image - PDF format) > heroImageUrl > item.image
  // SPECIAL CASE: Event 303 uses carousel (handled separately in render)
  // CRITICAL: Use selectedOption.image immediately if available (it's already resolved on server)
  // Then update with eventImageUrl when it loads (if different)
  // groupDetails.image (from PDF) takes priority over classification-based fallback
  const heroImage = useMemo(() => {
    // SPECIAL CASE: Event 303 - Use carousel (return first image as fallback)
    if (item.groupCode === '303') {
      return event303Images[0]
    }
    
    // If we have eventImageUrl (loaded dynamically from eventDetails), use it
    if (eventImageUrl) return eventImageUrl
    // Otherwise use selectedOption.image (already resolved on server)
    if (selectedOption?.image) return selectedOption.image
    // Then use groupImageUrl (from groupDetails.image - PDF format: "garachico-san-miguel1.jpg")
    if (groupImageUrl) return groupImageUrl
    // Fallback to defaults
    return heroImageUrl || item.image || undefined
  }, [eventImageUrl, selectedOption?.image, groupImageUrl, heroImageUrl, item.image, item.groupCode, event303Images])

  // Auto-advance carousel for event 303
  useEffect(() => {
    if (item.groupCode !== '303') return
    
    const interval = setInterval(() => {
      setHeroCarouselIndex((prev) => (prev + 1) % event303Images.length)
    }, 5000) // Change image every 5 seconds

    return () => clearInterval(interval)
  }, [item.groupCode, event303Images.length])

  // Navigation functions for carousel
  const goToPreviousImage = () => {
    setHeroCarouselIndex((prev) => (prev - 1 + event303Images.length) % event303Images.length)
  }

  const goToNextImage = () => {
    setHeroCarouselIndex((prev) => (prev + 1) % event303Images.length)
  }

  const goToImage = (index: number) => {
    setHeroCarouselIndex(index)
  }
  
  // Debug: Log image resolution
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[HERO_IMAGE_DEBUG]', {
        eventImageUrl,
        selectedOptionImage: selectedOption?.image,
        groupImageUrl,
        heroImageUrl,
        itemImage: item.image,
        finalHeroImage: heroImage,
        selectedEventId,
        selectedOptionLabel: selectedOption?.label,
        groupDetailsImage: groupDetails?.image,
      })
    }
  }, [eventImageUrl, selectedOption?.image, groupImageUrl, heroImageUrl, item.image, heroImage, selectedEventId, selectedOption, groupDetails])

  // Reset mobile gallery index when images/event change (must be before any conditional return)
  useEffect(() => {
    setMobileGalleryIndex(0)
  }, [allImages.length, selectedEventId])

  // Premium layout for activity 508
  if (isActivity508) {
    console.log('[ACTIVITY_508] Rendering premium layout for activity 508', { groupCode: item.groupCode, slug: item.slug })
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-glass-50 to-white">
        {/* Debug banner - remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-yellow-400 text-black p-2 text-center font-bold">
            🎨 PREMIUM LAYOUT ACTIVE FOR ACTIVITY 508
          </div>
        )}
        {/* Premium Hero Section */}
        <div className="relative w-full h-[70vh] min-h-[500px] bg-gradient-to-br from-ocean-900 via-ocean-800 to-ocean-700 overflow-hidden">
          {heroImage && (
            <>
              <div className="absolute inset-0">
                <SafeImage
                  src={heroImage}
                  alt={item.title}
                  fill
                  priority
                  sizes="100vw"
                  className="object-cover"
                />
              </div>
              {/* Premium gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-ocean-900/60 to-transparent" />
            </>
          )}
          
          {/* Hero Content */}
          <div className="relative z-10 h-full flex flex-col justify-end">
            <div className="container mx-auto px-4 pb-12 max-w-7xl">
              <div className="max-w-3xl">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 mb-6">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-white font-semibold text-sm">
                    {tGroup('badgeVip')}
                  </span>
                </div>
                
                <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
                  {item.title}
                </h1>
                
                {/* Key Info Cards */}
                <div className="flex flex-wrap gap-4 mt-6">
                  {groupDetails?.duration && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-white font-medium">
                        {groupDetails.duration} {tGroup('labels.hours')}
                      </span>
                    </div>
                  )}
                  {groupBasePrice && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-white font-medium">
                        {tGroup('options.priceFrom', { price: formatEUR(groupBasePrice) })}
                      </span>
                    </div>
                  )}
                  {groupDetails?.childAge && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-4a3 3 0 00-5.356-1.857M17 20H7m10 0v-4c0-.656-.126-1.283-.356-1.857M7 20H2v-4a3 3 0 015.356-1.857M7 20v-4c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="text-white font-medium">
                        {tGroup('labels.childShort')}: {groupDetails.childAge}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-12 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left Column: Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Premium Tabs */}
              <div className="border-b-2 border-glass-200">
                <div className="flex space-x-1">
                  {(['overview', 'whats-included', 'cancellation', 'description', 'what-you-do'] as const)
                    .filter((tab) => tab !== 'what-you-do' || item.groupCode !== '340')
                    .map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setSelectedTab(tab)}
                      className={`px-6 py-4 font-semibold text-sm uppercase tracking-wide border-b-3 transition-all relative ${
                        selectedTab === tab
                          ? 'text-ocean-600 border-ocean-600'
                          : 'text-glass-500 border-transparent hover:text-glass-700 hover:border-glass-300'
                      }`}
                    >
                      {tab === 'whats-included'
                        ? tGroup('tabs.included')
                        : tab === 'what-you-do'
                        ? tGroup('tabs.whatYouDo')
                        : tab === 'cancellation'
                        ? tGroup('tabs.cancellation')
                        : tab === 'description'
                        ? tGroup('tabs.description')
                        : tGroup('tabs.overview')}
                      {selectedTab === tab && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-ocean-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content - Premium Styling */}
              <div className="pt-8">
                {groupDetailsError && !groupDetails && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm font-medium">{tDetail('errors.groupDetails')}</p>
                  </div>
                )}
                {selectedTab === 'overview' && (
                  <div className="space-y-8">
                    {/* What you do - above Overview */}
                    {groupDetails?.willDo && item.groupCode !== '340' && (
                      <div>
                        <h2 className="text-3xl font-bold text-glass-900 mb-6">
                          {tGroup('tabs.whatYouDo')}
                        </h2>
                        <div
                          className="prose prose-lg max-w-none text-glass-700 leading-relaxed"
                          dangerouslySetInnerHTML={sanitizeAtlanticoHtml(groupDetails.willDo)}
                        />
                      </div>
                    )}
                    {/* Overview highlights (first 2 sentences of desc) */}
                    {groupDetails?.desc && (() => {
                      const raw = decodeTextFromApi(groupDetails.desc || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
                      const sentences = raw.split('. ').filter(Boolean)
                      const highlights = sentences.slice(0, 2)
                      return highlights.length > 0 ? (
                        <div className="space-y-3 mb-6">
                          {highlights.map((s, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span>🌟</span>
                              <span className="font-semibold text-gray-800">{s}{!s.endsWith('.') ? '.' : ''}</span>
                            </div>
                          ))}
                        </div>
                      ) : null
                    })()}
                    {/* Icons */}
                    {groupDetails?.icons && Array.isArray(groupDetails.icons) && groupDetails.icons.length > 0 && (
                      <div className="flex flex-wrap gap-3">
                        {groupDetails.icons.map((icon: string) => (
                          <EventIcon key={icon} filename={icon} />
                        ))}
                      </div>
                    )}

                    {/* Gallery */}
                    {allImages.length > 0 && (
                      <div>
                        <h3 className="text-3xl font-bold text-glass-900 mb-6">
                          {tGroup('overview.photoGallery', { default: 'Photo Gallery' })}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          {allImages.map((imgUrl: string, idx: number) => {
                            if (!imgUrl || !imgUrl.trim()) return null
                            return (
                              <div key={idx} className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300">
                                <SafeImage
                                  src={imgUrl}
                                  alt={`${item.title} photo ${idx + 1}`}
                                  fill
                                  sizes="(max-width: 640px) 100vw, 50vw"
                                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedTab === 'whats-included' && (
                  <div>
                    <h2 className="text-3xl font-bold text-glass-900 mb-8">
                      {tGroup('included.title')}
                    </h2>
                    {item.groupCode === '326' && (
                      <p className="text-sm font-semibold text-amber-700 bg-amber-50 p-4 rounded-lg border border-amber-200 mb-6">
                        IMPORTANT: Proof of identity is required. Without this documentation, access to the ferry may be denied.
                      </p>
                    )}
                    {groupDetails?.faq ? (
                      <div className="space-y-4">
                        <FaqSections faq={groupDetails.faq} fallbackRaw />
                      </div>
                    ) : (
                      <p className="text-glass-500">
                        {tGroup('included.noInfo')}
                      </p>
                    )}
                  </div>
                )}

                {selectedTab === 'cancellation' && (
                  <div>
                    <h2 className="text-3xl font-bold text-glass-900 mb-8">
                      {tGroup('cancellation.title')}
                    </h2>
                    {groupDetails?.canDesc || groupDetails?.canTitle ? (
                      <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl p-8 border-2 border-green-200 shadow-lg">
                        {groupDetails.canTitle && (
                          <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center shadow-lg">
                              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-green-800">{groupDetails.canTitle}</h3>
                          </div>
                        )}
                        {groupDetails.canDesc && (
                          <div 
                            className="prose prose-lg max-w-none text-glass-800 leading-relaxed"
                            dangerouslySetInnerHTML={sanitizeAtlanticoHtml(groupDetails.canDesc)} 
                          />
                        )}
                      </div>
                    ) : (
                      <p className="text-glass-500">
                        {tGroup('cancellation.noInfo')}
                      </p>
                    )}
                  </div>
                )}

                {selectedTab === 'description' && (
                  <div>
                    <h2 className="text-3xl font-bold text-glass-900 mb-8">
                      {tGroup('description.title')}
                    </h2>
                    {groupDetails?.desc ? (
                      <div className="space-y-6">
                        {(() => {
                          const raw = decodeTextFromApi(groupDetails.desc || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
                          const sentences = raw.split('. ').filter(Boolean)
                          const rest = sentences.slice(2).join('. ')
                          return rest ? (
                            <p className="text-gray-500 leading-relaxed prose prose-lg max-w-none">
                              {rest}
                              {!rest.endsWith('.') && !rest.endsWith('!') && !rest.endsWith('?') ? '.' : ''}
                            </p>
                          ) : (
                            <p className="text-glass-500">
                              {tGroup('description.noDescription')}
                            </p>
                          )
                        })()}
                        
                        {/* Info Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                          {groupDetails.duration && (
                            <div className="bg-gradient-to-br from-glass-50 to-glass-100 rounded-xl p-6 border border-glass-200 shadow-sm">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-ocean-600 flex items-center justify-center">
                                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-sm text-glass-600 font-medium">
                                    {tGroup('labels.duration')}
                                  </p>
                                  <p className="text-2xl font-bold text-glass-900">
                                    {groupDetails.duration} {tGroup('labels.hours')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {groupDetails.childAge && (
                            <div className="bg-gradient-to-br from-glass-50 to-glass-100 rounded-xl p-6 border border-glass-200 shadow-sm">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-ocean-600 flex items-center justify-center">
                                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-4a3 3 0 00-5.356-1.857M17 20H7m10 0v-4c0-.656-.126-1.283-.356-1.857M7 20H2v-4a3 3 0 015.356-1.857M7 20v-4c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-sm text-glass-600 font-medium">
                                    {tGroup('labels.childAge')}
                                  </p>
                                  <p className="text-2xl font-bold text-glass-900">{groupDetails.childAge}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-glass-500">
                        {tGroup('description.noDescriptionShort')}
                      </p>
                    )}
                  </div>
                )}

                {selectedTab === 'what-you-do' && item.groupCode !== '340' && (
                  <div>
                    <h2 className="text-3xl font-bold text-glass-900 mb-8">
                      {tGroup('tabs.whatYouDo')}
                    </h2>
                    {groupDetails?.willDo ? (
                      <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-2xl p-8 border-2 border-purple-200 shadow-lg">
                        <div
                          className="prose prose-lg max-w-none text-glass-800 leading-relaxed"
                          dangerouslySetInnerHTML={sanitizeAtlanticoHtml(groupDetails.willDo)}
                        />
                      </div>
                    ) : (
                      <p className="text-glass-500">
                        {tGroup('included.noInfo')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Booking Sidebar - Premium */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <div className="bg-white rounded-2xl shadow-2xl border border-glass-200 overflow-hidden">
                  {/* Booking Header */}
                  <div className="bg-gradient-to-r from-ocean-600 to-ocean-700 p-6 text-white">
                    <h3 className="text-2xl font-bold mb-2">{tDetail('bookYourExperience')}</h3>
                    {groupBasePrice && (
                      <p className="text-ocean-100 text-lg">From {formatEUR(groupBasePrice)}</p>
                    )}
                  </div>

                  {/* Booking Form */}
                  <div className="p-6 space-y-6">
                    {/* Option selector */}
                    {eventOptions.length > 0 && (
                      <div>
                        <label className="block text-sm font-semibold text-glass-900 mb-2">{tDetail('selectOption')}</label>
                        <select
                          value={selectedEventId}
                          onChange={(e) => {
                            setSelectedEventId(e.target.value)
                            setSelectedDate('')
                          }}
                          className="w-full px-4 py-3 border-2 border-glass-300 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 transition-all bg-white"
                        >
                          <option value="">{tDetail('chooseOption')}</option>
                          {eventOptions.map((opt) => (
                            <option key={opt.eventId} value={opt.eventId}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Calendar - Premium Styling */}
                    {selectedEventId && calendarMode !== 'none' && (
                      <div>
                        <label className="block text-sm font-semibold text-glass-900 mb-3">{tDetail('selectDate')}</label>
                        {loadingCalendar ? (
                          <div className="text-center py-8 text-glass-500">{tDetail('loadingCalendar')}</div>
                        ) : (
                          <>
                            {/* Month Navigation */}
                            <div className="flex items-center justify-between mb-4">
                              <button
                                onClick={() => changeMonth(-1)}
                                className="px-3 py-2 text-sm font-medium text-glass-700 bg-white border-2 border-glass-300 rounded-lg hover:bg-glass-50 transition-all"
                                aria-label="Previous month"
                              >
                                ←
                              </button>
                              <h4 className="text-base font-semibold text-glass-900">
                                {(() => {
                                  const [year, month] = currentMonth.split('-').map(Number)
                                  const date = new Date(year, month - 1, 1)
                                  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                                })()}
                              </h4>
                              <button
                                onClick={() => changeMonth(1)}
                                className="px-3 py-2 text-sm font-medium text-glass-700 bg-white border-2 border-glass-300 rounded-lg hover:bg-glass-50 transition-all"
                                aria-label="Next month"
                              >
                                →
                              </button>
                            </div>
                            
                            {/* Calendar Grid - Monday first */}
                            <div className="grid grid-cols-7 gap-1 mb-2">
                              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                                <div key={`${day}-${i}`} className="text-center text-xs font-semibold text-glass-600 py-1">
                                  {day}
                                </div>
                              ))}
                            </div>
                            
                            <div className="grid grid-cols-7 gap-1">
                              {(() => {
                                const [yearStr, monthStr] = currentMonth.split('-')
                                const year = Number(yearStr)
                                const month = Number(monthStr)
                                const firstDay = new Date(year, month - 1, 1)
                                const lastDay = new Date(year, month, 0)
                                const daysInMonth = lastDay.getDate()
                                // Monday=0, Sunday=6 (European week start)
                                const startingDayOfWeek = (firstDay.getDay() + 6) % 7
                                const today = new Date()
                                today.setHours(0, 0, 0, 0)
                                
                                const datesToCheck = calendarMode === 'wdays_only' ? projectedAvailableDates : availableDates
                                const days: Array<{ day: number; dateStr: string; isAvailable: boolean; isToday: boolean; isPast: boolean }> = []
                                
                                for (let i = 0; i < startingDayOfWeek; i++) {
                                  days.push({ day: 0, dateStr: '', isAvailable: false, isToday: false, isPast: false })
                                }
                                
                                for (let day = 1; day <= daysInMonth; day++) {
                                  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                  const date = new Date(year, month - 1, day)
                                  const isToday = date.getTime() === today.getTime()
                                  const isPast = date < today
                                  const isAvailable = !isPast && datesToCheck.includes(dateStr)
                                  days.push({ day, dateStr, isAvailable, isToday, isPast })
                                }
                                
                                return days.map((dayData, idx) => {
                                  if (dayData.day === 0) {
                                    return <div key={`empty-${idx}`} className="aspect-square" />
                                  }
                                  
                                  const isSelected = selectedDate === dayData.dateStr
                                  const isClickable = dayData.isAvailable && !dayData.isPast
                                  
                                  return (
                                    <button
                                      key={dayData.dateStr}
                                      onClick={() => {
                                        if (isClickable) {
                                          setSelectedDate(dayData.dateStr)
                                        }
                                      }}
                                      disabled={!isClickable}
                                      className={`aspect-square text-sm font-medium rounded-lg transition-all ${
                                        isSelected
                                          ? 'bg-ocean-600 text-white shadow-lg scale-105'
                                          : dayData.isToday && !isSelected
                                          ? 'bg-ocean-100 text-ocean-700 border-2 border-ocean-400'
                                          : isClickable
                                          ? 'bg-white text-glass-900 border border-glass-200 hover:bg-ocean-50 hover:border-ocean-300 hover:scale-105'
                                          : 'bg-glass-100 text-glass-400 border border-glass-200 opacity-50 cursor-not-allowed'
                                      }`}
                                    >
                                      {dayData.day}
                                    </button>
                                  )
                                })
                              })()}
                            </div>
                            
                            {/* Time picker */}
                            {selectedDate && calendarMode !== 'wdays_only' && sessionsByDay[selectedDate] && sessionsByDay[selectedDate].length > 0 && (
                              <div className="mt-4">
                                <label className="block text-sm font-semibold text-glass-900 mb-2">Select Time</label>
                                <select
                                  value={selectedTime}
                                  onChange={(e) => setSelectedTime(e.target.value)}
                                  className="w-full px-4 py-3 border-2 border-glass-300 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 transition-all bg-white"
                                >
                                  <option value="">Choose time...</option>
                                  {sessionsByDay[selectedDate]
                                    .filter(s => s.time && s.time !== '00:00' && s.time !== '-')
                                    .map((session) => (
                                      <option key={session.time} value={session.time}>
                                        {session.time} {session.available > 0 ? `(${session.available} available)` : '(Sold out)'}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Participants */}
                    <div className="space-y-4 pt-4 border-t border-glass-200">
                      <div>
                        <label className="block text-sm font-semibold text-glass-900 mb-2">Adults *</label>
                        <input
                          type="number"
                          min="1"
                          value={bookingForm.adults}
                          onChange={(e) => setBookingForm({ ...bookingForm, adults: parseInt(e.target.value) || 1 })}
                          className="w-full px-4 py-3 border-2 border-glass-300 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-glass-900 mb-2">Children</label>
                        <input
                          type="number"
                          min="0"
                          value={bookingForm.children}
                          onChange={(e) => setBookingForm({ ...bookingForm, children: parseInt(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border-2 border-glass-300 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-glass-900 mb-2">Infants</label>
                        <input
                          type="number"
                          min="0"
                          value={bookingForm.infants}
                          onChange={(e) => setBookingForm({ ...bookingForm, infants: parseInt(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border-2 border-glass-300 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 transition-all"
                        />
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-4 pt-4 border-t border-glass-200">
                      <div>
                        <label className="block text-sm font-semibold text-glass-900 mb-2">Name *</label>
                        <input
                          type="text"
                          value={bookingForm.name}
                          onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-glass-300 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 transition-all"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-glass-900 mb-2">Email *</label>
                        <input
                          type="email"
                          value={bookingForm.email}
                          onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-glass-300 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 transition-all"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-glass-900 mb-2">Phone *</label>
                        <input
                          type="tel"
                          value={bookingForm.phone}
                          onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-glass-300 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 transition-all"
                          required
                        />
                      </div>
                    </div>

                    {/* Total Price */}
                    <div className="pt-4 border-t-2 border-ocean-200 bg-gradient-to-br from-ocean-50 to-blue-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-semibold text-glass-900">Total</span>
                        <span className={`text-2xl font-bold ${
                          priceStatus === 'ok' ? 'text-ocean-600' : 'text-glass-600'
                        }`}>
                          {totalDisplay}
                        </span>
                      </div>
                      {priceStatus === 'loading' && (
                        <p className="text-sm text-glass-500">Calculating price...</p>
                      )}
                    </div>

                    {/* Booking Button */}
                    {(calendarMode === 'none' || (calendarMode === 'wdays_only' && eventDetailsTimes.length === 0)) ? (
                      <div className="space-y-3">
                        <a
                          href={buildWhatsAppUrl({
                            activityName: item.title || 'Activity',
                            eventId: selectedEventId,
                            lang: lang,
                            date: selectedDate || undefined,
                            adults: bookingForm.adults > 0 ? bookingForm.adults : undefined,
                            childs: bookingForm.children > 0 ? bookingForm.children : undefined,
                            infants: bookingForm.infants > 0 ? bookingForm.infants : undefined,
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full px-6 py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all text-center shadow-lg hover:shadow-xl"
                        >
                          Contact via WhatsApp
                        </a>
                        <a
                          href={buildCallUrl()}
                          className="w-full px-6 py-4 bg-white border-2 border-ocean-600 text-ocean-600 font-bold rounded-xl hover:bg-ocean-50 transition-all text-center"
                        >
                          Call Us
                        </a>
                      </div>
                    ) : (
                      <button
                        onClick={handleBooking}
                        disabled={
                          isBooking || 
                          !selectedEventId || 
                          !selectedDate || 
                          bookingForm.adults < 1 ||
                          (requiresSessionTime && !hasValidTimes)
                        }
                        className="w-full px-6 py-4 bg-gradient-to-r from-ocean-600 to-ocean-700 text-white font-bold rounded-xl hover:from-ocean-700 hover:to-ocean-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
                      >
                        {isBooking ? 'Processing...' : 'Book Now'}
                      </button>
                    )}

                    {bookingResult && (
                      <div className={`p-4 rounded-xl ${
                        bookingResult.success 
                          ? 'bg-green-50 text-green-800 border-2 border-green-200' 
                          : 'bg-red-50 text-red-800 border-2 border-red-200'
                      }`}>
                        {bookingResult.message}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Default layout for other activities
  // Desktop: gallery = big image left + vertical grid right; options (title, price, duration, selector, tabs) on the right
  const galleryImages = allImages.length > 0 ? allImages : (heroImage ? [heroImage] : [])
  const mainGalleryImage = galleryImages[0] ?? heroImage
  const sideGalleryImages = galleryImages.slice(1, 5) // up to 4 small images on the right

  const goToPrevGallery = () => {
    setMobileGalleryIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)
  }
  const goToNextGallery = () => {
    setMobileGalleryIndex((prev) => (prev + 1) % galleryImages.length)
  }
  const handleMobileGalleryTouchStart = (e: React.TouchEvent) => {
    mobileGalleryTouchStart.current = e.touches[0].clientX
  }
  const handleMobileGalleryTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX
    const delta = mobileGalleryTouchStart.current - touchEndX
    if (Math.abs(delta) > 50 && galleryImages.length > 1) {
      if (delta > 0) goToNextGallery()
      else goToPrevGallery()
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero / Gallery section */}
      <div className="relative w-full overflow-hidden">
        {/* Mobile: single hero as before */}
        <div className="relative w-full h-96 lg:hidden">
          {/* SPECIAL CASE: Event 303 - Image Carousel */}
          {item.groupCode === '303' ? (
          <>
            {/* Carousel Images */}
            <div className="absolute inset-0" style={{ zIndex: 0 }}>
              {event303Images.map((img, index) => (
                <div
                  key={img}
                  className={`absolute inset-0 transition-opacity duration-500 ${
                    index === heroCarouselIndex ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <SafeImage
                    src={img}
                    alt={`${item.title} - Photo ${index + 1}`}
                    fill
                    priority={index === 0}
                    sizes="100vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
            
            {/* Navigation Arrows */}
            {event303Images.length > 1 && (
              <>
                <button
                  onClick={goToPreviousImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
                  aria-label="Previous image"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={goToNextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
                  aria-label="Next image"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Carousel Indicators */}
            {event303Images.length > 1 && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 flex gap-2">
                {event303Images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToImage(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === heroCarouselIndex
                        ? 'bg-white w-8'
                        : 'bg-white/50 hover:bg-white/75'
                    }`}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Overlay gradient for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" style={{ zIndex: 1 }} />
          </>
        ) : galleryImages.length > 1 ? (
          /* Mobile gallery carousel - swipeable between multiple images */
          <>
            <div
              className="absolute inset-0"
              style={{ zIndex: 0 }}
              onTouchStart={handleMobileGalleryTouchStart}
              onTouchEnd={handleMobileGalleryTouchEnd}
            >
              {galleryImages.map((img, index) => (
                <div
                  key={img}
                  className={`absolute inset-0 transition-opacity duration-500 ${
                    index === mobileGalleryIndex ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <SafeImage
                    src={img}
                    alt={`${item.title} - Photo ${index + 1}`}
                    fill
                    priority={index === 0}
                    sizes="100vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={goToPrevGallery}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
              aria-label="Previous image"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={goToNextGallery}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
              aria-label="Next image"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 flex gap-2">
              {galleryImages.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setMobileGalleryIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === mobileGalleryIndex
                      ? 'bg-white w-8'
                      : 'bg-white/50 hover:bg-white/75'
                  }`}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" style={{ zIndex: 1 }} />
          </>
        ) : (
          /* Single image fallback */
          <>
            {(() => {
              const singleImage = galleryImages[0] ?? heroImage
              return singleImage ? (
              <>
                <div className="absolute inset-0" style={{ zIndex: 0 }}>
                  <SafeImage
                    key={singleImage}
                    src={singleImage}
                    alt={selectedOption?.label || item.title}
                    fill
                    priority
                    sizes="100vw"
                    className="object-cover"
                    onError={(e) => {
                      if (process.env.NODE_ENV === 'development') {
                        console.error('[HERO_IMAGE_ERROR] Failed to load image:', singleImage, e)
                      }
                    }}
                    onLoad={() => {
                      if (process.env.NODE_ENV === 'development') {
                        console.log('[HERO_IMAGE_SUCCESS] Image loaded:', singleImage)
                      }
                    }}
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" style={{ zIndex: 1 }} />
              </>
            ) : (
              <div className="w-full h-full bg-ocean-600" />
            )
            })()}
          </>
        )}
        
        {/* Title overlay on hero - mobile only */}
        <div className="absolute bottom-0 left-0 right-0 p-8 lg:hidden" style={{ zIndex: 2 }}>
          <h1 className="text-4xl font-bold text-white mb-2">{item.title}</h1>
          {(() => {
            const durationHours = groupDetails?.duration ?? eventDetails?.duration ?? (eventDetails?.times?.length ? eventDetails.times.length : null)
            return durationHours != null ? (
              <p className="text-white/90">Duration: {durationHours} hrs</p>
            ) : null
          })()}
        </div>
      </div>

        {/* Desktop: gallery (big left + grid right) + options panel right */}
        <div className="hidden lg:grid lg:grid-cols-12 lg:min-h-[420px] lg:gap-0">
          {/* Left: main image */}
          <div className="relative lg:col-span-8 min-h-[320px] bg-ocean-600">
            {mainGalleryImage && (
              <>
                <SafeImage
                  src={mainGalleryImage}
                  alt={item.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                {(groupDetails?.duration || eventDetails?.times) && (
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-glass-800 text-sm font-medium">
                    <svg className="w-4 h-4 text-ocean-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {groupDetails?.duration ? `${groupDetails.duration} hrs` : eventDetails?.times?.length ? `${eventDetails.times.length} hrs` : null}
                  </div>
                )}
              </>
            )}
          </div>
          {/* Right: vertical image grid */}
          <div className="lg:col-span-2 flex flex-col gap-1 bg-glass-100">
            {sideGalleryImages.map((src, idx) => (
              <div key={idx} className="relative flex-1 min-h-[80px] w-full">
                <SafeImage
                  src={src}
                  alt={`${item.title} ${idx + 2}`}
                  fill
                  sizes="16vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
          {/* Right: options panel */}
          <div className="lg:col-span-2 flex flex-col bg-white border-l border-glass-200 p-6 overflow-y-auto">
            <h1 className="text-2xl font-bold text-glass-900 mb-2">{item.title}</h1>
            {groupBasePrice != null && groupBasePrice > 0 && (
              <p className="text-xl font-semibold text-ocean-600 mb-4">desde: {formatEUR(groupBasePrice)}</p>
            )}
            {groupDetails?.duration && (
              <p className="text-sm text-glass-600 mb-4">{groupDetails.duration} hrs</p>
            )}
            {eventOptions.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-glass-500 uppercase tracking-wide mb-2">Options</p>
                <div className="flex flex-col gap-2">
                  {eventOptions.map((opt) => (
                    <button
                      key={opt.eventId}
                      type="button"
                      onClick={() => setSelectedEventId(opt.eventId)}
                      className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                        selectedEventId === opt.eventId
                          ? 'border-ocean-600 bg-ocean-50 text-ocean-700 font-medium'
                          : 'border-glass-300 hover:border-ocean-300 text-glass-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Tabs in options panel */}
            <div className="border-t border-glass-200 pt-4 mt-auto">
              <div className="flex flex-wrap gap-1">
                {(['overview', 'description', 'details', 'prices', 'cancellation', 'reviews'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedTab(tab)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      selectedTab === tab
                        ? 'bg-ocean-600 text-white'
                        : 'bg-glass-100 text-glass-700 hover:bg-glass-200'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
      </div>
      </div>

      <div className="container mx-auto px-4 max-w-7xl py-8">
        {/* Title + Price - mobile only (on desktop they are in the options panel) */}
        <div className="lg:hidden mb-6">
          <h1 className="text-4xl font-bold text-glass-900 mb-4">{item.title}</h1>
          {groupBasePrice != null && groupBasePrice > 0 && (
            <span className="text-2xl font-semibold text-ocean-600">From {formatEUR(groupBasePrice)}</span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Available Options - mobile/tablet only (on desktop they are in the right options panel) */}
            {eventOptions.length > 0 && (
              <div className="mb-6 lg:hidden">
                <h2 className="text-xl font-semibold text-glass-900 mb-2">Available Options</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {eventOptions.map((opt) => (
                    <button
                      key={opt.eventId}
                      type="button"
                      onClick={() => setSelectedEventId(opt.eventId)}
                      className={`text-left rounded-lg border overflow-hidden transition-all ${
                        selectedEventId === opt.eventId
                          ? 'border-ocean-600 ring-2 ring-ocean-200 shadow-md'
                          : 'border-glass-300 hover:border-ocean-300 hover:shadow-sm'
                      }`}
                    >
                      {/* Event Image */}
                      {opt.image && (
                        <div className="w-full h-48 bg-glass-100 relative overflow-hidden">
                          <SafeImage
                            src={opt.image}
                            alt={opt.label}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        </div>
                      )}
                      {/* Event Label */}
                      <div className={`p-3 ${opt.image ? '' : 'p-4'}`}>
                        <span className={`text-sm font-medium ${
                          selectedEventId === opt.eventId
                            ? 'text-ocean-600'
                            : 'text-glass-800'
                        }`}>
                          {opt.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Event icons (from eventDetails.icons filenames) */}
                {selectedOption?.icons && selectedOption.icons.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedOption.icons.map((filename) => (
                      <EventIcon key={filename} filename={filename} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tabs - mobile/tablet only (on desktop tabs are in the right options panel) */}
            <div className="border-b border-glass-200 mb-6 lg:hidden">
              <div className="flex space-x-4">
                {isActivity508 ? (
                  // Custom tab order for activity 508
                  (['overview', 'whats-included', 'cancellation', 'description', 'what-you-do'] as const)
                    .filter((tab) => tab !== 'what-you-do' || item.groupCode !== '340')
                    .map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setSelectedTab(tab)}
                      className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                        selectedTab === tab
                          ? 'border-ocean-600 text-ocean-600'
                          : 'border-transparent text-glass-600 hover:text-glass-900'
                      }`}
                    >
                      {tab === 'whats-included'
                        ? tGroup('tabs.included')
                        : tab === 'what-you-do'
                        ? tGroup('tabs.whatYouDo')
                        : tab === 'cancellation'
                        ? tGroup('tabs.cancellation')
                        : tab === 'description'
                        ? tGroup('tabs.description')
                        : tGroup('tabs.overview')}
                    </button>
                  ))
                ) : (
                  // Default tab order for other activities
                  (['overview', 'description', 'details', 'prices', 'cancellation', 'reviews'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setSelectedTab(tab)}
                      className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                        selectedTab === tab
                          ? 'border-ocean-600 text-ocean-600'
                          : 'border-transparent text-glass-600 hover:text-glass-900'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Tab Content */}
            <div className="prose max-w-none">
              {groupDetailsError && !groupDetails && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm font-medium">{tDetail('errors.groupDetails')}</p>
                </div>
              )}
              {selectedTab === 'overview' && (
                <div>
                  {isActivity508 ? (
                    // Premium layout for activity 508
                    <>
                      {/* What you do - above Overview */}
                      {groupDetails?.willDo && item.groupCode !== '340' && (
                        <div className="mb-8">
                          <h2 className="text-2xl font-bold text-glass-900 mb-4">
                            {tGroup('tabs.whatYouDo')}
                          </h2>
                          <div
                            className="prose prose-sm max-w-none text-glass-700 leading-relaxed"
                            dangerouslySetInnerHTML={sanitizeAtlanticoHtml(groupDetails.willDo)}
                          />
                        </div>
                      )}
                      {/* Overview highlights (first 2 sentences of desc) */}
                      {groupDetails?.desc && (() => {
                        const raw = decodeTextFromApi(groupDetails.desc || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
                        const sentences = raw.split('. ').filter(Boolean)
                        const highlights = sentences.slice(0, 2)
                        return highlights.length > 0 ? (
                          <div className="space-y-3 mb-6">
                            {highlights.map((s, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <span>🌟</span>
                                <span className="font-semibold text-gray-800">{s}{!s.endsWith('.') ? '.' : ''}</span>
                              </div>
                            ))}
                          </div>
                        ) : null
                      })()}
                      {/* Hero section with key info */}
                      <div className="mb-8">
                        <div className="flex flex-wrap items-center gap-4 mb-4">
                          {groupDetails?.duration && (
                            <div className="flex items-center gap-2 text-glass-700">
                              <svg className="w-5 h-5 text-ocean-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="font-medium">
                                {groupDetails.duration} {tGroup('labels.hours')}
                              </span>
                            </div>
                          )}
                          {groupDetails?.childAge && (
                            <div className="flex items-center gap-2 text-glass-700">
                              <svg className="w-5 h-5 text-ocean-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-4a3 3 0 00-5.356-1.857M17 20H7m10 0v-4c0-.656-.126-1.283-.356-1.857M7 20H2v-4a3 3 0 015.356-1.857M7 20v-4c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              <span className="font-medium">
                                {tGroup('labels.childShort')}: {groupDetails.childAge}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Icons display */}
                        {groupDetails?.icons && Array.isArray(groupDetails.icons) && groupDetails.icons.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-6">
                            {groupDetails.icons.map((icon: string) => (
                              <EventIcon key={icon} filename={icon} />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Photos Gallery */}
                      {allImages.length > 0 && (
                        <div className="mb-8">
                          <h3 className="text-2xl font-bold text-glass-900 mb-4">Gallery</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {allImages.map((imgUrl: string, idx: number) => {
                              if (!imgUrl || !imgUrl.trim()) return null
                              return (
                                <div key={idx} className="relative w-full aspect-video rounded-xl overflow-hidden border border-glass-200 bg-glass-100 shadow-sm hover:shadow-md transition-shadow">
                                  <SafeImage
                                    src={imgUrl}
                                    alt={`${item.title} photo ${idx + 1}`}
                                    fill
                                    sizes="33vw"
                                    className="object-cover"
                                  />
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    // Default layout for other activities
                    <>
                      <h2>What you do</h2>
                      {item.description ? (
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={sanitizeAtlanticoHtml(item.description)}
                        />
                      ) : (
                        <p className="text-glass-500">No overview available.</p>
                      )}

                      {/* Atlantico Images Gallery - All photos from API */}
                      {allImages.length > 0 && (
                        <div className="mt-6">
                          <h3 className="text-lg font-semibold mb-3">Photos</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {allImages.map((imgUrl: string, idx: number) => {
                              if (!imgUrl || !imgUrl.trim()) return null
                              return (
                                <div key={idx} className="relative w-full aspect-video rounded-lg overflow-hidden border border-glass-200 bg-glass-100">
                                  <SafeImage
                                    src={imgUrl}
                                    alt={`${item.title} photo ${idx + 1}`}
                                    fill
                                    sizes="33vw"
                                    className="object-cover"
                                  />
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {selectedTab === 'description' && (
                <div>
                  <h2>{tGroup('description.title')}</h2>
                  {item.description ? (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={sanitizeAtlanticoHtml(item.description)}
                    />
                  ) : (
                    <p className="text-glass-500">
                      {tGroup('description.noDescriptionShort')}
                    </p>
                  )}
                </div>
              )}

              {selectedTab === 'details' && (
                <div>
                  <h2>Details</h2>
                  
                  {/* Basic Info - Always show */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-lg mb-3">Basic Information</h3>
                    <dl className="grid grid-cols-2 gap-4">
                      <dt className="font-medium">Group Code:</dt>
                      <dd>{item.groupCode}</dd>
                      {groupDetails?.code && (
                        <>
                          <dt className="font-medium">Group Code (from API):</dt>
                          <dd>{groupDetails.code}</dd>
                        </>
                      )}
                      {selectedEventId ? (
                        <>
                          <dt className="font-medium">Event ID (t_id):</dt>
                          <dd>{selectedEventId}</dd>
                        </>
                      ) : (
                        <>
                          <dt className="font-medium">Event ID:</dt>
                          <dd className="text-glass-500">Select an option above to see event details</dd>
                        </>
                      )}
                      {eventDetails?.code && (
                        <>
                          <dt className="font-medium">Event Code:</dt>
                          <dd>{eventDetails.code}</dd>
                        </>
                      )}
                    </dl>
                  </div>

                  {/* Event Details */}
                  {selectedEventId && !eventDetails && (
                    <div className={`mb-6 p-4 rounded-lg border ${eventDetailsError ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                      <p className={`text-sm font-medium ${eventDetailsError ? 'text-red-800' : 'text-blue-800'}`}>
                        {eventDetailsError ? tDetail('errors.eventDetails') : 'Loading event details...'}
                      </p>
                    </div>
                  )}
                  {eventDetails && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-lg mb-3">Event Details</h3>
                      
                      {/* Event Image */}
                      {eventImageUrl && (
                        <div className="mb-4">
                          <dt className="font-medium mb-2">Event Image:</dt>
                          <dd>
                            <SafeImage
                              src={eventImageUrl}
                              alt={eventDetails.name || eventDetails.title || 'Event image'}
                              width={800}
                              height={400}
                              className="rounded-lg border border-glass-200 w-full max-w-2xl object-cover"
                            />
                          </dd>
                        </div>
                      )}
                      
                      <dl className="grid grid-cols-2 gap-4">
                        {eventDetails.name && (
                          <>
                            <dt className="font-medium">Name:</dt>
                            <dd>{eventDetails.name}</dd>
                          </>
                        )}
                        {eventDetails.title && (
                          <>
                            <dt className="font-medium">Title:</dt>
                            <dd>{eventDetails.title}</dd>
                          </>
                        )}
                        {eventDetails.route && (
                          <>
                            <dt className="font-medium">Route:</dt>
                            <dd>{eventDetails.route}</dd>
                          </>
                        )}
                        {eventDetails.times && Array.isArray(eventDetails.times) && eventDetails.times.length > 0 && (
                          <>
                            <dt className="font-medium">Available Times:</dt>
                            <dd>{eventDetails.times.join(', ')}</dd>
                          </>
                        )}
                        {eventDetails.days && Array.isArray(eventDetails.days) && eventDetails.days.length > 0 && (
                          <>
                            <dt className="font-medium">Available Days:</dt>
                            <dd>{eventDetails.days.join(', ')}</dd>
                          </>
                        )}
                        {eventDetails.pProd !== undefined && (
                          <>
                            <dt className="font-medium">Price Product (pProd):</dt>
                            <dd>{eventDetails.pProd}</dd>
                          </>
                        )}
                        {eventDetails.image && (
                          <>
                            <dt className="font-medium">Image Filename:</dt>
                            <dd className="text-xs font-mono break-all">{eventDetails.image}</dd>
                          </>
                        )}
                        {eventDetails.id && (
                          <>
                            <dt className="font-medium">Internal ID:</dt>
                            <dd>{eventDetails.id}</dd>
                          </>
                        )}
                      </dl>
                      {eventDetails.desc && (
                        <div className="mt-4">
                          <dt className="font-medium mb-2">Description:</dt>
                          <dd className="prose prose-sm max-w-none" dangerouslySetInnerHTML={sanitizeAtlanticoHtml(eventDetails.desc)} />
                        </div>
                      )}
                      {eventDetails.meetingPoints && Array.isArray(eventDetails.meetingPoints) && eventDetails.meetingPoints.length > 0 && (
                        <div className="mt-4">
                          <dt className="font-medium mb-2">Meeting Points:</dt>
                          <dd>
                            <MeetingPointsDisplay
                              meetingPoints={eventDetails.meetingPoints}
                              showTitle={false}
                            />
                          </dd>
                        </div>
                      )}
                      {eventDetails.icons && Array.isArray(eventDetails.icons) && eventDetails.icons.length > 0 && (
                        <div className="mt-4">
                          <dt className="font-medium mb-2">Icons:</dt>
                          <dd className="flex flex-wrap gap-2">
                            {eventDetails.icons.map((icon: string, idx: number) => (
                              <EventIcon key={idx} filename={icon} />
                            ))}
                          </dd>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Group Details */}
                  {groupDetails && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-lg mb-3">Group Details</h3>
                      
                      {/* Group Image */}
                      {groupImageUrl && (
                        <div className="mb-4">
                          <dt className="font-medium mb-2">Group Image:</dt>
                          <dd>
                            <SafeImage
                              src={groupImageUrl}
                              alt={groupDetails.name || 'Group image'}
                              width={800}
                              height={400}
                              className="rounded-lg border border-glass-200 w-full max-w-2xl object-cover"
                            />
                          </dd>
                        </div>
                      )}
                      
                      <dl className="grid grid-cols-2 gap-4">
                        {groupDetails.name && (
                          <>
                            <dt className="font-medium">Name:</dt>
                            <dd>{groupDetails.name}</dd>
                          </>
                        )}
                        {groupDetails.duration && (
                          <>
                            <dt className="font-medium">Duration:</dt>
                            <dd>{groupDetails.duration}</dd>
                          </>
                        )}
                        {groupDetails.ids && (
                          <>
                            <dt className="font-medium">Event IDs:</dt>
                            <dd>{String(groupDetails.ids)}</dd>
                          </>
                        )}
                        {groupDetails.events && Array.isArray(groupDetails.events) && groupDetails.events.length > 0 && (
                          <>
                            <dt className="font-medium">Events:</dt>
                            <dd>{groupDetails.events.join(', ')}</dd>
                          </>
                        )}
                        {groupDetails.image && (
                          <>
                            <dt className="font-medium">Image Filename:</dt>
                            <dd className="text-xs font-mono break-all">{groupDetails.image}</dd>
                          </>
                        )}
                        {groupDetails.price !== undefined && groupDetails.price !== null && (
                          <>
                            <dt className="font-medium">Base Price:</dt>
                            <dd>{typeof groupDetails.price === 'number' ? formatEUR(groupDetails.price) : groupDetails.price}</dd>
                          </>
                        )}
                      </dl>
                      {groupDetails.desc && (
                        <div className="mt-4">
                          <dt className="font-medium mb-2">Description:</dt>
                          <dd className="prose prose-sm max-w-none" dangerouslySetInnerHTML={sanitizeAtlanticoHtml(groupDetails.desc)} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Limits Info */}
                  {selectedEventId && !limitsInfo && (
                    <div className={`mb-6 p-4 rounded-lg border ${limitsError ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                      <p className={`text-sm font-medium ${limitsError ? 'text-red-800' : 'text-blue-800'}`}>
                        {limitsError ? tDetail('errors.limits') : 'Loading availability information...'}
                      </p>
                    </div>
                  )}
                  {limitsInfo && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-lg mb-3">Availability Information</h3>
                      <dl className="grid grid-cols-2 gap-4">
                        {limitsInfo.calendarMode && (
                          <>
                            <dt className="font-medium">Calendar Mode:</dt>
                            <dd>{limitsInfo.calendarMode}</dd>
                          </>
                        )}
                        {limitsInfo.requiresSessionTime !== undefined && (
                          <>
                            <dt className="font-medium">Requires Session Time:</dt>
                            <dd>{limitsInfo.requiresSessionTime ? 'Yes' : 'No'}</dd>
                          </>
                        )}
                        {limitsInfo.quote !== null && limitsInfo.quote !== undefined && (
                          <>
                            <dt className="font-medium">Quote:</dt>
                            <dd>{limitsInfo.quote}</dd>
                          </>
                        )}
                        {limitsInfo.availableDates && Array.isArray(limitsInfo.availableDates) && (
                          <>
                            <dt className="font-medium">Available Dates Count:</dt>
                            <dd>{limitsInfo.availableDates.length}</dd>
                          </>
                        )}
                        {limitsInfo.projectedAvailableDates && Array.isArray(limitsInfo.projectedAvailableDates) && (
                          <>
                            <dt className="font-medium">Projected Available Dates Count:</dt>
                            <dd>{limitsInfo.projectedAvailableDates.length}</dd>
                          </>
                        )}
                        {limitsInfo.sessionsByDay && Object.keys(limitsInfo.sessionsByDay).length > 0 && (
                          <>
                            <dt className="font-medium">Days with Sessions:</dt>
                            <dd>{Object.keys(limitsInfo.sessionsByDay).length}</dd>
                          </>
                        )}
                        {limitsInfo.wdays && Array.isArray(limitsInfo.wdays) && limitsInfo.wdays.length > 0 && (
                          <>
                            <dt className="font-medium">Weekdays Available:</dt>
                            <dd>
                              {limitsInfo.wdays.map((wday: number) => {
                                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
                                return days[wday] || `Day ${wday}`
                              }).join(', ')}
                            </dd>
                          </>
                        )}
                      </dl>
                      {limitsInfo.availableDates && Array.isArray(limitsInfo.availableDates) && limitsInfo.availableDates.length > 0 && (
                        <div className="mt-4">
                          <dt className="font-medium mb-2">First 10 Available Dates:</dt>
                          <dd className="text-sm">
                            {limitsInfo.availableDates.slice(0, 10).join(', ')}
                            {limitsInfo.availableDates.length > 10 && ` ... and ${limitsInfo.availableDates.length - 10} more`}
                          </dd>
                        </div>
                      )}
                      {limitsInfo.sessionsByDay && Object.keys(limitsInfo.sessionsByDay).length > 0 && (
                        <div className="mt-4">
                          <dt className="font-medium mb-2">Sample Sessions (first 3 dates):</dt>
                          <dd>
                            <div className="space-y-2">
                              {Object.entries(limitsInfo.sessionsByDay).slice(0, 3).map(([date, sessions]: [string, any]) => (
                                <div key={date} className="text-sm border-l-2 border-ocean-300 pl-2">
                                  <strong>{date}:</strong> {Array.isArray(sessions) ? sessions.map((s: any) => `${s.time || 'N/A'} (${s.available || 0} available)`).join(', ') : 'No sessions'}
                                </div>
                              ))}
                            </div>
                          </dd>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Raw Data (Collapsible) */}
                  <details className="mt-6">
                    <summary className="cursor-pointer font-semibold text-lg mb-3">Raw API Data (Debug)</summary>
                    <div className="mt-4 space-y-4">
                      {eventDetails && (
                        <div>
                          <h4 className="font-medium mb-2">Event Details (Raw):</h4>
                          <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                            {JSON.stringify(eventDetails, null, 2)}
                          </pre>
                        </div>
                      )}
                      {groupDetails && (
                        <div>
                          <h4 className="font-medium mb-2">Group Details (Raw):</h4>
                          <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                            {JSON.stringify(groupDetails, null, 2)}
                          </pre>
                        </div>
                      )}
                      {limitsInfo && (
                        <div>
                          <h4 className="font-medium mb-2">Limits Info (Raw):</h4>
                          <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                            {JSON.stringify(limitsInfo, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}

              {selectedTab === 'prices' && (
                <div>
                  <h2>Prices</h2>
                  {!selectedEventId || !selectedDate ? (
                    <p className="text-glass-500">{tDetail('selectOptionAndDate')}</p>
                  ) : priceStatus === 'loading' ? (
                    <p className="text-glass-500">Loading prices...</p>
                  ) : priceStatus === 'error' || !pricesData ? (
                    <p className="text-glass-500">Pricing unavailable for selected date.</p>
                  ) : !pricesData.ok ? (
                    <p className="text-glass-500">Pricing unavailable for selected date.</p>
                  ) : pricesData.type === 'per_person' ? (
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <dt className="text-glass-600">{tDetail('adult')}</dt>
                      <dd className="text-glass-900">{formatEUR(pricesData.adultPrice)}</dd>
                      {typeof pricesData.childPrice === 'number' && Number.isFinite(pricesData.childPrice) && (
                        <>
                          <dt className="text-glass-600">{tDetail('child')}</dt>
                          <dd className="text-glass-900">{formatEUR(pricesData.childPrice)}</dd>
                        </>
                      )}
                      {typeof pricesData.infantPrice === 'number' && Number.isFinite(pricesData.infantPrice) && (
                        <>
                          <dt className="text-glass-600">{tDetail('infant')}</dt>
                          <dd className="text-glass-900">{formatEUR(pricesData.infantPrice)}</dd>
                        </>
                      )}
                    </dl>
                  ) : (
                    <div className="space-y-2">
                      {pricesData.tiers.map((tier) => (
                        <div key={`${tier.days}-${tier.price}`} className="flex justify-between gap-4">
                          <div className="text-glass-600">Up to {tier.days} days</div>
                          <div className="text-glass-900 font-medium">{formatEUR(tier.price)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedTab === 'whats-included' && (
                <div>
                  <h2 className="text-3xl font-bold text-glass-900 mb-6">
                    {tGroup('included.title')}
                  </h2>
                  {item.groupCode === '326' && (
                    <p className="text-sm font-semibold text-amber-700 bg-amber-50 p-4 rounded-lg border border-amber-200 mb-6">
                      IMPORTANT: Proof of identity is required. Without this documentation, access to the ferry may be denied.
                    </p>
                  )}
                  {groupDetails?.faq ? (
                    <div className="space-y-4">
                      <FaqSections faq={groupDetails.faq} fallbackRaw />
                    </div>
                  ) : (
                    <p className="text-glass-500">
                      {tGroup('included.noInfo')}
                    </p>
                  )}
                </div>
              )}

              {selectedTab === 'cancellation' && (
                <div>
                  <h2 className="text-3xl font-bold text-glass-900 mb-6">
                    {tGroup('cancellation.title')}
                  </h2>
                  {groupDetails?.canDesc || groupDetails?.canTitle ? (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                      {groupDetails.canTitle && (
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex-shrink-0">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <h3 className="text-2xl font-bold text-green-800">{groupDetails.canTitle}</h3>
                        </div>
                      )}
                      {groupDetails.canDesc && (
                        <div 
                          className="prose prose-lg max-w-none text-glass-800"
                          dangerouslySetInnerHTML={sanitizeAtlanticoHtml(groupDetails.canDesc)} 
                        />
                      )}
                    </div>
                  ) : (
                    <p className="text-glass-500">
                      {tGroup('cancellation.noInfo')}
                    </p>
                  )}
                </div>
              )}

              {selectedTab === 'what-you-do' && isActivity508 && item.groupCode !== '340' && (
                <div>
                  <h2 className="text-3xl font-bold text-glass-900 mb-6">
                    {tGroup('tabs.whatYouDo')}
                  </h2>
                  {groupDetails?.willDo ? (
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-8 border border-purple-200">
                      <div
                        className="prose prose-lg max-w-none text-glass-800 leading-relaxed"
                        dangerouslySetInnerHTML={sanitizeAtlanticoHtml(groupDetails.willDo)}
                      />
                    </div>
                  ) : (
                    <p className="text-glass-500">
                      {tGroup('included.noInfo')}
                    </p>
                  )}
                </div>
              )}

              {selectedTab === 'description' && (
                <div>
                  <h2 className="text-3xl font-bold text-glass-900 mb-6">{tDetail('description')}</h2>
                  {isActivity508 ? (
                    // Premium layout for activity 508
                    groupDetails?.desc ? (
                      <div className="space-y-6">
                        {(() => {
                          const raw = decodeTextFromApi(groupDetails.desc || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
                          const sentences = raw.split('. ').filter(Boolean)
                          const rest = sentences.slice(2).join('. ')
                          return rest ? (
                            <p className="text-gray-500 leading-relaxed prose prose-lg max-w-none">{rest}{!rest.endsWith('.') && !rest.endsWith('!') && !rest.endsWith('?') ? '.' : ''}</p>
                          ) : (
                            <p className="text-glass-500">{tDetail('noAdditionalDescription')}</p>
                          )
                        })()}
                        
                        {/* Additional info cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                          {groupDetails.duration && (
                            <div className="bg-glass-50 rounded-lg p-4 border border-glass-200">
                              <div className="flex items-center gap-3">
                                <svg className="w-6 h-6 text-ocean-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                  <p className="text-sm text-glass-600">{tDetail('duration')}</p>
                                  <p className="text-lg font-semibold text-glass-900">{groupDetails.duration} {tDetail('hours')}</p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {groupDetails.childAge && (
                            <div className="bg-glass-50 rounded-lg p-4 border border-glass-200">
                              <div className="flex items-center gap-3">
                                <svg className="w-6 h-6 text-ocean-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-4a3 3 0 00-5.356-1.857M17 20H7m10 0v-4c0-.656-.126-1.283-.356-1.857M7 20H2v-4a3 3 0 015.356-1.857M7 20v-4c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <div>
                                  <p className="text-sm text-glass-600">{tDetail('childAge')}</p>
                                  <p className="text-lg font-semibold text-glass-900">{groupDetails.childAge}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-glass-500">{tDetail('noDescriptionAvailable')}</p>
                    )
                  ) : (
                    // For other activities, use item.description
                    item.description ? (
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={sanitizeAtlanticoHtml(item.description)}
                      />
                    ) : (
                      <p className="text-glass-500">{tDetail('noDescriptionAvailable')}</p>
                    )
                  )}
                </div>
              )}

              {selectedTab === 'reviews' && (
                <div>
                  <h2>{tDetail('reviews')}</h2>
                  <p className="text-glass-500">{tDetail('noReviewsAvailable')}</p>
                </div>
              )}
            </div>

            {/* DEV Debug Panel - Only in development */}
            {process.env.NODE_ENV === 'development' && selectedEventId && (
              <div className="mt-8 mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs space-y-1">
                <div className="font-semibold mb-2">🔍 DEV Debug:</div>
                <div>selectedEventId (t_id): <strong className="text-blue-600">{selectedEventId}</strong></div>
                <div>eventId origin: <strong className="text-purple-600">
                  {(() => {
                    const option = eventOptions.find(opt => opt.eventId === selectedEventId)
                    return option ? `eventOption.eventId="${option.eventId}" (from eventOptions)` : 'unknown'
                  })()}
                </strong></div>
                <div>t_group: <strong className="text-red-600">{item.groupCode}</strong></div>
                <div>monthStart sent: <strong className="text-green-600">{(() => {
                  const match = currentMonth.match(/^(\d{4}-\d{2})/)
                  return match ? `${match[1]}-01` : currentMonth
                })()}</strong></div>
                <div>availableDates count: <strong>{availableDates.length}</strong></div>
                <div>sessionsByDay keys: <strong>{Object.keys(sessionsByDay).length}</strong></div>
              </div>
            )}

            {/* none mode: Show CTA card */}
            {selectedEventId && calendarMode === 'none' && (
              <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Select a Date</h2>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                  <p className="text-sm text-blue-800 text-center">
                    Availability on request. Contact us to confirm.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <a
                      href={buildWhatsAppUrl({
                        activityName: item.title || 'Activity',
                        eventId: selectedEventId,
                        lang: lang,
                        date: selectedDate || undefined,
                        adults: bookingForm.adults > 0 ? bookingForm.adults : undefined,
                        childs: bookingForm.children > 0 ? bookingForm.children : undefined,
                        infants: bookingForm.infants > 0 ? bookingForm.infants : undefined,
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors text-center text-sm"
                    >
                      WhatsApp
                    </a>
                    <a
                      href={buildCallUrl()}
                      className="flex-1 px-4 py-2 bg-white border-2 border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors text-center text-sm"
                    >
                      Call
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Calendar - show for wdays_only mode or normal mode (but hide if none mode) */}
            {selectedEventId && calendarMode !== 'none' && (
              <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Select a Date</h2>
                {loadingCalendar ? (
                  <p className="text-glass-500">{tDetail('loadingCalendar')}</p>
                ) : noAvailabilityFound ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                    <div className="font-medium mb-2">⚠️ No availability found</div>
                    <div>No availability found for the next 12 months for this option. Please try a different option.</div>
                  </div>
                ) : (
                <>
                  {/* Auto-switched month notice */}
                  {autoSwitchedMonth && (
                    <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                      <span className="font-medium">ℹ️</span> No availability this month → showing{' '}
                      <strong>{new Date(autoSwitchedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
                    </div>
                  )}

                  {/* Month Navigation */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => changeMonth(-1)}
                      className="px-3 py-1 text-sm font-medium text-glass-700 bg-white border border-glass-300 rounded hover:bg-glass-50"
                      aria-label="Previous month"
                    >
                      ← Prev
                    </button>
                    <h3 className="text-lg font-semibold text-glass-900">
                      {(() => {
                        const [year, month] = currentMonth.split('-').map(Number)
                        const date = new Date(year, month - 1, 1)
                        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                      })()}
                    </h3>
                    <button
                      onClick={() => changeMonth(1)}
                      className="px-3 py-1 text-sm font-medium text-glass-700 bg-white border border-glass-300 rounded hover:bg-glass-50"
                      aria-label="Next month"
                    >
                      Next →
                    </button>
                  </div>
                {/* Calendar Header */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-glass-600 py-1">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const [yearStr, monthStr] = currentMonth.split('-')
                    const year = Number(yearStr)
                    const month = Number(monthStr)
                    const firstDay = new Date(year, month - 1, 1)
                    const lastDay = new Date(year, month, 0)
                    const daysInMonth = lastDay.getDate()
                    // Monday=0, Sunday=6 (European week start)
                    const startingDayOfWeek = (firstDay.getDay() + 6) % 7
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)

                    const days: Array<{ day: number; dateStr: string; isAvailable: boolean; isToday: boolean; isPast: boolean }> = []

                    // Empty cells for days before month starts
                    for (let i = 0; i < startingDayOfWeek; i++) {
                      days.push({ day: 0, dateStr: '', isAvailable: false, isToday: false, isPast: false })
                    }

                    // Days of month
                    for (let day = 1; day <= daysInMonth; day++) {
                      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                      const date = new Date(year, month - 1, day)
                      const isToday = date.getTime() === today.getTime()
                      const isPast = date < today
                      // Use projectedAvailableDates for wdays_only, otherwise availableDates
                      const datesToCheck = calendarMode === 'wdays_only' ? projectedAvailableDates : availableDates
                      const isAvailable = !isPast && datesToCheck.includes(dateStr)

                      days.push({ day, dateStr, isAvailable, isToday, isPast })
                    }

                    return days.map((dayData, idx) => {
                      if (dayData.day === 0) {
                        return <div key={`empty-${idx}`} className="aspect-square" />
                      }

                      const isSelected = selectedDate === dayData.dateStr
                      const isClickable = dayData.isAvailable && !dayData.isPast

                      return (
                        <button
                          key={dayData.dateStr}
                          onClick={() => {
                            if (isClickable) {
                              setSelectedDate(dayData.dateStr)
                            }
                          }}
                          disabled={!isClickable}
                          className={`aspect-square p-1 rounded border text-sm transition-colors ${
                            isSelected
                              ? 'bg-ocean-600 text-white border-ocean-600 font-semibold'
                              : dayData.isToday && !isSelected
                              ? 'bg-ocean-50 text-ocean-700 border-ocean-300 ring-2 ring-ocean-200'
                              : isClickable
                              ? 'bg-white text-glass-900 border-glass-200 hover:bg-ocean-50 hover:border-ocean-300 cursor-pointer'
                              : 'bg-glass-100 text-glass-400 border-glass-200 cursor-not-allowed opacity-60'
                          }`}
                        >
                          {dayData.day}
                        </button>
                      )
                    })
                  })()}
                </div>

                {/* Time picker - show for wdays_only mode with eventDetailsTimes */}
                {selectedDate && calendarMode === 'wdays_only' && eventDetailsTimes.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-glass-700 mb-2">
                      Time
                      <span className="ml-2 text-xs text-blue-600 font-normal">(Availability to confirm)</span>
                    </label>
                    <select
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-full px-3 py-2 border border-glass-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                    >
                      <option value="">Select time</option>
                      {eventDetailsTimes.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Time picker - show for normal modes with sessions */}
                {selectedDate && calendarMode !== 'wdays_only' && calendarMode !== null && (calendarMode === 'sessions' || calendarMode === 'dates') && sessionsByDay[selectedDate] && sessionsByDay[selectedDate].length > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-glass-700 mb-2">Time</label>
                    <select
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-full px-3 py-2 border border-glass-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                    >
                      <option value="">Select time</option>
                      {sessionsByDay[selectedDate]
                        .filter(s => s.time && s.time !== '00:00' && s.time !== '-')
                        .map((session) => (
                          <option key={session.time} value={session.time}>
                            {session.time} {session.available > 0 ? `(${session.available} available)` : '(Sold out)'}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
                </>
              )}
              </div>
            )}
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-glass-50 border border-glass-200 rounded-lg p-6 sticky top-8">
              <h3 className="text-xl font-bold mb-4">Book Now</h3>

              {/* Option selector (simple) */}
              {eventOptions.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Option</label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => {
                      setSelectedEventId(e.target.value)
                      setSelectedDate('')
                    }}
                    className="w-full px-3 py-2 border border-glass-300 rounded"
                  >
                    <option value="">{tDetail('chooseOption')}</option>
                    {eventOptions.map((opt) => (
                      <option key={opt.eventId} value={opt.eventId}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Booking Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Adults *</label>
                  <input
                    type="number"
                    min="1"
                    value={bookingForm.adults}
                    onChange={(e) => setBookingForm({ ...bookingForm, adults: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-glass-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Children</label>
                  <input
                    type="number"
                    min="0"
                    value={bookingForm.children}
                    onChange={(e) => setBookingForm({ ...bookingForm, children: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-glass-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Infants</label>
                  <input
                    type="number"
                    min="0"
                    value={bookingForm.infants}
                    onChange={(e) => setBookingForm({ ...bookingForm, infants: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-glass-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    value={bookingForm.name}
                    onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-glass-300 rounded"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    value={bookingForm.email}
                    onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-glass-300 rounded"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Phone *</label>
                  <input
                    type="tel"
                    value={bookingForm.phone}
                    onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-glass-300 rounded"
                    required
                  />
                </div>

                {/* none mode or wdays_only with no times: Show CTA instead of booking button */}
                {(calendarMode === 'none' || (calendarMode === 'wdays_only' && eventDetailsTimes.length === 0)) ? (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                    <p className="text-sm text-blue-800 text-center">
                      Availability on request. Contact us to confirm.
                    </p>
                    <div className="flex flex-col gap-2">
                      <a
                        href={buildWhatsAppUrl({
                          activityName: item.title || 'Activity',
                          eventId: selectedEventId,
                          lang: lang,
                          date: selectedDate || undefined,
                          adults: bookingForm.adults > 0 ? bookingForm.adults : undefined,
                          childs: bookingForm.children > 0 ? bookingForm.children : undefined,
                          infants: bookingForm.infants > 0 ? bookingForm.infants : undefined,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors text-center text-sm"
                      >
                        WhatsApp
                      </a>
                      <a
                        href={buildCallUrl()}
                        className="w-full px-4 py-2 bg-white border-2 border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors text-center text-sm"
                      >
                        Call
                      </a>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleBooking}
                    disabled={
                      isBooking || 
                      !selectedEventId || 
                      !selectedDate || 
                      bookingForm.adults < 1 ||
                      (calendarMode === null || calendarMode === undefined || (calendarMode as string | null) === 'none') ||
                      (requiresSessionTime && !hasValidTimes)
                    }
                    className="w-full px-6 py-3 bg-ocean-600 text-white font-medium rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isBooking ? 'Booking...' : 'Confirm Booking'}
                  </button>
                )}

                {/* Total price */}
                <div className="pt-4 border-t border-glass-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-glass-700">TOTAL</span>
                    <span
                      className={`text-xl font-bold ${
                        priceStatus === 'ok' ? 'text-ocean-600' : 'text-glass-900'
                      }`}
                    >
                      {totalDisplay}
                    </span>
                  </div>
                  {priceStatus === 'error' && selectedEventId && selectedDate && (
                    <div className="mt-1 text-xs text-glass-600">Pricing unavailable for selected date.</div>
                  )}
                </div>

                {bookingResult && (
                  <div className={`p-4 rounded ${bookingResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    {bookingResult.message}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


