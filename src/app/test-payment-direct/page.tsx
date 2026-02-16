'use client'

/**
 * Page de test DIRECTE vers l'API Atlantico /payment/
 * Bypasse notre proxy pour tester directement
 */

import { useState } from 'react'

export default function TestPaymentDirectPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    userId: '3645',
    t_id: '509',
    t_group: '55',
    language: 'ENG',
    tourDate: '20260217',
    sesTime: '', // Vide pour wdays_only
    adults: '1',
    childs: '0',
    infants: '0',
    name: 'Test User',
    email: 'test@example.com',
    phone: '+1234567890',
  })

  const submitDirect = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    
    try {
      // Construire le payload form-urlencoded
      const params = new URLSearchParams()
      Object.entries(formData).forEach(([key, value]) => {
        if (value && value !== '') {
          params.append(key, String(value))
        }
      })
      
      // Si sesTime est vide, ne pas l'envoyer du tout
      if (!formData.sesTime || formData.sesTime === '') {
        // Ne pas ajouter sesTime
      } else {
        params.append('sesTime', formData.sesTime)
      }
      
      console.log('========================================')
      console.log('[DIRECT_TEST] Envoi direct à Atlantico API')
      console.log('========================================')
      console.log('URL: /api/atlantico/booking/payment')
      console.log('Method: POST')
      console.log('Content-Type: application/x-www-form-urlencoded; charset=utf-8')
      console.log('Payload:', params.toString())
      console.log('========================================')
      
      // Use fetch to get HTML, then display it properly
      const response = await fetch('/api/atlantico/booking/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        },
        body: params.toString(),
      })
      
      const contentType = response.headers.get('content-type') || ''
      const text = await response.text()
      
      if (response.ok && (contentType.includes('text/html') || text.trim().startsWith('<html') || text.includes('<form'))) {
        setResult({
          type: 'html',
          content: text,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
        })
        
        // CRITICAL: Replace entire document with payment form HTML
        // This ensures the auto-submit script works correctly
        document.open('text/html', 'replace')
        document.write(text)
        document.close()
      } else {
        // Try to parse as JSON
        try {
          const json = JSON.parse(text)
          setResult({
            type: 'json',
            content: json,
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
          })
        } catch {
          setError('Réponse inattendue: ' + text.substring(0, 200))
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const testVariants = [
    {
      name: 'Sans sesTime (wdays_only)',
      data: { ...formData, sesTime: '' },
    },
    {
      name: 'Avec sesTime="00:00"',
      data: { ...formData, sesTime: '00:00' },
    },
    {
      name: 'Sans tourDate (on-request)',
      data: { ...formData, tourDate: '', sesTime: '' },
    },
  ]

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🔧 Test Paiement Direct Atlantico</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Test direct de l'endpoint /payment/ avec différents paramètres
      </p>
      
      <div style={{ marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>Paramètres</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          {Object.entries(formData).map(([key, value]) => (
            <div key={key}>
              <label><strong>{key}:</strong></label>
              <input 
                type="text" 
                value={value} 
                onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                placeholder={key}
                style={{ width: '100%', padding: '8px', fontSize: '14px' }}
              />
            </div>
          ))}
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={submitDirect}
            disabled={loading}
            style={{ padding: '10px 20px', background: '#f44336', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
          >
            {loading ? '⏳ Envoi...' : '🚀 Envoyer avec Fetch (pour debug)'}
          </button>
          
          <button 
            onClick={() => {
              // SOLUTION: Navigate to payment page with parameters
              // The payment page will handle the request and display HTML
              const params = new URLSearchParams()
              Object.entries(formData).forEach(([key, value]) => {
                if (value && value !== '') {
                  params.append(key, String(value))
                }
              })
              
              // Navigate to payment page
              window.location.href = `/payment?${params.toString()}`
            }}
            disabled={loading}
            style={{ padding: '10px 20px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
          >
            ✅ Envoyer avec Formulaire HTML (Recommandé)
          </button>
          
          <button 
            onClick={async () => {
              // Alternative: Direct form submission with iframe to display result
              setLoading(true)
              setError(null)
              
              try {
                const params = new URLSearchParams()
                Object.entries(formData).forEach(([key, value]) => {
                  if (value && value !== '') {
                    params.append(key, String(value))
                  }
                })
                
                console.log('[PAYMENT_DIRECT] Submitting form:', params.toString())
                
                const response = await fetch('/api/atlantico/booking/payment', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
                  },
                  body: params.toString(),
                }).catch((fetchError) => {
                  console.error('[PAYMENT_DIRECT] Fetch error:', fetchError)
                  setError(`Network error: ${fetchError.message}`)
                  setLoading(false)
                  return null
                })
                
                if (!response) return
                
                const contentType = response.headers.get('content-type') || ''
                const text = await response.text()
                
                console.log('[PAYMENT_DIRECT] Response:', {
                  status: response.status,
                  contentType,
                  textLength: text.length,
                  isHTML: text.trim().startsWith('<html') || text.includes('<form'),
                })
                
                if (response.ok && (contentType.includes('text/html') || text.trim().startsWith('<html') || text.includes('<form'))) {
                  // Create a new window to display the HTML
                  const newWindow = window.open('', '_blank')
                  if (newWindow) {
                    newWindow.document.write(text)
                    newWindow.document.close()
                    setResult({
                      type: 'html',
                      content: text,
                      status: response.status,
                      headers: Object.fromEntries(response.headers.entries()),
                    })
                  } else {
                    // If popup blocked, use iframe
                    const iframe = document.createElement('iframe')
                    iframe.style.width = '100%'
                    iframe.style.height = '800px'
                    iframe.style.border = 'none'
                    iframe.style.position = 'fixed'
                    iframe.style.top = '0'
                    iframe.style.left = '0'
                    iframe.style.zIndex = '9999'
                    iframe.style.backgroundColor = 'white'
                    
                    document.body.appendChild(iframe)
                    iframe.contentDocument?.open()
                    iframe.contentDocument?.write(text)
                    iframe.contentDocument?.close()
                    
                    setResult({
                      type: 'html',
                      content: text,
                      status: response.status,
                      headers: Object.fromEntries(response.headers.entries()),
                    })
                  }
                } else {
                  try {
                    const json = JSON.parse(text)
                    setError('Erreur: ' + (json.reason || json.message || JSON.stringify(json)))
                  } catch {
                    setError('Erreur: ' + text.substring(0, 200))
                  }
                }
              } catch (err) {
                setError(err instanceof Error ? err.message : String(err))
              } finally {
                setLoading(false)
              }
            }}
            disabled={loading}
            style={{ padding: '10px 20px', background: '#9C27B0', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
          >
            🔄 Soumettre Formulaire Direct
          </button>
          
          <button 
            onClick={() => {
              // Alternative: Use native form submission in new window
              const form = document.createElement('form')
              form.method = 'POST'
              form.action = '/api/atlantico/booking/payment'
              form.target = '_blank'
              form.style.display = 'none'
              
              Object.entries(formData).forEach(([key, value]) => {
                if (value && value !== '') {
                  const input = document.createElement('input')
                  input.type = 'hidden'
                  input.name = key
                  input.value = String(value)
                  form.appendChild(input)
                }
              })
              
              document.body.appendChild(form)
              form.submit()
            }}
            disabled={loading}
            style={{ padding: '10px 20px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
          >
            🔄 Ouvrir dans Nouvelle Fenêtre
          </button>
          
          <button 
            onClick={async () => {
              // Alternative: Use iframe to display HTML from working route
              setLoading(true)
              setError(null)
              
              try {
                const params = new URLSearchParams()
                Object.entries(formData).forEach(([key, value]) => {
                  if (value && value !== '') {
                    params.append(key, String(value))
                  }
                })
                
                const response = await fetch('/api/atlantico/booking/payment', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
                  },
                  body: params.toString(),
                })
                
                const contentType = response.headers.get('content-type') || ''
                const text = await response.text()
                
                if (response.ok && (contentType.includes('text/html') || text.trim().startsWith('<html') || text.includes('<form'))) {
                  // Create iframe and display HTML
                  const iframe = document.createElement('iframe')
                  iframe.style.width = '100%'
                  iframe.style.height = '800px'
                  iframe.style.border = 'none'
                  iframe.style.position = 'fixed'
                  iframe.style.top = '0'
                  iframe.style.left = '0'
                  iframe.style.zIndex = '9999'
                  iframe.style.backgroundColor = 'white'
                  
                  document.body.appendChild(iframe)
                  iframe.contentDocument?.open()
                  iframe.contentDocument?.write(text)
                  iframe.contentDocument?.close()
                  
                  setResult({
                    type: 'html',
                    content: text,
                    status: response.status,
                    headers: Object.fromEntries(response.headers.entries()),
                  })
                } else {
                  // Try to parse as JSON
                  try {
                    const json = JSON.parse(text)
                    setError('Erreur: ' + (json.reason || json.message || JSON.stringify(json)))
                  } catch {
                    setError('Erreur: ' + text.substring(0, 200))
                  }
                }
              } catch (err) {
                setError(err instanceof Error ? err.message : String(err))
              } finally {
                setLoading(false)
              }
            }}
            disabled={loading}
            style={{ padding: '10px 20px', background: '#FF9800', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
          >
            🖼️ Afficher dans iFrame
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', background: '#e3f2fd', borderRadius: '8px' }}>
        <h2>Variantes de Test</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {testVariants.map((variant, i) => (
            <button
              key={i}
              onClick={() => {
                setFormData(variant.data)
                setTimeout(() => submitDirect(), 100)
              }}
              disabled={loading}
              style={{ padding: '10px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', textAlign: 'left' }}
            >
              {variant.name}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ padding: '15px', background: '#fee', color: '#c00', borderRadius: '8px', marginBottom: '20px' }}>
          <strong>Erreur:</strong> {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '20px' }}>
          <h2>Résultat</h2>
          <div style={{ padding: '15px', background: '#f5f5f5', borderRadius: '8px', marginBottom: '10px' }}>
            <div><strong>Status:</strong> {result.status}</div>
            <div><strong>Type:</strong> {result.type}</div>
          </div>
          
          {result.type === 'json' ? (
            <pre style={{ background: '#000', color: '#0f0', padding: '15px', borderRadius: '8px', overflow: 'auto', maxHeight: '400px', fontSize: '12px' }}>
              {JSON.stringify(result.content, null, 2)}
            </pre>
          ) : (
            <div>
              <div style={{ marginBottom: '10px' }}>
                <strong>HTML Response ({result.content.length} chars):</strong>
              </div>
              <details>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Voir le HTML</summary>
                <pre style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', overflow: 'auto', maxHeight: '400px', fontSize: '12px' }}>
                  {result.content.substring(0, 5000)}
                  {result.content.length > 5000 ? '\n... (tronqué)' : ''}
                </pre>
              </details>
              <div style={{ marginTop: '10px', padding: '10px', background: '#fff3cd', borderRadius: '5px' }}>
                💡 Si c'est du HTML (formulaire GetNet), il devrait s'ouvrir dans une nouvelle fenêtre automatiquement.
              </div>
            </div>
          )}
          
          <details style={{ marginTop: '10px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Voir les Headers</summary>
            <pre style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', overflow: 'auto', maxHeight: '200px', fontSize: '12px' }}>
              {JSON.stringify(result.headers, null, 2)}
            </pre>
          </details>
        </div>
      )}

      <div style={{ marginTop: '20px', padding: '15px', background: '#fff3cd', borderRadius: '8px' }}>
        <h3>💡 Instructions</h3>
        <ol style={{ lineHeight: '1.8' }}>
          <li>Modifiez les paramètres ci-dessus si nécessaire</li>
          <li>Cliquez sur "Envoyer Directement" ou utilisez une variante de test</li>
          <li>Si le résultat est du HTML, une nouvelle fenêtre devrait s'ouvrir avec le formulaire GetNet</li>
          <li>Si le résultat est JSON avec erreur, vérifiez les logs serveur pour plus de détails</li>
        </ol>
        <p style={{ marginTop: '10px', fontWeight: 'bold' }}>
          ⚠️ Pour wdays_only mode, essayez d'abord SANS sesTime, puis avec sesTime="00:00" si ça échoue.
        </p>
      </div>
    </div>
  )
}



