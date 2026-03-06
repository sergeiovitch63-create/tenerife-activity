/**
 * Server-side visibility config reader
 */

import fs from 'fs'
import path from 'path'

const VISIBILITY_PATH = path.join(process.cwd(), 'src', 'data', 'visibility.json')

export interface VisibilityConfig {
  hiddenGroupIds: string[]
  hiddenEventIds: string[]
}

export function getVisibilityConfig(): VisibilityConfig {
  try {
    const raw = fs.readFileSync(VISIBILITY_PATH, 'utf-8')
    const data = JSON.parse(raw)
    return {
      hiddenGroupIds: Array.isArray(data.hiddenGroupIds) ? data.hiddenGroupIds : [],
      hiddenEventIds: Array.isArray(data.hiddenEventIds) ? data.hiddenEventIds : [],
    }
  } catch {
    return { hiddenGroupIds: [], hiddenEventIds: [] }
  }
}
