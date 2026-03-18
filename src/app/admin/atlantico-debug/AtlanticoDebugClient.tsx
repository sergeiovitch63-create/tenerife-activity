'use client'

/**
 * Client component for Atlantico Debug Panel
 */

import { useState } from 'react'

interface Session {
  time: string
  available: number
  precio: number | null
  bruto: number | null
  sessionId: string | null
  rcId: string | null
  TipoReservaId: string | null
}

interface LimitsResponse {
  quote: number | null
  wdays: number[]
  dates: Array<{
    limit: number
    date: string
    used: number
  }>
  sessionsByDay: Record<string, Session[]>
}

export function AtlanticoDebugClient() {
  const [eventId, setEventId] = useState('')
  const [lang, setLang] = useState('ENG')
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [date, setDate] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })
  const [office, setOffice] = useState('')
  const [pProd, setPProd] = useState('')
  
  const [limitsResult, setLimitsResult] = useState<LimitsResponse | null>(null)
  const [pricesResult, setPricesResult] = useState<any>(null)
  const [eventDetailsResult, setEventDetailsResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Test limits endpoint
  const testLimits = async () => {
    if (!eventId) {
      setError('Event ID is required')
      return
    }

    setLoading(true)
    setError(null)
    setLimitsResult(null)

    try {
      const response = await fetch(
        `/api/atlantico/limits?eventId=${encodeURIComponent(eventId)}&lang=${encodeURIComponent(lang)}&month=${encodeURIComponent(month)}`
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setLimitsResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch limits')
    } finally {
      setLoading(false)
    }
  }

  // Test prices endpoint
  const testPrices = async () => {
    if (!eventId || !date) {
      setError('Event ID and date are required')
      return
    }

    setLoading(true)
    setError(null)
    setPricesResult(null)

    try {
      let url = `/api/atlantico/prices?eventId=${encodeURIComponent(eventId)}&date=${encodeURIComponent(date)}&lang=${encodeURIComponent(lang)}`
      if (office) {
        url += `&office=${encodeURIComponent(office)}`
      }
      if (pProd) {
        url += `&pProd=${encodeURIComponent(pProd)}`
      }

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setPricesResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prices')
    } finally {
      setLoading(false)
    }
  }

  // Test event details endpoint
  const testEventDetails = async () => {
    if (!eventId) {
      setError('Event ID is required')
      return
    }

    setLoading(true)
    setError(null)
    setEventDetailsResult(null)

    try {
      const response = await fetch(
        `/api/atlantico/event-details?eventId=${encodeURIComponent(eventId)}&lang=ENG`
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setEventDetailsResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch event details')
    } finally {
      setLoading(false)
    }
  }

  // Count sessions per day from limits result
  const getSessionsCount = () => {
    if (!limitsResult?.sessionsByDay) return {}
    
    const counts: Record<string, number> = {}
    for (const [day, sessions] of Object.entries(limitsResult.sessionsByDay)) {
      counts[day] = sessions.filter((s) => s.available > 0).length
    }
    return counts
  }

  const sessionsCount = getSessionsCount()

  return (
    <div className="space-y-8">
      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800">
          {error}
        </div>
      )}

      {/* Event Details Test */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event ID
            </label>
            <input
              type="text"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g., 123"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Language
            </label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="ENG">ENG</option>
              <option value="ESP">ESP</option>
              <option value="FRA">FRA</option>
              <option value="GER">GER</option>
              <option value="ITA">ITA</option>
            </select>
          </div>
        </div>
        <button
          onClick={testEventDetails}
          disabled={loading || !eventId}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Test Event Details
        </button>
        {eventDetailsResult && (
          <div className="mt-4 p-4 bg-gray-50 rounded">
            <pre className="text-xs overflow-auto">
              {JSON.stringify(eventDetailsResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Limits Test */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Limits (Sessions by Day)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event ID
            </label>
            <input
              type="text"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Language
            </label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="ENG">ENG</option>
              <option value="ESP">ESP</option>
              <option value="FRA">FRA</option>
              <option value="GER">GER</option>
              <option value="ITA">ITA</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Month (YYYY-MM-01)
            </label>
            <input
              type="text"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="2026-02-01"
            />
          </div>
        </div>
        <button
          onClick={testLimits}
          disabled={loading || !eventId}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Test Limits
        </button>
        {limitsResult && (
          <div className="mt-4 space-y-4">
            <div className="p-4 bg-gray-50 rounded">
              <h3 className="font-medium mb-2">Sessions Count by Day:</h3>
              <div className="text-sm">
                {Object.keys(sessionsCount).length > 0 ? (
                  <ul className="list-disc list-inside">
                    {Object.entries(sessionsCount).map(([day, count]) => (
                      <li key={day}>
                        {day}: {count} session(s)
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No sessions found</p>
                )}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <h3 className="font-medium mb-2">Full Response:</h3>
              <pre className="text-xs overflow-auto max-h-96">
                {JSON.stringify(limitsResult, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Prices Test */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Prices</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event ID
            </label>
            <input
              type="text"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date (YYYY-MM-DD)
            </label>
            <input
              type="text"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="2026-02-18"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Office (optional)
            </label>
            <input
              type="text"
              value={office}
              onChange={(e) => setOffice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              pProd (optional)
            </label>
            <input
              type="text"
              value={pProd}
              onChange={(e) => setPProd(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="0, 1, 2, or 3"
            />
          </div>
        </div>
        <button
          onClick={testPrices}
          disabled={loading || !eventId || !date}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Test Prices
        </button>
        {pricesResult && (
          <div className="mt-4 p-4 bg-gray-50 rounded">
            <pre className="text-xs overflow-auto">
              {JSON.stringify(pricesResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Booking Simulation */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Simulation</h2>
        <p className="text-sm text-gray-600 mb-4">
          Note: Use the actual booking endpoints in your application. This section is for reference only.
        </p>
        <div className="text-sm text-gray-700 space-y-2">
          <p>
            <strong>POST /api/atlantico/booking/payment</strong>
          </p>
          <p>
            Body: {'{'} userId, t_id, t_group, language, tourDate, sesTime, adults, childs, infants, name, email, phone, hotel?, room?, mpoint?, mtime?, notes? {'}'}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Returns: HTML payment gateway form or redirect to payment gateway
          </p>
        </div>
      </div>
    </div>
  )
}








