/**
 * Family-Fit card — "Will this work with our kids?" scorecard.
 *
 * Pure presentation. Fact extraction / verdict logic lives in
 * `src/lib/personalize/scorers/family-fit.ts`. We just render the facts
 * with a tone-coloured row treatment and a headline verdict chip.
 */

import {
  Baby, Users, Gauge, Heart, AlertTriangle, CheckCircle2, Clock, Bus,
  Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ModuleScore, ActivitySignals } from '@/lib/personalize/types'
import type {
  FamilyFact,
  FamilyFactIcon,
  FamilyFitProps,
  FamilyVerdict,
} from '@/lib/personalize/scorers/family-fit'

const ICON_MAP: Record<FamilyFactIcon, LucideIcon> = {
  Baby,
  Users,
  Gauge,
  Smile: Heart,           // Lucide doesn't ship Smile in all versions — soften.
  AlertTriangle,
  Heart,
  CheckCircle2,
  Clock,
  Bus,
  // No Stroller icon in Lucide — Baby icon is the semantic neighbour and
  // the tone colour carries the friendly/tricky distinction.
  Stroller: Baby,
}

const VERDICT_STYLE: Record<FamilyVerdict, { label: string; chip: string; ring: string }> = {
  'great-fit': {
    label: 'greatFit',
    chip: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    ring: 'ring-emerald-100',
  },
  workable: {
    label: 'workable',
    chip: 'bg-sky-100 text-sky-800 ring-sky-200',
    ring: 'ring-sky-100',
  },
  caution: {
    label: 'caution',
    chip: 'bg-amber-100 text-amber-800 ring-amber-200',
    ring: 'ring-amber-100',
  },
  'adults-only': {
    label: 'adultsOnly',
    chip: 'bg-rose-100 text-rose-800 ring-rose-200',
    ring: 'ring-rose-100',
  },
}

const TONE_STYLE = {
  positive: 'text-emerald-700 bg-emerald-50 ring-emerald-100',
  neutral: 'text-neutral-700 bg-neutral-50 ring-neutral-200',
  caution: 'text-amber-800 bg-amber-50 ring-amber-200',
} as const

type Props = {
  signals: ActivitySignals
  score: ModuleScore
  locale: string
}

export function FamilyFitCard({ score: moduleScore, locale }: Props) {
  const props = moduleScore.props as FamilyFitProps
  const labels = TRANSLATIONS[locale] ?? TRANSLATIONS.fr
  const verdictInfo = VERDICT_STYLE[props.verdict]

  return (
    <div className="rounded-3xl border border-neutral-200 bg-gradient-to-br from-white to-amber-50/40 p-5">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-2.5 shadow-sm">
          <Sparkles className="h-5 w-5 text-white" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold text-neutral-900">{labels.title}</h3>
            <span
              className={`inline-flex flex-shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${verdictInfo.chip}`}
            >
              {labels[verdictInfo.label]}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-neutral-600">{labels.subtitle}</p>
        </div>
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {props.facts.map((fact, i) => (
          <FactRow key={i} fact={fact} labels={labels} />
        ))}
      </ul>
    </div>
  )
}

function FactRow({
  fact,
  labels,
}: {
  fact: FamilyFact
  labels: Record<string, string>
}) {
  const Icon = ICON_MAP[fact.icon] ?? Heart
  const text = resolveFactText(fact, labels)

  return (
    <li
      className={`flex items-start gap-2.5 rounded-xl px-3 py-2 ring-1 ${TONE_STYLE[fact.tone]}`}
    >
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2.25} />
      <span className="text-xs leading-snug">{text}</span>
    </li>
  )
}

function resolveFactText(
  fact: FamilyFact,
  labels: Record<string, string>,
): string {
  const template = labels[`fact_${fact.key}`] ?? fact.key
  if (fact.value == null) return template
  return template.replace('{value}', String(fact.value))
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    title: 'En famille',
    subtitle: 'Ce qu\'il faut savoir avant de réserver avec les enfants.',
    greatFit: 'Adapté',
    workable: 'Possible',
    caution: 'Avec précautions',
    adultsOnly: 'Adultes',
    fact_minAge: 'Enfants dès {value} ans acceptés.',
    fact_noLowerBound: 'Tous âges — pas de minimum imposé.',
    fact_infantFree: 'Bébés acceptés (souvent gratuits sur les genoux).',
    fact_infantCharged: 'Bébés acceptés, tarif réduit applicable.',
    fact_infantNotAllowed: 'Bébés non acceptés sur cette activité.',
    fact_strollerFriendly: 'Compatible poussette.',
    fact_strollerTricky: 'Poussette peu pratique (à éviter).',
    fact_intensityRelaxed: 'Rythme calme, aucun effort requis.',
    fact_intensityModerate: 'Activité active mais accessible.',
    fact_intensityAdrenaline: 'Sensations fortes — pas pour les plus jeunes.',
    fact_pickupIncluded: 'Prise en charge à l\'hôtel — zéro logistique.',
    fact_longTrip: 'Journée longue ({value} h) — prévoir pauses et snacks.',
    fact_shortTrip: 'Format court ({value} h) — idéal attention enfants.',
  },
  en: {
    title: 'With kids',
    subtitle: 'What to know before booking with the family.',
    greatFit: 'Great fit',
    workable: 'Workable',
    caution: 'With care',
    adultsOnly: 'Adults',
    fact_minAge: 'Kids welcome from {value} yrs up.',
    fact_noLowerBound: 'All ages — no minimum enforced.',
    fact_infantFree: 'Infants welcome (often free on a parent\'s lap).',
    fact_infantCharged: 'Infants welcome at reduced rate.',
    fact_infantNotAllowed: 'Infants not allowed on this activity.',
    fact_strollerFriendly: 'Stroller-friendly.',
    fact_strollerTricky: 'Stroller unwieldy (better leave it).',
    fact_intensityRelaxed: 'Easy pace, no effort needed.',
    fact_intensityModerate: 'Active but accessible.',
    fact_intensityAdrenaline: 'High-adrenaline — not for the youngest.',
    fact_pickupIncluded: 'Hotel pickup included — zero logistics.',
    fact_longTrip: 'Long day ({value} h) — plan breaks and snacks.',
    fact_shortTrip: 'Short format ({value} h) — kid-attention friendly.',
  },
  es: {
    title: 'En familia',
    subtitle: 'Lo que hay que saber antes de reservar con peques.',
    greatFit: 'Ideal',
    workable: 'Viable',
    caution: 'Con cuidado',
    adultsOnly: 'Adultos',
    fact_minAge: 'Niños desde {value} años admitidos.',
    fact_noLowerBound: 'Todas las edades — sin mínimo impuesto.',
    fact_infantFree: 'Bebés admitidos (a menudo gratis en brazos).',
    fact_infantCharged: 'Bebés admitidos con tarifa reducida.',
    fact_infantNotAllowed: 'Bebés no admitidos en esta actividad.',
    fact_strollerFriendly: 'Apto para cochecito.',
    fact_strollerTricky: 'Cochecito incómodo (mejor evitar).',
    fact_intensityRelaxed: 'Ritmo tranquilo, sin esfuerzo.',
    fact_intensityModerate: 'Activo pero accesible.',
    fact_intensityAdrenaline: 'Mucha adrenalina — no para los más pequeños.',
    fact_pickupIncluded: 'Recogida en hotel — sin logística.',
    fact_longTrip: 'Día largo ({value} h) — prevé pausas y snacks.',
    fact_shortTrip: 'Corto ({value} h) — ideal para la atención de los niños.',
  },
  de: {
    title: 'Mit Kindern',
    subtitle: 'Was man vor der Buchung mit Familie wissen sollte.',
    greatFit: 'Passend',
    workable: 'Machbar',
    caution: 'Mit Vorsicht',
    adultsOnly: 'Erwachsene',
    fact_minAge: 'Kinder ab {value} Jahren zugelassen.',
    fact_noLowerBound: 'Alle Altersklassen — kein Mindestalter.',
    fact_infantFree: 'Babys willkommen (oft gratis auf dem Schoß).',
    fact_infantCharged: 'Babys mit ermäßigtem Tarif zugelassen.',
    fact_infantNotAllowed: 'Babys nicht zugelassen.',
    fact_strollerFriendly: 'Kinderwagen-tauglich.',
    fact_strollerTricky: 'Kinderwagen unpraktisch.',
    fact_intensityRelaxed: 'Ruhiges Tempo, kein Aufwand.',
    fact_intensityModerate: 'Aktiv, aber zugänglich.',
    fact_intensityAdrenaline: 'Adrenalin pur — nichts für die Kleinsten.',
    fact_pickupIncluded: 'Hotel-Abholung inklusive — keine Logistik.',
    fact_longTrip: 'Langer Tag ({value} h) — Pausen und Snacks einplanen.',
    fact_shortTrip: 'Kurzes Format ({value} h) — gut für die Aufmerksamkeit.',
  },
  it: {
    title: 'In famiglia',
    subtitle: 'Cosa sapere prima di prenotare con i bambini.',
    greatFit: 'Adatto',
    workable: 'Fattibile',
    caution: 'Con cautela',
    adultsOnly: 'Adulti',
    fact_minAge: 'Bambini dai {value} anni ammessi.',
    fact_noLowerBound: 'Tutte le età — nessun minimo.',
    fact_infantFree: 'Neonati ammessi (spesso gratis in braccio).',
    fact_infantCharged: 'Neonati ammessi con tariffa ridotta.',
    fact_infantNotAllowed: 'Neonati non ammessi.',
    fact_strollerFriendly: 'Passeggino compatibile.',
    fact_strollerTricky: 'Passeggino scomodo (meglio lasciarlo).',
    fact_intensityRelaxed: 'Ritmo tranquillo, nessuno sforzo.',
    fact_intensityModerate: 'Attivo ma accessibile.',
    fact_intensityAdrenaline: 'Tanta adrenalina — non per i più piccoli.',
    fact_pickupIncluded: 'Ritiro in hotel incluso — zero logistica.',
    fact_longTrip: 'Giornata lunga ({value} h) — prevedi pause e snack.',
    fact_shortTrip: 'Formato corto ({value} h) — ideale per bambini.',
  },
  ru: {
    title: 'С детьми',
    subtitle: 'Что нужно знать перед бронированием с семьёй.',
    greatFit: 'Подходит',
    workable: 'Можно',
    caution: 'Осторожно',
    adultsOnly: 'Только взрослые',
    fact_minAge: 'Дети от {value} лет допускаются.',
    fact_noLowerBound: 'Любой возраст — минимум не установлен.',
    fact_infantFree: 'Младенцы допускаются (часто бесплатно на коленях).',
    fact_infantCharged: 'Младенцы допускаются по льготному тарифу.',
    fact_infantNotAllowed: 'Младенцы не допускаются.',
    fact_strollerFriendly: 'Подходит для коляски.',
    fact_strollerTricky: 'Коляска неудобна.',
    fact_intensityRelaxed: 'Спокойный ритм, без усилий.',
    fact_intensityModerate: 'Активно, но доступно.',
    fact_intensityAdrenaline: 'Сильные ощущения — не для малышей.',
    fact_pickupIncluded: 'Трансфер из отеля — ноль логистики.',
    fact_longTrip: 'Долгий день ({value} ч) — паузы и перекусы.',
    fact_shortTrip: 'Короткий формат ({value} ч) — удобно для детей.',
  },
}
