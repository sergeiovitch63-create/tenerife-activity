/**
 * DEBUG PAGE - Atlantico Repository Validation
 * 
 * DEV ONLY - This page is for debugging Atlantico integration.
 * Disabled in production.
 * 
 * This page is designed to NEVER crash, even if the API or repository fails.
 * 
 * This page is now under app/[locale]/debug/ to inherit NextIntlClientProvider
 * from the parent layout automatically.
 */

import { experienceRepository } from '@/config/repositories'
import type { Experience } from '@/core/entities/experience'
import { getAtlanticoConfig } from '@/lib/atlantico/config'

/**
 * Safely get repository type name for display
 * Never throws - always returns a string
 */
function getRepositoryType(): string {
  try {
    const config = getAtlanticoConfig()
    const isProduction = process.env.NODE_ENV === 'production'

    if (isProduction || config.isValid) {
      return 'AtlanticoExperienceRepository'
    }
    return 'MockExperienceRepository (fallback)'
  } catch (err) {
    // If config check fails, assume Mock fallback
    return 'MockExperienceRepository (fallback) - config check failed'
  }
}

/**
 * Safely extract error message from any error
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'Unknown error occurred'
}

export default async function AtlanticoDebugPage() {
  // Log in dev that the page is being accessed
  if (process.env.NODE_ENV === 'development') {
    console.log('[DEBUG_PAGE] Atlantico debug page accessed at /[locale]/debug/atlantico')
  }

  // Security: disable in production
  if (process.env.NODE_ENV === 'production') {
    return (
      <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
        <div
          style={{
            background: '#fee',
            border: '2px solid #f00',
            padding: '1rem',
            marginBottom: '1rem',
            borderRadius: '4px',
          }}
        >
          <strong>Debug page disabled in production</strong>
        </div>
      </div>
    )
  }

  // Initialize all state variables with safe defaults
  let experiences: Experience[] = []
  let error: string | null = null
  let repositoryType = 'Unknown'
  let statusMessage = ''
  let statusType: 'success' | 'warning' | 'error' = 'warning'

  // Safely get repository type (never throws)
  try {
    repositoryType = getRepositoryType()
  } catch (err) {
    repositoryType = 'Error determining repository type'
    error = getErrorMessage(err)
  }

  // Safely fetch experiences (never throws)
  // Wrap in additional try/catch for maximum safety
  if (!error) {
    try {
      // Double protection: wrap repository call
      const result = await Promise.resolve(experienceRepository.findAll()).catch((repoError) => {
        // If repository throws, return empty array
        console.error('[DEBUG_PAGE] Repository error:', repoError)
        return []
      })

      // Ensure result is an array
      if (Array.isArray(result)) {
        experiences = result
      } else {
        experiences = []
        if (!error) {
          error = 'Repository returned non-array result'
        }
      }
    } catch (err) {
      error = getErrorMessage(err)
      experiences = [] // Ensure empty array on error
    }
  }

  // Determine status message based on results
  if (error) {
    statusMessage = '❌ Error while loading data'
    statusType = 'error'
  } else if (!Array.isArray(experiences) || experiences.length === 0) {
    statusMessage = '⚠️ No data returned'
    statusType = 'warning'
  } else {
    statusMessage = '✅ Data loaded successfully'
    statusType = 'success'
  }

  // Safely extract event codes from experiences (never throws)
  const getEventCode = (exp: Experience | null | undefined): string => {
    if (!exp) return 'N/A'
    try {
      // Try to extract from ID (which should be event code)
      if (exp.id && typeof exp.id === 'string' && !exp.id.startsWith('atlantico-')) {
        return exp.id
      }
      // Try to extract from raw data if available
      const raw = (exp as any)?._raw
      if (raw && typeof raw === 'object' && typeof raw.code === 'string') {
        return raw.code
      }
      return 'N/A'
    } catch {
      return 'N/A'
    }
  }

  // Safely extract times count from availability hint or raw data (never throws)
  const getTimesCount = (exp: Experience | null | undefined): number => {
    if (!exp) return 0
    try {
      if (exp.availabilityHint && typeof exp.availabilityHint === 'string') {
        // Try to parse "Available at: time1, time2, ..."
        const match = exp.availabilityHint.match(/Available at: (.+)/)
        if (match && match[1]) {
          return match[1].split(',').length
        }
      }
      const raw = (exp as any)?._raw
      if (raw && typeof raw === 'object' && Array.isArray(raw.times)) {
        return raw.times.length
      }
      return 0
    } catch {
      return 0
    }
  }

  // Safely get string value with fallback
  const safeString = (value: unknown, fallback: string = 'N/A'): string => {
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
    return fallback
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Debug Banner */}
      <div
        style={{
          background: '#ffeb3b',
          border: '2px solid #f57f17',
          padding: '1rem',
          marginBottom: '2rem',
          borderRadius: '4px',
          fontWeight: 'bold',
        }}
      >
        🐛 DEBUG – ATLANTICO (DEV ONLY)
      </div>

      {/* Repository Info */}
      <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f5f5f5', borderRadius: '4px' }}>
        <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Repository Info</h2>
        <p style={{ margin: 0 }}>
          <strong>Active Repository:</strong> {repositoryType}
        </p>
        <p style={{ margin: '0.5rem 0 0 0' }}>
          <strong>Environment:</strong> {process.env.NODE_ENV || 'unknown'}
        </p>
      </div>

      {/* Status Message */}
      <div
        style={{
          background:
            statusType === 'error'
              ? '#fee'
              : statusType === 'warning'
                ? '#fff3cd'
                : '#e8f5e9',
          border: `2px solid ${
            statusType === 'error' ? '#f00' : statusType === 'warning' ? '#ffc107' : '#4caf50'
          }`,
          padding: '1rem',
          marginBottom: '2rem',
          borderRadius: '4px',
        }}
      >
        <strong>{statusMessage}</strong>
        {error && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.9em' }}>
            <strong>Error details:</strong> {safeString(error, 'Unknown error')}
          </div>
        )}
      </div>

      {/* Results Section */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginTop: 0 }}>Results</h2>
        <p>
          <strong>Total experiences loaded:</strong>{' '}
          {Array.isArray(experiences) ? experiences.length : 0}
        </p>
      </div>

      {/* Data Table - Only show if we have data */}
      {Array.isArray(experiences) && experiences.length > 0 ? (
        <div>
          <h2 style={{ marginTop: 0 }}>First 5 Experiences</h2>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '1px solid #ddd',
            }}
          >
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ padding: '0.5rem', border: '1px solid #ddd', textAlign: 'left' }}>
                  Name
                </th>
                <th style={{ padding: '0.5rem', border: '1px solid #ddd', textAlign: 'left' }}>
                  Slug
                </th>
                <th style={{ padding: '0.5rem', border: '1px solid #ddd', textAlign: 'left' }}>
                  Event Code
                </th>
                <th style={{ padding: '0.5rem', border: '1px solid #ddd', textAlign: 'left' }}>
                  Times Count
                </th>
                <th style={{ padding: '0.5rem', border: '1px solid #ddd', textAlign: 'left' }}>
                  ID
                </th>
              </tr>
            </thead>
            <tbody>
              {experiences.slice(0, 5).map((exp, idx) => {
                // Defensive: ensure exp is valid
                if (!exp || typeof exp !== 'object') {
                  return (
                    <tr key={idx} style={{ border: '1px solid #ddd' }}>
                      <td colSpan={5} style={{ padding: '0.5rem', border: '1px solid #ddd' }}>
                        Invalid experience data
                      </td>
                    </tr>
                  )
                }
                return (
                  <tr key={idx} style={{ border: '1px solid #ddd' }}>
                    <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>
                      {safeString(exp.title)}
                    </td>
                    <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>
                      {safeString(exp.slug)}
                    </td>
                    <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>
                      {getEventCode(exp)}
                    </td>
                    <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>
                      {getTimesCount(exp)}
                    </td>
                    <td style={{ padding: '0.5rem', border: '1px solid #ddd', fontSize: '0.9em' }}>
                      {safeString(exp.id)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          style={{
            background: '#fff3cd',
            border: '1px solid #ffc107',
            padding: '1rem',
            borderRadius: '4px',
          }}
        >
          <strong>⚠️ No experiences to display</strong>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9em' }}>
            {error
              ? 'An error occurred while loading data. Check the error message above.'
              : 'The repository returned an empty array. Check API configuration and connectivity.'}
          </p>
        </div>
      )}

      {/* Additional Info - Only show on success */}
      {statusType === 'success' && Array.isArray(experiences) && experiences.length > 0 && (
        <div style={{ marginTop: '2rem', padding: '1rem', background: '#e8f5e9', borderRadius: '4px' }}>
          <h3 style={{ marginTop: 0 }}>✅ Repository Status</h3>
          <p style={{ marginBottom: 0 }}>
            The repository is working and returning {experiences.length} experience(s).
          </p>
        </div>
      )}
    </div>
  )
}
























