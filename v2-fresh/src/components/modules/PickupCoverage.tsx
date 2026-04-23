/**
 * Pickup-Coverage card — sidebar logistics briefing.
 *
 * Tells the guest whether the operator will come to their hotel, which
 * zones are served, and roughly how long the transfer takes. Purely
 * presentational; zone + coverage logic lives in
 * `src/lib/personalize/scorers/pickup-coverage.ts`.
 */

import { Bus, MapPin, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react'
import type { ModuleScore, ActivitySignals } from '@/lib/personalize/types'
import type { PickupCoverageProps } from '@/lib/personalize/scorers/pickup-coverage'

type Props = {
  signals: ActivitySignals
  score: ModuleScore
  locale: string
}

export function PickupCoverageCard({ score: moduleScore, locale }: Props) {
  const props = moduleScore.props as PickupCoverageProps
  const labels = TRANSLATIONS[locale] ?? TRANSLATIONS.fr

  return (
    <div className="rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50 to-violet-50 p-4">
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 p-2 shadow-sm">
          <Bus className="h-4 w-4 text-white" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-neutral-900">
            {props.hasPickup ? labels.titlePickup : labels.titleMeet}
          </h3>
          <p className="mt-0.5 text-xs leading-snug text-indigo-900/80">
            {props.hasPickup ? labels.subtitlePickup : labels.subtitleMeet}
          </p>
        </div>
      </div>

      {/* Coverage body */}
      <div className="mt-3 space-y-2">
        {props.hasPickup && props.primaryZones.length > 0 && (
          <Row
            tone="positive"
            icon={CheckCircle2}
            title={labels.served}
            body={props.primaryZones.map((z) => labels[`zone_${z}`] ?? z).join(' · ')}
          />
        )}

        {props.hasPickup && props.outOfRangeZones.length > 0 && (
          <Row
            tone="caution"
            icon={XCircle}
            title={labels.notServed}
            body={props.outOfRangeZones.map((z) => labels[`zone_${z}`] ?? z).join(' · ')}
          />
        )}

        {!props.hasPickup && (
          <Row
            tone="neutral"
            icon={MapPin}
            title={labels.meetingPoint}
            body={
              props.isMarineDeparture
                ? labels.meetMarina
                : labels[`zone_${props.meetingPoint}`] ?? labels.zone_unknown
            }
          />
        )}

        {props.transferHintKey && (
          <Row
            tone="neutral"
            icon={Clock}
            title={labels.transferTime}
            body={labels[`transfer_${props.transferHintKey}`]}
          />
        )}

        {props.meetingPoint === 'unknown' && !props.hasPickup && (
          <Row
            tone="caution"
            icon={AlertCircle}
            title={labels.checkBefore}
            body={labels.checkBeforeBody}
          />
        )}
      </div>
    </div>
  )
}

function Row({
  icon: Icon,
  title,
  body,
  tone,
}: {
  icon: typeof CheckCircle2
  title: string
  body: string
  tone: 'positive' | 'caution' | 'neutral'
}) {
  const tones = {
    positive: 'text-emerald-700',
    caution: 'text-rose-700',
    neutral: 'text-indigo-700',
  } as const

  return (
    <div className="flex items-start gap-2">
      <Icon className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${tones[tone]}`} strokeWidth={2.5} />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
          {title}
        </div>
        <div className="text-xs font-medium text-neutral-800">{body}</div>
      </div>
    </div>
  )
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    titlePickup: 'Prise en charge à l\'hôtel',
    subtitlePickup: 'Le transporteur vient vous chercher, aucun déplacement.',
    titleMeet: 'Point de rendez-vous',
    subtitleMeet: 'Vous retrouvez l\'équipe sur place — prévoyez votre trajet.',
    served: 'Zones desservies',
    notServed: 'Non desservi',
    meetingPoint: 'Lieu de départ',
    meetMarina: 'Port / marina de l\'opérateur',
    transferTime: 'Durée transfert',
    checkBefore: 'À confirmer',
    checkBeforeBody: 'Coordonnées non précisées — demandez à la réservation.',
    zone_south: 'Sud (Adeje, Los Cristianos)',
    zone_north: 'Nord (Puerto de la Cruz, La Orotava)',
    zone_west: 'Ouest (Los Gigantes, Santiago)',
    zone_center: 'Centre (Teide, Vilaflor)',
    zone_east: 'Est (Santa Cruz, Anaga)',
    zone_ocean: 'Marina de départ',
    zone_unknown: 'À préciser',
    transfer_short: 'Court — 10 à 30 min',
    transfer_medium: 'Moyen — 30 à 60 min',
    transfer_long: 'Long — 1 h+',
  },
  en: {
    titlePickup: 'Hotel pickup',
    subtitlePickup: 'The operator collects you — no transfer to arrange.',
    titleMeet: 'Meeting point',
    subtitleMeet: 'You meet the team on site — plan your ride.',
    served: 'Areas covered',
    notServed: 'Not covered',
    meetingPoint: 'Departure from',
    meetMarina: 'Operator\'s port / marina',
    transferTime: 'Transfer time',
    checkBefore: 'To confirm',
    checkBeforeBody: 'Location not specified — ask at booking.',
    zone_south: 'South (Adeje, Los Cristianos)',
    zone_north: 'North (Puerto de la Cruz, La Orotava)',
    zone_west: 'West (Los Gigantes, Santiago)',
    zone_center: 'Centre (Teide, Vilaflor)',
    zone_east: 'East (Santa Cruz, Anaga)',
    zone_ocean: 'Departure marina',
    zone_unknown: 'To clarify',
    transfer_short: 'Short — 10 to 30 min',
    transfer_medium: 'Medium — 30 to 60 min',
    transfer_long: 'Long — 1 h+',
  },
  es: {
    titlePickup: 'Recogida en hotel',
    subtitlePickup: 'El operador te recoge — cero desplazamiento.',
    titleMeet: 'Punto de encuentro',
    subtitleMeet: 'Te reúnes con el equipo in situ — planifica el trayecto.',
    served: 'Zonas cubiertas',
    notServed: 'No cubierto',
    meetingPoint: 'Salida desde',
    meetMarina: 'Puerto / marina del operador',
    transferTime: 'Duración traslado',
    checkBefore: 'A confirmar',
    checkBeforeBody: 'Ubicación no precisada — pregunta al reservar.',
    zone_south: 'Sur (Adeje, Los Cristianos)',
    zone_north: 'Norte (Puerto de la Cruz, La Orotava)',
    zone_west: 'Oeste (Los Gigantes, Santiago)',
    zone_center: 'Centro (Teide, Vilaflor)',
    zone_east: 'Este (Santa Cruz, Anaga)',
    zone_ocean: 'Marina de salida',
    zone_unknown: 'Por precisar',
    transfer_short: 'Corto — 10 a 30 min',
    transfer_medium: 'Medio — 30 a 60 min',
    transfer_long: 'Largo — 1 h+',
  },
  de: {
    titlePickup: 'Hotel-Abholung',
    subtitlePickup: 'Der Anbieter holt Sie ab — kein Eigentransfer.',
    titleMeet: 'Treffpunkt',
    subtitleMeet: 'Sie treffen das Team vor Ort — Anfahrt einplanen.',
    served: 'Abgedeckte Zonen',
    notServed: 'Nicht abgedeckt',
    meetingPoint: 'Abfahrt ab',
    meetMarina: 'Hafen / Marina des Anbieters',
    transferTime: 'Transferdauer',
    checkBefore: 'Zu bestätigen',
    checkBeforeBody: 'Treffpunkt unpräzise — bei Buchung erfragen.',
    zone_south: 'Süden (Adeje, Los Cristianos)',
    zone_north: 'Norden (Puerto de la Cruz, La Orotava)',
    zone_west: 'Westen (Los Gigantes, Santiago)',
    zone_center: 'Mitte (Teide, Vilaflor)',
    zone_east: 'Osten (Santa Cruz, Anaga)',
    zone_ocean: 'Abfahrts-Marina',
    zone_unknown: 'Zu klären',
    transfer_short: 'Kurz — 10 bis 30 Min.',
    transfer_medium: 'Mittel — 30 bis 60 Min.',
    transfer_long: 'Lang — 1 Std.+',
  },
  it: {
    titlePickup: 'Ritiro in hotel',
    subtitlePickup: 'L\'operatore ti viene a prendere — nessuno spostamento.',
    titleMeet: 'Punto d\'incontro',
    subtitleMeet: 'Raggiungi il team sul posto — pianifica il viaggio.',
    served: 'Zone coperte',
    notServed: 'Non coperto',
    meetingPoint: 'Partenza da',
    meetMarina: 'Porto / marina dell\'operatore',
    transferTime: 'Durata trasferimento',
    checkBefore: 'Da confermare',
    checkBeforeBody: 'Posizione non precisata — chiedi al momento della prenotazione.',
    zone_south: 'Sud (Adeje, Los Cristianos)',
    zone_north: 'Nord (Puerto de la Cruz, La Orotava)',
    zone_west: 'Ovest (Los Gigantes, Santiago)',
    zone_center: 'Centro (Teide, Vilaflor)',
    zone_east: 'Est (Santa Cruz, Anaga)',
    zone_ocean: 'Marina di partenza',
    zone_unknown: 'Da precisare',
    transfer_short: 'Breve — 10-30 min',
    transfer_medium: 'Medio — 30-60 min',
    transfer_long: 'Lungo — 1 h+',
  },
  ru: {
    titlePickup: 'Забор из отеля',
    subtitlePickup: 'Оператор приедет за вами — никаких переездов самостоятельно.',
    titleMeet: 'Точка встречи',
    subtitleMeet: 'Встречаетесь с командой на месте — спланируйте дорогу.',
    served: 'Покрываемые зоны',
    notServed: 'Не покрывается',
    meetingPoint: 'Отправление из',
    meetMarina: 'Порт / марина оператора',
    transferTime: 'Время трансфера',
    checkBefore: 'Уточнить',
    checkBeforeBody: 'Место не указано — спросите при бронировании.',
    zone_south: 'Юг (Adeje, Los Cristianos)',
    zone_north: 'Север (Puerto de la Cruz, La Orotava)',
    zone_west: 'Запад (Los Gigantes, Santiago)',
    zone_center: 'Центр (Teide, Vilaflor)',
    zone_east: 'Восток (Santa Cruz, Anaga)',
    zone_ocean: 'Марина отправления',
    zone_unknown: 'Уточнить',
    transfer_short: 'Коротко — 10–30 мин.',
    transfer_medium: 'Средне — 30–60 мин.',
    transfer_long: 'Долго — 1 ч+',
  },
}
