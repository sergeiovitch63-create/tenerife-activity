import type { TrackingProvider } from '@/core/ports/tracking.provider'

export class NoopTrackingProvider implements TrackingProvider {
  track(): void {
    // No-op implementation
  }
}







