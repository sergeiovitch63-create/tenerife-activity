'use client'

import { useEffect, useState } from 'react'

interface Classification {
  id: string | number
  code: string
  name: string
}

interface GroupDetailsData {
  groupId: string
  groupCode: string
  groupName: string
  rawData: any
  allKeys: string[]
  imageFields: Array<{ key: string; value: any }>
  eventIds: string[]
  eventCodes: string[]
  error?: string
  status: 'loading' | 'success' | 'error'
}

export default function DebugClassificationsPage() {
  const [classifications, setClassifications] = useState<Classification[]>([])
  const [selectedClassification, setSelectedClassification] = useState<string | null>(null)
  const [groups, setGroups] = useState<GroupDetailsData[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Load classifications
  useEffect(() => {
    const fetchClassifications = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/atlantico/backoffice?lang=ENG&fresh=1')
        if (!response.ok) {
          throw new Error('Failed to fetch backoffice data')
        }
        const data = await response.json()

        const classificationsList: Classification[] = (data.classifications || []).map((c: any) => ({
          id: c.id || c.code || '',
          code: c.code || String(c.id) || '',
          name: c.name || 'Sans nom',
        }))

        setClassifications(classificationsList)
        console.log('[DEBUG_CLASSIFICATIONS] Loaded', classificationsList.length, 'classifications')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchClassifications()
  }, [])

  // Load groups for selected classification
  const loadGroupsForClassification = async (classificationId: string) => {
    try {
      setLoadingGroups(true)
      setError(null)
      setSelectedClassification(classificationId)

      // Use dedicated API endpoint for better performance
      const response = await fetch(`/api/debug/classification-groups?classificationId=${classificationId}&lang=ENG`)
      if (!response.ok) {
        throw new Error('Failed to fetch classification groups')
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
        error: group.error,
        status: group.status,
      }))

      setGroups(groupsData)
      console.log('[DEBUG_CLASSIFICATIONS] Loaded', {
        total: groupsData.length,
        success: data.summary.successGroups,
        errors: data.summary.errorGroups,
        withImages: data.summary.groupsWithImage,
        summary: data.summary,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoadingGroups(false)
    }
  }

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
        <h1>Chargement des classifications...</h1>
      </div>
    )
  }

  if (error && !selectedClassification) {
    return (
      <div style={{ padding: '40px' }}>
        <h1 style={{ color: '#c33' }}>Erreur</h1>
        <p>{error}</p>
      </div>
    )
  }

  const selectedClassificationData = classifications.find(c => String(c.id) === selectedClassification)

  return (
    <div style={{ padding: '40px', maxWidth: '1600px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '10px' }}>Debug: Classifications et GroupDetails</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Sélectionne une classification pour voir tous ses groups et leurs groupDetails
      </p>

      {/* Classifications List */}
      <div style={{ marginBottom: '30px' }}>
        <h2>Classifications ({classifications.length})</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px', marginTop: '15px' }}>
          {classifications.map((classification) => {
            const isSelected = selectedClassification === String(classification.id)
            return (
              <button
                key={String(classification.id)}
                onClick={() => loadGroupsForClassification(String(classification.id))}
                style={{
                  padding: '20px',
                  background: isSelected ? '#4caf50' : '#e3f2fd',
                  color: isSelected ? 'white' : '#333',
                  border: `2px solid ${isSelected ? '#4caf50' : '#2196f3'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = '#bbdefb'
                  }
                }}
                onMouseOut={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = '#e3f2fd'
                  }
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                  {classification.name}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                  ID: {classification.id} | Code: {classification.code}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Classification Groups */}
      {selectedClassification && (
        <div style={{ marginTop: '40px' }}>
          {loadingGroups ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <p>Chargement des groups pour "{selectedClassificationData?.name}"...</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '20px', padding: '15px', background: '#e8f5e9', borderRadius: '8px' }}>
                <h2>
                  Classification: {selectedClassificationData?.name} (ID: {selectedClassification})
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '15px' }}>
                  <div>
                    <strong>Total Groups:</strong> {groups.length}
                  </div>
                  <div>
                    <strong>Réussis:</strong> {groups.filter(g => g.status === 'success').length}
                  </div>
                  <div>
                    <strong>Erreurs:</strong> {groups.filter(g => g.status === 'error').length}
                  </div>
                  <div>
                    <strong>Avec images:</strong> {groups.filter(g => g.imageFields.length > 0).length}
                  </div>
                </div>
              </div>

              {/* Groups List */}
              <div style={{ display: 'grid', gap: '20px' }}>
                {groups.map((group) => {
                  const isExpanded = expandedGroups.has(group.groupId)
                  const hasImage = group.imageFields.length > 0
                  const hasError = group.status === 'error'

                  return (
                    <div
                      key={group.groupId}
                      style={{
                        border: `2px solid ${hasError ? '#f44336' : hasImage ? '#4caf50' : '#ddd'}`,
                        borderRadius: '8px',
                        padding: '20px',
                        background: hasError ? '#ffebee' : hasImage ? '#f1f8f4' : '#fff',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <div>
                          <h3 style={{ margin: 0, marginBottom: '5px' }}>
                            Group {group.groupCode} (ID: {group.groupId})
                            {hasError && <span style={{ color: '#f44336', marginLeft: '10px' }}>❌ Erreur</span>}
                            {!hasError && hasImage && <span style={{ color: '#4caf50', marginLeft: '10px' }}>✅ Image</span>}
                          </h3>
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
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                        {hasError && (
                          <div style={{ padding: '10px', background: '#ffcdd2', borderRadius: '5px' }}>
                            <strong>❌ Erreur:</strong>
                            <div style={{ fontSize: '12px', marginTop: '5px', color: '#c33' }}>
                              {group.error}
                            </div>
                          </div>
                        )}

                        {hasImage && (
                          <div style={{ padding: '10px', background: '#c8e6c9', borderRadius: '5px' }}>
                            <strong>📷 Images:</strong>
                            {group.imageFields.map((field, idx) => (
                              <div key={idx} style={{ fontSize: '12px', marginTop: '5px' }}>
                                <code>{field.key}</code>: {String(field.value).substring(0, 50)}
                                {String(field.value).length > 50 ? '...' : ''}
                              </div>
                            ))}
                          </div>
                        )}

                        {(group.eventIds.length > 0 || group.eventCodes.length > 0) && (
                          <div style={{ padding: '10px', background: '#e3f2fd', borderRadius: '5px' }}>
                            <strong>🎯 Events:</strong>
                            <div style={{ fontSize: '12px', marginTop: '5px' }}>
                              {group.eventIds.length > 0 && (
                                <div>IDs: {group.eventIds.join(', ')}</div>
                              )}
                              {group.eventCodes.length > 0 && (
                                <div>Codes: {group.eventCodes.join(', ')}</div>
                              )}
                            </div>
                          </div>
                        )}

                        <div style={{ padding: '10px', background: '#fff3cd', borderRadius: '5px' }}>
                          <strong>📋 Champs:</strong> {group.allKeys.length}
                        </div>
                      </div>

                      {/* Expanded View */}
                      {isExpanded && (
                        <div style={{ marginTop: '20px', borderTop: '2px solid #ddd', paddingTop: '20px' }}>
                          <h4 style={{ marginBottom: '15px' }}>Détails complets:</h4>

                          {/* All Keys */}
                          <div style={{ marginBottom: '20px' }}>
                            <h5>Tous les champs ({group.allKeys.length}):</h5>
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
                              <h5>Champs d'images:</h5>
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

                          {/* Full JSON */}
                          {group.rawData && (
                            <div style={{ marginTop: '20px' }}>
                              <h5>Données complètes (JSON):</h5>
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
                          )}

                          {!group.rawData && hasError && (
                            <div style={{ padding: '15px', background: '#ffcdd2', borderRadius: '5px' }}>
                              <strong>Erreur:</strong> {group.error}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

