#!/usr/bin/env node

/**
 * i18n Sync Script
 * 
 * Syncs missing translation keys from messages/en.json to other locales.
 * - Adds missing keys only (preserves existing translations)
 * - Uses OpenAI API if OPENAI_API_KEY is set to translate missing strings
 * - Otherwise prefixes missing strings with "[EN] " + English text
 * - Never breaks if API key is missing
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const LOCALES = ['es', 'de', 'fr', 'it', 'ru', 'pl']
const MESSAGES_DIR = path.join(__dirname, '..', 'messages')
const EN_FILE = path.join(MESSAGES_DIR, 'en.json')

const FORCE_MODE = process.argv.includes('--force')
const REPORT_ONLY = process.argv.includes('--report')

/**
 * Deep merge two objects, adding missing keys from source to target
 */
function deepMergeMissing(source, target) {
  const result = { ...target }
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      // Recursive merge for nested objects
      result[key] = deepMergeMissing(source[key], result[key] || {})
    } else if (!(key in result) || FORCE_MODE) {
      // Add missing key or force overwrite
      if (FORCE_MODE || !(key in result)) {
        result[key] = source[key]
      }
    }
  }
  
  return result
}

/**
 * Get all missing keys by comparing source (en) with target (locale)
 * Returns array of paths like ['common.search', 'home.title']
 */
function getMissingKeys(source, target, prefix = '') {
  const missing = []
  
  for (const key in source) {
    const fullPath = prefix ? `${prefix}.${key}` : key
    const sourceValue = source[key]
    const targetValue = target[key]
    
    if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
      // Recursive for nested objects
      if (!targetValue || typeof targetValue !== 'object') {
        // Entire nested object is missing
        missing.push(fullPath)
      } else {
        // Check nested keys
        missing.push(...getMissingKeys(sourceValue, targetValue, fullPath))
      }
    } else if (!(key in target) || (targetValue === '' && FORCE_MODE)) {
      // Key is missing or empty string (if force mode)
      missing.push(fullPath)
    }
  }
  
  return missing
}

/**
 * Set a value in a nested object using a dot-path
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.')
  let current = obj
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key]
  }
  
  current[keys[keys.length - 1]] = value
}

/**
 * Get a value from a nested object using a dot-path
 */
function getNestedValue(obj, path) {
  const keys = path.split('.')
  let current = obj
  
  for (const key of keys) {
    if (!current || typeof current !== 'object' || !(key in current)) {
      return undefined
    }
    current = current[key]
  }
  
  return current
}

/**
 * Translate text using OpenAI API
 */
async function translateText(text, targetLocale) {
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    return null
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the following text to ${targetLocale.toUpperCase()}. Return ONLY the translation, no explanations or additional text. Preserve any special formatting, placeholders, or HTML entities.`,
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0.3,
      }),
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.warn(`[WARN] OpenAI API error: ${response.status} ${error}`)
      return null
    }
    
    const data = await response.json()
    return data.choices[0]?.message?.content?.trim() || null
  } catch (error) {
    console.warn(`[WARN] Translation API error: ${error.message}`)
    return null
  }
}

/**
 * Sync a locale file
 */
async function syncLocale(locale) {
  const localeFile = path.join(MESSAGES_DIR, `${locale}.json`)
  
  // Read English (source) and locale (target) files
  const enContent = JSON.parse(fs.readFileSync(EN_FILE, 'utf-8'))
  let localeContent = {}
  
  if (fs.existsSync(localeFile)) {
    localeContent = JSON.parse(fs.readFileSync(localeFile, 'utf-8'))
  }
  
  // Find missing keys
  const missingKeys = getMissingKeys(enContent, localeContent)
  
  if (missingKeys.length === 0) {
    console.log(`[OK] ${locale.toUpperCase()}: No missing keys`)
    return { locale, missing: 0, added: 0 }
  }
  
  console.log(`[SYNC] ${locale.toUpperCase()}: Found ${missingKeys.length} missing key(s)`)
  
  if (REPORT_ONLY) {
    console.log(`  Missing keys: ${missingKeys.join(', ')}`)
    return { locale, missing: missingKeys.length, added: 0 }
  }
  
  // Merge structure (adds missing keys with English values)
  const merged = deepMergeMissing(enContent, localeContent)
  
  // Translate missing keys
  let translated = 0
  let prefixed = 0
  const apiKey = process.env.OPENAI_API_KEY
  
  if (apiKey) {
    console.log(`[TRANS] ${locale.toUpperCase()}: Translating ${missingKeys.length} key(s) using OpenAI...`)
    
    for (const keyPath of missingKeys) {
      const enValue = getNestedValue(enContent, keyPath)
      
      if (typeof enValue !== 'string' || enValue === '') {
        continue
      }
      
      try {
        const translatedValue = await translateText(enValue, locale)
        
        if (translatedValue) {
          setNestedValue(merged, keyPath, translatedValue)
          translated++
        } else {
          // Fallback to prefixed English
          setNestedValue(merged, keyPath, `[EN] ${enValue}`)
          prefixed++
        }
      } catch (error) {
        console.warn(`[WARN] Failed to translate ${keyPath}: ${error.message}`)
        setNestedValue(merged, keyPath, `[EN] ${enValue}`)
        prefixed++
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  } else {
    console.log(`[INFO] ${locale.toUpperCase()}: OPENAI_API_KEY not set, prefixing with [EN]`)
    
    for (const keyPath of missingKeys) {
      const enValue = getNestedValue(enContent, keyPath)
      
      if (typeof enValue === 'string' && enValue !== '') {
        setNestedValue(merged, keyPath, `[EN] ${enValue}`)
        prefixed++
      }
    }
  }
  
  // Write updated locale file
  fs.writeFileSync(localeFile, JSON.stringify(merged, null, 2) + '\n', 'utf-8')
  
  console.log(`[DONE] ${locale.toUpperCase()}: Added ${missingKeys.length} key(s) (${translated} translated, ${prefixed} prefixed)`)
  
  return { locale, missing: missingKeys.length, added: missingKeys.length, translated, prefixed }
}

/**
 * Generate report
 */
async function generateReport() {
  const enContent = JSON.parse(fs.readFileSync(EN_FILE, 'utf-8'))
  const report = {}
  
  for (const locale of LOCALES) {
    const localeFile = path.join(MESSAGES_DIR, `${locale}.json`)
    
    if (!fs.existsSync(localeFile)) {
      report[locale] = { missing: 'ALL', missingCount: 'ALL' }
      continue
    }
    
    const localeContent = JSON.parse(fs.readFileSync(localeFile, 'utf-8'))
    const missingKeys = getMissingKeys(enContent, localeContent)
    
    report[locale] = {
      missing: missingKeys,
      missingCount: missingKeys.length,
    }
  }
  
  console.log('\n=== Translation Report ===\n')
  
  for (const [locale, data] of Object.entries(report)) {
    if (data.missingCount === 0) {
      console.log(`✅ ${locale.toUpperCase()}: Complete (no missing keys)`)
    } else if (data.missingCount === 'ALL') {
      console.log(`❌ ${locale.toUpperCase()}: File missing`)
    } else {
      console.log(`⚠️  ${locale.toUpperCase()}: ${data.missingCount} missing key(s)`)
      if (data.missing.length > 0 && data.missing.length <= 10) {
        console.log(`   Missing: ${data.missing.join(', ')}`)
      } else if (data.missing.length > 10) {
        console.log(`   Missing: ${data.missing.slice(0, 10).join(', ')}... (+${data.missing.length - 10} more)`)
      }
    }
  }
  
  console.log('')
  
  return report
}

/**
 * Main function
 */
async function main() {
  try {
    // Check if en.json exists
    if (!fs.existsSync(EN_FILE)) {
      console.error(`[ERROR] Source file not found: ${EN_FILE}`)
      process.exit(1)
    }
    
    if (REPORT_ONLY) {
      await generateReport()
      process.exit(0)
    }
    
    console.log('🌍 i18n Sync Script\n')
    
    if (FORCE_MODE) {
      console.log('[MODE] Force mode: Will overwrite existing translations\n')
    } else {
      console.log('[MODE] Normal mode: Preserving existing translations\n')
    }
    
    if (process.env.OPENAI_API_KEY) {
      console.log('[INFO] OPENAI_API_KEY found: Will translate missing strings\n')
    } else {
      console.log('[INFO] OPENAI_API_KEY not set: Will prefix missing strings with [EN]\n')
    }
    
    // Sync each locale
    const results = []
    for (const locale of LOCALES) {
      const result = await syncLocale(locale)
      results.push(result)
    }
    
    // Summary
    console.log('\n=== Summary ===\n')
    const totalMissing = results.reduce((sum, r) => sum + r.missing, 0)
    const totalAdded = results.reduce((sum, r) => sum + (r.added || 0), 0)
    const totalTranslated = results.reduce((sum, r) => sum + (r.translated || 0), 0)
    const totalPrefixed = results.reduce((sum, r) => sum + (r.prefixed || 0), 0)
    
    console.log(`Total missing keys: ${totalMissing}`)
    console.log(`Total keys added: ${totalAdded}`)
    if (process.env.OPENAI_API_KEY) {
      console.log(`Translated: ${totalTranslated}`)
      console.log(`Prefixed (fallback): ${totalPrefixed}`)
    }
    
    console.log('\n✅ Sync complete!')
    
    process.exit(0)
  } catch (error) {
    console.error(`[ERROR] ${error.message}`)
    console.error(error.stack)
    process.exit(1)
  }
}

main()

