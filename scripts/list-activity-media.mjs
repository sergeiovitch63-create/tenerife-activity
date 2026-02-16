import fs from 'fs'
import path from 'path'

/**
 * List local activity media files (e.g. astronomic-tour-*.ext) with extensions.
 *
 * Usage:
 *   node scripts/list-activity-media.mjs
 */

const activitiesDir = path.join(process.cwd(), 'src', 'content', 'activities')

if (!fs.existsSync(activitiesDir)) {
  console.error('[list-activity-media] Directory not found:', activitiesDir)
  process.exit(1)
}

console.log('[list-activity-media] Files in', activitiesDir)

const files = fs.readdirSync(activitiesDir)
  .filter((name) => name.startsWith('astronomic-tour'))
  .sort()

if (files.length === 0) {
  console.log('[list-activity-media] No astronomic-tour files found.')
} else {
  for (const file of files) {
    console.log(' -', file)
  }
}





















