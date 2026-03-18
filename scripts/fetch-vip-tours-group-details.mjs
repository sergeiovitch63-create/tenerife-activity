#!/usr/bin/env node
/**
 * Fetch all groupDetails for VIP Tours and save to data/vip-tours-group-details.json
 *
 * 1) Get VIP Tours group list from /api/atlantico/vip-tours-groups (or fallback to known codes)
 * 2) For each group, fetch groupDetails from Atlantico API
 * 3) Write { fetchedAt, groups: [...], groupDetailsByCode: { [code]: {...} } } to data/vip-tours-group-details.json
 *
 * ENV optional:
 * - BASE_URL  (for vip-tours-groups; default http://localhost:3000)
 * - ATLANTICO_API_BASE_URL (default https://api.atlanticoexcursiones.com)
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fetch from 'node-fetch'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const ATLANTICO_API_BASE_URL =
  process.env.ATLANTICO_API_BASE_URL || 'https://api.atlanticoexcursiones.com'

/** Known VIP Tours group codes (from vip-tours-images.ts) – used if API unavailable */
const VIP_TOURS_GROUP_CODES = [
  '303', '403', '479', '480', '508', '509', '510', '511', '513', '515', '516',
]

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${res.statusText}${body ? `: ${body.slice(0, 200)}` : ''}`)
  }
  return await res.json()
}

async function getVipToursGroupCodes() {
  try {
    const data = await fetchJson(`${BASE_URL}/api/atlantico/vip-tours-groups`)
    if (data?.success && Array.isArray(data.groups) && data.groups.length > 0) {
      const codes = data.groups.map((g) => String(g?.Code ?? g?.code ?? g?.id ?? '').trim()).filter(Boolean)
      if (codes.length > 0) return [...new Set(codes)]
    }
  } catch (e) {
    console.warn('vip-tours-groups API failed, using known codes:', e?.message || e)
  }
  return VIP_TOURS_GROUP_CODES
}

async function fetchGroupDetails(code) {
  const url = `${ATLANTICO_API_BASE_URL}/groupDetails/${encodeURIComponent(code)}/ENG`
  try {
    return await fetchJson(url)
  } catch (e) {
    try {
      const fallback = `${ATLANTICO_API_BASE_URL}/group/${encodeURIComponent(code)}/ENG`
      return await fetchJson(fallback)
    } catch (e2) {
      console.error(`  Failed to fetch groupDetails for code=${code}:`, e?.message || e2?.message)
      return null
    }
  }
}

async function main() {
  console.log('Fetching VIP Tours group list...')
  const codes = await getVipToursGroupCodes()
  console.log(`Found ${codes.length} VIP Tours groups:`, codes.join(', '))

  const groupDetailsByCode = {}
  const groups = []

  for (const code of codes) {
    process.stdout.write(`  Fetching groupDetails ${code}... `)
    const details = await fetchGroupDetails(code)
    if (details && typeof details === 'object') {
      groupDetailsByCode[code] = details
      groups.push({
        code,
        id: details.id ?? details.Id ?? code,
        name: details.name ?? details.Name ?? details.title ?? '',
        desc: details.desc ?? details.description ?? details.Desc ?? '',
        image: details.image ?? details.Image,
        ids: details.ids ?? details.events,
      })
      console.log('OK')
    } else {
      console.log('FAIL')
    }
  }

  const out = {
    fetchedAt: new Date().toISOString(),
    count: groups.length,
    groups,
    groupDetailsByCode,
  }

  const outPath = path.join(__dirname, '..', 'data', 'vip-tours-group-details.json')
  await fs.writeFile(outPath, JSON.stringify(out, null, 2), 'utf8')
  console.log(`\nDone. Wrote ${groups.length} group details to ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
