import { experienceRepository } from '@/config/repositories'
import type { Activity } from '@/core/entities/activity'
import { MockExperienceRepository } from '@/data/mock/mock-experience.repository'
import { getInspiredRecommendations, type GetInspiredAnswers } from '@/lib/recommendations/get-inspired'

const VIBE_TO_TAGS: Record<string, string[]> = {
  'vip-tours': ['luxury', 'chill', 'couple'],
  'adventure-nature': ['adventure', 'nature', 'high-intensity'],
  'water-sports': ['adventure', 'nature', 'medium-intensity'],
  'diving-fishing': ['adventure', 'nature', 'medium-intensity'],
  'theme-parks': ['entertainment', 'family', 'medium-intensity'],
  'tickets-attractions': ['culture', 'entertainment', 'low-intensity'],
  'bus-excursions': ['culture', 'low-intensity', 'time-halfday'],
  'cable-car-observatory': ['nature', 'chill', 'low-intensity', 'time-1-2h'],
  'boat-trips-cruises': ['adventure', 'nature', 'chill', 'time-halfday'],
  'shows-entertainment': ['entertainment', 'chill', 'time-1-2h'],
  'gastronomy-tastings': ['culture', 'chill', 'time-1-2h'],
  'car-rental': ['adventure', 'time-fullday'],
  'bike-rental': ['adventure', 'medium-intensity'],
}

function priceToBudgetTag(price: number): string {
  if (price <= 30) return 'budget-1'
  if (price <= 100) return 'budget-2'
  return 'budget-3'
}

function mapExperienceToActivity(experience: any): Activity {
  const vibeTags = (experience.vibeId && VIBE_TO_TAGS[experience.vibeId]) ?? []

  const rawPrice =
    typeof experience.priceFrom === 'number'
      ? experience.priceFrom
      : typeof experience.price === 'number'
        ? experience.price
        : 0

  const budgetTag = rawPrice > 0 ? priceToBudgetTag(rawPrice) : 'budget-2'

  const firstImage = (Array.isArray(experience.imageUrls) && experience.imageUrls[0]) || experience.imageUrl || '/logo.png'

  const id = String(experience.id ?? experience.code ?? experience.slug ?? Math.random())
  const slug = String(experience.slug ?? experience.code ?? id)
  const title = String(experience.title ?? experience.name ?? `Experience ${id}`)

  return {
    id,
    slug,
    title,
    vibeId: experience.vibeId != null ? String(experience.vibeId) : undefined,
    priceFrom: rawPrice,
    duration: experience.duration ?? '',
    location: experience.location ?? 'Tenerife',
    description: experience.description ?? '',
    media: { type: 'image', src: firstImage },
    tags: [...vibeTags, budgetTag],
  }
}

const NO_IMAGE_ACTIVITY_EXCEPTIONS = new Set(['476', '514', '552', '553'])

function getActivityCode(activity: Activity) {
  return String(activity.slug ?? activity.id ?? '').trim()
}

function hasRealImage(activity: Activity) {
  const src = (activity.media?.src ?? '').trim()
  return !!src && src !== '/logo.png'
}

function isAllowedForSuggestions(activity: Activity) {
  if (hasRealImage(activity)) return true
  return NO_IMAGE_ACTIVITY_EXCEPTIONS.has(getActivityCode(activity))
}

export default async function InspiredIdeasBackoffice({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  const query = (await searchParams) ?? {}

  const mode = String(query.mode ?? 'pool') // 'pool' | 'recommendations'

  const group = typeof query.group === 'string' ? query.group : ''
  const mood = typeof query.mood === 'string' ? query.mood : ''
  const time = typeof query.time === 'string' ? query.time : ''
  const budget = typeof query.budget === 'string' ? query.budget : ''
  const extras = typeof query.extras === 'string' ? query.extras : ''

  // Note: types are constrained in get-inspired mapping; we keep parsing permissive.
  const answers: GetInspiredAnswers = {
    group: (group ? (group as any) : null) as GetInspiredAnswers['group'],
    mood: (mood ? (mood as any) : null) as GetInspiredAnswers['mood'],
    time: (time ? (time as any) : null) as GetInspiredAnswers['time'],
    budget: (budget ? (budget as any) : null) as GetInspiredAnswers['budget'],
    intensity: extras === 'low-intensity' ? 'low-intensity' : null,
  }

  let activities: Activity[] = []

  try {
    const experiences = await experienceRepository.findAll()
    activities = (experiences || []).map(mapExperienceToActivity)
  } catch {
    const mockRepo = new MockExperienceRepository()
    const mockExperiences = await mockRepo.findAll()
    activities = (mockExperiences || []).map(mapExperienceToActivity)
  }

  const visibleActivities = mode === 'recommendations' ? getInspiredRecommendations(activities, answers) : activities

  const total = activities.length
  const allowed = activities.filter(isAllowedForSuggestions).length
  const displayed = visibleActivities.length

  return (
    <div style={{ padding: 24, maxWidth: 1600, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>
        Backoffice: Inspired ideas pool
      </h1>

      <p style={{ marginBottom: 18, color: '#555', fontSize: 13 }}>
        Route: <code>/{"{locale}"}/backoffice/inspired-ideas</code> · Mode: <code>{mode}</code>
        <br />
        Total activities: <strong>{total}</strong> · Allowed (image or exceptions): <strong>{allowed}</strong> · Displayed: <strong>{displayed}</strong>
        {mode === 'recommendations' && (
          <>
            <br />
            Answers: <code>{JSON.stringify({ group, mood, time, budget, extras })}</code>
          </>
        )}
      </p>

      <div style={{ overflowX: 'auto', border: '1px solid #eee', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #eee' }}>Code</th>
              <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #eee' }}>Title</th>
              <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #eee' }}>VibeId</th>
              <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #eee' }}>Price</th>
              <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #eee' }}>Duration</th>
              <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #eee' }}>Tags</th>
              <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #eee' }}>Image</th>
              <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #eee' }}>Allowed</th>
            </tr>
          </thead>
          <tbody>
            {visibleActivities.map((a) => {
              const code = getActivityCode(a)
              const src = (a.media?.src ?? '').trim()
              const allowedHere = isAllowedForSuggestions(a)

              return (
                <tr key={a.id} style={{ borderBottom: '1px solid #f3f3f3' }}>
                  <td style={{ padding: 10, verticalAlign: 'top' }}>
                    <code>{code}</code>
                  </td>
                  <td style={{ padding: 10, verticalAlign: 'top', maxWidth: 420 }}>
                    <div style={{ fontWeight: 700 }}>{a.title}</div>
                    <div style={{ color: '#666' }}>{a.location}</div>
                  </td>
                  <td style={{ padding: 10, verticalAlign: 'top' }}>{a.vibeId ?? '—'}</td>
                  <td style={{ padding: 10, verticalAlign: 'top' }}>{a.priceFrom ?? 0}</td>
                  <td style={{ padding: 10, verticalAlign: 'top' }}>{a.duration || '—'}</td>
                  <td style={{ padding: 10, verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(a.tags || []).slice(0, 10).map((t) => (
                        <span key={t} style={{ padding: '2px 6px', border: '1px solid #eee', borderRadius: 999 }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: 10, verticalAlign: 'top' }}>
                    <div style={{ fontFamily: 'monospace' }}>
                      {src ? src : '—'}
                    </div>
                    {!hasRealImage(a) && (
                      <div style={{ color: '#b45309', fontWeight: 700, marginTop: 4 }}>No image</div>
                    )}
                  </td>
                  <td style={{ padding: 10, verticalAlign: 'top', fontWeight: 700 }}>
                    {allowedHere ? 'YES' : 'NO'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 16, color: '#666', fontSize: 12 }}>
        Exemples d’URL:
        <br />
        - Pool: <code>.../backoffice/inspired-ideas?mode=pool</code>
        <br />
        - Reco: <code>.../backoffice/inspired-ideas?mode=recommendations&amp;group=family&amp;mood=relax&amp;time=halfday&amp;budget=budget-2&amp;extras=none</code>
      </p>
    </div>
  )
}

