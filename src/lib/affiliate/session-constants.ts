/**
 * Edge-safe constants for affiliate session (dashboard) cookie.
 * Middleware imports these; anything else can import from session.ts.
 */

export const AFFILIATE_SESSION_COOKIE_NAME = 'ta_affiliate_session'
export const AFFILIATE_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days
