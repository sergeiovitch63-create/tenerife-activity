'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Link } from '@/navigation'
import type { Activity } from '@/core/entities/activity'
import {
  getInspiredRecommendations,
  type GetInspiredAnswers,
} from '@/lib/recommendations/get-inspired'
import { ToursListCardImage } from '@/app/[locale]/debug/tours-list/ToursListCardImage.client'

type StepId = 'group' | 'mood' | 'time' | 'budget' | 'extras'

type Step = {
  id: StepId
  title: string
  subtitle: string
  options: { label: string; value: string }[]
}

const STEPS: Step[] = [
  {
    id: 'group',
    title: 'Tu viens avec qui ?',
    subtitle: 'On adapte les expériences à votre vibe.',
    options: [
      { label: 'En famille', value: 'family' },
      { label: 'En couple', value: 'couple' },
      { label: 'Entre amis', value: 'friends' },
      { label: 'Solo', value: 'solo' },
    ],
  },
  {
    id: 'mood',
    title: 'Quelle ambiance te fait rêver ?',
    subtitle: 'Mer, montagne, adrénaline ou détente totale.',
    options: [
      { label: 'Chill & détente', value: 'relax' },
      { label: 'Aventure & nature', value: 'adventure' },
      { label: 'Romantique', value: 'romantic' },
      { label: 'Tout découvrir', value: 'culture' },
      { label: "Océan d'abord", value: 'ocean' },
    ],
  },
  {
    id: 'time',
    title: 'Tu as combien de temps ?',
    subtitle: 'On cale la sortie sur ton planning.',
    options: [
      { label: '2–3 heures', value: '2-3hours' },
      { label: 'Demi‑journée', value: 'halfday' },
      { label: 'Journée complète', value: 'fullday' },
      { label: 'Soirée', value: 'evening' },
      { label: 'Plusieurs jours', value: 'multiday' },
    ],
  },
  {
    id: 'budget',
    title: 'Et niveau budget ?',
    subtitle: 'On trouve le bon équilibre.',
    options: [
      { label: '💚 Opti‑budget', value: 'budget-1' },
      { label: '💛 Confort', value: 'budget-2' },
      { label: '🧡 Premium / VIP', value: 'budget-3' },
    ],
  },
  {
    id: 'extras',
    title: 'Un point important à respecter ?',
    subtitle: 'On reste bienveillants avec tout le monde.',
    options: [
      { label: 'Rien de particulier', value: 'none' },
      { label: 'Enfants en bas âge', value: 'kids' },
      { label: 'Mobilité réduite', value: 'low-intensity' },
    ],
  },
]

type InspiredMarcoPageProps = {
  activities: Activity[]
}

export function InspiredMarcoPage({ activities }: InspiredMarcoPageProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<StepId, string | null>>({
    group: null,
    mood: null,
    time: null,
    budget: null,
    extras: null,
  })
  const [hasFinished, setHasFinished] = useState(false)

  const currentStep = STEPS[currentStepIndex]

  const recommendedActivities: Activity[] = useMemo(() => {
    if (!hasFinished) return []

    const payload: GetInspiredAnswers = {
      group: (answers.group as GetInspiredAnswers['group']) ?? null,
      mood: (answers.mood as GetInspiredAnswers['mood']) ?? null,
      time: (answers.time as GetInspiredAnswers['time']) ?? null,
      budget: (answers.budget as GetInspiredAnswers['budget']) ?? null,
      intensity:
        answers.extras === 'low-intensity'
          ? 'low-intensity'
          : (null as GetInspiredAnswers['intensity']),
    }

    const scored = getInspiredRecommendations(activities, payload)
    const scoredWithImages = scored.filter(
      (activity) => activity.media && activity.media.src
    )

    // Fallback: if no strong matches, propose a generic selection
    if (scoredWithImages.length > 0) {
      return scoredWithImages
    }

    if (scored.length > 0) {
      return scored
    }

    const allWithImages = activities.filter(
      (activity) => activity.media && activity.media.src
    )

    if (allWithImages.length > 0) {
      return allWithImages.slice(0, Math.min(6, allWithImages.length))
    }

    return activities.slice(0, Math.min(6, activities.length))
  }, [activities, answers, hasFinished])

  const handleSelect = (value: string) => {
    const stepId = currentStep.id
    setAnswers((prev) => ({ ...prev, [stepId]: value }))

    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1)
    } else {
      setHasFinished(true)
    }
  }

  const handleBack = () => {
    if (currentStepIndex === 0) return
    setCurrentStepIndex((prev) => prev - 1)
  }

  const handleRestart = () => {
    setAnswers({
      group: null,
      mood: null,
      time: null,
      budget: null,
      extras: null,
    })
    setCurrentStepIndex(0)
    setHasFinished(false)
  }

  const progressPercent =
    ((currentStepIndex + (hasFinished ? 1 : 0)) / STEPS.length) * 100

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#0d2b35] via-[#1a6b7c] to-[#0f3d4a] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-50">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute h-0.5 w-0.5 rounded-full bg-white/70"
              style={{
                top: `${Math.random() * 90}%`,
                left: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-20 pt-24 md:flex-row md:items-center md:gap-12 md:pt-28 lg:pt-32">
        <section className="mb-10 flex-1 space-y-6 md:mb-0">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/80">
            Votre aventure commence ici
          </p>
          <h1 className="text-balance text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
            Laisse Marco{' '}
            <span className="text-sky-300">
              t&apos;inspirer
            </span>
          </h1>
          <p className="max-w-xl text-base text-white/85 md:text-lg">
            En 4 questions rapides, Marco filtre des dizaines d&apos;expériences
            à Ténérife pour te proposer une sélection vraiment adaptée à ton
            séjour.
          </p>
          <div className="flex flex-wrap gap-3 text-sm text-white/80">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              100% sur‑mesure
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-300" />
              Moins de 60 secondes
            </span>
          </div>
        </section>

        <section className="flex-1">
          <div className="relative mx-auto flex max-w-md flex-col items-center rounded-3xl bg-slate-950/80 px-6 pt-14 pb-6 shadow-[0_24px_80px_rgba(0,0,0,0.7)] ring-1 ring-white/10 backdrop-blur-xl md:max-w-lg">
            <div className="absolute top-5 right-4 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300">
              En ligne
            </div>

            <div className="relative mb-4 flex flex-col items-center">
              <div className="relative h-60 w-52 md:h-72 md:w-60">
                <Image
                  src="/marco.png"
                  alt="Marco"
                  fill
                  sizes="192px"
                  className="object-contain object-bottom"
                />
              </div>
              <div className="pointer-events-none absolute left-1/2 -top-6 w-max -translate-x-1/2 rounded-2xl bg-white px-4 py-2 text-xs font-medium text-slate-900 shadow-lg">
                Marco, ton guide Tenerife
              </div>
            </div>

            <div className="mb-4 w-full space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/60 text-center">
                Votre excursion idéale
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-300 via-sky-300 to-emerald-300 transition-[width] duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-center text-xs text-white/60">
                Étape {Math.min(currentStepIndex + 1, STEPS.length)} sur {STEPS.length}
              </p>
            </div>

            {!hasFinished ? (
              <div className="flex w-full flex-col gap-4">
                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-900 shadow-md">
                  <p className="mb-1 font-semibold">{currentStep.title}</p>
                  <p className="text-xs text-slate-600">{currentStep.subtitle}</p>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  {currentStep.options.map((option) => {
                    const isSelected = answers[currentStep.id] === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSelect(option.value)}
                        className={`rounded-full px-3 py-1.5 text-sm transition ${
                          isSelected
                            ? 'bg-sky-400 text-slate-950 shadow-md'
                            : 'bg-white/5 text-white/90 hover:bg-white/10'
                        }`}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>

                <div className="flex items-center justify-between text-xs text-white/60">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="rounded-full px-2 py-1 text-xs text-white/70 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent"
                    disabled={currentStepIndex === 0}
                  >
                    ← Retour
                  </button>
                  <button
                    type="button"
                    onClick={handleRestart}
                    className="rounded-full px-2 py-1 text-xs text-white/70 hover:bg-white/10"
                  >
                    Tout recommencer
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex w-full flex-col gap-4">
                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-900 shadow-md">
                  <p className="mb-1 font-semibold">
                    Merci ! Voici ce que je te recommande.
                  </p>
                  <p className="text-xs text-slate-600">
                    Tu peux ajuster en changeant tes réponses à tout moment.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRestart}
                  className="w-full rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white hover:bg-white/15"
                >
                  Modifier mes réponses
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {hasFinished && recommendedActivities.length > 0 && (
        <section className="relative z-10 bg-transparent py-10 lg:py-14">
          <div className="mx-auto max-w-6xl px-4">
            <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold">Nos idées pour toi</h2>
                <p className="text-sm text-white/70">
                  Une sélection de {recommendedActivities.length} activités qui
                  matchent le mieux avec tes réponses.
                </p>
              </div>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendedActivities.map((activity) => {
                const codeStr = String(activity.slug || activity.id || '').trim()

                return (
                  <Link
                    key={activity.id}
                    href={`/activite/group-details?code=${encodeURIComponent(codeStr)}`}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 rounded-2xl"
                  >
                    <article className="glass-panel rounded-2xl border border-glass-200 overflow-hidden flex flex-col bg-white/90 hover:shadow-lg hover:-translate-y-1 smooth-transition cursor-pointer h-full">
                      <div className="relative w-full aspect-[4/3] bg-glass-100 overflow-hidden">
                        {activity.media?.src ? (
                          <Image
                            src={activity.media.src}
                            alt={activity.title}
                            fill
                            className="w-full h-full object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        ) : (
                          <ToursListCardImage
                            code={codeStr}
                            alt={activity.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="p-4 md:p-5 space-y-3 flex-1 flex flex-col">
                        <h3 className="text-lg font-semibold text-glass-900 line-clamp-2">
                          {activity.title}
                        </h3>
                        {activity.description && (
                          <p className="text-sm text-glass-700 leading-relaxed line-clamp-4">
                            {activity.description}
                          </p>
                        )}
                        <div className="mt-auto flex items-center justify-between gap-4 text-base font-semibold text-glass-900">
                          <span>
                            {activity.duration ? `⏱ ${activity.duration} h` : '\u00A0'}
                          </span>
                          <span className="text-right">
                            {activity.priceFrom
                              ? `Starting from ${activity.priceFrom.toFixed(2)} €`
                              : ''}
                          </span>
                        </div>
                      </div>
                    </article>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

