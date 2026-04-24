/**
 * Dynamic Packing List card — interactive (expand / collapse).
 *
 * Pure presentation. The scorer that produces `items` lives in
 * `src/lib/personalize/scorers/dynamic-packing-list.ts` (server-safe).
 * This file stays client-only so the "Show more" toggle can use `useState`.
 *
 * Icons arrive from the scorer as stable string names — we resolve them
 * here via ICON_MAP so the scorer file never imports lucide-react.
 */

'use client'

import { useState } from 'react'
import {
  Backpack, Shirt, Droplet, Sun, Footprints, Camera, Flashlight,
  Waves, ShieldAlert, Banknote, CircleCheck, ChevronDown, ChevronUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ModuleScore, ActivitySignals } from '@/lib/personalize/types'
import type { BuiltItem, PackingItemIconName } from '@/lib/personalize/scorers/dynamic-packing-list'

const ICON_MAP: Record<PackingItemIconName, LucideIcon> = {
  Backpack,
  Shirt,
  Droplet,
  Sun,
  Footprints,
  Camera,
  Flashlight,
  Waves,
  ShieldAlert,
  Banknote,
  CircleCheck,
}

type Props = {
  signals: ActivitySignals
  score: ModuleScore
  locale: string
}

export function DynamicPackingListCard({ score: moduleScore, locale }: Props) {
  const items = (moduleScore.props as { items: BuiltItem[] }).items
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? items : items.slice(0, 5)
  const labels = UI_LABELS[locale] ?? UI_LABELS.fr

  return (
    <div className="rounded-3xl border border-ocean-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 rounded-2xl bg-ocean-100 p-2.5">
          <Backpack className="h-5 w-5 text-ocean-700" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-neutral-900">{labels.title}</h3>
          <p className="mt-0.5 text-sm text-neutral-600">{labels.subtitle}</p>

          <ul className="mt-4 space-y-2">
            {shown.map((item, i) => {
              const Icon = ICON_MAP[item.icon] ?? Backpack
              const label = ITEM_LABELS[item.key]?.[locale] ?? ITEM_LABELS[item.key]?.fr ?? item.key
              const reason = REASONS[item.reasonKey]?.[locale] ?? REASONS[item.reasonKey]?.fr ?? ''
              return (
                <li key={`${item.key}-${i}`} className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-ocean-600" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-800">{label}</p>
                    {reason && <p className="text-xs text-neutral-500">{reason}</p>}
                  </div>
                </li>
              )
            })}
          </ul>

          {items.length > 5 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-3 flex items-center gap-1 text-sm font-medium text-ocean-700 hover:text-ocean-800"
            >
              {expanded ? labels.showLess : `${labels.showMore} (${items.length - 5})`}
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------

const ITEM_LABELS: Record<string, Record<string, string>> = {
  warmLayer: {
    fr: 'Polaire ou veste chaude',
    en: 'Fleece or warm jacket',
    es: 'Polar o chaqueta de abrigo',
    de: 'Fleece oder warme Jacke',
    it: 'Pile o giacca calda',
    ru: 'Флис или тёплая куртка',
  },
  waterBottle: {
    fr: 'Bouteille d\'eau (1,5 L)',
    en: 'Water bottle (1.5 L)',
    es: 'Botella de agua (1,5 L)',
    de: 'Wasserflasche (1,5 L)',
    it: 'Bottiglia d\'acqua (1,5 L)',
    ru: 'Бутылка воды (1,5 л)',
  },
  sunscreen: {
    fr: 'Crème solaire SPF 50',
    en: 'Sunscreen SPF 50',
    es: 'Crema solar SPF 50',
    de: 'Sonnencreme SPF 50',
    it: 'Crema solare SPF 50',
    ru: 'Солнцезащитный крем SPF 50',
  },
  hat: {
    fr: 'Casquette ou chapeau',
    en: 'Cap or hat',
    es: 'Gorra o sombrero',
    de: 'Kappe oder Hut',
    it: 'Cappellino o cappello',
    ru: 'Кепка или шляпа',
  },
  sunglasses: {
    fr: 'Lunettes de soleil',
    en: 'Sunglasses',
    es: 'Gafas de sol',
    de: 'Sonnenbrille',
    it: 'Occhiali da sole',
    ru: 'Солнцезащитные очки',
  },
  closedShoes: {
    fr: 'Chaussures fermées',
    en: 'Closed-toe shoes',
    es: 'Zapatos cerrados',
    de: 'Geschlossene Schuhe',
    it: 'Scarpe chiuse',
    ru: 'Закрытая обувь',
  },
  hikingShoes: {
    fr: 'Chaussures de randonnée',
    en: 'Hiking boots',
    es: 'Botas de senderismo',
    de: 'Wanderschuhe',
    it: 'Scarponi da trekking',
    ru: 'Трекинговая обувь',
  },
  swimsuit: {
    fr: 'Maillot de bain',
    en: 'Swimsuit',
    es: 'Bañador',
    de: 'Badeanzug',
    it: 'Costume da bagno',
    ru: 'Купальник',
  },
  towel: {
    fr: 'Serviette',
    en: 'Towel',
    es: 'Toalla',
    de: 'Handtuch',
    it: 'Asciugamano',
    ru: 'Полотенце',
  },
  dryBag: {
    fr: 'Sac étanche',
    en: 'Dry bag',
    es: 'Bolsa estanca',
    de: 'Trockentasche',
    it: 'Sacca stagna',
    ru: 'Непромокаемый пакет',
  },
  seasickPill: {
    fr: 'Comprimés contre le mal de mer',
    en: 'Seasickness pills',
    es: 'Pastillas contra el mareo',
    de: 'Tabletten gegen Seekrankheit',
    it: 'Pastiglie contro il mal di mare',
    ru: 'Таблетки от морской болезни',
  },
  camera: {
    fr: 'Appareil photo ou jumelles',
    en: 'Camera or binoculars',
    es: 'Cámara o prismáticos',
    de: 'Kamera oder Fernglas',
    it: 'Macchina fotografica o binocolo',
    ru: 'Камера или бинокль',
  },
  flashlight: {
    fr: 'Lampe torche (lumière rouge idéale)',
    en: 'Flashlight (red light ideal)',
    es: 'Linterna (luz roja ideal)',
    de: 'Taschenlampe (Rotlicht ideal)',
    it: 'Torcia (luce rossa ideale)',
    ru: 'Фонарик (красный свет идеален)',
  },
  cash: {
    fr: 'Un peu de liquide',
    en: 'Some cash',
    es: 'Algo de efectivo',
    de: 'Etwas Bargeld',
    it: 'Un po\' di contanti',
    ru: 'Немного наличных',
  },
  id: {
    fr: 'Pièce d\'identité',
    en: 'Photo ID',
    es: 'Documento de identidad',
    de: 'Ausweis',
    it: 'Documento d\'identità',
    ru: 'Удостоверение личности',
  },
}

const REASONS: Record<string, Record<string, string>> = {
  warmLayerAltitude: {
    fr: 'Il fait ~10 °C de moins au sommet.',
    en: '~10 °C cooler at the summit.',
    es: '~10 °C menos en la cima.',
    de: '~10 °C kühler am Gipfel.',
    it: '~10 °C più freddo in vetta.',
    ru: 'На вершине ~10 °C прохладнее.',
  },
  waterDuration: {
    fr: 'Activité longue — pensez à l\'hydratation.',
    en: 'Long activity — stay hydrated.',
    es: 'Actividad larga — hidrátate.',
    de: 'Lange Aktivität — bleib hydriert.',
    it: 'Attività lunga — idratati.',
    ru: 'Длительная активность — пейте воду.',
  },
  sunOutdoor: {
    fr: 'Exposition solaire forte à Tenerife.',
    en: 'Strong sun exposure in Tenerife.',
    es: 'Fuerte exposición solar en Tenerife.',
    de: 'Starke Sonneneinstrahlung auf Teneriffa.',
    it: 'Forte esposizione solare a Tenerife.',
    ru: 'Сильное солнце на Тенерифе.',
  },
  hikingTerrain: {
    fr: 'Terrain irrégulier.',
    en: 'Uneven terrain.',
    es: 'Terreno irregular.',
    de: 'Unebenes Gelände.',
    it: 'Terreno irregolare.',
    ru: 'Неровная местность.',
  },
  waterSwim: {
    fr: 'Baignade prévue.',
    en: 'Swimming involved.',
    es: 'Se incluye baño.',
    de: 'Baden vorgesehen.',
    it: 'È previsto il bagno.',
    ru: 'Предусмотрено плавание.',
  },
  waves: {
    fr: 'Mer parfois agitée.',
    en: 'Sea can be choppy.',
    es: 'El mar puede estar movido.',
    de: 'Meer kann rau sein.',
    it: 'Mare a volte mosso.',
    ru: 'Море бывает неспокойным.',
  },
  wildlife: {
    fr: 'Pour mieux observer la faune.',
    en: 'To spot wildlife better.',
    es: 'Para observar mejor la fauna.',
    de: 'Um Wildtiere besser zu sehen.',
    it: 'Per osservare meglio la fauna.',
    ru: 'Чтобы лучше видеть животных.',
  },
  stargazing: {
    fr: 'Activité de nuit.',
    en: 'Night activity.',
    es: 'Actividad nocturna.',
    de: 'Nachtaktivität.',
    it: 'Attività notturna.',
    ru: 'Ночная активность.',
  },
  generic: {
    fr: 'Utile pour cette activité.',
    en: 'Useful for this activity.',
    es: 'Útil para esta actividad.',
    de: 'Nützlich für diese Aktivität.',
    it: 'Utile per questa attività.',
    ru: 'Полезно для этой активности.',
  },
}

const UI_LABELS: Record<string, { title: string; subtitle: string; showMore: string; showLess: string }> = {
  fr: {
    title: 'À glisser dans votre sac',
    subtitle: 'Liste personnalisée pour cette activité.',
    showMore: 'Voir plus',
    showLess: 'Voir moins',
  },
  en: {
    title: 'Pack for this activity',
    subtitle: 'Personalized checklist for this tour.',
    showMore: 'Show more',
    showLess: 'Show less',
  },
  es: {
    title: 'Qué llevar',
    subtitle: 'Lista personalizada para esta actividad.',
    showMore: 'Ver más',
    showLess: 'Ver menos',
  },
  de: {
    title: 'Für diese Aktivität einpacken',
    subtitle: 'Personalisierte Checkliste für diese Tour.',
    showMore: 'Mehr anzeigen',
    showLess: 'Weniger anzeigen',
  },
  it: {
    title: 'Cosa mettere nello zaino',
    subtitle: 'Lista personalizzata per questa attività.',
    showMore: 'Mostra di più',
    showLess: 'Mostra di meno',
  },
  ru: {
    title: 'Что взять с собой',
    subtitle: 'Персональный список для этой экскурсии.',
    showMore: 'Показать больше',
    showLess: 'Показать меньше',
  },
}
