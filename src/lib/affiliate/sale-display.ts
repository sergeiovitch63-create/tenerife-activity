/**
 * Derives a human-readable "display state" for an affiliate_sales row from
 * its raw DB status + activity_date + the current time.
 *
 * The raw statuses (pending / confirmed / cancelled / paid) stay the same in DB —
 * they represent admin workflow steps. What the UI shows is a richer story
 * built on top of them, because partners care about:
 *   1. Has the activity already taken place?
 *   2. When will I get paid?
 *
 * Payments are batched at month-end: a sale whose activity date falls in
 * April is expected to be paid "fin avril".
 *
 * Two flavours:
 *   - getAffiliateDisplayState: for what the partner sees on /affiliate/*
 *   - getAdminDisplayState:      for what the admin sees on /back-office/*
 *
 * Both are pure functions — no DB, no I/O.
 */

import type { SaleStatus } from '@/lib/back-office/affiliates'

export interface SaleLike {
  status: SaleStatus
  activity_date: string | null
  paid_at?: string | null
  created_at?: string
}

export type DisplayTone = 'amber' | 'green' | 'blue' | 'ocean' | 'red' | 'gray'

export interface DisplayState {
  code:
    | 'pending'
    | 'upcoming'
    | 'completed'
    | 'to_pay'
    | 'paid'
    | 'cancelled'
    | 'confirmed_no_date'
  label: string
  icon: string
  hint?: string
  tone: DisplayTone
  /** Admin only — indicates that admin action is required for this row. */
  actionRequired?: boolean
}

const FR_MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
]

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function formatShortDate(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`
}

export function formatMonthEnd(d: Date): string {
  return `fin ${FR_MONTHS[d.getMonth()]}`
}

export function parseActivityDate(raw: string | Date | null | undefined): Date | null {
  if (!raw) return null
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw
  // Accept ISO (2026-04-27) or YYYYMMDD
  const s = String(raw).trim()
  if (/^\d{8}$/.test(s)) {
    const y = Number(s.slice(0, 4))
    const m = Number(s.slice(4, 6))
    const d = Number(s.slice(6, 8))
    return new Date(y, m - 1, d)
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

/** True if activityDate strictly BEFORE today's midnight (activity is in the past). */
export function isActivityPast(activityDate: Date, now: Date = new Date()): boolean {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const act = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate())
  return act < today
}

// ---------------------------------------------------------------------------
//  Affiliate-facing (partner sees this)
// ---------------------------------------------------------------------------

export function getAffiliateDisplayState(sale: SaleLike, now: Date = new Date()): DisplayState {
  if (sale.status === 'cancelled') {
    return {
      code: 'cancelled',
      label: 'Annulée',
      icon: '❌',
      hint: "La réservation a été annulée — pas de commission sur celle-ci.",
      tone: 'red',
    }
  }
  if (sale.status === 'paid') {
    const paid = sale.paid_at ? new Date(sale.paid_at) : null
    return {
      code: 'paid',
      label: 'Versée',
      icon: '💰',
      hint: paid && !isNaN(paid.getTime())
        ? `Commission reçue le ${formatShortDate(paid)}`
        : 'Commission reçue sur ton compte.',
      tone: 'ocean',
    }
  }

  const activity = parseActivityDate(sale.activity_date)
  if (!activity) {
    // Legacy rows with no activity_date → fallback on raw status
    return {
      code: 'pending',
      label: 'En cours de validation',
      icon: '🕓',
      hint: 'Paiement reçu, en attente de confirmation.',
      tone: 'amber',
    }
  }

  if (isActivityPast(activity, now)) {
    return {
      code: 'completed',
      label: `Effectuée · versement ${formatMonthEnd(activity)}`,
      icon: '✨',
      hint: `Activité réalisée le ${formatShortDate(activity)}. Commission acquise, versée lors du payout mensuel.`,
      tone: 'green',
    }
  }

  // Activity is today or in future
  return {
    code: 'upcoming',
    label: `Réservée · activité le ${formatShortDate(activity)}`,
    icon: '📅',
    hint: `Versement ${formatMonthEnd(activity)} si l'activité a bien lieu.`,
    tone: 'blue',
  }
}

// ---------------------------------------------------------------------------
//  Admin-facing (you see this in back-office)
// ---------------------------------------------------------------------------

export function getAdminDisplayState(sale: SaleLike, now: Date = new Date()): DisplayState {
  if (sale.status === 'cancelled') {
    return { code: 'cancelled', label: 'Annulée', icon: '❌', tone: 'red' }
  }
  if (sale.status === 'paid') {
    return { code: 'paid', label: 'Payée', icon: '💰', tone: 'ocean' }
  }
  if (sale.status === 'pending') {
    return {
      code: 'pending',
      label: 'À confirmer',
      icon: '🕓',
      hint: 'Vérifier dans Atlantico puis valider.',
      tone: 'amber',
      actionRequired: true,
    }
  }

  // status === 'confirmed'
  const activity = parseActivityDate(sale.activity_date)
  if (!activity) {
    return {
      code: 'confirmed_no_date',
      label: 'Confirmée',
      icon: '✓',
      tone: 'green',
    }
  }
  if (isActivityPast(activity, now)) {
    return {
      code: 'to_pay',
      label: `À payer · activité faite le ${formatShortDate(activity)}`,
      icon: '⏰',
      hint: `Commission due — à virer au payout ${formatMonthEnd(activity)}.`,
      tone: 'blue',
      actionRequired: true,
    }
  }
  return {
    code: 'upcoming',
    label: `Réservée · ${formatShortDate(activity)}`,
    icon: '📅',
    hint: `Activité prévue — versement ${formatMonthEnd(activity)}.`,
    tone: 'green',
  }
}

// ---------------------------------------------------------------------------
//  Tone → Tailwind badge classes
// ---------------------------------------------------------------------------

export const TONE_BADGE_CLASS: Record<DisplayTone, string> = {
  amber: 'bg-amber-100 text-amber-800',
  green: 'bg-green-100 text-green-800',
  blue: 'bg-sky-100 text-sky-800',
  ocean: 'bg-ocean-100 text-ocean-900',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-glass-100 text-glass-700',
}
