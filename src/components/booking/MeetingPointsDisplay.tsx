/**
 * Meeting Points Display Component
 * 
 * Displays meeting points from Atlantico API in a user-friendly format
 */

import type { MeetingPoint } from '@/app/api/atlantico/event-details/route'

interface MeetingPointsDisplayProps {
  meetingPoints: MeetingPoint[]
  className?: string
  showTitle?: boolean
  title?: string
}

/**
 * Format a meeting point for display
 */
function formatMeetingPoint(point: MeetingPoint): string {
  if (typeof point === 'string') {
    return point
  }
  
  // Build display string from object fields
  const parts: string[] = []
  
  if (point.name) {
    parts.push(point.name)
  }
  
  if (point.address) {
    parts.push(point.address)
  }
  
  if (point.description) {
    parts.push(point.description)
  }
  
  if (point.time) {
    parts.push(`Time: ${point.time}`)
  }
  
  // If we have parts, join them; otherwise try to stringify
  if (parts.length > 0) {
    return parts.join(' - ')
  }
  
  // Fallback: try to extract any string field
  for (const [key, value] of Object.entries(point)) {
    if (typeof value === 'string' && value.trim()) {
      return value
    }
  }
  
  return 'Meeting point'
}

/**
 * Get meeting point name (for selection)
 */
export function getMeetingPointName(point: MeetingPoint): string {
  if (typeof point === 'string') {
    return point
  }
  return point.name || point.address || point.description || 'Meeting point'
}

/**
 * Get meeting point full description
 */
export function getMeetingPointDescription(point: MeetingPoint): string | undefined {
  if (typeof point === 'string') {
    return undefined
  }
  return point.description || point.address
}

export function MeetingPointsDisplay({
  meetingPoints,
  className = '',
  showTitle = true,
  title = 'Meeting Points',
}: MeetingPointsDisplayProps) {
  if (!meetingPoints || meetingPoints.length === 0) {
    return null
  }

  return (
    <div className={className}>
      {showTitle && (
        <h3 className="font-medium text-glass-900 mb-3">{title}</h3>
      )}
      <ul className="space-y-2">
        {meetingPoints.map((point, idx) => {
          const displayText = formatMeetingPoint(point)
          const name = getMeetingPointName(point)
          const description = getMeetingPointDescription(point)
          const isObject = typeof point === 'object' && point !== null

          return (
            <li key={idx} className="flex flex-col gap-1">
              <div className="flex items-start gap-2">
                <span className="text-ocean-600 mt-1">📍</span>
                <div className="flex-1">
                  <div className="font-medium text-glass-900">
                    {name}
                  </div>
                  {description && description !== name && (
                    <div className="text-sm text-glass-600 mt-1">
                      {description}
                    </div>
                  )}
                  {isObject && 'time' in point && point.time && (
                    <div className="text-sm text-glass-500 mt-1">
                      ⏰ {point.time}
                    </div>
                  )}
                  {isObject && 'address' in point && point.address && point.address !== name && (
                    <div className="text-sm text-glass-500 mt-1">
                      📍 {point.address}
                    </div>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

