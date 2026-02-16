/**
 * Payment Processing Page
 * 
 * This page receives payment parameters and displays the payment form HTML
 * It handles the HTML response from Atlantico payment API correctly
 */

'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function PaymentPage() {
  const searchParams = useSearchParams()
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get payment parameters from URL
    const paymentData: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      paymentData[key] = value
    })

    // Build form data
    const formData = new URLSearchParams()
    Object.entries(paymentData).forEach(([key, value]) => {
      if (value) {
        formData.append(key, value)
      }
    })

    // Submit payment request
    const submitPayment = async () => {
      try {
        const response = await fetch('/api/atlantico/booking/payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
          },
          body: formData.toString(),
        })

        const contentType = response.headers.get('content-type') || ''

        const text = await response.text()
        
        if (response.ok && (contentType.includes('text/html') || text.trim().startsWith('<html') || text.includes('<form'))) {
          // CRITICAL: Stop React completely and replace entire document
          // This is the only way to ensure the auto-submit script works
          setLoading(false)
          
          // Use setTimeout to ensure React has finished rendering
          setTimeout(() => {
            // Replace entire document
            document.documentElement.innerHTML = text
            
            // Re-execute scripts (they were removed when we replaced innerHTML)
            const scripts = document.querySelectorAll('script')
            scripts.forEach((oldScript) => {
              const newScript = document.createElement('script')
              // Copy all attributes
              Array.from(oldScript.attributes).forEach((attr) => {
                newScript.setAttribute(attr.name, attr.value)
              })
              // Copy script content
              newScript.textContent = oldScript.textContent
              // Replace old script with new one (this executes it)
              oldScript.parentNode?.replaceChild(newScript, oldScript)
            })
          }, 100)
          
          return // Don't continue, we've replaced the page
        } else {
          // Try to get JSON error
          try {
            const json = JSON.parse(text)
            setError(json.reason || json.message || 'Payment failed')
          } catch {
            setError('Payment request failed: ' + text.substring(0, 200))
          }
          setLoading(false)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Payment error')
        setLoading(false)
      }
    }

    // Only submit if we have required parameters
    if (paymentData.t_id && paymentData.t_group && paymentData.language) {
      submitPayment()
    } else {
      setError('Missing required payment parameters (t_id, t_group, language)')
      setLoading(false)
    }
  }, [searchParams])

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        padding: '20px'
      }}>
        <div style={{ 
          width: '50px', 
          height: '50px', 
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '20px', fontSize: '18px' }}>Chargement du formulaire de paiement...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h1 style={{ color: '#e74c3c', marginBottom: '20px' }}>Erreur de Paiement</h1>
        <p style={{ fontSize: '18px', marginBottom: '20px' }}>{error}</p>
        <button 
          onClick={() => window.history.back()}
          style={{
            padding: '10px 20px',
            background: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Retour
        </button>
      </div>
    )
  }

  // If we have HTML, it should already be written to document
  // But render it here as fallback
  if (html) {
    return (
      <div dangerouslySetInnerHTML={{ __html: html }} />
    )
  }

  return null
}

