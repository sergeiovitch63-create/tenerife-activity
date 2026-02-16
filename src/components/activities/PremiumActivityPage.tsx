/**
 * Premium Activity Page - 100% Sales-Oriented
 * 
 * Clean, conversion-focused design with only customer-relevant information
 * No technical details, only what sells
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
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
  isActivity508?: boolean
}

function formatEUR(n: number): string {
  return `€${n.toFixed(2)}`
}

// Parse includes list from FAQ text
function parseIncludesList(text: string | null | undefined): string[] {
  if (!text) return []
  const cleanedText = text.replace(/(\r\n|\n|\r)/gm, ' ').replace(/\t/g, ' ').trim()
  // Split by bullet points or common list indicators
  const items = cleanedText.split(/•\s*|(?:\d+\.\s*)|-\s*|\*\s*|INCLUDES:\s*/).map(item => item.trim()).filter(item => item.length > 0)
  // If the first item is "INCLUDES:", remove it
  if (items[0]?.toUpperCase() === 'INCLUDES:') {
    items.shift()
  }
  return items
}

// Premium Itinerary Visual Component
function ItineraryVisual({ stops }: { stops: Array<{ type: 'departure' | 'stop' | 'arrival'; name: string }> }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  if (stops.length === 0) return null
  
  const departureStop = stops.find(s => s.type === 'departure')
  
  return (
    <div className="bg-gradient-to-br from-white to-glass-50 border-2 border-ocean-200 rounded-2xl p-8 shadow-xl">
      <div className="mb-6">
        <h3 className="text-3xl font-bold text-glass-900 mb-6">Itinéraire</h3>
        
        {/* Always show departure point */}
        {departureStop && (
          <div className="relative flex items-start gap-6">
            {/* Icon */}
            <div className="relative z-10 flex-shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-ocean-400 rounded-full blur-md opacity-50" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-ocean-500 to-ocean-600 flex items-center justify-center shadow-2xl ring-4 ring-ocean-100">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Text */}
            <div className="flex-1 pt-1">
              <div className="bg-white rounded-xl p-4 shadow-md border border-glass-200">
                <div className="text-xs font-bold text-ocean-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 bg-ocean-500 rounded-full" />
                  Lieu de départ
                </div>
                <div className="text-lg font-semibold text-glass-900 leading-relaxed">{departureStop.name}</div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Link to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-glass-900 hover:text-ocean-600 underline decoration-2 underline-offset-2 font-medium transition-colors"
      >
        {isExpanded ? 'Masquer l\'itinéraire' : 'Voir l\'itinéraire complet'}
      </button>
      
      {isExpanded && (
        <div className="relative pl-4 mt-6">
          {/* Premium vertical line with gradient */}
          <div className="absolute left-10 top-0 bottom-0 w-1">
            <div className="absolute inset-0 bg-gradient-to-b from-ocean-500 via-ocean-400 to-ocean-500 rounded-full shadow-lg" />
          </div>
          
          <div className="space-y-8 mt-6">
            {stops.map((stop, index) => {
              const isDeparture = stop.type === 'departure'
              const isArrival = stop.type === 'arrival'
              const isStop = stop.type === 'stop'
              
              // Skip departure in expanded view since it's already shown above
              if (isDeparture) return null
              
              return (
                <div key={index} className="relative flex items-start gap-6 group">
                  {/* Premium Icon with glow effect */}
                  <div className="relative z-10 flex-shrink-0">
                    {isDeparture || isArrival ? (
                      <div className="relative">
                        <div className="absolute inset-0 bg-ocean-400 rounded-full blur-md opacity-50 group-hover:opacity-75 transition-opacity" />
                        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-ocean-500 to-ocean-600 flex items-center justify-center shadow-2xl ring-4 ring-ocean-100 transform group-hover:scale-110 transition-transform">
                          {isDeparture ? (
                            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="absolute inset-0 bg-blue-400 rounded-full blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
                        <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-xl ring-2 ring-blue-100 transform group-hover:scale-110 transition-transform">
                          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Premium Text Card */}
                  <div className="flex-1 pt-1">
                    <div className="bg-white rounded-xl p-4 shadow-md border border-glass-200 hover:shadow-lg transition-shadow group-hover:border-ocean-200">
                      {isDeparture && (
                        <div className="text-xs font-bold text-ocean-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <div className="w-2 h-2 bg-ocean-500 rounded-full" />
                          Lieu de départ
                        </div>
                      )}
                      {isArrival && (
                        <div className="text-xs font-bold text-ocean-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <div className="w-2 h-2 bg-ocean-500 rounded-full" />
                          Arrivée à
                        </div>
                      )}
                      {isStop && (
                        <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          Arrêt
                        </div>
                      )}
                      <div className="text-lg font-semibold text-glass-900 leading-relaxed">{stop.name}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
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

export function PremiumActivityPage({ locale = 'en', resolved, slug, isActivity508 = false }: PremiumActivityPageProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(resolved?.t_id || null)
  const [activeTab, setActiveTab] = useState<'overview' | 'included' | 'cancellation' | 'description' | 'what-you-do'>(
    isActivity508 ? 'what-you-do' : 'overview'
  )

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

    // Fetch event details - try normalized route first, fallback to raw route
    Promise.race([
      fetch(`/api/atlantico/event-details?eventId=${encodeURIComponent(selectedEventId)}&lang=${encodeURIComponent(language)}`).then(res => res.ok ? res.json() : null),
      fetch(`/api/atlantico/event/${selectedEventId}/${language}`).then(res => res.ok ? res.json() : null)
    ])
      .then(async (data) => {
        if (data) {
          // Normalize meetingPoints if not already normalized
          if (data.meetingPoints && !Array.isArray(data.meetingPoints)) {
            // If meetingPoints is a string, convert to array
            if (typeof data.meetingPoints === 'string') {
              data.meetingPoints = [data.meetingPoints]
            } else {
              data.meetingPoints = []
            }
          }
          
          // If meetingPoints is undefined or null, try to extract from raw data
          if (!data.meetingPoints && data.meetingPoint) {
            data.meetingPoints = Array.isArray(data.meetingPoint) ? data.meetingPoint : [data.meetingPoint]
          }
          
          setEventDetails(data)
          
          // Debug log for meeting points
          if (isActivity508) {
            console.log('[ACTIVITY_508] Event details loaded:', {
              eventId: selectedEventId,
              hasMeetingPoints: !!data.meetingPoints,
              meetingPointsCount: Array.isArray(data.meetingPoints) ? data.meetingPoints.length : 0,
              meetingPoints: data.meetingPoints,
              rawDataKeys: Object.keys(data),
              hasMeetingPoint: !!data.meetingPoint,
              meetingPoint: data.meetingPoint,
            })
          }
          
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
      .catch((error) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('[ACTIVITY_508] Error fetching event details:', error)
        }
      })
  }, [selectedEventId, language])

  // Get activity title and duration
  const activityTitle = groupDetails?.name || eventDetails?.name || eventDetails?.title || 'Activity'
  const activityDuration = groupDetails?.duration || eventDetails?.duration
  const activityDescription = eventDetails?.desc || groupDetails?.desc || groupDetails?.description || eventDetails?.description || ''
  const activityFAQ = groupDetails?.faq || ''
  const activityCancellation = groupDetails?.canDesc || groupDetails?.canTitle || ''
  const activityWillDo = groupDetails?.willDo || ''
  const activityIcons = eventDetails?.icons || groupDetails?.icons || []
  const activityRoute = eventDetails?.route || groupDetails?.route || ''
  
  // Get meeting points - prioritize eventDetails, fallback to groupDetails
  // Normalize meeting points to ensure they're in the correct format
  const rawMeetingPoints = eventDetails?.meetingPoints || groupDetails?.meetingPoints || groupDetails?.meetingPoint || null
  const meetingPoints = useMemo(() => {
    if (!rawMeetingPoints) return null
    
    // If it's already an array, return it
    if (Array.isArray(rawMeetingPoints)) {
      return rawMeetingPoints
    }
    
    // If it's a string, convert to array
    if (typeof rawMeetingPoints === 'string') {
      return [rawMeetingPoints]
    }
    
    // If it's an object, wrap it in an array
    if (typeof rawMeetingPoints === 'object' && rawMeetingPoints !== null) {
      return [rawMeetingPoints]
    }
    
    return null
  }, [rawMeetingPoints])
  
  // Debug log for meeting points
  useEffect(() => {
    if (isActivity508) {
      console.log('[ACTIVITY_508] Meeting points computed:', {
        rawMeetingPoints,
        normalizedMeetingPoints: meetingPoints,
        fromEventDetails: !!eventDetails?.meetingPoints,
        fromGroupDetails: !!groupDetails?.meetingPoints,
        eventDetailsKeys: eventDetails ? Object.keys(eventDetails) : [],
        groupDetailsKeys: groupDetails ? Object.keys(groupDetails) : [],
      })
    }
  }, [isActivity508, rawMeetingPoints, meetingPoints, eventDetails, groupDetails])
  
  // Parse itinerary for activity 508
  const parseItinerary = (): Array<{ type: 'departure' | 'stop' | 'arrival'; name: string }> => {
    if (!isActivity508) return []
    
    // Extract itinerary from description or route
    const desc = groupDetails?.desc || eventDetails?.desc || ''
    const route = activityRoute || ''
    const text = route || desc
    
    // For activity 508, we know the itinerary from the description
    // Masca + Teide VIP tour stops - Starting from Puerto de la Cruz
    const stops = [
      { type: 'departure' as const, name: 'Puerto de la Cruz' },
      { type: 'stop' as const, name: 'San Pedro Viewpoint' },
      { type: 'stop' as const, name: 'Garachico' },
      { type: 'stop' as const, name: 'Masca' },
      { type: 'stop' as const, name: 'Teide National Park' },
      { type: 'stop' as const, name: 'Roques de García' },
      { type: 'stop' as const, name: 'La Orotava' },
      { type: 'arrival' as const, name: 'Puerto de la Cruz' },
    ]
    
    return stops
  }
  
  const itinerary = parseItinerary()

  // Premium tabs - only what sells
  // For activity 508: What you do, Overview, What's Included, Description (Cancellation Policy moved to booking panel)
  const tabs = isActivity508 ? [
    { id: 'what-you-do', label: 'What you do' },
    { id: 'overview', label: 'Overview' },
    { id: 'included', label: 'What\'s Included' },
    { id: 'description', label: 'Description' },
  ] : [
    { id: 'overview', label: 'Overview' },
    { id: 'included', label: 'What\'s Included' },
    { id: 'cancellation', label: 'Cancellation Policy' },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Luxury Hero Gallery - Disney Style */}
      <div className={`${isActivity508 ? 'px-0 md:container md:mx-auto md:px-4' : 'container mx-auto px-4'} pt-8 pb-4 ${isActivity508 ? '' : 'max-w-7xl'}`}>
        <LuxuryHeroGallery
          images={allImages.length > 0 ? allImages : []}
          title={activityTitle}
          duration={activityDuration}
          fullScreenMobile={isActivity508}
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

            {/* Premium Tabs - Scroll Navigation */}
            <div className="border-b border-glass-200 mb-6 sticky top-0 bg-white z-10 pb-2">
              <div className="flex gap-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      const element = document.getElementById(`section-${tab.id}`)
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        // Update active tab for visual feedback
                        setActiveTab(tab.id as any)
                      }
                    }}
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

            {/* All Content - All sections visible */}
            <div className="space-y-12">
              {/* What you do - First for activity 508 */}
              {isActivity508 && (
                <div id="section-what-you-do" className="scroll-mt-24">
                  <h2 className="text-3xl font-bold text-glass-900 mb-6">What you do</h2>
                  <div className="space-y-8">
                    {activityWillDo ? (
                      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-8">
                        <div className="prose prose-lg max-w-none">
                          <div
                            dangerouslySetInnerHTML={sanitizeAtlanticoHtml(activityWillDo)}
                            className="text-glass-800 leading-relaxed font-bold text-lg [&>p]:font-bold [&>p]:text-lg [&>p]:mb-4 [&>*]:font-bold"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-glass-50 rounded-xl p-8 text-center text-glass-600">
                        <p className="text-lg">Information not available.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Overview */}
              <div id="section-overview" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-glass-900 mb-6">Overview</h2>
                <div className="space-y-8">
                  {activityDescription && (
                    <div className="prose prose-lg max-w-none">
                      <div
                        dangerouslySetInnerHTML={sanitizeAtlanticoHtml(activityDescription)}
                        className="text-glass-700 leading-relaxed text-base space-y-4 [&>p]:mb-6 [&>p]:text-lg [&>p]:leading-8 [&>ul]:space-y-3 [&>ul]:mb-6 [&>ul]:text-lg [&>ul]:leading-8 [&>li]:mb-2 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-glass-900 [&>h2]:mb-4 [&>h2]:mt-8 [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-glass-900 [&>h3]:mb-3 [&>h3]:mt-6"
                      />
                    </div>
                  )}
                  
                  {/* Itinerary - Only for activity 508 */}
                  {isActivity508 && itinerary.length > 0 && (
                    <div className="mt-8">
                      <ItineraryVisual stops={itinerary} />
                    </div>
                  )}
                </div>
              </div>

              {/* What&apos;s Included */}
              <div id="section-included" className="scroll-mt-24">
                <h2 className="text-3xl font-bold text-glass-900 mb-6">What&apos;s Included</h2>
                <div className="space-y-8">
                  {activityFAQ ? (
                    isActivity508 ? (
                      // Clean point-by-point layout for activity 508
                      (() => {
                        const includesList = parseIncludesList(activityFAQ)
                        if (includesList.length > 0) {
                          return (
                            <div className="space-y-3">
                              {includesList.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-4 py-3"
                                >
                                  <div className="flex-shrink-0 mt-1">
                                    <div className="w-6 h-6 rounded-full bg-ocean-500 flex items-center justify-center">
                                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  </div>
                                  <p className="text-glass-800 text-base leading-relaxed flex-1">{item}</p>
                                </div>
                              ))}
                            </div>
                          )
                        } else {
                          // Fallback to HTML rendering
                          return (
                            <div className="prose prose-lg max-w-none">
                              <div
                                dangerouslySetInnerHTML={sanitizeAtlanticoHtml(activityFAQ)}
                                className="text-glass-700 leading-relaxed text-base space-y-4"
                              />
                            </div>
                          )
                        }
                      })()
                    ) : (
                      // Standard layout for other activities
                      <div className="prose prose-lg max-w-none">
                        <div
                          dangerouslySetInnerHTML={sanitizeAtlanticoHtml(activityFAQ)}
                          className="text-glass-700 leading-relaxed text-base space-y-4 [&>p]:mb-6 [&>p]:text-lg [&>p]:leading-8 [&>ul]:space-y-4 [&>ul]:mb-6 [&>ul]:text-lg [&>ul]:leading-8 [&>li]:mb-3 [&>li]:pl-2 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-glass-900 [&>h2]:mb-4 [&>h2]:mt-8 [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-glass-900 [&>h3]:mb-3 [&>h3]:mt-6"
                        />
                      </div>
                    )
                  ) : (
                    <div className="bg-glass-50 rounded-xl p-8 text-center text-glass-600">
                      <p className="text-lg">Information about what&apos;s included will be displayed here.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Description - Only for activity 508 */}
              {isActivity508 && (
                <div id="section-description" className="scroll-mt-24">
                  <h2 className="text-3xl font-bold text-glass-900 mb-6">Description</h2>
                  <div className="space-y-8">
                    {groupDetails?.desc ? (
                      <div className="prose prose-lg max-w-none">
                        <div
                          dangerouslySetInnerHTML={sanitizeAtlanticoHtml(groupDetails.desc)}
                          className="text-glass-700 leading-relaxed text-base space-y-4"
                        />
                      </div>
                    ) : (
                      <div className="bg-glass-50 rounded-xl p-8 text-center text-glass-600">
                        <p className="text-lg">No description available.</p>
                      </div>
                    )}
                  </div>
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
                  cancellationPolicy={activityCancellation}
                  cancellationTitle={groupDetails?.canTitle}
                  meetingPoints={meetingPoints}
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

