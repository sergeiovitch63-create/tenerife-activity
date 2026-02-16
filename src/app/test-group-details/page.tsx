'use client'

/**
 * Page de diagnostic pour visualiser groupDetails et vérifier t_group / t_id
 * 
 * Permet de:
 * 1. Voir les détails d'un t_group
 * 2. Voir tous les t_id dans un t_group
 * 3. Vérifier si un t_id appartient à un t_group
 * 4. Trouver le t_group d'un t_id
 */

import { useState } from 'react'

interface GroupDetails {
  ids?: string | string[]
  group?: string
  name?: string
  [key: string]: any
}

interface EventDetails {
  id?: string
  code?: string
  name?: string
  group?: string
  groups?: string
  groupId?: string
  t_group?: string
  [key: string]: any
}

export default function TestGroupDetailsPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Mode: 'by-group' ou 'by-event'
  const [mode, setMode] = useState<'by-group' | 'by-event'>('by-group')
  
  // Inputs
  const [tGroup, setTGroup] = useState('31')
  const [tId, setTId] = useState('509')
  const [lang, setLang] = useState('ENG')
  
  // Results
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null)
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null)
  const [eventIds, setEventIds] = useState<string[]>([])
  const [matchingGroups, setMatchingGroups] = useState<string[]>([])
  
  // Logs
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
    console.log(`[GROUP_DETAILS_TEST] ${message}`)
  }

  // Récupérer groupDetails pour un t_group
  const fetchGroupDetails = async () => {
    if (!tGroup) {
      setError('t_group est requis')
      return
    }
    
    setLoading(true)
    setError(null)
    setGroupDetails(null)
    setEventIds([])
    addLog(`🔍 Récupération groupDetails pour t_group=${tGroup}, lang=${lang}`)
    
    try {
      const response = await fetch(`/api/atlantico/group/${tGroup}/${lang}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setGroupDetails(data)
      addLog(`✅ GroupDetails récupéré avec succès`)
      
      // Extraire les event IDs
      const ids = data.ids
      let extractedIds: string[] = []
      
      if (ids) {
        if (Array.isArray(ids)) {
          extractedIds = ids.map((id: any) => String(id).trim()).filter(Boolean)
        } else {
          const idsStr = String(ids)
          extractedIds = idsStr.split(',').map((id: string) => id.trim()).filter(Boolean)
        }
      }
      
      setEventIds(extractedIds)
      addLog(`📋 Event IDs extraits: ${extractedIds.length} événements trouvés`)
      addLog(`📋 Liste: ${extractedIds.join(', ')}`)
      
      // Vérifier si t_id est dans la liste
      if (tId && extractedIds.includes(tId)) {
        addLog(`✅ t_id ${tId} TROUVÉ dans ce t_group ${tGroup}`)
      } else if (tId) {
        addLog(`❌ t_id ${tId} NON TROUVÉ dans ce t_group ${tGroup}`)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      setError(`Erreur: ${errorMsg}`)
      addLog(`❌ Erreur: ${errorMsg}`)
    } finally {
      setLoading(false)
    }
  }

  // Récupérer eventDetails pour un t_id et trouver son t_group
  const fetchEventDetails = async () => {
    if (!tId) {
      setError('t_id est requis')
      return
    }
    
    setLoading(true)
    setError(null)
    setEventDetails(null)
    setMatchingGroups([])
    addLog(`🔍 Récupération eventDetails pour t_id=${tId}, lang=${lang}`)
    
    try {
      const response = await fetch(`/api/atlantico/event/${tId}/${lang}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setEventDetails(data)
      addLog(`✅ EventDetails récupéré avec succès`)
      
      // Extraire t_group depuis eventDetails
      const eventGroup = data.group || data.groups || data.groupId || data.t_group || null
      if (eventGroup) {
        const groups = Array.isArray(eventGroup) ? eventGroup : [String(eventGroup)]
        setMatchingGroups(groups)
        addLog(`📋 t_group trouvé depuis eventDetails: ${groups.join(', ')}`)
        
        // Vérifier si le t_group fourni correspond
        if (tGroup && groups.includes(String(tGroup))) {
          addLog(`✅ t_group ${tGroup} CORRESPOND au t_id ${tId}`)
        } else if (tGroup) {
          addLog(`❌ t_group ${tGroup} NE CORRESPOND PAS au t_id ${tId}`)
          addLog(`💡 t_group attendu: ${groups.join(', ')}`)
        }
      } else {
        addLog(`⚠️ Aucun t_group trouvé dans eventDetails`)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      setError(`Erreur: ${errorMsg}`)
      addLog(`❌ Erreur: ${errorMsg}`)
    } finally {
      setLoading(false)
    }
  }

  // Vérifier la correspondance t_group / t_id
  const verifyMatch = async () => {
    if (!tGroup || !tId) {
      setError('t_group et t_id sont requis')
      return
    }
    
    setLoading(true)
    setError(null)
    addLog(`🔍 Vérification correspondance: t_group=${tGroup} / t_id=${tId}`)
    
    try {
      // 1. Récupérer groupDetails
      const groupResponse = await fetch(`/api/atlantico/group/${tGroup}/${lang}`)
      if (!groupResponse.ok) {
        throw new Error(`GroupDetails HTTP ${groupResponse.status}`)
      }
      const groupData = await groupResponse.json()
      
      // Extraire event IDs
      const ids = groupData.ids
      let extractedIds: string[] = []
      if (ids) {
        if (Array.isArray(ids)) {
          extractedIds = ids.map((id: any) => String(id).trim()).filter(Boolean)
        } else {
          extractedIds = String(ids).split(',').map((id: string) => id.trim()).filter(Boolean)
        }
      }
      
      addLog(`📋 Event IDs dans t_group ${tGroup}: ${extractedIds.join(', ')}`)
      
      // 2. Récupérer eventDetails
      const eventResponse = await fetch(`/api/atlantico/event/${tId}/${lang}`)
      if (!eventResponse.ok) {
        throw new Error(`EventDetails HTTP ${eventResponse.status}`)
      }
      const eventData = await eventResponse.json()
      
      const eventGroup = eventData.group || eventData.groups || eventData.groupId || eventData.t_group || null
      addLog(`📋 t_group dans eventDetails: ${eventGroup || 'non trouvé'}`)
      
      // 3. Vérifier correspondance
      const isInGroup = extractedIds.includes(tId)
      const groupMatches = eventGroup && (String(eventGroup) === String(tGroup) || (Array.isArray(eventGroup) && eventGroup.includes(String(tGroup))))
      
      if (isInGroup && groupMatches) {
        addLog(`✅ CORRESPONDANCE CONFIRMÉE: t_id ${tId} appartient bien à t_group ${tGroup}`)
      } else if (isInGroup && !groupMatches) {
        addLog(`⚠️ PARTIELLEMENT CORRECT: t_id ${tId} est dans groupDetails.ids mais eventDetails.group=${eventGroup}`)
      } else if (!isInGroup && groupMatches) {
        addLog(`⚠️ PARTIELLEMENT CORRECT: eventDetails.group=${eventGroup} mais t_id ${tId} n'est pas dans groupDetails.ids`)
      } else {
        addLog(`❌ AUCUNE CORRESPONDANCE: t_id ${tId} n'appartient PAS à t_group ${tGroup}`)
        if (eventGroup) {
          addLog(`💡 t_group correct pour t_id ${tId}: ${eventGroup}`)
        }
        if (extractedIds.length > 0) {
          addLog(`💡 t_id corrects pour t_group ${tGroup}: ${extractedIds.join(', ')}`)
        }
      }
      
      setGroupDetails(groupData)
      setEventDetails(eventData)
      setEventIds(extractedIds)
      if (eventGroup) {
        setMatchingGroups(Array.isArray(eventGroup) ? eventGroup : [String(eventGroup)])
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      setError(`Erreur: ${errorMsg}`)
      addLog(`❌ Erreur: ${errorMsg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>🔍 Diagnostic GroupDetails / EventDetails</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Vérifiez la correspondance entre t_group et t_id selon l'API Atlantico
      </p>
      
      <div style={{ marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>Configuration</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div>
            <label><strong>t_group:</strong></label>
            <input 
              type="text" 
              value={tGroup} 
              onChange={(e) => setTGroup(e.target.value)}
              placeholder="31"
              style={{ width: '100%', padding: '8px', fontSize: '14px' }}
            />
          </div>
          <div>
            <label><strong>t_id:</strong></label>
            <input 
              type="text" 
              value={tId} 
              onChange={(e) => setTId(e.target.value)}
              placeholder="509"
              style={{ width: '100%', padding: '8px', fontSize: '14px' }}
            />
          </div>
          <div>
            <label><strong>Lang:</strong></label>
            <select 
              value={lang} 
              onChange={(e) => setLang(e.target.value)}
              style={{ width: '100%', padding: '8px', fontSize: '14px' }}
            >
              <option value="ENG">ENG</option>
              <option value="ESP">ESP</option>
              <option value="FRA">FRA</option>
            </select>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={fetchGroupDetails}
            disabled={loading}
            style={{ padding: '10px 20px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            📋 Voir GroupDetails
          </button>
          <button 
            onClick={fetchEventDetails}
            disabled={loading}
            style={{ padding: '10px 20px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            🎯 Voir EventDetails
          </button>
          <button 
            onClick={verifyMatch}
            disabled={loading}
            style={{ padding: '10px 20px', background: '#FF9800', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✅ Vérifier Correspondance
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '15px', background: '#fee', color: '#c00', borderRadius: '8px', marginBottom: '20px' }}>
          <strong>Erreur:</strong> {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div style={{ padding: '15px', background: '#e3f2fd', borderRadius: '8px' }}>
          <h3>📋 GroupDetails (t_group={tGroup})</h3>
          {groupDetails ? (
            <div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Event IDs (ids):</strong>
                {eventIds.length > 0 ? (
                  <div style={{ marginTop: '5px', padding: '10px', background: 'white', borderRadius: '5px' }}>
                    {eventIds.map((id, i) => (
                      <span 
                        key={i}
                        style={{
                          display: 'inline-block',
                          padding: '5px 10px',
                          margin: '2px',
                          background: id === tId ? '#4CAF50' : '#f0f0f0',
                          color: id === tId ? 'white' : 'black',
                          borderRadius: '3px',
                          fontWeight: id === tId ? 'bold' : 'normal'
                        }}
                      >
                        {id}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#f00' }}>Aucun event ID trouvé</div>
                )}
              </div>
              <details style={{ marginTop: '10px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Voir tout GroupDetails</summary>
                <pre style={{ background: 'white', padding: '10px', borderRadius: '5px', overflow: 'auto', maxHeight: '300px', fontSize: '12px' }}>
                  {JSON.stringify(groupDetails, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <div style={{ color: '#999' }}>Cliquez sur "Voir GroupDetails" pour charger les données</div>
          )}
        </div>

        <div style={{ padding: '15px', background: '#f1f8e9', borderRadius: '8px' }}>
          <h3>🎯 EventDetails (t_id={tId})</h3>
          {eventDetails ? (
            <div>
              <div style={{ marginBottom: '10px' }}>
                <strong>t_group trouvé:</strong>
                {matchingGroups.length > 0 ? (
                  <div style={{ marginTop: '5px', padding: '10px', background: 'white', borderRadius: '5px' }}>
                    {matchingGroups.map((g, i) => (
                      <span 
                        key={i}
                        style={{
                          display: 'inline-block',
                          padding: '5px 10px',
                          margin: '2px',
                          background: g === tGroup ? '#4CAF50' : '#f0f0f0',
                          color: g === tGroup ? 'white' : 'black',
                          borderRadius: '3px',
                          fontWeight: g === tGroup ? 'bold' : 'normal'
                        }}
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#f00' }}>Aucun t_group trouvé</div>
                )}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Nom:</strong> {eventDetails.name || eventDetails.code || 'N/A'}
              </div>
              <details style={{ marginTop: '10px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Voir tout EventDetails</summary>
                <pre style={{ background: 'white', padding: '10px', borderRadius: '5px', overflow: 'auto', maxHeight: '300px', fontSize: '12px' }}>
                  {JSON.stringify(eventDetails, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <div style={{ color: '#999' }}>Cliquez sur "Voir EventDetails" pour charger les données</div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h2>📝 Logs</h2>
        <div style={{ background: '#000', color: '#0f0', padding: '15px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px', maxHeight: '400px', overflow: 'auto' }}>
          {logs.length === 0 ? (
            <div style={{ color: '#888' }}>Aucun log pour le moment...</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} style={{ marginBottom: '5px', whiteSpace: 'pre-wrap' }}>{log}</div>
            ))
          )}
        </div>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', background: '#fff3cd', borderRadius: '8px' }}>
        <h3>💡 Comment utiliser cette page</h3>
        <ol style={{ lineHeight: '1.8' }}>
          <li><strong>Voir GroupDetails:</strong> Entrez un t_group et voyez tous les t_id qu'il contient</li>
          <li><strong>Voir EventDetails:</strong> Entrez un t_id et voyez à quel(s) t_group(s) il appartient</li>
          <li><strong>Vérifier Correspondance:</strong> Vérifie si le t_id appartient bien au t_group (vérifie les deux sens)</li>
        </ol>
        <p style={{ marginTop: '10px', fontWeight: 'bold' }}>
          ✅ Vert = Correspondance trouvée<br/>
          ❌ Rouge = Pas de correspondance<br/>
          💡 Suggestions = Alternatives possibles
        </p>
      </div>
    </div>
  )
}





