/**
 * Maps vibe slugs to translation keys
 * Example: 'vip-tours' -> 'vipTours'
 */
export function vibeSlugToTranslationKey(slug: string): string {
  // Convert kebab-case to camelCase
  return slug
    .split('-')
    .map((word, index) => {
      if (index === 0) {
        return word
      }
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join('')
}

/**
 * Get translated vibe title (for server components)
 * @param slug - Vibe slug (e.g., 'vip-tours')
 * @param t - Translation function from getTranslations('vibes')
 * @param fallback - Fallback title if translation not found
 */
export function getTranslatedVibeTitle(
  slug: string,
  t: (key: string) => string,
  fallback: string
): string {
  const translationKey = vibeSlugToTranslationKey(slug)
  return t(translationKey) || fallback
}

