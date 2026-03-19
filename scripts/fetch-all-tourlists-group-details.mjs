#!/usr/bin/env node
/**
 * Fetch ALL tour lists (classifications) with full groupDetails for every group.
 * Output: data/all-tourlists-group-details.json
 *
 * Pipeline (direct Atlantico API):
 * 1) clasificationList/{lang}/{collaborator} → list of classifications
 * 2) For each classification: groupsList/{lang}/-1/{classificationId} → list of groups
 * 3) For each group: groupDetails/{code}/ENG → full groupDetails
 *
 * Output structure:
 * - tourlists: [ { id, name, code?, groups: [ { code, id, name, groupDetails } ] } ]
 * - byNumber: { [groupCode]: { classificationId, classificationName, groupDetails } }
 *
 * ENV optional:
 * - ATLANTICO_API_BASE_URL (default https://api.atlanticoexcursiones.com)
 * - ATLANTICO_COLLABORATOR (default 3645)
 * - ATLANTICO_LANG (default ENG)
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fetch from 'node-fetch'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ATLANTICO_BASE = process.env.ATLANTICO_API_BASE_URL || 'https://api.atlanticoexcursiones.com'
const COLLABORATOR = process.env.ATLANTICO_COLLABORATOR || '3645'
const LANG = (process.env.ATLANTICO_LANG || 'ENG').toUpperCase()

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${res.statusText}${body ? `: ${body.slice(0, 200)}` : ''}`)
  }
  return await res.json()
}

function getGroupCode(g) {
  const c = g?.Code ?? g?.code ?? g?.id
  if (c == null) return null
  const s = String(c).trim()
  return s && s.length < 50 && /^[a-zA-Z0-9_-]+$/.test(s) ? s : null
}

async function fetchGroupDetails(code) {
  try {
    return await fetchJson(`${ATLANTICO_BASE}/groupDetails/${encodeURIComponent(code)}/${LANG}`)
  } catch (e) {
    try {
      return await fetchJson(`${ATLANTICO_BASE}/group/${encodeURIComponent(code)}/${LANG}`)
    } catch (e2) {
      return null
    }
  }
}

async function main() {
  console.log('Fetching classifications...')
  const classifications = await fetchJson(
    `${ATLANTICO_BASE}/clasificationList/${LANG}/${encodeURIComponent(COLLABORATOR)}`
  )
  if (!Array.isArray(classifications)) {
    throw new Error('classifications response is not an array')
  }
  console.log(`Found ${classifications.length} classifications (tour lists).`)

  const tourlists = []
  const byNumber = {}

  for (const cls of classifications) {
    const classificationId = cls.id != null ? String(cls.id) : (cls.code != null ? String(cls.code) : null)
    if (!classificationId) {
      console.warn('  Skip classification with no id/code:', cls)
      continue
    }
    const classificationName = cls.name ?? cls.title ?? cls.code ?? classificationId

    console.log(`\n[${classificationId}] ${classificationName}`)

    let groups = []
    try {
      groups = await fetchJson(
        `${ATLANTICO_BASE}/groupsList/${LANG}/-1/${encodeURIComponent(classificationId)}`
      )
    } catch (e) {
      console.warn(`  groupsList failed:`, e?.message || e)
    }
    if (!Array.isArray(groups)) groups = []

    const groupsWithDetails = []
    for (const g of groups) {
      const code = getGroupCode(g)
      if (!code) continue
      process.stdout.write(`  ${code} ... `)
      const groupDetails = await fetchGroupDetails(code)
      if (groupDetails && typeof groupDetails === 'object') {
        groupsWithDetails.push({
          code,
          id: groupDetails.id ?? groupDetails.Id ?? g.id ?? code,
          name: groupDetails.name ?? groupDetails.Name ?? g.name ?? '',
          groupDetails,
        })
        byNumber[code] = {
          classificationId,
          classificationName,
          groupDetails,
        }
        console.log('OK')
      } else {
        console.log('FAIL')
      }
    }

    tourlists.push({
      id: classificationId,
      name: classificationName,
      code: cls.code != null ? String(cls.code) : undefined,
      groupCount: groupsWithDetails.length,
      groups: groupsWithDetails,
    })
  }

  const out = {
    fetchedAt: new Date().toISOString(),
    lang: LANG,
    collaborator: COLLABORATOR,
    tourlistsCount: tourlists.length,
    tourlists,
    byNumber,
  }

  const outPath = path.join(__dirname, '..', 'data', 'all-tourlists-group-details.json')
  await fs.writeFile(outPath, JSON.stringify(out, null, 2), 'utf8')
  console.log(`\nDone. Wrote ${tourlists.length} tour lists, ${Object.keys(byNumber).length} groups total → ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
