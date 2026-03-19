import { toApiLang } from '@/lib/atlantico'
import { atlanticoGet, getBaseUrl } from '@/lib/atlantico/client'
import type {
  ApiClassification,
  ApiEvent,
  ApiLimits,
  ApiTour,
  ApiTourDetail,
} from '@/lib/atlantico.types'

const getCollaborator = (): string =>
  process.env.ATLANTICO_COLLABORATOR?.trim() ||
  process.env.ATLANTICO_OFFICE?.trim() ||
  '3645'

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
  try {
    // Match existing app route: /clasificationList/{lang}/{collaborator}
    const path = `/clasificationList/${toApiLang(locale)}/${getCollaborator()}`
    console.log('Fetching:', `${getBaseUrl()}${path}`)
    const data = (await atlanticoGet(path)) as unknown
    const items = toArray<ApiClassification>(data)
    return Array.isArray(items) ? items : []
  } catch {
    return []
  }
}

export async function getTours(
  locale: string,
  classCode?: string,
  page = -1
): Promise<ApiTour[]> {
  try {
    const encodedClass = classCode ? encodeURIComponent(classCode) : ''
    // Match existing app route: /groupsList/{lang}/{page}/{classCode?}
    const path = encodedClass
      ? `/groupsList/${toApiLang(locale)}/${page}/${encodedClass}`
      : `/groupsList/${toApiLang(locale)}/${page}`
    console.log('Fetching:', `${getBaseUrl()}${path}`)
    const data = (await atlanticoGet(path)) as unknown
    const items = toArray<ApiTour>(data)
    return Array.isArray(items) ? items : []
  } catch {
    return []
  }
}

export async function getTourDetail(code: string, locale: string): Promise<ApiTourDetail> {
  const path = `/groupDetails/${encodeURIComponent(code)}/${toApiLang(locale)}`
  console.log('Fetching:', `${getBaseUrl()}${path}`)
  const data = (await atlanticoGet(path)) as unknown
  const detail = toObject<ApiTourDetail>(data)
  if (!detail) {
    throw new Error('getTourDetail returned invalid payload')
  }
  return detail
}

export async function getEventDetail(code: string, locale: string): Promise<ApiEvent> {
  const path = `/eventDetails/${encodeURIComponent(code)}/${toApiLang(locale)}`
  console.log('Fetching:', `${getBaseUrl()}${path}`)
  const data = (await atlanticoGet(path)) as unknown
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
  const path = `/loadLimits/${encodeURIComponent(eventCode)}/${toApiLang(locale)}/${encodeURIComponent(date)}`
  console.log('Fetching:', `${getBaseUrl()}${path}`)
  const data = (await atlanticoGet(path)) as unknown
  const limits = toObject<ApiLimits>(data)
  if (!limits) {
    throw new Error('getLimits returned invalid payload')
  }
  return limits
}

