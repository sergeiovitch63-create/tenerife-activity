/**
 * Premium Activity Page - 100% Sales-Oriented
 * 
 * Clean, conversion-focused design with only customer-relevant information
 * No technical details, only what sells
 */

'use client'

import { useState, useEffect } from 'react'
import { ActivityBookingPanel } from './ActivityBookingPanel'
import type { ActivityResolved } from '@/lib/atlantico/resolve'
import { SafeImage } from '@/components/SafeImage'
import { atlanticoAssetUrl } from '@/lib/atlantico/assets'
import { sanitizeAtlanticoHtml } from '@/lib/atlantico/htmlAssets'
import { LuxuryHeroGallery } from './LuxuryHeroGallery'
import { isVipTourGroup, getVipTourLocalImages } from '@/lib/atlantico/vip-tours-images'

interface PremiumActivityPageProps {
  locale?: string
  resolved?: ActivityResolved
  slug?: string
}

function formatEUR(n: number): string {
  return `€${n.toFixed(2)}`
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
    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-ocean-50 border border-ocean-200 rounded-lg text-sm text-ocean-700">
      <SafeImage
        src={src || undefined}
        alt={filename}
        width={20}
        height={20}
        className="object-contain"
      />
      <span className="capitalize">{filename.replace(/[_-]/g, ' ').replace(/\.(jpg|png|svg)$/i, '')}</span>
    </span>
  )
}

export function PremiumActivityPage({ locale = 'en', resolved, slug }: PremiumActivityPageProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(resolved?.t_id || null)
  const [activeTab, setActiveTab] = useState<'overview' | 'included' | 'cancellation'>('overview')

  // Complete Atlantico info state
  const [eventDetails, setEventDetails] = useState<any>(null)
  const [groupDetails, setGroupDetails] = useState<any>(null)
  const [allImages, setAllImages] = useState<string[]>([])
  
  // Check if VIP Tour (use local images)
  const isVipTour = isVipTourGroup(resolved?.t_group) || isVipTourGroup(slug)
  const groupCode = String(resolved?.t_group || slug || '')

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
    
    // VIP Tours: Use local images but still fetch groupDetails for content
    if (isVipTour) {
      // Load local images
      getVipTourLocalImages(groupCode).then(images => {
        if (images.length > 0) {
          setAllImages(images)
        }
      })
      
      // Fetch groupDetails for content
      fetch(`/api/atlantico/group/${t_group}/${language}`)
        .then(res => res.ok ? res.json() : null)
        .then((data) => {
          if (data) setGroupDetails(data)
        })
        .catch(() => {})
      return
    }
    
    fetch(`/api/atlantico/group/${t_group}/${language}`)
      .then(res => res.ok ? res.json() : null)
      .then(async (data) => {
        if (data) {
          setGroupDetails(data)
          
          // Collect all images from groupDetails
          const images: string[] = []
          
          if (Array.isArray(data.images) && data.images.length > 0) {
            for (const img of data.images) {
              if (typeof img === 'string' && img.trim() && (img.startsWith('http://') || img.startsWith('https://'))) {
                images.push(img.trim())
              }
            }
          }
          
          if (data.image && typeof data.image === 'string') {
            const url = await atlanticoAssetUrl(data.image, 'tour', { activityId: t_group, page: 'details' })
            if (url && !images.includes(url)) {
              images.push(url)
            }
          }
          
          if (images.length > 0) {
            setAllImages(images)
          }
        }
      })
      .catch(() => {})
  }, [t_group, language, isVipTour, groupCode])

  // Fetch eventDetails when eventId is selected
  useEffect(() => {
    if (!selectedEventId) {
      setEventDetails(null)
      return
    }

    fetch(`/api/atlantico/event/${selectedEventId}/${language}`)
      .then(res => res.ok ? res.json() : null)
      .then(async (data) => {
        if (data) {
          setEventDetails(data)
          
          // Add event images to allImages
          const eventImages: string[] = []
          
          if (Array.isArray(data.images) && data.images.length > 0) {
            for (const img of data.images) {
              if (typeof img === 'string' && img.trim() && (img.startsWith('http://') || img.startsWith('https://'))) {
                eventImages.push(img.trim())
              }
            }
          }
          
          if (data.image && typeof data.image === 'string') {
            const url = await atlanticoAssetUrl(data.image, 'tour', { activityId: selectedEventId, page: 'details' })
            if (url && !eventImages.includes(url)) {
              eventImages.push(url)
            }
          }
          
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
  }, [selectedEventId, language])

  // Get activity title and duration
  const activityTitle = groupDetails?.name || eventDetails?.name || eventDetails?.title || 'Activity'
  const activityDuration = groupDetails?.duration || eventDetails?.duration
  const activityDescription = eventDetails?.desc || groupDetails?.desc || groupDetails?.description || eventDetails?.description || ''
  const activityFAQ = groupDetails?.faq || ''
  const activityCancellation = groupDetails?.canDesc || groupDetails?.canTitle || ''
  const activityIcons = eventDetails?.icons || groupDetails?.icons || []

  // Premium tabs - only what sells
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'included', label: 'What\'s Included' },
    { id: 'cancellation', label: 'Cancellation Policy' },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Luxury Hero Gallery - Disney Style */}
      <div className="container mx-auto px-4 pt-8 pb-4 max-w-7xl">
        <LuxuryHeroGallery
          images={allImages.length > 0 ? allImages : []}
          title={activityTitle}
          duration={activityDuration}
        />
      </div>

      {/* Main Content: 2 columns layout */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Content (2/3 width) */}
          <div className="lg:col-span-2">
            {/* Event Options - Only if multiple */}
            {resolved?.events && resolved.events.length > 1 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-glass-900 mb-4">Choose Your Experience</h2>
                <div className="flex flex-wrap gap-3">
                  {resolved.events.map((event) => (
                    <button
                      key={event.t_id}
                      type="button"
                      onClick={() => setSelectedEventId(event.t_id)}
                      className={`px-6 py-3 rounded-xl border-2 text-base font-medium transition-all ${
                        selectedEventId === event.t_id
                          ? 'bg-ocean-600 text-white border-ocean-600 shadow-lg scale-105'
                          : 'bg-white text-glass-800 border-glass-300 hover:border-ocean-400 hover:shadow-md'
                      }`}
                    >
                      {event.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Premium Tabs */}
            <div className="border-b border-glass-200 mb-6">
              <div className="flex gap-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`pb-4 px-1 font-semibold text-base transition-colors border-b-2 ${
                      activeTab === tab.id
                        ? 'border-ocean-600 text-ocean-600'
                        : 'border-transparent text-glass-600 hover:text-glass-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
              {/* Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  {activityDescription && (
                    <div className="prose prose-lg max-w-none">
                      <div
                        dangerouslySetInnerHTML={sanitizeAtlanticoHtml(activityDescription)}
                        className="text-glass-700 leading-relaxed text-base space-y-4 [&>p]:mb-6 [&>p]:text-lg [&>p]:leading-8 [&>ul]:space-y-3 [&>ul]:mb-6 [&>ul]:text-lg [&>ul]:leading-8 [&>li]:mb-2 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-glass-900 [&>h2]:mb-4 [&>h2]:mt-8 [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-glass-900 [&>h3]:mb-3 [&>h3]:mt-6"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* What&apos;s Included */}
              {activeTab === 'included' && (
                <div className="space-y-8">
                  {activityFAQ ? (
                    <div className="prose prose-lg max-w-none">
                      <div
                        dangerouslySetInnerHTML={sanitizeAtlanticoHtml(activityFAQ)}
                        className="text-glass-700 leading-relaxed text-base space-y-4 [&>p]:mb-6 [&>p]:text-lg [&>p]:leading-8 [&>ul]:space-y-4 [&>ul]:mb-6 [&>ul]:text-lg [&>ul]:leading-8 [&>li]:mb-3 [&>li]:pl-2 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-glass-900 [&>h2]:mb-4 [&>h2]:mt-8 [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-glass-900 [&>h3]:mb-3 [&>h3]:mt-6"
                      />
                    </div>
                  ) : (
                    <div className="bg-glass-50 rounded-xl p-8 text-center text-glass-600">
                      <p className="text-lg">Information about what&apos;s included will be displayed here.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Cancellation Policy */}
              {activeTab === 'cancellation' && (
                <div className="space-y-4">
                  {activityCancellation ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                      <h3 className="text-xl font-bold text-amber-900 mb-3">Cancellation Policy</h3>
                      <div className="prose prose-lg max-w-none">
                        <div
                          dangerouslySetInnerHTML={sanitizeAtlanticoHtml(activityCancellation)}
                          className="text-amber-800 leading-relaxed"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-glass-50 rounded-xl p-6 text-center text-glass-600">
                      <p>Cancellation policy information will be displayed here.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Booking Panel (1/3 width) */}
          <div className="lg:col-span-1">
            {resolved ? (
              <div className="sticky top-4">
                <ActivityBookingPanel
                  t_group={resolved.t_group}
                  initialEventId={resolved.t_id}
                  events={resolved.events}
                  locale={locale}
                  language={resolved.language}
                  duration={activityDuration}
                  startingPrice={typeof groupDetails?.price === 'number' ? groupDetails.price : (typeof groupDetails?.price === 'string' ? parseFloat(groupDetails.price) : undefined)}
                />
              </div>
            ) : (
              <div className="bg-white border border-glass-200 rounded-xl p-6 shadow-lg">
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

