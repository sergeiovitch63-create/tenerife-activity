'use client'

/**
 * Safe Client-Side Translation Hook
 * 
 * Wraps useTranslations (next-intl handles fallback internally)
 * 
 * Usage: const t = useSafeTranslations('common')
 *        const text = t('search')
 */

import { useTranslations } from 'next-intl'

/**
 * Safe client-side translation hook
 * 
 * Note: This is a simple wrapper. For production, you can use useTranslations directly.
 * This exists for API consistency with server-side getSafeTranslations.
 */
export function useSafeTranslations(namespace?: string) {
  return useTranslations(namespace)
}

