/**
 * Atlantico Image Downloader
 * 
 * Downloads images from Atlantico API and saves them locally in public/images/atlantico/
 */

import { promises as fs } from 'fs'
import path from 'path'
import { getAtlanticoImageBaseUrl } from './images'

const ATLANTICO_IMAGES_DIR = path.join(process.cwd(), 'public', 'images', 'atlantico')

/**
 * Ensure the atlantico images directory exists
 */
async function ensureDirectoryExists(): Promise<void> {
  try {
    await fs.access(ATLANTICO_IMAGES_DIR)
  } catch {
    // Directory doesn't exist, create it
    await fs.mkdir(ATLANTICO_IMAGES_DIR, { recursive: true })
  }
}

/**
 * Check if an image file exists locally
 */
export async function imageExistsLocally(filename: string): Promise<boolean> {
  try {
    const filePath = path.join(ATLANTICO_IMAGES_DIR, filename)
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Get the local path for an image
 */
export function getLocalImagePath(filename: string): string {
  return path.join(ATLANTICO_IMAGES_DIR, filename)
}

/**
 * Get the public URL for a local image
 */
export function getLocalImageUrl(filename: string): string {
  return `/images/atlantico/${filename}`
}

/**
 * Download an image from Atlantico API and save it locally
 * 
 * @param filename - Image filename (e.g., "Teleferico.jpg")
 * @returns Local public URL if successful, null if failed
 */
export async function downloadAtlanticoImage(filename: string): Promise<string | null> {
  if (!filename || typeof filename !== 'string') {
    return null
  }

  const trimmed = filename.trim()
  if (!trimmed) {
    return null
  }

  // Sanitize filename for security
  const sanitized = path.basename(trimmed) // Remove any path traversal attempts
  if (sanitized !== trimmed || !/^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/i.test(sanitized)) {
    console.error('[DOWNLOAD_IMAGE] Invalid filename:', filename)
    return null
  }

  // Check if already exists locally
  const exists = await imageExistsLocally(sanitized)
  if (exists) {
    return getLocalImageUrl(sanitized)
  }

  // Ensure directory exists
  await ensureDirectoryExists()

  // Build remote URL
  const imageBase = getAtlanticoImageBaseUrl()
  const remoteUrl = `${imageBase}/${encodeURIComponent(sanitized)}`

  try {
    // Download image
    const response = await fetch(remoteUrl, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Tenerife-Activity/1.0',
      },
    })

    if (!response.ok) {
      console.error('[DOWNLOAD_IMAGE] Failed to fetch:', {
        filename: sanitized,
        remoteUrl,
        status: response.status,
        statusText: response.statusText,
      })
      return null
    }

    // Get image buffer
    const buffer = await response.arrayBuffer()
    if (!buffer || buffer.byteLength === 0) {
      console.error('[DOWNLOAD_IMAGE] Empty response:', sanitized)
      return null
    }

    // Save to local file
    const filePath = getLocalImagePath(sanitized)
    await fs.writeFile(filePath, Buffer.from(buffer))

    if (process.env.NODE_ENV === 'development') {
      console.log('[DOWNLOAD_IMAGE] Downloaded:', {
        filename: sanitized,
        size: buffer.byteLength,
        localPath: filePath,
        publicUrl: getLocalImageUrl(sanitized),
      })
    }

    return getLocalImageUrl(sanitized)
  } catch (error) {
    console.error('[DOWNLOAD_IMAGE] Error downloading image:', {
      filename: sanitized,
      remoteUrl,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Get or download an image (returns local URL if available, downloads if not)
 * 
 * @param filename - Image filename
 * @returns Local public URL if successful, null if failed
 */
export async function getOrDownloadImage(filename: string): Promise<string | null> {
  if (!filename || typeof filename !== 'string') {
    return null
  }

  const trimmed = filename.trim()
  if (!trimmed) {
    return null
  }

  // Sanitize filename
  const sanitized = path.basename(trimmed)
  if (sanitized !== trimmed || !/^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/i.test(sanitized)) {
    return null
  }

  // Check if exists locally
  const exists = await imageExistsLocally(sanitized)
  if (exists) {
    return getLocalImageUrl(sanitized)
  }

  // Download it
  return downloadAtlanticoImage(sanitized)
}

