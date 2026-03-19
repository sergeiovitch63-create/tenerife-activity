import { NextRequest, NextResponse } from 'next/server'

const BASE = process.env.ATLANTICO_API_URL ?? 'https://api.atlanticoexcursiones.com'

type BookPayload = {
  t_id: string
  t_group: string
  locale: string
  tourDate: string
  sesTime?: string
  adults: number
  childs: number
  infants: number
  name: string
  email: string
  phone: string
}

const toPaymentLang = (locale: string): string =>
  (
    {
      en: 'ENG',
      fr: 'FRA',
      de: 'ALE',
      it: 'ITA',
      es: 'CAS',
    } as const
  )[locale as 'en' | 'fr' | 'de' | 'it' | 'es'] ?? 'ENG'

const normalizeUrl = (value: string): string | null => {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `${BASE.replace(/\/$/, '')}/${trimmed.replace(/^\//, '')}`
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<BookPayload>

    if (!body.t_id || !body.t_group || !body.locale || !body.tourDate || !body.name || !body.email || !body.phone) {
      return NextResponse.json(
        { error: 'Missing required booking fields' },
        { status: 400 }
      )
    }

    const userId = process.env.ATLANTICO_USER_ID?.trim()
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing ATLANTICO_USER_ID on server' },
        { status: 500 }
      )
    }

    const payload = new URLSearchParams({
      userId,
      t_id: body.t_id,
      t_group: body.t_group,
      lang: toPaymentLang(body.locale),
      tourDate: body.tourDate,
      sesTime: body.sesTime ?? '',
      adults: String(body.adults ?? 1),
      childs: String(body.childs ?? 0),
      infants: String(body.infants ?? 0),
      fullname: body.name,
      email: body.email,
      phone: body.phone,
    })

    const res = await fetch(`${BASE}/payment/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload.toString(),
      cache: 'no-store',
    })

    const contentType = res.headers.get('content-type') ?? ''
    const text = await res.text()

    if (!res.ok) {
      return NextResponse.json(
        { error: `Atlantico payment failed (${res.status})`, detail: text.slice(0, 400) },
        { status: 502 }
      )
    }

    if (contentType.includes('application/json')) {
      try {
        const json = JSON.parse(text) as Record<string, unknown>
        const candidate =
          (typeof json.redirectUrl === 'string' && json.redirectUrl) ||
          (typeof json.url === 'string' && json.url) ||
          (typeof json.paymentUrl === 'string' && json.paymentUrl) ||
          ''
        const redirectUrl = candidate ? normalizeUrl(candidate) : null
        if (redirectUrl) return NextResponse.json({ redirectUrl })
        return NextResponse.json({ error: 'No redirect URL found in payment response' }, { status: 502 })
      } catch {
        return NextResponse.json({ error: 'Invalid JSON payment response' }, { status: 502 })
      }
    }

    const fromMeta = text.match(/https?:\/\/[^"'\s>]+/i)?.[0] ?? null
    const redirectUrl = fromMeta ? normalizeUrl(fromMeta) : null

    if (redirectUrl) {
      return NextResponse.json({ redirectUrl })
    }

    return NextResponse.json(
      { error: 'Unable to extract redirect URL from payment response' },
      { status: 502 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Unexpected booking error',
        detail: error instanceof Error ? error.message : 'unknown',
      },
      { status: 500 }
    )
  }
}

