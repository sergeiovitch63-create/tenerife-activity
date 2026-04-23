import 'server-only'
import type {
  AtlanticoClassification,
  AtlanticoGroup,
  AtlanticoEvent,
  AtlanticoLimits,
  BookingPayload,
  ParsedPrice,
} from './types'
import { parseIds, parsePriceString, toAtlanticoDate } from './normalize'
import { findNextAvailableDate } from './availability'
import { atlanticoLangMap, type Locale } from '@/lib/locale'

const BASE_URL = process.env.ATLANTICO_PROXY_URL
  ?? process.env.ATLANTICO_BASE_URL
  ?? 'https://api.tenerife-activity.com'
const COLLABORATOR = process.env.ATLANTICO_USER_ID ?? '3645'
const TIMEOUT_MS = Number(process.env.ATLANTICO_TIMEOUT_MS ?? '10000')
const DEFAULT_REVALIDATE = Number(process.env.ATLANTICO_REVALIDATE_SECONDS ?? '300')

async function httpGet<T>(path: string, revalidate: number = DEFAULT_REVALIDATE): Promise<T | null> {
  const url = `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      next: { revalidate },
      signal: ctrl.signal,
    })
    if (!res.ok) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[atlantico] GET ${path} → ${res.status}`)
      }
      return null
    }
    const text = await res.text()
    if (!text) return null
    try {
      return JSON.parse(text) as T
    } catch {
      return text as unknown as T
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[atlantico] GET ${path} failed`, err instanceof Error ? err.message : err)
    }
    return null
  } finally {
    clearTimeout(timer)
  }
}

function toAtlanticoLang(locale: Locale): string {
  return atlanticoLangMap[locale]
}

// 2.1 clasificationList/{language}/{Collaborator}
export async function getClassifications(locale: Locale): Promise<AtlanticoClassification[]> {
  const lang = toAtlanticoLang(locale)
  const res = await httpGet<AtlanticoClassification[]>(
    `/clasificationList/${lang}/${COLLABORATOR}`,
    3600,
  )
  if (!Array.isArray(res)) return []
  return res.filter((c) => !c.hidden || c.hidden === '0')
}

// 2.2 groupsList/{language}/{page}/{classificationCode}
export async function getGroups(
  locale: Locale,
  opts: { page?: number; classificationCode?: string } = {},
): Promise<AtlanticoGroup[]> {
  const lang = toAtlanticoLang(locale)
  const page = opts.page ?? -1
  const parts = [`/groupsList`, lang, String(page)]
  if (opts.classificationCode) parts.push(opts.classificationCode)
  const res = await httpGet<AtlanticoGroup[]>(parts.join('/'), 1800)
  return Array.isArray(res) ? res : []
}

// 2.3 groupDetails/{Code}/{language}
export async function getGroupDetails(code: string, locale: Locale): Promise<AtlanticoGroup | null> {
  const lang = toAtlanticoLang(locale)
  const res = await httpGet<AtlanticoGroup | AtlanticoGroup[]>(`/groupDetails/${code}/${lang}`, 1800)
  if (!res) return null
  return Array.isArray(res) ? (res[0] ?? null) : res
}

// 2.4 eventDetails/{Code}/{language}
export async function getEventDetails(code: string, locale: Locale): Promise<AtlanticoEvent | null> {
  const lang = toAtlanticoLang(locale)
  const res = await httpGet<AtlanticoEvent | AtlanticoEvent[]>(`/eventDetails/${code}/${lang}`, 1800)
  if (!res) return null
  return Array.isArray(res) ? (res[0] ?? null) : res
}

/**
 * Fetch prices for an event option.
 * By default we omit `office` because with `office=3645` the API returns `[]`
 * (no special collaborator price) — we want the default public price.
 * Pass `useOffice: true` if you need a collaborator-specific price tier.
 */
export async function getPrice(
  code: string,
  date: Date | string,
  opts: { useOffice?: boolean } = {},
): Promise<ParsedPrice | null> {
  const d = toAtlanticoDate(date)
  const path = opts.useOffice
    ? `/loadPrices/${code}/${d}/${COLLABORATOR}`
    : `/loadPrices/${code}/${d}`
  const raw = await httpGet<unknown>(path, 60)
  if (raw == null) return null
  return parsePriceString(raw)
}

/** Fetch prices for multiple event codes at one date, in parallel */
export async function getPrices(
  codes: string[],
  date: Date | string,
): Promise<Record<string, ParsedPrice | null>> {
  const entries = await Promise.all(
    codes.map(async (c) => [c, await getPrice(c, date)] as const),
  )
  return Object.fromEntries(entries)
}

// 2.6 loadLimits/{Code}/{Language}/{Date}
export async function getLimits(
  code: string,
  locale: Locale,
  monthStart?: Date | string,
): Promise<AtlanticoLimits | null> {
  const lang = toAtlanticoLang(locale)
  const parts = [`/loadLimits`, code, lang]
  if (monthStart) parts.push(toAtlanticoDate(monthStart))
  const res = await httpGet<AtlanticoLimits>(parts.join('/'), 120)
  return res ?? null
}

// 2.7 POST /payment/ — returns a redirect URL or HTML of the gateway
export async function createPayment(payload: BookingPayload): Promise<
  { ok: true; redirectUrl?: string; html?: string; reference?: string }
  | { ok: false; status: number; message: string }
> {
  const body = new URLSearchParams()
  Object.entries(payload).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    body.append(k, String(v))
  })
  if (!body.has('userId')) body.append('userId', COLLABORATOR)

  const url = `${BASE_URL}/payment/`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        Accept: 'text/html,application/json',
      },
      body: body.toString(),
      redirect: 'manual',
      cache: 'no-store',
    })

    const location = res.headers.get('location')
    if (location) return { ok: true, redirectUrl: location }

    const text = await res.text()
    const matchAction = text.match(/<form[^>]*action=["']([^"']+)["']/i)
    if (matchAction) return { ok: true, html: text, redirectUrl: matchAction[1] }

    const matchRef = text.match(/(?:reference|booking|ref)[^\d]*(\d{3,})/i)
    if (matchRef) return { ok: true, reference: matchRef[1] }

    if (res.ok) return { ok: true, html: text }
    return { ok: false, status: res.status, message: text.slice(0, 400) }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      message: err instanceof Error ? err.message : 'network error',
    }
  }
}

// 2.8 cancelBooking/{BookingCode}/{Note}
export async function cancelBooking(ref: string, note = ''): Promise<boolean> {
  const path = note ? `/cancelBooking/${ref}/${encodeURIComponent(note)}` : `/cancelBooking/${ref}`
  const res = await httpGet<string | number>(path, 0)
  return res === 0 || res === '0'
}

export const atlanticoConfig = {
  baseUrl: BASE_URL,
  collaborator: COLLABORATOR,
}

/**
 * For a list of groups, compute the "next available date" per group by fetching
 * loadLimits for each group's first option. Batched with a concurrency cap to
 * avoid hammering the proxy.
 *
 * Returns a map { groupCode → 'YYYY-MM-DD' | null }.
 */
export async function nextDatesForGroups(
  groups: AtlanticoGroup[],
  locale: Locale,
  opts: { concurrency?: number } = {},
): Promise<Record<string, string | null>> {
  const concurrency = opts.concurrency ?? 20
  const out: Record<string, string | null> = {}
  const tasks: Array<{ code: string; eventCode: string }> = []

  for (const g of groups) {
    const firstEvent = parseIds(g.ids)[0]
    if (firstEvent) tasks.push({ code: g.code, eventCode: firstEvent })
  }

  for (let i = 0; i < tasks.length; i += concurrency) {
    const chunk = tasks.slice(i, i + concurrency)
    const results = await Promise.all(
      chunk.map(async ({ code, eventCode }) => {
        const limits = await getLimits(eventCode, locale)
        return { code, date: findNextAvailableDate(limits) }
      }),
    )
    for (const { code, date } of results) out[code] = date
  }

  return out
}
