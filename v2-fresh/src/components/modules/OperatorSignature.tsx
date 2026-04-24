'use client'

/**
 * Operator-Signature card — "who's running this, and are they set up?"
 *
 * Right-inline sidebar card. Shows catalog depth, pickup network,
 * editorial maturity as tight signals. Complements value-story
 * (which talks €); this talks operator reliability. Scorer lives in
 * `src/lib/personalize/scorers/operator-signature.ts`.
 */

import {
  ShieldCheck,
  Layers,
  MapPin,
  Bus,
  Film,
  Route,
  MessagesSquare,
  Images,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ModuleScore, ActivitySignals } from '@/lib/personalize/types'
import type {
  OperatorSignatureProps,
  OperatorSignalKind,
  OperatorMaturity,
} from '@/lib/personalize/scorers/operator-signature'

type Props = {
  signals: ActivitySignals
  score: ModuleScore
  locale: string
}

const SIGNAL_ICON: Record<OperatorSignalKind, LucideIcon> = {
  catalogDepth: Layers,
  pickupNetwork: MapPin,
  pickupIncluded: Bus,
  videoProduction: Film,
  detailedRoute: Route,
  faqLibrary: MessagesSquare,
  imageDepth: Images,
}

const MATURITY_STYLE: Record<OperatorMaturity, { bg: string; ring: string; chip: string; grad: string }> = {
  emerging:    { bg: 'bg-sky-50 border-sky-200',         ring: 'ring-sky-200',         chip: 'bg-sky-100 text-sky-800 ring-sky-200',             grad: 'from-sky-500 to-cyan-500' },
  established: { bg: 'bg-emerald-50 border-emerald-200', ring: 'ring-emerald-200',     chip: 'bg-emerald-100 text-emerald-800 ring-emerald-200', grad: 'from-emerald-500 to-teal-500' },
  seasoned:    { bg: 'bg-indigo-50 border-indigo-200',   ring: 'ring-indigo-200',      chip: 'bg-indigo-100 text-indigo-800 ring-indigo-200',    grad: 'from-indigo-500 to-violet-500' },
}

type LabelMap = Record<string, string>

export function OperatorSignatureCard({ score: moduleScore, locale }: Props) {
  const props = moduleScore.props as OperatorSignatureProps
  const labels: LabelMap = (TRANSLATIONS[locale] ?? TRANSLATIONS.fr) as LabelMap
  const style = MATURITY_STYLE[props.maturity]

  return (
    <div className={`rounded-2xl border p-4 ${style.bg}`}>
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div className={`flex-shrink-0 rounded-xl bg-gradient-to-br ${style.grad} p-2 shadow-sm`}>
          <ShieldCheck className="h-4 w-4 text-white" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-neutral-900">
            {labels.title}
          </h3>
          <p className="mt-0.5 text-xs leading-snug text-neutral-700">
            {labels[`summary_${props.maturity}`]}
          </p>
        </div>
        <span
          className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${style.chip}`}
        >
          {labels[`maturity_${props.maturity}`]}
        </span>
      </div>

      {/* Signal grid */}
      <ul className="mt-3 space-y-1.5">
        {props.signals.map((sig) => {
          const Icon = SIGNAL_ICON[sig.kind]
          const label = labels[`signal_${sig.kind}`] ?? sig.kind
          const hint =
            sig.n != null
              ? (labels[`hint_${sig.kind}`] ?? '').replace('{n}', String(sig.n))
              : labels[`hint_${sig.kind}`] ?? ''
          return (
            <li key={sig.kind} className="flex items-start gap-2">
              <div className={`mt-0.5 flex-shrink-0 rounded-md p-1 ring-1 bg-white ${style.ring}`}>
                <Icon className="h-3 w-3 text-neutral-700" strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-xs font-semibold text-neutral-900">{label}</div>
                {hint && (
                  <div className="text-[11px] text-neutral-600">{hint}</div>
                )}
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
    title: 'Signaux opérateur',

    maturity_emerging: 'En cours',
    maturity_established: 'Installé',
    maturity_seasoned: 'Aguerri',

    summary_emerging: 'Offre récente, déjà structurée.',
    summary_established: 'Opérateur bien rodé, plusieurs signaux clairs.',
    summary_seasoned: 'Catalogue profond, organisation visible.',

    signal_catalogDepth: 'Options multiples',
    signal_pickupNetwork: 'Ramassage large',
    signal_pickupIncluded: 'Pickup inclus',
    signal_videoProduction: 'Vidéo immersive',
    signal_detailedRoute: 'Itinéraire détaillé',
    signal_faqLibrary: 'FAQ documentée',
    signal_imageDepth: 'Galerie fournie',

    hint_catalogDepth: '{n} formules disponibles',
    hint_pickupNetwork: '{n} points de prise en charge',
    hint_pickupIncluded: 'Transfert compris dans l\'offre',
    hint_videoProduction: 'Prévisualisation vidéo disponible',
    hint_detailedRoute: 'Étape par étape, décrit',
    hint_faqLibrary: 'Questions fréquentes déjà traitées',
    hint_imageDepth: '{n} photos dans la galerie',
  },
  en: {
    title: 'Operator signals',

    maturity_emerging: 'Ramping up',
    maturity_established: 'Set up',
    maturity_seasoned: 'Seasoned',

    summary_emerging: 'Newer offer, already structured.',
    summary_established: 'Well-rounded operator, several clear signals.',
    summary_seasoned: 'Deep catalogue, visible organisation.',

    signal_catalogDepth: 'Multiple options',
    signal_pickupNetwork: 'Broad pickup',
    signal_pickupIncluded: 'Pickup included',
    signal_videoProduction: 'Immersive video',
    signal_detailedRoute: 'Detailed itinerary',
    signal_faqLibrary: 'Documented FAQ',
    signal_imageDepth: 'Rich gallery',

    hint_catalogDepth: '{n} formats available',
    hint_pickupNetwork: '{n} pickup points',
    hint_pickupIncluded: 'Transfer included in the offer',
    hint_videoProduction: 'Video preview available',
    hint_detailedRoute: 'Step-by-step described',
    hint_faqLibrary: 'Common questions already addressed',
    hint_imageDepth: '{n} photos in the gallery',
  },
  es: {
    title: 'Señales del operador',

    maturity_emerging: 'En arranque',
    maturity_established: 'Consolidado',
    maturity_seasoned: 'Veterano',

    summary_emerging: 'Oferta reciente, ya estructurada.',
    summary_established: 'Operador rodado, varias señales claras.',
    summary_seasoned: 'Catálogo profundo, organización visible.',

    signal_catalogDepth: 'Varias opciones',
    signal_pickupNetwork: 'Recogida amplia',
    signal_pickupIncluded: 'Pickup incluido',
    signal_videoProduction: 'Vídeo inmersivo',
    signal_detailedRoute: 'Itinerario detallado',
    signal_faqLibrary: 'FAQ documentada',
    signal_imageDepth: 'Galería amplia',

    hint_catalogDepth: '{n} formatos disponibles',
    hint_pickupNetwork: '{n} puntos de recogida',
    hint_pickupIncluded: 'Traslado incluido en la oferta',
    hint_videoProduction: 'Vista previa en vídeo disponible',
    hint_detailedRoute: 'Paso a paso, descrito',
    hint_faqLibrary: 'Preguntas frecuentes ya tratadas',
    hint_imageDepth: '{n} fotos en la galería',
  },
  de: {
    title: 'Anbietersignale',

    maturity_emerging: 'Im Aufbau',
    maturity_established: 'Etabliert',
    maturity_seasoned: 'Erfahren',

    summary_emerging: 'Neueres Angebot, bereits strukturiert.',
    summary_established: 'Eingespielter Anbieter, mehrere klare Signale.',
    summary_seasoned: 'Umfangreiches Portfolio, sichtbare Organisation.',

    signal_catalogDepth: 'Mehrere Varianten',
    signal_pickupNetwork: 'Breite Abholung',
    signal_pickupIncluded: 'Pickup inklusive',
    signal_videoProduction: 'Video-Einblick',
    signal_detailedRoute: 'Detaillierte Route',
    signal_faqLibrary: 'Dokumentierte FAQ',
    signal_imageDepth: 'Reiche Galerie',

    hint_catalogDepth: '{n} Formate verfügbar',
    hint_pickupNetwork: '{n} Abholpunkte',
    hint_pickupIncluded: 'Transfer im Angebot enthalten',
    hint_videoProduction: 'Video-Vorschau verfügbar',
    hint_detailedRoute: 'Schritt für Schritt beschrieben',
    hint_faqLibrary: 'Häufige Fragen bereits beantwortet',
    hint_imageDepth: '{n} Fotos in der Galerie',
  },
  it: {
    title: 'Segnali operatore',

    maturity_emerging: 'In rodaggio',
    maturity_established: 'Consolidato',
    maturity_seasoned: 'Esperto',

    summary_emerging: 'Offerta recente, già strutturata.',
    summary_established: 'Operatore rodato, vari segnali chiari.',
    summary_seasoned: 'Catalogo ampio, organizzazione visibile.',

    signal_catalogDepth: 'Più opzioni',
    signal_pickupNetwork: 'Ritiro esteso',
    signal_pickupIncluded: 'Pickup incluso',
    signal_videoProduction: 'Video immersivo',
    signal_detailedRoute: 'Itinerario dettagliato',
    signal_faqLibrary: 'FAQ documentata',
    signal_imageDepth: 'Galleria ricca',

    hint_catalogDepth: '{n} formule disponibili',
    hint_pickupNetwork: '{n} punti di ritiro',
    hint_pickupIncluded: 'Transfer incluso nell\'offerta',
    hint_videoProduction: 'Anteprima video disponibile',
    hint_detailedRoute: 'Descritto passo-passo',
    hint_faqLibrary: 'Domande frequenti già trattate',
    hint_imageDepth: '{n} foto nella galleria',
  },
  ru: {
    title: 'Сигналы оператора',

    maturity_emerging: 'Разгоняется',
    maturity_established: 'Устоявшийся',
    maturity_seasoned: 'Опытный',

    summary_emerging: 'Новое предложение, уже структурировано.',
    summary_established: 'Отлаженный оператор, несколько чётких сигналов.',
    summary_seasoned: 'Глубокий каталог, видимая организация.',

    signal_catalogDepth: 'Несколько вариантов',
    signal_pickupNetwork: 'Широкая подача',
    signal_pickupIncluded: 'Трансфер включён',
    signal_videoProduction: 'Иммерсивное видео',
    signal_detailedRoute: 'Подробный маршрут',
    signal_faqLibrary: 'Документированный FAQ',
    signal_imageDepth: 'Богатая галерея',

    hint_catalogDepth: '{n} форматов доступно',
    hint_pickupNetwork: '{n} точек подачи',
    hint_pickupIncluded: 'Трансфер в предложении',
    hint_videoProduction: 'Доступно видео-превью',
    hint_detailedRoute: 'Описан шаг за шагом',
    hint_faqLibrary: 'Частые вопросы уже разобраны',
    hint_imageDepth: '{n} фото в галерее',
  },
}
