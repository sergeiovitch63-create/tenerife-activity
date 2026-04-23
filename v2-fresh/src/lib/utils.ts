import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { localeIntl, type Locale } from './locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(value: number, locale: Locale = 'fr'): string {
  return new Intl.NumberFormat(localeIntl(locale), {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(d: Date | string, locale: Locale = 'fr'): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return new Intl.DateTimeFormat(localeIntl(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function uniqueId(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}
