import { neon } from '@neondatabase/serverless'

/**
 * Serverless Neon client (POSTGRES_URL from Vercel + Neon integration, or DATABASE_URL).
 * Returns null if no connection string — callers must handle (e.g. skip DB writes).
 */
export function getSql() {
  const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL
  if (!url) return null
  return neon(url)
}
