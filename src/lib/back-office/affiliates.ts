import 'server-only'
import { getSql } from '@/lib/db/postgres'
import { parseAffiliateRef } from '@/lib/affiliate/ref'
import { generatePassword, hashPassword } from '@/lib/affiliate/password'

export type AffiliateStatus = 'pending' | 'active' | 'suspended'
export type SaleStatus = 'pending' | 'confirmed' | 'cancelled' | 'paid'

export interface AffiliateRow {
  id: string
  code: string
  name: string
  email: string | null
  commission_percent: number
  status: AffiliateStatus
  cookie_window_days: number
  created_at: string
  approved_at: string | null
  totalSales?: number
  totalCommission?: number
  confirmedSales?: number
  confirmedCommission?: number
}

export interface AffiliateSaleRow {
  id: string
  affiliate_code: string
  booking_reference: string | null
  amount: number | null
  activity_name: string | null
  commission_amount: number | null
  visitor_id: string | null
  status: SaleStatus
  created_at: string
  confirmed_at: string | null
  cancelled_at: string | null
  paid_at: string | null
}

function toNumber(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function normalizeAffiliate(r: Record<string, unknown>): AffiliateRow {
  return {
    id: String(r.id ?? ''),
    code: String(r.code ?? ''),
    name: String(r.name ?? ''),
    email: r.email == null ? null : String(r.email),
    commission_percent: toNumber(r.commission_percent, 10),
    status: (String(r.status ?? 'pending') as AffiliateStatus),
    cookie_window_days: toNumber(r.cookie_window_days, 30),
    created_at: String(r.created_at ?? ''),
    approved_at: r.approved_at == null ? null : String(r.approved_at),
    totalSales: r.total_sales == null ? undefined : toNumber(r.total_sales),
    totalCommission: r.total_commission == null ? undefined : toNumber(r.total_commission),
    confirmedSales: r.confirmed_sales == null ? undefined : toNumber(r.confirmed_sales),
    confirmedCommission:
      r.confirmed_commission == null ? undefined : toNumber(r.confirmed_commission),
  }
}

function normalizeSale(r: Record<string, unknown>): AffiliateSaleRow {
  return {
    id: String(r.id ?? ''),
    affiliate_code: String(r.affiliate_code ?? ''),
    booking_reference: r.booking_reference == null ? null : String(r.booking_reference),
    amount: r.amount == null ? null : toNumber(r.amount),
    activity_name: r.activity_name == null ? null : String(r.activity_name),
    commission_amount: r.commission_amount == null ? null : toNumber(r.commission_amount),
    visitor_id: r.visitor_id == null ? null : String(r.visitor_id),
    status: String(r.status ?? 'pending') as SaleStatus,
    created_at: String(r.created_at ?? ''),
    confirmed_at: r.confirmed_at == null ? null : String(r.confirmed_at),
    cancelled_at: r.cancelled_at == null ? null : String(r.cancelled_at),
    paid_at: r.paid_at == null ? null : String(r.paid_at),
  }
}

/**
 * List affiliates with aggregated sales stats (left join).
 */
export async function listAffiliates(filter?: {
  status?: AffiliateStatus
}): Promise<AffiliateRow[]> {
  const sql = getSql()
  if (!sql) return []
  try {
    const rows = filter?.status
      ? await sql`
          SELECT
            a.*,
            COUNT(s.id)::int AS total_sales,
            COALESCE(SUM(s.commission_amount), 0)::float AS total_commission,
            COUNT(s.id) FILTER (WHERE s.status IN ('confirmed','paid'))::int AS confirmed_sales,
            COALESCE(SUM(s.commission_amount) FILTER (WHERE s.status IN ('confirmed','paid')), 0)::float AS confirmed_commission
          FROM affiliates a
          LEFT JOIN affiliate_sales s ON s.affiliate_code = a.code
          WHERE a.status = ${filter.status}
          GROUP BY a.id
          ORDER BY a.created_at DESC
        `
      : await sql`
          SELECT
            a.*,
            COUNT(s.id)::int AS total_sales,
            COALESCE(SUM(s.commission_amount), 0)::float AS total_commission,
            COUNT(s.id) FILTER (WHERE s.status IN ('confirmed','paid'))::int AS confirmed_sales,
            COALESCE(SUM(s.commission_amount) FILTER (WHERE s.status IN ('confirmed','paid')), 0)::float AS confirmed_commission
          FROM affiliates a
          LEFT JOIN affiliate_sales s ON s.affiliate_code = a.code
          GROUP BY a.id
          ORDER BY a.created_at DESC
        `
    return (rows as Record<string, unknown>[]).map(normalizeAffiliate)
  } catch (e) {
    console.error('[admin/affiliates] listAffiliates failed', e)
    return []
  }
}

export async function getAffiliateByCode(code: string): Promise<AffiliateRow | null> {
  const sql = getSql()
  if (!sql) return null
  const normalized = parseAffiliateRef(code)
  if (!normalized) return null
  try {
    const rows = await sql`
      SELECT
        a.*,
        COUNT(s.id)::int AS total_sales,
        COALESCE(SUM(s.commission_amount), 0)::float AS total_commission,
        COUNT(s.id) FILTER (WHERE s.status IN ('confirmed','paid'))::int AS confirmed_sales,
        COALESCE(SUM(s.commission_amount) FILTER (WHERE s.status IN ('confirmed','paid')), 0)::float AS confirmed_commission
      FROM affiliates a
      LEFT JOIN affiliate_sales s ON s.affiliate_code = a.code
      WHERE a.code = ${normalized}
      GROUP BY a.id
      LIMIT 1
    `
    if (!Array.isArray(rows) || rows.length === 0) return null
    return normalizeAffiliate(rows[0] as Record<string, unknown>)
  } catch (e) {
    console.error('[admin/affiliates] getAffiliateByCode failed', e)
    return null
  }
}

export async function listSalesForAffiliate(code: string, limit = 100): Promise<AffiliateSaleRow[]> {
  const sql = getSql()
  if (!sql) return []
  const normalized = parseAffiliateRef(code)
  if (!normalized) return []
  try {
    const rows = await sql`
      SELECT * FROM affiliate_sales
      WHERE affiliate_code = ${normalized}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
    return (rows as Record<string, unknown>[]).map(normalizeSale)
  } catch (e) {
    console.error('[admin/affiliates] listSalesForAffiliate failed', e)
    return []
  }
}

export type CreateAffiliateInput = {
  code: string
  name: string
  email?: string | null
  commissionPercent?: number
  status?: AffiliateStatus
}

export type CreateAffiliateResult =
  | { ok: true; affiliate: AffiliateRow; plainPassword: string }
  | { ok: false; reason: 'no_database' | 'invalid_code' | 'invalid_name' | 'invalid_rate' | 'duplicate_code' | 'db_error' }

export async function createAffiliate(input: CreateAffiliateInput): Promise<CreateAffiliateResult> {
  const sql = getSql()
  if (!sql) return { ok: false, reason: 'no_database' }

  const code = parseAffiliateRef(input.code)
  if (!code) return { ok: false, reason: 'invalid_code' }
  const name = String(input.name ?? '').trim()
  if (!name || name.length > 200) return { ok: false, reason: 'invalid_name' }
  const email = input.email ? String(input.email).trim().slice(0, 200) : null
  const rate = input.commissionPercent == null ? 10 : Number(input.commissionPercent)
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) return { ok: false, reason: 'invalid_rate' }
  const status: AffiliateStatus = input.status ?? 'active'

  try {
    const existing = await sql`SELECT 1 AS ok FROM affiliates WHERE code = ${code} LIMIT 1`
    if (Array.isArray(existing) && existing.length > 0) return { ok: false, reason: 'duplicate_code' }

    const plainPassword = generatePassword(12)
    const passwordHash = hashPassword(plainPassword)
    const approvedAt = status === 'active' ? new Date().toISOString() : null
    await sql`
      INSERT INTO affiliates
        (code, name, email, commission_percent, status, approved_at, password_hash)
      VALUES
        (${code}, ${name}, ${email}, ${rate}, ${status}, ${approvedAt}, ${passwordHash})
    `
    const row = await getAffiliateByCode(code)
    if (!row) return { ok: false, reason: 'db_error' }
    return { ok: true, affiliate: row, plainPassword }
  } catch (e) {
    console.error('[admin/affiliates] createAffiliate failed', e)
    return { ok: false, reason: 'db_error' }
  }
}

/**
 * Generate a new random password for an existing affiliate and persist its hash.
 * Returns the plaintext (to be shown ONCE to the admin) on success, null on failure.
 */
export async function resetAffiliatePassword(code: string): Promise<string | null> {
  const sql = getSql()
  if (!sql) return null
  const normalized = parseAffiliateRef(code)
  if (!normalized) return null
  try {
    const existing = await sql`SELECT 1 AS ok FROM affiliates WHERE code = ${normalized} LIMIT 1`
    if (!Array.isArray(existing) || existing.length === 0) return null

    const plain = generatePassword(12)
    const hash = hashPassword(plain)
    await sql`
      UPDATE affiliates SET password_hash = ${hash} WHERE code = ${normalized}
    `
    // Invalidate all existing sessions so old magic-link tokens / logged-in
    // sessions can no longer be used with the old password.
    await sql`DELETE FROM affiliate_sessions WHERE affiliate_code = ${normalized}`
    return plain
  } catch (e) {
    console.error('[admin/affiliates] resetAffiliatePassword failed', e)
    return null
  }
}

/**
 * Look up an affiliate by code and return its password hash + minimal fields
 * needed for login (no heavy joins). Used by POST /api/affiliate/login.
 */
export async function getAffiliateForLogin(code: string): Promise<
  | {
      code: string
      name: string
      email: string | null
      status: AffiliateStatus
      passwordHash: string | null
    }
  | null
> {
  const sql = getSql()
  if (!sql) return null
  const normalized = parseAffiliateRef(code)
  if (!normalized) return null
  try {
    const rows = await sql`
      SELECT code, name, email, status, password_hash
      FROM affiliates WHERE code = ${normalized} LIMIT 1
    `
    if (!Array.isArray(rows) || rows.length === 0) return null
    const r = rows[0] as Record<string, unknown>
    return {
      code: String(r.code ?? ''),
      name: String(r.name ?? ''),
      email: r.email == null ? null : String(r.email),
      status: (String(r.status ?? 'pending') as AffiliateStatus),
      passwordHash: r.password_hash == null ? null : String(r.password_hash),
    }
  } catch (e) {
    console.error('[admin/affiliates] getAffiliateForLogin failed', e)
    return null
  }
}

export type UpdateAffiliateInput = {
  name?: string
  email?: string | null
  commissionPercent?: number
  status?: AffiliateStatus
}

export async function updateAffiliate(code: string, input: UpdateAffiliateInput): Promise<boolean> {
  const sql = getSql()
  if (!sql) return false
  const normalized = parseAffiliateRef(code)
  if (!normalized) return false

  try {
    const existing = await getAffiliateByCode(normalized)
    if (!existing) return false

    const name =
      input.name != null ? String(input.name).trim().slice(0, 200) : existing.name
    const email =
      input.email === undefined
        ? existing.email
        : input.email
          ? String(input.email).trim().slice(0, 200)
          : null
    const rate =
      input.commissionPercent != null && Number.isFinite(Number(input.commissionPercent))
        ? Math.max(0, Math.min(100, Number(input.commissionPercent)))
        : existing.commission_percent
    const status = input.status ?? existing.status

    // approved_at is set when status transitions to 'active' and wasn't before.
    const willApprove = status === 'active' && !existing.approved_at

    if (willApprove) {
      await sql`
        UPDATE affiliates
        SET name = ${name}, email = ${email}, commission_percent = ${rate},
            status = ${status}, approved_at = now()
        WHERE code = ${normalized}
      `
    } else {
      await sql`
        UPDATE affiliates
        SET name = ${name}, email = ${email}, commission_percent = ${rate}, status = ${status}
        WHERE code = ${normalized}
      `
    }
    return true
  } catch (e) {
    console.error('[admin/affiliates] updateAffiliate failed', e)
    return false
  }
}

/**
 * Mark all 'pending' sales of an affiliate as 'confirmed' (manual reconciliation
 * while we don't have a webhook / polling mechanism). Returns the count updated.
 */
export async function markPendingSalesConfirmed(code: string): Promise<number> {
  const sql = getSql()
  if (!sql) return 0
  const normalized = parseAffiliateRef(code)
  if (!normalized) return 0
  try {
    const rows = await sql`
      UPDATE affiliate_sales
      SET status = 'confirmed', confirmed_at = now()
      WHERE affiliate_code = ${normalized} AND status = 'pending'
      RETURNING id
    `
    return Array.isArray(rows) ? rows.length : 0
  } catch (e) {
    console.error('[admin/affiliates] markPendingSalesConfirmed failed', e)
    return 0
  }
}

/**
 * Mark all 'confirmed' sales of an affiliate as 'paid' (manual payout run).
 * Creates an affiliate_payouts row if the table exists.
 * Returns the total amount paid + count of sales.
 */
export async function payoutAffiliate(code: string): Promise<{
  ok: boolean
  count: number
  total: number
}> {
  const sql = getSql()
  if (!sql) return { ok: false, count: 0, total: 0 }
  const normalized = parseAffiliateRef(code)
  if (!normalized) return { ok: false, count: 0, total: 0 }

  try {
    const rows = await sql`
      UPDATE affiliate_sales
      SET status = 'paid', paid_at = now()
      WHERE affiliate_code = ${normalized} AND status = 'confirmed'
      RETURNING commission_amount
    `
    const list = (Array.isArray(rows) ? rows : []) as Array<{ commission_amount: number | string | null }>
    const total = list.reduce((sum, r) => sum + toNumber(r.commission_amount), 0)
    return { ok: true, count: list.length, total: Math.round(total * 100) / 100 }
  } catch (e) {
    console.error('[admin/affiliates] payoutAffiliate failed', e)
    return { ok: false, count: 0, total: 0 }
  }
}
