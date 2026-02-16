/**
 * Script to download all images for VIP Tours activities (classification 308)
 * Follows the same logic as activity 303
 */

const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')

const BASE_URL = 'http://localhost:3000'
const IMAGES_BASE_DIR = path.join(__dirname, '..', 'public', 'images', 'events')

/**
 * Fetch all VIP Tours groups from API
 */
async function fetchVipToursGroups() {
  try {
    const response = await fetch(`${BASE_URL}/api/atlantico/vip-tours-groups`)
    const data = await response.json()
    
    if (!data.success || !Array.isArray(data.groups)) {
      console.error('❌ No groups found in API response')
      return []
    }
    
    console.log(`\n📋 Found ${data.groups.length} VIP Tours activities\n`)
    
    return data.groups
  } catch (error) {
    console.error('❌ Error fetching VIP Tours:', error.message)
    return []
  }
}

/**
 * Fetch groupDetails for a specific group code
 */
async function fetchGroupDetails(groupCode, lang = 'ENG') {
  try {
    const response = await fetch(`${BASE_URL}/api/atlantico/group/${groupCode}/${lang}`)
    if (!response.ok) {
      return null
    }
    return await response.json()
  } catch (error) {
    console.error(`❌ Error fetching groupDetails for ${groupCode}:`, error.message)
    return null
  }
}

/**
 * Download a single image
 */
function downloadImage(url, filePath) {
  return new Promise((resolve) => {
    // Check if already exists
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath)
      console.log(`⏭️  Already exists: ${path.basename(filePath)} (${(stats.size / 1024).toFixed(2)} KB)`)
      resolve(true)
      return
    }

    const protocol = url.startsWith('https') ? https : http
    
    const request = protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        const fileStream = fs.createWriteStream(filePath)
        response.pipe(fileStream)
        
        fileStream.on('finish', () => {
          fileStream.close()
          const stats = fs.statSync(filePath)
          console.log(`✅ Downloaded: ${path.basename(filePath)} (${(stats.size / 1024).toFixed(2)} KB)`)
          resolve(true)
        })
      } else if (response.statusCode === 404) {
        console.log(`❌ Not found (404): ${path.basename(filePath)}`)
        resolve(false)
      } else {
        console.log(`❌ Failed (${response.statusCode}): ${path.basename(filePath)}`)
        resolve(false)
      }
    })

    request.on('error', (error) => {
      console.error(`❌ Error downloading ${path.basename(filePath)}:`, error.message)
      resolve(false)
    })

    request.setTimeout(15000, () => {
      request.destroy()
      console.error(`❌ Timeout downloading ${path.basename(filePath)}`)
      resolve(false)
    })
  })
}

/**
 * Download all images for a group
 */
async function downloadGroupImages(groupCode, groupDetails) {
  const groupDir = path.join(IMAGES_BASE_DIR, groupCode)
  
  // Ensure directory exists
  if (!fs.existsSync(groupDir)) {
    fs.mkdirSync(groupDir, { recursive: true })
  }

  const images = []
  
  // 1. Get images from groupDetails.images array (full URLs)
  if (Array.isArray(groupDetails.images) && groupDetails.images.length > 0) {
    for (const img of groupDetails.images) {
      if (typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))) {
        images.push(img)
      }
    }
  }
  
  // 2. Get image from groupDetails.image (filename) - build URL
  if (groupDetails.image && typeof groupDetails.image === 'string' && groupDetails.image.trim()) {
    const filename = groupDetails.image.trim()
    // Try common patterns
    const baseUrls = [
      'https://www.atlanticoexcursiones.com/zeus/pictures',
      'https://api.atlanticoexcursiones.com/images',
    ]
    
    for (const baseUrl of baseUrls) {
      const possibleUrls = [
        `${baseUrl}/GRP${groupCode}/${filename}`,
        `${baseUrl}/${filename}`,
      ]
      images.push(...possibleUrls)
    }
  }

  if (images.length === 0) {
    console.log(`⚠️  No images found for group ${groupCode}`)
    return []
  }

  console.log(`\n📥 Downloading ${images.length} image(s) for group ${groupCode}...`)
  
  const results = []
  const downloadedFiles = new Set()
  
  for (const imageUrl of images) {
    const urlParts = imageUrl.split('/')
    const filename = urlParts[urlParts.length - 1]
    
    // Skip if already downloaded (avoid duplicates)
    if (downloadedFiles.has(filename)) {
      continue
    }
    
    const filePath = path.join(groupDir, filename)
    const success = await downloadImage(imageUrl, filePath)
    
    if (success) {
      downloadedFiles.add(filename)
      results.push({ url: imageUrl, filename, success: true })
    } else {
      results.push({ url: imageUrl, filename, success: false })
    }
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  return results
}

/**
 * Main function
 */
async function main() {
  console.log('\n🚀 Starting VIP Tours images download...\n')
  
  // Fetch all VIP Tours groups
  const vipTours = await fetchVipToursGroups()
  
  if (vipTours.length === 0) {
    console.log('❌ No VIP Tours found. Make sure the server is running and the API is accessible.')
    return
  }

  const allResults = []
  
  for (const tour of vipTours) {
    const groupCode = String(tour.code || tour.id)
    const groupName = tour.name || 'Unknown'
    
    console.log(`\n${'='.repeat(60)}`)
    console.log(`📦 Processing: ${groupName} (Code: ${groupCode})`)
    console.log(`${'='.repeat(60)}`)
    
    // Fetch groupDetails
    const groupDetails = await fetchGroupDetails(groupCode, 'ENG')
    
    if (!groupDetails) {
      console.log(`⚠️  Could not fetch groupDetails for ${groupCode}`)
      continue
    }
    
    // Download images
    const results = await downloadGroupImages(groupCode, groupDetails)
    allResults.push({ groupCode, groupName, results })
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`)
  console.log(`📊 SUMMARY`)
  console.log(`${'='.repeat(60)}`)
  
  for (const { groupCode, groupName, results } of allResults) {
    const successCount = results.filter(r => r.success).length
    const totalCount = results.length
    console.log(`\n${groupName} (${groupCode}):`)
    console.log(`   ✅ Downloaded: ${successCount}/${totalCount}`)
    if (successCount > 0) {
      console.log(`   📁 Location: public/images/events/${groupCode}/`)
    }
  }
  
  console.log(`\n✅ Done!\n`)
}

main().catch(console.error)

