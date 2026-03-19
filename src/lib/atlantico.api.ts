import { toApiLang } from '@/lib/atlantico'
import type {
  ApiClassification,
  ApiEvent,
  ApiLimits,
  ApiTour,
  ApiTourDetail,
} from '@/lib/atlantico.types'

const BASE = process.env.ATLANTICO_API_URL ?? 'https://api.atlanticoexcursiones.com'

const ensureOk = async (res: Response, context: string): Promise<void> => {
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${context} failed (${res.status}): ${body || res.statusText}`)
  }
}

const toArray = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[]
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>
    const nested = obj.data ?? obj.items ?? obj.results ?? obj.rows
    if (Array.isArray(nested)) return nested as T[]
  }
  return []
}

const toObject = <T>(payload: unknown): T | null => {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as T
  }
  if (Array.isArray(payload) && payload[0] && typeof payload[0] === 'object') {
    return payload[0] as T
  }
  return null
}

export async function getClassifications(locale: string): Promise<ApiClassification[]> {
  const res = await fetch(`${BASE}/clasificationList/${toApiLang(locale)}`, {
    next: { revalidate: 3600 },
  })
  await ensureOk(res, 'getClassifications')
  const data = (await res.json()) as unknown
  return toArray<ApiClassification>(data)
}

export async function getTours(
  locale: string,
  classCode?: string,
  page = -1
): Promise<ApiTour[]> {
  const encodedClass = classCode ? encodeURIComponent(classCode) : ''
  const res = await fetch(
    `${BASE}/groupsList/${toApiLang(locale)}/${page}/${encodedClass}`,
    { next: { revalidate: 1800 } }
  )
  await ensureOk(res, 'getTours')
  const data = (await res.json()) as unknown
  return toArray<ApiTour>(data)
}

export async function getTourDetail(code: string, locale: string): Promise<ApiTourDetail> {
  const res = await fetch(
    `${BASE}/groupDetails/${encodeURIComponent(code)}/${toApiLang(locale)}`,
    { next: { revalidate: 1800 } }
  )
  await ensureOk(res, 'getTourDetail')
  const data = (await res.json()) as unknown
  const detail = toObject<ApiTourDetail>(data)
  if (!detail) {
    throw new Error('getTourDetail returned invalid payload')
  }
  return detail
}

export async function getEventDetail(code: string, locale: string): Promise<ApiEvent> {
  const res = await fetch(
    `${BASE}/eventDetails/${encodeURIComponent(code)}/${toApiLang(locale)}`,
    { next: { revalidate: 1800 } }
  )
  await ensureOk(res, 'getEventDetail')
  const data = (await res.json()) as unknown
  const detail = toObject<ApiEvent>(data)
  if (!detail) {
    throw new Error('getEventDetail returned invalid payload')
  }
  return detail
}

export async function getLimits(
  eventCode: string,
  locale: string,
  date: string
): Promise<ApiLimits> {
  const res = await fetch(
    `${BASE}/loadLimits/${encodeURIComponent(eventCode)}/${toApiLang(locale)}/${encodeURIComponent(date)}`,
    { cache: 'no-store' }
  )
  await ensureOk(res, 'getLimits')
  const data = (await res.json()) as unknown
  const limits = toObject<ApiLimits>(data)
  if (!limits) {
    throw new Error('getLimits returned invalid payload')
  }
  return limits
}

