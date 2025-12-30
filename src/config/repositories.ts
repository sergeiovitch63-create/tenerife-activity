import { MockVibeRepository } from '@/data/mock/mock-vibe.repository'
import { MockExperienceRepository } from '@/data/mock/mock-experience.repository'
import type { VibeRepository } from '@/core/ports/vibe.repository'
import type { ExperienceRepository } from '@/core/ports/experience.repository'

// Repository instances - swappable for API implementations
export const vibeRepository: VibeRepository = new MockVibeRepository()
export const experienceRepository: ExperienceRepository =
  new MockExperienceRepository()







