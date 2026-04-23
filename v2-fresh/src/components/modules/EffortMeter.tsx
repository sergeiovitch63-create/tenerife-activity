/**
 * Effort-Meter card — physical / sensory demand breakdown.
 *
 * Left-tertiary card. Shows four axes (walking / altitude / climate /
 * motion) each as a 4-segment bar. The overall band is rendered as a
 * chip in the header. Pure presentation.
 *
 * Scorer: `src/lib/personalize/scorers/effort-meter.ts`
 */

import { Footprints, Mountain, Sun, Waves, Gauge } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ModuleScore, ActivitySignals } from '@/lib/personalize/types'
import type {
  AxisRating,
  EffortAxis,
  EffortMeterProps,
} from '@/lib/personalize/scorers/effort-meter'

type Props = {
  signals: ActivitySignals
  score: ModuleScore
  locale: string
}

const AXIS_ICON: Record<EffortAxis, LucideIcon> = {
  walking: Footprints,
  altitude: Mountain,
  climate: Sun,
  motion: Waves,
}

const OVERALL_STYLE: Record<EffortMeterProps['overall'], { chip: string; ring: string; gradient: string }> = {
  rest:      { chip: 'bg-emerald-100 text-emerald-800 ring-emerald-200', ring: 'border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-teal-50', gradient: 'from-emerald-500 to-teal-500' },
  light:     { chip: 'bg-sky-100 text-sky-800 ring-sky-200',             ring: 'border-sky-200/70 bg-gradient-to-br from-sky-50 to-cyan-50',         gradient: 'from-sky-500 to-cyan-500' },
  moderate:  { chip: 'bg-amber-100 text-amber-800 ring-amber-200',       ring: 'border-amber-200/70 bg-gradient-to-br from-amber-50 to-orange-50',   gradient: 'from-amber-500 to-orange-500' },
  demanding: { chip: 'bg-rose-100 text-rose-800 ring-rose-200',          ring: 'border-rose-200/70 bg-gradient-to-br from-rose-50 to-red-50',        gradient: 'from-rose-500 to-red-500' },
}

export function EffortMeterCard({ score: moduleScore, locale }: Props) {
  const props = moduleScore.props as EffortMeterProps
  const labels = TRANSLATIONS[locale] ?? TRANSLATIONS.fr
  const style = OVERALL_STYLE[props.overall]

  return (
    <div className={`rounded-2xl border p-4 ${style.ring}`}>
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div className={`flex-shrink-0 rounded-xl bg-gradient-to-br ${style.gradient} p-2 shadow-sm`}>
          <Gauge className="h-4 w-4 text-white" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-neutral-900">
            {labels.title}
          </h3>
          <p className="mt-0.5 text-xs leading-snug text-neutral-700/80">
            {labels[`summary_${props.overall}`] ?? labels.summary_light}
          </p>
        </div>
        <span
          className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${style.chip}`}
        >
          {labels[`overall_${props.overall}`] ?? props.overall}
        </span>
      </div>

      {/* Axes bars */}
      <div className="mt-3 space-y-2">
        {props.axes.map((a) => (
          <AxisBar key={a.axis} rating={a} labels={labels} overall={props.overall} />
        ))}
      </div>
    </div>
  )
}

function AxisBar({
  rating,
  labels,
  overall,
}: {
  rating: AxisRating
  labels: Record<string, string>
  overall: EffortMeterProps['overall']
}) {
  const Icon = AXIS_ICON[rating.axis]
  const accent = OVERALL_STYLE[overall].gradient
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 flex-shrink-0 text-neutral-600" strokeWidth={2.25} />
      <div className="min-w-[88px] flex-shrink-0">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
          {labels[`axis_${rating.axis}`] ?? rating.axis}
        </div>
        <div className="text-[11px] font-medium text-neutral-700 leading-tight">
          {labels[`reason_${rating.reasonKey}`] ?? ''}
        </div>
      </div>
      <div className="flex flex-1 items-center gap-0.5">
        {[0, 1, 2, 3].map((i) => {
          const on = i < rating.level
          return (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                on
                  ? `bg-gradient-to-r ${accent}`
                  : 'bg-neutral-200'
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    title: 'Effort à prévoir',

    overall_rest: 'Repos',
    overall_light: 'Léger',
    overall_moderate: 'Modéré',
    overall_demanding: 'Exigeant',

    summary_rest: 'Aucune préparation particulière — on se laisse porter.',
    summary_light: 'Tenue souple suffit, fatigue minimale.',
    summary_moderate: 'Bonne forme de base recommandée.',
    summary_demanding: 'Préparez-vous physiquement — journée qui coûte.',

    axis_walking: 'Marche',
    axis_altitude: 'Altitude',
    axis_climate: 'Climat',
    axis_motion: 'Stabilité',

    reason_walking_none: 'Assis tout du long.',
    reason_walking_light: 'Quelques pas.',
    reason_walking_stroll: 'Promenade sur site.',
    reason_walking_park: 'Grande zone à parcourir.',
    reason_walking_urban: 'Déambulation urbaine.',
    reason_walking_trek: 'Marche active / dénivelé.',

    reason_altitude_sea: 'Niveau de la mer.',
    reason_altitude_low: 'Faible altitude.',
    reason_altitude_mid: 'Altitude modérée.',
    reason_altitude_high: 'Haute altitude (3 000 m+).',
    reason_altitude_aerial: 'Vol / suspension.',

    reason_climate_controlled: 'Environnement abrité.',
    reason_climate_outdoor: 'En extérieur.',
    reason_climate_cool: 'Ambiance fraîche.',
    reason_climate_sun: 'Soleil direct prolongé.',
    reason_climate_exposed: 'Exposition vent / froid.',
    reason_climate_alpine: 'Haute montagne, écarts extrêmes.',

    reason_motion_none: 'Pas de mouvement.',
    reason_motion_swell: 'Houle légère possible.',
    reason_motion_catamaran: 'Catamaran — mouvement doux.',
    reason_motion_boat: 'Bateau — mal de mer possible.',
    reason_motion_road: 'Route / vibration.',
    reason_motion_offroad: 'Secousses tout-terrain.',
    reason_motion_jetski: 'Vagues, rebonds forts.',
    reason_motion_aerial: 'Sensations aériennes.',
  },
  en: {
    title: 'Effort needed',

    overall_rest: 'Rest',
    overall_light: 'Light',
    overall_moderate: 'Moderate',
    overall_demanding: 'Demanding',

    summary_rest: 'Nothing to prepare — just settle in.',
    summary_light: 'Comfortable clothes, minimal fatigue.',
    summary_moderate: 'Basic fitness recommended.',
    summary_demanding: 'Prepare yourself — a day that costs.',

    axis_walking: 'Walking',
    axis_altitude: 'Altitude',
    axis_climate: 'Climate',
    axis_motion: 'Stability',

    reason_walking_none: 'Seated throughout.',
    reason_walking_light: 'A few steps.',
    reason_walking_stroll: 'Stroll on site.',
    reason_walking_park: 'Large area to cover.',
    reason_walking_urban: 'City-style wandering.',
    reason_walking_trek: 'Active walk with elevation.',

    reason_altitude_sea: 'Sea level.',
    reason_altitude_low: 'Low altitude.',
    reason_altitude_mid: 'Moderate altitude.',
    reason_altitude_high: 'High altitude (10 000 ft+).',
    reason_altitude_aerial: 'Airborne / suspended.',

    reason_climate_controlled: 'Sheltered environment.',
    reason_climate_outdoor: 'Outdoor.',
    reason_climate_cool: 'Cool ambience.',
    reason_climate_sun: 'Extended direct sun.',
    reason_climate_exposed: 'Wind / cold exposure.',
    reason_climate_alpine: 'High-mountain swings.',

    reason_motion_none: 'No motion.',
    reason_motion_swell: 'Slight swell possible.',
    reason_motion_catamaran: 'Catamaran — smooth ride.',
    reason_motion_boat: 'Boat — seasickness possible.',
    reason_motion_road: 'Road / vibration.',
    reason_motion_offroad: 'Off-road jolts.',
    reason_motion_jetski: 'Waves, strong bounces.',
    reason_motion_aerial: 'Airborne sensations.',
  },
  es: {
    title: 'Esfuerzo previsto',

    overall_rest: 'Descanso',
    overall_light: 'Ligero',
    overall_moderate: 'Moderado',
    overall_demanding: 'Exigente',

    summary_rest: 'Nada que preparar — déjate llevar.',
    summary_light: 'Ropa cómoda, fatiga mínima.',
    summary_moderate: 'Forma básica recomendada.',
    summary_demanding: 'Prepárate físicamente — jornada intensa.',

    axis_walking: 'Caminar',
    axis_altitude: 'Altitud',
    axis_climate: 'Clima',
    axis_motion: 'Estabilidad',

    reason_walking_none: 'Sentado todo el tiempo.',
    reason_walking_light: 'Unos pasos.',
    reason_walking_stroll: 'Paseo en el sitio.',
    reason_walking_park: 'Amplia zona a recorrer.',
    reason_walking_urban: 'Caminata urbana.',
    reason_walking_trek: 'Marcha activa con desnivel.',

    reason_altitude_sea: 'Nivel del mar.',
    reason_altitude_low: 'Altitud baja.',
    reason_altitude_mid: 'Altitud moderada.',
    reason_altitude_high: 'Gran altitud (3 000 m+).',
    reason_altitude_aerial: 'En vuelo / suspensión.',

    reason_climate_controlled: 'Entorno protegido.',
    reason_climate_outdoor: 'Al aire libre.',
    reason_climate_cool: 'Ambiente fresco.',
    reason_climate_sun: 'Sol directo prolongado.',
    reason_climate_exposed: 'Expuesto a viento / frío.',
    reason_climate_alpine: 'Alta montaña, contrastes extremos.',

    reason_motion_none: 'Sin movimiento.',
    reason_motion_swell: 'Oleaje ligero posible.',
    reason_motion_catamaran: 'Catamarán — movimiento suave.',
    reason_motion_boat: 'Barco — mareo posible.',
    reason_motion_road: 'Carretera / vibración.',
    reason_motion_offroad: 'Saltos todoterreno.',
    reason_motion_jetski: 'Olas, rebotes fuertes.',
    reason_motion_aerial: 'Sensaciones aéreas.',
  },
  de: {
    title: 'Zu erwartender Aufwand',

    overall_rest: 'Erholung',
    overall_light: 'Leicht',
    overall_moderate: 'Moderat',
    overall_demanding: 'Anspruchsvoll',

    summary_rest: 'Nichts vorzubereiten — einfach entspannen.',
    summary_light: 'Bequeme Kleidung, minimale Ermüdung.',
    summary_moderate: 'Grundfitness empfohlen.',
    summary_demanding: 'Bereiten Sie sich körperlich vor — anstrengender Tag.',

    axis_walking: 'Gehen',
    axis_altitude: 'Höhenlage',
    axis_climate: 'Klima',
    axis_motion: 'Stabilität',

    reason_walking_none: 'Durchgehend sitzend.',
    reason_walking_light: 'Einige Schritte.',
    reason_walking_stroll: 'Spaziergang vor Ort.',
    reason_walking_park: 'Weites Gelände.',
    reason_walking_urban: 'Stadtbummel.',
    reason_walking_trek: 'Aktive Wanderung, Höhenmeter.',

    reason_altitude_sea: 'Meereshöhe.',
    reason_altitude_low: 'Niedrige Höhe.',
    reason_altitude_mid: 'Mittlere Höhe.',
    reason_altitude_high: 'Große Höhe (3 000 m+).',
    reason_altitude_aerial: 'Im Flug / schwebend.',

    reason_climate_controlled: 'Geschützte Umgebung.',
    reason_climate_outdoor: 'Draußen.',
    reason_climate_cool: 'Kühle Atmosphäre.',
    reason_climate_sun: 'Lange direkte Sonne.',
    reason_climate_exposed: 'Wind- / Kälteexposition.',
    reason_climate_alpine: 'Hochgebirge, extreme Schwankungen.',

    reason_motion_none: 'Keine Bewegung.',
    reason_motion_swell: 'Leichter Wellengang möglich.',
    reason_motion_catamaran: 'Katamaran — sanfte Fahrt.',
    reason_motion_boat: 'Boot — Seekrankheit möglich.',
    reason_motion_road: 'Straße / Vibration.',
    reason_motion_offroad: 'Offroad-Stöße.',
    reason_motion_jetski: 'Wellen, starke Schläge.',
    reason_motion_aerial: 'Flugempfindungen.',
  },
  it: {
    title: 'Sforzo previsto',

    overall_rest: 'Riposo',
    overall_light: 'Leggero',
    overall_moderate: 'Moderato',
    overall_demanding: 'Impegnativo',

    summary_rest: 'Nulla da preparare — lasciati andare.',
    summary_light: 'Abbigliamento comodo, fatica minima.',
    summary_moderate: 'Forma base consigliata.',
    summary_demanding: 'Preparati fisicamente — giornata intensa.',

    axis_walking: 'Camminata',
    axis_altitude: 'Altitudine',
    axis_climate: 'Clima',
    axis_motion: 'Stabilità',

    reason_walking_none: 'Seduto per tutto il tempo.',
    reason_walking_light: 'Qualche passo.',
    reason_walking_stroll: 'Passeggiata sul posto.',
    reason_walking_park: 'Ampia zona da percorrere.',
    reason_walking_urban: 'Giro urbano.',
    reason_walking_trek: 'Camminata attiva con dislivello.',

    reason_altitude_sea: 'Livello del mare.',
    reason_altitude_low: 'Bassa altitudine.',
    reason_altitude_mid: 'Altitudine moderata.',
    reason_altitude_high: 'Alta altitudine (3 000 m+).',
    reason_altitude_aerial: 'In volo / sospeso.',

    reason_climate_controlled: 'Ambiente riparato.',
    reason_climate_outdoor: 'All\'aperto.',
    reason_climate_cool: 'Atmosfera fresca.',
    reason_climate_sun: 'Sole diretto prolungato.',
    reason_climate_exposed: 'Esposto a vento / freddo.',
    reason_climate_alpine: 'Alta montagna, escursioni termiche estreme.',

    reason_motion_none: 'Nessun movimento.',
    reason_motion_swell: 'Leggero moto ondoso possibile.',
    reason_motion_catamaran: 'Catamarano — movimento dolce.',
    reason_motion_boat: 'Barca — possibile mal di mare.',
    reason_motion_road: 'Strada / vibrazione.',
    reason_motion_offroad: 'Scossoni fuoristrada.',
    reason_motion_jetski: 'Onde, forti rimbalzi.',
    reason_motion_aerial: 'Sensazioni aeree.',
  },
  ru: {
    title: 'Требуемые усилия',

    overall_rest: 'Отдых',
    overall_light: 'Лёгкий',
    overall_moderate: 'Умеренный',
    overall_demanding: 'Требовательный',

    summary_rest: 'Ничего готовить — просто расслабьтесь.',
    summary_light: 'Удобная одежда, минимальная усталость.',
    summary_moderate: 'Базовая физическая форма желательна.',
    summary_demanding: 'Подготовьтесь физически — насыщенный день.',

    axis_walking: 'Пешком',
    axis_altitude: 'Высота',
    axis_climate: 'Климат',
    axis_motion: 'Стабильность',

    reason_walking_none: 'Сидя всё время.',
    reason_walking_light: 'Несколько шагов.',
    reason_walking_stroll: 'Прогулка на месте.',
    reason_walking_park: 'Большая территория.',
    reason_walking_urban: 'Городская прогулка.',
    reason_walking_trek: 'Активная ходьба, перепады.',

    reason_altitude_sea: 'Уровень моря.',
    reason_altitude_low: 'Низкая высота.',
    reason_altitude_mid: 'Средняя высота.',
    reason_altitude_high: 'Большая высота (3000 м+).',
    reason_altitude_aerial: 'В полёте / подвешенность.',

    reason_climate_controlled: 'Укрытая среда.',
    reason_climate_outdoor: 'На открытом воздухе.',
    reason_climate_cool: 'Прохладная атмосфера.',
    reason_climate_sun: 'Длительное прямое солнце.',
    reason_climate_exposed: 'Ветер / холод.',
    reason_climate_alpine: 'Высокогорье, экстремальные перепады.',

    reason_motion_none: 'Без движения.',
    reason_motion_swell: 'Возможна лёгкая качка.',
    reason_motion_catamaran: 'Катамаран — мягкий ход.',
    reason_motion_boat: 'Лодка — возможна морская болезнь.',
    reason_motion_road: 'Дорога / вибрация.',
    reason_motion_offroad: 'Тряска по бездорожью.',
    reason_motion_jetski: 'Волны, сильные удары.',
    reason_motion_aerial: 'Ощущения полёта.',
  },
}
