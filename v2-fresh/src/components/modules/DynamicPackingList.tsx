/**
 * Dynamic Packing List card вЂ” interactive (expand / collapse).
 *
 * Pure presentation. The scorer that produces `items` lives in
 * `src/lib/personalize/scorers/dynamic-packing-list.ts` (server-safe).
 * This file stays client-only so the "Show more" toggle can use `useState`.
 *
 * Icons arrive from the scorer as stable string names вЂ” we resolve them
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
    <div className="rounded-3xl border border-brand-turquoise-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 rounded-2xl bg-brand-turquoise-100 p-2.5">
          <Backpack className="h-5 w-5 text-brand-turquoise-700" strokeWidth={2.25} />
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
                  <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-turquoise-600" />
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
              className="mt-3 flex items-center gap-1 text-sm font-medium text-brand-turquoise-700 hover:text-brand-turquoise-800"
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
    ru: 'Р¤Р»РёСЃ РёР»Рё С‚С‘РїР»Р°СЏ РєСѓСЂС‚РєР°',
  },
  waterBottle: {
    fr: 'Bouteille d\'eau (1,5 L)',
    en: 'Water bottle (1.5 L)',
    es: 'Botella de agua (1,5 L)',
    de: 'Wasserflasche (1,5 L)',
    it: 'Bottiglia d\'acqua (1,5 L)',
    ru: 'Р‘СѓС‚С‹Р»РєР° РІРѕРґС‹ (1,5 Р»)',
  },
  sunscreen: {
    fr: 'CrГЁme solaire SPF 50',
    en: 'Sunscreen SPF 50',
    es: 'Crema solar SPF 50',
    de: 'Sonnencreme SPF 50',
    it: 'Crema solare SPF 50',
    ru: 'РЎРѕР»РЅС†РµР·Р°С‰РёС‚РЅС‹Р№ РєСЂРµРј SPF 50',
  },
  hat: {
    fr: 'Casquette ou chapeau',
    en: 'Cap or hat',
    es: 'Gorra o sombrero',
    de: 'Kappe oder Hut',
    it: 'Cappellino o cappello',
    ru: 'РљРµРїРєР° РёР»Рё С€Р»СЏРїР°',
  },
  sunglasses: {
    fr: 'Lunettes de soleil',
    en: 'Sunglasses',
    es: 'Gafas de sol',
    de: 'Sonnenbrille',
    it: 'Occhiali da sole',
    ru: 'РЎРѕР»РЅС†РµР·Р°С‰РёС‚РЅС‹Рµ РѕС‡РєРё',
  },
  closedShoes: {
    fr: 'Chaussures fermГ©es',
    en: 'Closed-toe shoes',
    es: 'Zapatos cerrados',
    de: 'Geschlossene Schuhe',
    it: 'Scarpe chiuse',
    ru: 'Р—Р°РєСЂС‹С‚Р°СЏ РѕР±СѓРІСЊ',
  },
  hikingShoes: {
    fr: 'Chaussures de randonnГ©e',
    en: 'Hiking boots',
    es: 'Botas de senderismo',
    de: 'Wanderschuhe',
    it: 'Scarponi da trekking',
    ru: 'РўСЂРµРєРёРЅРіРѕРІР°СЏ РѕР±СѓРІСЊ',
  },
  swimsuit: {
    fr: 'Maillot de bain',
    en: 'Swimsuit',
    es: 'BaГ±ador',
    de: 'Badeanzug',
    it: 'Costume da bagno',
    ru: 'РљСѓРїР°Р»СЊРЅРёРє',
  },
  towel: {
    fr: 'Serviette',
    en: 'Towel',
    es: 'Toalla',
    de: 'Handtuch',
    it: 'Asciugamano',
    ru: 'РџРѕР»РѕС‚РµРЅС†Рµ',
  },
  dryBag: {
    fr: 'Sac Г©tanche',
    en: 'Dry bag',
    es: 'Bolsa estanca',
    de: 'Trockentasche',
    it: 'Sacca stagna',
    ru: 'РќРµРїСЂРѕРјРѕРєР°РµРјС‹Р№ РїР°РєРµС‚',
  },
  seasickPill: {
    fr: 'ComprimГ©s contre le mal de mer',
    en: 'Seasickness pills',
    es: 'Pastillas contra el mareo',
    de: 'Tabletten gegen Seekrankheit',
    it: 'Pastiglie contro il mal di mare',
    ru: 'РўР°Р±Р»РµС‚РєРё РѕС‚ РјРѕСЂСЃРєРѕР№ Р±РѕР»РµР·РЅРё',
  },
  camera: {
    fr: 'Appareil photo ou jumelles',
    en: 'Camera or binoculars',
    es: 'CГЎmara o prismГЎticos',
    de: 'Kamera oder Fernglas',
    it: 'Macchina fotografica o binocolo',
    ru: 'РљР°РјРµСЂР° РёР»Рё Р±РёРЅРѕРєР»СЊ',
  },
  flashlight: {
    fr: 'Lampe torche (lumiГЁre rouge idГ©ale)',
    en: 'Flashlight (red light ideal)',
    es: 'Linterna (luz roja ideal)',
    de: 'Taschenlampe (Rotlicht ideal)',
    it: 'Torcia (luce rossa ideale)',
    ru: 'Р¤РѕРЅР°СЂРёРє (РєСЂР°СЃРЅС‹Р№ СЃРІРµС‚ РёРґРµР°Р»РµРЅ)',
  },
  cash: {
    fr: 'Un peu de liquide',
    en: 'Some cash',
    es: 'Algo de efectivo',
    de: 'Etwas Bargeld',
    it: 'Un po\' di contanti',
    ru: 'РќРµРјРЅРѕРіРѕ РЅР°Р»РёС‡РЅС‹С…',
  },
  id: {
    fr: 'PiГЁce d\'identitГ©',
    en: 'Photo ID',
    es: 'Documento de identidad',
    de: 'Ausweis',
    it: 'Documento d\'identitГ ',
    ru: 'РЈРґРѕСЃС‚РѕРІРµСЂРµРЅРёРµ Р»РёС‡РЅРѕСЃС‚Рё',
  },
}

const REASONS: Record<string, Record<string, string>> = {
  warmLayerAltitude: {
    fr: 'Il fait ~10 В°C de moins au sommet.',
    en: '~10 В°C cooler at the summit.',
    es: '~10 В°C menos en la cima.',
    de: '~10 В°C kГјhler am Gipfel.',
    it: '~10 В°C piГ№ freddo in vetta.',
    ru: 'РќР° РІРµСЂС€РёРЅРµ ~10 В°C РїСЂРѕС…Р»Р°РґРЅРµРµ.',
  },
  waterDuration: {
    fr: 'ActivitГ© longue вЂ” pensez Г  l\'hydratation.',
    en: 'Long activity вЂ” stay hydrated.',
    es: 'Actividad larga вЂ” hidrГЎtate.',
    de: 'Lange AktivitГ¤t вЂ” bleib hydriert.',
    it: 'AttivitГ  lunga вЂ” idratati.',
    ru: 'Р”Р»РёС‚РµР»СЊРЅР°СЏ Р°РєС‚РёРІРЅРѕСЃС‚СЊ вЂ” РїРµР№С‚Рµ РІРѕРґСѓ.',
  },
  sunOutdoor: {
    fr: 'Exposition solaire forte Г  Tenerife.',
    en: 'Strong sun exposure in Tenerife.',
    es: 'Fuerte exposiciГіn solar en Tenerife.',
    de: 'Starke Sonneneinstrahlung auf Teneriffa.',
    it: 'Forte esposizione solare a Tenerife.',
    ru: 'РЎРёР»СЊРЅРѕРµ СЃРѕР»РЅС†Рµ РЅР° РўРµРЅРµСЂРёС„Рµ.',
  },
  hikingTerrain: {
    fr: 'Terrain irrГ©gulier.',
    en: 'Uneven terrain.',
    es: 'Terreno irregular.',
    de: 'Unebenes GelГ¤nde.',
    it: 'Terreno irregolare.',
    ru: 'РќРµСЂРѕРІРЅР°СЏ РјРµСЃС‚РЅРѕСЃС‚СЊ.',
  },
  waterSwim: {
    fr: 'Baignade prГ©vue.',
    en: 'Swimming involved.',
    es: 'Se incluye baГ±o.',
    de: 'Baden vorgesehen.',
    it: 'Г€ previsto il bagno.',
    ru: 'РџСЂРµРґСѓСЃРјРѕС‚СЂРµРЅРѕ РїР»Р°РІР°РЅРёРµ.',
  },
  waves: {
    fr: 'Mer parfois agitГ©e.',
    en: 'Sea can be choppy.',
    es: 'El mar puede estar movido.',
    de: 'Meer kann rau sein.',
    it: 'Mare a volte mosso.',
    ru: 'РњРѕСЂРµ Р±С‹РІР°РµС‚ РЅРµСЃРїРѕРєРѕР№РЅС‹Рј.',
  },
  wildlife: {
    fr: 'Pour mieux observer la faune.',
    en: 'To spot wildlife better.',
    es: 'Para observar mejor la fauna.',
    de: 'Um Wildtiere besser zu sehen.',
    it: 'Per osservare meglio la fauna.',
    ru: 'Р§С‚РѕР±С‹ Р»СѓС‡С€Рµ РІРёРґРµС‚СЊ Р¶РёРІРѕС‚РЅС‹С….',
  },
  stargazing: {
    fr: 'ActivitГ© de nuit.',
    en: 'Night activity.',
    es: 'Actividad nocturna.',
    de: 'NachtaktivitГ¤t.',
    it: 'AttivitГ  notturna.',
    ru: 'РќРѕС‡РЅР°СЏ Р°РєС‚РёРІРЅРѕСЃС‚СЊ.',
  },
  generic: {
    fr: 'Utile pour cette activitГ©.',
    en: 'Useful for this activity.',
    es: 'Гљtil para esta actividad.',
    de: 'NГјtzlich fГјr diese AktivitГ¤t.',
    it: 'Utile per questa attivitГ .',
    ru: 'РџРѕР»РµР·РЅРѕ РґР»СЏ СЌС‚РѕР№ Р°РєС‚РёРІРЅРѕСЃС‚Рё.',
  },
}

const UI_LABELS: Record<string, { title: string; subtitle: string; showMore: string; showLess: string }> = {
  fr: {
    title: 'ГЂ glisser dans votre sac',
    subtitle: 'Liste personnalisГ©e pour cette activitГ©.',
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
    title: 'QuГ© llevar',
    subtitle: 'Lista personalizada para esta actividad.',
    showMore: 'Ver mГЎs',
    showLess: 'Ver menos',
  },
  de: {
    title: 'FГјr diese AktivitГ¤t einpacken',
    subtitle: 'Personalisierte Checkliste fГјr diese Tour.',
    showMore: 'Mehr anzeigen',
    showLess: 'Weniger anzeigen',
  },
  it: {
    title: 'Cosa mettere nello zaino',
    subtitle: 'Lista personalizzata per questa attivitГ .',
    showMore: 'Mostra di piГ№',
    showLess: 'Mostra di meno',
  },
  ru: {
    title: 'Р§С‚Рѕ РІР·СЏС‚СЊ СЃ СЃРѕР±РѕР№',
    subtitle: 'РџРµСЂСЃРѕРЅР°Р»СЊРЅС‹Р№ СЃРїРёСЃРѕРє РґР»СЏ СЌС‚РѕР№ СЌРєСЃРєСѓСЂСЃРёРё.',
    showMore: 'РџРѕРєР°Р·Р°С‚СЊ Р±РѕР»СЊС€Рµ',
    showLess: 'РџРѕРєР°Р·Р°С‚СЊ РјРµРЅСЊС€Рµ',
  },
}
