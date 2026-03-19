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

export async function getClassifications(locale: string): Promise<ApiClassification[]> {
  const res = await fetch(`${BASE}/clasificationList/${toApiLang(locale)}`, {
    next: { revalidate: 3600 },
  })
  await ensureOk(res, 'getClassifications')
  return (await res.json()) as ApiClassification[]
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
  return (await res.json()) as ApiTour[]
}

export async function getTourDetail(code: string, locale: string): Promise<ApiTourDetail> {
  const res = await fetch(
    `${BASE}/groupDetails/${encodeURIComponent(code)}/${toApiLang(locale)}`,
    { next: { revalidate: 1800 } }
  )
  await ensureOk(res, 'getTourDetail')
  return (await res.json()) as ApiTourDetail
}

export async function getEventDetail(code: string, locale: string): Promise<ApiEvent> {
  const res = await fetch(
    `${BASE}/eventDetails/${encodeURIComponent(code)}/${toApiLang(locale)}`,
    { next: { revalidate: 1800 } }
  )
  await ensureOk(res, 'getEventDetail')
  return (await res.json()) as ApiEvent
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
  return (await res.json()) as ApiLimits
}

