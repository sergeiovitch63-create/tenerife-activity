/**
 * Edge-safe constants for admin auth.
 * Kept in a separate module so middleware (edge runtime) can import them
 * without pulling in node-only dependencies (crypto, next/headers).
 */

export const ADMIN_SESSION_COOKIE_NAME = 'admin_session'
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days
