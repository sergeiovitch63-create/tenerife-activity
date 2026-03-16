'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/ui/components/shared/Button'
import { useTranslations, useLocale } from 'next-intl'
import { getInspiredRecommendations, type GetInspiredAnswers } from '@/lib/recommendations/get-inspired'
import type { Activity } from '@/core/entities/activity'
import type { GroupType, Mood, TimeAvailable } from '@/lib/recommendations/mapping'

type QuizAnswers = {
  q1: string | null // Who are you travelling with?
  q2: string | null // What kind of experience?
  q3: string | null // How active?
  q4: string | null // How much time?
  q5: string | null // Budget?
  q6: string | null // What matters most?
}

function mapAnswersToGetInspired(answers: QuizAnswers): GetInspiredAnswers {
  const GROUP_MAP: Record<string, GroupType> = {
    'Solo': 'solo',
    'Couple': 'couple',
    'Family': 'family',
    'Friends': 'friends',
    'Group (6+)': 'friends',
  }
  const MOOD_MAP: Record<string, Mood> = {
    'Chill & Relax': 'relax',
    'Adventure & Nature': 'adventure',
    'Luxury & VIP': 'romantic',
    'Culture & Shows': 'culture',
    // 'Fun & Entertainment' has no direct Mood equivalent — omitted (scored via other answers)
  }
  const TIME_MAP: Record<string, TimeAvailable> = {
    '1–2 hours': '2-3hours',
    'Half day': 'halfday',
    'Full day': 'fullday',
    'Several days': 'multiday',
  }

  return {
    group: (answers.q1 ? GROUP_MAP[answers.q1] ?? null : null),
    mood:  (answers.q2 ? MOOD_MAP[answers.q2] ?? null : null),
    intensity:
      answers.q3 === 'Very relaxed' ? 'low-intensity'
      : answers.q3 === 'Balanced'    ? 'medium-intensity'
      : answers.q3 === 'Very active' ? 'high-intensity'
      : null,
    time:   (answers.q4 ? TIME_MAP[answers.q4] ?? null : null),
    budget:
      answers.q5 === '€ Budget'          ? 'budget-1'
      : answers.q5 === '€€ Comfortable'  ? 'budget-2'
      : answers.q5 === '€€€ Premium / VIP' ? 'budget-3'
      : null,
  }
}

export function GetInspiredQuiz({ activities }: { activities: Activity[] }) {
  const t = useTranslations('getInspired.quiz')
  const locale = useLocale()
  const [currentStep, setCurrentStep] = useState(1)
  const [answers, setAnswers] = useState<QuizAnswers>({
    q1: null,
    q2: null,
    q3: null,
    q4: null,
    q5: null,
    q6: null,
  })

  const totalSteps = 6
  const isComplete = currentStep > totalSteps

  // Compute recommendations from real data
  let recommendations: Activity[] = []
  let useFallback = false

  if (isComplete) {
    const inspiredAnswers = mapAnswersToGetInspired(answers)
    const result = getInspiredRecommendations(activities, inspiredAnswers)
    if (result.length > 0) {
      recommendations = result
    } else if (activities.length > 0) {
      // No tag matches — show top activities as fallback
      recommendations = activities.slice(0, 4)
      useFallback = true
    } else {
      useFallback = true
    }
  }

  // Map question IDs to translation keys
  const questionKeys: Record<string, string> = {
    q1: 'questions.group',
    q2: 'questions.experience',
    q3: 'questions.intensity',
    q4: 'questions.time',
    q5: 'questions.budget',
    q6: 'questions.priority',
  }

  // Map question IDs to option translation keys
  const optionKeys: Record<string, Record<string, string>> = {
    q1: {
      'Solo': 'options.group.solo',
      'Couple': 'options.group.couple',
      'Family': 'options.group.family',
      'Friends': 'options.group.friends',
      'Group (6+)': 'options.group.group6plus',
    },
    q2: {
      'Chill & Relax': 'options.experience.chillRelax',
      'Adventure & Nature': 'options.experience.adventureNature',
      'Fun & Entertainment': 'options.experience.funEntertainment',
      'Luxury & VIP': 'options.experience.luxuryVip',
      'Culture & Shows': 'options.experience.cultureShows',
    },
    q3: {
      'Very relaxed': 'options.intensity.veryRelaxed',
      'Balanced': 'options.intensity.balanced',
      'Very active': 'options.intensity.veryActive',
    },
    q4: {
      '1–2 hours': 'options.time.1-2h',
      'Half day': 'options.time.halfday',
      'Full day': 'options.time.fullday',
      'Several days': 'options.time.severalDays',
    },
    q5: {
      '€ Budget': 'options.budget.budget',
      '€€ Comfortable': 'options.budget.comfortable',
      '€€€ Premium / VIP': 'options.budget.premium',
    },
    q6: {
      'Incredible views': 'options.priority.incredibleViews',
      'Unique experience': 'options.priority.uniqueExperience',
      'Comfort & ease': 'options.priority.comfortEase',
      'Adrenaline': 'options.priority.adrenaline',
      'Instagram moments': 'options.priority.instagramMoments',
    },
  }

  const getQuestionText = (questionId: string): string => {
    const key = questionKeys[questionId]
    return key ? t(key) : t('questionFallback')
  }

  const getOptionText = (questionId: string, optionValue: string): string => {
    const keys = optionKeys[questionId]
    const key = keys?.[optionValue]
    return key ? t(key) : optionValue
  }

  const questions = [
    {
      id: 'q1',
      question: getQuestionText('q1'),
      options: ['Solo', 'Couple', 'Family', 'Friends', 'Group (6+)'].map(opt => ({
        value: opt,
        label: getOptionText('q1', opt),
      })),
    },
    {
      id: 'q2',
      question: getQuestionText('q2'),
      options: ['Chill & Relax', 'Adventure & Nature', 'Fun & Entertainment', 'Luxury & VIP', 'Culture & Shows'].map(opt => ({
        value: opt,
        label: getOptionText('q2', opt),
      })),
    },
    {
      id: 'q3',
      question: getQuestionText('q3'),
      options: ['Very relaxed', 'Balanced', 'Very active'].map(opt => ({
        value: opt,
        label: getOptionText('q3', opt),
      })),
    },
    {
      id: 'q4',
      question: getQuestionText('q4'),
      options: ['1–2 hours', 'Half day', 'Full day', 'Several days'].map(opt => ({
        value: opt,
        label: getOptionText('q4', opt),
      })),
    },
    {
      id: 'q5',
      question: getQuestionText('q5'),
      options: ['€ Budget', '€€ Comfortable', '€€€ Premium / VIP'].map(opt => ({
        value: opt,
        label: getOptionText('q5', opt),
      })),
    },
    {
      id: 'q6',
      question: getQuestionText('q6'),
      options: ['Incredible views', 'Unique experience', 'Comfort & ease', 'Adrenaline', 'Instagram moments'].map(opt => ({
        value: opt,
        label: getOptionText('q6', opt),
      })),
    },
  ]

  const handleAnswer = (questionId: keyof QuizAnswers, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))

    setTimeout(() => {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1)
      } else {
        setCurrentStep(totalSteps + 1)
      }
    }, 400)
  }

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleRestart = () => {
    setCurrentStep(1)
    setAnswers({ q1: null, q2: null, q3: null, q4: null, q5: null, q6: null })
  }

  const currentQuestion = questions[currentStep - 1] || questions[0] || null
  const currentAnswer = currentQuestion ? answers[currentQuestion.id as keyof QuizAnswers] : null

  if (!currentQuestion && !isComplete) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center text-white">
          <p>{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (isComplete) {
    const renderRecommendationCard = (item: Activity) => {
      try {
        if (!item || !item.id || !item.title) return null

        const description = [item.location, item.duration].filter(Boolean).join(' · ')

        return (
          <div
            key={item.id}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20 transition-all duration-300 hover:bg-white/15 hover:shadow-xl hover:-translate-y-1"
          >
            <h3 className="text-xl md:text-2xl font-bold text-white mb-3">
              {item.title}
            </h3>
            <p className="text-white/85 mb-4 leading-relaxed">
              {description || t('results.noDescription')}
            </p>
            {Array.isArray(item.tags) && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {item.tags.map((tag: string, idx: number) => {
                  if (!tag) return null
                  return (
                    <span
                      key={idx}
                      className="px-3 py-1 text-xs font-medium bg-white/10 text-white rounded-full border border-white/20"
                    >
                      {tag}
                    </span>
                  )
                })}
              </div>
            )}
            <Link href={`/${locale}/activity/${item.slug}`} className="block w-full">
              <Button variant="primary" size="md" fullWidth>
                {t('buttons.viewExperience')}
              </Button>
            </Link>
          </div>
        )
      } catch {
        return null
      }
    }

    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="space-y-8">
          {/* Results Header */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.35)' }}>
              {useFallback ? t('results.titleFallback') : t('results.title')}
            </h2>
            <p className="text-lg text-white/85" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.35)' }}>
              {useFallback
                ? t('results.subtitleFallback')
                : t('results.subtitle')}
            </p>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recommendations.map((item, index) => (
              <div
                key={item.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s`, opacity: 0 }}
              >
                {renderRecommendationCard(item)}
              </div>
            ))}
          </div>

          {/* Restart Button */}
          <div className="flex justify-center pt-4">
            <Button onClick={handleRestart} variant="secondary" size="lg">
              {t('buttons.takeQuizAgain')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 md:py-12">
      <div className="space-y-8">
        {/* Progress Indicator */}
        <div className="text-center">
          <p className="text-sm text-white/70 mb-2">
            {t('progress', { current: currentStep, total: totalSteps })}
          </p>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div
              className="bg-ocean-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        {currentQuestion ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 md:p-8 shadow-lg animate-fade-in">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 text-center animate-slide-in-right">
              {currentQuestion.question || t('questionFallback')}
            </h2>

            {/* Options */}
            <div className="space-y-3">
              {Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0 ? (
                currentQuestion.options.map((option, idx) => (
                  <button
                    key={option.value}
                    onClick={() => handleAnswer(currentQuestion.id as keyof QuizAnswers, option.value)}
                    className={`w-full text-left px-6 py-4 rounded-lg border-2 transition-all duration-300 ease-out ${
                      currentAnswer === option.value
                        ? 'bg-ocean-600 border-ocean-400 text-white shadow-md scale-[1.02]'
                        : 'bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30 hover:scale-[1.01]'
                    } animate-fade-in-up`}
                    style={{ animationDelay: `${idx * 0.05}s`, opacity: 0 }}
                  >
                    <span className="font-medium">{option.label || ''}</span>
                  </button>
                ))
              ) : (
                <p className="text-white/70 text-center py-4">{t('noOptions')}</p>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between gap-4 mt-8">
              <Button
                onClick={handleBack}
                variant="ghost"
                size="md"
                disabled={currentStep === 1}
              >
                {t('buttons.back')}
              </Button>
              <Button
                onClick={() => {
                  if (currentStep === totalSteps) {
                    setCurrentStep(totalSteps + 1)
                  } else {
                    handleNext()
                  }
                }}
                variant="primary"
                size="md"
                disabled={!currentAnswer}
              >
                {currentStep === totalSteps ? t('buttons.seeResults') : t('buttons.next')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 md:p-8 shadow-lg text-center text-white">
            <p>{t('error')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
