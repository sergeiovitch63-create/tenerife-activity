/**
 * Next-Available card — sidebar slot availability summary.
 *
 * Shows the earliest bookable slot and, for scarce schedules, hints that
 * this is a "rare window" experience. Scoring + schedule walking lives
 * in `src/lib/personalize/scorers/next-available.ts` so the date math
 * happens on the server (no hydration mismatch).
 */

import { CalendarCheck2, Clock, Flame } from 'lucide-react'
import type { ModuleScore, ActivitySignals } from '@/lib/personalize/types'
import type { NextAvailableProps } from '@/lib/personalize/scorers/next-available'

type Props = {
  signals: ActivitySignals
  score: ModuleScore
  locale: string
}

const MONTHS: Record<string, string[]> = {
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.'],
  de: ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'],
  it: ['gen.', 'feb.', 'mar.', 'apr.', 'mag.', 'giu.', 'lug.', 'ago.', 'set.', 'ott.', 'nov.', 'dic.'],
  ru: ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июня', 'июля', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'],
}

const WEEKDAYS: Record<string, string[]> = {
  fr: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'],
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  es: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'],
  de: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'],
  it: ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'],
  ru: ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'],
}

export function NextAvailableCard({ score: moduleScore, locale }: Props) {
  const props = moduleScore.props as NextAvailableProps
  const labels = TRANSLATIONS[locale] ?? TRANSLATIONS.fr
  const months = MONTHS[locale] ?? MONTHS.fr
  const weekdays = WEEKDAYS[locale] ?? WEEKDAYS.fr

  const [y, m, d] = props.isoDate.split('-').map((x) => parseInt(x, 10))
  const monthLabel = months[(m || 1) - 1]
  const weekdayLabel = weekdays[props.weekdayIdx]

  const whenLabel =
    props.offset === 0 ? labels.today
    : props.offset === 1 ? labels.tomorrow
    : `${weekdayLabel} ${d} ${monthLabel}`

  const scarce = props.daysPerWeek <= 2
  const showUrgency = props.offset <= 1 || scarce

  return (
    <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 p-2 shadow-sm">
          <CalendarCheck2 className="h-4 w-4 text-white" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-neutral-900">{labels.title}</h3>
          <p className="mt-0.5 text-xs leading-snug text-emerald-900/80">
            {labels.subtitle}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/60 px-3 py-2.5 ring-1 ring-emerald-200/60">
        <Clock className="h-4 w-4 flex-shrink-0 text-emerald-600" strokeWidth={2.25} />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            {whenLabel}
          </div>
          <div className="text-sm font-semibold text-neutral-900">{props.time}</div>
        </div>
        {showUrgency && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100/70 px-2 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-rose-200">
            <Flame className="h-3 w-3" strokeWidth={2.5} />
            {props.offset === 0 ? labels.badgeToday : scarce ? labels.badgeScarce : labels.badgeSoon}
          </span>
        )}
      </div>

      {scarce && (
        <p className="mt-2 text-[11px] leading-snug text-neutral-600">
          {interpolate(labels.rareSchedule, { count: props.daysPerWeek })}
        </p>
      )}
    </div>
  )
}

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''))
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    title: 'Prochain créneau',
    subtitle: 'La disponibilité la plus proche, mise à jour en direct.',
    today: "Aujourd'hui",
    tomorrow: 'Demain',
    badgeToday: 'Aujourd\'hui',
    badgeSoon: 'Bientôt',
    badgeScarce: 'Rare',
    rareSchedule: 'Ne tourne que {count} jour(s) par semaine — réservez tôt.',
  },
  en: {
    title: 'Next slot',
    subtitle: 'The closest availability, updated live.',
    today: 'Today',
    tomorrow: 'Tomorrow',
    badgeToday: 'Today',
    badgeSoon: 'Soon',
    badgeScarce: 'Rare',
    rareSchedule: 'Only runs {count} day(s) a week — book early.',
  },
  es: {
    title: 'Próximo horario',
    subtitle: 'La disponibilidad más cercana, en directo.',
    today: 'Hoy',
    tomorrow: 'Mañana',
    badgeToday: 'Hoy',
    badgeSoon: 'Pronto',
    badgeScarce: 'Raro',
    rareSchedule: 'Solo sale {count} día(s) a la semana — reserva pronto.',
  },
  de: {
    title: 'Nächster Slot',
    subtitle: 'Die nächste Verfügbarkeit, live aktualisiert.',
    today: 'Heute',
    tomorrow: 'Morgen',
    badgeToday: 'Heute',
    badgeSoon: 'Bald',
    badgeScarce: 'Selten',
    rareSchedule: 'Findet nur an {count} Tag(en) pro Woche statt — früh buchen.',
  },
  it: {
    title: 'Prossimo slot',
    subtitle: 'La disponibilità più vicina, aggiornata in tempo reale.',
    today: 'Oggi',
    tomorrow: 'Domani',
    badgeToday: 'Oggi',
    badgeSoon: 'Presto',
    badgeScarce: 'Raro',
    rareSchedule: 'Si tiene solo {count} giorno/i a settimana — prenota presto.',
  },
  ru: {
    title: 'Ближайший слот',
    subtitle: 'Самая близкая дата, обновляется вживую.',
    today: 'Сегодня',
    tomorrow: 'Завтра',
    badgeToday: 'Сегодня',
    badgeSoon: 'Скоро',
    badgeScarce: 'Редко',
    rareSchedule: 'Проходит только {count} день(дней) в неделю — бронируйте заранее.',
  },
}
