/**
 * Option Card Component
 * 
 * Displays an event option card with title, planning, icons, route, and product type.
 * Similar style to Astronomic Tour VIP options.
 */

'use client'

interface OptionCardProps {
  eventId: string
  event: {
    name?: string
    days?: string[] | number[]
    times?: string[]
    icons?: Array<{ label?: string; text?: string; icon?: string }>
    route?: string | { url?: string; iframe?: string; coordinates?: string }
    pProd?: string | number
    [key: string]: any // Allow additional fields
  }
  isLoading?: boolean
  error?: string | null
  isSelected?: boolean
  onSelect?: (eventId: string) => void
}

export function OptionCard({
  eventId,
  event,
  isLoading = false,
  error = null,
  isSelected = false,
  onSelect,
}: OptionCardProps) {
  // Format planning (days + times)
  const formatPlanning = (): string | null => {
    if (!event.days && !event.times) {
      return null
    }

    const days = Array.isArray(event.days) ? event.days : []
    const times = Array.isArray(event.times) ? event.times : []

    const dayLabels: Record<string, string> = {
      '1': 'Mon',
      '2': 'Tue',
      '3': 'Wed',
      '4': 'Thu',
      '5': 'Fri',
      '6': 'Sat',
      '7': 'Sun',
      'monday': 'Mon',
      'tuesday': 'Tue',
      'wednesday': 'Wed',
      'thursday': 'Thu',
      'friday': 'Fri',
      'saturday': 'Sat',
      'sunday': 'Sun',
    }

    const formattedDays = days
      .map((day) => {
        const dayStr = String(day).toLowerCase()
        return dayLabels[dayStr] || dayStr
      })
      .filter(Boolean)
      .join(', ')

    const formattedTimes = times.filter(Boolean).join(', ')

    if (formattedDays && formattedTimes) {
      return `${formattedDays} at ${formattedTimes}`
    } else if (formattedDays) {
      return formattedDays
    } else if (formattedTimes) {
      return formattedTimes
    }

    return null
  }

  const planning = formatPlanning()
  const title = event.name || `Event ${eventId}`

  // Check if route is available
  const hasRoute = event.route && (
    (typeof event.route === 'string' && event.route.trim()) ||
    (typeof event.route === 'object' && (event.route.url || event.route.iframe || event.route.coordinates))
  )

  if (isLoading) {
    return (
      <div className="bg-white border border-glass-200 rounded-lg p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-glass-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-glass-100 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-glass-100 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white border border-red-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-glass-900 mb-2">Unavailable</h3>
            <p className="text-sm text-glass-600">Event ID: {eventId}</p>
            {error && (
              <p className="text-xs text-red-600 mt-2">{error}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelect?.(eventId)}
      className={`text-left bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow w-full ${
        isSelected ? 'border-ocean-600 ring-2 ring-ocean-200' : 'border-glass-200'
      }`}
    >
      {/* Title */}
      <h3 className="text-lg font-semibold text-glass-900 mb-4">{title}</h3>

      {/* Planning */}
      {planning && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm text-glass-700">
            <span>📅</span>
            <span>{planning}</span>
          </div>
        </div>
      )}

      {/* Icons/Labels */}
      {event.icons && Array.isArray(event.icons) && event.icons.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {event.icons.map((icon, idx) => {
            const label = icon.label || icon.text || icon.icon || ''
            if (!label) return null
            return (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-1 bg-glass-50 border border-glass-200 rounded text-xs text-glass-700"
              >
                {icon.icon && <span>{icon.icon}</span>}
                <span>{label}</span>
              </span>
            )
          })}
        </div>
      )}

      {/* Route/Map */}
      {hasRoute && (
        <div className="mb-4">
          {typeof event.route === 'string' ? (
            <a
              href={event.route}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 bg-ocean-50 text-ocean-700 text-sm font-medium rounded hover:bg-ocean-100 transition-colors"
            >
              <span>🗺️</span>
              <span>View route</span>
            </a>
          ) : typeof event.route === 'object' ? (
            <div className="space-y-2">
              {event.route.url && (
                <a
                  href={event.route.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-ocean-50 text-ocean-700 text-sm font-medium rounded hover:bg-ocean-100 transition-colors"
                >
                  <span>🗺️</span>
                  <span>View route</span>
                </a>
              )}
              {event.route.iframe && (
                <div className="mt-2">
                  <iframe
                    src={event.route.iframe}
                    className="w-full h-48 border border-glass-200 rounded"
                    title="Route map"
                  />
                </div>
              )}
              {event.route.coordinates && !event.route.url && !event.route.iframe && (
                <div className="text-xs text-glass-600">
                  Coordinates: {event.route.coordinates}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Product Type / Price (debug-friendly) */}
      {event.pProd && (
        <div className="mt-4 pt-4 border-t border-glass-100">
          <div className="text-xs text-glass-500">
            <span className="font-medium">Product Type:</span> {String(event.pProd)}
          </div>
        </div>
      )}

      {/* Debug: Event ID (DEV only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 pt-2 border-t border-glass-100">
          <div className="text-xs text-glass-400 font-mono">
            ID: {eventId}
          </div>
        </div>
      )}
    </button>
  )
}

