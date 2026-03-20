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

  const BLOCKED_GROUPDETAIL_CODES = new Set(['476', '514', '552', '553'])

  const isExperienceMissingImage = (experience: Experience) => {
    const code = String(experience.slug ?? experience.id ?? '').trim()
    if (BLOCKED_GROUPDETAIL_CODES.has(code)) return true
    const imageUrl = experience.imageUrls?.[0] ?? experience.imageUrl
    const isNoImage = !imageUrl || imageUrl === '/logo.png'
    return isNoImage
  }

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

    // Source-of-truth: we always bucket experiences by vibeId (for diversity).
    // But we prioritize buckets whose vibeId is among the recommended vibes.
    const recommendedVibeIds = new Set(vibes.map((vibe) => vibe.id))

    const uniqueExperiences = Array.from(
      new Map(allExperiences.map((exp) => [exp.id, exp])).values()
    )

    const DESIRED_COUNT = 12

    const buckets = new Map<string, Experience[]>()
    const bucketMinPrice = new Map<string, number>()

    for (const exp of uniqueExperiences) {
      const key = String(exp.vibeId ?? 'unknown').trim() || 'unknown'
      const arr = buckets.get(key) ?? []
      arr.push(exp)
      buckets.set(key, arr)

      const currentMin = bucketMinPrice.get(key)
      const nextMin = currentMin == null ? exp.price : Math.min(currentMin, exp.price)
      bucketMinPrice.set(key, nextMin)
    }

    const bucketKeys = Array.from(buckets.keys()).sort((a, b) => {
      const aInRecommended = recommendedVibeIds.has(a)
      const bInRecommended = recommendedVibeIds.has(b)
      if (aInRecommended !== bInRecommended) return aInRecommended ? -1 : 1

      return (bucketMinPrice.get(a) ?? 0) - (bucketMinPrice.get(b) ?? 0)
    })

    // Sort each bucket deterministically (cheapest first)
    for (const key of bucketKeys) {
      const arr = buckets.get(key)
      if (!arr) continue
      arr.sort((x, y) => x.price - y.price)
    }

    // Round-robin selection across all vibe buckets to guarantee pool diversity.
    const pickedIds = new Set<string>()
    const selectedExperiences: Experience[] = []
    let round = 0

    while (selectedExperiences.length < DESIRED_COUNT) {
      let pickedThisRound = false

      for (const key of bucketKeys) {
        const arr = buckets.get(key) ?? []
        const pick = arr[round]
        if (!pick) continue
        if (pickedIds.has(pick.id)) continue

        selectedExperiences.push(pick)
        pickedIds.add(pick.id)
        pickedThisRound = true

        if (selectedExperiences.length >= DESIRED_COUNT) break
      }

      if (!pickedThisRound) break
      round++
    }

    // Remove experiences without image from the grid, except for known exceptions.
    // If everything is missing, keep the original list so the UI still shows results.
    const filteredExperiences = selectedExperiences.filter(
      (exp) => !isExperienceMissingImage(exp)
    )
    const safeFilteredExperiences =
      filteredExperiences.length > 0 ? filteredExperiences : selectedExperiences

    return {
      recommendedVibes: vibes,
      recommendedExperiences: safeFilteredExperiences,
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

