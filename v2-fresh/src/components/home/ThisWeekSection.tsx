/**
 * ThisWeekSection — server-rendered home hero row.
 *
 * Renders up to 3 ActivityCards selected by the contextual picker,
 * each with a short "why now" chip (calm morning, sunset tonight, orca
 * season, Teide peak, calima-safe indoor, etc.).
 *
 * Each card is wrapped in a relative container so we can overlay an
 * `UrgencyBadge` (live sunset countdown / live-spot pulse) without
 * touching the reusable ActivityCard component. The urgency badge only
 * renders on picks where it makes sense — sunset reasons get a live
 * countdown, seasonal picks get a "live spot" pulse.
 *
 * The heavy lifting (picking + season logic) happens in
 * src/lib/home/contextual.ts; this component is a pure layout shell.
 */
import { ArrowRight, Sunset, Fish, Mountain, Sparkles, Waves, Sun } from 'lucide-react'
import LocaleLink from '@/components/LocaleLink'
import ActivityCard from '@/components/ActivityCard'
import { UrgencyBadge } from '@/components/home/UrgencyBadge'
import type { ContextualPick, ContextReasonKey } from '@/lib/home/contextual'
import type { Dict } from '@/i18n'

type Props = {
  picks: ContextualPick[]
  covers: Record<string, string>
  nextDates: Record<string, string | null>
  dict: Dict['home']['thisWeek']
  sectionTitle: string
  sectionSubtitle: string
  seeAllLabel: string
  seeAllHref: string
}

const ICON_MAP = {
  Sunset,
  Fish,
  Mountain,
  Sparkles,
  Waves,
  Sun,
} as const

const SUNSET_REASONS: ContextReasonKey[] = [
  'reason_sunset_tonight',
  'reason_sunset_tomorrow',
]

export function ThisWeekSection({
  picks,
  covers,
  nextDates,
  dict,
  sectionTitle,
  sectionSubtitle,
  seeAllLabel,
  seeAllHref,
}: Props) {
  if (picks.length === 0) return null

  return (
    <section className="container-x mt-20 md:mt-24">
      <div className="mb-6 md:mb-8 flex items-end justify-between gap-6">
        <div className="max-w-2xl">
          <span className="chip-gold mb-2">{dict.badge}</span>
          <h2 className="h-display text-3xl md:text-4xl">{sectionTitle}</h2>
          <p className="text-ink-500 mt-2">{sectionSubtitle}</p>
        </div>
        <LocaleLink
          href={seeAllHref}
          className="hidden md:inline-flex items-center gap-1 text-sm font-medium text-ink-700 link-underline whitespace-nowrap shrink-0 pb-2"
        >
          {seeAllLabel} <ArrowRight className="w-4 h-4" />
        </LocaleLink>
      </div>
      <div className="grid md:grid-cols-3 gap-5">
        {picks.map(({ group, reasonKey, iconName }) => {
          const Icon = iconName ? ICON_MAP[iconName] : null
          const label = dict.reasons[reasonKey as ContextReasonKey]
          const isSunset = SUNSET_REASONS.includes(reasonKey as ContextReasonKey)

          return (
            <div key={group.id} className="relative">
              {/* Urgency badge — floats above the cover, top-left.
                  Sunset picks get a live countdown; everything else
                  gets a gold-pulsing "live spot" pill. */}
              <div className="absolute top-3 left-3 z-10">
                <UrgencyBadge
                  variant={isSunset ? 'sunset' : 'live-spot'}
                  labelSunset={dict.urgency.sunsetTonight}
                  labelSunsetTomorrow={dict.urgency.sunsetTomorrow}
                  labelLiveSpot={dict.urgency.liveSpot}
                />
              </div>

              <ActivityCard
                group={group}
                coverOverride={covers[group.code]}
                nextDate={nextDates[group.code] ?? null}
                contextLabel={label}
                contextIcon={Icon ? <Icon className="w-3 h-3" /> : null}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-6 md:hidden">
        <LocaleLink
          href={seeAllHref}
          className="inline-flex items-center gap-1 text-sm font-medium text-ink-700 link-underline"
        >
          {seeAllLabel} <ArrowRight className="w-4 h-4" />
        </LocaleLink>
      </div>
    </section>
  )
}
