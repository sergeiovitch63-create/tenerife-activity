/**
 * Admin Debug Page for Atlantico API
 * 
 * Protected by ENV variable - only accessible when ATLANTICO_DEBUG_ENABLED=true
 * Allows testing event-details, limits, prices, confirm, and payment endpoints
 */

import { redirect } from 'next/navigation'
import { AtlanticoDebugClient } from './AtlanticoDebugClient'

export default function AtlanticoDebugPage() {
  // Protect this page - only allow if debug is enabled
  const isDebugEnabled = process.env.ATLANTICO_DEBUG_ENABLED === 'true'

  if (!isDebugEnabled) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Atlantico API Debug Panel
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            This page is for testing Atlantico API endpoints. All requests are logged server-side only.
          </p>
          <AtlanticoDebugClient />
        </div>
      </div>
    </div>
  )
}










