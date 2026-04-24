/**
 * Guide-Experience card — sidebar reassurance on visit format.
 *
 * Answers "will someone guide me, or am I on my own?" and, as a
 * secondary reassurance, lists the booking languages the platform
 * supports.
 *
 * Scorer: `src/lib/personalize/scorers/guide-experience.ts`
 */

import {
  Users, UserCheck, Map, Bus, Globe, Volume2, Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ModuleScore, ActivitySignals } from '@/lib/personalize/types'
import type {
  GuideArchetype,
  GuideExperienceProps,
} from '@/lib/personalize/scorers/guide-experience'

type Props = {
  signals: ActivitySignals
  score: ModuleScore
  locale: string
}

const ARCHETYPE_STYLE: Record<
  GuideArchetype,
  { gradient: string; accent: string; ring: string; icon: LucideIcon }
> = {
  guided:   { gradient: 'from-sky-500 to-cyan-500',       accent: 'text-sky-900/80',    ring: 'border-sky-200/70 bg-gradient-to-br from-sky-50 to-cyan-50',             icon: UserCheck },
  mixed:    { gradient: 'from-violet-500 to-fuchsia-500', accent: 'text-violet-900/80', ring: 'border-violet-200/70 bg-gradient-to-br from-violet-50 to-fuchsia-50',   icon: Users },
  escorted: { gradient: 'from-amber-500 to-orange-500',   accent: 'text-amber-900/80',  ring: 'border-amber-200/70 bg-gradient-to-br from-amber-50 to-orange-50',      icon: Bus },
  self:     { gradient: 'from-emerald-500 to-teal-500',   accent: 'text-emerald-900/80',ring: 'border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-teal-50',    icon: Map },
}

const LANG_FLAG: Record<string, string> = {
  fr: '🇫🇷', en: '🇬🇧', es: '🇪🇸', de: '🇩🇪', it: '🇮🇹', ru: '🇷🇺',
}

export function GuideExperienceCard({ score: moduleScore, locale }: Props) {
  const props = moduleScore.props as GuideExperienceProps
  const labels = TRANSLATIONS[locale] ?? TRANSLATIONS.fr
  const style = ARCHETYPE_STYLE[props.archetype]
  const HeaderIcon = style.icon

  return (
    <div className={`rounded-2xl border p-4 ${style.ring}`}>
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div className={`flex-shrink-0 rounded-xl bg-gradient-to-br ${style.gradient} p-2 shadow-sm`}>
          <HeaderIcon className="h-4 w-4 text-white" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-neutral-900">
            {labels[`title_${props.archetype}`] ?? labels.title_self}
          </h3>
          <p className={`mt-0.5 text-xs leading-snug ${style.accent}`}>
            {labels[`subtitle_${props.archetype}`] ?? labels.subtitle_self}
          </p>
        </div>
      </div>

      {/* Facts */}
      <div className="mt-3 space-y-1.5">
        {props.hasGuide && (
          <Row
            icon={UserCheck}
            tone="positive"
            text={
              props.guidedVariants < props.totalVariants
                ? labels.fact_guideSome.replace('{n}', String(props.guidedVariants))
                    .replace('{total}', String(props.totalVariants))
                : labels.fact_guideAll
            }
          />
        )}
        {props.hasSelfGuided && (
          <Row
            icon={Map}
            tone="neutral"
            text={
              props.selfGuidedVariants < props.totalVariants
                ? labels.fact_selfSome.replace('{n}', String(props.selfGuidedVariants))
                : labels.fact_selfAll
            }
          />
        )}
        {props.hasTransfer && !props.hasGuide && props.archetype === 'escorted' && (
          <Row icon={Bus} tone="neutral" text={labels.fact_escorted} />
        )}
        {props.languageLight && (
          <Row icon={Volume2} tone="positive" text={labels.fact_languageLight} />
        )}
        {!props.hasGuide && !props.hasSelfGuided && props.archetype === 'self' && (
          <Row icon={Sparkles} tone="neutral" text={labels.fact_freelance} />
        )}
      </div>

      {/* Booking language strip */}
      <div className="mt-3 flex items-center gap-2 border-t border-current/10 pt-3">
        <Globe className={`h-3.5 w-3.5 flex-shrink-0 ${style.accent}`} strokeWidth={2.25} />
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
            {labels.bookingIn}
          </span>
          {props.bookingLanguages.map((lg) => (
            <span
              key={lg}
              className="inline-flex items-center gap-0.5 rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700 ring-1 ring-neutral-200"
              title={labels[`lang_${lg}`] ?? lg}
            >
              <span aria-hidden>{LANG_FLAG[lg]}</span>
              <span className="uppercase">{lg}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function Row({
  icon: Icon,
  text,
  tone,
}: {
  icon: LucideIcon
  text: string
  tone: 'positive' | 'neutral' | 'caution'
}) {
  const tones = {
    positive: 'text-emerald-700',
    caution: 'text-rose-700',
    neutral: 'text-neutral-700',
  } as const
  return (
    <div className="flex items-start gap-2">
      <Icon className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${tones[tone]}`} strokeWidth={2.5} />
      <p className="text-xs font-medium text-neutral-800">{text}</p>
    </div>
  )
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    title_guided: 'Guide inclus',
    subtitle_guided: 'Un guide vous accompagne tout au long.',
    title_mixed: 'Guidé ou libre',
    subtitle_mixed: 'Plusieurs formules — choisissez votre style.',
    title_escorted: 'Transfert accompagné',
    subtitle_escorted: 'Bus inclus, visite ensuite en autonomie.',
    title_self: 'Visite libre',
    subtitle_self: 'Vous explorez à votre rythme.',
    fact_guideAll: 'Un guide multilingue vous accompagne.',
    fact_guideSome: '{n}/{total} formules incluent un guide.',
    fact_selfAll: 'Toutes les formules sont en autonomie.',
    fact_selfSome: '{n} formule(s) sans guide — à votre rythme.',
    fact_escorted: 'Navette aller-retour, visite libre sur place.',
    fact_languageLight: 'Peu de parole — aucune barrière de langue.',
    fact_freelance: 'Autonomie sur place, horaires souples.',
    bookingIn: 'Réservation en',
    lang_fr: 'Français', lang_en: 'Anglais', lang_es: 'Espagnol',
    lang_de: 'Allemand', lang_it: 'Italien', lang_ru: 'Russe',
  },
  en: {
    title_guided: 'Guide included',
    subtitle_guided: 'A guide accompanies you throughout.',
    title_mixed: 'Guided or self-guided',
    subtitle_mixed: 'Multiple options — pick your style.',
    title_escorted: 'Escorted transfer',
    subtitle_escorted: 'Bus included, then visit on your own.',
    title_self: 'Self-guided',
    subtitle_self: 'Explore at your own pace.',
    fact_guideAll: 'A multilingual guide accompanies you.',
    fact_guideSome: '{n}/{total} options include a guide.',
    fact_selfAll: 'All options are self-guided.',
    fact_selfSome: '{n} option(s) without guide — at your own pace.',
    fact_escorted: 'Round-trip shuttle, self-guided visit on site.',
    fact_languageLight: 'Low-speech activity — no language barrier.',
    fact_freelance: 'On-site autonomy, flexible timing.',
    bookingIn: 'Book in',
    lang_fr: 'French', lang_en: 'English', lang_es: 'Spanish',
    lang_de: 'German', lang_it: 'Italian', lang_ru: 'Russian',
  },
  es: {
    title_guided: 'Guía incluido',
    subtitle_guided: 'Un guía te acompaña de principio a fin.',
    title_mixed: 'Con o sin guía',
    subtitle_mixed: 'Varias opciones — elige tu estilo.',
    title_escorted: 'Traslado acompañado',
    subtitle_escorted: 'Bus incluido, visita libre después.',
    title_self: 'Visita libre',
    subtitle_self: 'Exploras a tu ritmo.',
    fact_guideAll: 'Un guía multilingüe te acompaña.',
    fact_guideSome: '{n}/{total} opciones incluyen guía.',
    fact_selfAll: 'Todas las opciones son autoguiadas.',
    fact_selfSome: '{n} opción(es) sin guía — a tu ritmo.',
    fact_escorted: 'Lanzadera ida y vuelta, visita libre en el sitio.',
    fact_languageLight: 'Poca charla — sin barrera idiomática.',
    fact_freelance: 'Autonomía en el sitio, horarios flexibles.',
    bookingIn: 'Reserva en',
    lang_fr: 'Francés', lang_en: 'Inglés', lang_es: 'Español',
    lang_de: 'Alemán', lang_it: 'Italiano', lang_ru: 'Ruso',
  },
  de: {
    title_guided: 'Guide inklusive',
    subtitle_guided: 'Ein Guide begleitet Sie durchgehend.',
    title_mixed: 'Geführt oder frei',
    subtitle_mixed: 'Mehrere Optionen — wählen Sie Ihren Stil.',
    title_escorted: 'Begleiteter Transfer',
    subtitle_escorted: 'Bus inklusive, Besuch anschließend frei.',
    title_self: 'Selbstgeführt',
    subtitle_self: 'Im eigenen Tempo.',
    fact_guideAll: 'Ein mehrsprachiger Guide begleitet Sie.',
    fact_guideSome: '{n}/{total} Optionen mit Guide.',
    fact_selfAll: 'Alle Optionen selbstgeführt.',
    fact_selfSome: '{n} Option(en) ohne Guide — im eigenen Tempo.',
    fact_escorted: 'Hin- und Rückfahrt, Besuch vor Ort frei.',
    fact_languageLight: 'Wenig Sprache — keine Sprachbarriere.',
    fact_freelance: 'Autonom vor Ort, flexible Zeiten.',
    bookingIn: 'Buchung auf',
    lang_fr: 'Französisch', lang_en: 'Englisch', lang_es: 'Spanisch',
    lang_de: 'Deutsch', lang_it: 'Italienisch', lang_ru: 'Russisch',
  },
  it: {
    title_guided: 'Guida inclusa',
    subtitle_guided: 'Una guida ti accompagna per tutta l\'esperienza.',
    title_mixed: 'Con o senza guida',
    subtitle_mixed: 'Più opzioni — scegli il tuo stile.',
    title_escorted: 'Trasferimento accompagnato',
    subtitle_escorted: 'Bus incluso, visita libera in loco.',
    title_self: 'Visita libera',
    subtitle_self: 'Esplora al tuo ritmo.',
    fact_guideAll: 'Una guida multilingue ti accompagna.',
    fact_guideSome: '{n}/{total} opzioni includono una guida.',
    fact_selfAll: 'Tutte le opzioni sono senza guida.',
    fact_selfSome: '{n} opzione/i senza guida — al tuo ritmo.',
    fact_escorted: 'Navetta andata/ritorno, visita libera sul posto.',
    fact_languageLight: 'Poco parlato — nessuna barriera linguistica.',
    fact_freelance: 'Autonomia sul posto, orari flessibili.',
    bookingIn: 'Prenotazione in',
    lang_fr: 'Francese', lang_en: 'Inglese', lang_es: 'Spagnolo',
    lang_de: 'Tedesco', lang_it: 'Italiano', lang_ru: 'Russo',
  },
  ru: {
    title_guided: 'Гид включён',
    subtitle_guided: 'Гид сопровождает вас на протяжении всего.',
    title_mixed: 'С гидом или сам',
    subtitle_mixed: 'Несколько вариантов — выберите свой.',
    title_escorted: 'Трансфер сопровождается',
    subtitle_escorted: 'Автобус включён, далее — самостоятельно.',
    title_self: 'Самостоятельный визит',
    subtitle_self: 'Исследуете в своём темпе.',
    fact_guideAll: 'Многоязычный гид сопровождает вас.',
    fact_guideSome: '{n}/{total} вариантов с гидом.',
    fact_selfAll: 'Все варианты — без гида.',
    fact_selfSome: '{n} вариант(ов) без гида — в своём темпе.',
    fact_escorted: 'Трансфер туда-обратно, визит на месте свободный.',
    fact_languageLight: 'Мало речи — без языкового барьера.',
    fact_freelance: 'Автономия на месте, гибкое расписание.',
    bookingIn: 'Бронирование на',
    lang_fr: 'Французский', lang_en: 'Английский', lang_es: 'Испанский',
    lang_de: 'Немецкий', lang_it: 'Итальянский', lang_ru: 'Русский',
  },
}
