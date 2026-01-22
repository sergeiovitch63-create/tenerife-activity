#!/usr/bin/env node
/**
 * Clean script - removes .next directory and optionally node_modules
 * Cross-platform compatible (Windows, macOS, Linux)
 */

import { rmSync, existsSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

const dirsToRemove = ['.next', 'node_modules/.cache']

// Check if --all flag is passed (removes node_modules too)
const removeNodeModules = process.argv.includes('--all')

if (removeNodeModules) {
  dirsToRemove.push('node_modules')
}

console.log('🧹 Cleaning build artifacts...\n')

let removedCount = 0

for (const dir of dirsToRemove) {
  const fullPath = join(rootDir, dir)
  
  if (existsSync(fullPath)) {
    try {
      rmSync(fullPath, { recursive: true, force: true })
      console.log(`✅ Removed: ${dir}`)
      removedCount++
    } catch (error) {
      console.error(`❌ Failed to remove ${dir}:`, error.message)
      process.exit(1)
    }
  } else {
    console.log(`ℹ️  Not found: ${dir} (already clean)`)
  }
}

if (removedCount === 0) {
  console.log('\n✨ Already clean!')
} else {
  console.log(`\n✨ Cleaned ${removedCount} directory/directories`)
}

