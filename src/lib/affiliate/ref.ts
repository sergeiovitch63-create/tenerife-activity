/**
 * Affiliate referral: ?ref=CODE in the URL → persisted in a cookie (see middleware).
 * Server routes that record sales should read the same cookie name.
 */

import type { NextResponse } from 'next/server'

export const AFFILIATE_REF_COOKIE_NAME = 'ta_affiliate_ref'

/** Max length for stored code (URL segment–style). */
export const AFFILIATE_REF_MAX_LEN = 64

const AFFILIATE_REF_PATTERN = /^[a-zA-Z0-9_-]+$/

/**
 * Returns normalized affiliate code or null if invalid / empty.
 */
export function parseAffiliateRef(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const trimmed = raw.trim()
  if (!trimmed || trimmed.length > AFFILIATE_REF_MAX_LEN) return null
  if (!AFFILIATE_REF_PATTERN.test(trimmed)) return null
  return trimmed
}

export const AFFILIATE_REF_COOKIE_MAX_AGE_S = 60 * 60 * 24 * 30 // 30 days

/** Attach HttpOnly cookie when ?ref= is valid (call from middleware). */
export function setAffiliateRefCookie(response: NextResponse, code: string) {
  response.cookies.set(AFFILIATE_REF_COOKIE_NAME, code, {
    path: '/',
    maxAge: AFFILIATE_REF_COOKIE_MAX_AGE_S,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
}
