import { NextResponse, type NextRequest } from 'next/server'
import { createPayment } from '@/lib/atlantico/client'
import type { BookingPayload } from '@/lib/atlantico/types'

export async function POST(req: NextRequest) {
  let body: BookingPayload
  try {
    body = (await req.json()) as BookingPayload
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 })
  }

  const required: (keyof BookingPayload)[] = [
    'userId', 't_id', 't_group', 'language', 'tourDate', 'adults', 'childs', 'infants', 'name', 'email', 'phone',
  ]
  const missing = required.filter((k) => body[k] === undefined || body[k] === null || body[k] === '')
  if (missing.length) {
    return NextResponse.json({ ok: false, error: `missing: ${missing.join(', ')}` }, { status: 400 })
  }

  const result = await createPayment(body)
  if (!result.ok) return NextResponse.json(result, { status: result.status || 500 })
  return NextResponse.json(result)
}
