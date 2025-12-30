'use client'

import { useState, useEffect } from 'react'
import {
  getAttribution,
  setAttributionFromUrl,
  clearAttribution,
} from './storage'
import type { Attribution } from './types'

/**
 * React hook for attribution
 */
export function useAttribution() {
  const [attribution, setAttribution] = useState<Attribution | null>(() => {
    // Initial state from storage
    if (typeof window !== 'undefined') {
      return getAttribution()
    }
    return null
  })

  // Sync with storage on mount
  useEffect(() => {
    setAttribution(getAttribution())
  }, [])

  const updateFromUrl = (searchParams: URLSearchParams) => {
    const updated = setAttributionFromUrl(searchParams)
    setAttribution(updated)
    return updated
  }

  const clear = () => {
    clearAttribution()
    setAttribution(null)
  }

  return {
    attribution,
    updateFromUrl,
    clear,
  }
}

