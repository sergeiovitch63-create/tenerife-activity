/**
 * Atlantico API Debug Panel
 * Displays all raw API responses for Teide de Noche VIP activity
 */

'use client'

import { useState, useEffect } from 'react'
import { Accordion } from './Accordion'

interface ApiRequest {
  id: string
  endpoint: string
  method: string
  params?: Record<string, string>
  status: 'pending' | 'loading' | 'success' | 'error'
  statusCode?: number
  responseTime?: number
  response?: any
  error?: string
  headers?: Record<string, string>
}

interface ImageInfo {
  url: string
  source: string // 'catalog' | 'loadLimits' | 'other'
}

export function AtlanticoDebugPanel({ tourId, events, locale }: { tourId: string; events: any[]; locale: string }) {
  const [requests, setRequests] = useState<ApiRequest[]>([])
  const [images, setImages] = useState<ImageInfo[]>([])
  const [viewMode, setViewMode] = useState<'compact' | 'raw'>('compact')
  const [manualCode, setManualCode] = useState('')
  const [manualLang, setManualLang] = useState('FRA')
  const [manualMonth, setManualMonth] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  // Map locale to Atlantico lang
  const mapLocaleToLang = (loc: string): string => {
    const map: Record<string, string> = {
      en: 'ENG',
      es: 'ESP',
      fr: 'FRA',
      de: 'GER',
      it: 'ITA',
    }
    return map[loc] || 'ENG'
  }

  const lang = mapLocaleToLang(locale)

  // Extract all image URLs from a response
  const extractImagesFromResponse = (response: any, source: string): ImageInfo[] => {
    const found: ImageInfo[] = []
    const seen = new Set<string>()

    const addImage = (url: string | null | undefined) => {
      if (!url || typeof url !== 'string') return
      const trimmed = url.trim()
      if (trimmed && !seen.has(trimmed)) {
        seen.add(trimmed)
        found.push({ url: trimmed, source })
      }
    }

    // Recursively search for image fields
    const search = (obj: any, depth = 0) => {
      if (depth > 5 || !obj || typeof obj !== 'object') return

      if (Array.isArray(obj)) {
        obj.forEach(item => search(item, depth + 1))
        return
      }

      // Check common image field names
      const imageFields = ['image', 'imageUrl', 'imageFilename', 'cover', 'thumbnail', 'img', 'photo', 'picture', 'foto', 'photos', 'images']
      for (const field of imageFields) {
        const value = obj[field]
        if (typeof value === 'string') {
          addImage(value)
        } else if (Array.isArray(value)) {
          value.forEach(v => addImage(v))
        }
      }

      // Recursively search nested objects
      Object.values(obj).forEach(value => {
        if (value && typeof value === 'object') {
          search(value, depth + 1)
        }
      })
    }

    search(response)
    return found
  }

  // Make API request and track it
  const makeRequest = async (
    id: string,
    endpoint: string,
    method: string = 'GET',
    params?: Record<string, string>
  ): Promise<void> => {
    const startTime = Date.now()
    
    // Update request to loading
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'loading' } : r))

    try {
      const url = params 
        ? `${endpoint}?${new URLSearchParams(params).toString()}`
        : endpoint

      const response = await fetch(url)
      const responseTime = Date.now() - startTime
      const data = await response.json()

      // Extract images
      const foundImages = extractImagesFromResponse(data, id)
      setImages(prev => {
        const combined = [...prev, ...foundImages]
        // Deduplicate
        const seen = new Set<string>()
        return combined.filter(img => {
          if (seen.has(img.url)) return false
          seen.add(img.url)
          return true
        })
      })

      // Get response headers
      const headers: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        headers[key] = value
      })

      setRequests(prev =>
        prev.map(r =>
          r.id === id
            ? {
                ...r,
                status: response.ok ? 'success' : 'error',
                statusCode: response.status,
                responseTime,
                response: data,
                error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
                headers,
              }
            : r
        )
      )
    } catch (err) {
      const responseTime = Date.now() - startTime
      setRequests(prev =>
        prev.map(r =>
          r.id === id
            ? {
                ...r,
                status: 'error',
                responseTime,
                error: err instanceof Error ? err.message : 'Unknown error',
              }
            : r
        )
      )
    }
  }

  // Load all API data
  const loadAllData = async () => {
    setIsLoading(true)
    setRequests([])
    setImages([])

    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`

    // Get event codes from events
    const eventCodes = events
      .map(e => e.raw?.code || e.code || e.id)
      .filter((code): code is string => !!code && typeof code === 'string')

    const firstEventCode = eventCodes[0] || '1831' // Fallback to known code
    const idExc = '1831' // Known idExc for teide-de-noche-vip

    // Initialize requests
    const initialRequests: ApiRequest[] = [
      {
        id: 'catalog',
        endpoint: `/api/catalog/item`,
        method: 'GET',
        params: { slug: 'teide-de-noche-vip', lang, mode: 'sellable', merged: '1', includeRaw: '1' },
        status: 'pending',
      },
      {
        id: 'loadLimits-current',
        endpoint: `/api/atlantico/loadLimits/${idExc}/${lang.toUpperCase()}/${currentMonth}`,
        method: 'GET',
        status: 'pending',
      },
      {
        id: 'loadLimits-next',
        endpoint: `/api/atlantico/loadLimits/${idExc}/${lang.toUpperCase()}/${nextMonthStr}`,
        method: 'GET',
        status: 'pending',
      },
    ]

    // Add price requests for each event code
    eventCodes.forEach((code, idx) => {
      initialRequests.push({
        id: `price-${code}-current`,
        endpoint: `/api/atlantico/prices/${code}`,
        method: 'GET',
        params: { date: currentMonth },
        status: 'pending',
      })
      initialRequests.push({
        id: `price-${code}-next`,
        endpoint: `/api/atlantico/prices/${code}`,
        method: 'GET',
        params: { date: nextMonthStr },
        status: 'pending',
      })
    })

    // Add event details requests
    eventCodes.forEach(code => {
      initialRequests.push({
        id: `event-${code}`,
        endpoint: `/api/atlantico/event/${code}/${lang.toUpperCase()}`,
        method: 'GET',
        status: 'pending',
      })
    })

    setRequests(initialRequests)

    // Execute all requests in parallel
    await Promise.all(
      initialRequests.map(req =>
        makeRequest(req.id, req.endpoint, req.method, req.params)
      )
    )

    setIsLoading(false)
  }

  // Load on mount
  useEffect(() => {
    loadAllData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId, locale])

  // Copy JSON to clipboard
  const copyJson = (json: any) => {
    navigator.clipboard.writeText(JSON.stringify(json, null, 2))
  }

  // Get stats for a request
  const getStats = (req: ApiRequest): Record<string, any> => {
    if (!req.response) return {}

    const stats: Record<string, any> = {}

    // Count sessionsByDate
    if (req.response.raw?.sessionsByDate) {
      const sessionsByDate = req.response.raw.sessionsByDate
      const keys = Object.keys(sessionsByDate)
      stats.sessionsByDateKeys = keys.length
      stats.sessionsTotal = keys.reduce((sum, key) => {
        const sessions = sessionsByDate[key]
        return sum + (Array.isArray(sessions) ? sessions.length : 0)
      }, 0)
      
      // Detect date format
      if (keys.length > 0) {
        const sample = keys[0]
        if (/^\d{8}$/.test(sample)) {
          stats.dateFormat = 'YYYYMMDD'
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(sample)) {
          stats.dateFormat = 'YYYY-MM-DD'
        } else {
          stats.dateFormat = 'OTHER'
        }
      }
    }

    // Count dates array
    if (Array.isArray(req.response.dates)) {
      stats.datesCount = req.response.dates.length
    }

    // Count events
    if (Array.isArray(req.response.events)) {
      stats.eventsCount = req.response.events.length
    }

    // Response size
    try {
      stats.responseSizeBytes = JSON.stringify(req.response).length
    } catch {}

    return stats
  }

  // Manual test
  const testManualCode = async () => {
    if (!manualCode) return

    const testMonth = manualMonth || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`
    const testId = `manual-${manualCode}-${Date.now()}`

    const newRequest: ApiRequest = {
      id: testId,
      endpoint: `/api/atlantico/loadLimits/${manualCode}/${manualLang.toUpperCase()}/${testMonth}`,
      method: 'GET',
      status: 'pending',
    }

    setRequests(prev => [...prev, newRequest])
    await makeRequest(testId, newRequest.endpoint, newRequest.method)
  }

  return (
    <div className="mt-8 border-t border-glass-200 pt-8">
      <Accordion
        id="api-debug-panel"
        title="🔍 API Debug Panel (DEV)"
        isOpen={isPanelOpen}
        onToggle={() => setIsPanelOpen((prev) => !prev)}
      >
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={loadAllData}
              disabled={isLoading}
              className="px-4 py-2 bg-ocean-600 text-white rounded hover:bg-ocean-700 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Reload All'}
            </button>
            <button
              onClick={() => setViewMode(viewMode === 'compact' ? 'raw' : 'compact')}
              className="px-4 py-2 border border-glass-300 rounded hover:bg-glass-50"
            >
              View: {viewMode === 'compact' ? 'Compact' : 'Raw JSON'}
            </button>
          </div>

          {/* Manual Test */}
          <div className="p-4 bg-glass-50 rounded border border-glass-200">
            <h4 className="font-semibold mb-3">Manual Test</h4>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Code (e.g., 1831)"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                className="px-3 py-2 border border-glass-300 rounded"
              />
              <input
                type="text"
                placeholder="Lang (e.g., FRA)"
                value={manualLang}
                onChange={e => setManualLang(e.target.value)}
                className="px-3 py-2 border border-glass-300 rounded"
              />
              <input
                type="text"
                placeholder="Month (YYYY-MM-01)"
                value={manualMonth}
                onChange={e => setManualMonth(e.target.value)}
                className="px-3 py-2 border border-glass-300 rounded"
              />
              <button
                onClick={testManualCode}
                className="px-4 py-2 bg-glass-600 text-white rounded hover:bg-glass-700"
              >
                Test
              </button>
            </div>
          </div>

          {/* Requests List */}
          <div className="space-y-4">
            {requests.map(req => {
              const stats = getStats(req)
              const hasResponse = req.status === 'success' && req.response

              return (
                <div key={req.id} className="border border-glass-200 rounded p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-glass-900">{req.id}</h4>
                      <div className="text-sm text-glass-600 font-mono mt-1">
                        {req.method} {req.endpoint}
                        {req.params && `?${new URLSearchParams(req.params).toString()}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {req.status === 'loading' && (
                        <span className="text-blue-600">Loading...</span>
                      )}
                      {req.status === 'success' && (
                        <span className="text-green-600">✓ {req.statusCode}</span>
                      )}
                      {req.status === 'error' && (
                        <span className="text-red-600">✗ {req.statusCode || 'Error'}</span>
                      )}
                      {req.responseTime && (
                        <span className="text-xs text-glass-500">{req.responseTime}ms</span>
                      )}
                    </div>
                  </div>

                  {/* Stats (Compact Mode) */}
                  {viewMode === 'compact' && hasResponse && Object.keys(stats).length > 0 && (
                    <div className="mt-3 p-3 bg-glass-50 rounded text-sm">
                      <div className="font-semibold mb-2">Stats:</div>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(stats).map(([key, value]) => (
                          <div key={key}>
                            <span className="text-glass-600">{key}:</span>{' '}
                            <span className="font-mono">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Raw JSON (Raw Mode) */}
                  {viewMode === 'raw' && hasResponse && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">Response:</span>
                        <button
                          onClick={() => copyJson(req.response)}
                          className="px-2 py-1 text-xs bg-glass-200 rounded hover:bg-glass-300"
                        >
                          Copy JSON
                        </button>
                      </div>
                      <pre className="bg-glass-50 p-3 rounded text-xs overflow-auto max-h-96 border border-glass-200">
                        {JSON.stringify(req.response, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Error */}
                  {req.status === 'error' && req.error && (
                    <div className="mt-3 p-3 bg-red-50 rounded text-sm text-red-700">
                      {req.error}
                    </div>
                  )}

                  {/* Headers */}
                  {req.headers && Object.keys(req.headers).length > 0 && viewMode === 'raw' && (
                    <div className="mt-3">
                      <div className="text-sm font-semibold mb-2">Headers:</div>
                      <pre className="bg-glass-50 p-3 rounded text-xs overflow-auto max-h-32 border border-glass-200">
                        {JSON.stringify(req.headers, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Images */}
          {images.length > 0 && (
            <div className="border border-glass-200 rounded p-4">
              <h4 className="font-semibold mb-3">
                Images Found ({images.length})
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((img, idx) => (
                  <div key={idx} className="border border-glass-200 rounded p-2">
                    <img
                      src={img.url}
                      alt={`Image ${idx + 1}`}
                      className="w-full h-24 object-cover rounded mb-2"
                      onError={e => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                    <div className="text-xs text-glass-600 truncate" title={img.url}>
                      {img.url}
                    </div>
                    <div className="text-xs text-glass-500 mt-1">Source: {img.source}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Accordion>
    </div>
  )
}

