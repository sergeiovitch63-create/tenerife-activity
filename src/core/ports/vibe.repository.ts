import type { Vibe } from '@/core/entities/vibe'

export interface VibeRepository {
  findAll(): Promise<Vibe[]>
  findBySlug(slug: string): Promise<Vibe | null>
  findById(id: string): Promise<Vibe | null>
}







