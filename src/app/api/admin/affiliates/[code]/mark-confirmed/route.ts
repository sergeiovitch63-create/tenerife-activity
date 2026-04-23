import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin/auth'
import { markPendingSalesConfirmed } from '@/lib/back-office/affiliates'

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
  const n = await markPendingSalesConfirmed(code)

  return NextResponse.redirect(
    new URL(
      `/back-office/affiliates/${encodeURIComponent(code)}?flash=confirmed:${n}`,
      request.nextUrl.origin,
    ),
    { status: 303 },
  )
}
