/**
 * PacksSection — curated bundles landing row.
 *
 * Four large, editorial-style cards that route to the generic listing
 * page with a preset query (the real pack catalog lives in Atlantico
 * for now; we treat these as deep-links into filtered views while the
 * bundle SKUs are being wired).
 *
 * Photos are the v1 `activity-packs` set ported to
 * `/public/images/packs/`. Brand accent is gold on a dark overlay so
 * the section reads as "premium / multi-activity" without the cards
 * mimicking a regular activity tile.
 */
import Image from 'next/image'
import LocaleLink from '@/components/LocaleLink'
import { ArrowRight, Sparkles, Ticket, Flame, Crown } from 'lucide-react'
import type { Dict } from '@/i18n'

type Props = {
  dict: Dict['home']['packs']
  seeAllLabel: string
}

type PackId = 'twin' | 'twoParks' | 'booster' | 'special'

const PACKS: Array<{
  id: PackId
  image: string
  icon: typeof Sparkles
  href: string
}> = [
  { id: 'twin',     image: 'twin-ticket.png',      icon: Ticket,    href: '/activites?q=twin' },
  { id: 'twoParks', image: 'two-parks-ticket.png', icon: Sparkles,  href: '/activites?q=park' },
  { id: 'booster',  image: 'booster-packs.png',    icon: Flame,     href: '/activites?q=pack' },
  { id: 'special',  image: 'special-packs.png',    icon: Crown,     href: '/activites?q=special' },
]

export function PacksSection({ dict, seeAllLabel }: Props) {
  return (
    <section className="container-x mt-20 md:mt-24">
      <div className="mb-6 md:mb-8 flex items-end justify-between gap-6">
        <div className="max-w-2xl">
          <span className="chip-gold mb-2">{dict.badge}</span>
          <h2 className="h-display text-3xl md:text-4xl">{dict.title}</h2>
          <p className="text-ink-500 mt-2">{dict.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PACKS.map(({ id, image, icon: Icon, href }) => {
          const card = dict.cards[id]
          return (
            <LocaleLink
              key={id}
              href={href}
              className="group relative overflow-hidden rounded-2xl aspect-[3/4] shadow-soft hover:shadow-card transition-all duration-300"
              aria-label={card.title}
            >
              <Image
                src={`/images/packs/${image}`}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />

              {/* Dark gradient for legibility */}
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.30) 55%, transparent 100%)',
                }}
              />

              {/* Gold halo on hover */}
              <div
                aria-hidden
                className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500"
                style={{ background: 'radial-gradient(circle, #F4BE3D 0%, transparent 70%)' }}
              />

              {/* Save badge — top-left */}
              {card.save && (
                <div className="absolute top-4 left-4">
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-gold-500 text-ink-900 px-2.5 py-1 text-[11px] font-bold shadow-sm">
                    {card.save}
                  </span>
                </div>
              )}

              {/* Icon chip — top-right */}
              <div className="absolute top-4 right-4">
                <div className="w-10 h-10 rounded-full bg-white/15 border border-white/25 backdrop-blur-sm flex items-center justify-center">
                  <Icon className="w-4 h-4 text-brand-gold-400" strokeWidth={2} />
                </div>
              </div>

              {/* Title / body / cta — bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <h3 className="font-display font-bold text-lg md:text-xl leading-tight drop-shadow-sm">
                  {card.title}
                </h3>
                <p className="mt-1 text-xs md:text-sm text-white/85 line-clamp-2">
                  {card.body}
                </p>
                <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-gold-300">
                  {seeAllLabel} <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </LocaleLink>
          )
        })}
      </div>
    </section>
  )
}
