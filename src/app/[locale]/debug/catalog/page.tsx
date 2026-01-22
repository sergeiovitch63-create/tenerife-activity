/**
 * DEBUG PAGE - Catalog Analysis
 * 
 * DEV ONLY - Displays catalog statistics and sample data.
 */

import { mapLocaleToLang } from '@/lib/atlantico/locale'

export default async function CatalogDebugPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // Security: disable in production
  if (process.env.NODE_ENV === 'production') {
    return (
      <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
        <div
          style={{
            background: '#fee',
            border: '2px solid #f00',
            padding: '1rem',
            marginBottom: '1rem',
            borderRadius: '4px',
          }}
        >
          <strong>Debug page disabled in production</strong>
        </div>
      </div>
    )
  }

  const lang = mapLocaleToLang(locale)
  let debugData: any = null
  let error: string | null = null

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/atlantico/catalog-debug/${lang}`, {
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      error = `HTTP ${response.status}: ${response.statusText}`
    } else {
      debugData = await response.json()
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unknown error occurred'
    console.error('[CatalogDebugPage] Error:', err)
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Debug Banner */}
      <div
        style={{
          background: '#ffeb3b',
          border: '2px solid #f57f17',
          padding: '1rem',
          marginBottom: '2rem',
          borderRadius: '4px',
          fontWeight: 'bold',
        }}
      >
        🐛 DEBUG – CATALOG ANALYSIS (DEV ONLY)
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            background: '#fee',
            border: '2px solid #f00',
            padding: '1rem',
            marginBottom: '2rem',
            borderRadius: '4px',
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Statistics */}
      {debugData && (
        <>
          <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f5f5f5', borderRadius: '4px' }}>
            <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Statistics</h2>
            <p style={{ margin: '0.5rem 0' }}>
              <strong>Total items:</strong> {debugData.total || 0}
            </p>
            <p style={{ margin: '0.5rem 0' }}>
              <strong>Groups used:</strong> {debugData.groupsUsed?.length || 0}
            </p>
            <p style={{ margin: '0.5rem 0' }}>
              <strong>Language:</strong> {lang}
            </p>
          </div>

          {/* Groups Used */}
          {debugData.groupsUsed && debugData.groupsUsed.length > 0 && (
            <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f5f5f5', borderRadius: '4px' }}>
              <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Groups Used ({debugData.groupsUsed.length})</h2>
              <p style={{ fontSize: '0.9em', color: '#666' }}>
                {debugData.groupsUsed.join(', ')}
              </p>
            </div>
          )}

          {/* Top Groups */}
          {debugData.topGroups && debugData.topGroups.length > 0 && (
            <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f5f5f5', borderRadius: '4px' }}>
              <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Top 20 Group Values (from raw.group)</h2>
              <p style={{ fontSize: '0.9em', color: '#666' }}>
                {debugData.topGroups.join(', ')}
              </p>
            </div>
          )}

          {/* Sample Items */}
          {debugData.samples && debugData.samples.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Sample Items (First 5)</h2>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid #ddd',
                }}
              >
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={{ padding: '0.5rem', border: '1px solid #ddd', textAlign: 'left' }}>ID</th>
                    <th style={{ padding: '0.5rem', border: '1px solid #ddd', textAlign: 'left' }}>Code</th>
                    <th style={{ padding: '0.5rem', border: '1px solid #ddd', textAlign: 'left' }}>Group</th>
                    <th style={{ padding: '0.5rem', border: '1px solid #ddd', textAlign: 'left' }}>Image</th>
                    <th style={{ padding: '0.5rem', border: '1px solid #ddd', textAlign: 'left' }}>Price</th>
                    <th style={{ padding: '0.5rem', border: '1px solid #ddd', textAlign: 'left' }}>Name</th>
                  </tr>
                </thead>
                <tbody>
                  {debugData.samples.map((item: any, idx: number) => (
                    <tr key={idx} style={{ border: '1px solid #ddd' }}>
                      <td style={{ padding: '0.5rem', border: '1px solid #ddd', fontSize: '0.9em' }}>
                        {item.id || 'N/A'}
                      </td>
                      <td style={{ padding: '0.5rem', border: '1px solid #ddd', fontSize: '0.9em' }}>
                        {item.code || 'N/A'}
                      </td>
                      <td style={{ padding: '0.5rem', border: '1px solid #ddd', fontSize: '0.9em' }}>
                        {item.group || 'N/A'}
                      </td>
                      <td style={{ padding: '0.5rem', border: '1px solid #ddd', fontSize: '0.9em' }}>
                        {item.image || 'N/A'}
                      </td>
                      <td style={{ padding: '0.5rem', border: '1px solid #ddd', fontSize: '0.9em' }}>
                        {item.price || 0}
                      </td>
                      <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>
                        {item.name || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

