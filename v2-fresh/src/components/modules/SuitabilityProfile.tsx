/**
 * Suitability Profile card — "Who is this for?"
 *
 * Pure presentational component. Scoring + fact-building lives in
 * `src/lib/personalize/scorers/suitability-profile.ts` so it can run on
 * the server. This file just renders what the scorer produced.
 */

import {
  Users, Baby, Activity as ActivityIcon, Car, Mountain, Waves,
  Sun as SunIcon, Flame, Clock,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ModuleScore, ActivitySignals } from '@/lib/personalize/types'
import type { SuitabilityFact, SuitabilityIconName } from '@/lib/personalize/scorers/suitability-profile'

const ICON_MAP: Record<SuitabilityIconName, LucideIcon> = {
  Users,
  Baby,
  Activity: ActivityIcon,
  Car,
  Mountain,
  Waves,
  Sun: SunIcon,
  Flame,
  Clock,
}

type Props = {
  signals: ActivitySignals
  score: ModuleScore
  locale: string
}

export function SuitabilityProfileCard({ score: moduleScore, locale }: Props) {
  const props = moduleScore.props as {
    demand: number
    facts: SuitabilityFact[]
  }

  const labels = TRANSLATIONS[locale] ?? TRANSLATIONS.fr

  const demandLabel = [
    labels.demand1, labels.demand2, labels.demand3, labels.demand4, labels.demand5,
  ][props.demand - 1] ?? labels.demand3

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 p-2.5 shadow-sm">
          <Users className="h-5 w-5 text-white" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-neutral-900">{labels.title}</h3>
          <p className="mt-0.5 text-sm text-neutral-600">{labels.subtitle}</p>

          {/* Physical demand meter */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-xs font-medium text-neutral-700">{labels.demandLabel}</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className={`block h-2 w-6 rounded-full ${
                    i <= props.demand
                      ? props.demand >= 4
                        ? 'bg-gradient-to-r from-orange-400 to-rose-500'
                        : props.demand === 3
                          ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                          : 'bg-gradient-to-r from-emerald-400 to-teal-500'
                      : 'bg-neutral-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-semibold text-neutral-800">{demandLabel}</span>
          </div>

          {/* Facts list */}
          <ul className="mt-4 space-y-2">
            {props.facts.map((fact) => {
              const Icon = ICON_MAP[fact.icon] ?? Users
              const toneCls = TONE_STYLES[fact.tone]
              const baseText = labels[fact.textKey] ?? fact.textKey
              const text = fact.params ? interpolate(baseText, fact.params) : baseText
              return (
                <li
                  key={fact.key}
                  className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 ${toneCls.container}`}
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${toneCls.icon}`} strokeWidth={2.25} />
                  <span className={`text-sm ${toneCls.text}`}>{text}</span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''))
}

const TONE_STYLES = {
  good: {
    container: 'border-emerald-200/60 bg-emerald-50/60',
    icon: 'text-emerald-600',
    text: 'text-emerald-900',
  },
  info: {
    container: 'border-sky-200/60 bg-sky-50/60',
    icon: 'text-sky-600',
    text: 'text-sky-900',
  },
  warn: {
    container: 'border-amber-200/60 bg-amber-50/60',
    icon: 'text-amber-700',
    text: 'text-amber-900',
  },
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    title: 'Est-ce fait pour vous ?',
    subtitle: 'Le profil réel de cette expérience, sans langue de bois.',
    demandLabel: 'Effort physique',
    demand1: 'Très facile',
    demand2: 'Facile',
    demand3: 'Modéré',
    demand4: 'Soutenu',
    demand5: 'Exigeant',
    infantsOk: 'Accessible aux tout-petits — venez en famille.',
    youngChildren: 'Ouvert dès {age} ans — adapté aux jeunes enfants.',
    minAge: 'Âge minimum : {age} ans.',
    pickupIncluded: 'Transfert aller-retour inclus depuis les principaux hôtels.',
    duration: 'Durée : {time} — prévoyez la demi-journée ou la journée en conséquence.',
    altitudeHigh: 'Haute altitude (2 000 m et plus) — un pull chaud est indispensable.',
    altitudeMid: 'Altitude moyenne — l\'air frais surprend, prévoyez une veste.',
    motionRisk: 'Navigation longue : prenez un anti-mal de mer si vous y êtes sensible.',
    sunExposure: 'Peu d\'ombre en chemin — crème solaire et eau essentielles.',
    fitnessNeeded: 'Bonne condition physique recommandée.',
    calimaInfo: 'En cas de calima, visibilité réduite — le prestataire peut adapter le programme.',
  },
  en: {
    title: 'Is this right for you?',
    subtitle: 'The honest profile of this experience.',
    demandLabel: 'Physical effort',
    demand1: 'Very easy',
    demand2: 'Easy',
    demand3: 'Moderate',
    demand4: 'Demanding',
    demand5: 'Challenging',
    infantsOk: 'Infants welcome — bring the whole family.',
    youngChildren: 'Open from age {age} — suitable for young children.',
    minAge: 'Minimum age: {age} years.',
    pickupIncluded: 'Round-trip transfer included from major hotels.',
    duration: 'Duration: {time} — plan a half-day or full day accordingly.',
    altitudeHigh: 'High altitude (2,000 m+) — a warm layer is essential.',
    altitudeMid: 'Mid-altitude — the cooler air can surprise you, bring a jacket.',
    motionRisk: 'Long boat ride: take seasickness medication if you\'re sensitive.',
    sunExposure: 'Little shade along the way — sunscreen and water are essential.',
    fitnessNeeded: 'Good physical condition recommended.',
    calimaInfo: 'During calima, visibility drops — the operator may adjust the program.',
  },
  es: {
    title: '¿Es para ti?',
    subtitle: 'El perfil real de esta experiencia, sin rodeos.',
    demandLabel: 'Esfuerzo físico',
    demand1: 'Muy fácil',
    demand2: 'Fácil',
    demand3: 'Moderado',
    demand4: 'Exigente',
    demand5: 'Desafiante',
    infantsOk: 'Accesible para bebés — ideal en familia.',
    youngChildren: 'Admite niños desde {age} años.',
    minAge: 'Edad mínima: {age} años.',
    pickupIncluded: 'Traslado ida y vuelta incluido desde los principales hoteles.',
    duration: 'Duración: {time} — reserva media jornada o jornada completa.',
    altitudeHigh: 'Gran altitud (más de 2 000 m) — imprescindible abrigo.',
    altitudeMid: 'Altitud media — el aire fresco sorprende, lleva una chaqueta.',
    motionRisk: 'Navegación larga: si eres sensible, lleva pastillas para el mareo.',
    sunExposure: 'Poca sombra durante el recorrido — crema solar y agua esenciales.',
    fitnessNeeded: 'Se recomienda buena forma física.',
    calimaInfo: 'Con calima la visibilidad disminuye — el operador puede ajustar el programa.',
  },
  de: {
    title: 'Ist das das Richtige für Sie?',
    subtitle: 'Das ehrliche Profil dieser Erfahrung.',
    demandLabel: 'Körperlicher Einsatz',
    demand1: 'Sehr leicht',
    demand2: 'Leicht',
    demand3: 'Mäßig',
    demand4: 'Fordernd',
    demand5: 'Anspruchsvoll',
    infantsOk: 'Für Kleinkinder geeignet — ideal für Familien.',
    youngChildren: 'Ab {age} Jahren — für kleine Kinder geeignet.',
    minAge: 'Mindestalter: {age} Jahre.',
    pickupIncluded: 'Hin- und Rücktransfer von den wichtigsten Hotels inklusive.',
    duration: 'Dauer: {time} — planen Sie halb- oder ganztägig.',
    altitudeHigh: 'Große Höhe (über 2 000 m) — warme Kleidung unverzichtbar.',
    altitudeMid: 'Mittlere Höhe — es wird kühler, Jacke einpacken.',
    motionRisk: 'Lange Bootsfahrt: Tabletten gegen Seekrankheit bei Bedarf.',
    sunExposure: 'Wenig Schatten unterwegs — Sonnencreme und Wasser unbedingt.',
    fitnessNeeded: 'Gute körperliche Verfassung empfohlen.',
    calimaInfo: 'Bei Calima sinkt die Sicht — der Veranstalter kann anpassen.',
  },
  it: {
    title: 'È l\'attività giusta per te?',
    subtitle: 'Il profilo reale di questa esperienza.',
    demandLabel: 'Sforzo fisico',
    demand1: 'Molto facile',
    demand2: 'Facile',
    demand3: 'Moderato',
    demand4: 'Impegnativo',
    demand5: 'Molto impegnativo',
    infantsOk: 'Adatto ai più piccoli — perfetto per la famiglia.',
    youngChildren: 'Aperto dai {age} anni — adatto ai bambini piccoli.',
    minAge: 'Età minima: {age} anni.',
    pickupIncluded: 'Transfer andata e ritorno dai principali hotel incluso.',
    duration: 'Durata: {time} — pianifica mezza o intera giornata.',
    altitudeHigh: 'Alta quota (oltre 2 000 m) — strato caldo indispensabile.',
    altitudeMid: 'Altitudine media — l\'aria è fresca, porta una giacca.',
    motionRisk: 'Navigazione lunga: pastiglie anti-mal di mare se sensibili.',
    sunExposure: 'Poca ombra lungo il percorso — crema solare e acqua essenziali.',
    fitnessNeeded: 'Buona forma fisica consigliata.',
    calimaInfo: 'Con la calima la visibilità diminuisce — l\'operatore può adattare.',
  },
  ru: {
    title: 'Подойдёт ли вам?',
    subtitle: 'Честный профиль этой экскурсии.',
    demandLabel: 'Физическая нагрузка',
    demand1: 'Совсем лёгкая',
    demand2: 'Лёгкая',
    demand3: 'Средняя',
    demand4: 'Высокая',
    demand5: 'Очень высокая',
    infantsOk: 'Подходит для малышей — смело берите всю семью.',
    youngChildren: 'С {age} лет — подходит маленьким детям.',
    minAge: 'Минимальный возраст: {age} лет.',
    pickupIncluded: 'Трансфер туда-обратно из основных отелей включён.',
    duration: 'Длительность: {time} — планируйте полдня или полный день.',
    altitudeHigh: 'Большая высота (более 2 000 м) — тёплая вещь обязательна.',
    altitudeMid: 'Средняя высота — прохладно, возьмите куртку.',
    motionRisk: 'Долгая прогулка по воде: возьмите таблетки от укачивания.',
    sunExposure: 'Тени мало — крем от солнца и вода обязательны.',
    fitnessNeeded: 'Рекомендуется хорошая физическая форма.',
    calimaInfo: 'При калиме видимость снижается — оператор может адаптировать маршрут.',
  },
}
