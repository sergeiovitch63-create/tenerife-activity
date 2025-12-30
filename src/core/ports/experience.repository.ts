import type { Experience } from '@/core/entities/experience'

export interface ExperienceRepository {
  findAll(): Promise<Experience[]>
  findBySlug(slug: string): Promise<Experience | null>
  findById(id: string): Promise<Experience | null>
  findByVibeId(vibeId: string): Promise<Experience[]>
  search(query: string): Promise<Experience[]>
  findMustSee(): Promise<Experience[]>
}

