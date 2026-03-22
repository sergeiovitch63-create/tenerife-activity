'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'

/**
 * When ?ref= is present, persist via /api/affiliate/track (HttpOnly cookie).
 * Complements Edge middleware — ensures the cookie is set even if middleware Set-Cookie is dropped.
 */
export function AffiliateRefCapture() {
  const searchParams = useSearchParams()
  /** Raw ref param we already finished calling the API for (success or 4xx). */
  const settledRef = useRef<string | null>(null)

  useEffect(() => {
    const raw = searchParams.get('ref')
    if (!raw || raw === settledRef.current) return

    void fetch(`/api/affiliate/track?ref=${encodeURIComponent(raw)}`, {
      credentials: 'same-origin',
      method: 'GET',
    }).then(() => {
      settledRef.current = raw
    })
  }, [searchParams])

  return null
}
