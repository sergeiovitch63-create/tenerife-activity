/**
 * Checkout Processing Page
 * 
 * Handles HTML form auto-submit from Atlántico payment gateway
 * HTML is stored in sessionStorage by checkout page
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/navigation'
import { useLocale } from 'next-intl'
import { Section, Container } from '@/ui/components/layout'

const STORAGE_KEY = 'ATLANTICO_PAYMENT_HTML'

export default function CheckoutProcessingPage() {
  const router = useRouter()
  const locale = useLocale()
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Retrieve HTML from sessionStorage
    const storedHtml = sessionStorage.getItem(STORAGE_KEY)
    
    if (!storedHtml) {
      setError('Payment HTML not found. Please try again.')
      setTimeout(() => {
        router.push('/checkout')
      }, 3000)
      return
    }

    // Clear storage
    sessionStorage.removeItem(STORAGE_KEY)
    
    setHtml(storedHtml)
  }, [router])

  if (error) {
    return (
      <Section variant="default" background="default">
        <Container size="lg">
          <div className="py-12 text-center space-y-6">
            <div className="text-red-600">
              <svg
                className="w-16 h-16 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-glass-900">Payment Processing Error</h1>
            <p className="text-glass-600">{error}</p>
            <p className="text-sm text-glass-500">Redirecting to checkout...</p>
          </div>
        </Container>
      </Section>
    )
  }

  if (!html) {
    return (
      <Section variant="default" background="default">
        <Container size="lg">
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ocean-600 mx-auto"></div>
            <p className="mt-4 text-glass-600">Loading payment form...</p>
          </div>
        </Container>
      </Section>
    )
  }

  // Render HTML form and auto-submit
  return (
    <div>
      <div
        dangerouslySetInnerHTML={{ __html: html }}
        style={{ display: 'none' }}
      />
      <Section variant="default" background="default">
        <Container size="lg">
          <div className="py-12 text-center space-y-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ocean-600 mx-auto"></div>
            <h1 className="text-2xl font-bold text-glass-900">Processing Payment</h1>
            <p className="text-glass-600">Redirecting to payment gateway...</p>
            <p className="text-sm text-glass-500">Please wait, do not close this page.</p>
          </div>
        </Container>
      </Section>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              // Wait for DOM to be ready
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', submitForm);
              } else {
                submitForm();
              }
              
              function submitForm() {
                // Priority 1: Auto-submit form if present
                const form = document.querySelector('form');
                if (form) {
                  setTimeout(function() {
                    form.submit();
                  }, 500);
                  return;
                }
                
                // Priority 2: Look for form in hidden div
                const hiddenDiv = document.querySelector('div[style*="display: none"]');
                if (hiddenDiv) {
                  const hiddenForm = hiddenDiv.querySelector('form');
                  if (hiddenForm) {
                    setTimeout(function() {
                      hiddenForm.submit();
                    }, 500);
                    return;
                  }
                }
                
                // Priority 3: Try to find redirect URL in body
                const urlMatch = document.body.innerHTML.match(/(https?:\\/\\/[^\\s<>"']+)/i);
                if (urlMatch && urlMatch[1]) {
                  setTimeout(function() {
                    window.location.href = urlMatch[1];
                  }, 1000);
                  return;
                }
                
                // Fallback: log error after 3 seconds
                setTimeout(function() {
                  console.error('[PAYMENT] No form or redirect URL found in HTML');
                }, 3000);
              }
            })();
          `,
        }}
      />
    </div>
  )
}

