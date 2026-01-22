/**
 * Normalize catalog data from backoffice API
 */

type Group = {
  id?: string | number
  Code?: string
  code?: string
  name?: string
  price?: string | number
  duration?: string | number
  image?: string
  ids?: string | number | string[] | number[]
  [key: string]: unknown
}

type GroupDetails = {
  id?: string | number
  Code?: string
  code?: string
  name?: string
  Name?: string
  price?: string | number
  image?: string
  desc?: string
  description?: string
  ids?: string | number | string[] | number[]
  [key: string]: unknown
}

type EventDetails = {
  name?: string
  title?: string
  Nombre?: string
  Name?: string
  duration?: string | number
  pickup?: string
  pProd?: string | number
  [key: string]: unknown
}

export type BookingOption = {
  id: string
  label: string
  pProd?: '0' | '1' | '2' | '3' // Price product type: "0"=per person, "1"=per product, "2"=per day, "3"=unique
}

export type NormalizedGroup = {
  key: string
  classificationId: string
  classificationName: string
  group: Group
  details: GroupDetails | null
  eventIds: string[]
  options: BookingOption[]
}

function getGroupKey(group: Group | null): string | null {
  if (!group) return null
  const v = String(group.id ?? group.Code ?? group.code ?? '').trim()
  return v ? v : null
}

function extractEventIdsFromString(
  idsValue: string | number | string[] | number[] | undefined
): string[] {
  const out: string[] = []
  if (idsValue === undefined || idsValue === null) return out

  if (Array.isArray(idsValue)) {
    for (const v of idsValue) {
      const s = String(v).trim()
      if (s && !out.includes(s)) out.push(s)
    }
    return out
  }

  const idsStr = String(idsValue).trim()
  if (!idsStr) return out

  const parts = idsStr.split(',').map((s) => s.trim()).filter(Boolean)
  for (const p of parts) {
    if (!out.includes(p)) out.push(p)
  }
  return out
}

function resolveGroupDetails(
  group: Group | null,
  map: Record<string, GroupDetails> | null
): GroupDetails | null {
  if (!group || !map) return null

  const candidates = [
    group.id !== undefined ? String(group.id) : null,
    group.Code ? String(group.Code) : null,
    group.code ? String(group.code) : null,
  ].filter((v): v is string => !!v)

  for (const k of candidates) {
    const d = map[k]
    if (d) return d
  }

  return null
}

function buildBookingOptions(
  eventIds: string[],
  eventDetailsMap: Record<string, EventDetails> | null,
  groupName: string
): BookingOption[] {
  return eventIds.map((eventId) => {
    const ev = eventDetailsMap?.[eventId]
    
    // Build label with priority: ev.name || ev.title || ev.Nombre || ev.Name || fallback
    let label = ''
    if (ev) {
      label = ev.name || ev.title || ev.Nombre || ev.Name || ''
    }
    
    // Fallback if no label found
    if (!label || label.trim().length === 0) {
      label = `${groupName} — Option ${eventId}`
    }
    
    // Append meta info if available
    const metaParts: string[] = []
    if (ev?.duration) {
      const dur = typeof ev.duration === 'number' ? ev.duration : parseFloat(String(ev.duration))
      if (!isNaN(dur) && dur > 0) {
        if (dur < 1) {
          metaParts.push(`${Math.round(dur * 60)}min`)
        } else if (dur === 1) {
          metaParts.push('1h')
        } else {
          metaParts.push(`${dur}h`)
        }
      }
    }
    if (ev?.pickup && typeof ev.pickup === 'string' && ev.pickup.trim().length > 0) {
      metaParts.push('Pickup')
    }
    
    if (metaParts.length > 0) {
      label = `${label} • ${metaParts.join(' • ')}`
    }

    // Extract pProd from eventDetails (strict)
    const pProdRaw = ev?.pProd !== undefined ? String(ev.pProd).trim() : undefined
    const pProd: BookingOption['pProd'] =
      pProdRaw === '0' || pProdRaw === '1' || pProdRaw === '2' || pProdRaw === '3' ? pProdRaw : undefined
    
    return {
      id: eventId,
      label: label.trim(),
      pProd,
    }
  })
}

export function normalizeGroups(
  classifications: Array<{ id?: string | number; code?: string; name?: string; [key: string]: unknown }>,
  groupsByClassification: Record<string, Group[]>,
  groupDetailsMap: Record<string, GroupDetails> | null,
  selectedClassificationId: string | null,
  eventDetailsByEventId?: Record<string, EventDetails> | null
): NormalizedGroup[] {
  const normalized: NormalizedGroup[] = []

  const classificationMap = new Map<string, { id: string; name: string }>()
  for (const c of classifications) {
    if (c.id !== undefined) {
      const idStr = String(c.id)
      classificationMap.set(idStr, { id: idStr, name: c.name || '—' })
    }
  }

  const classificationIds = selectedClassificationId
    ? [selectedClassificationId]
    : Object.keys(groupsByClassification)

  for (const clsId of classificationIds) {
    const groups = groupsByClassification[clsId] || []
    const classification = classificationMap.get(clsId) || { id: clsId, name: '—' }

    for (const group of groups) {
      const key = getGroupKey(group)
      if (!key) continue

      const details = resolveGroupDetails(group, groupDetailsMap)
      const eventIdsFromGroup = extractEventIdsFromString(group.ids)
      const eventIdsFromDetails = extractEventIdsFromString(details?.ids)
      const eventIds: string[] = []
      for (const id of eventIdsFromGroup) if (!eventIds.includes(id)) eventIds.push(id)
      for (const id of eventIdsFromDetails) if (!eventIds.includes(id)) eventIds.push(id)

      const groupName = group.name || details?.name || details?.Name || 'Tour'
      const options = buildBookingOptions(eventIds, eventDetailsByEventId || null, groupName)

      normalized.push({
        key,
        classificationId: clsId,
        classificationName: classification.name,
        group,
        details,
        eventIds,
        options,
      })
    }
  }

  return normalized
}

