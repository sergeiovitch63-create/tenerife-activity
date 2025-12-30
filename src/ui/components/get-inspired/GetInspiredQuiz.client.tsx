'use client'

import { useState } from 'react'
import { Button } from '@/ui/components/shared/Button'
import { useTranslations } from 'next-intl'

type QuizAnswers = {
  q1: string | null // Who are you travelling with?
  q2: string | null // What kind of experience?
  q3: string | null // How active?
  q4: string | null // How much time?
  q5: string | null // Budget?
  q6: string | null // What matters most?
}

// Fixed mock results - always shown regardless of answers
type MockResult = {
  id: string
  title: string
  description: string
  tags: string[]
}

export function GetInspiredQuiz() {
  const t = useTranslations('getInspired.quiz')
  const tResults = useTranslations('getInspired.quiz.results.items')
  const [currentStep, setCurrentStep] = useState(1)
  const [answers, setAnswers] = useState<QuizAnswers>({
    q1: null,
    q2: null,
    q3: null,
    q4: null,
    q5: null,
    q6: null,
  })
  const [hasError, setHasError] = useState(false)
  
  const totalSteps = 6
  const isComplete = currentStep > totalSteps

  // Get translated mock results
  const getTranslatedMockResults = (): MockResult[] => {
    const resultIds = ['1', '2', '3', '4']
    return resultIds.map((id) => {
      try {
        const title = tResults(`${id}.title`)
        const description = tResults(`${id}.description`)
        // Get tags array from translation
        const tagsRaw = tResults.raw(`${id}.tags`) as string[]
        const tags = Array.isArray(tagsRaw) ? tagsRaw : []
        
        return {
          id,
          title,
          description,
          tags,
        }
      } catch (error) {
        // Error loading translation - fallback will be used
        return {
          id,
          title: t('results.experienceFallback'),
          description: t('results.noDescription'),
          tags: [],
        }
      }
    })
  }
  
  // Always get recommendations as an array with safe fallback
  let recommendations: MockResult[] = []
  let useFallback = false
  
  if (isComplete) {
    try {
      // Always return the translated mock results, ignoring answers
      const result = getTranslatedMockResults()
      if (Array.isArray(result) && result.length > 0) {
        recommendations = result
      } else {
        recommendations = getTranslatedMockResults()
        useFallback = true
      }
    } catch (error) {
      // Error getting recommendations - fallback will be used
      recommendations = getTranslatedMockResults()
      useFallback = true
      setHasError(true)
    }
  }
  
  // Safety: Always ensure we have recommendations
  if (recommendations.length === 0) {
    recommendations = getTranslatedMockResults()
    useFallback = true
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

  // Get translated question text
  const getQuestionText = (questionId: string): string => {
    const key = questionKeys[questionId]
    return key ? t(key) : t('questionFallback')
  }

  // Get translated option text
  const getOptionText = (questionId: string, optionValue: string): string => {
    const keys = optionKeys[questionId]
    const key = keys?.[optionValue]
    return key ? t(key) : optionValue
  }

  // Build questions array with translated text
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
    
    // Auto-advance to next question or show results
    setTimeout(() => {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1)
      } else {
        // Last question answered, show results
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
    setAnswers({
      q1: null,
      q2: null,
      q3: null,
      q4: null,
      q5: null,
      q6: null,
    })
  }

  // Safety: Ensure currentQuestion exists
  const currentQuestion = questions[currentStep - 1] || questions[0] || null
  const currentAnswer = currentQuestion ? answers[currentQuestion.id as keyof QuizAnswers] : null

  // Safety: If no current question and not complete, show first question
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
    // Safe rendering function for recommendation cards
    const renderRecommendationCard = (item: MockResult) => {
      try {
        if (!item || !item.id || !item.title) {
          return null
        }
        
        return (
          <div
            key={item.id}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20 transition-all duration-300 hover:bg-white/15 hover:shadow-xl hover:-translate-y-1"
          >
            <h3 className="text-xl md:text-2xl font-bold text-white mb-3">
              {item.title || t('results.experienceFallback')}
            </h3>
            <p className="text-white/85 mb-4 leading-relaxed">
              {item.description || t('results.noDescription')}
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
            <Button variant="primary" size="md" fullWidth>
              {t('buttons.viewExperience')}
            </Button>
          </div>
        )
      } catch (error) {
        // Error rendering card - gracefully degrade
        return null
      }
    }
    
    // Safe rendering of results
    let safeRecommendations: MockResult[] = []
    try {
      safeRecommendations = Array.isArray(recommendations) 
        ? recommendations.filter((item) => item && item.id && item.title)
        : getTranslatedMockResults()
      
      // Final safety: ensure we always have recommendations
      if (safeRecommendations.length === 0) {
        safeRecommendations = getTranslatedMockResults()
        useFallback = true
      }
    } catch (error) {
      // Error processing recommendations - use fallback
      safeRecommendations = getTranslatedMockResults()
      useFallback = true
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

          {/* Results Grid - Always render with safe fallback */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {safeRecommendations.map((item, index) => {
              try {
                return (
                  <div
                    key={item.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.1}s`, opacity: 0 }}
                  >
                    {renderRecommendationCard(item)}
                  </div>
                )
              } catch (error) {
                // Error rendering recommendation - skip item
                return null
              }
            }).filter(Boolean)}
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

