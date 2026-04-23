/**
 * Companion-Duo card — "works across generations."
 *
 * Left-secondary companion to CompanionFit + FamilyFit. Only renders
 * when the scorer decides the activity bridges a family archetype
 * with couples or seniors (i.e. a real multi-gen outing). Visual style
 * intentionally echoes CompanionFit (violet/fuchsia palette) so the
 * pair reads as a single conversation to the user, not two silos.
 *
 * Scorer: `src/lib/personalize/scorers/companion-duo.ts`
 */

import { Users2, Baby, Heart, Wine, Sparkles, CheckCircle2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ModuleScore, ActivitySignals } from '@/lib/personalize/types'
import type {
  CompanionDuoAxis,
  CompanionDuoProps,
} from '@/lib/personalize/scorers/companion-duo'

type Props = {
  signals: ActivitySignals
  score: ModuleScore
  locale: string
}

const ARCHETYPE_ICON: Record<'family-young' | 'family-teens' | 'couple' | 'seniors', LucideIcon> = {
  'family-young': Baby,
  'family-teens': Users2,
  couple: Heart,
  seniors: Wine,
}

export function CompanionDuoCard({ score: moduleScore, locale }: Props) {
  const props = moduleScore.props as CompanionDuoProps
  const labels = TRANSLATIONS[locale] ?? TRANSLATIONS.fr
  const FamilyIcon = ARCHETYPE_ICON[props.familyArchetype]
  const PartnerIcon = ARCHETYPE_ICON[props.partnerArchetype]

  const ageHint =
    props.minAge != null
      ? labels.ageFromYears.replace('{age}', String(props.minAge))
      : labels.ageNoLowerBound

  return (
    <div className="rounded-3xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 p-2.5 shadow-sm">
          <Sparkles className="h-5 w-5 text-white" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-neutral-900">{labels.title}</h3>
          <p className="mt-0.5 text-sm leading-snug text-violet-900/80">
            {labels[`subtitle_${props.axis}`] ?? labels.subtitle_fallback}
          </p>
        </div>
      </div>

      {/* Axis pills — two (or three) generation icons with a "+" */}
      <div className="mt-4 flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-fuchsia-100 to-violet-100 px-4 py-3 ring-1 ring-violet-200">
        <GenerationPill
          Icon={FamilyIcon}
          label={labels[`arch_${props.familyArchetype}`] ?? props.familyArchetype}
        />
        <span className="text-xl font-bold text-violet-400" aria-hidden>
          +
        </span>
        <GenerationPill
          Icon={PartnerIcon}
          label={labels[`arch_${props.partnerArchetype}`] ?? props.partnerArchetype}
        />
        {props.axis === 'family+couple+seniors' && props.partnerArchetype === 'couple' && (
          <>
            <span className="text-xl font-bold text-violet-400" aria-hidden>
              +
            </span>
            <GenerationPill Icon={Wine} label={labels.arch_seniors} />
          </>
        )}
        {props.axis === 'family+couple+seniors' && props.partnerArchetype === 'seniors' && (
          <>
            <span className="text-xl font-bold text-violet-400" aria-hidden>
              +
            </span>
            <GenerationPill Icon={Heart} label={labels.arch_couple} />
          </>
        )}
      </div>

      {/* Facts strip */}
      <ul className="mt-3 space-y-1.5">
        <FactRow>
          <span className="font-semibold text-neutral-900">{labels.factAge}</span>{' '}
          <span className="text-neutral-700">{ageHint}</span>
          {props.infantAllowed && (
            <span className="ml-1 text-neutral-700">· {labels.factInfants}</span>
          )}
        </FactRow>
        <FactRow>
          <span className="font-semibold text-neutral-900">{labels.factPace}</span>{' '}
          <span className="text-neutral-700">
            {labels[`verdict_${props.familyVerdict}`] ?? ''}
          </span>
        </FactRow>
      </ul>
    </div>
  )
}

function GenerationPill({ Icon, label }: { Icon: LucideIcon; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-violet-900 ring-1 ring-violet-300 shadow-sm">
      <Icon className="h-3.5 w-3.5 text-violet-700" strokeWidth={2.25} />
      {label}
    </div>
  )
}

function FactRow({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-xs leading-relaxed">
      <CheckCircle2
        className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-violet-600"
        strokeWidth={2.25}
      />
      <span className="min-w-0 flex-1">{children}</span>
    </li>
  )
}

// --- i18n ---------------------------------------------------------
// Keys match scorer output. Axis-specific subtitles let the UI tune
// the sentence for couple-only, seniors-only, or triple endorsements.
// (Typed as Record<string, string> — the axis subtitle template-literal
// keys were rejected as a parameter type; runtime access is safe.)
const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    title: 'Multigénérationnel',
    subtitle_fallback: 'Trois générations y trouvent leur compte.',
    'subtitle_family+couple': 'Couples et familles se retrouvent sans compromis.',
    'subtitle_family+seniors': 'Les grands-parents suivent le rythme des petits.',
    'subtitle_family+couple+seniors': 'Trois générations y trouvent leur compte.',

    'arch_family-young': 'Jeunes enfants',
    'arch_family-teens': 'Ados',
    arch_couple: 'Couples',
    arch_seniors: 'Seniors',

    factAge: 'Âge :',
    factPace: 'Rythme :',
    factInfants: 'bébés acceptés',

    ageFromYears: 'dès {age} ans',
    ageNoLowerBound: 'tous âges',

    'verdict_great-fit': 'rythme familial confirmé.',
    verdict_workable: 'accessible à tous les âges.',
    verdict_caution: 'vérifiez l\'aptitude des plus jeunes.',
    'verdict_adults-only': 'adultes uniquement.',
  },
  en: {
    title: 'Multi-generational',
    subtitle_fallback: 'Three generations can share this one.',
    'subtitle_family+couple': 'Couples and families meet in the middle.',
    'subtitle_family+seniors': 'Grandparents can keep pace with the kids.',
    'subtitle_family+couple+seniors': 'Three generations can share this one.',

    'arch_family-young': 'Young kids',
    'arch_family-teens': 'Teens',
    arch_couple: 'Couples',
    arch_seniors: 'Seniors',

    factAge: 'Ages:',
    factPace: 'Pace:',
    factInfants: 'infants welcome',

    ageFromYears: 'from age {age}',
    ageNoLowerBound: 'all ages',

    'verdict_great-fit': 'family pace confirmed.',
    verdict_workable: 'works across age groups.',
    verdict_caution: 'check readiness for the youngest.',
    'verdict_adults-only': 'adults only.',
  },
  es: {
    title: 'Multigeneracional',
    subtitle_fallback: 'Tres generaciones disfrutan juntas.',
    'subtitle_family+couple': 'Parejas y familias sin renunciar a nada.',
    'subtitle_family+seniors': 'Los abuelos siguen el ritmo de los peques.',
    'subtitle_family+couple+seniors': 'Tres generaciones disfrutan juntas.',

    'arch_family-young': 'Peques',
    'arch_family-teens': 'Adolescentes',
    arch_couple: 'Parejas',
    arch_seniors: 'Seniors',

    factAge: 'Edad:',
    factPace: 'Ritmo:',
    factInfants: 'bebés admitidos',

    ageFromYears: 'desde {age} años',
    ageNoLowerBound: 'todas las edades',

    'verdict_great-fit': 'ritmo familiar confirmado.',
    verdict_workable: 'apta para todas las edades.',
    verdict_caution: 'confirma la aptitud de los más pequeños.',
    'verdict_adults-only': 'solo adultos.',
  },
  de: {
    title: 'Generationenübergreifend',
    subtitle_fallback: 'Drei Generationen erleben dasselbe.',
    'subtitle_family+couple': 'Paare und Familien treffen sich auf halbem Weg.',
    'subtitle_family+seniors': 'Großeltern halten mit den Kindern mit.',
    'subtitle_family+couple+seniors': 'Drei Generationen erleben dasselbe.',

    'arch_family-young': 'Kleinkinder',
    'arch_family-teens': 'Teens',
    arch_couple: 'Paare',
    arch_seniors: 'Senioren',

    factAge: 'Alter:',
    factPace: 'Tempo:',
    factInfants: 'Babys willkommen',

    ageFromYears: 'ab {age} Jahren',
    ageNoLowerBound: 'jedes Alter',

    'verdict_great-fit': 'familientauglich.',
    verdict_workable: 'für alle Altersgruppen geeignet.',
    verdict_caution: 'Eignung für die Jüngsten prüfen.',
    'verdict_adults-only': 'nur Erwachsene.',
  },
  it: {
    title: 'Multigenerazionale',
    subtitle_fallback: 'Tre generazioni la condividono.',
    'subtitle_family+couple': 'Coppie e famiglie si incontrano senza compromessi.',
    'subtitle_family+seniors': 'I nonni seguono il ritmo dei bambini.',
    'subtitle_family+couple+seniors': 'Tre generazioni la condividono.',

    'arch_family-young': 'Bimbi piccoli',
    'arch_family-teens': 'Adolescenti',
    arch_couple: 'Coppie',
    arch_seniors: 'Senior',

    factAge: 'Età:',
    factPace: 'Ritmo:',
    factInfants: 'neonati ammessi',

    ageFromYears: 'da {age} anni',
    ageNoLowerBound: 'tutte le età',

    'verdict_great-fit': 'ritmo familiare confermato.',
    verdict_workable: 'adatta a tutte le età.',
    verdict_caution: 'verifica l\'idoneità dei più piccoli.',
    'verdict_adults-only': 'solo adulti.',
  },
  ru: {
    title: 'Для разных поколений',
    subtitle_fallback: 'Три поколения найдут общий ритм.',
    'subtitle_family+couple': 'Пары и семьи без компромиссов.',
    'subtitle_family+seniors': 'Старшее поколение успевает за детьми.',
    'subtitle_family+couple+seniors': 'Три поколения найдут общий ритм.',

    'arch_family-young': 'Малыши',
    'arch_family-teens': 'Подростки',
    arch_couple: 'Пары',
    arch_seniors: 'Старшее поколение',

    factAge: 'Возраст:',
    factPace: 'Темп:',
    factInfants: 'младенцы допускаются',

    ageFromYears: 'от {age} лет',
    ageNoLowerBound: 'любой возраст',

    'verdict_great-fit': 'семейный темп подтверждён.',
    verdict_workable: 'подходит для всех возрастов.',
    verdict_caution: 'уточните готовность самых маленьких.',
    'verdict_adults-only': 'только взрослые.',
  },
}
