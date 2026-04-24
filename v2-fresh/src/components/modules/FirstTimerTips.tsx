/**
 * First-Timer-Tips card — "the things first-timers wish they'd known"
 *
 * Left-tertiary. 2–3 concise practical tips drawn from a fixed catalogue,
 * filtered by signals in `src/lib/personalize/scorers/first-timer-tips.ts`.
 */

import {
  Lightbulb,
  Droplets,
  Snowflake,
  SunDim,
  Car,
  Ticket,
  Waves,
  Shirt,
  Eye,
  Cookie,
  Clock8,
  Map,
  Users,
  AlertCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ModuleScore, ActivitySignals } from '@/lib/personalize/types'
import type {
  FirstTimerTipsProps,
  TipKey,
} from '@/lib/personalize/scorers/first-timer-tips'

type Props = {
  signals: ActivitySignals
  score: ModuleScore
  locale: string
}

const TIP_ICON: Record<TipKey, LucideIcon> = {
  'altitude-hydrate': Droplets,
  'altitude-cold-at-summit': Snowflake,
  'sun-protection-south': SunDim,
  'rental-car-needed': Car,
  'teide-cable-car-reserve': Ticket,
  'seasickness-band': Waves,
  'wetsuit-included': Shirt,
  'calima-reschedule': Eye,
  'long-day-snacks': Cookie,
  'zone-transit-time': Clock8,
  'early-arrival-buffer': Clock8,
  'offline-map-download': Map,
  'small-group-sold-out': Users,
}

type LabelMap = Record<string, string>

export function FirstTimerTipsCard({ score: moduleScore, locale }: Props) {
  const props = moduleScore.props as FirstTimerTipsProps
  const labels: LabelMap = (TRANSLATIONS[locale] ?? TRANSLATIONS.fr) as LabelMap

  return (
    <div className="rounded-2xl border border-yellow-200/70 bg-gradient-to-br from-yellow-50 to-amber-50 p-4">
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 p-2 shadow-sm">
          <Lightbulb className="h-4 w-4 text-white" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-neutral-900">
            {labels.title}
          </h3>
          <p className="mt-0.5 text-xs leading-snug text-amber-900/80">
            {labels.subtitle}
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {props.tips.map((tip) => {
          const Icon = TIP_ICON[tip.key] ?? AlertCircle
          return (
            <li key={tip.key} className="flex items-start gap-2.5 rounded-xl bg-white/70 p-2.5 ring-1 ring-amber-100">
              <div className="mt-0.5 flex-shrink-0 rounded-md bg-gradient-to-br from-yellow-500 to-amber-500 p-1 shadow-sm">
                <Icon className="h-3 w-3 text-white" strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-xs font-semibold text-neutral-900">
                  {labels[`tip_${tip.key}_title`] ?? tip.key}
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-700">
                  {labels[`tip_${tip.key}_body`] ?? ''}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    title: 'À savoir avant de partir',
    subtitle: 'Les détails qu\'un habitué aurait en tête.',

    'tip_altitude-hydrate_title': 'Hydratez-vous en altitude',
    'tip_altitude-hydrate_body': 'Au-dessus de 2 000 m, la déshydratation surprend. Prévoyez 1,5 L d\'eau par personne.',
    'tip_altitude-cold-at-summit_title': 'Froid au sommet',
    'tip_altitude-cold-at-summit_body': 'Il peut faire 10-20 °C de moins qu\'au niveau de la mer. Coupe-vent et couche chaude.',
    'tip_sun-protection-south_title': 'Soleil plus fort qu\'il n\'en a l\'air',
    'tip_sun-protection-south_body': 'Crème SPF 50+, casquette, lunettes. Les nuages trompent mais ne filtrent pas.',
    'tip_rental-car-needed_title': 'Voiture quasi indispensable',
    'tip_rental-car-needed_body': 'Pas de pickup et zone peu desservie : louez pour la journée ou envisagez un taxi partagé.',
    'tip_teide-cable-car-reserve_title': 'Téléphérique du Teide à réserver',
    'tip_teide-cable-car-reserve_body': 'Les créneaux partent vite en haute saison. Réservation en ligne recommandée.',
    'tip_seasickness-band_title': 'Bracelet anti-mal-de-mer',
    'tip_seasickness-band_body': 'Même par temps calme, la houle atlantique prend 1 passager sur 4. Bracelet ou médicament.',
    'tip_wetsuit-included_title': 'Combinaison fournie',
    'tip_wetsuit-included_body': 'Le néoprène est inclus. Apportez juste votre maillot et une serviette.',
    'tip_calima-reschedule_title': 'En cas de calima, reportez',
    'tip_calima-reschedule_body': 'Vent de sable saharien : visibilité faible, activité souvent moins belle. Reportez si possible.',
    'tip_long-day-snacks_title': 'Encas pour la journée',
    'tip_long-day-snacks_body': 'Pas de repas inclus et sortie longue : fruits secs, barre, eau. Minimarket rare en altitude.',
    'tip_zone-transit-time_title': 'Temps de trajet à compter',
    'tip_zone-transit-time_body': 'Sans ramassage, ajoutez 1 h à 1 h 30 de route dans chaque sens depuis le sud.',
    'tip_early-arrival-buffer_title': 'Arrivez 15 min en avance',
    'tip_early-arrival-buffer_body': 'Départs de groupe ponctuels. Parking et briefing prennent du temps.',
    'tip_offline-map-download_title': 'Carte hors ligne',
    'tip_offline-map-download_body': 'Couverture 4G partielle en montagne. Téléchargez la zone dans Maps avant de partir.',
    'tip_small-group-sold-out_title': 'Petits groupes — pensez à bloquer',
    'tip_small-group-sold-out_body': 'Peu de créneaux dans la semaine : réservez dès que votre date est calée.',
  },
  en: {
    title: 'What first-timers wish they knew',
    subtitle: 'The small details a regular already has in mind.',

    'tip_altitude-hydrate_title': 'Hydrate at altitude',
    'tip_altitude-hydrate_body': 'Above 2,000 m dehydration creeps up. Plan 1.5 L water per person.',
    'tip_altitude-cold-at-summit_title': 'Cold at the summit',
    'tip_altitude-cold-at-summit_body': 'Can be 10-20 °C colder than the coast. Windbreaker + warm layer.',
    'tip_sun-protection-south_title': 'Sun is stronger than it looks',
    'tip_sun-protection-south_body': 'SPF 50+, hat, sunglasses. Clouds can fool you but barely filter UV.',
    'tip_rental-car-needed_title': 'Rental car nearly essential',
    'tip_rental-car-needed_body': 'No pickup and a low-transit zone: rent a car for the day or plan a shared taxi.',
    'tip_teide-cable-car-reserve_title': 'Book the Teide cable-car',
    'tip_teide-cable-car-reserve_body': 'Slots sell out in peak season. Online reservation strongly recommended.',
    'tip_seasickness-band_title': 'Seasickness band',
    'tip_seasickness-band_body': 'Even on calm days the Atlantic swell hits 1 in 4 guests. Band or meds help.',
    'tip_wetsuit-included_title': 'Wetsuit included',
    'tip_wetsuit-included_body': 'Neoprene is provided. Bring just your swimsuit and a towel.',
    'tip_calima-reschedule_title': 'If calima, reschedule',
    'tip_calima-reschedule_body': 'Sahara dust event: low visibility, activity often underwhelming. Postpone if you can.',
    'tip_long-day-snacks_title': 'Snacks for the day',
    'tip_long-day-snacks_body': 'No meal included and a long outing: nuts, bar, water. Mini-markets rare at altitude.',
    'tip_zone-transit-time_title': 'Factor in the drive',
    'tip_zone-transit-time_body': 'Without pickup, add 1–1.5 h each way from the south.',
    'tip_early-arrival-buffer_title': 'Arrive 15 min early',
    'tip_early-arrival-buffer_body': 'Group departures leave on time. Parking + briefing eat into the window.',
    'tip_offline-map-download_title': 'Offline map',
    'tip_offline-map-download_body': 'Patchy 4G in the mountains. Download the area in Maps beforehand.',
    'tip_small-group-sold-out_title': 'Small groups — lock in early',
    'tip_small-group-sold-out_body': 'Few weekly slots. Book as soon as your date is fixed.',
  },
  es: {
    title: 'Lo que un primerizo agradece saber',
    subtitle: 'Los pequeños detalles que un habitual ya tiene en mente.',

    'tip_altitude-hydrate_title': 'Hidrátate en altura',
    'tip_altitude-hydrate_body': 'Por encima de 2.000 m la deshidratación sorprende. 1,5 L de agua por persona.',
    'tip_altitude-cold-at-summit_title': 'Frío en la cumbre',
    'tip_altitude-cold-at-summit_body': 'Puede hacer 10-20 °C menos que en la costa. Cortavientos + capa cálida.',
    'tip_sun-protection-south_title': 'El sol pega más de lo que parece',
    'tip_sun-protection-south_body': 'SPF 50+, gorra, gafas. Las nubes engañan pero apenas filtran los UV.',
    'tip_rental-car-needed_title': 'Coche casi imprescindible',
    'tip_rental-car-needed_body': 'Sin pickup y zona poco conectada: alquila por el día o taxi compartido.',
    'tip_teide-cable-car-reserve_title': 'Reserva el teleférico del Teide',
    'tip_teide-cable-car-reserve_body': 'Las franjas se agotan en temporada alta. Reserva online muy recomendable.',
    'tip_seasickness-band_title': 'Pulsera antimareo',
    'tip_seasickness-band_body': 'Incluso con mar en calma, el oleaje atlántico toca a 1 de cada 4. Pulsera o pastilla.',
    'tip_wetsuit-included_title': 'Traje de neopreno incluido',
    'tip_wetsuit-included_body': 'El neopreno está incluido. Trae solo bañador y toalla.',
    'tip_calima-reschedule_title': 'Si hay calima, aplázalo',
    'tip_calima-reschedule_body': 'Polvo sahariano: poca visibilidad, experiencia menos lucida. Aplaza si puedes.',
    'tip_long-day-snacks_title': 'Snacks para la jornada',
    'tip_long-day-snacks_body': 'Sin comida incluida y salida larga: frutos secos, barrita, agua. Tiendas escasas en altura.',
    'tip_zone-transit-time_title': 'Cuenta con el trayecto',
    'tip_zone-transit-time_body': 'Sin pickup, suma 1-1,5 h de ida y otra de vuelta desde el sur.',
    'tip_early-arrival-buffer_title': 'Llega 15 min antes',
    'tip_early-arrival-buffer_body': 'Las salidas grupales arrancan a la hora. Parking + briefing consumen el margen.',
    'tip_offline-map-download_title': 'Mapa offline',
    'tip_offline-map-download_body': 'Cobertura 4G irregular en la montaña. Descarga la zona en Maps antes.',
    'tip_small-group-sold-out_title': 'Grupos pequeños — bloquea pronto',
    'tip_small-group-sold-out_body': 'Pocas franjas semanales. Reserva en cuanto fijes la fecha.',
  },
  de: {
    title: 'Was Erstbesucher wissen sollten',
    subtitle: 'Die kleinen Dinge, die Stammgäste ohnehin kennen.',

    'tip_altitude-hydrate_title': 'In der Höhe hydrieren',
    'tip_altitude-hydrate_body': 'Über 2.000 m schleicht Dehydration. 1,5 L Wasser pro Person einplanen.',
    'tip_altitude-cold-at-summit_title': 'Kälte am Gipfel',
    'tip_altitude-cold-at-summit_body': '10–20 °C kälter als an der Küste möglich. Windbreaker + warme Schicht.',
    'tip_sun-protection-south_title': 'Sonne täuscht',
    'tip_sun-protection-south_body': 'SPF 50+, Kappe, Sonnenbrille. Wolken filtern kaum UV.',
    'tip_rental-car-needed_title': 'Mietwagen fast Pflicht',
    'tip_rental-car-needed_body': 'Kein Pickup, Zone schwach angebunden: für den Tag mieten oder Sammel-Taxi.',
    'tip_teide-cable-car-reserve_title': 'Teide-Seilbahn reservieren',
    'tip_teide-cable-car-reserve_body': 'Slots sind in der Hochsaison schnell weg. Online-Reservierung empfohlen.',
    'tip_seasickness-band_title': 'Seekrankheitsband',
    'tip_seasickness-band_body': 'Auch bei ruhiger See: Atlantik-Dünung trifft 1 von 4. Band oder Tablette hilft.',
    'tip_wetsuit-included_title': 'Neoprenanzug inklusive',
    'tip_wetsuit-included_body': 'Neopren ist gestellt. Nur Badesachen und Handtuch mitbringen.',
    'tip_calima-reschedule_title': 'Bei Calima verschieben',
    'tip_calima-reschedule_body': 'Sahara-Staub: Sicht gering, Erlebnis oft gedämpft. Wenn möglich verlegen.',
    'tip_long-day-snacks_title': 'Snacks für den Tag',
    'tip_long-day-snacks_body': 'Ohne Essen, langer Ausflug: Nüsse, Riegel, Wasser. Oben kaum Läden.',
    'tip_zone-transit-time_title': 'Anfahrt einplanen',
    'tip_zone-transit-time_body': 'Ohne Pickup: +1–1,5 h pro Richtung ab dem Süden.',
    'tip_early-arrival-buffer_title': '15 min früher da sein',
    'tip_early-arrival-buffer_body': 'Gruppenabfahrten sind pünktlich. Parken + Briefing fressen den Puffer.',
    'tip_offline-map-download_title': 'Offline-Karte',
    'tip_offline-map-download_body': '4G in den Bergen lückenhaft. Gebiet vorab in Maps laden.',
    'tip_small-group-sold-out_title': 'Kleine Gruppen — früh buchen',
    'tip_small-group-sold-out_body': 'Wenige Slots pro Woche. Sobald das Datum steht, fixieren.',
  },
  it: {
    title: 'Quello che i primi visitatori vorrebbero sapere',
    subtitle: 'I piccoli dettagli che un abituale ha già in mente.',

    'tip_altitude-hydrate_title': 'Idratati in altitudine',
    'tip_altitude-hydrate_body': 'Oltre i 2.000 m la disidratazione sorprende. 1,5 L d\'acqua a persona.',
    'tip_altitude-cold-at-summit_title': 'Freddo in vetta',
    'tip_altitude-cold-at-summit_body': 'Può fare 10-20 °C in meno che sulla costa. Antivento + strato caldo.',
    'tip_sun-protection-south_title': 'Il sole picchia più di quanto sembri',
    'tip_sun-protection-south_body': 'SPF 50+, cappellino, occhiali. Le nuvole ingannano e filtrano poco gli UV.',
    'tip_rental-car-needed_title': 'Auto quasi indispensabile',
    'tip_rental-car-needed_body': 'Senza pickup e zona poco servita: noleggia per la giornata o taxi condiviso.',
    'tip_teide-cable-car-reserve_title': 'Prenota la funivia del Teide',
    'tip_teide-cable-car-reserve_body': 'In alta stagione i posti volano. Prenotazione online consigliata.',
    'tip_seasickness-band_title': 'Braccialetto antinausea',
    'tip_seasickness-band_body': 'Anche con mare calmo l\'onda atlantica colpisce 1 su 4. Braccialetto o pastiglia.',
    'tip_wetsuit-included_title': 'Muta inclusa',
    'tip_wetsuit-included_body': 'Il neoprene è compreso. Porta solo costume e asciugamano.',
    'tip_calima-reschedule_title': 'Con calima, rinvia',
    'tip_calima-reschedule_body': 'Polvere sahariana: poca visibilità, esperienza spenta. Rinvia se puoi.',
    'tip_long-day-snacks_title': 'Snack per la giornata',
    'tip_long-day-snacks_body': 'Senza pasto incluso e uscita lunga: frutta secca, barretta, acqua. Pochi negozi in quota.',
    'tip_zone-transit-time_title': 'Calcola il tragitto',
    'tip_zone-transit-time_body': 'Senza pickup, +1-1,5 h per senso dal sud.',
    'tip_early-arrival-buffer_title': 'Arriva 15 min prima',
    'tip_early-arrival-buffer_body': 'Le partenze di gruppo sono puntuali. Parcheggio + briefing erodono il margine.',
    'tip_offline-map-download_title': 'Mappa offline',
    'tip_offline-map-download_body': 'Copertura 4G incerta in montagna. Scarica la zona in Maps prima.',
    'tip_small-group-sold-out_title': 'Gruppi piccoli — blocca presto',
    'tip_small-group-sold-out_body': 'Pochi slot settimanali. Prenota appena hai la data.',
  },
  ru: {
    title: 'Что хотели бы знать новички',
    subtitle: 'Детали, которые завсегдатай учитывает по умолчанию.',

    'tip_altitude-hydrate_title': 'Пейте воду в горах',
    'tip_altitude-hydrate_body': 'Выше 2 000 м обезвоживание подкрадывается незаметно. 1,5 л воды на человека.',
    'tip_altitude-cold-at-summit_title': 'Холод на вершине',
    'tip_altitude-cold-at-summit_body': 'Может быть на 10-20 °C холоднее, чем на побережье. Ветровка + тёплый слой.',
    'tip_sun-protection-south_title': 'Солнце сильнее, чем кажется',
    'tip_sun-protection-south_body': 'SPF 50+, кепка, очки. Облака обманчивы — УФ почти не задерживают.',
    'tip_rental-car-needed_title': 'Машина почти обязательна',
    'tip_rental-car-needed_body': 'Нет трансфера и зона плохо связана: арендуйте на день или совместное такси.',
    'tip_teide-cable-car-reserve_title': 'Забронируйте канатку Тейде',
    'tip_teide-cable-car-reserve_body': 'В сезон слоты быстро кончаются. Онлайн-бронь рекомендуется.',
    'tip_seasickness-band_title': 'Браслет от укачивания',
    'tip_seasickness-band_body': 'Даже в штиль атлантическая волна настигает 1 из 4. Браслет или таблетка.',
    'tip_wetsuit-included_title': 'Гидрокостюм включён',
    'tip_wetsuit-included_body': 'Неопрен предоставляется. Возьмите купальник и полотенце.',
    'tip_calima-reschedule_title': 'При калиме — перенесите',
    'tip_calima-reschedule_body': 'Сахарская пыль: плохая видимость, впечатление не то. Если можно — отложить.',
    'tip_long-day-snacks_title': 'Перекус на день',
    'tip_long-day-snacks_body': 'Без еды в пакете и долгий выезд: орехи, батончик, вода. В горах магазинов мало.',
    'tip_zone-transit-time_title': 'Заложите время в дорогу',
    'tip_zone-transit-time_body': 'Без трансфера добавьте 1-1,5 ч в одну сторону с юга.',
    'tip_early-arrival-buffer_title': 'Приезжайте за 15 мин',
    'tip_early-arrival-buffer_body': 'Групповые выезды пунктуальны. Парковка + брифинг съедают запас.',
    'tip_offline-map-download_title': 'Офлайн-карта',
    'tip_offline-map-download_body': '4G в горах нестабилен. Скачайте район в Maps заранее.',
    'tip_small-group-sold-out_title': 'Малые группы — бронируйте рано',
    'tip_small-group-sold-out_body': 'Мало слотов в неделю. Как только дата ясна — фиксируйте.',
  },
}
