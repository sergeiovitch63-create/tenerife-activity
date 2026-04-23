/**
 * Value-Story card — "why the price makes sense"
 *
 * Sidebar card, sits next to the price block. Displays up to 5 social-
 * proof / booking-safety points emitted by
 * `src/lib/personalize/scorers/value-story.ts`. Pure presentation.
 */

import {
  Star, Award, ThumbsUp, Tag, Gem, Sparkles, ShieldCheck, Zap,
  Images, FileText,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ModuleScore, ActivitySignals } from '@/lib/personalize/types'
import type {
  ValueStoryPoint,
  ValueStoryProps,
} from '@/lib/personalize/scorers/value-story'

type Props = {
  signals: ActivitySignals
  score: ModuleScore
  locale: string
}

const VIBE_HEADER: Record<
  ValueStoryProps['vibe'],
  { tone: string; ring: string; badge: string; icon: LucideIcon }
> = {
  'great-deal': {
    tone: 'text-rose-900',
    ring: 'ring-rose-200',
    badge: 'bg-rose-100 text-rose-800',
    icon: Tag,
  },
  fair: {
    tone: 'text-emerald-900',
    ring: 'ring-emerald-200',
    badge: 'bg-emerald-100 text-emerald-800',
    icon: ThumbsUp,
  },
  premium: {
    tone: 'text-indigo-900',
    ring: 'ring-indigo-200',
    badge: 'bg-indigo-100 text-indigo-800',
    icon: Gem,
  },
  new: {
    tone: 'text-amber-900',
    ring: 'ring-amber-200',
    badge: 'bg-amber-100 text-amber-800',
    icon: Sparkles,
  },
}

export function ValueStoryCard({ score: moduleScore, locale }: Props) {
  const props = moduleScore.props as ValueStoryProps
  const labels = TRANSLATIONS[locale] ?? TRANSLATIONS.fr
  const header = VIBE_HEADER[props.vibe]
  const HeaderIcon = header.icon

  // Visible point cap — sidebar should stay compact.
  const visible = props.points.slice(0, 5)

  return (
    <div className={`rounded-2xl border bg-white p-4 ring-1 ${header.ring}`}>
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-neutral-50 to-white p-2 ring-1 ring-neutral-200">
          <HeaderIcon className={`h-4 w-4 ${header.tone}`} strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-sm font-semibold text-neutral-900">
              {labels[`title_${props.vibe}`]}
            </h3>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${header.badge}`}
            >
              {labels[`badge_${props.vibe}`]}
            </span>
          </div>
          <p className="mt-0.5 text-xs leading-snug text-neutral-600">
            {labels[`subtitle_${props.vibe}`]}
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-1.5">
        {visible.map((point, i) => (
          <PointRow key={i} point={point} labels={labels} />
        ))}
      </ul>
    </div>
  )
}

function PointRow({
  point,
  labels,
}: {
  point: ValueStoryPoint
  labels: Record<string, string>
}) {
  const { Icon, tone, text } = renderPoint(point, labels)
  return (
    <li className="flex items-start gap-2 text-xs text-neutral-700">
      <Icon className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${tone}`} strokeWidth={2.5} />
      <span className="leading-snug">{text}</span>
    </li>
  )
}

type Rendered = { Icon: LucideIcon; tone: string; text: string }

function renderPoint(point: ValueStoryPoint, labels: Record<string, string>): Rendered {
  switch (point.kind) {
    case 'tripAdvisor':
      return {
        Icon: Star,
        tone: 'text-amber-500',
        text: interpolate(labels.point_tripAdvisor, {
          rating: point.rating.toFixed(1).replace('.0', ''),
        }),
      }
    case 'topRated':
      return {
        Icon: Award,
        tone: 'text-amber-600',
        text: labels.point_topRated,
      }
    case 'recommended':
      return {
        Icon: ThumbsUp,
        tone: 'text-emerald-600',
        text: interpolate(labels.point_recommended, { percent: point.percent }),
      }
    case 'discount':
      return {
        Icon: Tag,
        tone: 'text-rose-600',
        text: interpolate(labels.point_discount, { percent: point.percent }),
      }
    case 'priceTier':
      return {
        Icon: point.tier === 'premium' ? Gem : ThumbsUp,
        tone: point.tier === 'premium' ? 'text-indigo-600' : 'text-emerald-600',
        text: labels[`point_price_${point.tier}`],
      }
    case 'freshCatalog':
      return {
        Icon: Sparkles,
        tone: 'text-amber-500',
        text: labels.point_freshCatalog,
      }
    case 'freeCancellation':
      return {
        Icon: ShieldCheck,
        tone: 'text-emerald-600',
        text: labels.point_freeCancellation,
      }
    case 'instantConfirmation':
      return {
        Icon: Zap,
        tone: 'text-indigo-600',
        text: labels.point_instantConfirmation,
      }
    case 'richMedia':
      return {
        Icon: Images,
        tone: 'text-sky-600',
        text: interpolate(labels.point_richMedia, { count: point.photoCount }),
      }
    case 'documented':
      return {
        Icon: FileText,
        tone: 'text-indigo-600',
        text: labels.point_documented,
      }
  }
}

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''))
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    title_greatDeal: 'Prix doux du moment',
    title_fair: 'Un choix solide',
    title_premium: 'Expérience premium',
    title_new: 'Nouveauté du catalogue',
    'title_great-deal': 'Prix doux du moment',
    'badge_great-deal': 'Promo',
    badge_fair: 'Valeur sûre',
    badge_premium: 'Premium',
    badge_new: 'Nouveau',
    'subtitle_great-deal': 'Réduction active et avis solides — la combo gagnante.',
    subtitle_fair: 'Réputation et politique de réservation flexibles en face du prix.',
    subtitle_premium: 'Offre haut de gamme avec les garanties qui vont avec.',
    subtitle_new: 'Fraîchement ajouté — premiers retours attendus.',
    point_tripAdvisor: 'TripAdvisor {rating}/5 — validé par les voyageurs.',
    point_topRated: 'Top 10 des activités de l\'île selon les voyageurs.',
    point_recommended: '{percent}% des clients recommandent.',
    point_discount: 'Remise active de {percent}% — ne traîne pas.',
    point_price_low: 'Prix accessibles, rapport qualité/prix imbattable.',
    point_price_mid: 'Positionnement milieu de gamme — rapport équilibré.',
    point_price_high: 'Haut de gamme, prestations à la hauteur.',
    point_price_premium: 'Expérience premium, petits groupes privilégiés.',
    point_freshCatalog: 'Nouveauté fraîchement arrivée dans le catalogue.',
    point_freeCancellation: 'Annulation gratuite jusqu\'à 24 h avant.',
    point_instantConfirmation: 'Confirmation immédiate, voucher par email.',
    point_richMedia: '{count} photos et vidéos — visualise avant de réserver.',
    point_documented: 'Fiche détaillée : itinéraire, FAQ, vidéo.',
  },
  en: {
    'title_great-deal': 'Today\'s best price',
    title_fair: 'A solid pick',
    title_premium: 'Premium experience',
    title_new: 'Fresh in the catalog',
    'badge_great-deal': 'Deal',
    badge_fair: 'Safe choice',
    badge_premium: 'Premium',
    badge_new: 'New',
    'subtitle_great-deal': 'Active discount and strong reviews — a winning combo.',
    subtitle_fair: 'Reputation and flexible booking alongside a fair price.',
    subtitle_premium: 'High-end offer with the guarantees to match.',
    subtitle_new: 'Recently added — early reviews expected soon.',
    point_tripAdvisor: 'TripAdvisor {rating}/5 — traveler-verified.',
    point_topRated: 'Top 10 activities on the island, per travelers.',
    point_recommended: '{percent}% of guests recommend it.',
    point_discount: 'Active {percent}% discount — don\'t wait.',
    point_price_low: 'Accessible price, unbeatable value.',
    point_price_mid: 'Mid-range positioning — balanced value.',
    point_price_high: 'Upper tier, matching quality.',
    point_price_premium: 'Premium experience, small groups favored.',
    point_freshCatalog: 'Fresh arrival in the catalog.',
    point_freeCancellation: 'Free cancellation up to 24 h before.',
    point_instantConfirmation: 'Instant confirmation, voucher by email.',
    point_richMedia: '{count} photos and videos — preview before you book.',
    point_documented: 'Detailed page: itinerary, FAQ, video.',
  },
  es: {
    'title_great-deal': 'Mejor precio del momento',
    title_fair: 'Una elección sólida',
    title_premium: 'Experiencia premium',
    title_new: 'Novedad del catálogo',
    'badge_great-deal': 'Oferta',
    badge_fair: 'Valor seguro',
    badge_premium: 'Premium',
    badge_new: 'Nuevo',
    'subtitle_great-deal': 'Descuento activo y buenas reseñas — combo ganador.',
    subtitle_fair: 'Reputación y reserva flexible frente a un precio justo.',
    subtitle_premium: 'Oferta de gama alta con las garantías que corresponden.',
    subtitle_new: 'Recién añadido — primeras opiniones esperadas.',
    point_tripAdvisor: 'TripAdvisor {rating}/5 — validado por viajeros.',
    point_topRated: 'Top 10 de las actividades de la isla, según viajeros.',
    point_recommended: 'El {percent}% de los clientes lo recomienda.',
    point_discount: 'Descuento activo del {percent}% — no tardes.',
    point_price_low: 'Precios accesibles, relación calidad/precio inmejorable.',
    point_price_mid: 'Gama media — relación equilibrada.',
    point_price_high: 'Gama alta, prestaciones a la altura.',
    point_price_premium: 'Experiencia premium, grupos reducidos.',
    point_freshCatalog: 'Recién incorporada al catálogo.',
    point_freeCancellation: 'Cancelación gratuita hasta 24 h antes.',
    point_instantConfirmation: 'Confirmación inmediata, voucher por email.',
    point_richMedia: '{count} fotos y vídeos — visualiza antes de reservar.',
    point_documented: 'Ficha detallada: itinerario, FAQ, vídeo.',
  },
  de: {
    'title_great-deal': 'Bester Preis derzeit',
    title_fair: 'Solide Wahl',
    title_premium: 'Premium-Erlebnis',
    title_new: 'Neu im Katalog',
    'badge_great-deal': 'Angebot',
    badge_fair: 'Sicher',
    badge_premium: 'Premium',
    badge_new: 'Neu',
    'subtitle_great-deal': 'Aktiver Rabatt und gute Bewertungen — perfekte Kombi.',
    subtitle_fair: 'Ruf und flexible Buchung neben fairem Preis.',
    subtitle_premium: 'Hochwertiges Angebot mit passenden Garantien.',
    subtitle_new: 'Kürzlich hinzugefügt — erste Bewertungen folgen.',
    point_tripAdvisor: 'TripAdvisor {rating}/5 — von Reisenden bestätigt.',
    point_topRated: 'Top-10-Aktivitäten der Insel laut Reisenden.',
    point_recommended: '{percent}% der Gäste empfehlen es weiter.',
    point_discount: 'Aktueller Rabatt: {percent}% — nicht zögern.',
    point_price_low: 'Günstig, unschlagbares Preis-Leistungs-Verhältnis.',
    point_price_mid: 'Mittelklasse — ausgewogenes Verhältnis.',
    point_price_high: 'Oberklasse, passende Leistung.',
    point_price_premium: 'Premium-Erlebnis, kleine Gruppen bevorzugt.',
    point_freshCatalog: 'Frisch im Katalog.',
    point_freeCancellation: 'Kostenlose Stornierung bis 24 h vorher.',
    point_instantConfirmation: 'Sofortige Bestätigung, Voucher per E-Mail.',
    point_richMedia: '{count} Fotos und Videos — vorab anschauen.',
    point_documented: 'Detaillierte Seite: Route, FAQ, Video.',
  },
  it: {
    'title_great-deal': 'Miglior prezzo del momento',
    title_fair: 'Scelta solida',
    title_premium: 'Esperienza premium',
    title_new: 'Novità del catalogo',
    'badge_great-deal': 'Offerta',
    badge_fair: 'Sicuro',
    badge_premium: 'Premium',
    badge_new: 'Nuovo',
    'subtitle_great-deal': 'Sconto attivo e recensioni solide — combo vincente.',
    subtitle_fair: 'Reputazione e prenotazione flessibile a un prezzo giusto.',
    subtitle_premium: 'Offerta di fascia alta con garanzie adeguate.',
    subtitle_new: 'Appena aggiunto — prime recensioni in arrivo.',
    point_tripAdvisor: 'TripAdvisor {rating}/5 — validato dai viaggiatori.',
    point_topRated: 'Top 10 delle attività dell\'isola secondo i viaggiatori.',
    point_recommended: 'Il {percent}% degli ospiti lo consiglia.',
    point_discount: 'Sconto attivo del {percent}% — non aspettare.',
    point_price_low: 'Prezzi accessibili, qualità/prezzo imbattibile.',
    point_price_mid: 'Fascia media — rapporto equilibrato.',
    point_price_high: 'Fascia alta, prestazioni all\'altezza.',
    point_price_premium: 'Esperienza premium, piccoli gruppi privilegiati.',
    point_freshCatalog: 'Novità appena aggiunta al catalogo.',
    point_freeCancellation: 'Cancellazione gratuita fino a 24 h prima.',
    point_instantConfirmation: 'Conferma immediata, voucher via email.',
    point_richMedia: '{count} foto e video — visualizza prima di prenotare.',
    point_documented: 'Scheda dettagliata: itinerario, FAQ, video.',
  },
  ru: {
    'title_great-deal': 'Лучшая цена сейчас',
    title_fair: 'Надёжный выбор',
    title_premium: 'Премиум-опыт',
    title_new: 'Новинка каталога',
    'badge_great-deal': 'Скидка',
    badge_fair: 'Надёжно',
    badge_premium: 'Премиум',
    badge_new: 'Новое',
    'subtitle_great-deal': 'Активная скидка и хорошие отзывы — выигрышная комбинация.',
    subtitle_fair: 'Репутация и гибкое бронирование при справедливой цене.',
    subtitle_premium: 'Премиум-предложение с соответствующими гарантиями.',
    subtitle_new: 'Недавно добавлено — первые отзывы скоро.',
    point_tripAdvisor: 'TripAdvisor {rating}/5 — подтверждено туристами.',
    point_topRated: 'Топ-10 активностей острова по мнению путешественников.',
    point_recommended: '{percent}% гостей рекомендуют.',
    point_discount: 'Активная скидка {percent}% — не тяните.',
    point_price_low: 'Доступная цена, отличное соотношение.',
    point_price_mid: 'Средний сегмент — сбалансированное соотношение.',
    point_price_high: 'Высокий сегмент, качество соответствует.',
    point_price_premium: 'Премиум-опыт, небольшие группы.',
    point_freshCatalog: 'Свежее поступление в каталог.',
    point_freeCancellation: 'Бесплатная отмена за 24 ч.',
    point_instantConfirmation: 'Моментальное подтверждение, ваучер на email.',
    point_richMedia: '{count} фото и видео — посмотрите до брони.',
    point_documented: 'Детальная страница: маршрут, FAQ, видео.',
  },
}
