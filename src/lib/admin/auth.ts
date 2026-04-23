import 'server-only'
import { randomBytes, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { getSql } from '@/lib/db/postgres'
import { ADMIN_SESSION_COOKIE_NAME, ADMIN_SESSION_TTL_SECONDS } from './constants'

export { ADMIN_SESSION_COOKIE_NAME, ADMIN_SESSION_TTL_SECONDS }

export type AdminLoginResult =
  | { ok: true; token: string }
  | { ok: false; reason: 'bad_password' | 'no_admin_password_env' | 'no_database' | 'db_error' }

/**
 * Verify the submitted password against ADMIN_PASSWORD, and on success create
 * an admin_sessions row with a random token. Returns the token (caller sets
 * the cookie). Uses timing-safe compare to prevent timing side-channel leaks.
 */
export async function createAdminSession(submittedPassword: string): Promise<AdminLoginResult> {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected || expected.length === 0) {
    return { ok: false, reason: 'no_admin_password_env' }
  }

  const a = Buffer.from(String(submittedPassword || ''), 'utf-8')
  const b = Buffer.from(expected, 'utf-8')
  // timingSafeEqual requires equal-length buffers, pad to avoid throw
  const len = Math.max(a.length, b.length)
  const aPad = Buffer.alloc(len)
  const bPad = Buffer.alloc(len)
  a.copy(aPad)
  b.copy(bPad)
  const match = timingSafeEqual(aPad, bPad) && a.length === b.length
  if (!match) {
    return { ok: false, reason: 'bad_password' }
  }

  const sql = getSql()
  if (!sql) {
    return { ok: false, reason: 'no_database' }
  }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000)

  try {
    await sql`
      INSERT INTO admin_sessions (token, expires_at)
      VALUES (${token}, ${expiresAt.toISOString()})
    `
    return { ok: true, token }
  } catch (e) {
    console.error('[admin_auth] createAdminSession insert failed', e)
    return { ok: false, reason: 'db_error' }
  }
}

/**
 * Verify that the given token maps to a non-expired admin_sessions row.
 * Returns true only if DB confirms. If DB is unreachable, returns false
 * (fail-closed: no admin access without verification).
 */
export async function verifyAdminSession(token: string | null | undefined): Promise<boolean> {
  if (!token || typeof token !== 'string' || token.length < 32) return false
  const sql = getSql()
  if (!sql) return false
  try {
    const rows = await sql`
      SELECT 1 AS ok FROM admin_sessions
      WHERE token = ${token} AND expires_at > now()
      LIMIT 1
    `
    return Array.isArray(rows) && rows.length > 0
  } catch (e) {
    console.error('[admin_auth] verifyAdminSession query failed', e)
    return false
  }
}

/**
 * Delete the session row for the given token (logout). Best-effort.
 */
export async function destroyAdminSession(token: string | null | undefined): Promise<void> {
  if (!token) return
  const sql = getSql()
  if (!sql) return
  try {
    await sql`DELETE FROM admin_sessions WHERE token = ${token}`
  } catch (e) {
    console.error('[admin_auth] destroyAdminSession failed', e)
  }
}

/**
 * Read the session token from the Next.js cookies() helper (server components
 * and route handlers). Returns null if absent.
 */
export function readAdminSessionCookie(): string | null {
  const store = cookies()
  return store.get(ADMIN_SESSION_COOKIE_NAME)?.value ?? null
}

/**
 * Convenience: is the current server-side request authenticated as admin?
 * Usable in server components / layouts via `await isAdminAuthenticated()`.
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  return verifyAdminSession(readAdminSessionCookie())
}
