/**
 * RegionsSection — "Coins de Tenerife".
 *
 * 6 editorial cards for the key parts of the island (Nord vert, Sud
 * ensoleillé, Côte Ouest, Teide, Anaga, Mer). Each card deep-links the
 * listing page with a region-biased keyword query — the listing's
 * `applyFilters` already filters on `q`, so no new data plumbing is
 * required.
 *
 * Photos reuse the already-ported category PNGs (adventure-nature →
 * Nord vert, cable-car → Teide, etc.) — keeps the disk lean while the
 * editorial story reads distinct. When we have dedicated landscape
 * photography we swap the `image` values without touching logic.
 */
import Image from 'next/image'
import LocaleLink from '@/components/LocaleLink'
import { ArrowUpRight, Trees, Sun, Mountain, Waves, Cloud, Compass, type LucideIcon } from 'lucide-react'
import type { Dict } from '@/i18n'

type Props = {
  dict: Dict['home']['regions']
}

type RegionId = 'nord' | 'sud' | 'ouest' | 'teide' | 'anaga' | 'mer'

const REGIONS: Record<
  RegionId,
  { image: string; Icon: LucideIcon; href: string }
> = {
  nord:  { image: 'adventure-nature.png',       Icon: Trees,    href: '/activites?q=nord' },
  sud:   { image: 'vibe-theme-parks.png',       Icon: Sun,      href: '/activites?q=adeje' },
  ouest: { image: 'diving-fishing.png',         Icon: Compass,  href: '/activites?q=gigantes' },
  teide: { image: 'cable-car-observatory.png',  Icon: Mountain, href: '/activites?q=teide' },
  anaga: { image: 'shows-entertainment.png',    Icon: Cloud,    href: '/activites?q=anaga' },
  mer:   { image: 'boat-trips-cruises.png',     Icon: Waves,    href: '/activites?q=boat' },
}

const ORDER: RegionId[] = ['nord', 'sud', 'ouest', 'teide', 'anaga', 'mer']

export function RegionsSection({ dict }: Props) {
  return (
    <section className="container-x mt-20 md:mt-24">
      <div className="mb-6 md:mb-8 max-w-2xl">
        <span className="chip-turquoise mb-2">{dict.badge}</span>
        <h2 className="h-display text-3xl md:text-4xl">{dict.title}</h2>
        <p className="text-ink-500 mt-2">{dict.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {ORDER.map((id) => {
          const card = dict.cards[id]
          const { image, Icon, href } = REGIONS[id]
          return (
            <LocaleLink
              key={id}
              href={href}
              className="group relative overflow-hidden rounded-2xl aspect-[5/4] shadow-soft hover:shadow-card transition-all duration-300"
              aria-label={card.title}
            >
              <Image
                src={`/images/categories/${image}`}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />

              {/* Turquoise-toward-gold gradient overlay — different from
                  category cards (neutral) so regions read as a distinct
                  editorial block. */}
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(20,66,74,0.75) 0%, rgba(20,66,74,0.25) 45%, rgba(244,190,61,0.15) 100%)',
                }}
              />

              {/* Gold halo — hover */}
              <div
                aria-hidden
                className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-500"
                style={{ background: 'radial-gradient(circle, #F4BE3D 0%, transparent 70%)' }}
              />

              <div className="absolute inset-0 p-4 md:p-5 flex flex-col justify-between text-white">
                <div className="flex items-start justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/25 backdrop-blur-sm px-2.5 py-1 text-[11px] font-semibold">
                    <Icon className="w-3 h-3 text-brand-gold-300" />
                    {card.tag}
                  </span>
                  <span className="w-9 h-9 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm inline-flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ArrowUpRight className="w-4 h-4 text-white" />
                  </span>
                </div>

                <div>
                  <h3 className="font-display font-bold text-xl md:text-2xl leading-tight drop-shadow-sm">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-xs md:text-sm text-white/85 line-clamp-2">
                    {card.body}
                  </p>
                </div>
              </div>
            </LocaleLink>
          )
        })}
      </div>
    </section>
  )
}
