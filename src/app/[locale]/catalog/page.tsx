'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { mapLocaleToLang } from '@/lib/atlantico/locale'
import { CategorySidebar } from '@/components/catalog/CategorySidebar'
import { GroupCard } from '@/components/catalog/GroupCard'
import { normalizeGroups, type NormalizedGroup } from '@/lib/catalog/normalize'

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

type SortOption = 'price-asc' | 'price-desc' | 'duration-asc' | 'duration-desc' | 'name-asc'

export default function CatalogPage() {
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const lang = mapLocaleToLang(locale)

  const [data, setData] = useState<BackofficePayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedClassificationId, setSelectedClassificationId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('name-asc')
  const [onlyWithAvailability, setOnlyWithAvailability] = useState(false)
  const [visibility, setVisibility] = useState<{ hiddenGroupIds: string[]; hiddenEventIds: string[] }>({
    hiddenGroupIds: [],
    hiddenEventIds: [],
  })

  useEffect(() => {
    fetch('/api/backoffice/visibility')
      .then((r) => r.ok ? r.json() : null)
      .then((v) => v && setVisibility({ hiddenGroupIds: v.hiddenGroupIds || [], hiddenEventIds: v.hiddenEventIds || [] }))
      .catch(() => {})
  }, [])

  const groupDetailsMap = useMemo(() => {
    if (!data) return null
    return data.groupDetailsByKey || data.groupDetailsByGroupId || null
  }, [data])

  const classifications = data?.classifications || []

  // Normalize groups for display
  const normalizedGroups = useMemo(() => {
    if (!data) return []
    let groups = normalizeGroups(
      classifications,
      data.groupsByClassification,
      groupDetailsMap,
      selectedClassificationId,
      data.eventDetailsByEventId
    )
    // Apply backoffice visibility
    groups = groups.filter((ng) => !visibility.hiddenGroupIds.includes(ng.key))
    groups = groups.map((ng) => ({
      ...ng,
      options: ng.options.filter((opt) => !visibility.hiddenEventIds.includes(opt.id)),
    }))
    return groups
  }, [data, classifications, groupDetailsMap, selectedClassificationId, visibility])

  // Filter and sort groups
  const filteredAndSortedGroups = useMemo(() => {
    let filtered = normalizedGroups

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((ng) => {
        const name = ng.group.name || ng.details?.name || ng.details?.Name || ''
        const desc = ng.details?.desc || ng.details?.description || ''
        return (
          name.toLowerCase().includes(query) ||
          desc.toLowerCase().includes(query) ||
          ng.classificationName.toLowerCase().includes(query)
        )
      })
    }

    // Availability filter
    if (onlyWithAvailability) {
      filtered = filtered.filter((ng) => ng.eventIds.length > 0)
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'price-asc': {
          const priceA = typeof a.group.price === 'number' ? a.group.price : typeof a.group.price === 'string' ? parseFloat(a.group.price) : 0
          const priceB = typeof b.group.price === 'number' ? b.group.price : typeof b.group.price === 'string' ? parseFloat(b.group.price) : 0
          return priceA - priceB
        }
        case 'price-desc': {
          const priceA = typeof a.group.price === 'number' ? a.group.price : typeof a.group.price === 'string' ? parseFloat(a.group.price) : 0
          const priceB = typeof b.group.price === 'number' ? b.group.price : typeof b.group.price === 'string' ? parseFloat(b.group.price) : 0
          return priceB - priceA
        }
        case 'duration-asc': {
          const durA = typeof a.group.duration === 'number' ? a.group.duration : typeof a.group.duration === 'string' ? parseFloat(a.group.duration) : 0
          const durB = typeof b.group.duration === 'number' ? b.group.duration : typeof b.group.duration === 'string' ? parseFloat(b.group.duration) : 0
          return durA - durB
        }
        case 'duration-desc': {
          const durA = typeof a.group.duration === 'number' ? a.group.duration : typeof a.group.duration === 'string' ? parseFloat(a.group.duration) : 0
          const durB = typeof b.group.duration === 'number' ? b.group.duration : typeof b.group.duration === 'string' ? parseFloat(b.group.duration) : 0
          return durB - durA
        }
        case 'name-asc':
        default: {
          const nameA = (a.group.name || a.details?.name || a.details?.Name || '').toLowerCase()
          const nameB = (b.group.name || b.details?.name || b.details?.Name || '').toLowerCase()
          return nameA.localeCompare(nameB)
        }
      }
    })

    return sorted
  }, [normalizedGroups, searchQuery, sortBy, onlyWithAvailability])

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
      
      // Merge with existing data
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

  // Initial load: classifications + groups
  useEffect(() => {
    fetchBackoffice().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  // When classification changes: prefetch groupDetails/events for that classification
  useEffect(() => {
    if (!selectedClassificationId) return
    
    // Check if we already have groupDetails for any group in this classification
    const groups = data?.groupsByClassification[selectedClassificationId] || []
    const hasDetails = groups.some((g) => {
      const key = String(g.id ?? g.Code ?? g.code ?? '')
      return key && (data?.groupDetailsByKey?.[key] || data?.groupDetailsByGroupId?.[key])
    })
    
    if (!hasDetails) {
      fetchBackoffice(selectedClassificationId).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassificationId, lang])

  const handleClassificationSelect = useCallback((classificationId: string | null) => {
    setSelectedClassificationId(classificationId)
  }, [])

  return (
    <div className="min-h-screen bg-glass-50">
      {/* Header */}
      <div className="bg-white border-b border-glass-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 max-w-7xl py-4">
          <h1 className="text-2xl md:text-3xl font-bold text-glass-900 mb-4">Tours & Activities</h1>
          
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search tours..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-glass-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-4 py-2 border border-glass-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
              >
                <option value="name-asc">Sort by Name</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="duration-asc">Duration: Short to Long</option>
                <option value="duration-desc">Duration: Long to Short</option>
              </select>
              <label className="flex items-center gap-2 px-4 py-2 border border-glass-300 rounded-lg cursor-pointer hover:bg-glass-50">
                <input
                  type="checkbox"
                  checked={onlyWithAvailability}
                  onChange={(e) => setOnlyWithAvailability(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-glass-700">Only with availability</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-7xl py-6 md:py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar: Categories */}
          <div className="lg:col-span-1">
            {loading && !data ? (
              <div className="bg-white border border-glass-200 rounded-lg p-6 shadow-sm">
                <div className="animate-pulse space-y-3">
                  <div className="h-6 w-2/3 rounded bg-glass-200" />
                  <div className="h-4 w-full rounded bg-glass-100" />
                  <div className="h-4 w-full rounded bg-glass-100" />
                </div>
              </div>
            ) : (
              <CategorySidebar
                classifications={classifications}
                selectedClassificationId={selectedClassificationId}
                groupsByClassification={data?.groupsByClassification || {}}
                onSelect={handleClassificationSelect}
              />
            )}
          </div>

          {/* Right: Groups Grid */}
          <div className="lg:col-span-3">
            {loading && !data ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white border border-glass-200 rounded-lg overflow-hidden animate-pulse">
                    <div className="w-full aspect-[4/3] bg-glass-200" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 w-3/4 rounded bg-glass-200" />
                      <div className="h-3 w-1/2 rounded bg-glass-100" />
                      <div className="h-8 w-full rounded bg-glass-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredAndSortedGroups.length === 0 ? (
              <div className="text-center py-12 bg-white border border-glass-200 rounded-lg">
                <p className="text-glass-500 text-lg">No tours found.</p>
                {searchQuery && (
                  <p className="text-sm text-glass-400 mt-2">Try adjusting your search or filters.</p>
                )}
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-glass-600">
                  Showing {filteredAndSortedGroups.length} {filteredAndSortedGroups.length === 1 ? 'tour' : 'tours'}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredAndSortedGroups.map((ng) => (
                    <GroupCard
                      key={ng.key}
                      group={ng.group}
                      details={ng.details}
                      groupKey={ng.key}
                      locale={locale}
                      eventIdsCount={ng.eventIds.length}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
