/**
 * Composition engine — takes signals + registry, returns scored modules
 * grouped by slot, ready to render.
 *
 * Pure: no React, no fetches. Safe to call at server render time.
 */

import type {
  ActivitySignals,
  ModuleDefinition,
  ModuleScore,
  ModuleSlot,
  ComposedPage,
  ComposeOptions,
  ModuleId,
} from './types'

const DEFAULT_THRESHOLD = 40
const DEFAULT_MAX_PER_SLOT: Record<ModuleSlot, number> = {
  'banner': 1,
  'left-primary': 2,
  'left-secondary': 4,
  'left-tertiary': 3,
  // 8 modules target right-inline (multi-booking, next-available,
  // pickup-coverage, value-story, guide-experience, operator-signature,
  // time-budget, departure-rhythm-on-overflow). Cap of 2 was evicting
  // planning-grade cards on almost every rich activity — 3 lets the
  // booking sidebar tell a fuller trust + planning story without
  // visually crowding the panel.
  'right-inline': 3,
}

/**
 * Run every scorer, filter, sort, cap per slot.
 */
export function composePage(
  signals: ActivitySignals,
  registry: ModuleDefinition[],
  options: ComposeOptions = {},
): ComposedPage {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD
  const maxPerSlot = { ...DEFAULT_MAX_PER_SLOT, ...(options.maxPerSlot ?? {}) }
  const forceInclude = new Set(options.forceInclude ?? [])
  const forceExclude = new Set(options.forceExclude ?? [])

  // Run every scorer
  const rawScores: ModuleScore[] = []
  for (const mod of registry) {
    if (forceExclude.has(mod.id)) continue
    const result = mod.score(signals)
    if (!result) continue
    rawScores.push({
      ...result,
      slot: result.slot ?? mod.defaultSlot,
    })
  }

  // Apply threshold, with force-include override
  const qualified = rawScores.filter(
    s => s.score >= threshold || forceInclude.has(s.id),
  )

  // Sort: force-included first, then by score desc
  qualified.sort((a, b) => {
    const aForced = forceInclude.has(a.id) ? 1 : 0
    const bForced = forceInclude.has(b.id) ? 1 : 0
    if (aForced !== bForced) return bForced - aForced
    return b.score - a.score
  })

  // Group by slot and cap
  const bySlot: Record<ModuleSlot, ModuleScore[]> = {
    'banner': [],
    'left-primary': [],
    'left-secondary': [],
    'left-tertiary': [],
    'right-inline': [],
  }
  for (const s of qualified) {
    const cap = maxPerSlot[s.slot] ?? 99
    if (bySlot[s.slot].length < cap) {
      bySlot[s.slot].push(s)
    }
  }

  return {
    modulesBySlot: bySlot,
    allScores: qualified,
    signals,
  }
}

/**
 * Lookup a module definition by id — useful for the renderer.
 */
export function findModule(
  registry: ModuleDefinition[],
  id: ModuleId,
): ModuleDefinition | undefined {
  return registry.find(m => m.id === id)
}

/**
 * Pretty-print the composition for debugging. Not used at runtime.
 */
export function explainComposition(page: ComposedPage): string {
  const lines: string[] = []
  lines.push(`=== Composition for "${page.signals.name}" (${page.signals.code}) ===`)
  lines.push(`Themes: ${[...page.signals.themes].join(', ') || '(none)'}`)
  lines.push(`Settings: ${page.signals.setting.join(', ') || '(none)'}`)
  lines.push(`Zone: ${page.signals.zone} | Altitude: ${page.signals.altitude} | Intensity: ${page.signals.intensity}`)
  lines.push('')
  for (const [slot, modules] of Object.entries(page.modulesBySlot)) {
    if (modules.length === 0) continue
    lines.push(`[${slot}]`)
    for (const m of modules) {
      lines.push(`  ${m.score.toString().padStart(3)} · ${m.id}${m.reason ? ` — ${m.reason}` : ''}`)
    }
  }
  return lines.join('\n')
}
