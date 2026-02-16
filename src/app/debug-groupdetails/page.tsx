'use client'

import { useEffect, useState } from 'react'

interface GroupDetailsData {
  groupId: string
  groupCode: string
  groupName: string
  rawData: any
  allKeys: string[]
  imageFields: Array<{ key: string; value: any }>
  eventIds: string[]
  eventCodes: string[]
}

export default function DebugGroupDetailsPage() {
  const [groups, setGroups] = useState<GroupDetailsData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchAllGroupDetails = async () => {
      try {
        setLoading(true)
        setError(null)

        // Use server-side API for better performance
        const response = await fetch('/api/debug/all-groupdetails')
        if (!response.ok) {
          throw new Error('Failed to fetch groupDetails')
        }
        const data = await response.json()

        // Convert API response to component format
        const groupsData: GroupDetailsData[] = data.groups.map((group: any) => ({
          groupId: group.groupId,
          groupCode: group.groupCode,
          groupName: group.groupName,
          rawData: group.rawData,
          allKeys: group.allKeys,
          imageFields: group.imageFields.map((f: any) => ({ key: f.key, value: f.value })),
          eventIds: group.eventIds,
          eventCodes: group.eventCodes,
        }))

        setGroups(groupsData)
        
        // Store stats in window for display
        if (data.summary?.backofficeStats) {
          (window as any).__backofficeStats = data.summary.backofficeStats
        }
        
        console.log('[DEBUG_GROUPDETAILS] Loaded groups:', {
          total: groupsData.length,
          summary: data.summary,
          classifications: data.summary?.backofficeStats?.classifications || 0,
          allUniqueKeys: data.summary?.allUniqueKeys?.length || 0,
          commonKeys: data.summary?.commonKeys?.length || 0,
        })
        
        // Log warning if we have very few groups
        if (groupsData.length < 50) {
          console.warn('[DEBUG_GROUPDETAILS] ⚠️ Only', groupsData.length, 'groups found. Expected many more.')
          console.warn('[DEBUG_GROUPDETAILS] Backoffice stats:', data.summary?.backofficeStats)
          console.warn('[DEBUG_GROUPDETAILS] Check if all classifications are being fetched from /clasificationList endpoint')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        console.error('[DEBUG_GROUPDETAILS] Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAllGroupDetails()
  }, [])

  const toggleExpand = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>Chargement de tous les groupDetails...</h1>
        <p>Récupération de tous les tours et leurs détails complets...</p>
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

  const selectedGroupData = selectedGroup ? groups.find(g => g.groupId === selectedGroup) : null

  return (
    <div style={{ padding: '40px', maxWidth: '1600px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '10px' }}>Debug: Tous les GroupDetails</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Total: {groups.length} groups | 
        Groups avec images: {groups.filter(g => g.imageFields.length > 0).length} |
        Groups avec events: {groups.filter(g => g.eventIds.length > 0 || g.eventCodes.length > 0).length}
      </p>

      {/* Summary */}
      <div style={{ marginBottom: '30px', padding: '20px', background: '#e3f2fd', borderRadius: '8px' }}>
        <h2>Résumé</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '15px' }}>
          <div>
            <strong>Total Groups:</strong> {groups.length}
            {groups.length < 50 && (
              <span style={{ color: '#f44336', marginLeft: '10px' }}>⚠️ Peu de groups!</span>
            )}
          </div>
          <div>
            <strong>Avec champ "image":</strong> {groups.filter(g => g.imageFields.some(f => f.key === 'image')).length}
          </div>
          <div>
            <strong>Avec event IDs:</strong> {groups.filter(g => g.eventIds.length > 0).length}
          </div>
          <div>
            <strong>Avec event Codes:</strong> {groups.filter(g => g.eventCodes.length > 0).length}
          </div>
        </div>
        
        {/* Backoffice Stats */}
        <div style={{ marginTop: '20px', padding: '15px', background: '#fff3cd', borderRadius: '5px' }}>
          <h3>Statistiques Backoffice API:</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '10px', fontSize: '14px' }}>
            <div>
              <strong>Classifications:</strong> {(() => {
                // Try to get from API response if available
                const stats = (window as any).__backofficeStats
                return stats?.classifications || 'N/A'
              })()}
            </div>
            <div>
              <strong>Groups par Classification:</strong> {(() => {
                const stats = (window as any).__backofficeStats
                return stats?.groupsByClassification || 'N/A'
              })()}
            </div>
            <div>
              <strong>Total Groups dans Classifications:</strong> {(() => {
                const stats = (window as any).__backofficeStats
                return stats?.totalGroupsInClassifications || 'N/A'
              })()}
            </div>
            <div>
              <strong>GroupDetails récupérés:</strong> {(() => {
                const stats = (window as any).__backofficeStats
                return stats?.groupDetailsCount || groups.length
              })()}
            </div>
          </div>
          <div style={{ marginTop: '15px', padding: '10px', background: '#fff', borderRadius: '4px', fontSize: '12px' }}>
            <strong>Note:</strong> Si tu vois peu de groups, vérifie que l'API backoffice récupère bien toutes les classifications.
            <br />
            Essaie d'ouvrir: <code>/api/atlantico/backoffice?lang=ENG&fresh=1</code> pour voir les totaux.
          </div>
        </div>
        
        {/* Common Fields */}
        {groups.length > 0 && (
          <div style={{ marginTop: '20px', padding: '15px', background: '#fff3cd', borderRadius: '5px' }}>
            <h3>Champs communs à tous les groups:</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '10px' }}>
              {(() => {
                const commonKeys = groups[0].allKeys.filter(key => 
                  groups.every(g => g.allKeys.includes(key))
                )
                return commonKeys.map(key => (
                  <span
                    key={key}
                    style={{
                      padding: '4px 8px',
                      background: '#4caf50',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {key}
                  </span>
                ))
              })()}
            </div>
          </div>
        )}

        {/* All Unique Keys */}
        {groups.length > 0 && (
          <div style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '5px' }}>
            <h3>Tous les champs uniques trouvés ({(() => {
              const allKeys = new Set(groups.flatMap(g => g.allKeys))
              return allKeys.size
            })()}):</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '10px', maxHeight: '200px', overflowY: 'auto' }}>
              {(() => {
                const allKeys = Array.from(new Set(groups.flatMap(g => g.allKeys))).sort()
                return allKeys.map(key => (
                  <span
                    key={key}
                    style={{
                      padding: '4px 8px',
                      background: '#e0e0e0',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {key}
                  </span>
                ))
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Groups List */}
      <div style={{ display: 'grid', gap: '20px' }}>
        {groups.map((group) => {
          const isExpanded = expandedGroups.has(group.groupId)
          const hasImage = group.imageFields.length > 0
          const hasEvents = group.eventIds.length > 0 || group.eventCodes.length > 0

          return (
            <div
              key={group.groupId}
              style={{
                border: `2px solid ${hasImage ? '#4caf50' : hasEvents ? '#2196f3' : '#ddd'}`,
                borderRadius: '8px',
                padding: '20px',
                background: hasImage ? '#f1f8f4' : hasEvents ? '#e3f2fd' : '#fff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div>
                  <h2 style={{ margin: 0, marginBottom: '5px' }}>
                    Group {group.groupCode} (ID: {group.groupId})
                  </h2>
                  <p style={{ margin: 0, color: '#666' }}>{group.groupName}</p>
                </div>
                <button
                  onClick={() => toggleExpand(group.groupId)}
                  style={{
                    padding: '8px 16px',
                    background: isExpanded ? '#f44336' : '#4caf50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                  }}
                >
                  {isExpanded ? 'Réduire' : 'Voir tout'}
                </button>
              </div>

              {/* Quick Info */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                {hasImage && (
                  <div style={{ padding: '10px', background: '#e8f5e9', borderRadius: '5px' }}>
                    <strong>📷 Images:</strong>
                    {group.imageFields.map((field, idx) => (
                      <div key={idx} style={{ fontSize: '12px', marginTop: '5px' }}>
                        <code>{field.key}</code>: {String(field.value).substring(0, 50)}
                        {String(field.value).length > 50 ? '...' : ''}
                      </div>
                    ))}
                  </div>
                )}

                {hasEvents && (
                  <div style={{ padding: '10px', background: '#e3f2fd', borderRadius: '5px' }}>
                    <strong>🎯 Events:</strong>
                    <div style={{ fontSize: '12px', marginTop: '5px' }}>
                      IDs: {group.eventIds.length > 0 ? group.eventIds.join(', ') : 'Aucun'}
                      {group.eventCodes.length > 0 && (
                        <>
                          <br />
                          Codes: {group.eventCodes.join(', ')}
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ padding: '10px', background: '#fff3cd', borderRadius: '5px' }}>
                  <strong>📋 Total champs:</strong> {group.allKeys.length}
                </div>
              </div>

              {/* Expanded View */}
              {isExpanded && (
                <div style={{ marginTop: '20px', borderTop: '2px solid #ddd', paddingTop: '20px' }}>
                  <h3 style={{ marginBottom: '15px' }}>Tous les champs (structure complète):</h3>
                  
                  {/* All Keys */}
                  <div style={{ marginBottom: '20px' }}>
                    <h4>Liste de tous les champs ({group.allKeys.length}):</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '10px' }}>
                      {group.allKeys.map(key => (
                        <span
                          key={key}
                          style={{
                            padding: '4px 8px',
                            background: '#f5f5f5',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                          }}
                        >
                          {key}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Image Fields Detail */}
                  {group.imageFields.length > 0 && (
                    <div style={{ marginBottom: '20px', padding: '15px', background: '#e8f5e9', borderRadius: '5px' }}>
                      <h4>Champs d'images ({group.imageFields.length}):</h4>
                      {group.imageFields.map((field, idx) => (
                        <div key={idx} style={{ marginTop: '10px', padding: '10px', background: 'white', borderRadius: '4px' }}>
                          <strong>Champ:</strong> <code>{field.key}</code>
                          <div style={{ marginTop: '5px', fontSize: '12px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                            <strong>Valeur:</strong> {JSON.stringify(field.value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Events Detail */}
                  {(group.eventIds.length > 0 || group.eventCodes.length > 0) && (
                    <div style={{ marginBottom: '20px', padding: '15px', background: '#e3f2fd', borderRadius: '5px' }}>
                      <h4>Events associés:</h4>
                      {group.eventIds.length > 0 && (
                        <div style={{ marginTop: '10px' }}>
                          <strong>IDs (depuis ids):</strong>
                          <div style={{ fontSize: '12px', fontFamily: 'monospace', marginTop: '5px' }}>
                            {group.eventIds.join(', ')}
                          </div>
                        </div>
                      )}
                      {group.eventCodes.length > 0 && (
                        <div style={{ marginTop: '10px' }}>
                          <strong>Codes (depuis events[]):</strong>
                          <div style={{ fontSize: '12px', fontFamily: 'monospace', marginTop: '5px' }}>
                            {group.eventCodes.join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Full JSON */}
                  <div style={{ marginTop: '20px' }}>
                    <h4>Données complètes (JSON):</h4>
                    <pre
                      style={{
                        background: '#f5f5f5',
                        padding: '15px',
                        borderRadius: '5px',
                        overflow: 'auto',
                        maxHeight: '600px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                      }}
                    >
                      {JSON.stringify(group.rawData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {groups.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
          <p>Aucun group trouvé</p>
        </div>
      )}
    </div>
  )
}

