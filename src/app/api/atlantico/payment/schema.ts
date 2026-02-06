/**
 * Payment Request Schema
 * 
 * Type definitions and validation helpers for payment requests
 * Note: Using manual validation instead of Zod (not installed)
 */

/**
 * Payment request type
 */
export interface PriceSnapshot {
  adult: number
  child: number
  infant: number
  total: number
}

export interface PaymentRequest {
  // Cart item (required fields)
  t_group: string
  t_id: string
  language: string
  tourDate: string | null // YYYY-MM-DD or null for calendarMode === 'none'
  sesTime: string | null // HH:mm or null for calendarMode === 'none'
  adults: number
  childs?: number
  infants?: number
  currency: string
  // Price snapshot (for revalidation comparison)
  originalPriceSnapshot?: PriceSnapshot
  // Customer (required)
  name: string
  email: string
  phone: string
  // Optional fields
  hotel?: string
  room?: string
  mpoint?: string
  mtime?: string
  notes?: string
}

/**
 * Validation errors
 */
export interface ValidationError {
  field: string
  message: string
}

/**
 * Validate payment request manually
 */
export function validatePaymentRequest(data: any): { valid: boolean; errors?: ValidationError[] } {
  const errors: ValidationError[] = []

  // Required fields
  if (!data.t_group || typeof data.t_group !== 'string' || data.t_group.trim() === '') {
    errors.push({ field: 't_group', message: 't_group is required' })
  }
  if (!data.t_id || typeof data.t_id !== 'string' || data.t_id.trim() === '') {
    errors.push({ field: 't_id', message: 't_id is required' })
  }
  if (!data.language || typeof data.language !== 'string' || data.language.trim() === '') {
    errors.push({ field: 'language', message: 'language is required' })
  }
  // tourDate can be null for calendarMode === 'none' (on-request booking)
  if (data.tourDate !== null && (!data.tourDate || !/^\d{4}-\d{2}-\d{2}$/.test(data.tourDate))) {
    errors.push({ field: 'tourDate', message: 'tourDate must be YYYY-MM-DD or null' })
  }
  // sesTime can be null for calendarMode === 'none' (on-request booking)
  if (data.sesTime !== null && data.sesTime && !/^\d{2}:\d{2}$/.test(data.sesTime)) {
    errors.push({ field: 'sesTime', message: 'sesTime must be HH:mm format or null' })
  }
  if (typeof data.adults !== 'number' || data.adults < 1) {
    errors.push({ field: 'adults', message: 'adults must be >= 1' })
  }
  if (data.childs !== undefined && (typeof data.childs !== 'number' || data.childs < 0)) {
    errors.push({ field: 'childs', message: 'childs must be >= 0' })
  }
  if (data.infants !== undefined && (typeof data.infants !== 'number' || data.infants < 0)) {
    errors.push({ field: 'infants', message: 'infants must be >= 0' })
  }
  if (!data.currency || typeof data.currency !== 'string' || data.currency.trim() === '') {
    errors.push({ field: 'currency', message: 'currency is required' })
  }
  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.push({ field: 'name', message: 'name is required' })
  }
  if (!data.email || typeof data.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push({ field: 'email', message: 'email must be valid' })
  }
  if (!data.phone || typeof data.phone !== 'string' || data.phone.trim() === '') {
    errors.push({ field: 'phone', message: 'phone is required' })
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  }
}

