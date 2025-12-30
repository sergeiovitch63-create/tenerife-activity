'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Section, Container, Stack } from '@/ui/components/layout'
import { Chip } from '@/ui/components/shared'
import { VibeCard } from '@/ui/components/vibe'
import { ExperienceCard } from '@/ui/components/experience'
import { getRecommendedVibes, type Mood, type TimeAvailable, type GroupType } from '@/lib/recommendations/mapping'
import type { Vibe } from '@/core/entities/vibe'
import type { Experience } from '@/core/entities/experience'

interface InspiredPageClientProps {
  allVibes: Vibe[]
  allExperiences: Experience[]
}

export function InspiredPageClient({
  allVibes,
  allExperiences,
}: InspiredPageClientProps) {
  const t = useTranslations('inspired')
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null)
  const [selectedTime, setSelectedTime] = useState<TimeAvailable | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<GroupType | null>(null)

  // Chip options with translations
  const MOOD_OPTIONS: Array<{ id: Mood; label: string }> = [
    { id: 'relax', label: t('moods.relax') },
    { id: 'adventure', label: t('moods.adventure') },
    { id: 'romantic', label: t('moods.romantic') },
    { id: 'family', label: t('moods.family') },
    { id: 'culture', label: t('moods.culture') },
    { id: 'ocean', label: t('moods.ocean') },
  ]

  const TIME_OPTIONS: Array<{ id: TimeAvailable; label: string }> = [
    { id: '2-3hours', label: t('times.2-3hours') },
    { id: 'halfday', label: t('times.halfday') },
    { id: 'fullday', label: t('times.fullday') },
    { id: 'evening', label: t('times.evening') },
    { id: 'multiday', label: t('times.multiday') },
  ]

  const GROUP_OPTIONS: Array<{ id: GroupType; label: string }> = [
    { id: 'couple', label: t('groups.couple') },
    { id: 'family', label: t('groups.family') },
    { id: 'friends', label: t('groups.friends') },
    { id: 'solo', label: t('groups.solo') },
    { id: 'seniors', label: t('groups.seniors') },
  ]

  // Compute recommendations based on selections
  const { recommendedVibes, recommendedExperiences } = useMemo(() => {
    const vibeSlugs = getRecommendedVibes(selectedMood, selectedTime, selectedGroup)

    if (vibeSlugs.length === 0) {
      return { recommendedVibes: [], recommendedExperiences: [] }
    }

    // Find vibes by slug
    const vibes = vibeSlugs
      .map((slug) => allVibes.find((vibe) => vibe.slug === slug))
      .filter((vibe): vibe is Vibe => vibe !== undefined)
      .slice(0, 6)

    // Get experiences from recommended vibes
    const vibeIds = new Set(vibes.map((vibe) => vibe.id))
    const experiences = allExperiences
      .filter((exp) => vibeIds.has(exp.vibeId))
      .slice(0, 12)

    // Remove duplicates by ID
    const uniqueExperiences = Array.from(
      new Map(experiences.map((exp) => [exp.id, exp])).values()
    )

    return {
      recommendedVibes: vibes,
      recommendedExperiences: uniqueExperiences,
    }
  }, [selectedMood, selectedTime, selectedGroup, allVibes, allExperiences])

  const handleMoodClick = (mood: Mood) => {
    setSelectedMood(selectedMood === mood ? null : mood)
  }

  const handleTimeClick = (time: TimeAvailable) => {
    setSelectedTime(selectedTime === time ? null : time)
  }

  const handleGroupClick = (group: GroupType) => {
    setSelectedGroup(selectedGroup === group ? null : group)
  }

  return (
    <>
      {/* Pick your mood */}
      <Section variant="default" background="default">
        <Container size="lg">
          <div className="glass-panel p-6 md:p-8">
            <Stack direction="column" gap="md">
              <h2 className="text-2xl font-bold text-glass-900">
                {t('pickMood')}
              </h2>
              <div className="flex flex-wrap gap-3">
                {MOOD_OPTIONS.map((option) => (
                  <Chip
                    key={option.id}
                    active={selectedMood === option.id}
                    onClick={() => handleMoodClick(option.id)}
                  >
                    {option.label}
                  </Chip>
                ))}
              </div>
            </Stack>
          </div>
        </Container>
      </Section>

      {/* Time available */}
      <Section variant="default" background="subtle">
        <Container size="lg">
          <div className="glass-panel p-6 md:p-8">
            <Stack direction="column" gap="md">
              <h2 className="text-2xl font-bold text-glass-900">
                {t('timeAvailable')}
              </h2>
              <div className="flex flex-wrap gap-3">
                {TIME_OPTIONS.map((option) => (
                  <Chip
                    key={option.id}
                    active={selectedTime === option.id}
                    onClick={() => handleTimeClick(option.id)}
                  >
                    {option.label}
                  </Chip>
                ))}
              </div>
            </Stack>
          </div>
        </Container>
      </Section>

      {/* Who are you traveling with */}
      <Section variant="default" background="default">
        <Container size="lg">
          <div className="glass-panel p-6 md:p-8">
            <Stack direction="column" gap="md">
              <h2 className="text-2xl font-bold text-glass-900">
                {t('travelingWith')}
              </h2>
              <div className="flex flex-wrap gap-3">
                {GROUP_OPTIONS.map((option) => (
                  <Chip
                    key={option.id}
                    active={selectedGroup === option.id}
                    onClick={() => handleGroupClick(option.id)}
                  >
                    {option.label}
                  </Chip>
                ))}
              </div>
            </Stack>
          </div>
        </Container>
      </Section>

      {/* Recommendations */}
      {(recommendedVibes.length > 0 || recommendedExperiences.length > 0) && (
        <>
          {/* Recommended Vibes */}
          {recommendedVibes.length > 0 && (
            <Section variant="default" background="subtle">
              <Container size="lg">
                <div className="glass-panel p-6 md:p-8">
                  <Stack direction="column" gap="lg">
                    <h2 className="text-3xl font-bold text-glass-900">
                      {t('recommendedVibes')}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {recommendedVibes.map((vibe) => (
                        <VibeCard key={vibe.id} vibe={vibe} />
                      ))}
                    </div>
                  </Stack>
                </div>
              </Container>
            </Section>
          )}

          {/* Recommended Experiences */}
          {recommendedExperiences.length > 0 && (
            <Section variant="default" background="default">
              <Container size="lg">
                <div className="glass-panel p-6 md:p-8">
                  <Stack direction="column" gap="lg">
                    <h2 className="text-3xl font-bold text-glass-900">
                      {t('recommendedExperiences')}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {recommendedExperiences.map((experience) => (
                        <ExperienceCard
                          key={experience.id}
                          experience={experience}
                        />
                      ))}
                    </div>
                  </Stack>
                </div>
              </Container>
            </Section>
          )}
        </>
      )}

      {/* Disclaimer */}
      <Section variant="tight" background="subtle">
        <Container size="lg">
          <div className="glass-panel p-4 md:p-6 max-w-2xl mx-auto">
            <p className="text-sm text-glass-600 text-center">
              {t('disclaimer')}
            </p>
          </div>
        </Container>
      </Section>
    </>
  )
}

