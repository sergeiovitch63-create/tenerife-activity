export function formatDurationLabel(duration: string | number | null | undefined): string {
  if (duration == null) return ''

  const raw = String(duration).trim()
  if (!raw) return ''

  // Normalize spacing and decimal comma.
  const s = raw.toLowerCase().replace(',', '.').replace(/\s+/g, ' ').trim()

  // "30m", "30 m", "30 min", "30 minutes", and malformed "30m h"/"30 m h"
  const minuteOnlyMatch = s.match(/^(\d{1,3})\s*(m|min|mins|minute|minutes)\s*h?$/i)
  if (minuteOnlyMatch) {
    return `${parseInt(minuteOnlyMatch[1], 10)} min`
  }

  // "3.30h" means 3h30 (common time notation), not decimal hours.
  const hhDotMmMatch = s.match(/^(\d{1,2})\.(\d{1,2})\s*(h|hr|hrs|hour|hours)$/i)
  if (hhDotMmMatch) {
    const hours = parseInt(hhDotMmMatch[1], 10)
    const minutes = parseInt(hhDotMmMatch[2], 10)
    if (minutes > 0 && minutes < 60) return `${hours}h${String(minutes).padStart(2, '0')}`
    return `${hours}h`
  }

  // "3h", "3 h", "3.5h", "2 hours"
  const hourMatch = s.match(/^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)$/i)
  if (hourMatch) {
    const value = parseFloat(hourMatch[1])
    if (!Number.isFinite(value) || value <= 0) return ''
    const hours = Math.floor(value)
    const minutes = Math.round((value - hours) * 60)
    if (minutes === 0) return `${hours}h`
    if (hours === 0) return `${minutes} min`
    return `${hours}h${String(minutes).padStart(2, '0')}`
  }

  // Numeric-only fallback: assume hours.
  const numeric = Number(s)
  if (Number.isFinite(numeric) && numeric > 0) {
    const hours = Math.floor(numeric)
    const minutes = Math.round((numeric - hours) * 60)
    if (minutes === 0) return `${hours}h`
    if (hours === 0) return `${minutes} min`
    return `${hours}h${String(minutes).padStart(2, '0')}`
  }

  // Preserve ranges or already-formatted labels.
  return raw
}
