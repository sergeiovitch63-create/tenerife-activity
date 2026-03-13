'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { mapLocaleToLang } from '@/lib/atlantico/locale'

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

function getClassificationIdString(cls: Classification | null): string | null {
  if (!cls || cls.id === undefined || cls.id === null) return null
  const v = String(cls.id).trim()
  return v ? v : null
}

function getGroupKey(group: Group | null): string | null {
  if (!group) return null
  const v = String(group.id ?? group.Code ?? group.code ?? '').trim()
  return v ? v : null
}

function extractEventIdsFromString(
  idsValue: string | number | string[] | number[] | undefined
): string[] {
  const out: string[] = []
  if (idsValue === undefined || idsValue === null) return out

  if (Array.isArray(idsValue)) {
    for (const v of idsValue) {
      const s = String(v).trim()
      if (s && !out.includes(s)) out.push(s)
    }
    return out
  }

  const idsStr = String(idsValue).trim()
  if (!idsStr) return out

  // Handles ",184,546" and "184,546"
  const parts = idsStr.split(',').map((s) => s.trim()).filter(Boolean)
  for (const p of parts) {
    if (!out.includes(p)) out.push(p)
  }
  return out
}

function resolveGroupDetails(
  group: Group | null,
  map: Record<string, GroupDetails> | null
): GroupDetails | null {
  if (!group || !map) return null

  const candidates = [
    group.id !== undefined ? String(group.id) : null,
    group.Code ? String(group.Code) : null,
    group.code ? String(group.code) : null,
  ].filter((v): v is string => !!v)

  for (const k of candidates) {
    const d = map[k]
    if (d) return d
  }

  return null
}

export default function CatalogTreePage() {
  const t = useTranslations('catalogPage')
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const lang = mapLocaleToLang(locale)

  const [data, setData] = useState<BackofficePayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedClassifications, setExpandedClassifications] = useState<Set<string>>(new Set())
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const groupDetailsMap = useMemo(() => {
    if (!data) return null
    return data.groupDetailsByKey || data.groupDetailsByGroupId || null
  }, [data])

  const classifications = data?.classifications || []

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
      
      // Merge with existing data (preserve classifications/groups, update groupDetails)
      setData((prev) => {
        if (!prev) return json
        return {
          ...json,
          // Keep existing classifications/groups if new data doesn't have them
          classifications: json.classifications.length > 0 ? json.classifications : prev.classifications,
          groupsByClassification: Object.keys(json.groupsByClassification).length > 0 
            ? { ...prev.groupsByClassification, ...json.groupsByClassification }
            : prev.groupsByClassification,
          // Merge groupDetails
          groupDetailsByKey: {
            ...prev.groupDetailsByKey,
            ...json.groupDetailsByKey,
          },
          groupDetailsByGroupId: {
            ...prev.groupDetailsByGroupId,
            ...json.groupDetailsByGroupId,
          },
          // Merge eventDetails
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

  // When classification expands: prefetch groupDetails/events for that classification
  useEffect(() => {
    for (const clsId of expandedClassifications) {
      if (!data?.groupDetailsByKey?.[clsId] && !data?.groupDetailsByGroupId?.[clsId]) {
        // Check if we already have groupDetails for any group in this classification
        const groups = data?.groupsByClassification[clsId] || []
        const hasDetails = groups.some((g) => {
          const key = getGroupKey(g)
          return key && (data?.groupDetailsByKey?.[key] || data?.groupDetailsByGroupId?.[key])
        })
        
        if (!hasDetails) {
          fetchBackoffice(clsId).catch(() => {})
          break // Only fetch one at a time
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedClassifications, lang])

  const toggleClassification = (clsId: string) => {
    setExpandedClassifications((prev) => {
      const next = new Set(prev)
      if (next.has(clsId)) {
        next.delete(clsId)
      } else {
        next.add(clsId)
      }
      return next
    })
  }

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }

  return (
    <div className="min-h-screen bg-glass-50 py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-glass-900">Catalog Tree</h1>
          <p className="text-glass-600 mt-1">
            Data source: <span className="font-medium">Atlántico</span> via <code className="px-1 py-0.5 bg-glass-100 rounded">/api/atlantico/backoffice</code>
          </p>
          {data?.totals && (
            <p className="text-xs text-glass-500 mt-2">
              Totals: classifications={data.totals.classifications}, groups={data.totals.groups}, events={data.totals.events}
            </p>
          )}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">
                <strong>{t('errorLabel')}</strong> {error}
              </p>
            </div>
          )}
        </div>

        {loading && !data ? (
          <div className="text-center py-12">
            <p className="text-glass-600">{t('loadingCatalog')}</p>
          </div>
        ) : classifications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-glass-500 text-lg">{t('noClassificationsAvailable')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {classifications.map((c) => {
              const clsId = getClassificationIdString(c)
              if (!clsId) return null

              const groups = data?.groupsByClassification[clsId] || []
              const isExpanded = expandedClassifications.has(clsId)

              return (
                <div key={clsId} className="bg-white border border-glass-200 rounded-lg shadow-sm overflow-hidden">
                  {/* Classification Header */}
                  <button
                    onClick={() => toggleClassification(clsId)}
                    className="w-full text-left p-4 md:p-6 hover:bg-glass-50 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold text-glass-900">{c.name || '—'}</h2>
                      <div className="mt-1 text-sm text-glass-600">
                        {groups.length} {groups.length === 1 ? 'group' : 'groups'}
                      </div>
                    </div>
                    <div className="text-glass-400">
                      {isExpanded ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>
                  </button>

                  {/* Groups List */}
                  {isExpanded && (
                    <div className="border-t border-glass-200">
                      {groups.length === 0 ? (
                        <div className="p-4 text-center text-glass-500 text-sm">No groups for this classification.</div>
                      ) : (
                        <div className="divide-y divide-glass-100">
                          {groups.map((g) => {
                            const groupKey = getGroupKey(g)
                            if (!groupKey) return null

                            const details = resolveGroupDetails(g, groupDetailsMap)
                            const isGroupExpanded = expandedGroups.has(groupKey)

                            // Extract event IDs
                            const eventIdsFromGroup = extractEventIdsFromString(g.ids)
                            const eventIdsFromDetails = extractEventIdsFromString(details?.ids)
                            const eventIds: string[] = []
                            for (const id of eventIdsFromGroup) if (!eventIds.includes(id)) eventIds.push(id)
                            for (const id of eventIdsFromDetails) if (!eventIds.includes(id)) eventIds.push(id)

                            return (
                              <div key={groupKey} className="bg-glass-50">
                                {/* Group Header */}
                                <button
                                  onClick={() => toggleGroup(groupKey)}
                                  className="w-full text-left p-4 md:p-5 hover:bg-glass-100 transition-colors flex items-center justify-between"
                                >
                                  <div className="flex-1">
                                    <h3 className="text-lg md:text-xl font-semibold text-glass-900">{g.name || '—'}</h3>
                                    <div className="mt-1 flex items-center gap-4 text-sm text-glass-600">
                                      {g.price !== undefined && (
                                        <span>
                                          <span className="font-medium">From:</span> {String(g.price)}
                                        </span>
                                      )}
                                      {eventIds.length > 0 && (
                                        <span>{eventIds.length} {eventIds.length === 1 ? 'event' : 'events'}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-glass-400 ml-4">
                                    {isGroupExpanded ? (
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                      </svg>
                                    ) : (
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    )}
                                  </div>
                                </button>

                                {/* Group Details */}
                                {isGroupExpanded && (
                                  <div className="border-t border-glass-200 bg-white p-4 md:p-6 space-y-4">
                                    {details ? (
                                      <>
                                        <div>
                                          <div className="text-sm font-semibold text-glass-700 mb-1">Name</div>
                                          <div className="text-base text-glass-900">
                                            {details.name || details.Name || g.name || '—'}
                                          </div>
                                        </div>

                                        {(details.desc || details.description) && (
                                          <div>
                                            <div className="text-sm font-semibold text-glass-700 mb-1">Description</div>
                                            <div className="text-sm text-glass-600 whitespace-pre-wrap">
                                              {details.desc || details.description}
                                            </div>
                                          </div>
                                        )}

                                        {eventIds.length > 0 && (
                                          <div>
                                            <div className="text-sm font-semibold text-glass-700 mb-2">Event IDs</div>
                                            <div className="flex flex-wrap gap-2">
                                              {eventIds.map((eventId) => {
                                                const ev = data?.eventDetailsByEventId?.[eventId]
                                                const label = ev?.name || ev?.title || eventId
                                                return (
                                                  <span
                                                    key={eventId}
                                                    className="inline-flex items-center px-2 py-1 rounded bg-ocean-50 border border-ocean-200 text-xs text-ocean-900 font-mono"
                                                    title={label !== eventId ? label : undefined}
                                                  >
                                                    {eventId}
                                                  </span>
                                                )
                                              })}
                                            </div>
                                          </div>
                                        )}

                                        <div className="pt-2">
                                          <Link
                                            href={`/${locale}/activity/${encodeURIComponent(groupKey)}`}
                                            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-ocean-600 text-white text-sm font-medium hover:bg-ocean-700 transition-colors"
                                          >
                                            Open Activity Page
                                          </Link>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="text-sm text-glass-500">
                                        No details available for this group.
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
















