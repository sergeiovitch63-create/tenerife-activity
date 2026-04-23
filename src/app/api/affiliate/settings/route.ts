import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/affiliate/session'
import { updateAffiliate } from '@/lib/back-office/affiliates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const session = await getCurrentAffiliate()
  if (!session) {
    return NextResponse.redirect(new URL('/affiliate/login', request.nextUrl.origin), {
      status: 303,
    })
  }

  const form = await request.formData().catch(() => null)
  if (!form) {
    return NextResponse.redirect(
      new URL('/affiliate/settings?error=db_error', request.nextUrl.origin),
      { status: 303 },
    )
  }

  const rawEmail = String(form.get('email') ?? '').trim()
  const email = rawEmail || null
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.redirect(
      new URL('/affiliate/settings?error=invalid_email', request.nextUrl.origin),
      { status: 303 },
    )
  }

  // Only allow updating the email field — not name/status/commission (admin-only).
  const ok = await updateAffiliate(session.affiliateCode, { email })

  return NextResponse.redirect(
    new URL(
      ok ? '/affiliate/settings?flash=updated' : '/affiliate/settings?error=db_error',
      request.nextUrl.origin,
    ),
    { status: 303 },
  )
}
