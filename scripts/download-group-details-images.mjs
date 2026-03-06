/**
 * Download group details images for all VIP tours (and optionally other group codes)
 *
 * 1. Fetches group details from /api/atlantico/group-details/{code}/ENG
 * 2. Extracts image URLs from the response
 * 3. Downloads each image and saves to public/images/pictures/tours-vip/{code}/
 * 4. Generates src/data/group-details-images.generated.ts with the mapping
 *
 * Usage:
 *   pnpm dev  (in another terminal - API must be running)
 *   node scripts/download-group-details-images.mjs
 *
 * Or with custom base URL:
 *   BASE_URL=https://your-domain.com node scripts/download-group-details-images.mjs
 */

import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const IMAGE_BASE = process.env.ATLANTICO_IMAGES_BASE_URL || 'https://api.atlanticoexcursiones.com/images'
const LANG = 'ENG'

// VIP tour codes + other codes that have curated galleries in group-details page
// 476, 492, 514, 551: folders for manual hero images (group-details-1.jpg)
const GROUP_CODES = [
  '303', '403', '476', '479', '480', '492', '508', '509', '510', '511', '513', '514', '515', '516', '551',
]

/**
 * Extract image URLs from raw groupDetails
 */
function extractImageUrls(raw) {
  if (!raw || typeof raw !== 'object') return []
  const urls = []
  const seen = new Set()

  function addUrl(url) {
    if (url && typeof url === 'string' && url.trim() && !seen.has(url)) {
      const u = url.trim()
      seen.add(u)
      urls.push(u)
    }
  }

  function resolveFilename(filename) {
    if (!filename || typeof filename !== 'string') return null
    const t = filename.trim()
    if (!t) return null
    if (t.startsWith('http://') || t.startsWith('https://')) return t
    return `${IMAGE_BASE.replace(/\/+$/, '')}/${encodeURIComponent(t)}`
  }

  if (raw.image && typeof raw.image === 'string') {
    const u = resolveFilename(raw.image)
    if (u) addUrl(u)
  }
  if (Array.isArray(raw.images)) {
    for (const img of raw.images) {
      if (typeof img === 'string') {
        const u = resolveFilename(img)
        if (u) addUrl(u)
      }
    }
  }
  if (raw.photos && Array.isArray(raw.photos)) {
    for (const img of raw.photos) {
      if (typeof img === 'string') {
        const u = resolveFilename(img)
        if (u) addUrl(u)
      }
    }
  }
  if (raw.gallery && Array.isArray(raw.gallery)) {
    for (const img of raw.gallery) {
      if (typeof img === 'string') {
        const u = resolveFilename(img)
        if (u) addUrl(u)
      }
    }
  }
  if (urls.length === 0 && raw.image) {
    const u = resolveFilename(raw.image)
    if (u) addUrl(u)
  }
  return urls
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function downloadImage(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http
    const req = protocol.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode === 200) {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
      } else {
        resolve(null)
      }
    })
    req.on('error', () => resolve(null))
    req.on('timeout', () => {
      req.destroy()
      resolve(null)
    })
  })
}

function getExtension(url) {
  const q = url.split('?')[0]
  const m = q.match(/\.(jpe?g|png|webp|gif)$/i)
  return m ? m[1].toLowerCase() : 'jpg'
}

async function main() {
  console.log('\n📥 Downloading group details images...\n')
  console.log(`   API base: ${BASE_URL}`)
  console.log(`   Image base: ${IMAGE_BASE}`)
  console.log(`   Group codes: ${GROUP_CODES.join(', ')}\n`)

  const rootDir = path.join(process.cwd(), 'public', 'images', 'pictures', 'tours-vip')
  ensureDir(rootDir)

  const manifest = {}

  for (const code of GROUP_CODES) {
    const dir = path.join(rootDir, code)
    ensureDir(dir)

    let details
    try {
      const res = await fetch(
        `${BASE_URL}/api/atlantico/group-details/${encodeURIComponent(code)}/${LANG}`,
        { cache: 'no-store' }
      )
      if (!res.ok) {
        console.log(`⚠️  ${code}: API HTTP ${res.status}`)
        continue
      }
      details = await res.json()
    } catch (e) {
      console.log(`⚠️  ${code}: Failed to fetch - ${e.message}`)
      continue
    }

    let urls = extractImageUrls(details)
    if (urls.length === 0 && details?.image && typeof details.image === 'string') {
      const base = IMAGE_BASE.replace(/\/+$/, '')
      urls = [`${base}/${encodeURIComponent(details.image.trim())}`]
    }
    // Fallback: use group-images API (groupDetails + eventDetails + zeus)
    if (urls.length === 0) {
      try {
        const imgRes = await fetch(
          `${BASE_URL}/api/atlantico/group-images/${encodeURIComponent(code)}?lang=${LANG}`,
          { cache: 'no-store' }
        )
        if (imgRes.ok) {
          const data = await imgRes.json()
          urls = data.images || []
          if (urls.length === 0 && data.allCandidates?.length) {
            urls = data.allCandidates
          }
        }
      } catch (e) {
        // Ignore
      }
    }

    if (urls.length === 0) {
      console.log(`⏭️  ${code}: No images found`)
      continue
    }

    let localPaths = []
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      const ext = getExtension(url)
      const filename = `group-details-${i + 1}.${ext}`
      const filePath = path.join(dir, filename)

      if (fs.existsSync(filePath)) {
        console.log(`⏭️  ${code}/${filename} (exists)`)
        localPaths.push(`/images/pictures/tours-vip/${code}/${filename}`)
        continue
      }

      const buf = await downloadImage(url)
      if (buf && buf.length > 0) {
        fs.writeFileSync(filePath, buf)
        console.log(`✅ ${code}/${filename} (${(buf.length / 1024).toFixed(1)} KB)`)
        localPaths.push(`/images/pictures/tours-vip/${code}/${filename}`)
      } else {
        console.log(`❌ ${code}/${filename} (download failed)`)
      }
    }

    // Fallback for VIP tours: try zeus/pictures/GRP{code}/ when API images failed
    const ZEUS_BASE = 'https://www.atlanticoexcursiones.com/zeus/pictures'
    const zeusLetters = ['A', 'B', 'C', 'D', 'E']
    const zeusExts = ['jpg', 'webp', 'png']
    if (localPaths.length === 0) {
      console.log(`   ${code}: Trying zeus/pictures/GRP${code}/ fallback...`)
      for (const letter of zeusLetters) {
        for (const ext of zeusExts) {
          const fallbackUrl = `${ZEUS_BASE}/GRP${code}/${letter}.${ext}`
          const filename = `group-details-${localPaths.length + 1}.${ext}`
          const filePath = path.join(dir, filename)
          if (fs.existsSync(filePath)) continue
          const buf = await downloadImage(fallbackUrl)
          if (buf && buf.length > 0) {
            fs.writeFileSync(filePath, buf)
            console.log(`✅ ${code}/${filename} (${(buf.length / 1024).toFixed(1)} KB) via zeus`)
            localPaths.push(`/images/pictures/tours-vip/${code}/${filename}`)
            break // next letter
          }
        }
      }
    }

    if (localPaths.length > 0) {
      manifest[code] = localPaths
    } else if (['476', '492', '514', '551'].includes(code)) {
      // Manual hero folders: add placeholder so user can add group-details-1.jpg
      manifest[code] = [`/images/pictures/tours-vip/${code}/group-details-1.jpg`]
    }
  }

  // Write generated manifest
  const genPath = path.join(process.cwd(), 'src', 'data', 'group-details-images.generated.ts')
  ensureDir(path.dirname(genPath))
  const content = `/**
 * Auto-generated by scripts/download-group-details-images.mjs
 * Maps group code -> local image paths for group details galleries
 */
export const GROUP_DETAILS_IMAGES: Record<string, string[]> = ${JSON.stringify(manifest, null, 2)}
`
  fs.writeFileSync(genPath, content)
  console.log(`\n📝 Written manifest: src/data/group-details-images.generated.ts`)
  console.log(`   Codes with images: ${Object.keys(manifest).length}`)
  console.log(`\n✅ Done!\n`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
