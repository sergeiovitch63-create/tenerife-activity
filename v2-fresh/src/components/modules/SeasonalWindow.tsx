'use client'

/**
 * Seasonal-Window card — "when is this actually worth coming for?"
 *
 * Left-tertiary card. 12-month heatmap (peak/good/fair/avoid), driving
 * reason, warnings, and a best-window recommendation. The scorer is in
 * `src/lib/personalize/scorers/seasonal-window.ts`.
 *
 * Uses `'use client'` because we read the user's current month at
 * render time to highlight "you're looking at this now" context.
 */

import { CalendarRange, AlertTriangle, Flame, Snowflake, Wind, Eye, Waves, MountainSnow, Sun } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ModuleScore, ActivitySignals } from '@/lib/personalize/types'
import type {
  SeasonalWindowProps,
  SeasonalRating,
} from '@/lib/personalize/scorers/seasonal-window'

type Props = {
  signals: ActivitySignals
  score: ModuleScore
  locale: string
}

const RATING_STYLE: Record<SeasonalRating, { cell: string; dot: string; label: string }> = {
  peak:  { cell: 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-sm', dot: 'bg-emerald-500', label: 'text-emerald-900' },
  good:  { cell: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200',             dot: 'bg-emerald-400', label: 'text-emerald-800' },
  fair:  { cell: 'bg-amber-50 text-amber-900 ring-1 ring-amber-200',                    dot: 'bg-amber-400',   label: 'text-amber-800' },
  avoid: { cell: 'bg-rose-100 text-rose-900 ring-1 ring-rose-200',                      dot: 'bg-rose-500',    label: 'text-rose-800' },
}

const WARNING_ICON: Record<string, LucideIcon> = {
  summer_calima: Wind,
  summer_heat_coastal: Flame,
  winter_snow_teide: Snowflake,
  winter_swell: Waves,
  winter_wind_fronts: Wind,
  winter_cold_summit: Snowflake,
  winter_road_closures: MountainSnow,
}

type LabelMap = Record<string, string>

export function SeasonalWindowCard({ score: moduleScore, locale }: Props) {
  const props = moduleScore.props as SeasonalWindowProps
  const labels: LabelMap = (TRANSLATIONS[locale] ?? TRANSLATIONS.fr) as LabelMap
  const monthShort = MONTH_SHORT[locale] ?? MONTH_SHORT.fr

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentRating = props.months[currentMonth]

  const bestRange = props.bestWindow
    ? `${monthShort[props.bestWindow.startMonth]}–${monthShort[props.bestWindow.endMonth]}`
    : null
  const avoidRange = props.avoidWindow
    ? `${monthShort[props.avoidWindow.startMonth]}–${monthShort[props.avoidWindow.endMonth]}`
    : null

  return (
    <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-orange-50 to-emerald-50 p-4">
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-emerald-500 p-2 shadow-sm">
          <CalendarRange className="h-4 w-4 text-white" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-neutral-900">
            {labels.title}
          </h3>
          <p className="mt-0.5 text-xs leading-snug text-neutral-700">
            {labels[`reason_${props.primaryReasonKey}`] ?? labels.reason_seasonal_general}
          </p>
        </div>
        <span
          className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
            currentRating === 'peak'
              ? 'bg-emerald-100 text-emerald-800 ring-emerald-200'
              : currentRating === 'good'
                ? 'bg-teal-100 text-teal-800 ring-teal-200'
                : currentRating === 'fair'
                  ? 'bg-amber-100 text-amber-800 ring-amber-200'
                  : 'bg-rose-100 text-rose-800 ring-rose-200'
          }`}
        >
          {labels.now} · {labels[`rating_${currentRating}`]}
        </span>
      </div>

      {/* 12-month grid */}
      <div className="mt-3 grid grid-cols-12 gap-1">
        {props.months.map((rating, i) => {
          const style = RATING_STYLE[rating]
          const isCurrent = i === currentMonth
          return (
            <div
              key={i}
              className={`relative flex flex-col items-center rounded-md py-1.5 text-center ${style.cell} ${
                isCurrent ? 'outline outline-2 outline-offset-1 outline-neutral-900' : ''
              }`}
              title={`${monthShort[i]} · ${labels[`rating_${rating}`]}`}
            >
              <span className="text-[9px] font-bold uppercase leading-none">
                {monthShort[i]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Best-window + avoid-window strip */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {bestRange && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 font-medium text-emerald-800 ring-1 ring-emerald-200">
            <Sun className="h-3 w-3" strokeWidth={2.5} />
            {labels.best_label} {bestRange}
          </span>
        )}
        {avoidRange && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 font-medium text-rose-800 ring-1 ring-rose-200">
            <AlertTriangle className="h-3 w-3" strokeWidth={2.5} />
            {labels.avoid_label} {avoidRange}
          </span>
        )}
      </div>

      {/* Warnings */}
      {props.warningKeys.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {props.warningKeys.slice(0, 3).map((key) => {
            const Icon = WARNING_ICON[key] ?? Eye
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 rounded-md bg-white/70 px-2 py-0.5 text-[11px] font-medium text-amber-900 ring-1 ring-amber-200"
              >
                <Icon className="h-3 w-3" strokeWidth={2.5} />
                {labels[`warn_${key}`] ?? key}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

const MONTH_SHORT: Record<string, string[]> = {
  fr: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  de: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
  it: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
  ru: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    title: 'La bonne saison',
    now: 'Aujourd\'hui',
    best_label: 'Idéal',
    avoid_label: 'À éviter',

    rating_peak: 'Pic',
    rating_good: 'Bon',
    rating_fair: 'Moyen',
    rating_avoid: 'À éviter',

    reason_seasonal_general: 'Variations saisonnières à connaître.',
    reason_seasonal_whales: 'Résidents toute l\'année, mer plus calme au printemps-été.',
    reason_seasonal_sea: 'Eau plus chaude et houle modérée en été.',
    reason_seasonal_surf: 'Houle atlantique la plus régulière en hiver.',
    reason_seasonal_hiking_coastal: 'Sentiers côtiers suffocants de juillet à août.',
    reason_seasonal_hiking_teide: 'Teide : neige en hiver, clarté maximale au printemps et en automne.',
    reason_seasonal_hiking_north: 'Nord et Anaga : beaux sentiers hors creux de l\'hiver.',
    reason_seasonal_stargazing: 'Ciel le plus net de printemps à fin d\'été.',
    reason_seasonal_paragliding: 'Thermiques fiables d\'avril à octobre.',
    reason_seasonal_beach: 'Eau réellement chaude de juin à novembre.',
    reason_seasonal_teide_road: 'Accès routier parfois perturbé par la neige en hiver.',

    warn_summer_calima: 'Calima possible (juin-août)',
    warn_summer_heat_coastal: 'Chaleur forte sur la côte',
    warn_winter_snow_teide: 'Neige au Teide',
    warn_winter_swell: 'Houle d\'hiver',
    warn_winter_wind_fronts: 'Vent de front',
    warn_winter_cold_summit: 'Froid en altitude',
    warn_winter_road_closures: 'Routes fermées (neige)',
  },
  en: {
    title: 'Best season to go',
    now: 'Today',
    best_label: 'Best',
    avoid_label: 'Avoid',

    rating_peak: 'Peak',
    rating_good: 'Good',
    rating_fair: 'Fair',
    rating_avoid: 'Avoid',

    reason_seasonal_general: 'Seasonal variations worth knowing.',
    reason_seasonal_whales: 'Residents year-round, calmer sea in spring-summer.',
    reason_seasonal_sea: 'Warmer water and mild swell from summer onward.',
    reason_seasonal_surf: 'Most consistent Atlantic swell lands in winter.',
    reason_seasonal_hiking_coastal: 'Coastal trails become brutal in July-August.',
    reason_seasonal_hiking_teide: 'Teide: snow in winter, clearest skies in spring and autumn.',
    reason_seasonal_hiking_north: 'North and Anaga: great trails outside deep winter.',
    reason_seasonal_stargazing: 'Clearest skies from spring through late summer.',
    reason_seasonal_paragliding: 'Reliable thermals April through October.',
    reason_seasonal_beach: 'Water actually warm June through November.',
    reason_seasonal_teide_road: 'Road access may close in winter snow events.',

    warn_summer_calima: 'Possible calima (Jun-Aug)',
    warn_summer_heat_coastal: 'Strong coastal heat',
    warn_winter_snow_teide: 'Snow on Teide',
    warn_winter_swell: 'Winter swell',
    warn_winter_wind_fronts: 'Frontal winds',
    warn_winter_cold_summit: 'Cold at altitude',
    warn_winter_road_closures: 'Road closures (snow)',
  },
  es: {
    title: 'Mejor temporada',
    now: 'Hoy',
    best_label: 'Ideal',
    avoid_label: 'Evitar',

    rating_peak: 'Pico',
    rating_good: 'Bueno',
    rating_fair: 'Regular',
    rating_avoid: 'Evitar',

    reason_seasonal_general: 'Variaciones estacionales a tener en cuenta.',
    reason_seasonal_whales: 'Residentes todo el año, mar más tranquilo en primavera-verano.',
    reason_seasonal_sea: 'Agua más cálida y oleaje moderado en verano.',
    reason_seasonal_surf: 'Oleaje atlántico más constante en invierno.',
    reason_seasonal_hiking_coastal: 'Senderos costeros sofocantes en julio-agosto.',
    reason_seasonal_hiking_teide: 'Teide: nieve en invierno, cielos más claros en primavera y otoño.',
    reason_seasonal_hiking_north: 'Norte y Anaga: senderos magníficos fuera del invierno profundo.',
    reason_seasonal_stargazing: 'Cielo más nítido de primavera a final de verano.',
    reason_seasonal_paragliding: 'Térmicas fiables de abril a octubre.',
    reason_seasonal_beach: 'Agua realmente cálida de junio a noviembre.',
    reason_seasonal_teide_road: 'Acceso por carretera a veces cortado por nieve.',

    warn_summer_calima: 'Posible calima (jun-ago)',
    warn_summer_heat_coastal: 'Fuerte calor costero',
    warn_winter_snow_teide: 'Nieve en el Teide',
    warn_winter_swell: 'Oleaje invernal',
    warn_winter_wind_fronts: 'Vientos de frente',
    warn_winter_cold_summit: 'Frío en altitud',
    warn_winter_road_closures: 'Cortes de carretera',
  },
  de: {
    title: 'Beste Reisezeit',
    now: 'Heute',
    best_label: 'Ideal',
    avoid_label: 'Meiden',

    rating_peak: 'Hochsaison',
    rating_good: 'Gut',
    rating_fair: 'Mäßig',
    rating_avoid: 'Meiden',

    reason_seasonal_general: 'Saisonale Schwankungen zu beachten.',
    reason_seasonal_whales: 'Ganzjährig Residente, ruhigere See im Frühjahr-Sommer.',
    reason_seasonal_sea: 'Wärmeres Wasser und milder Seegang ab Sommer.',
    reason_seasonal_surf: 'Konstantester Atlantik-Swell im Winter.',
    reason_seasonal_hiking_coastal: 'Küstenwege im Juli-August brutal.',
    reason_seasonal_hiking_teide: 'Teide: Schnee im Winter, klarste Sicht in Frühling und Herbst.',
    reason_seasonal_hiking_north: 'Norden und Anaga: schöne Wege außerhalb des tiefen Winters.',
    reason_seasonal_stargazing: 'Klarste Sicht von Frühling bis Spätsommer.',
    reason_seasonal_paragliding: 'Zuverlässige Thermik April bis Oktober.',
    reason_seasonal_beach: 'Wasser wirklich warm Juni bis November.',
    reason_seasonal_teide_road: 'Straßenzufahrt bei Schnee gelegentlich gesperrt.',

    warn_summer_calima: 'Mögliche Calima (Jun-Aug)',
    warn_summer_heat_coastal: 'Starke Küstenhitze',
    warn_winter_snow_teide: 'Schnee am Teide',
    warn_winter_swell: 'Winter-Swell',
    warn_winter_wind_fronts: 'Frontwinde',
    warn_winter_cold_summit: 'Kälte in der Höhe',
    warn_winter_road_closures: 'Straßensperrung (Schnee)',
  },
  it: {
    title: 'Miglior stagione',
    now: 'Oggi',
    best_label: 'Ideale',
    avoid_label: 'Da evitare',

    rating_peak: 'Picco',
    rating_good: 'Buono',
    rating_fair: 'Medio',
    rating_avoid: 'Da evitare',

    reason_seasonal_general: 'Variazioni stagionali da conoscere.',
    reason_seasonal_whales: 'Residenti tutto l\'anno, mare più calmo in primavera-estate.',
    reason_seasonal_sea: 'Acqua più calda e onda moderata dall\'estate.',
    reason_seasonal_surf: 'Onda atlantica più regolare in inverno.',
    reason_seasonal_hiking_coastal: 'Sentieri costieri soffocanti a luglio-agosto.',
    reason_seasonal_hiking_teide: 'Teide: neve in inverno, massima limpidezza in primavera e autunno.',
    reason_seasonal_hiking_north: 'Nord e Anaga: sentieri ottimi fuori dal pieno inverno.',
    reason_seasonal_stargazing: 'Cielo più limpido dalla primavera a fine estate.',
    reason_seasonal_paragliding: 'Termiche affidabili da aprile a ottobre.',
    reason_seasonal_beach: 'Acqua davvero calda da giugno a novembre.',
    reason_seasonal_teide_road: 'Accesso stradale a volte chiuso per neve.',

    warn_summer_calima: 'Calima possibile (giu-ago)',
    warn_summer_heat_coastal: 'Forte caldo costiero',
    warn_winter_snow_teide: 'Neve sul Teide',
    warn_winter_swell: 'Onda invernale',
    warn_winter_wind_fronts: 'Venti frontali',
    warn_winter_cold_summit: 'Freddo in quota',
    warn_winter_road_closures: 'Strade chiuse (neve)',
  },
  ru: {
    title: 'Лучший сезон',
    now: 'Сегодня',
    best_label: 'Идеально',
    avoid_label: 'Избегать',

    rating_peak: 'Пик',
    rating_good: 'Хорошо',
    rating_fair: 'Средне',
    rating_avoid: 'Избегать',

    reason_seasonal_general: 'Сезонные отличия, о которых стоит знать.',
    reason_seasonal_whales: 'Резиденты круглый год, море спокойнее весной-летом.',
    reason_seasonal_sea: 'Более тёплая вода и умеренная волна летом.',
    reason_seasonal_surf: 'Самая стабильная атлантическая зыбь — зимой.',
    reason_seasonal_hiking_coastal: 'Прибрежные тропы душат в июле-августе.',
    reason_seasonal_hiking_teide: 'Тейде: снег зимой, ярчайшее небо весной и осенью.',
    reason_seasonal_hiking_north: 'Север и Анага: хорошие тропы вне пика зимы.',
    reason_seasonal_stargazing: 'Самое чистое небо с весны до конца лета.',
    reason_seasonal_paragliding: 'Надёжные термики с апреля по октябрь.',
    reason_seasonal_beach: 'Вода по-настоящему тёплая с июня по ноябрь.',
    reason_seasonal_teide_road: 'Дорога иногда перекрыта из-за снега.',

    warn_summer_calima: 'Возможна калима (июн-авг)',
    warn_summer_heat_coastal: 'Сильная прибрежная жара',
    warn_winter_snow_teide: 'Снег на Тейде',
    warn_winter_swell: 'Зимняя зыбь',
    warn_winter_wind_fronts: 'Фронтальные ветра',
    warn_winter_cold_summit: 'Холод в горах',
    warn_winter_road_closures: 'Закрытие дорог (снег)',
  },
}
