'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { mapLocaleToLang } from '@/lib/atlantico/locale'
import { normalizeGroups, type NormalizedGroup } from '@/lib/catalog/normalize'
import { BookingWidget } from '@/components/catalog/BookingWidget'
import { ClientImage } from '../ClientImage'
import { atlanticoAssetUrl } from '@/lib/atlantico/assets'

type Classification = {
  id?: string | number
  code?: string
  name?: string
  [key: string]: unknown
}

type Group = {
  id?: string | number
  Code?: string
  code?: string
  name?: string
  price?: string | number
  duration?: string | number
  image?: string
  ids?: string | number | string[] | number[]
  [key: string]: unknown
}

type GroupDetails = {
  id?: string | number
  Code?: string
  code?: string
  name?: string
  Name?: string
  price?: string | number
  image?: string
  desc?: string
  description?: string
  ids?: string | number | string[] | number[]
  [key: string]: unknown
}

type EventDetails = {
  Code?: string
  code?: string
  name?: string
  title?: string
  [key: string]: unknown
}

type BackofficePayload = {
  ok: boolean
  lang: string
  classifications: Classification[]
  groupsByClassification: Record<string, Group[]>
  groupDetailsByKey?: Record<string, GroupDetails>
  groupDetailsByGroupId?: Record<string, GroupDetails>
  eventDetailsByEventId: Record<string, EventDetails>
  totals?: { classifications: number; groups: number; events: number; failures: number }
  error?: string
}

function formatPrice(price: string | number | undefined): string {
  if (price === undefined || price === null) return '—'
  const num = typeof price === 'string' ? parseFloat(price) : price
  if (isNaN(num) || num <= 0) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export default function CatalogDetailPage() {
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const groupKey = (params?.groupKey as string) || ''
  const lang = mapLocaleToLang(locale)

  const [data, setData] = useState<BackofficePayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'description' | 'details' | 'prices' | 'reviews'>('overview')
  const [resolvedImage, setResolvedImage] = useState<string | null>(null)

  const groupDetailsMap = useMemo(() => {
    if (!data) return null
    return data.groupDetailsByKey || data.groupDetailsByGroupId || null
  }, [data])

  // Find the group
  const normalizedGroup = useMemo<NormalizedGroup | null>(() => {
    if (!data || !groupKey) return null
    
    const allGroups = normalizeGroups(
      data.classifications,
      data.groupsByClassification,
      groupDetailsMap,
      null, // All classifications
      data.eventDetailsByEventId
    )
    
    return allGroups.find((ng) => ng.key === groupKey) || null
  }, [data, groupKey, groupDetailsMap])

  // Resolve hero image filename -> public URL (async, client-safe)
  const heroFilename = useMemo(() => {
    if (!normalizedGroup) return null
    const { group, details } = normalizedGroup
    return group.image || details?.image || null
  }, [normalizedGroup])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!heroFilename) {
        setResolvedImage(null)
        return
      }
      const url = await atlanticoAssetUrl(String(heroFilename), 'tour', {
        activityId: groupKey,
        page: 'catalog',
      })
      if (!cancelled) setResolvedImage(url)
    })().catch(() => {
      if (!cancelled) setResolvedImage(null)
    })
    return () => {
      cancelled = true
    }
  }, [heroFilename, groupKey])

  async function fetchBackoffice(classificationId?: string): Promise<void> {
    setLoading(true)
    setError(null)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    try {
      const url = `/api/atlantico/backoffice?lang=${encodeURIComponent(lang)}${classificationId ? `&classificationId=${encodeURIComponent(classificationId)}` : ''}`
      const res = await fetch(url, { signal: controller.signal })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      const json = (await res.json()) as BackofficePayload
      
      setData((prev) => {
        if (!prev) return json
        return {
          ...json,
          classifications: json.classifications.length > 0 ? json.classifications : prev.classifications,
          groupsByClassification: Object.keys(json.groupsByClassification).length > 0 
            ? { ...prev.groupsByClassification, ...json.groupsByClassification }
            : prev.groupsByClassification,
          groupDetailsByKey: {
            ...prev.groupDetailsByKey,
            ...json.groupDetailsByKey,
          },
          groupDetailsByGroupId: {
            ...prev.groupDetailsByGroupId,
            ...json.groupDetailsByGroupId,
          },
          eventDetailsByEventId: {
            ...prev.eventDetailsByEventId,
            ...json.eventDetailsByEventId,
          },
        }
      })
      
      if (!json.ok) {
        setError(json.error || 'API returned ok=false')
      }
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.name === 'AbortError'
            ? 'Request timed out'
            : e.message
          : 'Unknown error'
      setError(msg)
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchBackoffice().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  // Fetch classification details if group found
  useEffect(() => {
    if (normalizedGroup && !normalizedGroup.details) {
      fetchBackoffice(normalizedGroup.classificationId).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedGroup?.classificationId])

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-glass-50">
        <div className="container mx-auto px-4 max-w-7xl py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-64 w-full rounded-lg bg-glass-200" />
            <div className="h-8 w-2/3 rounded bg-glass-200" />
            <div className="h-4 w-1/2 rounded bg-glass-100" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !normalizedGroup) {
    return (
      <div className="min-h-screen bg-glass-50">
        <div className="container mx-auto px-4 max-w-7xl py-12">
          <div className="bg-white border border-glass-200 rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-glass-900 mb-4">Tour Not Found</h1>
            <p className="text-glass-600 mb-6">
              {error || 'The requested tour could not be found.'}
            </p>
            <Link
              href={`/${locale}/catalog`}
              className="inline-block px-6 py-3 bg-ocean-600 text-white font-medium rounded-lg hover:bg-ocean-700 transition-colors"
            >
              Back to Catalog
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const { group, details, classificationName, eventIds } = normalizedGroup
  const title = group.name || details?.name || details?.Name || '—'
  const description = details?.desc || details?.description || ''
  const price = group.price ?? details?.price

  return (
    <div className="min-h-screen bg-glass-50">
      {/* Hero Section */}
      <div className="bg-white border-b border-glass-200">
        <div className="container mx-auto px-4 max-w-7xl py-6">
          {/* Breadcrumb */}
          <nav className="text-sm text-glass-600 mb-4">
            <Link href={`/${locale}/catalog`} className="hover:text-ocean-600">
              Catalog
            </Link>
            <span className="mx-2">/</span>
            <span>{classificationName}</span>
            <span className="mx-2">/</span>
            <span className="text-glass-900">{title}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Image + Content */}
            <div className="lg:col-span-2">
              <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-gradient-to-br from-ocean-100 to-ocean-200 mb-6">
                {resolvedImage ? (
                  <ClientImage src={resolvedImage} alt={title} className="!aspect-auto !h-full" fullHeight />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-ocean-300 text-lg font-medium">No image available</div>
                  </div>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-glass-900 mb-4">{title}</h1>

              {/* Tabs */}
              <div className="border-b border-glass-200 mb-6">
                <div className="flex gap-4 overflow-x-auto">
                  {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'description', label: 'Description' },
                    { id: 'details', label: 'Details' },
                    { id: 'prices', label: 'Prices' },
                    { id: 'reviews', label: 'Reviews' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as typeof activeTab)}
                      className={`px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'border-ocean-600 text-ocean-600 font-medium'
                          : 'border-transparent text-glass-600 hover:text-glass-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="prose max-w-none">
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    {description && (
                      <div>
                        <h2 className="text-xl font-semibold text-glass-900 mb-2">What you do</h2>
                        <p className="text-glass-700 whitespace-pre-wrap">{description}</p>
                      </div>
                    )}
                    {eventIds.length > 0 && (
                      <div>
                        <h2 className="text-xl font-semibold text-glass-900 mb-2">Available Options</h2>
                        <div className="flex flex-wrap gap-2">
                          {eventIds.map((eventId) => {
                            const ev = data?.eventDetailsByEventId?.[eventId]
                            const label = ev?.name || ev?.title || eventId
                            return (
                              <span
                                key={eventId}
                                className="px-3 py-1 rounded-full bg-ocean-50 border border-ocean-200 text-sm text-ocean-900"
                              >
                                {label}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'description' && (
                  <div>
                    {description ? (
                      <div className="text-glass-700 whitespace-pre-wrap">{description}</div>
                    ) : (
                      <p className="text-glass-500">No description available.</p>
                    )}
                  </div>
                )}

                {activeTab === 'details' && (
                  <div className="space-y-4">
                    {group.duration && (
                      <div>
                        <strong className="text-glass-900">Duration:</strong>{' '}
                        <span className="text-glass-700">{String(group.duration)}</span>
                      </div>
                    )}
                    {eventIds.length > 0 && (
                      <div>
                        <strong className="text-glass-900">Event Options:</strong>{' '}
                        <span className="text-glass-700">{eventIds.length} available</span>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'prices' && (
                  <div>
                    {price ? (
                      <div className="text-2xl font-bold text-ocean-600">{formatPrice(price)}</div>
                    ) : (
                      <p className="text-glass-500">Price on request</p>
                    )}
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div className="text-center py-12">
                    <p className="text-glass-500">Reviews coming soon</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Booking Sidebar */}
            <div className="lg:col-span-1">
              <BookingWidget
                options={normalizedGroup.options}
                groupKey={groupKey}
                groupDetails={details}
                lang={lang}
                locale={locale}
                activityName={title}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

