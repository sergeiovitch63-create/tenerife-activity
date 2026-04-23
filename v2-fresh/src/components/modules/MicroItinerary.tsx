/**
 * Micro-itinerary card — "Your day, in 3 steps"
 *
 * Pure presentational component. Step-building lives in
 * `src/lib/personalize/scorers/micro-itinerary.ts`.
 */

import {
  Sunrise, Sun as SunIcon, Sunset as SunsetIcon, Moon,
  Coffee, Utensils, Bed, MapPin, Sparkles, CalendarClock,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ModuleScore, ActivitySignals } from '@/lib/personalize/types'
import type {
  ItineraryStep,
  ItineraryIconName,
} from '@/lib/personalize/scorers/micro-itinerary'

const ICON_MAP: Record<ItineraryIconName, LucideIcon> = {
  Sunrise,
  Sun: SunIcon,
  Sunset: SunsetIcon,
  Moon,
  Coffee,
  Utensils,
  Bed,
  MapPin,
  Sparkles,
  CalendarClock,
}

type Props = {
  signals: ActivitySignals
  score: ModuleScore
  locale: string
}

export function MicroItineraryCard({ score: moduleScore, locale }: Props) {
  const props = moduleScore.props as { steps: ItineraryStep[] }
  const labels = TRANSLATIONS[locale] ?? TRANSLATIONS.fr

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 rounded-2xl bg-gradient-to-br from-teal-500 to-sky-600 p-2.5 shadow-sm">
          <CalendarClock className="h-5 w-5 text-white" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-neutral-900">{labels.title}</h3>
          <p className="mt-0.5 text-sm text-neutral-600">{labels.subtitle}</p>

          <ol className="mt-4 relative space-y-3 pl-0">
            {props.steps.map((step, i) => {
              const Icon = ICON_MAP[step.icon] ?? CalendarClock
              const isLast = i === props.steps.length - 1
              const timeText = resolve(labels, step.timeKey, step.timeParams)
              const bodyText = resolve(labels, step.textKey, step.textParams)

              return (
                <li key={step.key} className="relative flex gap-3">
                  {!isLast && (
                    <span className="absolute left-[15px] top-8 bottom-[-14px] w-px bg-gradient-to-b from-teal-200 to-transparent" />
                  )}
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-teal-50 ring-1 ring-teal-200">
                    <Icon className="h-4 w-4 text-teal-600" strokeWidth={2.25} />
                  </div>
                  <div className="flex-1 pt-0.5">
                    <div className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                      {timeText}
                    </div>
                    <p className="mt-0.5 text-sm text-neutral-800">{bodyText}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </div>
  )
}

function resolve(
  labels: Record<string, string>,
  key: string,
  params?: Record<string, string | number>,
): string {
  const raw = labels[key] ?? key
  if (!params) return raw
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''))
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    title: 'Votre journée, en 3 temps',
    subtitle: 'Un plan simple pour glisser cette activité dans votre programme.',

    // Time labels
    timeBeforeSunset: 'Fin d\'après-midi',
    timeEarlyMorning: 'Matin',
    timeMorningSlot: 'Matinée',
    timeBeforeGeneric: 'Avant',
    timeDuringRange: '{range}',
    timeDuringActivity: 'Pendant l\'activité',
    timeLateEvening: 'Retour tardif',
    timeAfternoonSlot: 'Après-midi',
    timeAfterGeneric: 'Après',

    // Body copy
    restBeforeSunset: 'Repos à l\'hôtel, hydratation, vêtements chauds pour le soir.',
    quickBreakfast: 'Petit-déjeuner léger et café avant de rejoindre le point de départ.',
    duringGeneric: 'Profitez pleinement de votre expérience ({duration}).',
    duringFullDay: 'Une journée complète dédiée à cette expérience ({duration}).',
    duringShort: 'Un moment court mais intense ({duration}).',
    duringSunset: 'Le cœur de votre soirée ({duration}).',
    restAfterLong: 'Dîner léger et grasse matinée prévue le lendemain.',

    // Zone-flavoured
    beforeSouth: 'Baignade ou brunch sur la côte sud (Los Cristianos, Playa del Duque).',
    afterSouth: 'Déjeuner en bord de mer, après-midi détente à la plage.',
    beforeNorth: 'Promenade à La Orotava ou café dans le centre historique.',
    afterNorth: 'Balade à Puerto de la Cruz, dîner face à l\'océan.',
    beforeWest: 'Départ tôt depuis Los Gigantes ou Santiago del Teide.',
    afterWest: 'Couchers sur Masca ou apéritif face aux falaises.',
    beforeCenter: 'Route tranquille par Vilaflor, collation en altitude.',
    afterCenter: 'Redescente douce, repas au retour sur la côte.',
    beforeEast: 'Petit-déjeuner à Santa Cruz ou Anaga.',
    afterEast: 'Tapas à Santa Cruz ou visite de La Laguna.',
    beforeGeneric: 'Démarrez en douceur, café et ravitaillement.',
    afterGeneric: 'Prévoyez un repas et une pause détente.',
  },
  en: {
    title: 'Your day, in 3 steps',
    subtitle: 'A simple plan to slot this activity into your schedule.',
    timeBeforeSunset: 'Late afternoon',
    timeEarlyMorning: 'Morning',
    timeMorningSlot: 'Morning',
    timeBeforeGeneric: 'Before',
    timeDuringRange: '{range}',
    timeDuringActivity: 'During the activity',
    timeLateEvening: 'Late return',
    timeAfternoonSlot: 'Afternoon',
    timeAfterGeneric: 'After',
    restBeforeSunset: 'Rest at the hotel, hydrate, pack warm layers for the evening.',
    quickBreakfast: 'Light breakfast and coffee before heading to the meeting point.',
    duringGeneric: 'Fully enjoy your experience ({duration}).',
    duringFullDay: 'A full day dedicated to this experience ({duration}).',
    duringShort: 'A short but intense slot ({duration}).',
    duringSunset: 'The heart of your evening ({duration}).',
    restAfterLong: 'Light dinner and plan a lazy morning the next day.',
    beforeSouth: 'Swim or brunch on the south coast (Los Cristianos, Playa del Duque).',
    afterSouth: 'Seaside lunch, relaxed beach afternoon.',
    beforeNorth: 'Stroll around La Orotava or a café in the old town.',
    afterNorth: 'Walk in Puerto de la Cruz, ocean-front dinner.',
    beforeWest: 'Early start from Los Gigantes or Santiago del Teide.',
    afterWest: 'Sunset over Masca or an apéro by the cliffs.',
    beforeCenter: 'Quiet drive through Vilaflor, snack at altitude.',
    afterCenter: 'Easy descent, meal back on the coast.',
    beforeEast: 'Breakfast in Santa Cruz or Anaga.',
    afterEast: 'Tapas in Santa Cruz or a walk through La Laguna.',
    beforeGeneric: 'Start easy, coffee and a quick top-up.',
    afterGeneric: 'Plan a meal and some downtime.',
  },
  es: {
    title: 'Tu día, en 3 tiempos',
    subtitle: 'Un plan sencillo para encajar esta actividad en tu agenda.',
    timeBeforeSunset: 'Final de la tarde',
    timeEarlyMorning: 'Mañana',
    timeMorningSlot: 'Mañana',
    timeBeforeGeneric: 'Antes',
    timeDuringRange: '{range}',
    timeDuringActivity: 'Durante la actividad',
    timeLateEvening: 'Regreso tardío',
    timeAfternoonSlot: 'Tarde',
    timeAfterGeneric: 'Después',
    restBeforeSunset: 'Descansa en el hotel, hidrátate y prepara abrigo.',
    quickBreakfast: 'Desayuno ligero y café antes del punto de encuentro.',
    duringGeneric: 'Disfruta plenamente tu experiencia ({duration}).',
    duringFullDay: 'Un día completo dedicado a esta experiencia ({duration}).',
    duringShort: 'Un rato corto pero intenso ({duration}).',
    duringSunset: 'El centro de tu velada ({duration}).',
    restAfterLong: 'Cena ligera y mañana tranquila al día siguiente.',
    beforeSouth: 'Baño o brunch en la costa sur (Los Cristianos, Playa del Duque).',
    afterSouth: 'Almuerzo junto al mar, tarde en la playa.',
    beforeNorth: 'Paseo por La Orotava o café en el casco histórico.',
    afterNorth: 'Paseo por Puerto de la Cruz, cena frente al océano.',
    beforeWest: 'Salida temprano desde Los Gigantes o Santiago del Teide.',
    afterWest: 'Atardecer sobre Masca o aperitivo junto a los acantilados.',
    beforeCenter: 'Ruta tranquila por Vilaflor, snack en altitud.',
    afterCenter: 'Descenso suave, comida al volver a la costa.',
    beforeEast: 'Desayuno en Santa Cruz o Anaga.',
    afterEast: 'Tapas en Santa Cruz o visita a La Laguna.',
    beforeGeneric: 'Arranca suave, café y avituallamiento.',
    afterGeneric: 'Prevé una comida y un descanso.',
  },
  de: {
    title: 'Ihr Tag in drei Schritten',
    subtitle: 'Ein einfacher Plan, um diese Aktivität einzubauen.',
    timeBeforeSunset: 'Später Nachmittag',
    timeEarlyMorning: 'Morgens',
    timeMorningSlot: 'Vormittag',
    timeBeforeGeneric: 'Vorher',
    timeDuringRange: '{range}',
    timeDuringActivity: 'Während der Aktivität',
    timeLateEvening: 'Späte Rückkehr',
    timeAfternoonSlot: 'Nachmittag',
    timeAfterGeneric: 'Danach',
    restBeforeSunset: 'Im Hotel ausruhen, trinken, warme Kleidung einpacken.',
    quickBreakfast: 'Leichtes Frühstück und Kaffee vor dem Treffpunkt.',
    duringGeneric: 'Genießen Sie Ihr Erlebnis ({duration}).',
    duringFullDay: 'Ein ganzer Tag für dieses Erlebnis ({duration}).',
    duringShort: 'Ein kurzer, intensiver Slot ({duration}).',
    duringSunset: 'Das Herzstück Ihres Abends ({duration}).',
    restAfterLong: 'Leichtes Abendessen, am nächsten Morgen ausschlafen.',
    beforeSouth: 'Baden oder Brunch an der Südküste (Los Cristianos, Playa del Duque).',
    afterSouth: 'Mittagessen am Meer, entspannter Strandnachmittag.',
    beforeNorth: 'Spaziergang durch La Orotava oder Café in der Altstadt.',
    afterNorth: 'Bummel in Puerto de la Cruz, Abendessen am Meer.',
    beforeWest: 'Früher Start von Los Gigantes oder Santiago del Teide.',
    afterWest: 'Sonnenuntergang über Masca oder Aperitif an den Klippen.',
    beforeCenter: 'Ruhige Fahrt über Vilaflor, Snack in der Höhe.',
    afterCenter: 'Sanfte Abfahrt, Essen an der Küste.',
    beforeEast: 'Frühstück in Santa Cruz oder Anaga.',
    afterEast: 'Tapas in Santa Cruz oder ein Bummel durch La Laguna.',
    beforeGeneric: 'Locker starten, Kaffee und Proviant.',
    afterGeneric: 'Planen Sie eine Mahlzeit und eine Pause.',
  },
  it: {
    title: 'La tua giornata in 3 tempi',
    subtitle: 'Un piano semplice per inserire questa attività nel programma.',
    timeBeforeSunset: 'Tardo pomeriggio',
    timeEarlyMorning: 'Mattina',
    timeMorningSlot: 'Mattinata',
    timeBeforeGeneric: 'Prima',
    timeDuringRange: '{range}',
    timeDuringActivity: 'Durante l\'attività',
    timeLateEvening: 'Rientro tardivo',
    timeAfternoonSlot: 'Pomeriggio',
    timeAfterGeneric: 'Dopo',
    restBeforeSunset: 'Riposo in hotel, idratazione, abiti caldi per la sera.',
    quickBreakfast: 'Colazione leggera e caffè prima del punto d\'incontro.',
    duringGeneric: 'Godetevi a pieno l\'esperienza ({duration}).',
    duringFullDay: 'Una giornata intera dedicata a questa esperienza ({duration}).',
    duringShort: 'Un momento breve ma intenso ({duration}).',
    duringSunset: 'Il cuore della vostra serata ({duration}).',
    restAfterLong: 'Cena leggera e mattinata tranquilla il giorno dopo.',
    beforeSouth: 'Bagno o brunch sulla costa sud (Los Cristianos, Playa del Duque).',
    afterSouth: 'Pranzo in riva al mare, pomeriggio in spiaggia.',
    beforeNorth: 'Passeggiata a La Orotava o caffè nel centro storico.',
    afterNorth: 'Giro a Puerto de la Cruz, cena fronte oceano.',
    beforeWest: 'Partenza presto da Los Gigantes o Santiago del Teide.',
    afterWest: 'Tramonto su Masca o aperitivo sulle scogliere.',
    beforeCenter: 'Strada tranquilla per Vilaflor, snack in quota.',
    afterCenter: 'Discesa dolce, pasto al rientro sulla costa.',
    beforeEast: 'Colazione a Santa Cruz o Anaga.',
    afterEast: 'Tapas a Santa Cruz o visita a La Laguna.',
    beforeGeneric: 'Parti con calma, caffè e rifornimento.',
    afterGeneric: 'Pianifica un pasto e una pausa.',
  },
  ru: {
    title: 'Ваш день в 3 шага',
    subtitle: 'Простой план, чтобы вписать активность в программу.',
    timeBeforeSunset: 'Поздний день',
    timeEarlyMorning: 'Утро',
    timeMorningSlot: 'Первая половина дня',
    timeBeforeGeneric: 'До',
    timeDuringRange: '{range}',
    timeDuringActivity: 'Во время активности',
    timeLateEvening: 'Позднее возвращение',
    timeAfternoonSlot: 'Вторая половина дня',
    timeAfterGeneric: 'После',
    restBeforeSunset: 'Отдых в отеле, вода, тёплая одежда на вечер.',
    quickBreakfast: 'Лёгкий завтрак и кофе перед точкой встречи.',
    duringGeneric: 'Полностью погрузитесь в опыт ({duration}).',
    duringFullDay: 'Целый день, посвящённый этому опыту ({duration}).',
    duringShort: 'Короткий, но насыщенный момент ({duration}).',
    duringSunset: 'Главное событие вашего вечера ({duration}).',
    restAfterLong: 'Лёгкий ужин и неторопливое утро на следующий день.',
    beforeSouth: 'Купание или бранч на юге (Los Cristianos, Playa del Duque).',
    afterSouth: 'Обед у моря, расслабленный пляжный полдень.',
    beforeNorth: 'Прогулка по La Orotava или кофе в старом центре.',
    afterNorth: 'Пуэрто-де-ла-Крус и ужин с видом на океан.',
    beforeWest: 'Ранний старт из Лос-Хигантес или Сантьяго-дель-Тейде.',
    afterWest: 'Закат над Маской или аперитив у скал.',
    beforeCenter: 'Спокойная дорога через Вилафлор, перекус на высоте.',
    afterCenter: 'Мягкий спуск, ужин уже на побережье.',
    beforeEast: 'Завтрак в Санта-Крус или Анаге.',
    afterEast: 'Тапас в Санта-Крус или прогулка по Ла-Лагуне.',
    beforeGeneric: 'Мягкий старт, кофе и перекус.',
    afterGeneric: 'Предусмотрите приём пищи и паузу.',
  },
}
