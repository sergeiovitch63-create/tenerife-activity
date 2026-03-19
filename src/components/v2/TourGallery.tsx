'use client'

import { useMemo, useState } from 'react'
import { toImageUrl } from '@/lib/atlantico'

type TourGalleryProps = {
  images: string[]
  name: string
}

export default function TourGallery({ images, name }: TourGalleryProps) {
  const fallback =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'><rect width='100%' height='100%' fill='%23e5e7eb'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='60'>🏝️</text></svg>"
  const [active, setActive] = useState<number | null>(null)
  const normalized = useMemo(
    () => images.map((image) => toImageUrl(image)).filter(Boolean),
    [images]
  )

  if (normalized.length === 0) {
    return (
      <div className="flex h-[360px] w-full items-center justify-center rounded-2xl border border-glass-200 bg-white/80 text-6xl shadow-lg">
        <span aria-hidden>🏝️</span>
      </div>
    )
  }

  if (normalized.length === 1) {
    return (
      <>
        <button
          type="button"
          onClick={() => setActive(0)}
          className="relative block h-[420px] w-full overflow-hidden rounded-2xl border border-glass-200 bg-white/90 shadow-lg"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={normalized[0]}
            alt={name}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.src = fallback
            }}
          />
        </button>
        {active !== null && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
            onClick={() => setActive(null)}
            role="button"
            tabIndex={0}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={normalized[active]}
              alt={name}
              className="max-h-[92vh] max-w-[92vw] rounded-2xl object-contain"
              onError={(e) => {
                e.currentTarget.src = fallback
              }}
            />
          </div>
        )}
      </>
    )
  }

  const thumbs = normalized.slice(1, 5)

  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <button
          type="button"
          className="relative col-span-1 h-[380px] overflow-hidden rounded-2xl border border-glass-200 bg-white/90 shadow-lg md:col-span-2"
          onClick={() => setActive(0)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={normalized[0]}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
            onError={(e) => {
              e.currentTarget.src = fallback
            }}
          />
        </button>
        <div className="grid grid-cols-2 gap-3">
          {thumbs.map((src, idx) => (
            <button
              key={`${src}-${idx}`}
              type="button"
              onClick={() => setActive(idx + 1)}
              className="relative h-[183px] overflow-hidden rounded-2xl border border-glass-200 bg-white/90 shadow-md"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${name} ${idx + 2}`}
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                onError={(e) => {
                  e.currentTarget.src = fallback
                }}
              />
            </button>
          ))}
        </div>
      </div>

      {active !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setActive(null)}
          role="button"
          tabIndex={0}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={normalized[active]}
            alt={name}
            className="max-h-[92vh] max-w-[92vw] rounded-2xl object-contain"
            onError={(e) => {
              e.currentTarget.src = fallback
            }}
          />
        </div>
      )}
    </>
  )
}

