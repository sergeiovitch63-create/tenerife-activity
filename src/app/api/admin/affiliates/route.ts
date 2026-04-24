import { NextRequest, NextResponse } from 'next/server'
import { createAffiliate, type AffiliateStatus } from '@/lib/back-office/affiliates'
import { isAdminAuthenticated } from '@/lib/admin/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function coerceStatus(raw: string | null | undefined): AffiliateStatus {
  if (raw === 'active' || raw === 'pending' || raw === 'suspended') return raw
  return 'active'
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.redirect(new URL('/back-office/login', request.nextUrl.origin), { status: 303 })
  }

  const form = await request.formData().catch(() => null)
  if (!form) {
    return NextResponse.redirect(
      new URL('/back-office/affiliates/new?error=db_error', request.nextUrl.origin),
      { status: 303 },
    )
  }

  const code = String(form.get('code') ?? '')
  const name = String(form.get('name') ?? '')
  const emailRaw = String(form.get('email') ?? '').trim()
  const email = emailRaw ? emailRaw : null
  const rateRaw = form.get('commission_percent')
  const rate = rateRaw != null && rateRaw !== '' ? Number(rateRaw) : 10
  const status = coerceStatus(String(form.get('status') ?? ''))

  const result = await createAffiliate({
    code,
    name,
    email,
    commissionPercent: rate,
    status,
  })

  if (!result.ok) {
    const qs = new URLSearchParams({ error: result.reason })
    return NextResponse.redirect(
      new URL(`/back-office/affiliates/new?${qs.toString()}`, request.nextUrl.origin),
      { status: 303 },
    )
  }

  // Flash the plain password ONCE via query string. Admin copies it from the
  // purple banner; after any navigation it's gone.
  const flash = `newpwd:${result.plainPassword}`
  return NextResponse.redirect(
    new URL(
      `/back-office/affiliates/${encodeURIComponent(result.affiliate.code)}?flash=${encodeURIComponent(flash)}`,
      request.nextUrl.origin,
    ),
    { status: 303 },
  )
}
