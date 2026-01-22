/**
 * Supabase Server Client
 * 
 * Server-only client using SERVICE_ROLE_KEY for admin operations.
 * NEVER expose this client to the client-side.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Only create client if both env vars are set
// This allows the module to load even if Supabase is not configured
let supabase: ReturnType<typeof createClient> | null = null

if (supabaseUrl && supabaseServiceRoleKey) {
  supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
} else if (process.env.NODE_ENV === 'development') {
  console.warn(
    '[SUPABASE] Missing configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local to enable curation features.'
  )
}

export { supabase }

/**
 * Get validated Supabase admin client
 * Validates env vars and creates client with proper error handling
 */
export function getAdminSupabase() {
  const url = (process.env.SUPABASE_URL ?? '').trim()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()

  // Remove trailing slash from URL
  const cleanUrl = url.replace(/\/+$/, '')

  // Validate URL
  if (!cleanUrl) {
    throw new Error('Supabase env invalid: SUPABASE_URL is empty')
  }
  if (!cleanUrl.startsWith('https://')) {
    throw new Error(`Supabase env invalid: SUPABASE_URL must start with "https://" (length: ${cleanUrl.length})`)
  }
  if (!cleanUrl.includes('.supabase.co')) {
    throw new Error(`Supabase env invalid: SUPABASE_URL must contain ".supabase.co" (length: ${cleanUrl.length})`)
  }

  // Extract and validate hostname
  let hostname: string
  try {
    const urlObj = new URL(cleanUrl)
    hostname = urlObj.hostname
  } catch (urlErr) {
    throw new Error(`Supabase env invalid: SUPABASE_URL is not a valid URL (length: ${cleanUrl.length})`)
  }

  // Check for invisible characters in hostname
  const hasInvisibleChars = /[\x00-\x1F\x7F-\x9F]/.test(hostname)
  if (hasInvisibleChars) {
    const charCodes = Array.from(hostname)
      .map((c) => c.charCodeAt(0))
      .filter((code) => code < 32 || (code > 126 && code < 160))
    throw new Error(`Supabase env invalid: SUPABASE_URL hostname contains invisible characters (char codes: ${charCodes.join(', ')})`)
  }

  // DEV log hostname info
  if (process.env.NODE_ENV === 'development') {
    console.log('[SUPABASE_CONFIG]', {
      hostname,
      hostnameLength: hostname.length,
      urlLength: cleanUrl.length,
      hasWhitespace: /\s/.test(cleanUrl),
    })
  }

  // Validate key
  if (!key) {
    throw new Error('Supabase env invalid: SUPABASE_SERVICE_ROLE_KEY is empty')
  }

  // Accept multiple key formats:
  // 1. JWT format (eyJ...): service_role key (recommended, length > 150)
  // 2. sb_ format: newer Supabase key format (length varies, but should be >= 40)
  const isJWTFormat = key.startsWith('eyJ')
  const isSBFormat = key.startsWith('sb_')
  const isValidFormat = isJWTFormat || isSBFormat

  if (!isValidFormat) {
    throw new Error(`Supabase env invalid: SUPABASE_SERVICE_ROLE_KEY format unrecognized (starts with: ${key.substring(0, Math.min(10, key.length))}..., length: ${key.length}). Expected JWT (eyJ...) or sb_ format.`)
  }

  // JWT format should be long (service_role keys are typically > 150 chars)
  if (isJWTFormat && key.length < 80) {
    throw new Error(`Supabase env invalid: SUPABASE_SERVICE_ROLE_KEY (JWT format) too short (length: ${key.length}, expected >= 80). This may be a truncated key.`)
  }

  // sb_ format minimum length check
  if (isSBFormat && key.length < 40) {
    throw new Error(`Supabase env invalid: SUPABASE_SERVICE_ROLE_KEY (sb_ format) too short (length: ${key.length}, expected >= 40). This may be a truncated key.`)
  }

  return createClient(cleanUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

