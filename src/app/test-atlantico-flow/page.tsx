'use client'

/**
 * Page de test complète suivant EXACTEMENT le flux Atlantico PDF
 * 
 * Flux selon PDF:
 * 1. GET /groupDetails/{t_group}/{lang} - Récupérer les détails du groupe
 * 2. GET /eventDetails/{t_id}/{lang} - Récupérer les détails de l'événement
 * 3. GET /loadLimits/{t_id}/{lang}/{month} - Vérifier disponibilité
 * 4. GET /loadPrices/{t_id}/{date} - Récupérer les prix
 * 5. POST /payment/ - Envoyer le paiement avec tous les paramètres requis
 */

import { useState, useEffect } from 'react'

interface GroupDetails {
  ids?: string | string[]
  group?: string
  [key: string]: any
}

interface EventDetails {
  id?: string
  code?: string
  name?: string
  group?: string
  [key: string]: any
}

interface LimitsResponse {
  dates?: {
    date?: string[]
    wdays?: number[]
  }
  sessions?: Record<string, any>
  sessionsByDate?: Record<string, any>
  [key: string]: any
}

interface PricesResponse {
  adult?: number
  child?: number
  infant?: number
  [key: string]: any
}

export default function TestAtlanticoFlowPage() {
  const [step, setStep] = useState<'input' | 'group' | 'event' | 'limits' | 'prices' | 'payment'>('input')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Inputs
  const [tGroup, setTGroup] = useState('31')
  const [tId, setTId] = useState('509')
  const [lang, setLang] = useState('ENG')
  
  // Data
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null)
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null)
  const [limits, setLimits] = useState<LimitsResponse | null>(null)
  const [prices, setPrices] = useState<PricesResponse | null>(null)
  
  // Booking
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [adults, setAdults] = useState(1)
  const [childs, setChilds] = useState(0)
  const [infants, setInfants] = useState(0)
  const [name, setName] = useState('Test User')
  const [email, setEmail] = useState('test@example.com')
  const [phone, setPhone] = useState('+1234567890')
  
  // Logs
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
    console.log(`[TEST_FLOW] ${message}`)
  }

  // ÉTAPE 1: Récupérer groupDetails selon PDF
  const fetchGroupDetails = async () => {
    setLoading(true)
    setError(null)
    addLog(`ÉTAPE 1: GET /groupDetails/${tGroup}/${lang}`)
    
    try {
      const response = await fetch(`/api/atlantico/group/${tGroup}/${lang}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setGroupDetails(data)
      addLog(`✅ GroupDetails récupéré: ${JSON.stringify(data).substring(0, 200)}...`)
      
      // Extraire les event IDs depuis groupDetails.ids
      if (data.ids) {
        const idsStr = Array.isArray(data.ids) ? data.ids.join(',') : String(data.ids)
        const eventIds = idsStr.split(',').map((id: string) => id.trim()).filter(Boolean)
        if (eventIds.length > 0 && !tId) {
          setTId(eventIds[0])
          addLog(`📋 Event ID extrait depuis groupDetails.ids: ${eventIds[0]}`)
        }
      }
      
      setStep('event')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      setError(`Erreur groupDetails: ${errorMsg}`)
      addLog(`❌ Erreur: ${errorMsg}`)
    } finally {
      setLoading(false)
    }
  }

  // ÉTAPE 2: Récupérer eventDetails selon PDF
  const fetchEventDetails = async () => {
    if (!tId) {
      setError('t_id est requis')
      return
    }
    
    setLoading(true)
    setError(null)
    addLog(`ÉTAPE 2: GET /eventDetails/${tId}/${lang}`)
    
    try {
      const response = await fetch(`/api/atlantico/event/${tId}/${lang}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setEventDetails(data)
      addLog(`✅ EventDetails récupéré: ${data.name || data.code || tId}`)
      
      // Vérifier et corriger t_group depuis eventDetails
      if (data.group && data.group !== tGroup) {
        addLog(`⚠️ t_group corrigé: ${tGroup} → ${data.group}`)
        setTGroup(String(data.group))
      }
      
      setStep('limits')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      setError(`Erreur eventDetails: ${errorMsg}`)
      addLog(`❌ Erreur: ${errorMsg}`)
    } finally {
      setLoading(false)
    }
  }

  // ÉTAPE 3: Récupérer loadLimits selon PDF
  const fetchLimits = async () => {
    if (!tId) {
      setError('t_id est requis')
      return
    }
    
    setLoading(true)
    setError(null)
    
    // Calculer le mois (premier jour du mois)
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    
    addLog(`ÉTAPE 3: GET /loadLimits/${tId}/${lang.toLowerCase()}/${month}`)
    
    try {
      const response = await fetch(`/api/atlantico/limits?eventId=${tId}&lang=${lang}&month=${month}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setLimits(data)
      addLog(`✅ Limits récupéré: ${JSON.stringify(data).substring(0, 200)}...`)
      
      // Extraire dates disponibles
      const dates = data.dates?.date || []
      if (dates.length > 0) {
        setSelectedDate(dates[0])
        addLog(`📅 Date disponible sélectionnée: ${dates[0]}`)
      }
      
      setStep('prices')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      setError(`Erreur loadLimits: ${errorMsg}`)
      addLog(`❌ Erreur: ${errorMsg}`)
    } finally {
      setLoading(false)
    }
  }

  // ÉTAPE 4: Récupérer loadPrices selon PDF
  const fetchPrices = async () => {
    if (!tId || !selectedDate) {
      setError('t_id et date sont requis')
      return
    }
    
    setLoading(true)
    setError(null)
    
    // Convertir date en format YYYY-MM-DD si nécessaire
    const dateForPrices = selectedDate.includes('-') ? selectedDate : 
      `${selectedDate.substring(0, 4)}-${selectedDate.substring(4, 6)}-${selectedDate.substring(6, 8)}`
    
    addLog(`ÉTAPE 4: GET /loadPrices/${tId}/${dateForPrices}`)
    
    try {
      const response = await fetch(`/api/atlantico/prices?eventId=${tId}&date=${dateForPrices}&lang=${lang}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setPrices(data)
      addLog(`✅ Prices récupéré: Adult=${data.adult}, Child=${data.child}, Infant=${data.infant}`)
      
      setStep('payment')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      setError(`Erreur loadPrices: ${errorMsg}`)
      addLog(`❌ Erreur: ${errorMsg}`)
    } finally {
      setLoading(false)
    }
  }

  // ÉTAPE 5: Envoyer POST /payment/ selon PDF section 2.7
  const submitPayment = async () => {
    if (!tId || !tGroup || !selectedDate) {
      setError('t_id, t_group et date sont requis')
      return
    }
    
    setLoading(true)
    setError(null)
    
    // Convertir tourDate en YYYYMMDD selon PDF
    const tourDateFormatted = selectedDate.includes('-') 
      ? selectedDate.replace(/-/g, '') 
      : selectedDate
    
    // Préparer payload selon PDF section 2.7
    const payload = {
      t_id: tId,
      t_group: tGroup,
      language: lang,
      tourDate: tourDateFormatted,
      sesTime: selectedTime || null,
      adults: adults,
      childs: childs || 0,
      infants: infants || 0,
      name: name,
      email: email,
      phone: phone,
    }
    
    addLog(`ÉTAPE 5: POST /payment/ avec payload: ${JSON.stringify(payload, null, 2)}`)
    
    try {
      // Utiliser un formulaire HTML natif pour soumettre le paiement
      // Selon le PDF, /payment/ retourne du HTML (formulaire GetNet)
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = '/api/atlantico/booking/payment'
      form.style.display = 'none'
      
      // Ajouter tous les champs selon PDF section 2.7
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          const input = document.createElement('input')
          input.type = 'hidden'
          input.name = key
          input.value = String(value)
          form.appendChild(input)
        }
      })
      
      document.body.appendChild(form)
      addLog(`✅ Formulaire créé et soumis vers /api/atlantico/booking/payment`)
      form.submit()
      
      // Le navigateur va naviguer vers la page de paiement GetNet
      addLog(`🔄 Redirection vers la page de paiement GetNet...`)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      setError(`Erreur payment: ${errorMsg}`)
      addLog(`❌ Erreur: ${errorMsg}`)
      setLoading(false)
    }
  }

  const runFullFlow = async () => {
    setLogs([])
    setStep('input')
    setError(null)
    
    addLog('🚀 Démarrage du flux complet Atlantico selon PDF...')
    
    await fetchGroupDetails()
    if (error) return
    
    await fetchEventDetails()
    if (error) return
    
    await fetchLimits()
    if (error) return
    
    await fetchPrices()
    if (error) return
    
    addLog('✅ Toutes les étapes sont prêtes. Cliquez sur "Envoyer le paiement" pour finaliser.')
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Test Flux Atlantico - Suivi PDF Exact</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>Configuration</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div>
            <label>t_group:</label>
            <input 
              type="text" 
              value={tGroup} 
              onChange={(e) => setTGroup(e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          <div>
            <label>t_id:</label>
            <input 
              type="text" 
              value={tId} 
              onChange={(e) => setTId(e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          <div>
            <label>Lang:</label>
            <select 
              value={lang} 
              onChange={(e) => setLang(e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            >
              <option value="ENG">ENG</option>
              <option value="ESP">ESP</option>
              <option value="FRA">FRA</option>
            </select>
          </div>
        </div>
        <button 
          onClick={runFullFlow}
          disabled={loading}
          style={{ padding: '10px 20px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          {loading ? 'Chargement...' : '🚀 Lancer le flux complet'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '15px', background: '#fee', color: '#c00', borderRadius: '8px', marginBottom: '20px' }}>
          <strong>Erreur:</strong> {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h2>Étapes</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              onClick={fetchGroupDetails}
              disabled={loading || step !== 'input'}
              style={{ padding: '10px', background: step === 'group' ? '#4caf50' : '#ccc', color: 'white', border: 'none', borderRadius: '5px' }}
            >
              1. GroupDetails
            </button>
            <button 
              onClick={fetchEventDetails}
              disabled={loading || step !== 'group'}
              style={{ padding: '10px', background: step === 'event' ? '#4caf50' : '#ccc', color: 'white', border: 'none', borderRadius: '5px' }}
            >
              2. EventDetails
            </button>
            <button 
              onClick={fetchLimits}
              disabled={loading || step !== 'event'}
              style={{ padding: '10px', background: step === 'limits' ? '#4caf50' : '#ccc', color: 'white', border: 'none', borderRadius: '5px' }}
            >
              3. LoadLimits
            </button>
            <button 
              onClick={fetchPrices}
              disabled={loading || step !== 'limits'}
              style={{ padding: '10px', background: step === 'prices' ? '#4caf50' : '#ccc', color: 'white', border: 'none', borderRadius: '5px' }}
            >
              4. LoadPrices
            </button>
            <button 
              onClick={submitPayment}
              disabled={loading || step !== 'payment'}
              style={{ padding: '10px', background: step === 'payment' ? '#4caf50' : '#f44336', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}
            >
              5. POST /payment/
            </button>
          </div>
        </div>

        <div>
          <h2>Données de réservation</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label>Date (YYYYMMDD):</label>
              <input 
                type="text" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                placeholder="20260217"
                style={{ width: '100%', padding: '5px' }}
              />
            </div>
            <div>
              <label>Heure (HH:mm ou vide):</label>
              <input 
                type="text" 
                value={selectedTime} 
                onChange={(e) => setSelectedTime(e.target.value)}
                placeholder="10:00 ou vide"
                style={{ width: '100%', padding: '5px' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label>Adults:</label>
                <input 
                  type="number" 
                  value={adults} 
                  onChange={(e) => setAdults(parseInt(e.target.value) || 1)}
                  min="1"
                  style={{ width: '100%', padding: '5px' }}
                />
              </div>
              <div>
                <label>Childs:</label>
                <input 
                  type="number" 
                  value={childs} 
                  onChange={(e) => setChilds(parseInt(e.target.value) || 0)}
                  min="0"
                  style={{ width: '100%', padding: '5px' }}
                />
              </div>
              <div>
                <label>Infants:</label>
                <input 
                  type="number" 
                  value={infants} 
                  onChange={(e) => setInfants(parseInt(e.target.value) || 0)}
                  min="0"
                  style={{ width: '100%', padding: '5px' }}
                />
              </div>
            </div>
            <div>
              <label>Nom:</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', padding: '5px' }}
              />
            </div>
            <div>
              <label>Email:</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '5px' }}
              />
            </div>
            <div>
              <label>Téléphone:</label>
              <input 
                type="text" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
                style={{ width: '100%', padding: '5px' }}
              />
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h2>Logs</h2>
        <div style={{ background: '#000', color: '#0f0', padding: '15px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px', maxHeight: '400px', overflow: 'auto' }}>
          {logs.length === 0 ? (
            <div style={{ color: '#888' }}>Aucun log pour le moment...</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} style={{ marginBottom: '5px' }}>{log}</div>
            ))
          )}
        </div>
      </div>

      {(groupDetails || eventDetails || limits || prices) && (
        <div style={{ marginTop: '20px' }}>
          <h2>Données récupérées</h2>
          <details style={{ marginBottom: '10px' }}>
            <summary>GroupDetails</summary>
            <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px', overflow: 'auto', maxHeight: '200px' }}>
              {JSON.stringify(groupDetails, null, 2)}
            </pre>
          </details>
          <details style={{ marginBottom: '10px' }}>
            <summary>EventDetails</summary>
            <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px', overflow: 'auto', maxHeight: '200px' }}>
              {JSON.stringify(eventDetails, null, 2)}
            </pre>
          </details>
          <details style={{ marginBottom: '10px' }}>
            <summary>Limits</summary>
            <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px', overflow: 'auto', maxHeight: '200px' }}>
              {JSON.stringify(limits, null, 2)}
            </pre>
          </details>
          <details style={{ marginBottom: '10px' }}>
            <summary>Prices</summary>
            <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px', overflow: 'auto', maxHeight: '200px' }}>
              {JSON.stringify(prices, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}



