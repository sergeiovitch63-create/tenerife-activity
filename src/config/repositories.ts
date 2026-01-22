import { MockVibeRepository } from '@/data/mock/mock-vibe.repository'
import { MockExperienceRepository } from '@/data/mock/mock-experience.repository'
import { AtlanticoExperienceRepository } from '@/data/atlantico/atlantico-experience.repository'
import { getAtlanticoConfig } from '@/lib/atlantico/config'
import type { VibeRepository } from '@/core/ports/vibe.repository'
import type { ExperienceRepository } from '@/core/ports/experience.repository'

// Repository instances - swappable for API implementations
export const vibeRepository: VibeRepository = new MockVibeRepository()

// Experience repository: use Atlantico in prod, fallback to Mock in dev if config missing
function createExperienceRepository(): ExperienceRepository {
  const config = getAtlanticoConfig()
  const isProduction = process.env.NODE_ENV === 'production'

  if (isProduction || config.isValid) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Repositories] Using AtlanticoExperienceRepository')
    }
    return new AtlanticoExperienceRepository()
  }

  // Fallback to mock in dev if Atlantico config is missing
  if (process.env.NODE_ENV === 'development') {
    console.log(
      '[Repositories] ATLANTICO_BASE_URL not set, using MockExperienceRepository (fallback)'
    )
  }
  return new MockExperienceRepository()
}

export const experienceRepository: ExperienceRepository = createExperienceRepository()








