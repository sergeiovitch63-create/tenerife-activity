import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin/auth'
import { updateAffiliate, type AffiliateStatus } from '@/lib/back-office/affiliates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function coerceStatus(raw: string | null | undefined): AffiliateStatus | undefined {
  if (raw === 'active' || raw === 'pending' || raw === 'suspended') return raw
  return undefined
}

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.redirect(new URL('/back-office/login', request.nextUrl.origin), { status: 303 })
  }

  const code = decodeURIComponent(params.code)
  const form = await request.formData().catch(() => null)
  if (!form) {
    return NextResponse.redirect(
      new URL(`/back-office/affiliates/${encodeURIComponent(code)}?flash=error`, request.nextUrl.origin),
      { status: 303 },
    )
  }

  const nameRaw = form.get('name')
  const emailRaw = form.get('email')
  const rateRaw = form.get('commission_percent')
  const statusRaw = form.get('status')

  const success = await updateAffiliate(code, {
    name: nameRaw != null ? String(nameRaw) : undefined,
    email: emailRaw != null ? (String(emailRaw).trim() ? String(emailRaw).trim() : null) : undefined,
    commissionPercent: rateRaw != null && rateRaw !== '' ? Number(rateRaw) : undefined,
    status: coerceStatus(statusRaw == null ? undefined : String(statusRaw)),
  })

  const flash = success ? 'updated' : 'error'
  return NextResponse.redirect(
    new URL(
      `/back-office/affiliates/${encodeURIComponent(code)}?flash=${flash}`,
      request.nextUrl.origin,
    ),
    { status: 303 },
  )
}
