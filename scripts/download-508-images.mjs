/**
 * Download images for tour 508 (Masca + Teide VIP)
 * Saves to public/images/events/508/ and public/images/pictures/tours-vip/508/
 */

import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'

const CODE = '508'
const EVENTS_DIR = path.join(process.cwd(), 'public', 'images', 'events', CODE)
const PICTURES_DIR = path.join(process.cwd(), 'public', 'images', 'pictures', 'tours-vip', CODE)

// Try multiple URL patterns (same structure as 303)
const URL_BASES = [
  'https://www.atlanticoexcursiones.com/zeus/pictures/GRP508',
  'https://api.atlanticoexcursiones.com/images/GRP508',
  'https://api.atlanticoexcursiones.com/images',
]
const FILES = ['A', 'B', 'C', 'D', 'E']
const EXTS = ['jpg', 'webp', 'png']

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function download(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http
    const req = protocol.get(url, { timeout: 10000 }, (res) => {
      if (res.statusCode === 200) {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
      } else resolve(null)
    })
    req.on('error', () => resolve(null))
  })
}

async function main() {
  ensureDir(EVENTS_DIR)
  ensureDir(PICTURES_DIR)

  console.log(`\n📥 Downloading images for tour ${CODE}...\n`)

  const downloaded = []
  for (const base of URL_BASES) {
    for (const file of FILES) {
      for (const ext of EXTS) {
        const url = `${base}/${file}.${ext}`
        const eventsPath = path.join(EVENTS_DIR, `${file}.${ext}`)
        const picturesPath = path.join(PICTURES_DIR, `group-details-${downloaded.length + 1}.${ext}`)
        if (fs.existsSync(eventsPath)) {
          console.log(`⏭️  ${file}.${ext} exists in events/`)
          downloaded.push(eventsPath)
          break
        }
        const buf = await download(url)
        if (buf && buf.length > 0) {
          fs.writeFileSync(eventsPath, buf)
          fs.writeFileSync(picturesPath, buf)
          console.log(`✅ ${file}.${ext} (${(buf.length / 1024).toFixed(1)} KB)`)
          downloaded.push(eventsPath)
          break
        }
      }
    }
  }

  console.log(`\n📁 Saved to: ${EVENTS_DIR}`)
  console.log(`   and: ${PICTURES_DIR}`)
  console.log(`\n✅ Done (${downloaded.length} images)\n`)
}

main().catch(console.error)
