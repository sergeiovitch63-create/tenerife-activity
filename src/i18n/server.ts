/**
 * Safe Server-Side Translation Functions
 * 
 * Enhanced next-intl server functions with missing key detection and English fallback
 */

import { getTranslations } from 'next-intl/server'

/**
 * Get nested value from object using dot path
 */
function getNestedValue(obj: any, path: string): any {
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
 * Get English fallback value (synchronous for server-side)
 */
function getEnglishFallback(
  namespace: string | undefined,
  key: string,
  enMessages: Record<string, any>
): string {
  try {
    if (namespace) {
      const namespaceMessages = enMessages[namespace]
      if (namespaceMessages && typeof namespaceMessages === 'object') {
        const value = getNestedValue(namespaceMessages, key)
        if (typeof value === 'string') {
          return value
        }
      }
    } else {
      const value = getNestedValue(enMessages, key)
      if (typeof value === 'string') {
        return value
      }
    }
  } catch (error) {
    // Silently fail
  }
  
  return key
}

/**
 * Safe server-side translation function
 * 
 * Wraps getTranslations with missing key detection and English fallback
 * 
 * Usage: const t = await getSafeTranslations({ locale: 'fr', namespace: 'common' })
 *        const text = t('search')
 */
export async function getSafeTranslations(
  options?: { locale?: string; namespace?: string }
): Promise<(key: string, values?: Record<string, any>) => string> {
  const t = await getTranslations(options)
  
  // Load English messages for fallback (only if not English locale, cache in closure)
  let enMessages: Record<string, any> | null = null
  if (options?.locale !== 'en') {
    try {
      enMessages = (await import('../../messages/en.json')).default as Record<string, any>
    } catch (error) {
      // Silently fail
    }
  }
  
  return function safeTranslate(
    key: string,
    values?: Record<string, any>
  ): string {
    const namespace = options?.namespace
    const fullKey = namespace ? `${namespace}.${key}` : key
    
    try {
      const result = t(key, values)
      
      // next-intl returns the full key path for missing translations
      // Check if result matches the missing pattern
      const isMissing = result === fullKey || (namespace && result === key)
      
      if (isMissing && enMessages) {
        // Fallback to English
        const enFallback = getEnglishFallback(namespace, key, enMessages)
        if (enFallback !== key) {
          return enFallback
        }
      }
      
      return result
    } catch (error) {
      // Try English fallback on error
      if (enMessages) {
        const enFallback = getEnglishFallback(namespace, key, enMessages)
        if (enFallback !== key) {
          return enFallback
        }
      }
      
      return key
    }
  }
}

