/**
 * Manual Sync Admin Page
 * 
 * Allows manual triggering of catalog sync
 * Does not block other pages
 */

'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'

export default function AdminSyncPage() {
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  
  // Map locale to Atlántico language code
  const langMap: Record<string, string> = {
    en: 'ENG',
    es: 'ESP',
    fr: 'FRA',
    de: 'GER',
    it: 'ITA',
    pl: 'POL',
    ru: 'RUS',
    uk: 'UKR',
  }
  const lang = langMap[locale] || process.env.NEXT_PUBLIC_ATLANTICO_LANGUAGE_DEFAULT || 'ENG'

  const [isSyncing, setIsSyncing] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    data?: unknown
    error?: string
  } | null>(null)

  const handleSync = async () => {
    setIsSyncing(true)
    setResult(null)

    try {
      const response = await fetch(`/api/atlantico/sync?lang=${lang}&full=1`)
      const data = await response.json()

      setResult({
        success: response.ok && data.success,
        data,
        error: data.error || (response.ok ? undefined : `HTTP ${response.status}`),
      })
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="min-h-screen bg-glass-50 py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white border border-glass-200 rounded-lg p-6 shadow-lg">
          <h1 className="text-3xl font-bold text-glass-900 mb-4">Manual Catalog Sync</h1>
          
          <div className="mb-6">
            <p className="text-glass-600 mb-4">
              This page allows you to manually trigger a full catalog sync. The sync runs in the background and does not block other pages.
            </p>
            <p className="text-sm text-glass-500">
              Language: <strong>{lang}</strong>
            </p>
          </div>

          <div className="mb-6">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="px-6 py-3 bg-ocean-600 text-white font-medium rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncing ? 'Syncing...' : 'Run Sync Now'}
            </button>
          </div>

          {result && (
            <div className={`p-4 rounded-lg border ${
              result.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <h2 className={`font-semibold mb-2 ${
                result.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {result.success ? 'Sync Successful' : 'Sync Failed'}
              </h2>
              
              {result.error && (
                <p className="text-red-800 text-sm mb-2">
                  <strong>Error:</strong> {result.error}
                </p>
              )}

              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-glass-700 hover:text-glass-900">
                  View Response JSON
                </summary>
                <pre className="mt-2 p-4 bg-glass-100 rounded text-xs overflow-auto max-h-96">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}








