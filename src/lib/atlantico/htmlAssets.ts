/**
 * HTML Asset Rewriter for Atlantico Content
 * 
 * Sanitizes HTML from Atlantico API to prevent broken image requests.
 * Rewrites relative image references to use local fallback images.
 */

const FALLBACK_IMAGE = '/images/hero-poster.jpg'

/**
 * Check if a URL is relative or filename-only (not absolute)
 */
function isRelativeAsset(url: string): boolean {
  const trimmed = url.trim()
  // Absolute URLs (http/https) or absolute paths (/images/, /api/) are safe
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return false
  if (trimmed.startsWith('/images/') || trimmed.startsWith('/api/')) return false
  // Everything else is relative (filename.webp, ../image.jpg, etc.)
  return true
}

/**
 * Rewrite Atlantico HTML assets to use local fallback images
 * 
 * Rules:
 * - <img src="relative"> → <img src="/images/hero-poster.jpg" loading="lazy">
 * - <a href="relative.image"> → <a href="#">
 * - CSS url(relative) → url(/images/hero-poster.jpg)
 * 
 * @param html - Raw HTML string from Atlantico API
 * @returns Sanitized HTML with rewritten asset references
 */
export function rewriteAtlanticoHtmlAssets(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  let sanitized = html

  // 1. Rewrite <img> tags with relative src
  // Match: <img ... src="filename.webp" ...> or <img src='filename.jpg' ...>
  sanitized = sanitized.replace(
    /<img([^>]*)\ssrc=["']([^"']+)["']([^>]*)>/gi,
    (match, before, src, after) => {
      if (isRelativeAsset(src)) {
        // Replace src with fallback, add loading="lazy", remove srcset
        const cleanedBefore = before.replace(/\s+srcset=["'][^"']*["']/gi, '')
        const cleanedAfter = after.replace(/\s+srcset=["'][^"']*["']/gi, '')
        const hasLoading = /loading=["']/i.test(before + after)
        const loadingAttr = hasLoading ? '' : ' loading="lazy"'
        return `<img${cleanedBefore} src="${FALLBACK_IMAGE}"${loadingAttr}${cleanedAfter}>`
      }
      return match // Keep absolute URLs unchanged
    }
  )

  // 2. Rewrite <a> tags with relative image hrefs
  // Match: <a href="filename.webp"> or <a href='image.jpg'>
  sanitized = sanitized.replace(
    /<a([^>]*)\shref=["']([^"']+\.(webp|jpg|jpeg|png|gif))["']([^>]*)>/gi,
    (match, before, href, ext, after) => {
      if (isRelativeAsset(href)) {
        return `<a${before} href="#"${after}>`
      }
      return match
    }
  )

  // 3. Rewrite CSS url() in inline styles
  // Match: style="... url(filename.webp) ..." or style='... url(image.jpg) ...'
  sanitized = sanitized.replace(
    /style=["']([^"']*)url\(([^)]+\.(webp|jpg|jpeg|png|gif))\)([^"']*)["']/gi,
    (match, before, url, ext, after) => {
      const cleanUrl = url.trim().replace(/^["']|["']$/g, '') // Remove quotes if present
      if (isRelativeAsset(cleanUrl)) {
        return `style="${before}url(${FALLBACK_IMAGE})${after}"`
      }
      return match
    }
  )

  // 4. Also handle srcset attributes (remove them if they contain relative URLs)
  sanitized = sanitized.replace(
    /\ssrcset=["']([^"']+)["']/gi,
    (match, srcset) => {
      // Check if srcset contains any relative URLs
      const hasRelative = srcset.split(',').some((entry: string) => {
        const url = entry.trim().split(/\s+/)[0] // Get URL part (before width descriptor)
        return isRelativeAsset(url)
      })
      if (hasRelative) {
        return '' // Remove srcset entirely
      }
      return match
    }
  )

  return sanitized
}

/**
 * Sanitize and prepare HTML for dangerouslySetInnerHTML
 * 
 * @param html - Raw HTML string
 * @returns Sanitized HTML object for dangerouslySetInnerHTML
 */
export function sanitizeAtlanticoHtml(html: string | null | undefined): { __html: string } {
  if (!html || typeof html !== 'string') {
    return { __html: '' }
  }
  return {
    __html: rewriteAtlanticoHtmlAssets(html),
  }
}















