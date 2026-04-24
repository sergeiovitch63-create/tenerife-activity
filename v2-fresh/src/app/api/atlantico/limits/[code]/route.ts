import { NextResponse, type NextRequest } from 'next/server'
import { getLimits } from '@/lib/atlantico/client'
import { isLocale, type Locale } from '@/lib/locale'

export const revalidate = 120

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } },
) {
  const qLocale = req.nextUrl.searchParams.get('locale') ?? 'fr'
  const locale = (isLocale(qLocale) ? qLocale : 'fr') as Locale
  const month = req.nextUrl.searchParams.get('month') ?? undefined
  const limits = await getLimits(params.code, locale, month)
  if (!limits) return NextResponse.json({ error: 'not available' }, { status: 404 })
  return NextResponse.json(limits)
}
