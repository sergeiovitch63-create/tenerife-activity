import { NoopTrackingProvider } from '@/data/tracking/noop-tracking.provider'
import type { TrackingProvider } from '@/core/ports/tracking.provider'

// Tracking provider instance - swappable for real analytics
export const trackingProvider: TrackingProvider = new NoopTrackingProvider()








