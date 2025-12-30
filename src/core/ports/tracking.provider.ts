export type TrackingEvent =
  | { type: 'view_experience'; experienceId: string }
  | { type: 'click_booking_cta'; experienceId: string }
  | { type: 'search_performed'; query: string }
  | { type: 'vibe_opened'; vibeId: string }
  | { type: 'must_see_viewed' }
  | { type: 'must_see_experience_clicked'; experienceId: string }
  | { type: 'must_see_cta_clicked' }
  | { type: 'get_inspired_cta_clicked' }
  | { type: 'filter_changed'; filterType: 'price' | 'duration' | 'rating'; value: string }
  | { type: 'sort_changed'; value: string }
  | { type: 'filters_reset' }
  | { type: 'search_results_viewed'; query: string }
  | { type: 'search_result_clicked'; experienceId: string }
  | { type: 'attribution_captured'; clickId?: string; hasUTM: boolean }
  | { type: 'booking_redirect_initiated'; experienceId: string; hasClickId: boolean }

export interface TrackingProvider {
  track(event: TrackingEvent): void | Promise<void>
}

