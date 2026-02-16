'use client'

/**
 * Page qui teste automatiquement plusieurs événements/dates pour trouver une combinaison qui fonctionne
 */

import { useState } from 'react'

interface TestResult {
  t_id: string
  t_group: string
  tourDate: string
  sesTime: string | null
  status: number
  success: boolean
  error?: string
  preview?: string
}

export default function TestFindWorkingPaymentPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])
  const [foundWorking, setFoundWorking] = useState<TestResult | null>(null)

  // Liste d'événements à tester (avec leurs t_group)
  const eventsToTest = [
    { t_id: '509', t_group: '55' },
    { t_id: '509', t_group: '31' }, // Essayer avec t_group par défaut
    // Ajouter d'autres événements si disponibles
  ]

  const testEvent = async (t_id: string, t_group: string, tourDate: string, sesTime: string | null = null) => {
    const formData = new URLSearchParams()
    formData.append('userId', '3645')
    formData.append('t_id', t_id)
    formData.append('t_group', t_group)
    formData.append('language', 'ENG')
    formData.append('tourDate', tourDate)
    if (sesTime) {
      formData.append('sesTime', sesTime)
    }
    formData.append('adults', '1')
    formData.append('childs', '0')
    formData.append('infants', '0')
    formData.append('name', 'Test User')
    formData.append('email', 'test@example.com')
    formData.append('phone', '+1234567890')

    try {
      const response = await fetch('/api/atlantico/booking/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        },
        body: formData.toString(),
      })

      const contentType = response.headers.get('content-type') || ''
      let preview = ''
      let success = false

      if (contentType.includes('text/html')) {
        const html = await response.text()
        preview = html.substring(0, 200)
        success = html.trim() !== '-1' && html.length > 10
      } else {
        const json = await response.json()
        preview = JSON.stringify(json).substring(0, 200)
        success = json.ok === true
      }

      return {
        t_id,
        t_group,
        tourDate,
        sesTime,
        status: response.status,
        success,
        preview,
        error: success ? undefined : 'Returned -1 or error',
      }
    } catch (error) {
      return {
        t_id,
        t_group,
        tourDate,
        sesTime,
        status: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  const findWorkingCombination = async () => {
    setLoading(true)
    setResults([])
    setFoundWorking(null)

    // Générer des dates à tester (aujourd'hui + 1 à 30 jours)
    const dates: string[] = []
    for (let i = 1; i <= 30; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0].replace(/-/g, '')
      dates.push(dateStr)
    }

    // Tester chaque combinaison
    for (const event of eventsToTest) {
      for (const date of dates.slice(0, 10)) { // Limiter à 10 dates pour ne pas surcharger
        // Test 1: Sans sesTime
        const result1 = await testEvent(event.t_id, event.t_group, date, null)
        setResults(prev => [...prev, result1])
        
        if (result1.success) {
          setFoundWorking(result1)
          setLoading(false)
          return
        }
        
        await new Promise(resolve => setTimeout(resolve, 500)) // Pause entre les tests
        
        // Test 2: Avec sesTime=00:00
        const result2 = await testEvent(event.t_id, event.t_group, date, '00:00')
        setResults(prev => [...prev, result2])
        
        if (result2.success) {
          setFoundWorking(result2)
          setLoading(false)
          return
        }
        
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    setLoading(false)
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>🔍 Trouver une Combinaison qui Fonctionne</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Teste automatiquement plusieurs événements et dates pour trouver une combinaison qui fonctionne
      </p>
      
      <button 
        onClick={findWorkingCombination}
        disabled={loading}
        style={{ padding: '15px 30px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginBottom: '20px' }}
      >
        {loading ? '⏳ Recherche en cours...' : '🚀 Trouver une Combinaison qui Fonctionne'}
      </button>

      {foundWorking && (
        <div style={{ padding: '20px', background: '#4CAF50', color: 'white', borderRadius: '8px', marginBottom: '20px' }}>
          <h2>✅ COMBINAISON QUI FONCTIONNE TROUVÉE !</h2>
          <div style={{ fontFamily: 'monospace', fontSize: '14px', marginTop: '10px' }}>
            <div>t_id: {foundWorking.t_id}</div>
            <div>t_group: {foundWorking.t_group}</div>
            <div>tourDate: {foundWorking.tourDate}</div>
            <div>sesTime: {foundWorking.sesTime || '(none)'}</div>
            <div>Status: {foundWorking.status}</div>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h2>Résultats ({results.length} tests)</h2>
          <div style={{ maxHeight: '600px', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5', position: 'sticky', top: 0 }}>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>t_id</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>t_group</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>sesTime</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Résultat</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, i) => (
                  <tr key={i} style={{ background: result.success ? '#efe' : '#fee' }}>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{result.t_id}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{result.t_group}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{result.tourDate}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{result.sesTime || '(none)'}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{result.status}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', color: result.success ? '#0f0' : '#f00', fontWeight: 'bold' }}>
                      {result.success ? '✅ SUCCÈS' : '❌ -1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && results.length > 0 && !foundWorking && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#fff3cd', borderRadius: '8px' }}>
          <h3>⚠️ Aucune combinaison fonctionnelle trouvée</h3>
          <p>Si tous les tests retournent -1, le problème est probablement :</p>
          <ol>
            <li><strong>userId non autorisé</strong> : Le userId 3645 n'a peut-être pas les permissions</li>
            <li><strong>Restriction API</strong> : L'API Atlantico pourrait avoir des restrictions</li>
            <li><strong>Paramètre manquant</strong> : L'API pourrait nécessiter un paramètre non documenté</li>
          </ol>
          <p style={{ marginTop: '10px', fontWeight: 'bold' }}>
            💡 <strong>Action requise :</strong> Contacter Atlantico pour vérifier le userId et les permissions
          </p>
        </div>
      )}
    </div>
  )
}



