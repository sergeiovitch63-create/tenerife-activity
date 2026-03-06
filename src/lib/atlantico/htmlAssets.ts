/**
 * HTML Asset Rewriter for Atlantico Content
 * 
 * Sanitizes HTML from Atlantico API to prevent broken image requests.
 * Rewrites relative image references to use local fallback images.
 */

const FALLBACK_IMAGE = '/images/hero-poster.jpg'

/**
 * Decode HTML entities in text (works on server and client).
 * Prevents literal "&nbsp;", "&amp;", etc. from appearing when displaying API content as text.
 */
export function decodeTextFromApi(str: string | null | undefined): string {
  if (!str || typeof str !== 'string') return ''
  
  let decoded = str
  
  // Decode numeric HTML entities first (e.g., &#39;, &#160;, &#8217;)
  // Match &#123; or &#x1F; patterns
  decoded = decoded.replace(/&#(\d+);/g, (match, code) => {
    const num = parseInt(code, 10)
    // Common numeric entities
    if (num === 39) return "'" // Apostrophe
    if (num === 160) return ' ' // Non-breaking space (&nbsp;)
    if (num === 8217) return "'" // Right single quotation mark
    if (num === 8216) return "'" // Left single quotation mark
    if (num === 8221) return '"' // Right double quotation mark
    if (num === 8220) return '"' // Left double quotation mark
    if (num === 38) return '&' // Ampersand
    if (num === 60) return '<' // Less than
    if (num === 62) return '>' // Greater than
    if (num === 34) return '"' // Quotation mark
    // For other numeric entities, try to convert to character
    try {
      return String.fromCharCode(num)
    } catch {
      return match // Keep original if conversion fails
    }
  })
  
  // Decode hex numeric entities (e.g., &#x27;)
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
    try {
      const num = parseInt(hex, 16)
      return String.fromCharCode(num)
    } catch {
      return match
    }
  })
  
  // Decode named HTML entities
  return decoded
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
}

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
 * - Decode HTML entities in text content (but not in HTML attributes)
 * - <img src="relative"> → <img src="/images/hero-poster.jpg" loading="lazy">
 * - <a href="relative.image"> → <a href="#">
 * - CSS url(relative) → url(/images/hero-poster.jpg)
 * 
 * @param html - Raw HTML string from Atlantico API
 * @returns Sanitized HTML with rewritten asset references and decoded entities in text
 */
export function rewriteAtlanticoHtmlAssets(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  // First decode HTML entities in text content (but preserve HTML structure)
  // We decode entities that appear in text nodes, not in HTML attributes
  let sanitized = html
  
  // Decode numeric HTML entities in text (e.g., &#39;, &#160;)
  sanitized = sanitized.replace(/&#(\d+);/g, (match, code) => {
    const num = parseInt(code, 10)
    if (num === 39) return "'" // Apostrophe
    if (num === 160) return ' ' // Non-breaking space
    if (num === 8217) return "'" // Right single quotation mark
    if (num === 8216) return "'" // Left single quotation mark
    if (num === 8221) return '"' // Right double quotation mark
    if (num === 8220) return '"' // Left double quotation mark
    if (num === 38) return '&' // Ampersand
    if (num === 60) return '<' // Less than
    if (num === 62) return '>' // Greater than
    if (num === 34) return '"' // Quotation mark
    try {
      return String.fromCharCode(num)
    } catch {
      return match
    }
  })
  
  // Decode hex numeric entities
  sanitized = sanitized.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
    try {
      const num = parseInt(hex, 16)
      return String.fromCharCode(num)
    } catch {
      return match
    }
  })
  
  // Decode named HTML entities
  sanitized = sanitized
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')

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















