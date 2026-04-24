import 'server-only'
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

/**
 * Password management for affiliate login (scrypt-based, no external deps).
 *
 * Hash format: `scrypt:N=16384,r=8,p=1$<hex_salt>$<hex_hash>`
 * We keep it self-describing so we can rotate parameters later without breaking
 * existing hashes.
 */

const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const SCRYPT_KEYLEN = 64
const SALT_BYTES = 16

/** URL-safe alphanumeric alphabet (no confusing chars like O/0, l/1, I). */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

/**
 * Generate a cryptographically random password.
 * Default: 12 characters, URL-safe alphanumeric, ~71 bits of entropy.
 */
export function generatePassword(length = 12): string {
  if (length < 8) throw new Error('Password too short')
  const bytes = randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return out
}

/** Hash a plaintext password with scrypt. */
export function hashPassword(plain: string): string {
  if (!plain || typeof plain !== 'string') {
    throw new Error('Password is required')
  }
  const salt = randomBytes(SALT_BYTES)
  const hash = scryptSync(plain, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  })
  return `scrypt:N=${SCRYPT_N},r=${SCRYPT_R},p=${SCRYPT_P}$${salt.toString('hex')}$${hash.toString('hex')}`
}

/**
 * Verify a plaintext password against a stored hash. Timing-safe.
 * Returns false for any malformed / unknown hash format.
 */
export function verifyPassword(plain: string, stored: string | null | undefined): boolean {
  if (!plain || !stored) return false
  const parts = stored.split('$')
  if (parts.length !== 3) return false
  const [header, saltHex, hashHex] = parts
  if (!header.startsWith('scrypt:')) return false

  // Parse params from "scrypt:N=16384,r=8,p=1"
  const paramsStr = header.slice('scrypt:'.length)
  const params: Record<string, number> = {}
  for (const kv of paramsStr.split(',')) {
    const [k, v] = kv.split('=')
    const n = Number(v)
    if (!Number.isFinite(n)) return false
    params[k] = n
  }
  const N = params.N ?? SCRYPT_N
  const r = params.r ?? SCRYPT_R
  const p = params.p ?? SCRYPT_P

  try {
    const salt = Buffer.from(saltHex, 'hex')
    const expected = Buffer.from(hashHex, 'hex')
    const actual = scryptSync(plain, salt, expected.length, { N, r, p })
    if (actual.length !== expected.length) return false
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}
