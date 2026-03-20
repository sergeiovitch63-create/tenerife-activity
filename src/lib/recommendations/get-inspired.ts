import type { Activity } from '@/core/entities/activity'
import type { Mood, TimeAvailable, GroupType } from './mapping'

/**
 * Quiz answers structure for Get Inspired recommendations
 */
export type GetInspiredAnswers = {
  mood: Mood | null
  time: TimeAvailable | null
  group: GroupType | null
  intensity?: 'low-intensity' | 'medium-intensity' | 'high-intensity' | null
  budget?: 'budget-1' | 'budget-2' | 'budget-3' | null
}

/**
 * Convert quiz answers to activity tags
 * 
 * Maps user selections to the tag format used by activities:
 * - Group: direct mapping (solo, couple, family, friends)
 * - Mood: maps to vibe tags (chill, adventure, luxury, culture, nature, entertainment)
 * - Time: maps to time tags (time-1-2h, time-halfday, time-fullday)
 * - Intensity: direct mapping (low-intensity, medium-intensity, high-intensity)
 * - Budget: direct mapping (budget-1, budget-2, budget-3)
 */
export function answersToTags(answers: GetInspiredAnswers): string[] {
  const tags: string[] = []

  // Group tags (direct mapping)
  if (answers.group) {
    tags.push(answers.group)
  }

  // Mood to vibe tags
  if (answers.mood) {
    switch (answers.mood) {
      case 'relax':
        tags.push('chill')
        break
      case 'adventure':
        tags.push('adventure')
        break
      case 'romantic':
        tags.push('luxury', 'chill')
        break
      case 'family':
        // Family is handled via group tag
        break
      case 'culture':
        tags.push('culture')
        break
      case 'ocean':
        tags.push('nature', 'adventure')
        break
    }
  }

  // Time to time tags
  if (answers.time) {
    switch (answers.time) {
      case '2-3hours':
        tags.push('time-1-2h')
        break
      case 'halfday':
        tags.push('time-halfday')
        break
      case 'fullday':
        tags.push('time-fullday')
        break
      case 'evening':
        tags.push('time-1-2h')
        break
      case 'multiday':
        tags.push('time-fullday')
        break
    }
  }

  // Intensity (direct mapping)
  if (answers.intensity) {
    tags.push(answers.intensity)
  }

  // Budget (direct mapping)
  if (answers.budget) {
    tags.push(answers.budget)
  }

  return tags
}

/**
 * Score an activity based on matching tags
 * 
 * Returns the number of tags that match between the user's tags and the activity's tags.
 * Higher score = better match.
 */
export function scoreActivity(activity: Activity, userTags: string[]): number {
  if (userTags.length === 0) {
    return 0
  }

  // Count matching tags
  const activityTagSet = new Set(activity.tags)
  let matchCount = 0

  for (const tag of userTags) {
    if (activityTagSet.has(tag)) {
      matchCount++
    }
  }

  return matchCount
}

/**
 * Get recommended activities based on quiz answers
 * 
 * Scoring logic:
 * 1. Convert answers to tags
 * 2. Score each activity by number of matching tags
 * 3. Sort by score (descending), then by price ascending
 * 4. Return all matching activities (score > 0), ordered by relevance
 * 
 * @param activities - Array of all available activities
 * @param answers - User's quiz answers
 * @returns Array of all matching activities sorted by best match first
 */
export function getInspiredRecommendations(
  activities: Activity[],
  answers: GetInspiredAnswers
): Activity[] {
  // Convert answers to tags
  const userTags = answersToTags(answers)

  // If no tags, return empty array
  if (userTags.length === 0) {
    return []
  }

  const DESIRED_COUNT = 12

  type Scored = { activity: Activity; score: number }

  // Score all activities
  const scoredActivities: Scored[] = activities.map((activity) => ({
    activity,
    score: scoreActivity(activity, userTags),
  }))

  // Sort by score desc, then by price asc (stable tie-breaker)
  scoredActivities.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score
    return a.activity.priceFrom - b.activity.priceFrom
  })

  // Bucket by vibeId (source of truth). This lets us round-robin across vibes
  // while still prioritizing "more relevant" vibe buckets first.
  const buckets = new Map<string, Scored[]>()
  const bucketMaxScore = new Map<string, number>()

  for (const item of scoredActivities) {
    const key = String(item.activity.vibeId ?? 'unknown').trim() || 'unknown'
    const arr = buckets.get(key) ?? []
    arr.push(item)
    buckets.set(key, arr)
    bucketMaxScore.set(key, Math.max(bucketMaxScore.get(key) ?? 0, item.score))
  }

  // Order buckets: highest max-score first (pertinent vibes first),
  // but since we still round-robin across buckets, the final list is diversified.
  const bucketKeys = Array.from(buckets.keys()).sort((a, b) => {
    return (bucketMaxScore.get(b) ?? 0) - (bucketMaxScore.get(a) ?? 0)
  })

  // Ensure each bucket is internally ordered by the same relevance.
  for (const key of bucketKeys) {
    const arr = buckets.get(key)
    if (!arr) continue
    arr.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score
      return a.activity.priceFrom - b.activity.priceFrom
    })
  }

  // Round-robin pick: first from each vibe bucket, then second, etc.
  const pickedIds = new Set<string>()
  const result: Activity[] = []

  let round = 0
  while (result.length < DESIRED_COUNT) {
    let pickedThisRound = false

    for (const key of bucketKeys) {
      const arr = buckets.get(key) ?? []
      const pick = arr[round]
      if (!pick) continue
      if (pickedIds.has(pick.activity.id)) continue

      result.push(pick.activity)
      pickedIds.add(pick.activity.id)
      pickedThisRound = true

      if (result.length >= DESIRED_COUNT) break
    }

    if (!pickedThisRound) break
    round++
  }

  return result
}

