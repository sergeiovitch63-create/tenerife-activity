'use client'

/**
 * Page qui récupère TOUTES les informations disponibles de l'API Atlantico pour un t_id
 * Basé sur le PDF Atlantico API
 */

import { useState } from 'react'

interface EventDetails {
  code?: string
  name?: string
  title?: string
  desc?: string
  description?: string
  times?: string[]
  days?: string[]
  icons?: string[]
  route?: string
  meetingPoints?: any[]
  image?: string
  [key: string]: any
}

interface GroupDetails {
  code?: string
  name?: string
  desc?: string
  description?: string
  image?: string
  duration?: string
  events?: string[]
  ids?: string
  [key: string]: any
}

interface LimitsData {
  ok: boolean
  quote?: number
  monthStart?: string
  sessionsByDay?: Record<string, any[]>
  availableDates?: string[]
  calendarMode?: string
  requiresSessionTime?: boolean
  [key: string]: any
}

interface PricesData {
  ok: boolean
  type?: string
  adultPrice?: number
  childPrice?: number
  infantPrice?: number
  tiers?: any[]
  raw?: any
  [key: string]: any
}

interface CompleteInfo {
  t_id: string
  lang: string
  eventDetails: EventDetails | null
  groupDetails: GroupDetails | null
  limits: Record<string, LimitsData> // month -> limits
  prices: Record<string, PricesData> // date -> prices
  errors: string[]
}

export default function TIdCompleteInfoPage() {
  const [t_id, setT_id] = useState('509')
  const [lang, setLang] = useState('ENG')
  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState<CompleteInfo | null>(null)
  const [monthsToFetch, setMonthsToFetch] = useState(3) // Nombre de mois à récupérer
  const [datesToFetch, setDatesToFetch] = useState(10) // Nombre de dates pour les prix

  const fetchAllInfo = async () => {
    setLoading(true)
    setInfo(null)

    const errors: string[] = []
    let eventDetails: EventDetails | null = null
    let groupDetails: GroupDetails | null = null
    const limits: Record<string, LimitsData> = {}
    const prices: Record<string, PricesData> = {}

    try {
      // 1. Récupérer eventDetails
      console.log(`[T_ID_INFO] Fetching eventDetails for t_id=${t_id}, lang=${lang}`)
      try {
        const eventRes = await fetch(`/api/atlantico/event/${t_id}/${lang}`)
        if (eventRes.ok) {
          eventDetails = await eventRes.json()
          console.log('[T_ID_INFO] eventDetails:', eventDetails)
        } else {
          errors.push(`eventDetails failed: ${eventRes.status} ${eventRes.statusText}`)
        }
      } catch (error) {
        errors.push(`eventDetails error: ${error instanceof Error ? error.message : String(error)}`)
      }

      // 2. Trouver le t_group depuis eventDetails ou essayer plusieurs groupes
      let t_group: string | null = null
      
      // Essayer de trouver le t_group depuis les groupes disponibles
      // On va essayer les groupes courants (31, 55, etc.)
      const commonGroups = ['31', '55', '1', '2', '3', '4', '5']
      
      for (const groupId of commonGroups) {
        try {
          const groupRes = await fetch(`/api/atlantico/group/${groupId}/${lang}`)
          if (groupRes.ok) {
            const groupData: GroupDetails = await groupRes.json()
            const eventIds = groupData.ids ? String(groupData.ids).split(',').map(id => id.trim()) : []
            const events = groupData.events || []
            const allEventIds = [...eventIds, ...events].filter(Boolean)
            
            if (allEventIds.includes(t_id)) {
              t_group = groupId
              groupDetails = groupData
              console.log(`[T_ID_INFO] Found t_group=${t_group} for t_id=${t_id}`)
              break
            }
          }
        } catch (error) {
          // Continue to next group
        }
      }

      // Si on n'a pas trouvé, essayer avec le t_id comme t_group
      if (!t_group) {
        try {
          const groupRes = await fetch(`/api/atlantico/group/${t_id}/${lang}`)
          if (groupRes.ok) {
            const groupData: GroupDetails = await groupRes.json()
            const eventIds = groupData.ids ? String(groupData.ids).split(',').map(id => id.trim()) : []
            const events = groupData.events || []
            const allEventIds = [...eventIds, ...events].filter(Boolean)
            
            if (allEventIds.includes(t_id)) {
              t_group = t_id
              groupDetails = groupData
              console.log(`[T_ID_INFO] Found t_group=${t_group} (same as t_id)`)
            }
          }
        } catch (error) {
          errors.push(`groupDetails search error: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      // 3. Récupérer loadLimits pour plusieurs mois
      console.log(`[T_ID_INFO] Fetching loadLimits for ${monthsToFetch} months`)
      const today = new Date()
      for (let i = 0; i < monthsToFetch; i++) {
        const monthDate = new Date(today.getFullYear(), today.getMonth() + i, 1)
        const monthStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-01`
        
        try {
          const limitsRes = await fetch(`/api/atlantico/limits?eventId=${t_id}&lang=${lang}&month=${monthStr}`)
          if (limitsRes.ok) {
            const limitsData: LimitsData = await limitsRes.json()
            limits[monthStr] = limitsData
            console.log(`[T_ID_INFO] Limits for ${monthStr}:`, limitsData)
          } else {
            errors.push(`loadLimits failed for ${monthStr}: ${limitsRes.status}`)
          }
        } catch (error) {
          errors.push(`loadLimits error for ${monthStr}: ${error instanceof Error ? error.message : String(error)}`)
        }
        
        // Pause entre les requêtes
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      // 4. Récupérer loadPrices pour plusieurs dates disponibles
      console.log(`[T_ID_INFO] Fetching loadPrices for ${datesToFetch} dates`)
      
      // Collecter toutes les dates disponibles depuis limits
      const allAvailableDates: string[] = []
      Object.values(limits).forEach(limitData => {
        if (limitData.availableDates && Array.isArray(limitData.availableDates)) {
          allAvailableDates.push(...limitData.availableDates)
        }
        if (limitData.projectedAvailableDates && Array.isArray(limitData.projectedAvailableDates)) {
          allAvailableDates.push(...limitData.projectedAvailableDates)
        }
      })
      
      // Prendre les premières dates uniques
      const uniqueDates = Array.from(new Set(allAvailableDates)).slice(0, datesToFetch)
      
      // Si pas de dates disponibles, générer des dates futures
      if (uniqueDates.length === 0) {
        for (let i = 1; i <= datesToFetch; i++) {
          const date = new Date()
          date.setDate(date.getDate() + i)
          const dateStr = date.toISOString().split('T')[0]
          uniqueDates.push(dateStr)
        }
      }

      for (const date of uniqueDates) {
        try {
          // Convertir YYYY-MM-DD en YYYYMMDD pour l'API
          const dateFormatted = date.replace(/-/g, '')
          const pricesRes = await fetch(`/api/atlantico/prices/${t_id}?date=${date}`)
          if (pricesRes.ok) {
            const pricesData: PricesData = await pricesRes.json()
            prices[date] = pricesData
            console.log(`[T_ID_INFO] Prices for ${date}:`, pricesData)
          } else {
            errors.push(`loadPrices failed for ${date}: ${pricesRes.status}`)
          }
        } catch (error) {
          errors.push(`loadPrices error for ${date}: ${error instanceof Error ? error.message : String(error)}`)
        }
        
        // Pause entre les requêtes
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      setInfo({
        t_id,
        lang,
        eventDetails,
        groupDetails,
        limits,
        prices,
        errors,
      })
    } catch (error) {
      errors.push(`General error: ${error instanceof Error ? error.message : String(error)}`)
      setInfo({
        t_id,
        lang,
        eventDetails,
        groupDetails,
        limits,
        prices,
        errors,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1600px', margin: '0 auto' }}>
      <h1>📊 Informations Complètes pour un t_id</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Récupère TOUTES les informations disponibles de l'API Atlantico pour un t_id donné
      </p>

      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'end' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>t_id (Event ID):</label>
          <input
            type="text"
            value={t_id}
            onChange={(e) => setT_id(e.target.value)}
            style={{ padding: '8px', width: '150px', border: '1px solid #ddd', borderRadius: '4px' }}
            placeholder="509"
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Langue:</label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            style={{ padding: '8px', width: '100px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="ENG">ENG</option>
            <option value="CAS">CAS</option>
            <option value="FRA">FRA</option>
            <option value="RUS">RUS</option>
            <option value="ALE">ALE</option>
            <option value="ITA">ITA</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Mois à récupérer:</label>
          <input
            type="number"
            value={monthsToFetch}
            onChange={(e) => setMonthsToFetch(parseInt(e.target.value) || 3)}
            min="1"
            max="12"
            style={{ padding: '8px', width: '80px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Dates pour prix:</label>
          <input
            type="number"
            value={datesToFetch}
            onChange={(e) => setDatesToFetch(parseInt(e.target.value) || 10)}
            min="1"
            max="50"
            style={{ padding: '8px', width: '80px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        <button
          onClick={fetchAllInfo}
          disabled={loading || !t_id}
          style={{
            padding: '10px 20px',
            background: loading ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '16px',
          }}
        >
          {loading ? '⏳ Récupération...' : '🚀 Récupérer Toutes les Infos'}
        </button>
      </div>

      {loading && (
        <div style={{ padding: '20px', background: '#f0f0f0', borderRadius: '8px', marginBottom: '20px' }}>
          <p>⏳ Récupération des données en cours...</p>
        </div>
      )}

      {info && (
        <div style={{ marginTop: '30px' }}>
          {info.errors.length > 0 && (
            <div style={{ padding: '15px', background: '#fff3cd', borderRadius: '8px', marginBottom: '20px' }}>
              <h3 style={{ marginTop: 0, color: '#856404' }}>⚠️ Erreurs ({info.errors.length})</h3>
              <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                {info.errors.map((error, i) => (
                  <li key={i} style={{ marginBottom: '5px', fontFamily: 'monospace', fontSize: '12px' }}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Event Details */}
          <div style={{ marginBottom: '30px', border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
            <h2 style={{ marginTop: 0, color: '#333' }}>1. Event Details (eventDetails/{info.t_id}/{info.lang})</h2>
            {info.eventDetails ? (
              <pre style={{ background: '#f5f5f5', padding: '15px', borderRadius: '5px', overflow: 'auto', maxHeight: '500px', fontSize: '12px' }}>
                {JSON.stringify(info.eventDetails, null, 2)}
              </pre>
            ) : (
              <p style={{ color: '#999' }}>❌ Non disponible</p>
            )}
          </div>

          {/* Group Details */}
          <div style={{ marginBottom: '30px', border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
            <h2 style={{ marginTop: 0, color: '#333' }}>2. Group Details (groupDetails/{info.t_id}/{info.lang})</h2>
            {info.groupDetails ? (
              <div>
                <p><strong>t_group trouvé:</strong> {info.groupDetails.code || 'N/A'}</p>
                <pre style={{ background: '#f5f5f5', padding: '15px', borderRadius: '5px', overflow: 'auto', maxHeight: '500px', fontSize: '12px' }}>
                  {JSON.stringify(info.groupDetails, null, 2)}
                </pre>
              </div>
            ) : (
              <p style={{ color: '#999' }}>❌ Non disponible (t_group non trouvé)</p>
            )}
          </div>

          {/* Limits */}
          <div style={{ marginBottom: '30px', border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
            <h2 style={{ marginTop: 0, color: '#333' }}>
              3. Load Limits (loadLimits/{info.t_id}/{info.lang}/month) - {Object.keys(info.limits).length} mois
            </h2>
            {Object.keys(info.limits).length > 0 ? (
              <div>
                {Object.entries(info.limits).map(([month, limitData]) => (
                  <div key={month} style={{ marginBottom: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '5px' }}>
                    <h3 style={{ marginTop: 0, fontSize: '16px' }}>📅 {month}</h3>
                    <div style={{ marginBottom: '10px' }}>
                      <strong>Calendar Mode:</strong> {limitData.calendarMode || 'N/A'} | 
                      <strong> Requires Session Time:</strong> {limitData.requiresSessionTime ? 'Oui' : 'Non'} | 
                      <strong> Quote:</strong> {limitData.quote ?? 'N/A'} | 
                      <strong> Dates disponibles:</strong> {limitData.availableDates?.length || 0}
                    </div>
                    <details>
                      <summary style={{ cursor: 'pointer', color: '#0070f3', fontWeight: 'bold' }}>Voir les détails complets</summary>
                      <pre style={{ background: '#fff', padding: '10px', borderRadius: '5px', overflow: 'auto', maxHeight: '400px', fontSize: '11px', marginTop: '10px' }}>
                        {JSON.stringify(limitData, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#999' }}>❌ Aucune donnée de limites disponible</p>
            )}
          </div>

          {/* Prices */}
          <div style={{ marginBottom: '30px', border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
            <h2 style={{ marginTop: 0, color: '#333' }}>
              4. Load Prices (loadPrices/{info.t_id}/date) - {Object.keys(info.prices).length} dates
            </h2>
            {Object.keys(info.prices).length > 0 ? (
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5' }}>
                      <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Type</th>
                      <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Adult</th>
                      <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Child</th>
                      <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Infant</th>
                      <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(info.prices).map(([date, priceData]) => (
                      <tr key={date}>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{date}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{priceData.type || 'N/A'}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{priceData.adultPrice ?? 'N/A'}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{priceData.childPrice ?? 'N/A'}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{priceData.infantPrice ?? 'N/A'}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd', color: priceData.ok ? '#0f0' : '#f00' }}>
                          {priceData.ok ? '✅' : '❌'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <details>
                  <summary style={{ cursor: 'pointer', color: '#0070f3', fontWeight: 'bold' }}>Voir les données brutes complètes</summary>
                  <pre style={{ background: '#f5f5f5', padding: '15px', borderRadius: '5px', overflow: 'auto', maxHeight: '500px', fontSize: '11px', marginTop: '10px' }}>
                    {JSON.stringify(info.prices, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <p style={{ color: '#999' }}>❌ Aucune donnée de prix disponible</p>
            )}
          </div>

          {/* Export JSON */}
          <div style={{ marginTop: '30px', padding: '15px', background: '#e7f3ff', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0 }}>💾 Export JSON Complet</h3>
            <button
              onClick={() => {
                const json = JSON.stringify(info, null, 2)
                const blob = new Blob([json], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `t_id_${info.t_id}_${info.lang}_complete_info.json`
                a.click()
                URL.revokeObjectURL(url)
              }}
              style={{
                padding: '10px 20px',
                background: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              📥 Télécharger JSON Complet
            </button>
          </div>
        </div>
      )}
    </div>
  )
}





