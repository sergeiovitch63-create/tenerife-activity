import type { NextRequest } from 'next/server'
import { getSql } from '@/lib/db/postgres'
import {
  AFFILIATE_REF_COOKIE_NAME,
  parseAffiliateRef,
} from './ref'
import { AFFILIATE_VISITOR_COOKIE_NAME } from './clicks'
import { computeAffiliateCommission, DEFAULT_COMMISSION_PERCENT } from './commission'

export type RecordAffiliateSaleResult =
  | { recorded: true; affiliateCode: string; commissionAmount: number }
  | { recorded: false; reason: string }

export interface RecordAffiliateSaleInput {
  bookingReference: string
  amount?: number | null
  activityName?: string | null
  /** Activity date as YYYYMMDD (Atlantico format) or YYYY-MM-DD. Optional. */
  activityDate?: string | null
}

/**
 * Normalize a YYYYMMDD or YYYY-MM-DD string to ISO YYYY-MM-DD for Postgres DATE.
 * Returns null if the input is missing or malformed.
 */
function normalizeActivityDate(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = String(raw).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  }
  return null
}

/**
 * When a booking reference is observed (plain /confirm/ response, or parsed
 * from the Redsys HTML returned by /payment/), persist a row in affiliate_sales
 * iff the request carries a valid ta_affiliate_ref cookie and the code exists
 * in affiliates.
 *
 * Also stores the computed commission amount (10 % gross by default, overridden
 * by the per-affiliate commission_percent column), the visitor cookie (if set),
 * and leaves status='pending' (the DB default) for later reconciliation.
 *
 * Always non-fatal: any failure returns { recorded: false, reason } — never throws.
 */
export async function recordAffiliateSaleFromRequest(
  request: NextRequest,
  input: RecordAffiliateSaleInput
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

  const amount = typeof input.amount === 'number' && Number.isFinite(input.amount) ? input.amount : null
  const activityName = input.activityName ?? null
  const activityDate = normalizeActivityDate(input.activityDate)
  const visitorId = request.cookies.get(AFFILIATE_VISITOR_COOKIE_NAME)?.value ?? null

  try {
    const affiliateRows = await sql`
      SELECT commission_percent, status FROM affiliates
      WHERE code = ${code}
      LIMIT 1
    `
    const affiliate = Array.isArray(affiliateRows) ? affiliateRows[0] as { commission_percent?: number | string; status?: string } | undefined : undefined
    if (!affiliate) {
      return { recorded: false, reason: 'unknown_affiliate' }
    }
    if (affiliate.status && affiliate.status !== 'active') {
      return { recorded: false, reason: `affiliate_${affiliate.status}` }
    }

    const commissionPercentRaw = affiliate.commission_percent == null
      ? DEFAULT_COMMISSION_PERCENT
      : Number(affiliate.commission_percent)
    const { commissionAmount, commissionPercent } = computeAffiliateCommission({
      grossAmount: amount,
      commissionPercent: commissionPercentRaw,
    })

    const dup = await sql`
      SELECT id FROM affiliate_sales
      WHERE booking_reference = ${bookingRef} AND affiliate_code = ${code}
      LIMIT 1
    `
    if (Array.isArray(dup) && dup.length > 0) {
      return { recorded: false, reason: 'duplicate' }
    }

    // Insert. status defaults to 'pending' (column default). We store commission_amount
    // and activity_date at insert time so the dashboard/payout math doesn't have to
    // re-derive them, and so the display state can show "activité le DD/MM" + "versement
    // fin MMMM" from day one.
    await sql`
      INSERT INTO affiliate_sales (
        affiliate_code, booking_reference, amount, activity_name,
        commission_amount, visitor_id, activity_date
      )
      VALUES (
        ${code}, ${bookingRef}, ${amount}, ${activityName},
        ${commissionAmount}, ${visitorId}, ${activityDate}
      )
    `
    console.log('[affiliate_sales] recorded', {
      code,
      bookingRef,
      amount,
      commissionPercent,
      commissionAmount,
      visitorId,
      activityDate,
    })
    return { recorded: true, affiliateCode: code, commissionAmount }
  } catch (e) {
    console.error('[affiliate_sales] insert failed', e)
    return { recorded: false, reason: 'db_error' }
  }
}
