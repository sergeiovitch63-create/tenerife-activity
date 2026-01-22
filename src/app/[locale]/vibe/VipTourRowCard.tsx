/**
 * VIP Tour Row Card Component
 * 
 * Atlántico-style layout with luxury design tokens:
 * - Left: image (aspect ratio similar to Atlántico, rounded corners, cover)
 * - Middle: title + short description + info rows with icons
 * - Right: price block "desde: XX€" or "Price on request"
 * 
 * Server component (no event handlers inline).
 * Uses ClientImage for images to avoid Next.js errors.
 */

import { Link } from '@/navigation'
import { ClientImage } from '../catalog/ClientImage'
import type { FullTour } from '@/lib/atlantico/catalog-types'
import { astronomicTourVipMedia } from '@/content/activities/astronomic-tour-vip.media'
import { gomeraVipTourMedia } from '@/content/activities/gomera-vip-tour.media'

/**
 * Clean description text: decode HTML entities, strip HTML tags, trim
 */
function cleanDescriptionText(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return ''
  
  let cleaned = text
  
  // Decode numeric HTML entities first (e.g., &#39;, &#8217;, &#160;)
  // Match &#123; or &#x1F; patterns
  cleaned = cleaned.replace(/&#(\d+);/g, (match, code) => {
    const num = parseInt(code, 10)
    // Common numeric entities
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
    // For other numeric entities, try to convert to character
    try {
      return String.fromCharCode(num)
    } catch {
      return match // Keep original if conversion fails
    }
  })
  
  // Decode hex numeric entities (e.g., &#x27;)
  cleaned = cleaned.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
    try {
      const num = parseInt(hex, 16)
      return String.fromCharCode(num)
    } catch {
      return match
    }
  })
  
  // Decode named HTML entities
  const entityMap: Record<string, string> = {
    '&rsquo;': "'",
    '&lsquo;': "'",
    '&rdquo;': '"',
    '&ldquo;': '"',
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
  }
  
  // Replace named HTML entities
  for (const [entity, replacement] of Object.entries(entityMap)) {
    cleaned = cleaned.replace(new RegExp(entity, 'gi'), replacement)
  }
  
  // Strip HTML tags (simple regex for common tags)
  cleaned = cleaned.replace(/<[^>]*>/g, '')
  
  // Trim whitespace
  cleaned = cleaned.trim()
  
  // Replace multiple spaces with single space
  cleaned = cleaned.replace(/\s+/g, ' ')
  
  return cleaned
}

/**
 * Format duration from hours to readable string
 */
function formatDuration(hours: number | null): string | null {
  if (!hours || hours <= 0) return null
  
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  
  if (h > 0 && m > 0) {
    return `${h}h ${m}m`
  } else if (h > 0) {
    return `${h}h`
  } else if (m > 0) {
    return `${m}m`
  }
  
  return null
}

/**
 * Format price with currency
 */
function formatPrice(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Check if an event is an "extra person" or add-on option
 */
function isExtraPersonOption(event: any): boolean {
  if (!event) return false
  
  // Check event title/name for extra person indicators
  const title = (event.title || event.name || event.raw?.name || '').toLowerCase()
  const eventCode = (event.eventCode || event.code || '').toLowerCase()
  
  const extraPersonIndicators = [
    'extra person',
    'persona extra',
    'add-on',
    'additional person',
    'persona adicional',
    'extra',
    'supplement',
    'supplément',
    'supplementaire',
    'additional',
    'add',
    'person supplémentaire',
  ]
  
  // Check if title or eventCode contains extra person indicators
  const textToCheck = `${title} ${eventCode}`
  return extraPersonIndicators.some(indicator => textToCheck.includes(indicator))
}

/**
 * Get display price from tour (main price, not extra person)
 * Priority: highest price that is NOT an extra person option
 */
function getDisplayPrice(tour: FullTour): number | null {
  if (!tour.events || tour.events.length === 0) {
    // Fallback to basePrice
    if (tour.basePrice && tour.basePrice > 0) {
      return tour.basePrice
    }
    return null
  }
  
  // Collect all prices, excluding extra person options
  const mainPrices: number[] = []
  const allPrices: number[] = []
  
  for (const event of tour.events) {
    if (event.price?.adult && event.price.adult > 0) {
      allPrices.push(event.price.adult)
      
      // Exclude extra person options
      if (!isExtraPersonOption(event)) {
        mainPrices.push(event.price.adult)
      }
    }
  }
  
  // If we have main prices, return the highest (principal price)
  if (mainPrices.length > 0) {
    return Math.max(...mainPrices)
  }
  
  // Fallback: if all prices are marked as extra person, return the highest anyway
  // (shouldn't happen, but safety fallback)
  if (allPrices.length > 0) {
    return Math.max(...allPrices)
  }
  
  // Final fallback to basePrice
  if (tour.basePrice && tour.basePrice > 0) {
    return tour.basePrice
  }
  
  return null
}

/**
 * Get minimum price from tour (legacy function, kept for compatibility)
 * @deprecated Use getDisplayPrice instead for main price
 */
function getTourPrice(tour: FullTour): number | null {
  return getDisplayPrice(tour)
}

/**
 * Check if tour has pickup service (from events icons)
 */
function hasPickup(tour: FullTour): boolean {
  if (tour.events && Array.isArray(tour.events)) {
    return tour.events.some((event: any) =>
      Array.isArray(event.icons) && event.icons.some((icon: string) =>
        String(icon).toLowerCase().includes('free_bus') || 
        String(icon).toLowerCase().includes('pickup') ||
        String(icon).toLowerCase().includes('recogida')
      )
    )
  }
  return false
}

/**
 * Check if tour is reduced group (VIP tours typically are)
 */
function hasReducedGroup(tour: FullTour): boolean {
  // VIP tours are typically small groups - check slug first
  const slug = tour.slug || ''
  if (slug.includes('vip') || slug.includes('private')) {
    return true
  }
  
  // Check raw data for indicators
  if (tour.raw) {
    const raw = tour.raw as any
    // Check for indicators of small group in description or raw fields
    const text = [
      tour.description,
      tour.displayDescription,
      raw.description,
      raw.desc,
      raw.groupName,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return text.includes('grupo reducido') || 
           text.includes('small group') || 
           text.includes('maximum 8') ||
           text.includes('máximo 8') ||
           text.includes('private') ||
           text.includes('vip')
  }
  return false
}

/**
 * Get available days from events (simplified - shows days if available)
 */
function getAvailableDays(tour: FullTour): string[] | null {
  if (tour.events && tour.events.length > 0) {
    const daysSet = new Set<string>()
    for (const event of tour.events) {
      if (event.days && Array.isArray(event.days)) {
        event.days.forEach((day: string) => {
          if (typeof day === 'string' && day.trim()) {
            daysSet.add(day.trim().toLowerCase())
          }
        })
      }
    }
    if (daysSet.size > 0) {
      return Array.from(daysSet)
    }
  }
  return null
}

/**
 * Get next available date from events
 */
function getNextAvailableDate(tour: FullTour): string | null {
  for (const event of tour.events || []) {
    if (event.availability) {
      const avail = event.availability as any
      if (avail.nextAvailableDate && typeof avail.nextAvailableDate === 'string') {
        return avail.nextAvailableDate
      }
    }
  }
  return null
}

/**
 * VIP Tour Row Card Component
 */
export function VipTourRowCard({ tour, internalSlug }: { tour: FullTour; internalSlug?: string }) {
  // Check if this is Astronomic Tour VIP or Gomera VIP Tour for card overrides
  const isAstronomicTourVip = tour.slug === 'astronomic-tour-vip'
  const isGomeraVipTour = tour.slug === 'gomera-vip-tour'
  const cardConfig = isAstronomicTourVip 
    ? astronomicTourVipMedia.card 
    : isGomeraVipTour 
    ? gomeraVipTourMedia.card 
    : null

  // Use display fields (override takes priority)
  const title = tour.displayTitle ?? tour.titleOverride ?? tour.title
  // For description, use the same source as activity page: tour.description (full description)
  // Priority: displayDescription > description (same as activity page)
  const rawDescription = tour.displayDescription ?? tour.description
  // Clean the description: decode HTML entities, strip HTML tags, trim
  let cleanedDescription = cleanDescriptionText(rawDescription)
  
  // Truncate to ~160 chars for card snippet (2 lines max)
  if (cleanedDescription && cleanedDescription.length > 160) {
    // Find last space before 160 to avoid cutting words
    const truncated = cleanedDescription.substring(0, 160)
    const lastSpace = truncated.lastIndexOf(' ')
    const cutPoint = lastSpace > 120 ? lastSpace : 160 // Don't cut too early
    cleanedDescription = cleanedDescription.substring(0, cutPoint).trim() + '...'
  }
  
  // DEV: Log description source for Gomera VIP Tour (dev only)
  if (isGomeraVipTour && process.env.NODE_ENV !== 'production') {
    console.log('[GOMERA_CARD_DEBUG]', {
      slug: tour.slug,
      rawDescription: rawDescription?.substring(0, 100),
      cleanedDescription: cleanedDescription.substring(0, 100),
      hasEntities: rawDescription?.includes('&rsquo;') || rawDescription?.includes('&nbsp;'),
    })
  }
  
  // Image: Priority 1 = card config (Astronomic), Priority 2 = API images
  // Note: Local scanned images will be handled client-side via ClientImage component fallback
  const imageUrl = cardConfig?.coverImage ?? (tour.displayImage ?? tour.imageOverrideUrl ?? tour.image)
  
  // Price: use card config override if available, otherwise get display price (main price, not extra person)
  // For Gomera/Astronomic, use card config price if > 0, otherwise fallback to display price
  const price = cardConfig && cardConfig.fromPrice > 0 
    ? cardConfig.fromPrice 
    : getDisplayPrice(tour)
  
  const duration = formatDuration(tour.duration)
  const currency = tour.currency || 'EUR'
  const hasPickupService = hasPickup(tour)
  const hasReducedGroupSize = hasReducedGroup(tour)
  const availableDays = getAvailableDays(tour)
  const nextDate = getNextAvailableDate(tour)

  // Days strip labels (Spanish abbreviations)
  const dayLabels = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO']
  const dayFullNames = ['lunes', 'monday', 'martes', 'tuesday', 'miércoles', 'wednesday', 'miercoles', 
                        'jueves', 'thursday', 'viernes', 'friday', 'sábado', 'saturday', 'sabado', 
                        'domingo', 'sunday']

  // Map available days to day strip
  const activeDays = new Set<string>()
  if (availableDays) {
    availableDays.forEach((day: string) => {
      const dayLower = day.toLowerCase()
      if (dayLower.includes('monday') || dayLower.includes('lunes')) activeDays.add('LU')
      if (dayLower.includes('tuesday') || dayLower.includes('martes')) activeDays.add('MA')
      if (dayLower.includes('wednesday') || dayLower.includes('miércoles') || dayLower.includes('miercoles')) activeDays.add('MI')
      if (dayLower.includes('thursday') || dayLower.includes('jueves')) activeDays.add('JU')
      if (dayLower.includes('friday') || dayLower.includes('viernes')) activeDays.add('VI')
      if (dayLower.includes('saturday') || dayLower.includes('sábado') || dayLower.includes('sabado')) activeDays.add('SA')
      if (dayLower.includes('sunday') || dayLower.includes('domingo')) activeDays.add('DO')
    })
  }

  return (
    <div className="bg-white border border-glass-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      <div className={`flex flex-col md:flex-row md:items-stretch`}>
        {/* Left: Image - Full height for all VIP cards (same structure as Astronomic Tour VIP) */}
        <div className="md:w-64 md:flex-shrink-0 md:self-stretch">
          <div className="w-full h-full md:h-full">
            <ClientImage 
              src={imageUrl} 
              alt={title} 
              className="rounded-t-lg md:rounded-l-lg md:rounded-t-none h-full"
              fullHeight={true}
            />
          </div>
        </div>

        {/* Middle: Content */}
        <div className="flex-1 p-4 md:p-6 flex flex-col">
          {/* Title */}
          <h3 className="text-xl md:text-2xl font-semibold text-glass-900 mb-2">
            {title}
          </h3>

          {/* Short description */}
          {cleanedDescription && (
            <p className="text-sm text-glass-600 mb-4 line-clamp-2">
              {cleanedDescription}
            </p>
          )}

          {/* Info rows with icons */}
          <div className="flex flex-col gap-2 mb-4">
            {/* Use card config facts for Astronomic Tour VIP and Gomera VIP Tour, otherwise use dynamic detection */}
            {cardConfig ? (
              cardConfig.facts.map((fact, idx) => {
                // For duration fact, use API duration if available, otherwise use config value
                let displayValue = fact.value
                if (fact.label === 'Duration' && duration) {
                  displayValue = duration
                }
                return (
                  <div key={idx} className="flex items-center gap-2 text-sm text-glass-700">
                    <span className="text-ocean-600">{fact.icon}</span>
                    <span>{fact.label}: {displayValue}</span>
                  </div>
                )
              })
            ) : (
              <>
                {hasReducedGroupSize && (
                  <div className="flex items-center gap-2 text-sm text-glass-700">
                    <span className="text-ocean-600">👥</span>
                    <span>Grupo reducido</span>
                  </div>
                )}
                {hasPickupService && (
                  <div className="flex items-center gap-2 text-sm text-glass-700">
                    <span className="text-ocean-600">🚌</span>
                    <span>Servicio de recogida</span>
                  </div>
                )}
                {duration && (
                  <div className="flex items-center gap-2 text-sm text-glass-700">
                    <span className="text-ocean-600">⏱</span>
                    <span>Duración: {duration}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Days strip */}
          {(activeDays.size > 0 || nextDate) && (
            <div className="flex items-center gap-1 mb-4">
              {activeDays.size > 0 ? (
                <>
                  {dayLabels.map((day) => (
                    <span
                      key={day}
                      className={`text-xs px-2 py-1 rounded ${
                        activeDays.has(day)
                          ? 'bg-ocean-100 text-ocean-700 font-medium'
                          : 'bg-glass-100 text-glass-400'
                      }`}
                    >
                      {day}
                    </span>
                  ))}
                </>
              ) : nextDate ? (
                <span className="text-xs text-glass-500">
                  Próxima disponibilidad: {new Date(nextDate).toLocaleDateString('es-ES', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              ) : null}
            </div>
          )}

          {/* View button */}
          <div className="mt-auto pt-4">
            <Link
              href={`/activities/${internalSlug || tour.slug}`}
              className="inline-block px-4 py-2 bg-ocean-600 text-white text-sm font-medium rounded-lg hover:bg-ocean-700 transition-colors focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2"
            >
              Ver detalles
            </Link>
          </div>
        </div>

        {/* Right: Price */}
        <div className="md:w-48 md:flex-shrink-0 p-4 md:p-6 bg-glass-50 flex items-center justify-center md:border-l border-glass-200">
          <div className="text-center">
            {price !== null && price > 0 ? (
              <>
                <div className="text-sm text-glass-600 mb-1">
                  {cardConfig?.fromLabel ?? 'Desde'}
                </div>
                <div className="text-3xl font-bold text-ocean-600">
                  {formatPrice(price, currency)}
                </div>
              </>
            ) : (
              <div className="text-sm text-glass-500 font-medium">Price on request</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}



