/**
 * Departure-Rhythm card — "when does this actually run?"
 *
 * Left-tertiary card. Shows a compact 7-day grid (Mon→Sun) with the
 * active days highlighted, a pattern chip, and the dominant departure
 * windows. Pure presentation; the rhythm signal is computed in
 * `src/lib/personalize/scorers/departure-rhythm.ts`.
 */

import { Calendar, Sunrise, Sun, SunMedium, Sunset, Moon, Clock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ModuleScore, ActivitySignals } from '@/lib/personalize/types'
import type {
  DepartureRhythmProps,
  DepartureWindow,
  RhythmPattern,
} from '@/lib/personalize/scorers/departure-rhythm'

type Props = {
  signals: ActivitySignals
  score: ModuleScore
  locale: string
}

const WINDOW_ICON: Record<DepartureWindow, LucideIcon> = {
  dawn: Sunrise,
  morning: Sun,
  midday: SunMedium,
  afternoon: SunMedium,
  evening: Sunset,
  night: Moon,
}

const PATTERN_BADGE: Record<
  RhythmPattern,
  { tone: string; ring: string }
> = {
  daily:          { tone: 'bg-emerald-100 text-emerald-800', ring: 'ring-emerald-200' },
  weekdays:       { tone: 'bg-sky-100 text-sky-800',         ring: 'ring-sky-200' },
  weekends:       { tone: 'bg-fuchsia-100 text-fuchsia-800', ring: 'ring-fuchsia-200' },
  'most-days':    { tone: 'bg-emerald-100 text-emerald-800', ring: 'ring-emerald-200' },
  'half-week':    { tone: 'bg-amber-100 text-amber-800',     ring: 'ring-amber-200' },
  'twice-weekly': { tone: 'bg-orange-100 text-orange-800',   ring: 'ring-orange-200' },
  weekly:         { tone: 'bg-rose-100 text-rose-800',       ring: 'ring-rose-200' },
  'on-demand':    { tone: 'bg-neutral-100 text-neutral-700', ring: 'ring-neutral-200' },
}

type LabelMap = Record<string, string>

export function DepartureRhythmCard({ score: moduleScore, locale }: Props) {
  const props = moduleScore.props as DepartureRhythmProps
  const labels: LabelMap = (TRANSLATIONS[locale] ?? TRANSLATIONS.fr) as LabelMap
  const dayShort = DAY_SHORT[locale] ?? DAY_SHORT.fr
  const badge = PATTERN_BADGE[props.pattern]

  return (
    <div className="rounded-2xl border border-teal-200/70 bg-gradient-to-br from-teal-50 to-cyan-50 p-4">
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 p-2 shadow-sm">
          <Calendar className="h-4 w-4 text-white" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-neutral-900">
            {labels.title}
          </h3>
          <p className="mt-0.5 text-xs leading-snug text-teal-900/80">
            {labels[`summary_${props.summaryKey}`] ?? labels.summary_default}
          </p>
        </div>
        <span
          className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${badge.tone} ${badge.ring}`}
        >
          {labels[`pattern_${props.pattern}`] ?? props.pattern}
        </span>
      </div>

      {/* Weekly grid */}
      <div className="mt-3 grid grid-cols-7 gap-1">
        {dayShort.map((dayLabel, i) => {
          const active = props.daysMap[i]
          return (
            <div
              key={i}
              className={`flex flex-col items-center rounded-lg px-1 py-2 text-center transition ${
                active
                  ? 'bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-sm'
                  : 'bg-white/70 text-neutral-400 ring-1 ring-neutral-200'
              }`}
              title={active ? labels.available : labels.closed}
            >
              <span className="text-[10px] font-bold uppercase leading-none">
                {dayLabel}
              </span>
              <span className="mt-1 text-xs font-semibold leading-none">
                {active ? '•' : '—'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Windows + time range */}
      {(props.windows.length > 0 || props.earliestTime) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {props.windows.slice(0, 3).map((w) => {
            const Icon = WINDOW_ICON[w]
            return (
              <span
                key={w}
                className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 font-medium text-teal-800 ring-1 ring-teal-200"
              >
                <Icon className="h-3 w-3" strokeWidth={2.5} />
                {labels[`window_${w}`] ?? w}
              </span>
            )
          })}
          {props.earliestTime && props.latestTime && props.earliestTime !== props.latestTime && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 font-medium text-neutral-700 ring-1 ring-neutral-200">
              <Clock className="h-3 w-3" strokeWidth={2.5} />
              {props.earliestTime}–{props.latestTime}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

const DAY_SHORT: Record<string, string[]> = {
  fr: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  es: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
  de: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
  it: ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'],
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    title: 'Quand ça part',
    available: 'Disponible',
    closed: 'Fermé',

    pattern_daily: '7 j/7',
    pattern_weekdays: 'En semaine',
    pattern_weekends: 'Week-end',
    'pattern_most-days': 'Presque quotidien',
    'pattern_half-week': '3-4 j/7',
    'pattern_twice-weekly': '2 j/7',
    pattern_weekly: '1 j/7',
    'pattern_on-demand': 'Sur demande',

    summary_default: 'Un aperçu du rythme hebdomadaire.',
    summary_dailyMorning: 'Départs quotidiens, principalement le matin.',
    summary_dailyEvening: 'Départs quotidiens, plutôt en fin de journée.',
    summary_dailyNight: 'Départs quotidiens, session nocturne.',
    summary_dailyFlexible: 'Tous les jours, plusieurs créneaux.',
    summary_weekendsOnly: 'Uniquement le week-end — réservez vite.',
    summary_weekdaysOnly: 'Du lundi au vendredi seulement.',
    summary_mostDays: 'Presque tous les jours, un ou deux jours fermés.',
    summary_halfWeek: 'Quelques jours dans la semaine — à caler avec soin.',
    summary_twiceWeekly: 'Deux jours par semaine — fenêtres rares.',
    summary_onceWeekly: 'Une fois par semaine — date à bloquer.',
    summary_onDemand: 'Sur demande — contactez l\'opérateur.',

    window_dawn: 'Avant l\'aube',
    window_morning: 'Matin',
    window_midday: 'Midi',
    window_afternoon: 'Après-midi',
    window_evening: 'Fin de journée',
    window_night: 'Nuit',
  },
  en: {
    title: 'When it departs',
    available: 'Available',
    closed: 'Closed',

    pattern_daily: '7 days',
    pattern_weekdays: 'Weekdays',
    pattern_weekends: 'Weekends',
    'pattern_most-days': 'Most days',
    'pattern_half-week': '3-4 days',
    'pattern_twice-weekly': '2 days',
    pattern_weekly: 'Weekly',
    'pattern_on-demand': 'On request',

    summary_default: 'A look at the weekly rhythm.',
    summary_dailyMorning: 'Runs every day, mostly morning departures.',
    summary_dailyEvening: 'Runs every day, leans toward evening.',
    summary_dailyNight: 'Runs every day, night session.',
    summary_dailyFlexible: 'Every day, several time slots.',
    summary_weekendsOnly: 'Weekends only — book fast.',
    summary_weekdaysOnly: 'Monday to Friday only.',
    summary_mostDays: 'Most days, one or two closed.',
    summary_halfWeek: 'A few days a week — plan ahead.',
    summary_twiceWeekly: 'Two days a week — narrow windows.',
    summary_onceWeekly: 'Once a week — block the date.',
    summary_onDemand: 'On request — contact the operator.',

    window_dawn: 'Pre-dawn',
    window_morning: 'Morning',
    window_midday: 'Midday',
    window_afternoon: 'Afternoon',
    window_evening: 'Late day',
    window_night: 'Night',
  },
  es: {
    title: 'Cuándo sale',
    available: 'Disponible',
    closed: 'Cerrado',

    pattern_daily: '7 días',
    pattern_weekdays: 'Entre semana',
    pattern_weekends: 'Fin de semana',
    'pattern_most-days': 'Casi diario',
    'pattern_half-week': '3-4 días',
    'pattern_twice-weekly': '2 días',
    pattern_weekly: 'Semanal',
    'pattern_on-demand': 'Bajo petición',

    summary_default: 'Un vistazo al ritmo semanal.',
    summary_dailyMorning: 'Sale cada día, sobre todo por la mañana.',
    summary_dailyEvening: 'Sale cada día, más bien al final del día.',
    summary_dailyNight: 'Sale cada día, sesión nocturna.',
    summary_dailyFlexible: 'Cada día, varios horarios.',
    summary_weekendsOnly: 'Solo fin de semana — reserva rápido.',
    summary_weekdaysOnly: 'De lunes a viernes únicamente.',
    summary_mostDays: 'Casi todos los días, uno o dos cerrados.',
    summary_halfWeek: 'Unos días a la semana — planifica bien.',
    summary_twiceWeekly: 'Dos días por semana — ventanas estrechas.',
    summary_onceWeekly: 'Una vez por semana — bloquea la fecha.',
    summary_onDemand: 'Bajo petición — contacta al operador.',

    window_dawn: 'Antes del alba',
    window_morning: 'Mañana',
    window_midday: 'Mediodía',
    window_afternoon: 'Tarde',
    window_evening: 'Final del día',
    window_night: 'Noche',
  },
  de: {
    title: 'Wann es startet',
    available: 'Verfügbar',
    closed: 'Geschlossen',

    pattern_daily: 'Täglich',
    pattern_weekdays: 'Werktags',
    pattern_weekends: 'Wochenende',
    'pattern_most-days': 'Fast täglich',
    'pattern_half-week': '3-4 Tage',
    'pattern_twice-weekly': '2 Tage',
    pattern_weekly: 'Wöchentlich',
    'pattern_on-demand': 'Auf Anfrage',

    summary_default: 'Ein Überblick zum Wochenrhythmus.',
    summary_dailyMorning: 'Täglich, meist vormittags.',
    summary_dailyEvening: 'Täglich, eher am späten Tag.',
    summary_dailyNight: 'Täglich, Nachtsession.',
    summary_dailyFlexible: 'Täglich, mehrere Zeitfenster.',
    summary_weekendsOnly: 'Nur am Wochenende — schnell buchen.',
    summary_weekdaysOnly: 'Nur Montag bis Freitag.',
    summary_mostDays: 'Fast täglich, ein bis zwei Tage geschlossen.',
    summary_halfWeek: 'Einige Tage pro Woche — gut planen.',
    summary_twiceWeekly: 'Zwei Tage pro Woche — enge Fenster.',
    summary_onceWeekly: 'Einmal pro Woche — Datum blocken.',
    summary_onDemand: 'Auf Anfrage — Anbieter kontaktieren.',

    window_dawn: 'Vor Morgengrauen',
    window_morning: 'Morgen',
    window_midday: 'Mittag',
    window_afternoon: 'Nachmittag',
    window_evening: 'Später Tag',
    window_night: 'Nacht',
  },
  it: {
    title: 'Quando parte',
    available: 'Disponibile',
    closed: 'Chiuso',

    pattern_daily: '7 gg',
    pattern_weekdays: 'Feriali',
    pattern_weekends: 'Weekend',
    'pattern_most-days': 'Quasi ogni giorno',
    'pattern_half-week': '3-4 gg',
    'pattern_twice-weekly': '2 gg',
    pattern_weekly: 'Settimanale',
    'pattern_on-demand': 'Su richiesta',

    summary_default: 'Uno sguardo al ritmo settimanale.',
    summary_dailyMorning: 'Parte ogni giorno, soprattutto al mattino.',
    summary_dailyEvening: 'Parte ogni giorno, per lo più a fine giornata.',
    summary_dailyNight: 'Parte ogni giorno, sessione notturna.',
    summary_dailyFlexible: 'Ogni giorno, più orari.',
    summary_weekendsOnly: 'Solo nel weekend — prenota in fretta.',
    summary_weekdaysOnly: 'Solo dal lunedì al venerdì.',
    summary_mostDays: 'Quasi tutti i giorni, uno o due chiusi.',
    summary_halfWeek: 'Pochi giorni a settimana — pianifica bene.',
    summary_twiceWeekly: 'Due giorni a settimana — finestre strette.',
    summary_onceWeekly: 'Una volta a settimana — blocca la data.',
    summary_onDemand: 'Su richiesta — contatta l\'operatore.',

    window_dawn: 'Prima dell\'alba',
    window_morning: 'Mattina',
    window_midday: 'Mezzogiorno',
    window_afternoon: 'Pomeriggio',
    window_evening: 'Fine giornata',
    window_night: 'Notte',
  },
  ru: {
    title: 'Когда отправление',
    available: 'Доступно',
    closed: 'Закрыто',

    pattern_daily: '7 дней',
    pattern_weekdays: 'Будни',
    pattern_weekends: 'Выходные',
    'pattern_most-days': 'Почти каждый день',
    'pattern_half-week': '3-4 дня',
    'pattern_twice-weekly': '2 дня',
    pattern_weekly: 'Еженедельно',
    'pattern_on-demand': 'По запросу',

    summary_default: 'Обзор недельного расписания.',
    summary_dailyMorning: 'Каждый день, в основном по утрам.',
    summary_dailyEvening: 'Каждый день, чаще вечером.',
    summary_dailyNight: 'Каждый день, ночной сеанс.',
    summary_dailyFlexible: 'Каждый день, несколько слотов.',
    summary_weekendsOnly: 'Только по выходным — бронируйте быстро.',
    summary_weekdaysOnly: 'Только с понедельника по пятницу.',
    summary_mostDays: 'Почти каждый день, 1-2 дня закрыто.',
    summary_halfWeek: 'Несколько дней в неделю — планируйте.',
    summary_twiceWeekly: 'Два дня в неделю — узкие окна.',
    summary_onceWeekly: 'Раз в неделю — блокируйте дату.',
    summary_onDemand: 'По запросу — свяжитесь с оператором.',

    window_dawn: 'До рассвета',
    window_morning: 'Утро',
    window_midday: 'Полдень',
    window_afternoon: 'После полудня',
    window_evening: 'Конец дня',
    window_night: 'Ночь',
  },
}
