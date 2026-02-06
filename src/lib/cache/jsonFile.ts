/**
 * JSON file cache utilities
 * 
 * Atomic read/write operations for JSON files.
 */

import { promises as fs } from 'fs'
import { join, dirname } from 'path'

/**
 * Read JSON file
 * 
 * @param absPath - Absolute path to JSON file
 * @returns Parsed JSON data or null if file doesn't exist
 */
export async function readJsonFile<T>(absPath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(absPath, 'utf-8')
    const data = JSON.parse(content)
    return data as T
  } catch (error) {
    // File doesn't exist or invalid JSON
    if ((error as any).code === 'ENOENT') {
      return null
    }
    throw error
  }
}

/**
 * Write JSON file atomically
 * 
 * Writes to a temporary file first, then renames to target.
 * This ensures atomicity: either the full file is written or nothing.
 * 
 * @param absPath - Absolute path to JSON file
 * @param data - Data to write (will be JSON.stringify'd)
 */
export async function writeJsonFile<T>(absPath: string, data: T): Promise<void> {
  // Ensure directory exists
  await ensureDir(dirname(absPath))

  // Write to temporary file first
  const tmpPath = `${absPath}.tmp`
  const content = JSON.stringify(data, null, 2)
  await fs.writeFile(tmpPath, content, 'utf-8')

  // Atomic rename (replaces target file)
  await fs.rename(tmpPath, absPath)
}

/**
 * Ensure directory exists
 * 
 * @param absDir - Absolute path to directory
 */
export async function ensureDir(absDir: string): Promise<void> {
  try {
    await fs.access(absDir)
  } catch {
    // Directory doesn't exist, create it recursively
    await fs.mkdir(absDir, { recursive: true })
  }
}
















