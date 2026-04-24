'use client'

import LocaleLink from './LocaleLink'

export default function Logo({ className = '' }: { className?: string }) {
  return (
    <LocaleLink href="/" className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="32" height="32" viewBox="0 0 40 40" fill="none" aria-hidden>
        <defs>
          <linearGradient id="lgcyan" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#06B6D4" />
            <stop offset="1" stopColor="#0E7490" />
          </linearGradient>
          <linearGradient id="lgorange" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F97316" />
            <stop offset="1" stopColor="#C2410C" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="40" height="40" rx="10" fill="url(#lgcyan)" />
        <path d="M20 8 L32 28 H8 Z" fill="url(#lgorange)" opacity="0.95" />
        <circle cx="28" cy="11" r="2.5" fill="#FDE68A" />
      </svg>
      <span className="font-display font-bold text-lg tracking-tight">
        Tenerife<span className="text-ocean-600">.activity</span>
      </span>
    </LocaleLink>
  )
}
