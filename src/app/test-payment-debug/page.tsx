'use client'

/**
 * Page de diagnostic complète pour identifier pourquoi /payment/ retourne -1
 * Teste TOUTES les combinaisons possibles
 */

import { useState } from 'react'

export default function TestPaymentDebugPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  
  const [config, setConfig] = useState({
    userId: '3645',
    t_id: '509',
    t_group: '55',
    language: 'ENG',
    tourDate: '20260217',
    sesTime: '',
    adults: '1',
    childs: '0',
    infants: '0',
    name: 'Test User',
    email: 'test@example.com',
    phone: '+1234567890',
  })

  const testCombination = async (variant: string, params: Record<string, string>) => {
    setLoading(true)
    
    try {
      const formData = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value && value !== '') {
          formData.append(key, value)
        }
      })
      
      const response = await fetch('/api/atlantico/booking/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        },
        body: formData.toString(),
      })
      
      const contentType = response.headers.get('content-type') || ''
      let result: any
      
      if (contentType.includes('text/html')) {
        const html = await response.text()
        result = {
          variant,
          status: response.status,
          type: 'html',
          isError: html.trim() === '-1',
          bodyLength: html.length,
          preview: html.substring(0, 200),
        }
      } else {
        result = await response.json()
        result.variant = variant
        result.status = response.status
      }
      
      setResults(prev => [...prev, result])
      return result
    } catch (error) {
      const result = {
        variant,
        error: error instanceof Error ? error.message : String(error),
      }
      setResults(prev => [...prev, result])
      return result
    } finally {
      setLoading(false)
    }
  }

  const runAllTests = async () => {
    setResults([])
    
    const baseParams = {
      userId: config.userId,
      t_id: config.t_id,
      t_group: config.t_group,
      language: config.language,
      tourDate: config.tourDate,
      adults: config.adults,
      childs: config.childs,
      infants: config.infants,
      name: config.name,
      email: config.email,
      phone: config.phone,
    }
    
    // Test 1: Sans sesTime
    await testCombination('1. Sans sesTime', baseParams)
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Test 2: Avec sesTime=00:00
    await testCombination('2. Avec sesTime=00:00', { ...baseParams, sesTime: '00:00' })
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Test 3: Date au format YYYY-MM-DD
    await testCombination('3. Date YYYY-MM-DD', { ...baseParams, tourDate: '2026-02-17' })
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Test 4: Sans tourDate (on-request)
    await testCombination('4. Sans tourDate (on-request)', { ...baseParams, tourDate: '', sesTime: '' })
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Test 5: Avec t_group depuis eventDetails (si différent)
    // On va d'abord récupérer eventDetails
    try {
      const eventRes = await fetch(`/api/atlantico/event/${config.t_id}/${config.language}`)
      if (eventRes.ok) {
        const eventData = await eventRes.json()
        const eventGroup = eventData.group || eventData.groups || eventData.groupId
        if (eventGroup && eventGroup !== config.t_group) {
          await testCombination(`5. Avec t_group=${eventGroup} (depuis eventDetails)`, { ...baseParams, t_group: String(eventGroup) })
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    } catch (e) {
      // Ignore
    }
    
    // Test 6: Date plus proche (aujourd'hui + 3 jours)
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 3)
    const futureDateStr = futureDate.toISOString().split('T')[0].replace(/-/g, '')
    await testCombination(`6. Date proche (${futureDateStr})`, { ...baseParams, tourDate: futureDateStr })
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>🔍 Diagnostic Complet Paiement Atlantico</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Teste toutes les combinaisons possibles pour identifier pourquoi /payment/ retourne -1
      </p>
      
      <div style={{ marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>Configuration</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          {Object.entries(config).map(([key, value]) => (
            <div key={key}>
              <label><strong>{key}:</strong></label>
              <input 
                type="text" 
                value={value} 
                onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                style={{ width: '100%', padding: '8px', fontSize: '14px' }}
              />
            </div>
          ))}
        </div>
        
        <button 
          onClick={runAllTests}
          disabled={loading}
          style={{ padding: '15px 30px', background: '#f44336', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
        >
          {loading ? '⏳ Tests en cours...' : '🚀 Lancer Tous les Tests'}
        </button>
      </div>

      {results.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h2>Résultats ({results.length} tests)</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {results.map((result, i) => (
              <div 
                key={i}
                style={{ 
                  padding: '15px', 
                  background: result.isError || result.ok === false ? '#fee' : '#efe', 
                  borderRadius: '8px',
                  border: result.isError || result.ok === false ? '2px solid #f00' : '2px solid #0f0'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
                  {result.variant}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                  <div>Status: {result.status}</div>
                  {result.type && <div>Type: {result.type}</div>}
                  {result.isError !== undefined && (
                    <div style={{ color: result.isError ? '#f00' : '#0f0', fontWeight: 'bold' }}>
                      {result.isError ? '❌ ERREUR (-1)' : '✅ SUCCÈS'}
                    </div>
                  )}
                  {result.ok !== undefined && (
                    <div style={{ color: result.ok ? '#0f0' : '#f00', fontWeight: 'bold' }}>
                      {result.ok ? '✅ SUCCÈS' : '❌ ERREUR'}
                    </div>
                  )}
                  {result.reason && <div>Reason: {result.reason}</div>}
                  {result.preview && (
                    <details style={{ marginTop: '10px' }}>
                      <summary>Preview</summary>
                      <pre style={{ background: '#fff', padding: '10px', borderRadius: '5px', overflow: 'auto', maxHeight: '200px' }}>
                        {result.preview}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: '20px', padding: '15px', background: '#fff3cd', borderRadius: '8px' }}>
        <h3>💡 Analyse</h3>
        <p>Cette page teste toutes les combinaisons possibles de paramètres pour identifier laquelle fonctionne.</p>
        <p><strong>Si tous les tests retournent -1, le problème pourrait être :</strong></p>
        <ol>
          <li>userId incorrect ou non autorisé pour cet événement</li>
          <li>Date non disponible (même si dans wdays)</li>
          <li>API nécessite un paramètre supplémentaire non documenté</li>
          <li>Problème de quota ou limite pour ce userId</li>
          <li>L'événement nécessite une confirmation préalable</li>
        </ol>
      </div>
    </div>
  )
}



