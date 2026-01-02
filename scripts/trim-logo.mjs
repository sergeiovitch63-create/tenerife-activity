#!/usr/bin/env node

/**
 * Script to trim transparent padding from logo.png
 * Creates logo-tight.png with transparent margins removed
 * 
 * Usage: node scripts/trim-logo.mjs
 * 
 * Requires: npm install sharp --save-dev
 */

import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')
const logoPath = join(projectRoot, 'public', 'logo.png')
const outputPath = join(projectRoot, 'public', 'logo-tight.png')

async function trimLogo() {
  try {
    if (!existsSync(logoPath)) {
      console.error(`❌ Logo not found at: ${logoPath}`)
      process.exit(1)
    }

    console.log('📐 Analyzing logo dimensions...')
    const metadata = await sharp(logoPath).metadata()
    console.log(`   Original size: ${metadata.width}x${metadata.height}px`)

    console.log('✂️  Trimming transparent padding...')
    const trimmed = await sharp(logoPath)
      .trim({
        threshold: 10, // Trim pixels with alpha < 10 (nearly transparent)
      })
      .toFile(outputPath)

    const trimmedMetadata = await sharp(outputPath).metadata()
    
    console.log(`✅ Trimmed logo created: ${outputPath}`)
    console.log(`   New size: ${trimmedMetadata.width}x${trimmedMetadata.height}px`)
    console.log(`   Saved: ${metadata.width - trimmedMetadata.width}x${metadata.height - trimmedMetadata.height}px`)
    
    console.log('\n📝 Next steps:')
    console.log('   1. Review logo-tight.png')
    console.log('   2. If it looks good, replace logo.png with logo-tight.png')
    console.log('   3. Update Header.tsx to remove scale transform and debug outlines')
    
  } catch (error) {
    console.error('❌ Error trimming logo:', error.message)
    if (error.message.includes('Cannot find module')) {
      console.error('\n💡 Install sharp first: npm install sharp --save-dev')
    }
    process.exit(1)
  }
}

trimLogo()



