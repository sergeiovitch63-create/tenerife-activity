/**
 * ThisWeekSection — server-rendered home hero row.
 *
 * Renders up to 3 ActivityCards selected by the contextual picker,
 * each with a short "why now" chip (calm morning, sunset tonight, orca
 * season, Teide peak, calima-safe indoor, etc.).
 *
 * The heavy lifting (picking + season logic) happens in
 * src/lib/home/contextual.ts; this component is a pure layout shell.
 */
import { ArrowRight, Sunset, Fish, Mountain, Sparkles, Waves, Sun } from 'lucide-react'
import LocaleLink from '@/components/LocaleLink'
import ActivityCard from '@/components/ActivityCard'
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
          <span className="chip-ember mb-2">{dict.badge}</span>
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
          return (
            <ActivityCard
              key={group.id}
              group={group}
              coverOverride={covers[group.code]}
              nextDate={nextDates[group.code] ?? null}
              contextLabel={label}
              contextIcon={Icon ? <Icon className="w-3 h-3" /> : null}
            />
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
