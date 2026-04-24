'use client'

/**
 * Time-Budget card — "how does this fit in my day?"
 *
 * Right-inline sidebar card. Shows the time footprint (pocket /
 * half-day / full-day / multi-day), the return-transit buffer when
 * it's non-trivial, the start window (morning / afternoon / evening
 * / flex), and a short planning line tuned to that combo.
 * Scorer lives in `src/lib/personalize/scorers/time-budget.ts`.
 */

import {
  Hourglass,
  Sunrise,
  Sun,
  Moon,
  ArrowRightLeft,
  Calendar,
  Timer,
  CalendarDays,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ModuleScore, ActivitySignals } from '@/lib/personalize/types'
import type {
  TimeBudgetProps,
  TimeBudgetFit,
  TimeBudgetWindow,
} from '@/lib/personalize/scorers/time-budget'

type Props = {
  signals: ActivitySignals
  score: ModuleScore
  locale: string
}

const FIT_ICON: Record<TimeBudgetFit, LucideIcon> = {
  pocket: Timer,
  'half-day': Hourglass,
  'full-day': Calendar,
  'multi-day': CalendarDays,
}

const FIT_STYLE: Record<TimeBudgetFit, { bg: string; grad: string; chip: string }> = {
  pocket:      { bg: 'bg-cyan-50 border-cyan-200',     grad: 'from-cyan-500 to-sky-500',       chip: 'bg-cyan-100 text-cyan-800 ring-cyan-200' },
  'half-day':  { bg: 'bg-amber-50 border-amber-200',   grad: 'from-amber-500 to-orange-500',   chip: 'bg-amber-100 text-amber-800 ring-amber-200' },
  'full-day':  { bg: 'bg-orange-50 border-orange-200', grad: 'from-orange-500 to-rose-500',    chip: 'bg-orange-100 text-orange-800 ring-orange-200' },
  'multi-day': { bg: 'bg-violet-50 border-violet-200', grad: 'from-violet-500 to-fuchsia-500', chip: 'bg-violet-100 text-violet-800 ring-violet-200' },
}

const WINDOW_ICON: Record<Exclude<TimeBudgetWindow, null | 'flex'>, LucideIcon> = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Moon,
}

type LabelMap = Record<string, string>

function formatHours(mins: number, labels: LabelMap): string {
  if (mins < 60) return `${mins} ${labels.minutesShort}`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (m === 0) return `${h} ${labels.hoursShort}`
  return `${h}${labels.hoursShort} ${m.toString().padStart(2, '0')}`
}

export function TimeBudgetCard({ score: moduleScore, locale }: Props) {
  const props = moduleScore.props as TimeBudgetProps
  const labels: LabelMap = (TRANSLATIONS[locale] ?? TRANSLATIONS.fr) as LabelMap
  const style = FIT_STYLE[props.fit]
  const Icon = FIT_ICON[props.fit]
  const WindowIcon =
    props.window && props.window !== 'flex'
      ? WINDOW_ICON[props.window]
      : null

  const fitLabel = labels[`fit_${props.fit}`]
  const durationStr = formatHours(props.durationMinutes, labels)
  const effectiveStr = formatHours(props.effectiveMinutes, labels)
  const tipLine = (labels[props.planningKey] ?? '')
    .replace('{duration}', durationStr)
    .replace('{effective}', effectiveStr)
    .replace('{transit}', formatHours(props.transitMinutes, labels))

  return (
    <div className={`rounded-2xl border p-4 ${style.bg}`}>
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div className={`flex-shrink-0 rounded-xl bg-gradient-to-br ${style.grad} p-2 shadow-sm`}>
          <Icon className="h-4 w-4 text-white" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-neutral-900">
            {labels.title}
          </h3>
          <p className="mt-0.5 text-xs leading-snug text-neutral-700">
            {tipLine}
          </p>
        </div>
        <span
          className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${style.chip}`}
        >
          {fitLabel}
        </span>
      </div>

      {/* Chip row — duration, transit, window */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-neutral-700 ring-1 ring-neutral-200">
          <Timer className="h-3 w-3" strokeWidth={2.5} />
          {labels.chip_onsite.replace('{duration}', durationStr)}
        </span>

        {props.transitMinutes > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-neutral-700 ring-1 ring-neutral-200">
            <ArrowRightLeft className="h-3 w-3" strokeWidth={2.5} />
            {labels.chip_transit.replace('{transit}', formatHours(props.transitMinutes, labels))}
          </span>
        )}

        {WindowIcon && props.window && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-neutral-700 ring-1 ring-neutral-200">
            <WindowIcon className="h-3 w-3" strokeWidth={2.5} />
            {labels[`window_${props.window}`]}
          </span>
        )}
        {props.window === 'flex' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-neutral-700 ring-1 ring-neutral-200">
            <Sun className="h-3 w-3" strokeWidth={2.5} />
            {labels.window_flex}
          </span>
        )}
      </div>
    </div>
  )
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    title: 'Budget temps',
    minutesShort: 'min',
    hoursShort: 'h',

    fit_pocket: 'Court',
    'fit_half-day': 'Demi-journée',
    'fit_full-day': 'Journée',
    'fit_multi-day': 'Plusieurs jours',

    window_morning: 'Matin',
    window_afternoon: 'Après-midi',
    window_evening: 'Soir',
    window_flex: 'Créneaux variés',

    chip_onsite: 'Sur place · {duration}',
    chip_transit: 'Trajet A/R · {transit}',

    tip_pocket_pickup: 'Format express, pickup inclus — s\'intercale sans casser la journée.',
    tip_pocket_local: 'Format express — idéal entre deux autres plans si vous êtes dans le coin.',
    tip_pocket_transit: 'Activité courte ({duration}) mais prévoyez {transit} de trajet A/R.',

    tip_halfday_morning: 'Occupe la matinée — l\'après-midi reste disponible.',
    tip_halfday_afternoon: 'Part l\'après-midi — matinée libre pour plage ou hôtel.',
    tip_halfday_evening: 'Créneau du soir — bloquez le dîner après.',
    tip_halfday_flex: 'Demi-journée — plusieurs départs pour s\'adapter.',
    tip_halfday_transit: 'Demi-journée ({duration}) + {transit} de route — compter ~{effective} au total.',

    tip_full_day: 'Journée complète ({duration}) — ne prévoyez rien d\'autre.',
    tip_full_day_transit: 'Journée pleine : {duration} d\'activité + {transit} de trajet.',

    tip_multi_day: 'Tour de plusieurs jours — prévoyez nuit(s) et bagage léger.',
  },
  en: {
    title: 'Time budget',
    minutesShort: 'min',
    hoursShort: 'h',

    fit_pocket: 'Quick',
    'fit_half-day': 'Half-day',
    'fit_full-day': 'Full day',
    'fit_multi-day': 'Multi-day',

    window_morning: 'Morning',
    window_afternoon: 'Afternoon',
    window_evening: 'Evening',
    window_flex: 'Flexible slots',

    chip_onsite: 'On-site · {duration}',
    chip_transit: 'Return transit · {transit}',

    tip_pocket_pickup: 'Quick format with pickup — slots in without breaking the day.',
    tip_pocket_local: 'Short format — great between other plans if you\'re nearby.',
    tip_pocket_transit: 'Short activity ({duration}) but budget {transit} of return transit.',

    tip_halfday_morning: 'Takes the morning — afternoon stays free.',
    tip_halfday_afternoon: 'Fills the afternoon — morning is yours.',
    tip_halfday_evening: 'Evening slot — plan dinner after.',
    tip_halfday_flex: 'Half-day — multiple departures to fit your pace.',
    tip_halfday_transit: 'Half-day ({duration}) + {transit} of transit — count on ~{effective} total.',

    tip_full_day: 'Full day ({duration}) — don\'t plan anything else.',
    tip_full_day_transit: 'Full day: {duration} of activity + {transit} of transit.',

    tip_multi_day: 'Multi-day tour — plan for overnight(s) and travel light.',
  },
  es: {
    title: 'Presupuesto de tiempo',
    minutesShort: 'min',
    hoursShort: 'h',

    fit_pocket: 'Corto',
    'fit_half-day': 'Media jornada',
    'fit_full-day': 'Día completo',
    'fit_multi-day': 'Varios días',

    window_morning: 'Mañana',
    window_afternoon: 'Tarde',
    window_evening: 'Noche',
    window_flex: 'Horarios variados',

    chip_onsite: 'In situ · {duration}',
    chip_transit: 'Trayecto I/V · {transit}',

    tip_pocket_pickup: 'Formato rápido con pickup — encaja sin romper el día.',
    tip_pocket_local: 'Formato corto — ideal entre otros planes si estás cerca.',
    tip_pocket_transit: 'Actividad corta ({duration}) pero calcula {transit} de trayecto.',

    tip_halfday_morning: 'Ocupa la mañana — la tarde queda libre.',
    tip_halfday_afternoon: 'Llena la tarde — la mañana es tuya.',
    tip_halfday_evening: 'Franja de tarde-noche — planifica la cena después.',
    tip_halfday_flex: 'Media jornada — varios horarios para adaptarse.',
    tip_halfday_transit: 'Media jornada ({duration}) + {transit} de ruta — ~{effective} en total.',

    tip_full_day: 'Día completo ({duration}) — no programes otra cosa.',
    tip_full_day_transit: 'Día completo: {duration} de actividad + {transit} de trayecto.',

    tip_multi_day: 'Tour de varios días — organiza la(s) noche(s) y equipaje ligero.',
  },
  de: {
    title: 'Zeitbudget',
    minutesShort: 'Min',
    hoursShort: 'Std',

    fit_pocket: 'Kurz',
    'fit_half-day': 'Halbtages',
    'fit_full-day': 'Ganztags',
    'fit_multi-day': 'Mehrtages',

    window_morning: 'Vormittag',
    window_afternoon: 'Nachmittag',
    window_evening: 'Abend',
    window_flex: 'Flexible Zeiten',

    chip_onsite: 'Vor Ort · {duration}',
    chip_transit: 'Hin/Rück · {transit}',

    tip_pocket_pickup: 'Kurzformat mit Abholung — lässt sich ohne Bruch einschieben.',
    tip_pocket_local: 'Kurzformat — ideal zwischen anderen Plänen, wenn Sie in der Nähe sind.',
    tip_pocket_transit: 'Kurzaktivität ({duration}) aber {transit} Fahrtzeit einrechnen.',

    tip_halfday_morning: 'Füllt den Vormittag — Nachmittag bleibt frei.',
    tip_halfday_afternoon: 'Füllt den Nachmittag — Vormittag gehört Ihnen.',
    tip_halfday_evening: 'Abendfenster — planen Sie das Abendessen danach.',
    tip_halfday_flex: 'Halbtages — mehrere Abfahrten, flexibel.',
    tip_halfday_transit: 'Halbtages ({duration}) + {transit} Fahrt — insgesamt ~{effective}.',

    tip_full_day: 'Ganzer Tag ({duration}) — nichts anderes einplanen.',
    tip_full_day_transit: 'Ganzer Tag: {duration} Aktivität + {transit} Fahrt.',

    tip_multi_day: 'Mehrtagestour — Übernachtung(en) planen, leichtes Gepäck.',
  },
  it: {
    title: 'Budget di tempo',
    minutesShort: 'min',
    hoursShort: 'h',

    fit_pocket: 'Breve',
    'fit_half-day': 'Mezza giornata',
    'fit_full-day': 'Giornata intera',
    'fit_multi-day': 'Più giorni',

    window_morning: 'Mattina',
    window_afternoon: 'Pomeriggio',
    window_evening: 'Sera',
    window_flex: 'Orari variabili',

    chip_onsite: 'In loco · {duration}',
    chip_transit: 'Viaggio A/R · {transit}',

    tip_pocket_pickup: 'Formato rapido con pickup — si inserisce senza rompere la giornata.',
    tip_pocket_local: 'Formato breve — ideale tra altri impegni se sei nella zona.',
    tip_pocket_transit: 'Attività breve ({duration}) ma considera {transit} di viaggio.',

    tip_halfday_morning: 'Occupa la mattina — pomeriggio libero.',
    tip_halfday_afternoon: 'Riempie il pomeriggio — mattinata libera.',
    tip_halfday_evening: 'Fascia serale — pianifica la cena dopo.',
    tip_halfday_flex: 'Mezza giornata — più partenze per adattarsi.',
    tip_halfday_transit: 'Mezza giornata ({duration}) + {transit} di viaggio — totale ~{effective}.',

    tip_full_day: 'Giornata intera ({duration}) — non programmare altro.',
    tip_full_day_transit: 'Giornata intera: {duration} di attività + {transit} di viaggio.',

    tip_multi_day: 'Tour di più giorni — prevedi pernottamento/i e bagaglio leggero.',
  },
  ru: {
    title: 'Тайм-бюджет',
    minutesShort: 'мин',
    hoursShort: 'ч',

    fit_pocket: 'Коротко',
    'fit_half-day': 'Полдня',
    'fit_full-day': 'Целый день',
    'fit_multi-day': 'Несколько дней',

    window_morning: 'Утро',
    window_afternoon: 'День',
    window_evening: 'Вечер',
    window_flex: 'Гибкие слоты',

    chip_onsite: 'На месте · {duration}',
    chip_transit: 'Дорога туда-обратно · {transit}',

    tip_pocket_pickup: 'Короткий формат с пикапом — встраивается без слома дня.',
    tip_pocket_local: 'Короткий формат — удобно между другими планами, если вы рядом.',
    tip_pocket_transit: 'Короткая активность ({duration}), но заложите {transit} на дорогу.',

    tip_halfday_morning: 'Занимает утро — вторая половина дня свободна.',
    tip_halfday_afternoon: 'Забирает вторую половину дня — утро ваше.',
    tip_halfday_evening: 'Вечерний слот — ужин запланируйте после.',
    tip_halfday_flex: 'Полдня — несколько отправлений на выбор.',
    tip_halfday_transit: 'Полдня ({duration}) + {transit} дороги — итого ~{effective}.',

    tip_full_day: 'Целый день ({duration}) — ничего больше не планируйте.',
    tip_full_day_transit: 'Целый день: {duration} активности + {transit} дороги.',

    tip_multi_day: 'Многодневный тур — закладывайте ночёвки и лёгкий багаж.',
  },
}
