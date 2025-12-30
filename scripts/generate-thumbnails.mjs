#!/usr/bin/env node

/**
 * Generate video thumbnails using ffmpeg
 * 
 * Scans /public/videos for video files and generates .webp thumbnails
 * at ~1 second into each video.
 * 
 * Requires ffmpeg to be installed:
 * - macOS: brew install ffmpeg
 * - Windows: choco install ffmpeg
 * - Linux: sudo apt install ffmpeg
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { readdir, stat, mkdir, access } from 'fs/promises'
import { join, dirname, basename, extname } from 'path'
import { fileURLToPath } from 'url'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')
const videosDir = join(projectRoot, 'public', 'videos')
const thumbnailsDir = join(videosDir, 'thumbnails')

// Video file extensions to process
const VIDEO_EXTENSIONS = ['.mp4', '.webm']

/**
 * Check if ffmpeg is available
 */
async function checkFFmpeg() {
  try {
    await execAsync('ffmpeg -version')
    return true
  } catch (error) {
    return false
  }
}

/**
 * Get thumbnail path for a video file
 */
function getThumbnailPath(videoPath) {
  const baseName = basename(videoPath, extname(videoPath))
  return join(thumbnailsDir, `${baseName}.webp`)
}

/**
 * Generate thumbnail for a video file
 * Tries webp first, falls back to jpg if webp encoding fails
 */
async function generateThumbnail(videoPath, thumbnailPath) {
  // Try webp format first (preferred)
  // Note: -f webp may not be needed as ffmpeg auto-detects from extension, but including for clarity
  const webpCommand = `ffmpeg -y -ss 00:00:00.5 -i "${videoPath}" -frames:v 1 -q:v 80 "${thumbnailPath}"`
  
  try {
    await execAsync(webpCommand, { maxBuffer: 10 * 1024 * 1024 })
    return true
  } catch (webpError) {
    // If webp fails, try jpg fallback
    const jpgPath = thumbnailPath.replace(/\.webp$/, '.jpg')
    const jpgCommand = `ffmpeg -y -ss 00:00:00.5 -i "${videoPath}" -frames:v 1 -q:v 2 "${jpgPath}"`
    
    try {
      await execAsync(jpgCommand, { maxBuffer: 10 * 1024 * 1024 })
      console.log(`  ⚠️  Generated as .jpg (webp encoding failed)`)
      return true
    } catch (jpgError) {
      // If 0.5s fails, try 1s as fallback for webp
      try {
        const fallbackWebpCommand = `ffmpeg -y -ss 00:00:01.0 -i "${videoPath}" -frames:v 1 -q:v 80 "${thumbnailPath}"`
        await execAsync(fallbackWebpCommand, { maxBuffer: 10 * 1024 * 1024 })
        return true
      } catch (fallbackError) {
        console.error(`  ❌ Failed to generate thumbnail: ${webpError.message}`)
        return false
      }
    }
  }
}

/**
 * Check if file exists
 */
async function fileExists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🎬 Video Thumbnail Generator\n')

  // Check for ffmpeg
  console.log('Checking for ffmpeg...')
  const hasFFmpeg = await checkFFmpeg()
  
  if (!hasFFmpeg) {
    console.error('\n❌ ffmpeg is not installed or not in PATH\n')
    console.log('Please install ffmpeg:')
    console.log('  • macOS:    brew install ffmpeg')
    console.log('  • Windows:  choco install ffmpeg')
    console.log('  • Linux:    sudo apt install ffmpeg (or use your package manager)\n')
    console.log('After installing, run this script again.')
    // Exit with code 0 so build/dev isn't broken
    process.exit(0)
  }

  console.log('✅ ffmpeg found\n')

  // Ensure thumbnails directory exists
  try {
    await mkdir(thumbnailsDir, { recursive: true })
    console.log(`📁 Thumbnails directory: ${thumbnailsDir}\n`)
  } catch (error) {
    console.error(`❌ Failed to create thumbnails directory: ${error.message}`)
    process.exit(1)
  }

  // Read video files
  let videoFiles = []
  try {
    const entries = await readdir(videosDir, { withFileTypes: true })
    videoFiles = entries
      .filter(entry => {
        // Skip directories (like thumbnails folder)
        if (entry.isDirectory()) {
          return false
        }
        // Check if file has a video extension
        const ext = extname(entry.name).toLowerCase()
        return VIDEO_EXTENSIONS.includes(ext)
      })
      .map(entry => join(videosDir, entry.name))
  } catch (error) {
    console.error(`❌ Failed to read videos directory: ${error.message}`)
    process.exit(1)
  }

  if (videoFiles.length === 0) {
    console.log('⚠️  No video files found in /public/videos')
    process.exit(0)
  }

  console.log(`Found ${videoFiles.length} video file(s)\n`)

  // Process each video
  let created = 0
  let skipped = 0
  let failed = 0

  for (const videoPath of videoFiles) {
    const videoName = basename(videoPath)
    const thumbnailPath = getThumbnailPath(videoPath)
    const thumbnailName = basename(thumbnailPath)

    // Check if thumbnail already exists (try both webp and jpg)
    const jpgThumbnailPath = thumbnailPath.replace(/\.webp$/, '.jpg')
    if (await fileExists(thumbnailPath) || await fileExists(jpgThumbnailPath)) {
      console.log(`[SKIP] ${videoName}`)
      skipped++
      continue
    }

    // Generate thumbnail
    const success = await generateThumbnail(videoPath, thumbnailPath)

    if (success) {
      const actualPath = await fileExists(thumbnailPath) ? thumbnailPath : jpgThumbnailPath
      const actualName = basename(actualPath)
      console.log(`[CREATE] ${videoName} → ${actualName}`)
      created++
    } else {
      console.log(`[FAIL] ${videoName}`)
      failed++
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('Summary:')
  console.log(`  ✅ Created: ${created}`)
  console.log(`  ⏭️  Skipped: ${skipped}`)
  if (failed > 0) {
    console.log(`  ❌ Failed: ${failed}`)
  }
  console.log('='.repeat(50) + '\n')
}

// Run the script
main().catch((error) => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})

