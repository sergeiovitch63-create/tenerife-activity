/**
 * DEBUG PAGE - Atlantico eventDetails
 *
 * For a given eventId (tour option), displays details from:
 *   GET /api/atlantico/event-details?eventId=&lang=
 *
 * Fields highlighted: id, code, name, days, times, fak, pProd, route, desc, icons.
 */

import type { Metadata } from 'next'
import { mapLocaleToLang } from '@/lib/atlantico/locale'
import { Section, Container, Stack } from '@/ui/components/layout'
import { Link } from '@/navigation'
import { decodeTextFromApi } from '@/lib/atlantico/htmlAssets'
import { getEventPrices, parsePerPersonPrices, parsePerDayPrices } from '@/lib/atlantico'
import type { MeetingPoint } from '@/app/api/atlantico/event-details/route'

interface PageParams {
  params: Promise<{ locale: string }>
  searchParams?: Promise<{ eventId?: string }>
}

type EventDetails = {
  id: string
  code: string
  name: string
  days: number | number[] | null
  times: string[]
  pProd: '0' | '1' | '2' | '3' | null
  route: string | null
  icons: string[]
  desc: string | null
  meetingPoints?: MeetingPoint[]
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params, searchParams }: PageParams): Promise<Metadata> {
  const { locale } = await params
  const query = (await searchParams) || {}
  const eventId = query.eventId || 'event'

  return {
    title: `Event details – ${eventId} – ${locale}`,
  }
}

export default async function EventDetailsDebugPage({ params, searchParams }: PageParams) {
  const { locale } = await params
  const query = (await searchParams) || {}

  // Force stable Atlantico base language (ENG) regardless of site locale
  const lang = 'ENG'
  const eventId = query.eventId || ''

  if (!eventId) {
    return (
      <Section variant="default" background="default">
        <Container size="lg" className="py-12">
          <div className="glass-panel p-6 text-center text-sm text-red-600">
            <p className="font-semibold">Missing eventId in query string.</p>
          </div>
        </Container>
      </Section>
    )
  }

  // Disable in production
  if (process.env.NODE_ENV === 'production') {
    return (
      <Section variant="default" background="default">
        <Container size="lg" className="py-12">
          <div className="glass-panel p-6 text-center text-sm text-glass-700">
            <p className="font-semibold">Event details debug page disabled in production.</p>
          </div>
        </Container>
      </Section>
    )
  }

  let details: EventDetails | null = null
  let error: string | null = null
  let priceRaw: string | null = null
  let perPerson: { adult: number; child: number; infant: number } | null = null
  let perDay: Array<{ upToDays: number; price: number }> | null = null
  let limits: {
    quote: number | null
    monthStart: string
    availableDates: string[]
    sessionsByDay: Record<
      string,
      Array<{
        time: string
        available: number
      }>
    >
    calendarMode?: 'sessions' | 'dates' | 'wdays_only' | 'none'
  } | null = null
  let limitsError: string | null = null

  try {
    const headersList = await import('next/headers').then((m) => m.headers)
    const hdrs = headersList()
    const host = hdrs.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || ''
    const origin = envBase ? envBase : `${protocol}://${host}`

    const res = await fetch(
      `${origin}/api/atlantico/event-details?eventId=${encodeURIComponent(
        eventId
      )}&lang=${encodeURIComponent(lang)}`,
      { cache: 'no-store' }
    )

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      error = `HTTP ${res.status} ${res.statusText}${text ? ` – ${text.slice(0, 200)}` : ''}`
    } else {
      details = (await res.json()) as EventDetails
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown error'
  }

  // Try to fetch prices via loadPrices (today's date)
  if (!error) {
    try {
      const today = new Date()
      const yyyy = today.getFullYear()
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const dd = String(today.getDate()).padStart(2, '0')
      const date = `${yyyy}-${mm}-${dd}`

      priceRaw = await getEventPrices(String(eventId), date)
      if (priceRaw) {
        perPerson = parsePerPersonPrices(priceRaw) || null
        perDay = parsePerDayPrices(priceRaw)
      }
    } catch {
      // ignore pricing errors in debug page
    }
  }

  // Try to fetch limits (availability) via loadLimits for current month
  if (!error) {
    try {
      const headersList = await import('next/headers').then((m) => m.headers)
      const hdrs = headersList()
      const host = hdrs.get('host') || 'localhost:3000'
      const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
      const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || ''
      const origin = envBase ? envBase : `${protocol}://${host}`

      const now = new Date()
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

      const res = await fetch(
        `${origin}/api/atlantico/limits?eventId=${encodeURIComponent(
          String(eventId)
        )}&lang=${encodeURIComponent(lang)}&month=${encodeURIComponent(monthStart)}`,
        { cache: 'no-store' }
      )

      if (res.ok) {
        const data = (await res.json()) as {
          ok: boolean
          quote: number | null
          monthStart: string
          availableDates: string[]
          sessionsByDay: Record<
            string,
            Array<{
              time: string
              available: number
            }>
          >
          calendarMode?: 'sessions' | 'dates' | 'wdays_only' | 'none'
          error?: string
        }
        if (data.ok) {
          limits = {
            quote: data.quote,
            monthStart: data.monthStart,
            availableDates: data.availableDates || [],
            sessionsByDay: data.sessionsByDay || {},
            calendarMode: data.calendarMode,
          }
        } else {
          limitsError = data.error || 'Invalid response format from /api/atlantico/limits'
        }
      } else {
        const text = await res.text().catch(() => '')
        limitsError = `HTTP ${res.status} ${res.statusText}${text ? ` – ${text.slice(0, 200)}` : ''}`
      }
    } catch (e) {
      limitsError = e instanceof Error ? e.message : 'Unknown error'
    }
  }

  const statusMessage = error
    ? 'Erreur lors du chargement de l’event'
    : details
      ? 'Détails de l’event chargés'
      : 'Aucune donnée pour cet event'

  const daysText =
    details?.days == null
      ? '—'
      : Array.isArray(details.days)
        ? details.days.join(', ')
        : String(details.days)

  const timesText = details?.times && details.times.length > 0 ? details.times.join(', ') : '—'

  const pProdMap: Record<string, string> = {
    '0': '0 – Price per person',
    '1': '1 – Price per product',
    '2': '2 – Price per day',
    '3': '3 – Unique price',
  }
  const pProdText = details?.pProd != null ? pProdMap[String(details.pProd)] || String(details.pProd) : '—'

  const isEvent2744 = String(eventId) === '2744'
  const departureTime =
    isEvent2744 && details?.times && details.times.length > 0
      ? details.times.find((t) => t && t !== '-') || details.times[0] || null
      : null

  return (
    <>
      <Section variant="default" background="subtle">
        <Container size="lg">
          <div className="glass-panel p-6 md:p-8">
            <Stack direction="column" gap="md" align="start">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-glass-500">Atlantico · Debug</p>
                <h1 className="text-3xl md:text-4xl font-bold text-glass-900">
                  {decodeTextFromApi(details?.name) || `Event ${eventId}`}
                </h1>
                <p className="text-sm text-glass-600 space-x-4">
                  <span>
                    Event ID&nbsp;: <span className="font-mono">{details?.id || eventId}</span>
                  </span>
                  <span>
                    Code&nbsp;: <span className="font-mono">{details?.code || eventId}</span>
                  </span>
                  <span>
                    Langue API&nbsp;: <span className="font-mono">{lang}</span>
                  </span>
                </p>
              </div>
              <div
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  error
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {statusMessage}
                {error && (
                  <span className="block text-xs text-red-500 mt-1">
                    Détail&nbsp;: {error}
                  </span>
                )}
              </div>
              <Link
                href="/debug/classifications"
                className="text-xs text-ocean-700 hover:underline"
              >
                ← Retour aux classifications
              </Link>
            </Stack>
          </div>
        </Container>
      </Section>

      <Section variant="default" background="default">
        <Container size="lg" className="py-8 space-y-8">
          {/* Core fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel rounded-xl p-4 space-y-3 text-sm text-glass-700">
              <h2 className="text-lg font-semibold text-glass-900 mb-1">Planning</h2>
              <p>
                <span className="font-semibold">Days&nbsp;:</span> {daysText}
              </p>
              <p>
                <span className="font-semibold">Times&nbsp;:</span> {timesText}
              </p>
              <p>
                <span className="font-semibold">pProd&nbsp;:</span> {pProdText}
              </p>
              {isEvent2744 && (
                <p>
                  <span className="font-semibold">Départ&nbsp;:</span>{' '}
                  {departureTime ? `${departureTime} – Puerto de la Cruz` : 'Puerto de la Cruz'}
                </p>
              )}
              <div className="pt-3 border-t border-glass-200 mt-3 space-y-1">
                <h3 className="text-sm font-semibold text-glass-900">Disponibilités (loadLimits)</h3>
                {limits ? (
                  <div className="space-y-1 text-xs text-glass-700">
                    <p>
                      <span className="font-semibold">Mois&nbsp;:</span> {limits.monthStart}
                    </p>
                    <p>
                      <span className="font-semibold">Quote&nbsp;:</span>{' '}
                      {limits.quote != null ? limits.quote : <span className="text-glass-400">—</span>}
                    </p>
                    <p>
                      <span className="font-semibold">Calendar mode&nbsp;:</span>{' '}
                      {limits.calendarMode || 'none'}
                    </p>
                    <p>
                      <span className="font-semibold">Dates disponibles&nbsp;:</span>{' '}
                      {limits.availableDates.length > 0 ? (
                        <span>
                          {limits.availableDates.slice(0, 8).join(', ')}
                          {limits.availableDates.length > 8 && ' …'}
                        </span>
                      ) : (
                        <span className="text-glass-400">aucune</span>
                      )}
                    </p>
                    {Object.keys(limits.sessionsByDay || {}).length > 0 && (
                      <div className="space-y-0.5">
                        <p className="font-semibold text-glass-900">Sessions (exemples)&nbsp;:</p>
                        {Object.entries(limits.sessionsByDay)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .slice(0, 3)
                          .map(([date, sessions]) => (
                            <p key={date}>
                              <span className="font-mono">{date}</span> ·{' '}
                              {sessions
                                .map((s) => `${s.time} (${s.available})`)
                                .join(', ')}
                            </p>
                          ))}
                      </div>
                    )}
                  </div>
                ) : limitsError ? (
                  <p className="text-xs text-red-500">
                    Erreur loadLimits&nbsp;: {limitsError}
                  </p>
                ) : (
                  <p className="text-xs text-glass-400 italic">
                    Aucune donnée loadLimits (ou appel échoué).
                  </p>
                )}
              </div>
            </div>
            <div className="glass-panel rounded-xl p-4 space-y-3 text-sm text-glass-700">
              <h2 className="text-lg font-semibold text-glass-900 mb-1">Route &amp; Icons</h2>
              <p className="break-all">
                <span className="font-semibold">Route URL&nbsp;:</span>{' '}
                {details?.route || <span className="text-glass-400">—</span>}
              </p>
              <div>
                {isEvent2744 ? (
                  <div className="mt-2 space-y-3">
                    <p className="font-semibold mb-1">Incluidos / No incluidos</p>
                    <div className="border-t border-glass-200 pt-3 space-y-2">
                      <p className="text-sm font-semibold text-emerald-600">Incluido en el precio:</p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-glass-100 rounded-full">
                          <span className="w-5 h-5 rounded-full bg-ocean-500 text-white text-xs flex items-center justify-center">
                            B
                          </span>
                          <span>Bebidas</span>
                        </span>
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-glass-100 rounded-full">
                          <span className="w-5 h-5 rounded-full bg-ocean-500 text-white text-xs flex items-center justify-center">
                            C
                          </span>
                          <span>Comida</span>
                        </span>
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-glass-100 rounded-full">
                          <span className="w-5 h-5 rounded-full bg-ocean-500 text-white text-xs flex items-center justify-center">
                            MR
                          </span>
                          <span>Movilidad reducida</span>
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-red-600 mt-3">No incluido en el precio:</p>
                      <p className="text-xs text-glass-500">
                        Consultar detalles de la actividad para más información.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="font-semibold mb-1">Icons:</p>
                    {details?.icons && details.icons.length > 0 ? (
                      <ul className="flex flex-wrap gap-2 text-xs text-glass-700">
                        {details.icons.map((icon) => (
                          <li
                            key={icon}
                            className="inline-flex items-center rounded-full bg-glass-100 px-2 py-0.5"
                          >
                            {decodeTextFromApi(icon)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-glass-400 italic">Aucune icône.</p>
                    )}
                  </>
                )}
              </div>
              <div className="pt-3 border-t border-glass-200 mt-3 space-y-2">
                <h3 className="text-sm font-semibold text-glass-900">Prix (loadPrices)</h3>
                {priceRaw ? (
                  <div className="space-y-1 text-xs">
                    <p className="font-mono break-all text-glass-600">
                      Brut:&nbsp;{priceRaw}
                    </p>
                    {perPerson && (
                      <p className="text-glass-700">
                        <span className="font-semibold">Par personne&nbsp;:</span>{' '}
                        Adulte {perPerson.adult.toFixed(2)} € · Enfant {perPerson.child.toFixed(2)} € · Bébé{' '}
                        {perPerson.infant.toFixed(2)} €
                      </p>
                    )}
                    {perDay && perDay.length > 0 && (
                      <div className="space-y-1">
                        <p className="font-semibold text-glass-900">Par jour :</p>
                        <ul className="space-y-0.5">
                          {perDay.map((tier) => (
                            <li key={tier.upToDays} className="text-glass-700">
                              Jusqu’à {tier.upToDays} jour(s)&nbsp;: {tier.price.toFixed(2)} €
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {!perPerson && (!perDay || perDay.length === 0) && (
                      <p className="text-glass-400 italic">
                        Format de prix non reconnu (voir la chaîne brute ci-dessus).
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-glass-400 italic">
                    Aucun prix loadPrices disponible (ou appel échoué).
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-glass-900">Description</h2>
            {details?.desc ? (
              <p className="text-sm text-glass-700 leading-relaxed whitespace-pre-line">
                {decodeTextFromApi(details.desc)}
              </p>
            ) : (
              <p className="text-sm text-glass-400 italic">Aucune description.</p>
            )}
          </div>
        </Container>
      </Section>
    </>
  )
}

