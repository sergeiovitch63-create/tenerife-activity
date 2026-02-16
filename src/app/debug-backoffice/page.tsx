'use client'

import { useEffect, useState } from 'react'

export default function DebugBackofficePage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [useFresh, setUseFresh] = useState(true)

  useEffect(() => {
    const fetchBackoffice = async () => {
      try {
        setLoading(true)
        setError(null)

        const url = `/api/atlantico/backoffice?lang=ENG${useFresh ? '&fresh=1' : ''}`
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error('Failed to fetch backoffice data')
        }
        const backofficeData = await response.json()
        setData(backofficeData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchBackoffice()
  }, [useFresh])

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>Chargement des données backoffice...</h1>
        <p>Récupération de toutes les classifications, groups et groupDetails...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '40px' }}>
        <h1 style={{ color: '#c33' }}>Erreur</h1>
        <p>{error}</p>
      </div>
    )
  }

  const classifications = data?.classifications || []
  const groupsByClassification = data?.groupsByClassification || {}
  const groupDetailsByGroupId = data?.groupDetailsByGroupId || {}
  const totals = data?.totals || {}

  // Calculate totals
  const totalGroupsInClassifications = Object.values(groupsByClassification).reduce(
    (sum: number, groups: any) => sum + (Array.isArray(groups) ? groups.length : 0),
    0
  )
  const totalGroupDetails = Object.keys(groupDetailsByGroupId).length

  return (
    <div style={{ padding: '40px', maxWidth: '1600px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '10px' }}>Debug: Backoffice API - Données complètes</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', background: '#e3f2fd', borderRadius: '8px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="checkbox"
            checked={useFresh}
            onChange={(e) => setUseFresh(e.target.checked)}
          />
          <span>Forcer fresh fetch (bypass cache)</span>
        </label>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginLeft: '20px',
            padding: '8px 16px',
            background: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Recharger
        </button>
      </div>

      {/* Summary */}
      <div style={{ marginBottom: '30px', padding: '20px', background: '#e3f2fd', borderRadius: '8px' }}>
        <h2>Résumé</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '15px' }}>
          <div style={{ padding: '10px', background: 'white', borderRadius: '5px' }}>
            <strong>Classifications:</strong> {classifications.length}
          </div>
          <div style={{ padding: '10px', background: 'white', borderRadius: '5px' }}>
            <strong>Classifications avec Groups:</strong> {Object.keys(groupsByClassification).length}
          </div>
          <div style={{ padding: '10px', background: 'white', borderRadius: '5px' }}>
            <strong>Total Groups (dans classifications):</strong> {totalGroupsInClassifications}
          </div>
          <div style={{ padding: '10px', background: 'white', borderRadius: '5px' }}>
            <strong>GroupDetails récupérés:</strong> {totalGroupDetails}
            {totalGroupDetails < totalGroupsInClassifications && (
              <span style={{ color: '#f44336', marginLeft: '10px' }}>
                ⚠️ Manque {totalGroupsInClassifications - totalGroupDetails} groups!
              </span>
            )}
          </div>
        </div>

        {/* Totals from API */}
        {totals && Object.keys(totals).length > 0 && (
          <div style={{ marginTop: '20px', padding: '15px', background: '#fff3cd', borderRadius: '5px' }}>
            <h3>Totals depuis l'API:</h3>
            <pre style={{ fontSize: '12px', marginTop: '10px' }}>
              {JSON.stringify(totals, null, 2)}
            </pre>
          </div>
        )}

        {/* Debug Info */}
        {data?.debug && (
          <div style={{ marginTop: '20px', padding: '15px', background: '#ffebee', borderRadius: '5px', border: '2px solid #f44336' }}>
            <h3 style={{ color: '#c33' }}>🔍 Debug: Pourquoi manque-t-il des groups?</h3>
            <div style={{ marginTop: '15px', fontSize: '14px' }}>
              <div><strong>Total Groups dans classifications:</strong> {data.debug.totalGroupsInClassifications}</div>
              <div><strong>GroupDetails récupérés:</strong> {data.debug.groupDetailsRetrieved}</div>
              <div><strong>Groups réussis:</strong> {data.debug.successGroupsCount}</div>
              <div><strong>Groups échoués:</strong> {data.debug.failedGroupsCount}</div>
            </div>
            
            {data.debug.failureReasons && Object.keys(data.debug.failureReasons).length > 0 && (
              <div style={{ marginTop: '15px' }}>
                <h4>Raisons des échecs:</h4>
                <ul style={{ marginTop: '10px', fontSize: '12px' }}>
                  {Object.entries(data.debug.failureReasons).map(([reason, count]: [string, any]) => (
                    <li key={reason}>
                      <strong>{reason}:</strong> {count} groups
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.debug.sampleFailedGroups && data.debug.sampleFailedGroups.length > 0 && (
              <div style={{ marginTop: '15px' }}>
                <h4>Exemples de groups échoués (premiers 10):</h4>
                <div style={{ marginTop: '10px', fontSize: '11px', fontFamily: 'monospace', maxHeight: '300px', overflowY: 'auto' }}>
                  <pre>{JSON.stringify(data.debug.sampleFailedGroups, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Classifications */}
      <div style={{ marginBottom: '30px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>Classifications ({classifications.length})</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px', marginTop: '15px' }}>
          {classifications.map((c: any, idx: number) => (
            <div key={idx} style={{ padding: '10px', background: 'white', borderRadius: '5px', fontSize: '12px' }}>
              <strong>ID:</strong> {c.id || 'N/A'}<br />
              <strong>Code:</strong> {c.code || 'N/A'}<br />
              <strong>Name:</strong> {c.name || 'N/A'}<br />
              <strong>Groups:</strong> {Array.isArray(groupsByClassification[String(c.id)]) ? groupsByClassification[String(c.id)].length : 0}
            </div>
          ))}
        </div>
      </div>

      {/* Groups by Classification */}
      <div style={{ marginBottom: '30px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>Groups par Classification</h2>
        {Object.entries(groupsByClassification).map(([classificationId, groups]: [string, any]) => (
          <div key={classificationId} style={{ marginBottom: '20px', padding: '15px', background: 'white', borderRadius: '5px' }}>
            <h3>
              Classification ID: {classificationId} ({Array.isArray(groups) ? groups.length : 0} groups)
            </h3>
            {Array.isArray(groups) && groups.length > 0 && (
              <div style={{ marginTop: '10px', fontSize: '12px' }}>
                <strong>Groups:</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
                  {groups.slice(0, 20).map((g: any, idx: number) => (
                    <span
                      key={idx}
                      style={{
                        padding: '4px 8px',
                        background: '#e0e0e0',
                        borderRadius: '4px',
                      }}
                    >
                      {g.Code || g.code || g.id || idx} - {g.name || 'Sans nom'}
                    </span>
                  ))}
                  {groups.length > 20 && <span>... et {groups.length - 20} de plus</span>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* GroupDetails Sample */}
      <div style={{ marginBottom: '30px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>GroupDetails (échantillon - premiers 10)</h2>
        <div style={{ display: 'grid', gap: '15px', marginTop: '15px' }}>
          {Object.entries(groupDetailsByGroupId).slice(0, 10).map(([groupId, groupDetails]: [string, any]) => (
            <div key={groupId} style={{ padding: '15px', background: 'white', borderRadius: '5px' }}>
              <h3>Group ID: {groupId}</h3>
              <div style={{ fontSize: '12px', marginTop: '10px' }}>
                <strong>Code:</strong> {groupDetails?.code || groupDetails?.Code || 'N/A'}<br />
                <strong>Name:</strong> {groupDetails?.name || 'N/A'}<br />
                <strong>Image:</strong> {groupDetails?.image || 'N/A'}<br />
                <strong>IDs:</strong> {groupDetails?.ids || 'N/A'}<br />
                <strong>Keys:</strong> {Object.keys(groupDetails || {}).join(', ')}
              </div>
            </div>
          ))}
        </div>
        {totalGroupDetails > 10 && (
          <p style={{ marginTop: '15px', color: '#666' }}>
            ... et {totalGroupDetails - 10} autres groupDetails
          </p>
        )}
      </div>

      {/* Full JSON (collapsed) */}
      <details style={{ marginTop: '30px' }}>
        <summary style={{ padding: '15px', background: '#e3f2fd', borderRadius: '5px', cursor: 'pointer' }}>
          <strong>Voir les données JSON complètes</strong>
        </summary>
        <pre
          style={{
            background: '#f5f5f5',
            padding: '15px',
            borderRadius: '5px',
            overflow: 'auto',
            maxHeight: '600px',
            fontSize: '11px',
            fontFamily: 'monospace',
            marginTop: '10px',
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  )
}

