/**
 * Affiliate commission calculation.
 *
 * v1 model: gross only — commission = gross_amount * (commission_percent / 100).
 * Per-affiliate rate stored in affiliates.commission_percent (default 10).
 */

export const DEFAULT_COMMISSION_PERCENT = 10

export interface CommissionInput {
  grossAmount: number | null | undefined
  commissionPercent?: number | null | undefined
}

export interface CommissionResult {
  grossAmount: number
  commissionPercent: number
  commissionAmount: number
}

export function computeAffiliateCommission(input: CommissionInput): CommissionResult {
  const gross = Number.isFinite(Number(input.grossAmount)) ? Number(input.grossAmount) : 0
  const rateRaw = Number(input.commissionPercent ?? DEFAULT_COMMISSION_PERCENT)
  const rate = Number.isFinite(rateRaw) ? clamp(rateRaw, 0, 100) : DEFAULT_COMMISSION_PERCENT
  const commission = round2((gross * rate) / 100)
  return {
    grossAmount: round2(gross),
    commissionPercent: rate,
    commissionAmount: commission,
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
