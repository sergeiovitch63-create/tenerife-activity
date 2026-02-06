/**
 * Helpers for building contact URLs (WhatsApp, Call) when automatic booking is not available
 */

const WHATSAPP_PHONE = '34692735125' // +34 692 735 125 (Mandry/Atlantico booking)

export interface WhatsAppParams {
  activityName: string
  eventId: string
  lang: string
  date?: string
  adults?: number
  childs?: number
  infants?: number
}

/**
 * Build WhatsApp URL with pre-filled message
 */
export function buildWhatsAppUrl(params: WhatsAppParams): string {
  const { activityName, eventId, lang, date, adults, childs, infants } = params

  // Build message
  const parts: string[] = []
  parts.push(`Hi! I want to book: ${activityName} (ID ${eventId}).`)
  parts.push(`Lang: ${lang}.`)
  
  if (date) {
    parts.push(`Date: ${date}.`)
  }
  
  const participantParts: string[] = []
  if (adults !== undefined && adults > 0) {
    participantParts.push(`Adults: ${adults}`)
  }
  if (childs !== undefined && childs > 0) {
    participantParts.push(`Children: ${childs}`)
  }
  if (infants !== undefined && infants > 0) {
    participantParts.push(`Infants: ${infants}`)
  }
  
  if (participantParts.length > 0) {
    parts.push(participantParts.join(', ') + '.')
  }
  
  parts.push('Can you confirm availability and price?')

  const message = parts.join(' ')
  const encodedMessage = encodeURIComponent(message)

  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodedMessage}`
}

/**
 * Build phone call URL
 */
export function buildCallUrl(): string {
  return 'tel:+34692735125'
}

