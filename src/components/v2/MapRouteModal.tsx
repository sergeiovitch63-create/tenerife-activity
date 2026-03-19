'use client'

import { useState } from 'react'

type MapRouteModalProps = {
  route: string
}

export default function MapRouteModal({ route }: MapRouteModalProps) {
  const [open, setOpen] = useState(false)
  const href = /^https?:\/\//i.test(route)
    ? route
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(route)}`

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-glass-200 bg-white/80 px-4 py-2 text-sm font-medium text-ocean-700 transition hover:bg-ocean-50"
      >
        Voir la carte
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          role="button"
          tabIndex={0}
          onClick={() => setOpen(false)}
        >
          <div className="w-full max-w-3xl rounded-2xl bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-lg font-semibold text-glass-900">Google Maps</h4>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-glass-200 px-2 py-1 text-sm">
                Fermer
              </button>
            </div>
            <iframe
              title="Google Maps"
              src={`https://www.google.com/maps?q=${encodeURIComponent(route)}&output=embed`}
              className="h-[420px] w-full rounded-xl border border-glass-200"
              loading="lazy"
            />
            <a href={href} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-medium text-ocean-700 underline">
              Ouvrir dans Google Maps
            </a>
          </div>
        </div>
      )}
    </>
  )
}

