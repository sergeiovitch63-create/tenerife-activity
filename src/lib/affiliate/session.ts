import 'server-only'
import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { getSql } from '@/lib/db/postgres'
import { parseAffiliateRef } from './ref'
import {
  AFFILIATE_SESSION_COOKIE_NAME,
  AFFILIATE_SESSION_TTL_SECONDS,
} from './session-constants'

export { AFFILIATE_SESSION_COOKIE_NAME, AFFILIATE_SESSION_TTL_SECONDS }

export interface AffiliateSessionRecord {
  affiliateCode: string
  name: string
  email: string | null
  commissionPercent: number
  status: string
}

/**
 * Admin-generated magic link: create a new session token for an affiliate,
 * store in affiliate_sessions with a 30-day TTL, return the token.
 * The caller (admin UI) builds the URL to send to the affiliate.
 */
export async function createAffiliateSessionToken(code: string): Promise<string | null> {
  const normalized = parseAffiliateRef(code)
  if (!normalized) return null
  const sql = getSql()
  if (!sql) return null
  try {
    const affiliateRows = await sql`
      SELECT 1 AS ok FROM affiliates WHERE code = ${normalized} AND status = 'active' LIMIT 1
    `
    if (!Array.isArray(affiliateRows) || affiliateRows.length === 0) return null

    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + AFFILIATE_SESSION_TTL_SECONDS * 1000)
    await sql`
      INSERT INTO affiliate_sessions (affiliate_code, token, expires_at)
      VALUES (${normalized}, ${token}, ${expiresAt.toISOString()})
    `
    return token
  } catch (e) {
    console.error('[affiliate_session] create failed', e)
    return null
  }
}

/**
 * Verify a session token and return the associated affiliate record.
 * Returns null if token is invalid/expired/DB down.
 */
export async function verifyAffiliateSession(
  token: string | null | undefined,
): Promise<AffiliateSessionRecord | null> {
  if (!token || typeof token !== 'string' || token.length < 32) return null
  const sql = getSql()
  if (!sql) return null
  try {
    const rows = await sql`
      SELECT
        a.code AS affiliate_code, a.name, a.email,
        a.commission_percent, a.status
      FROM affiliate_sessions s
      JOIN affiliates a ON a.code = s.affiliate_code
      WHERE s.token = ${token} AND s.expires_at > now()
      LIMIT 1
    `
    if (!Array.isArray(rows) || rows.length === 0) return null
    const r = rows[0] as Record<string, unknown>
    if (r.status && r.status !== 'active') return null
    return {
      affiliateCode: String(r.affiliate_code ?? ''),
      name: String(r.name ?? ''),
      email: r.email == null ? null : String(r.email),
      commissionPercent: Number(r.commission_percent ?? 10),
      status: String(r.status ?? 'active'),
    }
  } catch (e) {
    console.error('[affiliate_session] verify failed', e)
    return null
  }
}

/** Delete a specific session token (logout). */
export async function destroyAffiliateSession(token: string | null | undefined): Promise<void> {
  if (!token) return
  const sql = getSql()
  if (!sql) return
  try {
    await sql`DELETE FROM affiliate_sessions WHERE token = ${token}`
  } catch (e) {
    console.error('[affiliate_session] destroy failed', e)
  }
}

/** Read the cookie from server-component context. */
export function readAffiliateSessionCookie(): string | null {
  return cookies().get(AFFILIATE_SESSION_COOKIE_NAME)?.value ?? null
}

/**
 * Convenience: get the current logged-in affiliate (server component / layout).
 */
export async function getCurrentAffiliate(): Promise<AffiliateSessionRecord | null> {
  return verifyAffiliateSession(readAffiliateSessionCookie())
}
