/**
 * Atlántico Backoffice API Page
 * 
 * Displays complete API data structure:
 * Classification → Groups → GroupDetails → EventDetails
 * 
 * NO INVENT: 100% API data, no hardcoded content
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { mapLocaleToLang } from '@/lib/atlantico/locale'

interface BackofficeData {
  ok: boolean
  lang: string
  collaborator: string
  office: string
  classifications: Array<{ code: string; name?: string; id?: string | number; [key: string]: unknown }>
  groupsByClassification: Record<
    string,
    Array<{ Code?: string; code?: string; id?: string | number; ids?: string | number | string[] | number[]; name?: string; [key: string]: unknown }>
  >
  groupDetailsByGroupId: Record<string, { Code?: string; code?: string; ids?: string[] | number[] | string; name?: string; Name?: string; [key: string]: unknown }>
  groupDetailsByKey?: Record<string, { Code?: string; code?: string; ids?: string[] | number[] | string; name?: string; Name?: string; [key: string]: unknown }>
  eventDetailsByEventId: Record<string, { Code: string; [key: string]: unknown }>
  timings: { classifications: number; groups: number; groupDetails: number; events: number }
  totals: { classifications: number; groups: number; events: number; failures: number }
  error?: string
}

export default function BackofficePage() {
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const defaultLang = mapLocaleToLang(locale) // Uses existing module mapping

  const [currentLang, setCurrentLang] = useState(defaultLang)
  const [data, setData] = useState<BackofficeData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedClassification, setSelectedClassification] = useState<string | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [showRawJson, setShowRawJson] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [calendarData, setCalendarData] = useState<unknown>(null)
  const [priceDate, setPriceDate] = useState(() => {
    const now = new Date()
    return now.toISOString().substring(0, 10)
  })
  const [priceData, setPriceData] = useState<unknown>(null)
  const [loadingCalendar, setLoadingCalendar] = useState(false)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [visibility, setVisibility] = useState<{ hiddenGroupIds: string[]; hiddenEventIds: string[] }>({
    hiddenGroupIds: [],
    hiddenEventIds: [],
  })

  // Fetch visibility config
  const fetchVisibility = async () => {
    try {
      const res = await fetch('/api/backoffice/visibility')
      if (res.ok) {
        const data = await res.json()
        setVisibility({ hiddenGroupIds: data.hiddenGroupIds || [], hiddenEventIds: data.hiddenEventIds || [] })
      }
    } catch {
      // Ignore
    }
  }

  const toggleGroupVisibility = async (groupId: string) => {
    const id = String(groupId).trim()
    const next = visibility.hiddenGroupIds.includes(id)
      ? visibility.hiddenGroupIds.filter((x) => x !== id)
      : [...visibility.hiddenGroupIds, id]
    setVisibility((v) => ({ ...v, hiddenGroupIds: next }))
    await fetch('/api/backoffice/visibility', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hiddenGroupIds: next }),
    })
  }

  const toggleEventVisibility = async (eventId: string) => {
    const id = String(eventId).trim()
    const next = visibility.hiddenEventIds.includes(id)
      ? visibility.hiddenEventIds.filter((x) => x !== id)
      : [...visibility.hiddenEventIds, id]
    setVisibility((v) => ({ ...v, hiddenEventIds: next }))
    await fetch('/api/backoffice/visibility', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hiddenEventIds: next }),
    })
  }

  // Get lang from URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlLang = new URLSearchParams(window.location.search).get('lang')
      if (urlLang) {
        setCurrentLang(urlLang)
      }
    }
  }, [])

  const fetchData = async (fresh = false, classificationId?: string) => {
    setLoading(true)
    setError(null)

    try {
      const url = `/api/atlantico/backoffice?lang=${currentLang}${fresh ? '&fresh=1' : ''}${classificationId ? `&classificationId=${encodeURIComponent(classificationId)}` : ''}`
      const response = await fetch(url)

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText.substring(0, 200)}` : ''}`)
      }

      const result = await response.json()
      setData(result)

      // DEV: Log structure for debugging
      if (process.env.NODE_ENV !== 'production') {
        console.log('[BACKOFFICE_UI] Data received:', {
          resultKeys: Object.keys(result),
          firstClassification: result.classifications?.[0] || null,
          firstGroupsByClassificationKey: Object.keys(result.groupsByClassification || {})[0] || null,
          firstGroupsByClassificationLength: Object.keys(result.groupsByClassification || {}).length > 0
            ? result.groupsByClassification[Object.keys(result.groupsByClassification)[0]]?.length || 0
            : 0,
          firstGroupDetailsKey: Object.keys(result.groupDetailsByGroupId || {})[0] || null,
          firstGroupDetailsSample: Object.keys(result.groupDetailsByGroupId || {}).length > 0
            ? result.groupDetailsByGroupId[Object.keys(result.groupDetailsByGroupId)[0]]
            : null,
        })
      }

      // Auto-select first classification if available
      if (result.ok && result.classifications && result.classifications.length > 0 && !selectedClassification) {
        setSelectedClassification(result.classifications[0].code)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      console.error('[Backoffice] Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [currentLang])

  useEffect(() => {
    fetchVisibility()
  }, [])

  const fetchCalendar = async () => {
    if (!selectedEvent) return

    setLoadingCalendar(true)
    try {
      const response = await fetch(`/api/atlantico/calendar?eventId=${selectedEvent}&lang=${currentLang}&month=${calendarMonth}`)
      const result = await response.json()
      setCalendarData(result)
    } catch (err) {
      console.error('[Backoffice] Calendar error:', err)
    } finally {
      setLoadingCalendar(false)
    }
  }

  const fetchPrice = async () => {
    if (!selectedEvent) return

    setLoadingPrice(true)
    try {
      const office = data?.office || ''
      const url = `/api/atlantico/prices/${selectedEvent}?date=${priceDate}${office ? `&office=${office}` : ''}`
      const response = await fetch(url)
      const result = await response.json()
      setPriceData(result)
    } catch (err) {
      console.error('[Backoffice] Price error:', err)
    } finally {
      setLoadingPrice(false)
    }
  }

  const toggleRawJson = (key: string) => {
    setShowRawJson((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Filter by search query
  const filteredClassifications = data?.classifications.filter((c) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      c.code?.toLowerCase().includes(query) ||
      c.name?.toLowerCase().includes(query) ||
      String(c.id || '').toLowerCase().includes(query)
    )
  }) || []

  // Resolve groups by classification ID (PDF: use classification.id, not code)
  const selectedClassificationObj = selectedClassification
    ? data?.classifications.find(c => c.code === selectedClassification) || null
    : null

  const selectedClassificationId = selectedClassificationObj?.id !== undefined
    ? String(selectedClassificationObj.id)
    : null

  const selectedGroups = selectedClassificationId && data?.groupsByClassification
    ? data.groupsByClassification[selectedClassificationId] || []
    : []

  // DEV: Log resolver for groups
  if (process.env.NODE_ENV !== 'production' && selectedClassification) {
    console.log('[BACKOFFICE_UI] Groups resolver:', {
      selectedClassification,
      selectedClassificationId,
      classificationId: selectedClassificationObj?.id,
      classificationCode: selectedClassificationObj?.code,
      groupsByClassificationKeys: data ? Object.keys(data.groupsByClassification).slice(0, 10) : [],
      foundGroups: selectedGroups.length,
    })
  }

  const filteredGroups = selectedGroups.filter((g) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      g.Code?.toLowerCase().includes(query) ||
      g.name?.toLowerCase().includes(query) ||
      String(g.id || '').toLowerCase().includes(query)
    )
  })

  const groupDetailsMap = data?.groupDetailsByKey || data?.groupDetailsByGroupId

  // Resolve groupDetails by trying multiple keys in order
  type ResolvedGroupDetails = {
    details: (typeof groupDetailsMap extends Record<string, infer V> ? V : unknown) | null
    triedKeys: string[]
  }

  const resolveGroupDetails = (group: unknown, selectedGroupStr?: string | null): ResolvedGroupDetails => {
    if (!groupDetailsMap || typeof groupDetailsMap !== 'object') {
      return { details: null, triedKeys: [] }
    }

    const groupObj = group && typeof group === 'object' ? (group as { id?: unknown; Id?: unknown; Code?: unknown; code?: unknown }) : null
    const triedKeys: string[] = []
    const keysToTry: string[] = []

    if (selectedGroupStr && selectedGroupStr.trim()) {
      keysToTry.push(String(selectedGroupStr).trim())
    }
    if (groupObj) {
      if (groupObj.id !== undefined && groupObj.id !== null) keysToTry.push(String(groupObj.id))
      if (groupObj.Id !== undefined && groupObj.Id !== null) keysToTry.push(String(groupObj.Id))
      if (groupObj.Code) keysToTry.push(String(groupObj.Code))
      if (groupObj.code) keysToTry.push(String(groupObj.code))
    }

    for (const key of keysToTry) {
      const k = String(key).trim()
      if (k && !triedKeys.includes(k)) {
        triedKeys.push(k)
        if (groupDetailsMap[k]) {
          return { details: groupDetailsMap[k], triedKeys }
        }
      }
    }

    // Fallback: check if any groupDetails has Code matching our keys
    const matchKeys = [...keysToTry, ...triedKeys].map((k) => String(k).trim()).filter(Boolean)
    for (const [key, details] of Object.entries(groupDetailsMap)) {
      if (details && typeof details === 'object' && 'Code' in details) {
        const detailsCode = String((details as { Code?: unknown }).Code).trim()
        if (detailsCode && matchKeys.includes(detailsCode)) {
          if (!triedKeys.includes(key)) triedKeys.push(key)
          return { details: details, triedKeys }
        }
      }
    }

    return { details: null, triedKeys }
  }

  // Extract event IDs from group.ids (priority) + groupDetails.ids (fallback)
  const extractEventIdsFromString = (idsValue: string | number | string[] | number[] | undefined): string[] => {
    const eventIds: string[] = []
    
    if (idsValue === undefined || idsValue === null) {
      return eventIds
    }
    
    // If array, convert to string
    if (Array.isArray(idsValue)) {
      for (const id of idsValue) {
        const idStr = String(id).trim()
        if (idStr && !eventIds.includes(idStr)) {
          eventIds.push(idStr)
        }
      }
      return eventIds
    }
    
    // If string, parse format ",184,546" or "184,546" or "184"
    const idsStr = String(idsValue).trim()
    if (!idsStr) {
      return eventIds
    }
    
    // Split by comma and filter empty
    const parts = idsStr.split(',').map(s => s.trim()).filter(Boolean)
    for (const part of parts) {
      if (part && !eventIds.includes(part)) {
        eventIds.push(part)
      }
    }
    
    return eventIds
  }

  // Compute selectedGroupObj FIRST before any usage
  const selectedGroupObj = selectedGroup
    ? (selectedGroups.find((g) => {
        const candidate = String((g as { id?: unknown; Id?: unknown; Code?: unknown; code?: unknown }).id ?? (g as { Id?: unknown }).Id ?? (g as { Code?: unknown }).Code ?? (g as { code?: unknown }).code ?? '')
        return candidate === selectedGroup
      }) || null)
    : null

  // Now compute derived values AFTER selectedGroupObj is initialized
  const selectedGroupId = selectedGroupObj?.id !== undefined ? String(selectedGroupObj.id) : null
  const selectedGroupCode = selectedGroupObj?.Code || selectedGroupObj?.code || selectedGroupObj?.id
    ? String(selectedGroupObj.Code ?? selectedGroupObj.code ?? selectedGroupObj.id)
    : null

  const { details: selectedGroupDetails, triedKeys: groupDetailsTriedKeys } = resolveGroupDetails(selectedGroupObj, selectedGroup)
  const hasSelectedGroupDetails = !!selectedGroupDetails
  const selectedGroupDetailsTyped = selectedGroupDetails as
    | {
        name?: string
        Name?: string
        Code?: string
        code?: string
        id?: string | number
        category?: unknown
        price?: unknown
        image?: unknown
        desc?: unknown
        description?: unknown
        ids?: unknown
      }
    | null

  // Priority: extract from group.ids if present
  const eventIdsFromGroup = selectedGroupObj?.ids !== undefined
    ? extractEventIdsFromString(selectedGroupObj.ids)
    : []

  // Fallback: extract from groupDetails.ids
  const eventIdsFromGroupDetails = selectedGroupDetails && typeof selectedGroupDetails === 'object' && 'ids' in selectedGroupDetails
    ? extractEventIdsFromString(
        (selectedGroupDetails as { ids?: string | number | string[] | number[] | undefined }).ids
      )
    : []

  // Merge and dedupe
  const eventIds: string[] = []
  for (const id of eventIdsFromGroup) {
    if (!eventIds.includes(id)) {
      eventIds.push(id)
    }
  }
  for (const id of eventIdsFromGroupDetails) {
    if (!eventIds.includes(id)) {
      eventIds.push(id)
    }
  }
  const selectedEventDetails = selectedEvent ? data?.eventDetailsByEventId[selectedEvent] : null

  // DEV: Log resolver for group details
  if (process.env.NODE_ENV !== 'production' && selectedGroup) {
    console.log('[BACKOFFICE_UI] Group Details resolver:', {
      selectedGroup,
      selectedGroupId,
      selectedGroupCode,
      groupKeys: selectedGroupObj ? Object.keys(selectedGroupObj) : [],
      groupIds: selectedGroupObj?.ids,
      groupDetailsByGroupIdKeys: groupDetailsMap ? Object.keys(groupDetailsMap).slice(0, 10) : [],
      groupDetailsFound: !!selectedGroupDetails,
      groupDetailsIds: selectedGroupDetails && typeof selectedGroupDetails === 'object' && 'ids' in selectedGroupDetails ? (selectedGroupDetails as { ids?: unknown }).ids : undefined,
      eventIdsFromGroup: eventIdsFromGroup.length,
      eventIdsFromGroupDetails: eventIdsFromGroupDetails.length,
      eventIdsExtracted: eventIds.length,
    })
  }

  // Check env vars
  const missingEnvVars: string[] = []
  if (!process.env.NEXT_PUBLIC_ATLANTICO_BASE_URL && !data?.collaborator) {
    missingEnvVars.push('ATLANTICO_BASE_URL')
  }
  if (!data?.collaborator) {
    missingEnvVars.push('ATLANTICO_COLLABORATOR')
  }
  if (!data?.office) {
    missingEnvVars.push('ATLANTICO_OFFICE')
  }

  return (
    <div className="min-h-screen bg-glass-50 py-8">
      <div className="container mx-auto px-4 max-w-[1920px]">
        {/* Header */}
        <div className="mb-6 bg-white border border-glass-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h1 className="text-3xl font-bold text-glass-900">Atlántico Backoffice</h1>
              <p className="text-sm text-glass-600 mt-1">
                Cochez/décochez les groupes et événements pour les afficher ou masquer sur le frontend.
              </p>
            </div>
            <a
              href={`/${locale}/debug/classifications`}
              className="px-4 py-2 bg-ocean-600 text-white text-sm font-medium rounded-lg hover:bg-ocean-700"
            >
              Voir les tour lists →
            </a>
            <div className="flex items-center gap-4">
              <select
                value={currentLang}
                onChange={(e) => {
                  const newLang = e.target.value
                  setCurrentLang(newLang)
                  // Update URL with new lang parameter
                  const url = new URL(window.location.href)
                  url.searchParams.set('lang', newLang)
                  window.history.pushState({}, '', url.toString())
                }}
                className="px-4 py-2 border border-glass-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
              >
                <option value="ENG">English (ENG)</option>
                <option value="ESP">Español (ESP)</option>
                <option value="FRA">Français (FRA)</option>
                <option value="DEU">Deutsch (DEU)</option>
                <option value="ITA">Italiano (ITA)</option>
                <option value="RUS">Русский (RUS)</option>
                <option value="UKR">Українська (UKR)</option>
                <option value="POL">Polski (POL)</option>
              </select>
              <button
                onClick={() => fetchData(true)}
                disabled={loading}
                className="px-6 py-2 bg-ocean-600 text-white font-medium rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Syncing...' : 'Sync Now'}
              </button>
              {process.env.NODE_ENV !== 'production' && (
                <>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/atlantico/backoffice?lang=${currentLang}&fresh=1`)
                        const result = await response.json()
                        console.log('[BACKOFFICE_UI] Probe API result:', {
                          totals: result.totals,
                          firstClassification: result.classifications?.[0] ? {
                            id: result.classifications[0].id,
                            code: result.classifications[0].code,
                            name: result.classifications[0].name,
                          } : null,
                          firstGroupsByClassificationKey: Object.keys(result.groupsByClassification || {})[0] || null,
                          firstGroupsByClassificationLength: Object.keys(result.groupsByClassification || {}).length > 0
                            ? result.groupsByClassification[Object.keys(result.groupsByClassification)[0]]?.length || 0
                            : 0,
                          groupsByClassificationKeys: Object.keys(result.groupsByClassification || {}).slice(0, 10),
                        })
                        alert(`Probe API:\nTotals: ${JSON.stringify(result.totals)}\nFirst classification id: ${result.classifications?.[0]?.id}\nFirst groups key: ${Object.keys(result.groupsByClassification || {})[0] || 'none'}\nCheck console for full details.`)
                      } catch (err) {
                        console.error('[BACKOFFICE_UI] Probe API error:', err)
                        alert('Probe API failed. Check console.')
                      }
                    }}
                    className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Probe API (DEV)
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        setLoading(true)
                        const response = await fetch(`/api/atlantico/backoffice?lang=${currentLang}&fresh=1`)
                        const result = await response.json()
                        setData(result)
                        
                        // Auto-select first classification + first group
                        if (result.ok && result.classifications && result.classifications.length > 0) {
                          const firstClassification = result.classifications[0]
                          setSelectedClassification(firstClassification.code)
                          
                          const firstClassificationId = String(firstClassification.id)
                          const firstGroups = result.groupsByClassification[firstClassificationId] || []
                          
                          if (firstGroups.length > 0) {
                            const firstGroup = firstGroups[0]
                            setSelectedGroup(firstGroup.Code || firstGroup.code || String(firstGroup.id))
                            console.log('[BACKOFFICE_UI] Auto-selected:', {
                              classification: firstClassification.code,
                              group: firstGroup.Code || firstGroup.code || String(firstGroup.id),
                            })
                          }
                        }
                      } catch (err) {
                        console.error('[BACKOFFICE_UI] Fetch groupDetails error:', err)
                        setError(err instanceof Error ? err.message : 'Unknown error')
                      } finally {
                        setLoading(false)
                      }
                    }}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Fetch groupDetails only (DEV)
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by name/id/code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-glass-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
            />
          </div>

          {/* Debug Info */}
          {data && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-glass-600">Timings:</span>
                <div className="mt-1 space-y-1">
                  <div>Classifications: {data.timings.classifications}ms</div>
                  <div>Groups: {data.timings.groups}ms</div>
                  <div>GroupDetails: {data.timings.groupDetails}ms</div>
                  <div>Events: {data.timings.events}ms</div>
                </div>
              </div>
              <div>
                <span className="text-glass-600">Totals:</span>
                <div className="mt-1 space-y-1">
                  <div>Classifications: {data.totals.classifications}</div>
                  <div>Groups: {data.totals.groups}</div>
                  <div>Events: {data.totals.events}</div>
                  <div>Failures: {data.totals.failures}</div>
                </div>
              </div>
              <div>
                <span className="text-glass-600">Config:</span>
                <div className="mt-1 space-y-1">
                  <div>Lang: {data.lang}</div>
                  <div>Collaborator: {data.collaborator}</div>
                  <div>Office: {data.office}</div>
                </div>
              </div>
              <div>
                <span className="text-glass-600">Status:</span>
                <div className="mt-1">
                  {data.ok ? (
                    <span className="text-green-600 font-medium">OK</span>
                  ) : (
                    <span className="text-red-600 font-medium">Error</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Missing Env Vars Warning */}
          {missingEnvVars.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                <strong>Missing environment variables:</strong> {missingEnvVars.join(', ')}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">
                <strong>Error:</strong> {error}
              </p>
            </div>
          )}
        </div>

        {loading && !data && (
          <div className="text-center py-12">
            <p className="text-glass-600">Loading...</p>
          </div>
        )}

        {data && data.ok && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel: Classifications */}
            <div className="bg-white border border-glass-200 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-bold text-glass-900 mb-4">Classifications</h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredClassifications.map((classification) => (
                  <button
                    key={classification.code}
                    onClick={() => {
                      setSelectedClassification(classification.code)
                      setSelectedGroup(null)
                      setSelectedEvent(null)
                      // Prefetch groupDetails for this classification (cache is still 10 min server-side)
                      if (classification.id !== undefined) {
                        fetchData(false, String(classification.id)).catch(() => {})
                      }
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedClassification === classification.code
                        ? 'bg-ocean-50 border-ocean-600'
                        : 'bg-glass-50 border-glass-200 hover:border-ocean-300'
                    }`}
                  >
                    <div className="font-medium text-glass-900">{classification.name || '—'}</div>
                    <div className="text-sm text-glass-600">Code: {classification.code}</div>
                    {classification.id && (
                      <div className="text-xs text-glass-500">ID: {classification.id}</div>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={() => toggleRawJson('classifications')}
                className="mt-4 text-sm text-ocean-600 hover:text-ocean-700"
              >
                {showRawJson.classifications ? 'Hide' : 'Show'} Raw JSON
              </button>
              {showRawJson.classifications && (
                <pre className="mt-2 p-4 bg-glass-100 rounded text-xs overflow-auto max-h-96">
                  {JSON.stringify(data.classifications, null, 2)}
                </pre>
              )}
            </div>

            {/* Middle Panel: Groups */}
            <div className="bg-white border border-glass-200 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-bold text-glass-900 mb-4">
                Groups {selectedClassification && filteredGroups.length > 0 ? `(${filteredGroups.length})` : selectedClassification ? '(0)' : ''}
              </h2>
              {/* DEV: Debug line */}
              {process.env.NODE_ENV !== 'production' && selectedClassification && (
                <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                  <div>selectedClassificationId: {selectedClassificationId || 'null'}</div>
                  <div>keys available: {data ? Object.keys(data.groupsByClassification).slice(0, 10).join(', ') : 'none'}</div>
                  <div>groups.length: {selectedGroups.length}</div>
                </div>
              )}
              {!selectedClassification ? (
                <p className="text-glass-500 text-sm text-center py-8">Select a classification</p>
              ) : filteredGroups.length === 0 ? (
                <p className="text-glass-500 text-sm text-center py-8">No groups found for this classification</p>
              ) : (
                <>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {filteredGroups.map((group) => {
                      const g = group as { id?: unknown; Id?: unknown; Code?: unknown; code?: unknown }
                      const groupCode = String(g.Code ?? g.code ?? g.Id ?? g.id ?? '')
                      const isVisible = !visibility.hiddenGroupIds.includes(groupCode)
                      return (
                        <div
                          key={String(group.id ?? group.Code ?? group.code ?? '')}
                          className={`flex items-start gap-2 p-3 rounded-lg border transition-colors ${
                            selectedGroup === groupCode
                              ? 'bg-ocean-50 border-ocean-600'
                              : 'bg-glass-50 border-glass-200 hover:border-ocean-300'
                          }`}
                        >
                          <label className="flex-shrink-0 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isVisible}
                              onChange={() => toggleGroupVisibility(groupCode)}
                              className="rounded border-glass-300"
                            />
                            <span className="ml-1 text-xs text-glass-600">Front</span>
                          </label>
                          <button
                            onClick={() => {
                              setSelectedGroup(groupCode)
                              setSelectedEvent(null)
                            }}
                            className="flex-1 text-left"
                          >
                            <div className="font-medium text-glass-900">{group.name || '—'}</div>
                            <div className="text-sm text-glass-600">Code: {groupCode}</div>
                        {group.id !== undefined && (
                          <div className="text-xs text-glass-500">ID: {String(group.id)}</div>
                        )}
                        {group.price !== undefined && (
                          <div className="text-sm text-glass-600">Price: {String(group.price)}</div>
                        )}
                        {group.duration !== undefined && (
                          <div className="text-sm text-glass-600">Duration: {String(group.duration)}</div>
                        )}
                        {group.ids !== undefined && (
                          <div className="text-xs text-glass-500">Events: —</div>
                        )}
                          </button>
                          <a
                            href={`/${locale}/debug/group-details?code=${encodeURIComponent(groupCode)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 text-xs text-ocean-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Détails →
                          </a>
                        </div>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => toggleRawJson('groups')}
                    className="mt-4 text-sm text-ocean-600 hover:text-ocean-700"
                  >
                    {showRawJson.groups ? 'Hide' : 'Show'} Raw JSON
                  </button>
                  {showRawJson.groups && (
                    <pre className="mt-2 p-4 bg-glass-100 rounded text-xs overflow-auto max-h-96">
                      {JSON.stringify(selectedGroups, null, 2)}
                    </pre>
                  )}
                </>
              )}
            </div>

            {/* Right Panel: Group Details + Events */}
            <div className="bg-white border border-glass-200 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-bold text-glass-900 mb-4">Group Details</h2>
              {!selectedGroup ? (
                <p className="text-glass-500 text-sm">Select a group</p>
              ) : (
                <div className="space-y-6">
                  {/* Warning if groupDetails missing */}
                  {!hasSelectedGroupDetails && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                      <p className="text-red-800 text-sm font-semibold mb-2">Group details missing</p>
                      <p className="text-red-700 text-xs mb-2">Tried keys: {groupDetailsTriedKeys.length > 0 ? groupDetailsTriedKeys.join(', ') : 'none'}</p>
                      <p className="text-red-700 text-xs mb-2">Available keys in groupDetailsByGroupId: {data ? Object.keys(data.groupDetailsByGroupId).slice(0, 10).join(', ') : 'none'}</p>
                      {selectedGroupObj && (
                        <details className="mt-2">
                          <summary className="text-red-700 text-xs cursor-pointer">Show group object (raw)</summary>
                          <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto max-h-48">
                            {JSON.stringify(selectedGroupObj, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}

                  {/* Group Details Card */}
                  {hasSelectedGroupDetails && selectedGroupDetailsTyped && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-glass-900 mb-3">Group Details</h3>
                      <div className="bg-glass-50 border border-glass-200 rounded-lg p-4 space-y-2 text-sm">
                        <div><strong>Name:</strong> {selectedGroupDetailsTyped.name || selectedGroupDetailsTyped.Name || '—'}</div>
                        <div><strong>Code:</strong> {selectedGroupDetailsTyped.Code || selectedGroupDetailsTyped.code || '—'}</div>
                        {selectedGroupDetailsTyped.id !== undefined && (
                          <div><strong>Id:</strong> {String(selectedGroupDetailsTyped.id)}</div>
                        )}
                        {selectedGroupDetailsTyped.category !== undefined && (
                          <div><strong>Category:</strong> {String(selectedGroupDetailsTyped.category)}</div>
                        )}
                        {selectedGroupDetailsTyped.price !== undefined && (
                          <div><strong>Price:</strong> {String(selectedGroupDetailsTyped.price)}</div>
                        )}
                        {Boolean(selectedGroupDetailsTyped.image) && (
                          <div><strong>Image:</strong> {String(selectedGroupDetailsTyped.image)}</div>
                        )}
                        {Boolean(selectedGroupDetailsTyped.desc) && (
                          <div>
                            <strong>Description:</strong>
                            <div className="mt-1 text-glass-600 whitespace-pre-wrap">{String(selectedGroupDetailsTyped.desc)}</div>
                          </div>
                        )}
                        {Boolean(selectedGroupDetailsTyped.description) && (
                          <div>
                            <strong>Description (alt):</strong>
                            <div className="mt-1 text-glass-600 whitespace-pre-wrap">{String(selectedGroupDetailsTyped.description)}</div>
                          </div>
                        )}
                        <div className="pt-2 border-t border-glass-300">
                          <strong>Event IDs (extracted):</strong> {eventIds.length}
                          {process.env.NODE_ENV !== 'production' && eventIds.length > 0 && (
                            <div className="text-xs text-glass-500 mt-1">Sample IDs: {eventIds.slice(0, 5).join(', ')}</div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleRawJson('groupDetails')}
                        className="mt-2 text-sm text-ocean-600 hover:text-ocean-700"
                      >
                        {showRawJson.groupDetails ? 'Hide' : 'Show'} Raw JSON
                      </button>
                      {showRawJson.groupDetails && selectedGroupDetails && (
                        <pre className="mt-2 p-4 bg-glass-100 rounded text-xs overflow-auto max-h-96">
                          {JSON.stringify(selectedGroupDetails, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}

                  {/* Events List */}
                  <div>
                    <h3 className="font-semibold text-glass-900 mb-2">Events ({eventIds.length})</h3>
                    {eventIds.length === 0 ? (
                      <p className="text-glass-500 text-sm">No events for this group</p>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {eventIds.map((eventId) => {
                          const eventIdStr = String(eventId)
                          const event = data.eventDetailsByEventId[eventIdStr]
                          const isEventVisible = !visibility.hiddenEventIds.includes(eventIdStr)
                          return (
                            <div
                              key={eventIdStr}
                              className={`p-2 rounded border transition-colors ${
                                selectedEvent === eventIdStr
                                  ? 'bg-ocean-50 border-ocean-600'
                                  : 'bg-glass-50 border-glass-200'
                              }`}
                            >
                              <div className="flex items-start gap-2 mb-2">
                                <label className="flex-shrink-0 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isEventVisible}
                                    onChange={() => toggleEventVisibility(eventIdStr)}
                                    className="rounded border-glass-300"
                                  />
                                  <span className="ml-1 text-xs text-glass-600">Front</span>
                                </label>
                                <button
                                  onClick={() => setSelectedEvent(eventIdStr)}
                                  className="flex-1 text-left"
                                >
                                <div className="text-sm font-medium text-glass-900">
                                  {String((event as { name?: unknown; title?: unknown } | null)?.name ?? (event as { title?: unknown } | null)?.title ?? eventIdStr)}
                                </div>
                                <div className="text-xs text-glass-600">
                                  Code: {String((event as { Code?: unknown } | null)?.Code ?? eventIdStr)}
                                </div>
                                </button>
                                <a
                                  href={`/${locale}/debug/event-details?eventId=${encodeURIComponent(eventIdStr)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-shrink-0 text-xs text-ocean-600 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Détails →
                                </a>
                              </div>
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={async () => {
                                    setSelectedEvent(eventIdStr)
                                    setLoadingCalendar(true)
                                    try {
                                      // Calendar endpoint disabled - returns empty response
                                      const response = await fetch(`/api/atlantico/calendar?eventId=${eventIdStr}&lang=${currentLang}&month=${calendarMonth}`)
                                      const result = await response.json()
                                      setCalendarData(result)
                                    } catch (err) {
                                      console.error('[Backoffice] Calendar error:', err)
                                    } finally {
                                      setLoadingCalendar(false)
                                    }
                                  }}
                                  disabled={loadingCalendar}
                                  className="flex-1 px-2 py-1 bg-ocean-600 text-white text-xs rounded hover:bg-ocean-700 disabled:opacity-50"
                                >
                                  Open Calendar (Disabled)
                                </button>
                                <button
                                  onClick={async () => {
                                    setSelectedEvent(eventIdStr)
                                    setLoadingPrice(true)
                                    try {
                                      const office = data?.office || ''
                                      const url = `/api/atlantico/prices/${eventIdStr}?date=${priceDate}${office ? `&office=${office}` : ''}`
                                      const response = await fetch(url)
                                      const result = await response.json()
                                      setPriceData(result)
                                    } catch (err) {
                                      console.error('[Backoffice] Price error:', err)
                                    } finally {
                                      setLoadingPrice(false)
                                    }
                                  }}
                                  disabled={loadingPrice}
                                  className="flex-1 px-2 py-1 bg-ocean-600 text-white text-xs rounded hover:bg-ocean-700 disabled:opacity-50"
                                >
                                  Open Prices
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Event Details */}
                  {selectedEvent && selectedEventDetails && (
                    <div>
                      <h3 className="font-semibold text-glass-900 mb-2">Event Details</h3>
                      <div className="space-y-1 text-sm">
                        <div><strong>Code:</strong> {String((selectedEventDetails as { Code?: unknown } | null)?.Code ?? '—')}</div>
                        <div><strong>Name:</strong> {String((selectedEventDetails as { name?: unknown } | null)?.name ?? '—')}</div>
                        <div><strong>Title:</strong> {String((selectedEventDetails as { title?: unknown } | null)?.title ?? '—')}</div>
                        <div><strong>Days:</strong> {(selectedEventDetails as { days?: unknown } | null)?.days ? JSON.stringify((selectedEventDetails as { days?: unknown } | null)?.days) : '—'}</div>
                        <div><strong>Times:</strong> {(selectedEventDetails as { times?: unknown } | null)?.times ? JSON.stringify((selectedEventDetails as { times?: unknown } | null)?.times) : '—'}</div>
                        <div><strong>pProd:</strong> {(selectedEventDetails as { pProd?: unknown } | null)?.pProd ? JSON.stringify((selectedEventDetails as { pProd?: unknown } | null)?.pProd) : '—'}</div>
                        <div><strong>Route:</strong> {(selectedEventDetails as { route?: unknown } | null)?.route ? JSON.stringify((selectedEventDetails as { route?: unknown } | null)?.route) : '—'}</div>
                        <div><strong>Icons:</strong> {(selectedEventDetails as { icons?: unknown } | null)?.icons ? JSON.stringify((selectedEventDetails as { icons?: unknown } | null)?.icons) : '—'}</div>
                        <div><strong>Description:</strong> {String((selectedEventDetails as { desc?: unknown; description?: unknown } | null)?.desc ?? (selectedEventDetails as { description?: unknown } | null)?.description ?? '—')}</div>
                      </div>
                      <button
                        onClick={() => toggleRawJson('eventDetails')}
                        className="mt-2 text-sm text-ocean-600 hover:text-ocean-700"
                      >
                        {showRawJson.eventDetails ? 'Hide' : 'Show'} Raw JSON
                      </button>
                      {showRawJson.eventDetails && (
                        <pre className="mt-2 p-4 bg-glass-100 rounded text-xs overflow-auto max-h-96">
                          {JSON.stringify(selectedEventDetails, null, 2)}
                        </pre>
                      )}

                      {/* Calendar & Prices */}
                      <div className="mt-4 space-y-4">
                        <div>
                          <h4 className="font-medium text-glass-900 mb-2">Calendar (loadLimits)</h4>
                          <div className="flex gap-2 mb-2">
                            <input
                              type="text"
                              value={calendarMonth}
                              onChange={(e) => setCalendarMonth(e.target.value)}
                              placeholder="YYYY-MM-01"
                              className="flex-1 px-3 py-2 border border-glass-300 rounded text-sm"
                            />
                            <button
                              onClick={fetchCalendar}
                              disabled={loadingCalendar}
                              className="px-4 py-2 bg-ocean-600 text-white text-sm rounded hover:bg-ocean-700 disabled:opacity-50"
                            >
                              {loadingCalendar ? 'Loading...' : 'Load'}
                            </button>
                          </div>
                          {calendarData !== null && (
                            <pre className="p-3 bg-glass-100 rounded text-xs overflow-auto max-h-48">
                              {JSON.stringify(calendarData, null, 2)}
                            </pre>
                          )}
                        </div>

                        <div>
                          <h4 className="font-medium text-glass-900 mb-2">Prices (loadPrices)</h4>
                          <div className="flex gap-2 mb-2">
                            <input
                              type="date"
                              value={priceDate}
                              onChange={(e) => setPriceDate(e.target.value)}
                              className="flex-1 px-3 py-2 border border-glass-300 rounded text-sm"
                            />
                            <button
                              onClick={fetchPrice}
                              disabled={loadingPrice}
                              className="px-4 py-2 bg-ocean-600 text-white text-sm rounded hover:bg-ocean-700 disabled:opacity-50"
                            >
                              {loadingPrice ? 'Loading...' : 'Load'}
                            </button>
                          </div>
                          {priceData !== null && (
                            <pre className="p-3 bg-glass-100 rounded text-xs overflow-auto max-h-48">
                              {JSON.stringify(priceData, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

