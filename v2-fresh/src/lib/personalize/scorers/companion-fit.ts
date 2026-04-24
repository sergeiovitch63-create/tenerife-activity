/**
 * Companion-Fit scorer — server-safe.
 *
 * Answers "will this work for my group?" — the single most common
 * filter a traveller applies before booking. We score the activity
 * against six companion archetypes (not all will be highlighted; the
 * renderer surfaces the top 3) and flag each as great / good / meh.
 *
 * Signals we use:
 *  - priceTier, intensity, themes, setting (core fit)
 *  - childAge bounds, infant allowance (family variants)
 *  - duration, altitude, physical sensitivity (seniors / young kids)
 *
 * We do not reject activities here; a page without any strong fit
 * (archetype=none over 60) is more informative than a silent page.
 * Instead we skip the module entirely when even the TOP fit is weak —
 * that almost never happens for real operator listings but guards
 * against "empty shell" debug data.
 */

import type { ActivitySignals, ModuleScore } from '../types'

export type CompanionArchetype =
  | 'solo'
  | 'couple'
  | 'family-young'  // kids ≤ 8
  | 'family-teens'  // teens 12+
  | 'group'         // friends / teambuilding
  | 'seniors'

export type CompanionVerdict = 'great' | 'good' | 'mixed' | 'poor'

export type CompanionRating = {
  archetype: CompanionArchetype
  verdict: CompanionVerdict
  /** 0-100 internal score so the UI can sort. */
  score: number
  /** One-line reason-key the renderer localises. */
  reasonKey: string
}

export type CompanionFitProps = {
  /** Top 3 archetypes by score, ranked. */
  top: CompanionRating[]
  /** Full list if the renderer wants to expand. */
  all: CompanionRating[]
  /** Best overall fit — drives the hero chip. */
  headline: CompanionArchetype
}

function verdictOf(score: number): CompanionVerdict {
  if (score >= 78) return 'great'
  if (score >= 60) return 'good'
  if (score >= 42) return 'mixed'
  return 'poor'
}

function rateSolo(s: ActivitySignals): CompanionRating {
  let score = 58
  let reason = 'solo_default'

  // Solo-friendly themes / settings
  if (s.themes.has('adrenaline')) { score += 10; reason = 'solo_adrenaline' }
  if (s.themes.has('photography')) { score += 8; reason = 'solo_photo' }
  if (s.themes.has('nature') || s.themes.has('mountain')) { score += 6; reason = 'solo_nature' }
  if (s.themes.has('culture')) { score += 4; reason = 'solo_culture' }
  if (s.themes.has('wellness')) { score += 6 }
  if (s.setting.includes('hiking') || s.setting.includes('paragliding')) score += 4

  // Solo gets penalised on inherently-paired activities
  if (s.themes.has('romantic')) score -= 10
  if (s.priceTier === 'premium') score -= 6 // solo premium is cost-heavy
  if (s.setting.includes('yacht')) score -= 6

  return {
    archetype: 'solo',
    verdict: verdictOf(score),
    score: Math.max(0, Math.min(100, score)),
    reasonKey: reason,
  }
}

function rateCouple(s: ActivitySignals): CompanionRating {
  let score = 56
  let reason = 'couple_default'

  if (s.themes.has('romantic')) { score += 22; reason = 'couple_romantic' }
  if (s.setting.includes('sunset') || s.setting.includes('night')) { score += 10; reason = 'couple_sunset' }
  if (s.themes.has('stargazing')) score += 8
  if (s.setting.includes('yacht') || s.setting.includes('catamaran')) score += 8
  if (s.themes.has('gastro')) score += 6
  if (s.themes.has('wellness')) score += 6
  if (s.priceTier === 'premium') score += 4 // premium couples feel justified

  // Mass-activity dampeners
  if (s.setting.includes('waterpark') || s.setting.includes('park')) score -= 8
  if (s.themes.has('adrenaline') && !s.themes.has('romantic')) score -= 4

  return {
    archetype: 'couple',
    verdict: verdictOf(score),
    score: Math.max(0, Math.min(100, score)),
    reasonKey: reason,
  }
}

function rateFamilyYoung(s: ActivitySignals): CompanionRating {
  // Young family = kids ≤ 8
  let score = 40
  let reason = 'familyYoung_default'

  if (s.isFamilyFriendly) score += 10
  if (s.hasChildAge && s.minChildAge != null && s.minChildAge <= 6) { score += 18; reason = 'familyYoung_lowMin' }
  if (s.hasInfantAge) { score += 6; reason = reason === 'familyYoung_default' ? 'familyYoung_infants' : reason }
  if (s.setting.includes('park') || s.setting.includes('zoo') || s.setting.includes('aquarium')) { score += 18; reason = 'familyYoung_park' }
  if (s.setting.includes('waterpark')) { score += 14 }
  if (s.themes.has('wildlife')) score += 8
  if (s.intensity === 'relaxed') score += 6

  // Strong penalties
  if (s.themes.has('adrenaline') || s.intensity === 'adrenaline') score -= 18
  if (s.setting.includes('paragliding') || s.setting.includes('jetski')) score -= 20
  if (s.altitudeSensitive) score -= 6
  if (s.hasChildAge && s.minChildAge != null && s.minChildAge >= 12) score -= 14

  return {
    archetype: 'family-young',
    verdict: verdictOf(score),
    score: Math.max(0, Math.min(100, score)),
    reasonKey: reason,
  }
}

function rateFamilyTeens(s: ActivitySignals): CompanionRating {
  let score = 50
  let reason = 'familyTeens_default'

  if (s.isFamilyFriendly) score += 4
  if (s.themes.has('adrenaline')) { score += 14; reason = 'familyTeens_adrenaline' }
  if (s.setting.includes('jetski') || s.setting.includes('quad') || s.setting.includes('buggy')) score += 10
  if (s.setting.includes('waterpark') || s.setting.includes('park')) { score += 10; reason = 'familyTeens_park' }
  if (s.themes.has('water') && !s.setting.includes('yacht')) score += 6
  if (s.themes.has('photography') || s.themes.has('stargazing')) score += 4
  if (s.hasChildAge && s.minChildAge != null && s.minChildAge <= 12) score += 6

  // Teens bored by static cultural / wellness
  if (s.themes.has('wellness') && !s.themes.has('adrenaline')) score -= 6
  if (s.intensity === 'relaxed' && !s.themes.has('water') && !s.themes.has('wildlife')) score -= 4

  return {
    archetype: 'family-teens',
    verdict: verdictOf(score),
    score: Math.max(0, Math.min(100, score)),
    reasonKey: reason,
  }
}

function rateGroup(s: ActivitySignals): CompanionRating {
  let score = 50
  let reason = 'group_default'

  // Group-positive signals
  if (s.themes.has('water') || s.setting.includes('boat') || s.setting.includes('catamaran')) { score += 12; reason = 'group_boat' }
  if (s.themes.has('adrenaline')) { score += 10; reason = 'group_adrenaline' }
  if (s.themes.has('party') || s.setting.includes('night')) { score += 12; reason = 'group_party' }
  if (s.themes.has('gastro')) { score += 6 }
  if (s.setting.includes('waterpark') || s.setting.includes('park')) score += 6
  if (s.priceTier === 'low' || s.priceTier === 'mid') score += 4

  // Not great for groups
  if (s.themes.has('romantic')) score -= 12
  if (s.themes.has('wellness')) score -= 4
  if (s.setting.includes('yacht') && s.priceTier === 'premium') score -= 4 // small-capacity

  return {
    archetype: 'group',
    verdict: verdictOf(score),
    score: Math.max(0, Math.min(100, score)),
    reasonKey: reason,
  }
}

function rateSeniors(s: ActivitySignals): CompanionRating {
  let score = 52
  let reason = 'seniors_default'

  if (s.intensity === 'relaxed') { score += 14; reason = 'seniors_relaxed' }
  if (s.themes.has('culture') || s.themes.has('gastro')) { score += 10; reason = 'seniors_culture' }
  if (s.themes.has('nature') && !s.setting.includes('hiking')) score += 6
  if (s.setting.includes('winery') || s.setting.includes('restaurant') || s.setting.includes('tasting')) score += 6
  if (s.setting.includes('catamaran') || s.setting.includes('boat')) score += 4
  if (s.setting.includes('zoo') || s.setting.includes('aquarium')) score += 4

  // Physical burden
  if (s.intensity === 'adrenaline') score -= 18
  if (s.setting.includes('paragliding') || s.setting.includes('jetski') || s.setting.includes('quad')) score -= 18
  if (s.setting.includes('hiking') && s.altitudeSensitive) score -= 10
  if (s.altitude === 'high') score -= 4
  if (s.altitudeSensitive) score -= 4
  if (s.waveSensitive && s.setting.includes('boat')) score -= 4

  return {
    archetype: 'seniors',
    verdict: verdictOf(score),
    score: Math.max(0, Math.min(100, score)),
    reasonKey: reason,
  }
}

export function companionFitScorer(signals: ActivitySignals): ModuleScore | null {
  const ratings: CompanionRating[] = [
    rateSolo(signals),
    rateCouple(signals),
    rateFamilyYoung(signals),
    rateFamilyTeens(signals),
    rateGroup(signals),
    rateSeniors(signals),
  ]
  ratings.sort((a, b) => b.score - a.score)

  const top = ratings.slice(0, 3)
  const headline = top[0].archetype

  // Skip: even the top archetype is poor (edge-case data).
  if (top[0].score < 50) return null

  // --- Module score -----------------------------------------------
  // Higher when the split is decisive (a clear "this is for families,
  // not for couples") — that's more decision-shaping than a uniformly-
  // okay listing.
  let s = 50
  const spread = top[0].score - ratings[5].score
  s += Math.min(14, Math.round(spread / 4))    // decisive differentiation bonus
  if (top[0].score >= 80) s += 6               // top is a clear "great"
  if (top[0].verdict === 'great' && top[1].verdict === 'great') s += 4 // two strong fits
  if (signals.isFamilyFriendly) s += 2
  // Damp when the activity is a park (families + teens + groups all
  // score similarly, low differential → less useful message).
  if (signals.setting.includes('park') || signals.setting.includes('waterpark')) s -= 4

  s = Math.max(0, Math.min(82, s))

  return {
    id: 'companion-fit',
    score: s,
    slot: 'left-secondary',
    reason: `headline=${headline}, top3=${top.map((t) => `${t.archetype}:${t.score}`).join('|')}`,
    props: {
      top,
      all: ratings,
      headline,
    } satisfies CompanionFitProps,
  }
}
