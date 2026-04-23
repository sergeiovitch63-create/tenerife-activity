/**
 * Sniff the HTML returned by Atlantico /payment/ on the TEST environment.
 *
 *   npx tsx scripts/sniff-payment-html.ts
 *
 * No real booking, no card charge — we only POST to testapi.atlanticoexcursiones.com
 * with dummy client info to capture the auto-submit form shape. The goal is to learn
 * where the booking reference lives in the HTML so we can parse it in Phase 2.
 *
 * If the IP is not whitelisted on the test env, the request will fail — we report it.
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const TEST_BASE = 'https://testapi.atlanticoexcursiones.com'
const OUT_DIR = join(tmpdir(), 'atlantico-sniff')
const OUTPUT_HTML = join(OUT_DIR, 'response.html')
const OUTPUT_JSON = join(OUT_DIR, 'summary.json')

interface GroupSummary {
  id?: string
  code?: string
  name?: string
  ids?: string
}

async function fetchAllGroups(): Promise<GroupSummary[]> {
  const url = `${TEST_BASE}/groupsList/ENG/-1`
  console.log('[sniff] Fetching groupsList →', url)
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) return []
  const body = await res.text()
  try {
    const data = JSON.parse(body)
    const arr = Array.isArray(data) ? data : Array.isArray(data?.groups) ? data.groups : []
    return (arr as GroupSummary[]).filter(g => g?.code && String(g?.ids ?? '').trim().length > 0)
  } catch {
    return []
  }
}

async function findEventWithAvailability(groups: GroupSummary[], requireSessions: boolean): Promise<{ t_id: string; t_group: string; date: string; sesTime: string; groupName: string } | null> {
  for (const g of groups.slice(0, 40)) {
    const idsList = String(g.ids ?? '').split(',').map(s => s.trim()).filter(Boolean)
    for (const t_id of idsList.slice(0, 2)) {
      const t_group = String(g.code)
      for (const offset of [0, 1, 2]) {
        const d = new Date()
        d.setUTCMonth(d.getUTCMonth() + offset, 1)
        const monthStart = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`
        try {
          const res = await fetch(`${TEST_BASE}/loadLimits/${t_id}/ENG/${monthStart}`)
          if (!res.ok) continue
          const raw = await res.text()
          let data: any
          try { data = JSON.parse(raw) } catch { continue }
          const datesRaw: string[] = Array.isArray(data?.dates?.date) ? data.dates.date : []
          if (datesRaw.length === 0) continue
          const sessions: Record<string, any[]> = data?.sessions ?? data?.dates?.sessions ?? {}

          for (const dateCandidate of datesRaw.slice(0, 5)) {
            const date = String(dateCandidate).replace(/-/g, '')
            const sess = sessions[date] || sessions[String(dateCandidate)] || []
            const realSesTime: string | null = Array.isArray(sess) && sess[0]
              ? (typeof sess[0] === 'string' ? sess[0] : (sess[0].time ?? null))
              : null

            if (requireSessions && !realSesTime) continue
            const sesTime = realSesTime ?? '00:00'
            console.log(`[sniff] ✓ ${g.name} (t_id=${t_id}, t_group=${t_group}) → ${date} ${sesTime}${realSesTime ? ' (real session)' : ' (default)'}`)
            return { t_id, t_group, date, sesTime, groupName: String(g.name ?? '') }
          }
        } catch {
          continue
        }
      }
    }
  }
  return null
}

function pickDate(): string {
  // ~30 days from now, YYYYMMDD
  const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function firstOfCurrentMonth(): string {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

async function fetchLimits(t_id: string): Promise<{ date: string; sesTime: string | null } | null> {
  const monthStart = firstOfCurrentMonth()
  const url = `${TEST_BASE}/loadLimits/${t_id}/ENG/${monthStart}`
  console.log('[sniff] Fetching loadLimits →', url)
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  console.log('[sniff]   status:', res.status)
  if (!res.ok) return null
  const body = await res.text()
  let data: any
  try {
    data = JSON.parse(body)
  } catch {
    console.log('[sniff]   non-JSON loadLimits, first 300:', body.slice(0, 300))
    return null
  }
  const datesRaw: string[] = Array.isArray(data?.dates?.date) ? data.dates.date : []
  const sessions: Record<string, any[]> = data?.sessions ?? data?.dates?.sessions ?? {}
  console.log('[sniff]   loadLimits: dates=', datesRaw.slice(0, 5), '… count=', datesRaw.length)
  console.log('[sniff]   loadLimits: session keys:', Object.keys(sessions).slice(0, 5))

  if (datesRaw.length === 0) {
    // Try next month
    const d = new Date()
    d.setUTCMonth(d.getUTCMonth() + 1, 1)
    const nextMonth = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`
    const url2 = `${TEST_BASE}/loadLimits/${t_id}/ENG/${nextMonth}`
    console.log('[sniff] Retrying next month →', url2)
    const r2 = await fetch(url2, { headers: { Accept: 'application/json' } })
    if (r2.ok) {
      const d2 = JSON.parse(await r2.text())
      const dates2: string[] = Array.isArray(d2?.dates?.date) ? d2.dates.date : []
      const sessions2 = d2?.sessions ?? d2?.dates?.sessions ?? {}
      if (dates2.length > 0) {
        const date = String(dates2[0]).replace(/-/g, '')
        const sess = sessions2[date] || sessions2[String(dates2[0])] || []
        const sesTime = Array.isArray(sess) && sess[0]
          ? typeof sess[0] === 'string' ? sess[0] : (sess[0].time ?? null)
          : null
        return { date, sesTime }
      }
    }
    return null
  }

  const date = String(datesRaw[0]).replace(/-/g, '')
  const sess = sessions[date] || sessions[String(datesRaw[0])] || []
  const sesTime = Array.isArray(sess) && sess[0]
    ? typeof sess[0] === 'string' ? sess[0] : (sess[0].time ?? null)
    : null
  return { date, sesTime }
}

function extractFormFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {}
  const re = /<input[^>]*\bname=["']([^"']+)["'][^>]*\bvalue=["']([^"']*)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    fields[m[1]] = m[2]
  }
  return fields
}

function extractFormAction(html: string): string | null {
  const m = /<form[^>]*\baction=["']([^"']+)["']/i.exec(html)
  return m ? m[1] : null
}

function tryDecodeMerchantParameters(value: string): unknown | null {
  try {
    const decoded = Buffer.from(value, 'base64').toString('utf-8')
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

async function main() {
  console.log('=========================================================')
  console.log('Atlantico /payment/ sniff — TEST environment, NO real charge')
  console.log('Base:', TEST_BASE)
  console.log('=========================================================')

  // 1) First try to find an event with a REAL session time (sesTime = '00:00' may be rejected).
  const groups = await fetchAllGroups()
  console.log('[sniff] groups found:', groups.length)
  let picked = await findEventWithAvailability(groups, true)
  if (!picked) {
    console.log('[sniff] No event with real sessions — retrying without the session requirement.')
    picked = await findEventWithAvailability(groups, false)
  }
  let t_id: string
  let t_group: string
  let tourDate: string
  let sesTime: string
  if (picked) {
    t_id = picked.t_id
    t_group = picked.t_group
    tourDate = picked.date
    sesTime = picked.sesTime
  } else {
    console.log('[sniff] No event with explicit dates — falling back to first group + default date.')
    const g = groups[0]
    t_group = String(g?.code ?? '12')
    t_id = String(g?.ids ?? '184').split(',')[0].trim()
    tourDate = pickDate()
    sesTime = '00:00'
  }
  console.log('[sniff] Final pick:', { t_id, t_group, tourDate, sesTime })

  // 3) Build POST body — realistic values (Atlantico validates beyond mere presence).
  const body = new URLSearchParams()
  body.set('userId', '3645')
  body.set('t_id', t_id)
  body.set('t_group', t_group)
  body.set('language', 'ENG')
  body.set('tourDate', tourDate)
  body.set('sesTime', sesTime)
  body.set('adults', '2')
  body.set('childs', '0')
  body.set('infants', '0')
  body.set('name', 'Juan Garcia')
  body.set('email', 'juan.test@gmail.com')
  body.set('phone', '+34612345678')

  console.log('[sniff] POST payload:', body.toString())

  // 3) POST to /payment/
  const url = `${TEST_BASE}/payment/`
  console.log('[sniff] →', url)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Accept': '*/*',
      'User-Agent': 'TenerifeActivity-sniff/1.0',
    },
    body: body.toString(),
    redirect: 'manual',
  })

  const status = res.status
  const ct = res.headers.get('content-type')
  const loc = res.headers.get('location')
  const html = await res.text()
  console.log('[sniff] status:', status, '| content-type:', ct, '| location:', loc || '(none)')
  console.log('[sniff] body length:', html.length)
  console.log('[sniff] body bytes (hex):', Buffer.from(html).toString('hex'))
  console.log('[sniff] body raw (first 500):', JSON.stringify(html.slice(0, 500)))

  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(OUTPUT_HTML, html, 'utf-8')
  console.log('[sniff] Full HTML written to', OUTPUT_HTML)

  const trimmed = html.trim()

  // Early-exit cases
  if (trimmed === '-1') {
    console.log('\n⚠️  Atlantico returned "-1" (generic error). Likely causes:')
    console.log('   - IP not whitelisted on testapi')
    console.log('   - userId 3645 not valid on test env')
    console.log('   - t_id/t_group mismatch on test env')
    await writeFile(OUTPUT_JSON, JSON.stringify({ status, contentType: ct, body: trimmed }, null, 2))
    return
  }

  if (/^[A-Z0-9-]{3,50}$/i.test(trimmed)) {
    console.log('\n✅ Response is a PLAIN BOOKING REFERENCE (no payment gateway redirect):')
    console.log('   reference:', trimmed)
    console.log('   → This means /payment/ on test env returns a ref directly, like /confirm/ would.')
    await writeFile(OUTPUT_JSON, JSON.stringify({ status, contentType: ct, reference: trimmed }, null, 2))
    return
  }

  // 4) Parse form fields
  const action = extractFormAction(html)
  const fields = extractFormFields(html)

  console.log('\n--- Form structure ---')
  console.log('action:', action || '(none detected)')
  console.log('hidden field names:', Object.keys(fields))

  // 5) Try decoding Ds_MerchantParameters (Redsys standard)
  const dsMp = fields['Ds_MerchantParameters']
  let decoded: unknown = null
  if (dsMp) {
    decoded = tryDecodeMerchantParameters(dsMp)
    console.log('\n✅ Ds_MerchantParameters FOUND. Decoded payload:')
    console.log(JSON.stringify(decoded, null, 2))
  } else {
    console.log('\n❌ No Ds_MerchantParameters field.')
    console.log('   → Check the hidden field names above and the HTML at', OUTPUT_HTML)
    console.log('   → First 600 chars of HTML:')
    console.log(html.slice(0, 600))
  }

  // 6) Heuristic: look for any field that looks like an order/booking ref
  console.log('\n--- Fields that look ref-shaped ---')
  for (const [name, value] of Object.entries(fields)) {
    if (/^[A-Z0-9-]{4,32}$/i.test(value) && !/^[01]$/.test(value)) {
      console.log(`  ${name} = ${value}`)
    }
  }

  await writeFile(
    OUTPUT_JSON,
    JSON.stringify(
      {
        status,
        contentType: ct,
        location: loc,
        bodyLength: html.length,
        formAction: action,
        fields,
        dsMerchantParametersDecoded: decoded,
      },
      null,
      2,
    ),
  )
  console.log('\nStructured summary written to', OUTPUT_JSON)
}

main().catch((e) => {
  console.error('[sniff] FATAL:', e)
  process.exit(1)
})
