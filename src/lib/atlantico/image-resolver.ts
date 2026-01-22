/**
 * Atlantico Image Resolver
 * 
 * Resolves image references from Atlantico API to displayable URLs.
 * Handles both full URLs and filenames that need to be proxied.
 */

/**
 * Resolve an Atlantico image reference to a displayable URL
 * 
 * @param image - Image value from Atlantico API (can be string, null, undefined, or other types)
 * @returns Resolved image URL or null if image is invalid
 */
export function resolveAtlanticoImage(image: unknown): string | null {
  // If image is empty/null/undefined => return null
  if (!image || image === null || image === undefined) {
    return null
  }

  // If image is not a string, try to convert or return null
  if (typeof image !== 'string') {
    // Try to extract string from object/array
    if (typeof image === 'object' && image !== null) {
      // Check common image fields
      const obj = image as any
      const imageValue = obj.url || obj.src || obj.image || obj.imageUrl || obj.filename
      if (typeof imageValue === 'string' && imageValue.trim()) {
        return resolveAtlanticoImage(imageValue)
      }
    }
    return null
  }

  const trimmed = image.trim()

  // If empty string => return null
  if (trimmed.length === 0 || trimmed === 'null' || trimmed === 'undefined') {
    return null
  }

  // If image is already a full HTTP(S) URL => return as-is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }

  // If image is a protocol-relative URL (//example.com) => convert to https
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`
  }

  // If image looks like a filename (not a full URL) => return as-is.
  // NOTE: call sites should convert filenames to public URLs using `atlanticoAssetUrl`.
  // We avoid proxying image binaries server-side.
  return trimmed
}








