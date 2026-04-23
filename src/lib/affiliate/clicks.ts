import { createHash, randomUUID } from 'crypto'
import type { NextRequest } from 'next/server'
import { getSql } from '@/lib/db/postgres'

export const AFFILIATE_VISITOR_COOKIE_NAME = 'ta_affiliate_visitor'
export const AFFILIATE_VISITOR_COOKIE_MAX_AGE_S = 60 * 60 * 24 * 30

export interface LogClickInput {
  code: string
  visitorId: string
  landingUrl?: string | null
  activityCode?: string | null
  referrer?: string | null
  userAgent?: string | null
  ipHash?: string | null
  country?: string | null
}

/**
 * Best-effort insert of a click. Returns true if stored, false if skipped
 * (no DB, no affiliate match, or DB error — logged but non-fatal).
 */
export async function logAffiliateClick(input: LogClickInput): Promise<boolean> {
  const sql = getSql()
  if (!sql) return false

  const code = input.code.trim()
  if (!code) return false

  try {
    const found = await sql`
      SELECT 1 AS ok FROM affiliates
      WHERE code = ${code} AND status = 'active'
      LIMIT 1
    `
    if (!Array.isArray(found) || found.length === 0) return false

    await sql`
      INSERT INTO affiliate_clicks
        (affiliate_code, visitor_id, landing_url, activity_code, referrer, user_agent, ip_hash, country)
      VALUES
        (${code}, ${input.visitorId},
         ${input.landingUrl ?? null}, ${input.activityCode ?? null},
         ${input.referrer ?? null}, ${input.userAgent ?? null},
         ${input.ipHash ?? null}, ${input.country ?? null})
    `
    return true
  } catch (e) {
    console.error('[affiliate_clicks] insert failed', e)
    return false
  }
}

/**
 * Extract client IP from request headers. Returns null if not determinable.
 * Picks the first IP from x-forwarded-for, then x-real-ip.
 */
export function getClientIp(request: NextRequest): string | null {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const real = request.headers.get('x-real-ip')
  if (real) return real.trim()
  return null
}

/**
 * GDPR-safe IP hash: salted SHA-256, truncated.
 * Set AFFILIATE_IP_SALT in env to rotate keys across deployments.
 */
export function hashIp(ip: string | null): string | null {
  if (!ip) return null
  const salt = process.env.AFFILIATE_IP_SALT ?? 'ta-default-salt'
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32)
}

/**
 * Read visitor UUID from request cookie, or generate a new one.
 */
export function readOrCreateVisitorId(request: NextRequest): { visitorId: string; isNew: boolean } {
  const existing = request.cookies.get(AFFILIATE_VISITOR_COOKIE_NAME)?.value
  if (existing && /^[0-9a-f-]{10,80}$/i.test(existing)) {
    return { visitorId: existing, isNew: false }
  }
  return { visitorId: randomUUID(), isNew: true }
}

/**
 * Append Set-Cookie for the visitor ID on a given Response.
 */
export function setVisitorCookie(response: Response, visitorId: string) {
  const secure = process.env.NODE_ENV === 'production'
  const line = `${AFFILIATE_VISITOR_COOKIE_NAME}=${visitorId}; Path=/; Max-Age=${AFFILIATE_VISITOR_COOKIE_MAX_AGE_S}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`
  response.headers.append('Set-Cookie', line)
}
