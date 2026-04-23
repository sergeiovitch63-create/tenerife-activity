/**
 * Companion-Fit card — "who is this for?"
 *
 * Left-secondary card. Ranks the activity across six companion
 * archetypes and highlights the top 3 with a verdict chip (great /
 * good / mixed / poor). The headline archetype gets a hero slot with
 * a contextual reason line.
 *
 * Scorer: `src/lib/personalize/scorers/companion-fit.ts`
 */

import {
  Users, Heart, User, Users2, Wine, Baby, Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ModuleScore, ActivitySignals } from '@/lib/personalize/types'
import type {
  CompanionArchetype,
  CompanionFitProps,
  CompanionRating,
  CompanionVerdict,
} from '@/lib/personalize/scorers/companion-fit'

type Props = {
  signals: ActivitySignals
  score: ModuleScore
  locale: string
}

const ARCHETYPE_ICON: Record<CompanionArchetype, LucideIcon> = {
  solo: User,
  couple: Heart,
  'family-young': Baby,
  'family-teens': Users,
  group: Users2,
  seniors: Wine,
}

const VERDICT_STYLE: Record<CompanionVerdict, { chip: string; row: string }> = {
  great: { chip: 'bg-emerald-100 text-emerald-800 ring-emerald-200',  row: 'border-emerald-200 bg-emerald-50/60' },
  good:  { chip: 'bg-sky-100 text-sky-800 ring-sky-200',              row: 'border-sky-200 bg-sky-50/60' },
  mixed: { chip: 'bg-amber-100 text-amber-800 ring-amber-200',        row: 'border-amber-200 bg-amber-50/60' },
  poor:  { chip: 'bg-neutral-100 text-neutral-700 ring-neutral-200',  row: 'border-neutral-200 bg-neutral-50/60' },
}

export function CompanionFitCard({ score: moduleScore, locale }: Props) {
  const props = moduleScore.props as CompanionFitProps
  const labels = TRANSLATIONS[locale] ?? TRANSLATIONS.fr
  const HeadlineIcon = ARCHETYPE_ICON[props.headline]

  return (
    <div className="rounded-3xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 p-2.5 shadow-sm">
          <Sparkles className="h-5 w-5 text-white" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-neutral-900">
            {labels.title}
          </h3>
          <p className="mt-0.5 text-sm leading-snug text-violet-900/80">
            {labels.subtitle}
          </p>
        </div>
      </div>

      {/* Headline hero */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-violet-100 to-fuchsia-100 px-4 py-3 ring-1 ring-violet-200">
        <HeadlineIcon className="h-6 w-6 flex-shrink-0 text-violet-700" strokeWidth={2.25} />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-wide text-violet-700">
            {labels.headline}
          </div>
          <div className="text-sm font-semibold text-neutral-900">
            {labels[`arch_${props.headline}`] ?? props.headline}
            <span className="ml-2 text-xs font-medium text-violet-800/70">
              · {labels[`reason_${props.top[0].reasonKey}`] ?? ''}
            </span>
          </div>
        </div>
        <span
          className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${VERDICT_STYLE[props.top[0].verdict].chip}`}
        >
          {labels[`verdict_${props.top[0].verdict}`] ?? props.top[0].verdict}
        </span>
      </div>

      {/* Runners-up grid */}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {props.top.slice(1).map((r) => (
          <RatingRow key={r.archetype} rating={r} labels={labels} />
        ))}
      </div>
    </div>
  )
}

function RatingRow({
  rating,
  labels,
}: {
  rating: CompanionRating
  labels: Record<string, string>
}) {
  const Icon = ARCHETYPE_ICON[rating.archetype]
  const style = VERDICT_STYLE[rating.verdict]
  return (
    <div className={`flex items-center gap-2 rounded-xl border p-2.5 ${style.row}`}>
      <Icon className="h-4 w-4 flex-shrink-0 text-neutral-700" strokeWidth={2.25} />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-neutral-900 truncate">
          {labels[`arch_${rating.archetype}`] ?? rating.archetype}
        </div>
        <div className="text-[11px] text-neutral-600 truncate">
          {labels[`reason_${rating.reasonKey}`] ?? ''}
        </div>
      </div>
      <span
        className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 ${style.chip}`}
      >
        {labels[`verdict_${rating.verdict}`] ?? rating.verdict}
      </span>
    </div>
  )
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    title: 'Pour qui ?',
    subtitle: 'Qui va s\'y retrouver le mieux.',
    headline: 'Idéal pour',

    arch_solo: 'Voyageur solo',
    arch_couple: 'En couple',
    'arch_family-young': 'Famille (jeunes enfants)',
    'arch_family-teens': 'Famille (ados)',
    arch_group: 'Entre amis / groupe',
    arch_seniors: 'Seniors, rythme doux',

    verdict_great: 'Parfait',
    verdict_good: 'Convient',
    verdict_mixed: 'Mitigé',
    verdict_poor: 'À éviter',

    reason_solo_default: 'Autonomie possible.',
    reason_solo_adrenaline: 'Sensations à dompter seul·e.',
    reason_solo_photo: 'Terrain de jeu photo.',
    reason_solo_nature: 'Tête dans la nature.',
    reason_solo_culture: 'Découverte à son rythme.',

    reason_couple_default: 'Moment à deux correct.',
    reason_couple_romantic: 'Atmosphère romantique.',
    reason_couple_sunset: 'Coucher de soleil inclus.',

    reason_familyYoung_default: 'Format accessible.',
    reason_familyYoung_lowMin: 'Accepte les petits (dès 6 ans ou moins).',
    reason_familyYoung_infants: 'Bébés acceptés.',
    reason_familyYoung_park: 'Parc à thème, journée complète.',

    reason_familyTeens_default: 'Occupe les ados.',
    reason_familyTeens_adrenaline: 'Sensations fortes au programme.',
    reason_familyTeens_park: 'Parc d\'attractions, liberté de mouvement.',

    reason_group_default: 'Se prête à la sortie groupée.',
    reason_group_boat: 'En mer, l\'ambiance groupe prend.',
    reason_group_adrenaline: 'Sensations collectives.',
    reason_group_party: 'Soirée / ambiance festive.',

    reason_seniors_default: 'Accessible calmement.',
    reason_seniors_relaxed: 'Rythme doux confirmé.',
    reason_seniors_culture: 'Découverte culturelle / gastronomique.',
  },
  en: {
    title: 'Who is it for?',
    subtitle: 'Who will enjoy it most.',
    headline: 'Best for',

    arch_solo: 'Solo traveller',
    arch_couple: 'Couples',
    'arch_family-young': 'Family (young kids)',
    'arch_family-teens': 'Family (teens)',
    arch_group: 'Friends / group',
    arch_seniors: 'Seniors, easy pace',

    verdict_great: 'Great fit',
    verdict_good: 'Works',
    verdict_mixed: 'Mixed',
    verdict_poor: 'Skip',

    reason_solo_default: 'Self-paced.',
    reason_solo_adrenaline: 'Thrills to tame on your own.',
    reason_solo_photo: 'Photographer\'s playground.',
    reason_solo_nature: 'Head in nature.',
    reason_solo_culture: 'Explore at your own pace.',

    reason_couple_default: 'Decent together time.',
    reason_couple_romantic: 'Romantic mood.',
    reason_couple_sunset: 'Sunset included.',

    reason_familyYoung_default: 'Accessible format.',
    reason_familyYoung_lowMin: 'Open to young kids (6 or younger).',
    reason_familyYoung_infants: 'Infants allowed.',
    reason_familyYoung_park: 'Theme park, full-day option.',

    reason_familyTeens_default: 'Engages teens.',
    reason_familyTeens_adrenaline: 'Thrills on the menu.',
    reason_familyTeens_park: 'Theme park, freedom to roam.',

    reason_group_default: 'Works for group outings.',
    reason_group_boat: 'On the water, group vibes flow.',
    reason_group_adrenaline: 'Shared-adrenaline moment.',
    reason_group_party: 'Party / night atmosphere.',

    reason_seniors_default: 'Easy to access.',
    reason_seniors_relaxed: 'Gentle pace confirmed.',
    reason_seniors_culture: 'Cultural / culinary discovery.',
  },
  es: {
    title: '¿Para quién es?',
    subtitle: 'Quién la disfrutará más.',
    headline: 'Ideal para',

    arch_solo: 'Viajero en solitario',
    arch_couple: 'En pareja',
    'arch_family-young': 'Familia (peques)',
    'arch_family-teens': 'Familia (adolescentes)',
    arch_group: 'Amigos / grupo',
    arch_seniors: 'Seniors, ritmo suave',

    verdict_great: 'Perfecto',
    verdict_good: 'Encaja',
    verdict_mixed: 'Mixto',
    verdict_poor: 'Evitar',

    reason_solo_default: 'Autonomía posible.',
    reason_solo_adrenaline: 'Adrenalina a domar en solo.',
    reason_solo_photo: 'Paraíso fotográfico.',
    reason_solo_nature: 'Inmersión en naturaleza.',
    reason_solo_culture: 'Descubrir a tu ritmo.',

    reason_couple_default: 'Buen rato en pareja.',
    reason_couple_romantic: 'Ambiente romántico.',
    reason_couple_sunset: 'Puesta de sol incluida.',

    reason_familyYoung_default: 'Formato accesible.',
    reason_familyYoung_lowMin: 'Abierto a peques (6 años o menos).',
    reason_familyYoung_infants: 'Bebés aceptados.',
    reason_familyYoung_park: 'Parque temático, día completo.',

    reason_familyTeens_default: 'Entretiene a los adolescentes.',
    reason_familyTeens_adrenaline: 'Sensaciones fuertes.',
    reason_familyTeens_park: 'Parque, libertad total.',

    reason_group_default: 'Ideal para salida grupal.',
    reason_group_boat: 'En el mar, el grupo fluye.',
    reason_group_adrenaline: 'Adrenalina compartida.',
    reason_group_party: 'Fiesta / ambiente nocturno.',

    reason_seniors_default: 'Acceso cómodo.',
    reason_seniors_relaxed: 'Ritmo suave confirmado.',
    reason_seniors_culture: 'Descubrimiento cultural / gastro.',
  },
  de: {
    title: 'Für wen geeignet?',
    subtitle: 'Wer wird es am meisten genießen.',
    headline: 'Perfekt für',

    arch_solo: 'Alleinreisend',
    arch_couple: 'Paare',
    'arch_family-young': 'Familie (Kleinkinder)',
    'arch_family-teens': 'Familie (Teenager)',
    arch_group: 'Freunde / Gruppe',
    arch_seniors: 'Senioren, ruhiges Tempo',

    verdict_great: 'Perfekt',
    verdict_good: 'Passt',
    verdict_mixed: 'Gemischt',
    verdict_poor: 'Vermeiden',

    reason_solo_default: 'Autonom möglich.',
    reason_solo_adrenaline: 'Adrenalin allein bändigen.',
    reason_solo_photo: 'Foto-Spielplatz.',
    reason_solo_nature: 'Kopf in der Natur.',
    reason_solo_culture: 'Im eigenen Tempo erkunden.',

    reason_couple_default: 'Ordentliche Paarzeit.',
    reason_couple_romantic: 'Romantische Stimmung.',
    reason_couple_sunset: 'Sonnenuntergang inklusive.',

    reason_familyYoung_default: 'Zugängliches Format.',
    reason_familyYoung_lowMin: 'Ab 6 Jahren oder jünger.',
    reason_familyYoung_infants: 'Babys erlaubt.',
    reason_familyYoung_park: 'Themenpark, Ganztagesoption.',

    reason_familyTeens_default: 'Beschäftigt Teenager.',
    reason_familyTeens_adrenaline: 'Adrenalin garantiert.',
    reason_familyTeens_park: 'Freizeitpark, Bewegungsfreiheit.',

    reason_group_default: 'Gut für Gruppenausflug.',
    reason_group_boat: 'Auf dem Wasser, Gruppenstimmung.',
    reason_group_adrenaline: 'Gemeinsames Adrenalin.',
    reason_group_party: 'Party / Abendatmosphäre.',

    reason_seniors_default: 'Bequemer Zugang.',
    reason_seniors_relaxed: 'Ruhiges Tempo bestätigt.',
    reason_seniors_culture: 'Kulturelle / kulinarische Entdeckung.',
  },
  it: {
    title: 'Per chi è?',
    subtitle: 'Chi la apprezzerà di più.',
    headline: 'Ideale per',

    arch_solo: 'Viaggiatore solo',
    arch_couple: 'Coppie',
    'arch_family-young': 'Famiglia (bimbi piccoli)',
    'arch_family-teens': 'Famiglia (adolescenti)',
    arch_group: 'Amici / gruppo',
    arch_seniors: 'Senior, ritmo soft',

    verdict_great: 'Perfetto',
    verdict_good: 'Va bene',
    verdict_mixed: 'Misto',
    verdict_poor: 'Evitare',

    reason_solo_default: 'Autonomia possibile.',
    reason_solo_adrenaline: 'Adrenalina da domare in solo.',
    reason_solo_photo: 'Paradiso fotografico.',
    reason_solo_nature: 'Immersi nella natura.',
    reason_solo_culture: 'Scoperta al proprio ritmo.',

    reason_couple_default: 'Tempo a due discreto.',
    reason_couple_romantic: 'Atmosfera romantica.',
    reason_couple_sunset: 'Tramonto incluso.',

    reason_familyYoung_default: 'Formato accessibile.',
    reason_familyYoung_lowMin: 'Aperto ai piccoli (6 anni o meno).',
    reason_familyYoung_infants: 'Neonati accettati.',
    reason_familyYoung_park: 'Parco tematico, giornata completa.',

    reason_familyTeens_default: 'Intrattiene gli adolescenti.',
    reason_familyTeens_adrenaline: 'Emozioni forti.',
    reason_familyTeens_park: 'Parco, libertà totale.',

    reason_group_default: 'Ottimo per gruppi.',
    reason_group_boat: 'In mare, vibe di gruppo garantito.',
    reason_group_adrenaline: 'Adrenalina condivisa.',
    reason_group_party: 'Festa / atmosfera serale.',

    reason_seniors_default: 'Accesso comodo.',
    reason_seniors_relaxed: 'Ritmo dolce confermato.',
    reason_seniors_culture: 'Scoperta culturale / gastronomica.',
  },
  ru: {
    title: 'Для кого подойдёт?',
    subtitle: 'Кому это понравится больше.',
    headline: 'Идеально для',

    arch_solo: 'В одиночку',
    arch_couple: 'Для пар',
    'arch_family-young': 'Семья (малыши)',
    'arch_family-teens': 'Семья (подростки)',
    arch_group: 'Друзья / группа',
    arch_seniors: 'Старшее поколение, мягкий темп',

    verdict_great: 'Идеально',
    verdict_good: 'Подходит',
    verdict_mixed: 'Неоднозначно',
    verdict_poor: 'Избегать',

    reason_solo_default: 'Автономия возможна.',
    reason_solo_adrenaline: 'Адреналин в одиночку.',
    reason_solo_photo: 'Рай для фотографа.',
    reason_solo_nature: 'Погружение в природу.',
    reason_solo_culture: 'Изучаем в своём темпе.',

    reason_couple_default: 'Достойное время вдвоём.',
    reason_couple_romantic: 'Романтическая атмосфера.',
    reason_couple_sunset: 'Закат включён.',

    reason_familyYoung_default: 'Доступный формат.',
    reason_familyYoung_lowMin: 'Принимают малышей (6 лет и младше).',
    reason_familyYoung_infants: 'Младенцы допускаются.',
    reason_familyYoung_park: 'Тематический парк, на весь день.',

    reason_familyTeens_default: 'Увлекает подростков.',
    reason_familyTeens_adrenaline: 'Острые ощущения.',
    reason_familyTeens_park: 'Парк, свобода передвижения.',

    reason_group_default: 'Подходит для компании.',
    reason_group_boat: 'В море, групповая атмосфера.',
    reason_group_adrenaline: 'Общий адреналин.',
    reason_group_party: 'Вечеринка / ночная атмосфера.',

    reason_seniors_default: 'Удобный доступ.',
    reason_seniors_relaxed: 'Мягкий темп подтверждён.',
    reason_seniors_culture: 'Культурное / гастрономическое открытие.',
  },
}
