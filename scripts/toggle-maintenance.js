#!/usr/bin/env node

/**
 * Quick script to toggle maintenance mode via .env.local file
 * 
 * Usage:
 *   node scripts/toggle-maintenance.js enable
 *   node scripts/toggle-maintenance.js disable
 *   node scripts/toggle-maintenance.js status
 */

const fs = require('fs')
const path = require('path')

const envLocalPath = path.join(process.cwd(), '.env.local')
const envPath = path.join(process.cwd(), '.env')

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return []
  }
  return fs.readFileSync(filePath, 'utf-8').split('\n')
}

function writeEnvFile(filePath, lines) {
  const content = lines.filter(line => line.trim() !== '').join('\n') + '\n'
  fs.writeFileSync(filePath, content, 'utf-8')
}

function getEnvFiles() {
  const files = []
  if (fs.existsSync(envLocalPath)) {
    files.push({ path: envLocalPath, lines: readEnvFile(envLocalPath) })
  }
  if (fs.existsSync(envPath)) {
    files.push({ path: envPath, lines: readEnvFile(envPath) })
  }
  return files.length > 0 ? files : [{ path: envLocalPath, lines: [] }]
}

function updateMaintenanceMode(value) {
  const files = getEnvFiles()
  const targetFile = files[0] // Use .env.local if exists, otherwise .env
  
  let lines = targetFile.lines
  let found = false
  
  // Update or add the maintenance mode variable
  lines = lines.map(line => {
    if (line.startsWith('NEXT_PUBLIC_MAINTENANCE_MODE=')) {
      found = true
      return `NEXT_PUBLIC_MAINTENANCE_MODE=${value}`
    }
    return line
  })
  
  if (!found) {
    lines.push(`NEXT_PUBLIC_MAINTENANCE_MODE=${value}`)
  }
  
  writeEnvFile(targetFile.path, lines)
  return targetFile.path
}

function getMaintenanceStatus() {
  const files = getEnvFiles()
  
  for (const file of files) {
    for (const line of file.lines) {
      if (line.startsWith('NEXT_PUBLIC_MAINTENANCE_MODE=')) {
        const value = line.split('=')[1]?.trim()
        return value === 'true' || value === '1'
      }
    }
  }
  
  return false
}

const command = process.argv[2]

if (!command || !['enable', 'disable', 'status'].includes(command)) {
  console.error('Usage: node scripts/toggle-maintenance.js [enable|disable|status]')
  process.exit(1)
}

if (command === 'status') {
  const isEnabled = getMaintenanceStatus()
  console.log(`Maintenance mode is currently: ${isEnabled ? 'ENABLED' : 'DISABLED'}`)
  if (isEnabled) {
    console.log('⚠️  Public visitors will see the maintenance page')
    console.log('✅ Localhost access will continue to work normally')
  }
  process.exit(0)
}

if (command === 'enable') {
  const filePath = updateMaintenanceMode('true')
  console.log(`✅ Maintenance mode ENABLED`)
  console.log(`📝 Updated: ${filePath}`)
  console.log('')
  console.log('⚠️  IMPORTANT: Restart your development server for changes to take effect')
  console.log('   Run: npm run dev (or your start command)')
  console.log('')
  console.log('Public visitors will now see the maintenance page.')
  console.log('Localhost (127.0.0.1) will continue to work normally.')
} else if (command === 'disable') {
  const filePath = updateMaintenanceMode('false')
  console.log(`✅ Maintenance mode DISABLED`)
  console.log(`📝 Updated: ${filePath}`)
  console.log('')
  console.log('⚠️  IMPORTANT: Restart your development server for changes to take effect')
  console.log('   Run: npm run dev (or your start command)')
  console.log('')
  console.log('The website is now accessible to all visitors.')
}









