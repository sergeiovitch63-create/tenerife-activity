/**
 * Path utilities for locale handling
 * 
 * Prevents double locale prefixes like /en/en/cart
 */

/**
 * Normalize a path to ensure it has exactly one locale prefix
 * 
 * @param path - Path that may or may not have locale prefix (e.g., "/cart", "/en/cart", "cart")
 * @param locale - Locale code (e.g., "en", "es")
 * @returns Path with exactly one locale prefix (e.g., "/en/cart")
 * 
 * @example
 * withLocale("/cart", "en") => "/en/cart"
 * withLocale("/en/cart", "en") => "/en/cart"
 * withLocale("/es/cart", "en") => "/en/cart" (replaces existing locale)
 * withLocale("cart", "en") => "/en/cart"
 */
export function withLocale(path: string, locale: string): string {
  // Normalize path: remove leading/trailing slashes, then add leading slash
  let normalized = path.trim()
  
  // Remove any existing locale prefix
  const localePattern = new RegExp(`^/(en|es|de|fr|it|ru|pl|uk)(/|$)`, 'i')
  normalized = normalized.replace(localePattern, '/')
  
  // Ensure starts with /
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized
  }
  
  // Add locale prefix
  return `/${locale}${normalized}`
}

/**
 * Check if a path already has a locale prefix
 */
export function hasLocalePrefix(path: string): boolean {
  const localePattern = /^\/(en|es|de|fr|it|ru|pl|uk)(\/|$)/i
  return localePattern.test(path)
}

/**
 * Remove locale prefix from a path
 */
export function removeLocalePrefix(path: string): string {
  const localePattern = /^\/(en|es|de|fr|it|ru|pl|uk)(\/|$)/i
  return path.replace(localePattern, '/').replace(/^\/+/, '/')
}







