/**
 * Audit: which groupDetails don't provide image URLs correctly across all classifications
 *
 * Fetches backoffice data, extracts image URLs from each group details,
 * optionally validates URLs (HEAD request), and reports problems by classification.
 *
 * Usage:
 *   pnpm dev  (in another terminal)
 *   node scripts/audit-groupdetails-images.mjs
 *
 * Options:
 *   VALIDATE=1  - Check each URL with HEAD request (slower)
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const IMAGE_BASE = 'https://api.atlanticoexcursiones.com/images'
const VALIDATE = process.env.VALIDATE === '1'

function extractImageUrls(raw) {
  if (!raw || typeof raw !== 'object') return []
  const urls = []
  const seen = new Set()

  function addUrl(url) {
    if (url && typeof url === 'string' && url.trim() && !seen.has(url)) {
      seen.add(url.trim())
      urls.push(url.trim())
    }
  }

  function resolve(v) {
    if (!v || typeof v !== 'string') return null
    const t = v.trim()
    if (!t) return null
    if (t.startsWith('http://') || t.startsWith('https://')) return t
    return `${IMAGE_BASE}/${encodeURIComponent(t)}`
  }

  if (raw.image && typeof raw.image === 'string') addUrl(resolve(raw.image))
  if (Array.isArray(raw.images)) {
    for (const img of raw.images) {
      if (typeof img === 'string') addUrl(resolve(img))
    }
  }
  if (raw.photos && Array.isArray(raw.photos)) {
    for (const img of raw.photos) {
      if (typeof img === 'string') addUrl(resolve(img))
    }
  }
  if (raw.gallery && Array.isArray(raw.gallery)) {
    for (const img of raw.gallery) {
      if (typeof img === 'string') addUrl(resolve(img))
    }
  }
  return urls
}

async function headOk(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' })
    return res.ok
  } catch {
    return false
  }
}

async function main() {
  console.log('\n🔍 Audit: groupDetails image URLs by classification\n')
  console.log(`   API: ${BASE_URL}`)
  console.log(`   Validate URLs: ${VALIDATE}\n`)

  let data
  try {
    const res = await fetch(`${BASE_URL}/api/atlantico/backoffice?lang=ENG&fresh=1`, {
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    data = await res.json()
  } catch (e) {
    console.error('❌ Failed to fetch backoffice:', e.message)
    console.log('\n   Ensure dev server is running: pnpm dev\n')
    process.exit(1)
  }

  const classifications = data.classifications || []
  const groupsByClassification = data.groupsByClassification || {}
  const groupDetailsByGroupId = data.groupDetailsByGroupId || {}

  const classById = new Map()
  for (const c of classifications) {
    const id = c.id != null ? String(c.id) : c.code
    if (id) classById.set(id, c)
  }

  const problemsByClass = new Map() // classificationName -> [...]
  let totalGroups = 0
  let groupsNoImages = 0
  let groupsBrokenUrls = 0

  for (const [classId, groups] of Object.entries(groupsByClassification)) {
    const classInfo = classById.get(classId)
    const className = classInfo?.name || classInfo?.code || `Classification ${classId}`

    const problems = []

    for (const group of groups || []) {
      totalGroups++
      const code = group.Code ?? group.code ?? group.id
      const groupCode = code != null ? String(code) : null
      if (!groupCode) continue

      const details = groupDetailsByGroupId[groupCode] ?? groupDetailsByGroupId[String(group.id)]
      const urls = extractImageUrls(details || {})

      if (urls.length === 0) {
        groupsNoImages++
        problems.push({
          code: groupCode,
          name: group.name || group.Name || '?',
          issue: 'no_images',
          detail: !details
            ? 'no groupDetails'
            : `no image/image/images/photos/gallery fields`,
        })
      } else if (VALIDATE) {
        const firstOk = await headOk(urls[0])
        if (!firstOk) {
          groupsBrokenUrls++
          problems.push({
            code: groupCode,
            name: group.name || group.Name || '?',
            issue: 'broken_url',
            detail: `first URL returns non-200: ${urls[0].slice(0, 80)}...`,
          })
        }
      }
    }

    if (problems.length > 0) {
      problemsByClass.set(className, problems)
    }
  }

  // Report
  console.log('═══════════════════════════════════════════════════════════')
  console.log('GROUP DETAILS WITHOUT VALID IMAGE URLS (by classification)')
  console.log('═══════════════════════════════════════════════════════════\n')

  if (problemsByClass.size === 0) {
    console.log('✅ All groups have image URLs\n')
    return
  }

  const sorted = [...problemsByClass.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )

  for (const [className, problems] of sorted) {
    console.log(`\n📁 ${className}`)
    console.log(`   ${problems.length} group(s) with issues:\n`)
    for (const p of problems) {
      const label = p.issue === 'no_images' ? '❌ No images' : '⚠️ Broken URL'
      console.log(`   ${label}  ${p.code}  ${p.name}`)
      if (p.detail) console.log(`         ${p.detail}`)
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('SUMMARY')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`   Total groups: ${totalGroups}`)
  console.log(`   No image fields: ${groupsNoImages}`)
  if (VALIDATE) console.log(`   Broken URLs (first image 404): ${groupsBrokenUrls}`)
  console.log(`   Classifications with issues: ${problemsByClass.size}`)
  console.log('')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
