import type { NextRequest } from 'next/server'
import { getSql } from '@/lib/db/postgres'
import { AFFILIATE_REF_COOKIE_NAME, parseAffiliateRef } from './ref'

export type RecordAffiliateSaleResult =
  | { recorded: true }
  | { recorded: false; reason: string }

/**
 * When a booking reference is confirmed, persist a row in affiliate_sales if the
 * request carries a valid ta_affiliate_ref cookie and the code exists in affiliates.
 */
export async function recordAffiliateSaleFromRequest(
  request: NextRequest,
  input: {
    bookingReference: string
    amount?: number | null
    activityName?: string | null
  }
): Promise<RecordAffiliateSaleResult> {
  const raw = request.cookies.get(AFFILIATE_REF_COOKIE_NAME)?.value
  const code = parseAffiliateRef(raw)
  if (!code) {
    return { recorded: false, reason: 'no_affiliate_cookie' }
  }

  const sql = getSql()
  if (!sql) {
    return { recorded: false, reason: 'no_database' }
  }

  const bookingRef = input.bookingReference.trim()
  if (!bookingRef || bookingRef.length > 200) {
    return { recorded: false, reason: 'bad_booking_ref' }
  }

  try {
    const found = await sql`
      SELECT 1 AS ok FROM affiliates WHERE code = ${code} LIMIT 1
    `
    if (!Array.isArray(found) || found.length === 0) {
      return { recorded: false, reason: 'unknown_affiliate' }
    }

    const dup = await sql`
      SELECT id FROM affiliate_sales
      WHERE booking_reference = ${bookingRef} AND affiliate_code = ${code}
      LIMIT 1
    `
    if (Array.isArray(dup) && dup.length > 0) {
      return { recorded: false, reason: 'duplicate' }
    }

    await sql`
      INSERT INTO affiliate_sales (affiliate_code, booking_reference, amount, activity_name)
      VALUES (${code}, ${bookingRef}, ${input.amount ?? null}, ${input.activityName ?? null})
    `
    return { recorded: true }
  } catch (e) {
    console.error('[affiliate_sales] insert failed', e)
    return { recorded: false, reason: 'db_error' }
  }
}
