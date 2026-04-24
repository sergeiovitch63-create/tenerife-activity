import { NextResponse, type NextRequest } from 'next/server'
import { getPrice } from '@/lib/atlantico/client'

export const revalidate = 60

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } },
) {
  const date = req.nextUrl.searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'date required (YYYY-MM-DD)' }, { status: 400 })
  const price = await getPrice(params.code, date)
  if (!price) return NextResponse.json({ error: 'not available' }, { status: 404 })
  return NextResponse.json(price)
}
