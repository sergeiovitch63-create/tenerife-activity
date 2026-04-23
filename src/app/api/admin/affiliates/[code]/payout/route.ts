import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin/auth'
import { payoutAffiliate } from '@/lib/back-office/affiliates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.redirect(new URL('/back-office/login', request.nextUrl.origin), { status: 303 })
  }

  const code = decodeURIComponent(params.code)
  const result = await payoutAffiliate(code)

  const flash = result.ok
    ? `paid:${result.count}:${result.total.toFixed(2)}`
    : 'error'

  return NextResponse.redirect(
    new URL(
      `/back-office/affiliates/${encodeURIComponent(code)}?flash=${encodeURIComponent(flash)}`,
      request.nextUrl.origin,
    ),
    { status: 303 },
  )
}
