/**
 * Script to download all images for event 303
 */

const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')

const EVENT_ID = '303'
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images', 'events', EVENT_ID)

// Images from groupDetails for event 303
const IMAGES = [
  'https://www.atlanticoexcursiones.com/zeus/pictures/GRP303/B.jpg',
  'https://www.atlanticoexcursiones.com/zeus/pictures/GRP303/C.jpg',
  'https://www.atlanticoexcursiones.com/zeus/pictures/GRP303/D.jpg',
  'https://www.atlanticoexcursiones.com/zeus/pictures/GRP303/E.jpg',
  // Also try to get A.webp (main image)
  'https://www.atlanticoexcursiones.com/zeus/pictures/GRP303/A.webp',
]

// Ensure directory exists
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true })
  console.log(`✅ Created directory: ${IMAGES_DIR}`)
}

/**
 * Download a single image
 */
function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(IMAGES_DIR, filename)
    
    // Check if already exists
    if (fs.existsSync(filePath)) {
      console.log(`⏭️  Already exists: ${filename}`)
      resolve(filePath)
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
          console.log(`✅ Downloaded: ${filename} (${(stats.size / 1024).toFixed(2)} KB)`)
          resolve(filePath)
        })
      } else if (response.statusCode === 404) {
        console.log(`❌ Not found (404): ${filename}`)
        resolve(null)
      } else {
        console.log(`❌ Failed (${response.statusCode}): ${filename}`)
        resolve(null)
      }
    })

    request.on('error', (error) => {
      console.error(`❌ Error downloading ${filename}:`, error.message)
      resolve(null)
    })

    request.setTimeout(10000, () => {
      request.destroy()
      console.error(`❌ Timeout downloading ${filename}`)
      resolve(null)
    })
  })
}

/**
 * Main function
 */
async function main() {
  console.log(`\n📥 Downloading images for event ${EVENT_ID}...\n`)
  
  const results = []
  
  for (const imageUrl of IMAGES) {
    const urlParts = imageUrl.split('/')
    const filename = urlParts[urlParts.length - 1]
    const result = await downloadImage(imageUrl, filename)
    results.push({ url: imageUrl, filename, success: result !== null })
  }

  console.log(`\n📊 Summary:`)
  console.log(`   Total: ${IMAGES.length}`)
  console.log(`   Success: ${results.filter(r => r.success).length}`)
  console.log(`   Failed: ${results.filter(r => !r.success).length}`)
  console.log(`\n📁 Images saved to: ${IMAGES_DIR}`)
  console.log(`\n✅ Done!\n`)
}

main().catch(console.error)



