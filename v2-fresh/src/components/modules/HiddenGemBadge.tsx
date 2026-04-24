/**
 * Hidden-Gem Badge card — "This is a hidden gem"
 *
 * Pure presentational card. Scoring + reason-building lives in
 * `src/lib/personalize/scorers/hidden-gem-badge.ts` so it can run on the
 * server. This file just renders what the scorer produced.
 */

import { Gem, Sparkles, Compass, Star, Wine, Landmark, ImageIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ModuleScore, ActivitySignals } from '@/lib/personalize/types'
import type {
  HiddenGemReason,
  HiddenGemReasonKey,
} from '@/lib/personalize/scorers/hidden-gem-badge'

const REASON_ICONS: Record<HiddenGemReasonKey, LucideIcon> = {
  'off-beaten-path': Compass,
  'stargazing-experience': Star,
  'gastro-deep': Wine,
  'cultural-depth': Landmark,
  'rich-content': ImageIcon,
  'niche-experience': Sparkles,
}

type Props = {
  signals: ActivitySignals
  score: ModuleScore
  locale: string
}

export function HiddenGemBadgeCard({ score: moduleScore, locale }: Props) {
  const props = moduleScore.props as { reasons: HiddenGemReason[] }
  const labels = TRANSLATIONS[locale] ?? TRANSLATIONS.fr

  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-rose-50 to-fuchsia-50 p-5 shadow-sm">
      {/* Decorative corner sparkle */}
      <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-200/40 blur-2xl" />
      <div className="pointer-events-none absolute -left-6 -bottom-6 h-24 w-24 rounded-full bg-fuchsia-200/30 blur-2xl" />

      <div className="relative flex items-start gap-3">
        <div className="flex-shrink-0 rounded-2xl bg-gradient-to-br from-amber-400 via-rose-500 to-fuchsia-600 p-2.5 shadow">
          <Gem className="h-5 w-5 text-white" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-neutral-900">{labels.title}</h3>
            <span className="inline-flex items-center rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200/70">
              {labels.badge}
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-700">{labels.subtitle}</p>

          <ul className="mt-3 space-y-1.5">
            {props.reasons.map((reason) => {
              const Icon = REASON_ICONS[reason.key] ?? Sparkles
              const text = labels[reason.textKey] ?? reason.textKey
              return (
                <li
                  key={reason.key}
                  className="flex items-start gap-2 text-sm text-neutral-800"
                >
                  <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-500" strokeWidth={2.25} />
                  <span>{text}</span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    title: 'Une pépite cachée',
    badge: 'Hidden gem',
    subtitle: 'Une expérience moins connue mais qui vaut vraiment le détour.',
    offBeatenPath: 'Loin des circuits touristiques du sud.',
    stargazingExperience: 'Observation des étoiles dans un ciel protégé.',
    gastroDeep: 'Dégustation authentique, producteurs locaux.',
    culturalDepth: 'Plongée dans le patrimoine local.',
    richContent: 'Itinéraire détaillé, FAQ et visuels complets.',
    nicheExperience: 'Expérience de niche, peu répandue sur l\'île.',
  },
  en: {
    title: 'A hidden gem',
    badge: 'Hidden gem',
    subtitle: 'A lesser-known experience that really stands out.',
    offBeatenPath: 'Off the crowded south-coast tourist circuit.',
    stargazingExperience: 'Stargazing under one of Europe\'s clearest skies.',
    gastroDeep: 'Authentic tasting with local producers.',
    culturalDepth: 'Deep dive into the island\'s heritage.',
    richContent: 'Detailed itinerary, FAQ and rich visuals.',
    nicheExperience: 'Niche experience, rarely offered on the island.',
  },
  es: {
    title: 'Una joya escondida',
    badge: 'Hidden gem',
    subtitle: 'Una experiencia menos conocida que merece la pena descubrir.',
    offBeatenPath: 'Lejos de los circuitos turísticos del sur.',
    stargazingExperience: 'Observación de estrellas bajo un cielo privilegiado.',
    gastroDeep: 'Cata auténtica con productores locales.',
    culturalDepth: 'Inmersión en el patrimonio local.',
    richContent: 'Itinerario detallado, FAQ y fotografías completas.',
    nicheExperience: 'Experiencia de nicho, poco habitual en la isla.',
  },
  de: {
    title: 'Ein verstecktes Juwel',
    badge: 'Hidden gem',
    subtitle: 'Ein weniger bekanntes Erlebnis, das sich wirklich lohnt.',
    offBeatenPath: 'Abseits der überlaufenen Südküste.',
    stargazingExperience: 'Sterne unter einem der klarsten Himmel Europas.',
    gastroDeep: 'Authentische Verkostung bei lokalen Erzeugern.',
    culturalDepth: 'Tief eintauchen in das Erbe der Insel.',
    richContent: 'Detaillierter Ablauf, FAQ und reiche Bildergalerie.',
    nicheExperience: 'Nischenerlebnis, selten auf der Insel angeboten.',
  },
  it: {
    title: 'Una gemma nascosta',
    badge: 'Hidden gem',
    subtitle: 'Un\'esperienza meno nota che vale davvero la pena.',
    offBeatenPath: 'Lontano dai circuiti turistici del sud.',
    stargazingExperience: 'Osservazione delle stelle sotto un cielo privilegiato.',
    gastroDeep: 'Degustazione autentica con produttori locali.',
    culturalDepth: 'Immersione nel patrimonio dell\'isola.',
    richContent: 'Itinerario dettagliato, FAQ e immagini ricche.',
    nicheExperience: 'Esperienza di nicchia, rara sull\'isola.',
  },
  ru: {
    title: 'Скрытая жемчужина',
    badge: 'Hidden gem',
    subtitle: 'Менее известный опыт, который действительно стоит внимания.',
    offBeatenPath: 'В стороне от переполненного туристического юга.',
    stargazingExperience: 'Наблюдение за звёздами под одним из чистейших небес Европы.',
    gastroDeep: 'Аутентичная дегустация у местных производителей.',
    culturalDepth: 'Глубокое знакомство с наследием острова.',
    richContent: 'Подробный маршрут, FAQ и качественные визуалы.',
    nicheExperience: 'Нишевое предложение, редкое на острове.',
  },
}
