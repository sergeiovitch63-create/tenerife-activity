'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react'

export default function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [open, setOpen] = useState(false)
  const [idx, setIdx] = useState(0)

  const next = () => setIdx((i) => (i + 1) % images.length)
  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length)

  return (
    <>
      <div className="grid grid-cols-4 gap-2 rounded-3xl overflow-hidden relative aspect-[16/9] md:aspect-[2/1]">
        <button
          onClick={() => {
            setIdx(0)
            setOpen(true)
          }}
          className="col-span-4 md:col-span-2 md:row-span-2 relative group"
        >
          <img src={images[0]} alt={alt} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700" />
        </button>
        {images.slice(1, 5).map((src, i) => (
          <button
            key={i}
            onClick={() => {
              setIdx(i + 1)
              setOpen(true)
            }}
            className="hidden md:block relative group aspect-square"
          >
            <img src={src} alt={`${alt} ${i + 2}`} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700" />
            {i === 3 && (
              <div className="absolute inset-0 bg-ink-900/40 text-white text-sm font-semibold flex items-center justify-center gap-1">
                <Maximize2 className="w-4 h-4" /> Voir plus
              </div>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-ink-950/95 flex items-center justify-center p-4"
            onClick={() => setOpen(false)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
              }}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                prev()
              }}
              className="absolute left-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
              aria-label="Précédent"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                next()
              }}
              className="absolute right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
              aria-label="Suivant"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <img
              src={images[idx]}
              alt={alt}
              className="max-h-[90vh] max-w-[95vw] object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
              {idx + 1} / {images.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
