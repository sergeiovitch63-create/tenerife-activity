'use client'

import LocaleLink from './LocaleLink'

/**
 * Brand mark — simplified SVG interpretation of the Tenerife Activity logo.
 * Composition: a gold sun (with short rays) partially eclipsed by two
 * stacked turquoise waves — lighter on top, deep turquoise below.
 *
 * Colors are drawn from the logo directly, not from Tailwind tokens, so the
 * mark stays stable regardless of dark/light context.
 */
export default function Logo({ className = '' }: { className?: string }) {
  return (
    <LocaleLink
      href="/"
      className={`inline-flex items-center gap-2.5 ${className}`}
      aria-label="Tenerife Activity"
    >
      <svg width="36" height="36" viewBox="0 0 48 48" fill="none" aria-hidden>
        <defs>
          <linearGradient id="wave-top" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#46BCC4" />
            <stop offset="1" stopColor="#2A9BA2" />
          </linearGradient>
          <linearGradient id="wave-bot" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2A9BA2" />
            <stop offset="1" stopColor="#14424A" />
          </linearGradient>
          <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#F8CD52" />
            <stop offset="1" stopColor="#E5A91B" />
          </radialGradient>
        </defs>

        {/* Sun — behind the waves, top-right */}
        <circle cx="32" cy="16" r="5" fill="url(#sun)" />
        {/* Short rays */}
        <g stroke="#F4BE3D" strokeWidth="1.6" strokeLinecap="round">
          <line x1="32" y1="7" x2="32" y2="9.2" />
          <line x1="38.5" y1="9.5" x2="37" y2="11" />
          <line x1="41" y1="16" x2="38.8" y2="16" />
          <line x1="38.5" y1="22.5" x2="37" y2="21" />
          <line x1="25.5" y1="9.5" x2="27" y2="11" />
          <line x1="23" y1="16" x2="25.2" y2="16" />
        </g>

        {/* Wave — back layer (lighter turquoise) */}
        <path
          d="M6 27 C 14 21, 24 23, 32 27 C 38 30, 42 27, 44 25 L 44 36 C 38 32, 30 31, 22 33 C 14 35, 8 33, 6 32 Z"
          fill="url(#wave-top)"
        />

        {/* Wave — front layer (deep turquoise) */}
        <path
          d="M4 34 C 12 29, 22 29, 30 33 C 36 36, 40 34, 44 32 L 44 42 L 4 42 Z"
          fill="url(#wave-bot)"
        />
      </svg>
      <span className="font-display font-bold text-lg tracking-tight text-ink-900 leading-none">
        Tenerife<span className="text-brand-turquoise-600 font-semibold">.activity</span>
      </span>
    </LocaleLink>
  )
}
