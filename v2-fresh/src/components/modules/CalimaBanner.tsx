'use client'

/**
 * Calima-Banner card — full-width page-top advisory for dust-season
 * bookings. Only fires in Jul-Aug (peak) and Feb-Mar (secondary) on
 * visibility / flight / sea-sensitive activities. Scorer lives in
 * `src/lib/personalize/scorers/calima-banner.ts`.
 */

import { AlertTriangle, Wind, Eye } from 'lucide-react'
import type { ModuleScore, ActivitySignals } from '@/lib/personalize/types'
import type {
  CalimaBannerProps,
  CalimaSeverity,
} from '@/lib/personalize/scorers/calima-banner'

type Props = {
  signals: ActivitySignals
  score: ModuleScore
  locale: string
}

const SEVERITY_STYLE: Record<CalimaSeverity, { bg: string; ring: string; badge: string }> = {
  watch: {
    bg: 'bg-amber-50 border-amber-200',
    ring: 'ring-amber-200',
    badge: 'bg-amber-100 text-amber-900 ring-amber-300',
  },
  advisory: {
    bg: 'bg-orange-50 border-orange-200',
    ring: 'ring-orange-200',
    badge: 'bg-orange-100 text-orange-900 ring-orange-300',
  },
  strong: {
    bg: 'bg-rose-50 border-rose-200',
    ring: 'ring-rose-200',
    badge: 'bg-rose-100 text-rose-900 ring-rose-300',
  },
}

type LabelMap = Record<string, string>

export function CalimaBannerCard({ score: moduleScore, locale }: Props) {
  const props = moduleScore.props as CalimaBannerProps
  const labels: LabelMap = (TRANSLATIONS[locale] ?? TRANSLATIONS.fr) as LabelMap
  const style = SEVERITY_STYLE[props.severity]

  return (
    <div className={`rounded-2xl border px-4 py-3 ${style.bg}`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 rounded-xl bg-white p-2 shadow-sm ring-1 ${style.ring}`}>
          <Wind className="h-4 w-4 text-neutral-800" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-neutral-900">
              {labels.title}
            </h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${style.badge}`}
            >
              <AlertTriangle className="mr-1 inline-block h-3 w-3" strokeWidth={2.5} />
              {labels[`severity_${props.severity}`]}
            </span>
          </div>
          <p className="mt-0.5 text-xs leading-snug text-neutral-700">
            {labels[props.reasonKey]}
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {props.affects.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-neutral-800 ring-1 ring-neutral-200"
              >
                <Eye className="h-3 w-3" strokeWidth={2.5} />
                {labels[`affects_${a}`]}
              </span>
            ))}
          </div>

          <p className="mt-2 text-[11px] text-neutral-600">
            {labels.tip}
          </p>
        </div>
      </div>
    </div>
  )
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    title: 'Calima — poussière du Sahara',

    severity_watch: 'Surveillance',
    severity_advisory: 'Vigilance',
    severity_strong: 'Alerte',

    reason_flight: 'Les vols en hélicoptère et parapente sont souvent annulés pendant les épisodes de calima.',
    reason_visibility: 'La visibilité peut chuter brutalement sur les miradors et hauteurs.',
    reason_sea: 'La plongée et le snorkeling restent possibles mais l\'eau se trouble.',
    reason_generic: 'Phénomène récurrent à cette période de l\'année sur les Canaries.',

    affects_visibility: 'Visibilité',
    affects_respiratory: 'Respiratoire',
    affects_photos: 'Photos',
    affects_flight: 'Vols',
    affects_sea: 'Plongée',

    tip: 'Préférez un billet flexible ou confirmez la veille avec l\'opérateur.',
  },
  en: {
    title: 'Calima — Saharan dust season',

    severity_watch: 'Watch',
    severity_advisory: 'Advisory',
    severity_strong: 'Alert',

    reason_flight: 'Helicopter and paragliding flights are often cancelled during calima events.',
    reason_visibility: 'Visibility can collapse quickly on viewpoints and high-altitude spots.',
    reason_sea: 'Diving and snorkeling remain possible but water turbidity rises.',
    reason_generic: 'Recurring phenomenon at this time of year in the Canaries.',

    affects_visibility: 'Visibility',
    affects_respiratory: 'Respiratory',
    affects_photos: 'Photos',
    affects_flight: 'Flights',
    affects_sea: 'Diving',

    tip: 'Prefer a flexible ticket or confirm with the operator the day before.',
  },
  es: {
    title: 'Calima — polvo del Sahara',

    severity_watch: 'Vigilancia',
    severity_advisory: 'Aviso',
    severity_strong: 'Alerta',

    reason_flight: 'Los vuelos en helicóptero y parapente suelen cancelarse durante episodios de calima.',
    reason_visibility: 'La visibilidad puede caer bruscamente en miradores y zonas altas.',
    reason_sea: 'El buceo y snorkel siguen siendo posibles, pero el agua se enturbia.',
    reason_generic: 'Fenómeno recurrente en esta época del año en Canarias.',

    affects_visibility: 'Visibilidad',
    affects_respiratory: 'Respiratorio',
    affects_photos: 'Fotos',
    affects_flight: 'Vuelos',
    affects_sea: 'Buceo',

    tip: 'Elige un billete flexible o confirma con el operador el día anterior.',
  },
  de: {
    title: 'Kalima — Saharastaub-Saison',

    severity_watch: 'Beobachtung',
    severity_advisory: 'Warnung',
    severity_strong: 'Alarm',

    reason_flight: 'Helikopter- und Paraglidingflüge werden bei Kalima oft abgesagt.',
    reason_visibility: 'Die Sicht kann an Aussichtspunkten und Höhenlagen plötzlich stark abnehmen.',
    reason_sea: 'Tauchen und Schnorcheln bleiben möglich, aber das Wasser trübt sich.',
    reason_generic: 'Wiederkehrendes Phänomen zu dieser Jahreszeit auf den Kanaren.',

    affects_visibility: 'Sicht',
    affects_respiratory: 'Atemwege',
    affects_photos: 'Fotos',
    affects_flight: 'Flüge',
    affects_sea: 'Tauchen',

    tip: 'Wählen Sie ein flexibles Ticket oder bestätigen Sie einen Tag vorher mit dem Anbieter.',
  },
  it: {
    title: 'Calima — polvere del Sahara',

    severity_watch: 'Monitoraggio',
    severity_advisory: 'Avviso',
    severity_strong: 'Allerta',

    reason_flight: 'I voli in elicottero e parapendio vengono spesso cancellati durante la calima.',
    reason_visibility: 'La visibilità può calare bruscamente sui punti panoramici e in quota.',
    reason_sea: 'Immersioni e snorkeling restano possibili, ma l\'acqua diventa torbida.',
    reason_generic: 'Fenomeno ricorrente in questo periodo dell\'anno alle Canarie.',

    affects_visibility: 'Visibilità',
    affects_respiratory: 'Respiratorio',
    affects_photos: 'Foto',
    affects_flight: 'Voli',
    affects_sea: 'Immersioni',

    tip: 'Preferisci un biglietto flessibile o conferma con l\'operatore il giorno prima.',
  },
  ru: {
    title: 'Калима — пыль из Сахары',

    severity_watch: 'Наблюдение',
    severity_advisory: 'Предупреждение',
    severity_strong: 'Тревога',

    reason_flight: 'Полёты на вертолёте и параплане часто отменяются во время калимы.',
    reason_visibility: 'Видимость может резко упасть на смотровых и в горах.',
    reason_sea: 'Дайвинг и снорклинг остаются возможными, но вода мутнеет.',
    reason_generic: 'Повторяющееся явление в это время года на Канарах.',

    affects_visibility: 'Видимость',
    affects_respiratory: 'Дыхание',
    affects_photos: 'Фото',
    affects_flight: 'Полёты',
    affects_sea: 'Дайвинг',

    tip: 'Берите гибкий билет или подтвердите с оператором накануне.',
  },
}
