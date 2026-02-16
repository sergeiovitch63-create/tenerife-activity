/**
 * Activity Booking Skeleton - Complete activity page with all Atlantico info
 * Layout: tabs (left) + booking panel (right)
 * Displays all information from Atlantico API with beautiful UX
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { Tabs } from '@/app/[locale]/activities/[slug]/components/Tabs'
import { ActivityBookingPanel } from './ActivityBookingPanel'
import type { ActivityResolved } from '@/lib/atlantico/resolve'
import { SafeImage } from '@/components/SafeImage'
import { atlanticoAssetUrl } from '@/lib/atlantico/assets'
import { sanitizeAtlanticoHtml } from '@/lib/atlantico/htmlAssets'
import { LuxuryHeroGallery } from './LuxuryHeroGallery'
import { PremiumActivityPage } from './PremiumActivityPage'
import { isVipTourGroup } from '@/lib/atlantico/vip-tours-images'

interface ActivityBookingSkeletonProps {
  locale?: string
  resolved?: ActivityResolved
  slug?: string
}

function formatEUR(n: number): string {
  return `€${n.toFixed(2)}`
}

function iconAltFromFilename(filename: string): string {
  const base = filename.split('/').pop() || filename
  return base.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim() || 'icon'
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

export function ActivityBookingSkeleton({ locale = 'en', resolved, slug }: ActivityBookingSkeletonProps) {
  // Use premium version for all VIP Tours (classification 308) - 100% sales-oriented
  const isVipTour = isVipTourGroup(resolved?.t_group) || isVipTourGroup(slug)
  
  // Early return for premium version - must be before hooks
  if (isVipTour) {
    return <PremiumActivityPage locale={locale} resolved={resolved} slug={slug} />
  }

  // Standard version hooks (only executed if not 303)
  const [activeTab, setActiveTab] = useState('what-youll-do')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(resolved?.t_id || null)
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  })

  // Complete Atlantico info state
  const [eventDetails, setEventDetails] = useState<any>(null)
  const [groupDetails, setGroupDetails] = useState<any>(null)
  const [limitsInfo, setLimitsInfo] = useState<any>(null)
  const [pricesData, setPricesData] = useState<any>(null)
  
  // Image states
  const [eventImageUrl, setEventImageUrl] = useState<string | null>(null)
  const [groupImageUrl, setGroupImageUrl] = useState<string | null>(null)
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null)
  const [allImages, setAllImages] = useState<string[]>([])
  
  // Calendar state
  const [sessionsByDay, setSessionsByDay] = useState<Record<string, Array<{ time: string; available: number }>>>({})
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [projectedAvailableDates, setProjectedAvailableDates] = useState<string[]>([])
  const [calendarMode, setCalendarMode] = useState<'sessions' | 'dates' | 'wdays_only' | 'none' | null>(null)
  const [loadingCalendar, setLoadingCalendar] = useState(false)
  const [loadingInfo, setLoadingInfo] = useState(false)

  const language = resolved?.language || 'ENG'
  const t_group = resolved?.t_group || ''

  // Auto-select first event if available
  useEffect(() => {
    if (resolved?.events && resolved.events.length > 0 && !selectedEventId) {
      setSelectedEventId(resolved.events[0].t_id)
    }
  }, [resolved?.events, selectedEventId])

  // Fetch groupDetails immediately
  useEffect(() => {
    if (!t_group) return
    
    setLoadingInfo(true)
    fetch(`/api/atlantico/group/${t_group}/${language}`)
      .then(res => res.ok ? res.json() : null)
      .then(async (data) => {
        if (data) {
          setGroupDetails(data)
          
          // Collect all images from groupDetails
          const images: string[] = []
          
          // 1. Add images from groupDetails.images array (full URLs)
          if (Array.isArray(data.images) && data.images.length > 0) {
            for (const img of data.images) {
              if (typeof img === 'string' && img.trim()) {
                const trimmed = img.trim()
                if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                  images.push(trimmed)
                }
              }
            }
          }
          
          // 2. Add groupDetails.image (filename) - resolve to URL
          if (data.image && typeof data.image === 'string') {
            const url = await atlanticoAssetUrl(data.image, 'tour', { activityId: t_group, page: 'details' })
            if (url && !images.includes(url)) {
              images.push(url)
            }
            setGroupImageUrl(url)
            setHeroImageUrl(url)
          }
          
          // If we have images, set them
          if (images.length > 0) {
            setAllImages(images)
          } else if (groupImageUrl) {
            // Fallback: use single group image
            setAllImages([groupImageUrl])
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingInfo(false))
  }, [t_group, language])

  // Fetch eventDetails when eventId is selected
  useEffect(() => {
    if (!selectedEventId) {
      setEventDetails(null)
      setEventImageUrl(null)
      return
    }

    setLoadingInfo(true)
    fetch(`/api/atlantico/event/${selectedEventId}/${language}`)
      .then(res => res.ok ? res.json() : null)
      .then(async (data) => {
        if (data) {
          setEventDetails(data)
          
          // Collect event images and add to allImages
          const eventImages: string[] = []
          
          // 1. Add images from eventDetails.images array (if exists)
          if (Array.isArray(data.images) && data.images.length > 0) {
            for (const img of data.images) {
              if (typeof img === 'string' && img.trim()) {
                const trimmed = img.trim()
                if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                  eventImages.push(trimmed)
                }
              }
            }
          }
          
          // 2. Resolve eventDetails.image (filename)
          if (data.image && typeof data.image === 'string') {
            const url = await atlanticoAssetUrl(data.image, 'tour', { activityId: selectedEventId, page: 'details' })
            if (url) {
              setEventImageUrl(url)
              if (!eventImages.includes(url)) {
                eventImages.push(url)
              }
              // Use event image as hero if group image not available
              if (!heroImageUrl) {
                setHeroImageUrl(url)
              }
            }
          }
          
          // Merge event images with existing images (avoid duplicates)
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
        }
      })
      .catch(() => {})
      .finally(() => setLoadingInfo(false))
  }, [selectedEventId, language, heroImageUrl])

  // Fetch limits when eventId or month changes
  useEffect(() => {
    if (!selectedEventId) {
      setSessionsByDay({})
      setAvailableDates([])
      setLimitsInfo(null)
      return
    }

    setLoadingCalendar(true)
    const normalizedMonth = (() => {
      const match = currentMonth.match(/^(\d{4}-\d{2})/)
      if (match) {
        return `${match[1]}-01`
      }
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    })()

    fetch(`/api/atlantico/limits?eventId=${encodeURIComponent(selectedEventId)}&lang=${encodeURIComponent(language)}&month=${encodeURIComponent(normalizedMonth)}`)
      .then(res => res.ok ? res.json() : null)
      .then((data) => {
        if (data) {
          setLimitsInfo(data)
          setCalendarMode(data.calendarMode || 'sessions')
          setSessionsByDay(data.sessionsByDay || {})
          setAvailableDates(data.availableDates || [])
          setProjectedAvailableDates(data.projectedAvailableDates || [])
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCalendar(false))
  }, [selectedEventId, language, currentMonth])

  // Calendar grid
  const calendarGrid = useMemo(() => {
    const [year, month] = currentMonth.split('-').map(Number)
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const days: Array<{ day: number; dateStr: string; available: boolean; isToday: boolean; isPast: boolean }> = []

    // Empty cells
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ day: 0, dateStr: '', available: false, isToday: false, isPast: false })
    }

    // Days of month
    const datesToCheck = calendarMode === 'wdays_only' ? projectedAvailableDates : availableDates
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const date = new Date(year, month - 1, day)
      const isToday = date.getTime() === today.getTime()
      const isPast = date < today
      const available = !isPast && datesToCheck.includes(dateStr)

      days.push({ day, dateStr, available, isToday, isPast })
    }

    return { year, month: month - 1, days }
  }, [currentMonth, availableDates, projectedAvailableDates, calendarMode])

  const changeMonth = (delta: number) => {
    const [year, month] = currentMonth.split('-').map(Number)
    const newDate = new Date(year, month - 1 + delta, 1)
    const newMonthStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-01`
    setCurrentMonth(newMonthStr)
  }

  const tabs = [
    { id: 'what-youll-do', label: "What you'll do", sectionId: 'section-what-youll-do' },
    { id: 'description', label: 'Description', sectionId: 'section-description' },
    { id: 'details', label: 'Details', sectionId: 'section-details' },
    { id: 'cancellation', label: 'Cancellation', sectionId: 'section-cancellation' },
    { id: 'prices', label: 'Prices', sectionId: 'section-prices' },
    { id: 'reviews', label: 'Reviews', sectionId: 'section-reviews' },
  ]

  const selectedEvent = resolved?.events?.find(e => e.t_id === selectedEventId)

  // Get activity title and duration
  const activityTitle = groupDetails?.name || eventDetails?.name || eventDetails?.title || 'Activity'
  const activityDuration = groupDetails?.duration || eventDetails?.duration

  return (
    <div className="min-h-screen bg-white">
      {/* Luxury Hero Gallery - Disney Style (for all activities) */}
      <div className="container mx-auto px-4 pt-8 pb-4 max-w-7xl">
        <LuxuryHeroGallery
          images={allImages.length > 0 ? allImages : (heroImageUrl ? [heroImageUrl] : [])}
          title={activityTitle}
          duration={activityDuration}
        />
      </div>

      {/* Main Content: 2 columns layout */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Tabs + Content (2/3 width on large screens) */}
          <div className="lg:col-span-2">
            {/* Event Options */}
            {resolved?.events && resolved.events.length > 1 && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-glass-900 mb-3">Available Options</h2>
                <div className="flex flex-wrap gap-2">
                  {resolved.events.map((event) => (
                    <button
                      key={event.t_id}
                      type="button"
                      onClick={() => setSelectedEventId(event.t_id)}
                      className={`px-4 py-2 rounded-full border text-sm transition-colors ${
                        selectedEventId === event.t_id
                          ? 'bg-ocean-600 text-white border-ocean-600'
                          : 'bg-white text-glass-800 border-glass-300 hover:border-ocean-300'
                      }`}
                    >
                      {event.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Tab Content */}
            <div className="mt-6">
              {/* What you'll do */}
              <div id="section-what-youll-do" className={activeTab === 'what-youll-do' ? '' : 'hidden'}>
                {loadingInfo ? (
                  <div className="min-h-[200px] flex items-center justify-center">
                    <p className="text-glass-500">Loading...</p>
                  </div>
                ) : eventDetails?.desc || groupDetails?.desc ? (
                  <div className="prose prose-lg max-w-none">
                    <div
                      dangerouslySetInnerHTML={sanitizeAtlanticoHtml(eventDetails?.desc || groupDetails?.desc || '')}
                    />
                  </div>
                ) : (
                  <p className="text-glass-500">No overview available.</p>
                )}
              </div>

              {/* Description */}
              <div id="section-description" className={activeTab === 'description' ? '' : 'hidden'}>
                {loadingInfo ? (
                  <div className="min-h-[200px] flex items-center justify-center">
                    <p className="text-glass-500">Loading...</p>
                  </div>
                ) : eventDetails?.description || groupDetails?.description ? (
                  <div className="prose prose-lg max-w-none">
                    <div
                      dangerouslySetInnerHTML={sanitizeAtlanticoHtml(eventDetails?.description || groupDetails?.description || '')}
                    />
                  </div>
                ) : (
                  <p className="text-glass-500">No description available.</p>
                )}
              </div>

              {/* Details - Complete Info */}
              <div id="section-details" className={activeTab === 'details' ? '' : 'hidden'}>
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="bg-glass-50 rounded-lg p-6">
                    <h3 className="text-xl font-semibold mb-4 text-glass-900">Basic Information</h3>
                    <dl className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="font-medium text-glass-600">Group Code:</dt>
                        <dd className="text-glass-900">{t_group}</dd>
                      </div>
                      {groupDetails?.code && (
                        <div>
                          <dt className="font-medium text-glass-600">Group Code (API):</dt>
                          <dd className="text-glass-900">{groupDetails.code}</dd>
                        </div>
                      )}
                      {selectedEventId && (
                        <div>
                          <dt className="font-medium text-glass-600">Event ID (t_id):</dt>
                          <dd className="text-glass-900">{selectedEventId}</dd>
                        </div>
                      )}
                      {eventDetails?.code && (
                        <div>
                          <dt className="font-medium text-glass-600">Event Code:</dt>
                          <dd className="text-glass-900">{eventDetails.code}</dd>
                        </div>
                      )}
                      {groupDetails?.duration && (
                        <div>
                          <dt className="font-medium text-glass-600">Duration:</dt>
                          <dd className="text-glass-900">{groupDetails.duration}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Event Image */}
                  {eventImageUrl && (
                    <div className="bg-white rounded-lg overflow-hidden border border-glass-200">
                      <SafeImage
                        src={eventImageUrl}
                        alt={eventDetails?.name || 'Event image'}
                        width={800}
                        height={400}
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  )}

                  {/* Event Details */}
                  {eventDetails && (
                    <div className="bg-white rounded-lg p-6 border border-glass-200">
                      <h3 className="text-xl font-semibold mb-4 text-glass-900">Event Details</h3>
                      <dl className="grid grid-cols-2 gap-4">
                        {eventDetails.name && (
                          <div>
                            <dt className="font-medium text-glass-600">Name:</dt>
                            <dd className="text-glass-900">{eventDetails.name}</dd>
                          </div>
                        )}
                        {eventDetails.title && (
                          <div>
                            <dt className="font-medium text-glass-600">Title:</dt>
                            <dd className="text-glass-900">{eventDetails.title}</dd>
                          </div>
                        )}
                        {eventDetails.route && (
                          <div>
                            <dt className="font-medium text-glass-600">Route:</dt>
                            <dd className="text-glass-900">{eventDetails.route}</dd>
                          </div>
                        )}
                        {eventDetails.times && Array.isArray(eventDetails.times) && eventDetails.times.length > 0 && (
                          <div>
                            <dt className="font-medium text-glass-600">Available Times:</dt>
                            <dd className="text-glass-900">{eventDetails.times.join(', ')}</dd>
                          </div>
                        )}
                        {eventDetails.days && Array.isArray(eventDetails.days) && eventDetails.days.length > 0 && (
                          <div>
                            <dt className="font-medium text-glass-600">Available Days:</dt>
                            <dd className="text-glass-900">{eventDetails.days.join(', ')}</dd>
                          </div>
                        )}
                        {eventDetails.pProd !== undefined && (
                          <div>
                            <dt className="font-medium text-glass-600">Price Product:</dt>
                            <dd className="text-glass-900">{eventDetails.pProd}</dd>
                          </div>
                        )}
                      </dl>
                      {eventDetails.icons && Array.isArray(eventDetails.icons) && eventDetails.icons.length > 0 && (
                        <div className="mt-4">
                          <dt className="font-medium text-glass-600 mb-2">Icons:</dt>
                          <dd className="flex flex-wrap gap-2">
                            {eventDetails.icons.map((icon: string, idx: number) => (
                              <EventIcon key={idx} filename={icon} />
                            ))}
                          </dd>
                        </div>
                      )}
                      {eventDetails.meetingPoints && Array.isArray(eventDetails.meetingPoints) && eventDetails.meetingPoints.length > 0 && (
                        <div className="mt-4">
                          <dt className="font-medium text-glass-600 mb-2">Meeting Points:</dt>
                          <dd>
                            <ul className="list-disc list-inside space-y-1">
                              {eventDetails.meetingPoints.map((point: any, idx: number) => (
                                <li key={idx} className="text-glass-900">
                                  {typeof point === 'string' ? point : JSON.stringify(point)}
                                </li>
                              ))}
                            </ul>
                          </dd>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Group Details */}
                  {groupDetails && (
                    <div className="bg-white rounded-lg p-6 border border-glass-200">
                      <h3 className="text-xl font-semibold mb-4 text-glass-900">Group Details</h3>
                      {groupImageUrl && (
                        <div className="mb-4">
                          <SafeImage
                            src={groupImageUrl}
                            alt={groupDetails.name || 'Group image'}
                            width={800}
                            height={400}
                            className="w-full rounded-lg border border-glass-200"
                          />
                        </div>
                      )}
                      <dl className="grid grid-cols-2 gap-4">
                        {groupDetails.name && (
                          <div>
                            <dt className="font-medium text-glass-600">Name:</dt>
                            <dd className="text-glass-900">{groupDetails.name}</dd>
                          </div>
                        )}
                        {groupDetails.ids && (
                          <div>
                            <dt className="font-medium text-glass-600">Event IDs:</dt>
                            <dd className="text-glass-900">{String(groupDetails.ids)}</dd>
                          </div>
                        )}
                        {groupDetails.events && Array.isArray(groupDetails.events) && groupDetails.events.length > 0 && (
                          <div>
                            <dt className="font-medium text-glass-600">Events:</dt>
                            <dd className="text-glass-900">{groupDetails.events.join(', ')}</dd>
                          </div>
                        )}
                        {groupDetails.price !== undefined && groupDetails.price !== null && (
                          <div>
                            <dt className="font-medium text-glass-600">Base Price:</dt>
                            <dd className="text-glass-900">
                              {typeof groupDetails.price === 'number' ? formatEUR(groupDetails.price) : groupDetails.price}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  )}

                  {/* Availability Info */}
                  {limitsInfo && (
                    <div className="bg-white rounded-lg p-6 border border-glass-200">
                      <h3 className="text-xl font-semibold mb-4 text-glass-900">Availability Information</h3>
                      <dl className="grid grid-cols-2 gap-4 mb-4">
                        {limitsInfo.calendarMode && (
                          <div>
                            <dt className="font-medium text-glass-600">Calendar Mode:</dt>
                            <dd className="text-glass-900">{limitsInfo.calendarMode}</dd>
                          </div>
                        )}
                        {limitsInfo.requiresSessionTime !== undefined && (
                          <div>
                            <dt className="font-medium text-glass-600">Requires Session Time:</dt>
                            <dd className="text-glass-900">{limitsInfo.requiresSessionTime ? 'Yes' : 'No'}</dd>
                          </div>
                        )}
                        {limitsInfo.quote !== null && limitsInfo.quote !== undefined && (
                          <div>
                            <dt className="font-medium text-glass-600">Quote:</dt>
                            <dd className="text-glass-900">{limitsInfo.quote}</dd>
                          </div>
                        )}
                        {limitsInfo.availableDates && Array.isArray(limitsInfo.availableDates) && (
                          <div>
                            <dt className="font-medium text-glass-600">Available Dates:</dt>
                            <dd className="text-glass-900">{limitsInfo.availableDates.length}</dd>
                          </div>
                        )}
                      </dl>

                      {/* Calendar */}
                      {calendarMode !== 'none' && (
                        <div className="mt-6">
                          <h4 className="font-semibold mb-3 text-glass-900">Calendar</h4>
                          <div className="mb-4 flex items-center justify-between">
                            <button
                              onClick={() => changeMonth(-1)}
                              className="px-3 py-1 text-sm font-medium text-glass-700 bg-white border border-glass-300 rounded hover:bg-glass-50"
                            >
                              ← Prev
                            </button>
                            <h5 className="text-lg font-semibold">
                              {new Date(calendarGrid.year, calendarGrid.month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </h5>
                            <button
                              onClick={() => changeMonth(1)}
                              className="px-3 py-1 text-sm font-medium text-glass-700 bg-white border border-glass-300 rounded hover:bg-glass-50"
                            >
                              Next →
                            </button>
                          </div>
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                              <div key={day} className="text-center text-xs font-medium text-glass-600 py-1">
                                {day}
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {calendarGrid.days.map((dayData, idx) => {
                              if (dayData.day === 0) {
                                return <div key={`empty-${idx}`} className="aspect-square" />
                              }
                              return (
                                <div
                                  key={dayData.dateStr}
                                  className={`aspect-square p-1 rounded border text-sm flex items-center justify-center transition-colors ${
                                    dayData.isPast
                                      ? 'bg-glass-100 text-glass-400 border-glass-200 opacity-60'
                                      : dayData.available
                                      ? 'bg-white text-glass-900 border-glass-200 hover:bg-ocean-50 hover:border-ocean-300 cursor-pointer'
                                      : 'bg-glass-100 text-glass-400 border-glass-200 cursor-not-allowed opacity-60'
                                  } ${dayData.isToday ? 'ring-2 ring-ocean-300' : ''}`}
                                >
                                  {dayData.day}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Cancellation */}
              <div id="section-cancellation" className={activeTab === 'cancellation' ? '' : 'hidden'}>
                <div className="bg-glass-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4 text-glass-900">Cancellation Policy</h3>
                  <p className="text-glass-600">Cancellation policy information will be displayed here.</p>
                </div>
              </div>

              {/* Prices */}
              <div id="section-prices" className={activeTab === 'prices' ? '' : 'hidden'}>
                {pricesData ? (
                  <div className="bg-white rounded-lg p-6 border border-glass-200">
                    <h3 className="text-xl font-semibold mb-4 text-glass-900">Pricing</h3>
                    {pricesData.ok && pricesData.type === 'per_person' ? (
                      <dl className="grid grid-cols-2 gap-4">
                        <div>
                          <dt className="font-medium text-glass-600">Adult:</dt>
                          <dd className="text-lg font-semibold text-glass-900">{formatEUR(pricesData.adultPrice)}</dd>
                        </div>
                        {pricesData.childPrice && (
                          <div>
                            <dt className="font-medium text-glass-600">Child:</dt>
                            <dd className="text-lg font-semibold text-glass-900">{formatEUR(pricesData.childPrice)}</dd>
                          </div>
                        )}
                        {pricesData.infantPrice && (
                          <div>
                            <dt className="font-medium text-glass-600">Infant:</dt>
                            <dd className="text-lg font-semibold text-glass-900">{formatEUR(pricesData.infantPrice)}</dd>
                          </div>
                        )}
                      </dl>
                    ) : (
                      <p className="text-glass-600">Select a date to see prices.</p>
                    )}
                  </div>
                ) : (
                  <div className="bg-glass-50 rounded-lg p-6">
                    <p className="text-glass-600">Select a date to see prices.</p>
                  </div>
                )}
              </div>

              {/* Reviews */}
              <div id="section-reviews" className={activeTab === 'reviews' ? '' : 'hidden'}>
                <div className="bg-glass-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4 text-glass-900">Reviews</h3>
                  <p className="text-glass-600">No reviews available yet.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Manage your booking (1/3 width on large screens) */}
          <div className="lg:col-span-1" style={{ position: 'relative', zIndex: 1 }}>
            {resolved ? (
              <div className="sticky top-4" style={{ position: 'relative', zIndex: 1, pointerEvents: 'auto' }}>
                <ActivityBookingPanel
                  t_group={resolved.t_group}
                  initialEventId={resolved.t_id}
                  events={resolved.events}
                  locale={locale}
                  language={resolved.language}
                />
              </div>
            ) : (
              <div 
                className="bg-white border border-glass-200 rounded-lg p-6 shadow-lg sticky top-4"
                style={{ position: 'relative', zIndex: 1, pointerEvents: 'auto' }}
              >
                <h3 className="text-lg font-semibold text-glass-900 mb-6">Manage your booking</h3>
                <p className="text-glass-600">Loading booking options...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
