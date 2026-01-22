/**
 * Admin Page - Curation Management
 * 
 * Back-office for managing activity-to-vibe assignments.
 * Client component for interactive UI.
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import type { Vibe } from '@/core/entities/vibe'
import { vibeRepository } from '@/config/repositories'
import { mapLocaleToLang } from '@/lib/atlantico/locale'

/**
 * Catalog item from /api/catalog
 */
interface CatalogItem {
  id: string
  slug?: string
  title: string
  description?: string
  image?: string | null
  price?: number | null
  currency?: string | null
  vibeId?: string | null
  isBookable: boolean
  rawType?: string | null
}

interface CuratedExperience {
  experience_id: string
  vibe_id: string
  enabled: boolean
  featured: boolean
  priority: number
  imageOverrideUrl?: string | null
  titleOverride?: string | null
  shortDescriptionOverride?: string | null
  updated_at: string
}

interface CatalogItemWithCuration extends CatalogItem {
  curation?: CuratedExperience
}

// DEV log on mount
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('[ADMIN_OK] Admin page loaded')
}

interface ExperienceRowProps {
  item: CatalogItem
  curation?: CuratedExperience
  vibes: Vibe[]
  onSave: (id: string, curation: Partial<CuratedExperience>) => void
  onDelete: (id: string) => void
  saving: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
}

function ExperienceRow({
  item,
  curation,
  vibes,
  onSave,
  onDelete,
  saving,
  selected = false,
  onToggleSelect,
}: ExperienceRowProps) {
  const [vibeId, setVibeId] = useState(curation?.vibe_id || item.vibeId || '1')
  const [enabled, setEnabled] = useState(curation?.enabled ?? true)
  const [featured, setFeatured] = useState(curation?.featured ?? false)
  const [priority, setPriority] = useState(curation?.priority ?? 0)
  const [imageOverrideUrl, setImageOverrideUrl] = useState(curation?.imageOverrideUrl || '')
  const [titleOverride, setTitleOverride] = useState(curation?.titleOverride || '')
  const [shortDescriptionOverride, setShortDescriptionOverride] = useState(curation?.shortDescriptionOverride || '')

  // Update state when curation changes
  useEffect(() => {
    if (curation) {
      setVibeId(curation.vibe_id)
      setEnabled(curation.enabled)
      setFeatured(curation.featured)
      setPriority(curation.priority)
      setImageOverrideUrl(curation.imageOverrideUrl || '')
      setTitleOverride(curation.titleOverride || '')
      setShortDescriptionOverride(curation.shortDescriptionOverride || '')
    }
  }, [curation])

  return (
    <tr className={`hover:bg-glass-50 ${selected ? 'bg-blue-50' : ''}`}>
      <td className="px-4 py-3">
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(item.id)}
            className="w-4 h-4"
          />
        )}
      </td>
      <td className="px-4 py-3 text-sm text-glass-900 max-w-xs truncate">
        {item.title}
      </td>
      <td className="px-4 py-3 text-sm text-glass-600 font-mono">
        {item.id}
      </td>
      <td className="px-4 py-3">
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            className="w-16 h-16 object-cover rounded"
          />
        ) : (
          <div className="w-16 h-16 bg-glass-200 rounded flex items-center justify-center">
            <span className="text-xs text-glass-400">No image</span>
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-glass-900">
        {item.price && item.price > 0
          ? `${item.currency || '€'}${item.price}`
          : item.price === null
            ? 'Price on request'
            : 'N/A'}
      </td>
      <td className="px-4 py-3">
        <select
          value={vibeId}
          onChange={(e) => setVibeId(e.target.value)}
          className="px-2 py-1 border border-glass-300 rounded text-sm"
        >
          {vibes.map((vibe) => (
            <option key={vibe.id} value={vibe.id}>
              {vibe.id} - {vibe.title}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="w-4 h-4"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={featured}
          onChange={(e) => setFeatured(e.target.checked)}
          className="w-4 h-4"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value) || 0)}
          className="w-20 px-2 py-1 border border-glass-300 rounded text-sm"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={imageOverrideUrl}
          onChange={(e) => setImageOverrideUrl(e.target.value)}
          placeholder="Image URL override"
          className="w-48 px-2 py-1 border border-glass-300 rounded text-sm"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={titleOverride}
          onChange={(e) => setTitleOverride(e.target.value)}
          placeholder="Title override"
          className="w-48 px-2 py-1 border border-glass-300 rounded text-sm"
        />
      </td>
      <td className="px-4 py-3">
        <textarea
          value={shortDescriptionOverride}
          onChange={(e) => setShortDescriptionOverride(e.target.value)}
          placeholder="Description override"
          className="w-64 px-2 py-1 border border-glass-300 rounded text-sm"
          rows={2}
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <button
            onClick={() =>
              onSave(item.id, {
                vibe_id: vibeId,
                enabled,
                featured,
                priority,
                imageOverrideUrl: imageOverrideUrl || null,
                titleOverride: titleOverride || null,
                shortDescriptionOverride: shortDescriptionOverride || null,
              })
            }
            disabled={saving}
            className="px-3 py-1 bg-ocean-600 text-white text-xs rounded hover:bg-ocean-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          {curation && (
            <button
              onClick={() => onDelete(item.id)}
              className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
            >
              Delete
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

interface CatalogStatus {
  exists: boolean
  mode?: string
  updatedAt?: string
  language?: string
  itemCount?: number
  totalEvents?: number
  lastRefreshMs?: number
  message?: string
  error?: string
}

interface RefreshState {
  mode: 'core' | 'dynamic' | 'full' | null
  loading: boolean
  ms?: number
  itemCount?: number
  totalEvents?: number
  error?: string
}

export default function AdminPage() {
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [items, setItems] = useState<CatalogItem[]>([])
  const [vibes, setVibes] = useState<Vibe[]>([])
  const [curated, setCurated] = useState<Record<string, CuratedExperience>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [catalogStatus, setCatalogStatus] = useState<CatalogStatus | null>(null)
  const [coreStatus, setCoreStatus] = useState<CatalogStatus | null>(null)
  const [dynamicStatus, setDynamicStatus] = useState<CatalogStatus | null>(null)
  const [refreshState, setRefreshState] = useState<RefreshState>({ mode: null, loading: false })
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [autoRefreshDynamic, setAutoRefreshDynamic] = useState(false)
  const [nextRefreshAt, setNextRefreshAt] = useState<Date | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [imageImportText, setImageImportText] = useState('')

  // Load vibes and catalog statuses on mount
  useEffect(() => {
    vibeRepository.findAll().then(setVibes).catch(console.error)
    loadCatalogStatus()
    loadCoreStatus()
    loadDynamicStatus()
  }, [])

  // Auto-refresh in DEV mode (30min, full refresh)
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      process.env.NODE_ENV === 'development' &&
      autoRefresh &&
      isAuthenticated &&
      password
    ) {
      const interval = setInterval(() => {
        handleRefreshCatalog('full')
      }, 30 * 60 * 1000) // 30 minutes

      return () => clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, isAuthenticated, password])

  // Auto-refresh Dynamic in DEV mode (12h)
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      process.env.NODE_ENV === 'development' &&
      autoRefreshDynamic &&
      isAuthenticated &&
      password
    ) {
      // Calculate next refresh time
      const nextRefresh = new Date()
      nextRefresh.setHours(nextRefresh.getHours() + 12)
      setNextRefreshAt(nextRefresh)

      const interval = setInterval(() => {
        handleRefreshCatalog('dynamic')
        // Update next refresh time
        const newNext = new Date()
        newNext.setHours(newNext.getHours() + 12)
        setNextRefreshAt(newNext)
      }, 12 * 60 * 60 * 1000) // 12 hours

      return () => clearInterval(interval)
    } else {
      setNextRefreshAt(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefreshDynamic, isAuthenticated, password])

  const loadCatalogStatus = async () => {
    try {
      const res = await fetch('/api/catalog/status?mode=full')
      if (res.ok) {
        const status: CatalogStatus = await res.json()
        setCatalogStatus(status)
      }
    } catch (err) {
      console.error('Error loading catalog status:', err)
    }
  }

  const loadCoreStatus = async () => {
    try {
      const res = await fetch('/api/catalog/status?mode=core')
      if (res.ok) {
        const status: CatalogStatus = await res.json()
        setCoreStatus(status)
      }
    } catch (err) {
      console.error('Error loading core status:', err)
    }
  }

  const loadDynamicStatus = async () => {
    try {
      const res = await fetch('/api/catalog/status?mode=dynamic')
      if (res.ok) {
        const status: CatalogStatus = await res.json()
        setDynamicStatus(status)
      }
    } catch (err) {
      console.error('Error loading dynamic status:', err)
    }
  }

  const handleRefreshCatalog = async (mode: 'core' | 'dynamic' | 'full') => {
    if (!password) return

    setRefreshState({ mode, loading: true })
    try {
      const headers = {
        'x-admin-password': password,
        'Content-Type': 'application/json',
      }

      // Build default body
      const today = new Date()
      const priceDate = today.toISOString().substring(0, 10).replace(/-/g, '') // YYYYMMDD
      const limitsMonth = today.toISOString().substring(0, 7).replace(/-/g, '') // YYYYMM
      const currentLang = mapLocaleToLang(locale)

      const body: any = {
        language: currentLang,
        refreshMode: mode,
      }

      // Add priceDate and limitsMonth for dynamic and full modes
      if (mode === 'dynamic' || mode === 'full') {
        body.priceDate = priceDate
        body.limitsMonth = limitsMonth
      }

      const res = await fetch('/api/catalog/refresh', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          setIsAuthenticated(false)
          setRefreshState({ mode: null, loading: false, error: 'Invalid password' })
          setTimeout(() => setRefreshState({ mode: null, loading: false }), 3000)
          return
        }
        if (res.status === 409) {
          // Non-blocking error message
          setRefreshState({
            mode,
            loading: false,
            error: `Refresh already in progress: ${data.reason || 'refresh_in_progress'}`,
          })
          setTimeout(() => setRefreshState({ mode: null, loading: false }), 5000)
          return
        }
        throw new Error(data.message || 'Failed to refresh')
      }

      // Update refresh state with success info
      setRefreshState({
        mode,
        loading: false,
        ms: data.ms,
        itemCount: data.itemCount,
        totalEvents: data.totalEvents,
      })

      // Reload statuses
      await Promise.all([
        loadCatalogStatus(),
        mode === 'core' ? loadCoreStatus() : Promise.resolve(),
        mode === 'dynamic' ? loadDynamicStatus() : Promise.resolve(),
      ])

      // Clear success state after 5 seconds
      setTimeout(() => setRefreshState({ mode: null, loading: false }), 5000)
    } catch (err) {
      console.error('Error refreshing catalog:', err)
      setRefreshState({
        mode,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
      setTimeout(() => setRefreshState({ mode: null, loading: false }), 5000)
    }
  }

  const handleLogin = () => {
    setIsAuthenticated(true)
  }

  const loadActivities = async () => {
    if (!password) return

    setLoading(true)
    try {
      const headers = {
        'x-admin-password': password,
      }

      // Load catalog from Super Catalog with merged curation
      const currentLang = mapLocaleToLang(locale)
      const catalogRes = await fetch(`/api/catalog/full?lang=${currentLang}&merged=1&thin=smart&mode=sellable`, { headers })
      if (!catalogRes.ok) {
        if (catalogRes.status === 401) {
          setIsAuthenticated(false)
          alert('Invalid password')
          return
        }
        throw new Error('Failed to load catalog')
      }
      const catalogJson = await catalogRes.json()
      // Map FullTour to CatalogItem format for compatibility
      const catalogData: CatalogItem[] = (catalogJson.items || []).map((tour: any) => ({
        id: tour.id,
        slug: tour.slug,
        title: tour.displayTitle ?? tour.titleOverride ?? tour.title,
        description: tour.displayDescription ?? tour.shortDescriptionOverride ?? tour.description,
        image: tour.displayImage ?? tour.imageOverrideUrl ?? tour.image,
        price: tour.basePrice,
        currency: tour.currency || 'EUR',
        vibeId: tour.vibe_id || '1',
        isBookable: true,
      }))
      setItems(catalogData || [])

      // Load curation
      const curRes = await fetch('/api/curation', { headers })
      if (!curRes.ok) {
        if (curRes.status === 401) {
          setIsAuthenticated(false)
          alert('Invalid password')
          return
        }
        throw new Error('Failed to load curation')
      }
      const curData = await curRes.json()
      const curatedMap: Record<string, CuratedExperience> = {}
      ;(curData.data || []).forEach((item: CuratedExperience) => {
        curatedMap[item.experience_id] = item
      })
      setCurated(curatedMap)
    } catch (err) {
      console.error('Error loading activities:', err)
      alert('Error loading activities')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (experienceId: string, curation: Partial<CuratedExperience>) => {
    if (!password) return

    setSaving((prev) => ({ ...prev, [experienceId]: true }))
    try {
      const headers = {
        'x-admin-password': password,
        'Content-Type': 'application/json',
      }

      const body = {
        id: experienceId,
        vibe_id: curation.vibe_id || '1',
        enabled: curation.enabled ?? true,
        featured: curation.featured ?? false,
        priority: curation.priority ?? 0,
        imageOverrideUrl: curation.imageOverrideUrl || null,
        titleOverride: curation.titleOverride || null,
        shortDescriptionOverride: curation.shortDescriptionOverride || null,
      }

      const res = await fetch('/api/curation', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        if (res.status === 401) {
          setIsAuthenticated(false)
          alert('Invalid password')
          return
        }
        throw new Error('Failed to save')
      }

      // Reload curation
      await loadActivities()
    } catch (err) {
      console.error('Error saving:', err)
      alert('Error saving curation')
    } finally {
      setSaving((prev) => ({ ...prev, [experienceId]: false }))
    }
  }

  const handleDelete = async (experienceId: string) => {
    if (!password || !confirm('Delete this curation?')) return

    try {
      const headers = {
        'x-admin-password': password,
        'Content-Type': 'application/json',
      }

      const res = await fetch('/api/curation', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ id: experienceId }),
      })

      if (!res.ok) {
        if (res.status === 401) {
          setIsAuthenticated(false)
          alert('Invalid password')
          return
        }
        throw new Error('Failed to delete')
      }

      // Reload curation
      await loadActivities()
    } catch (err) {
      console.error('Error deleting:', err)
      alert('Error deleting curation')
    }
  }

  // Filter items by search
  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      item.title.toLowerCase().includes(query) ||
      item.id.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.slug?.toLowerCase().includes(query)
    )
  })

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Select all filtered
  const handleSelectAllFiltered = () => {
    const allFilteredIds = new Set(filteredItems.map((item) => item.id))
    const allSelected = filteredItems.length > 0 && filteredItems.every((item) => selectedIds.has(item.id))
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(allFilteredIds)
    }
  }

  // Bulk actions
  const handleBulkAction = async (action: 'enable' | 'disable' | 'featuredOff' | 'priorityAuto') => {
    if (!password || selectedIds.size === 0) return

    setBulkLoading(true)
    try {
      const headers = {
        'x-admin-password': password,
        'Content-Type': 'application/json',
      }

      let items: any[] = []

      if (action === 'priorityAuto') {
        // Assign priority decroissante (100, 99, 98...) selon l'ordre filtré
        filteredItems
          .filter((item) => selectedIds.has(item.id))
          .forEach((item, index) => {
            items.push({
              id: item.id,
              priority: 100 - index,
            })
          })
      } else {
        // Other bulk actions
        Array.from(selectedIds).forEach((id) => {
          const item: any = { id }
          if (action === 'enable') {
            item.enabled = true
          } else if (action === 'disable') {
            item.enabled = false
          } else if (action === 'featuredOff') {
            item.featured = false
          }
          items.push(item)
        })
      }

      const res = await fetch('/api/curation/bulk', {
        method: 'POST',
        headers,
        body: JSON.stringify({ items }),
      })

      if (!res.ok) {
        if (res.status === 401) {
          setIsAuthenticated(false)
          alert('Invalid password')
          return
        }
        throw new Error('Failed to bulk update')
      }

      // Reload activities
      await loadActivities()
      // Clear selection
      setSelectedIds(new Set())
    } catch (err) {
      console.error('Error bulk updating:', err)
      alert('Error bulk updating curation')
    } finally {
      setBulkLoading(false)
    }
  }

  // Image import
  const handleImageImport = async () => {
    if (!password || !imageImportText.trim()) return

    setBulkLoading(true)
    try {
      const headers = {
        'x-admin-password': password,
        'Content-Type': 'application/json',
      }

      // Parse lines: "id,url" or "slug,url"
      const lines = imageImportText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && line.includes(','))

      const bulkItems: any[] = []

      for (const line of lines) {
        const [identifier, url] = line.split(',').map((s) => s.trim())
        if (!identifier || !url) continue

        // Try to resolve id if slug (check in all items, not just filtered)
        let id: string | undefined = identifier
        
        // Check if identifier is already an id in items
        const itemById = items.find((item) => item.id === identifier)
        if (itemById) {
          id = itemById.id
        } else {
          // Check if identifier is a slug
          const itemBySlug = items.find((item) => item.slug === identifier)
          if (itemBySlug) {
            id = itemBySlug.id
          } else {
            console.warn(`Could not resolve identifier: ${identifier}`)
            continue
          }
        }

        bulkItems.push({
          id,
          imageOverrideUrl: url,
        })
      }

      if (bulkItems.length === 0) {
        alert('No valid image overrides found')
        return
      }

      const res = await fetch('/api/curation/bulk', {
        method: 'POST',
        headers,
        body: JSON.stringify({ items: bulkItems }),
      })

      if (!res.ok) {
        if (res.status === 401) {
          setIsAuthenticated(false)
          alert('Invalid password')
          return
        }
        throw new Error('Failed to import images')
      }

      // Reload activities
      await loadActivities()
      // Clear import text
      setImageImportText('')
    } catch (err) {
      console.error('Error importing images:', err)
      alert('Error importing images')
    } finally {
      setBulkLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-glass-50 p-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-glass-900 mb-4">Admin Login</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-glass-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleLogin()
                  }
                }}
                className="w-full px-4 py-2 border border-glass-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                placeholder="Enter admin password"
              />
            </div>
            <button
              onClick={handleLogin}
              className="w-full px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-glass-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-glass-900 mb-4">Activity Curation Admin</h1>
          
          {/* Catalog Status Section */}
          <div className="mb-6 p-4 bg-glass-50 rounded-lg border border-glass-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-glass-900">Catalogue</h2>
              {process.env.NODE_ENV === 'development' && (
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-glass-600">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="w-4 h-4"
                    />
                    Auto-refresh Full (DEV, 30min)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-glass-600">
                    <input
                      type="checkbox"
                      checked={autoRefreshDynamic}
                      onChange={(e) => setAutoRefreshDynamic(e.target.checked)}
                      className="w-4 h-4"
                    />
                    Auto-refresh Dynamic (DEV, 12h)
                  </label>
                  {autoRefreshDynamic && nextRefreshAt && (
                    <span className="text-xs text-glass-500">
                      Next: {nextRefreshAt.toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Status Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Core Status */}
              <div className="p-3 bg-white rounded border border-glass-200">
                <div className="text-sm font-semibold text-glass-900 mb-2">Core Status</div>
                {coreStatus ? (
                  coreStatus.exists ? (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-glass-500">Updated</div>
                        <div className="font-medium text-glass-900">
                          {coreStatus.updatedAt
                            ? new Date(coreStatus.updatedAt).toLocaleString()
                            : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-glass-500">Items</div>
                        <div className="font-medium text-glass-900">
                          {coreStatus.itemCount ?? 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-glass-500">Events</div>
                        <div className="font-medium text-glass-900">
                          {coreStatus.totalEvents ?? 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-glass-500">Lang</div>
                        <div className="font-medium text-glass-900">
                          {coreStatus.language ?? 'N/A'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-red-600">{coreStatus.message || 'Missing'}</div>
                  )
                ) : (
                  <div className="text-xs text-glass-500">Loading...</div>
                )}
              </div>

              {/* Dynamic Status */}
              <div className="p-3 bg-white rounded border border-glass-200">
                <div className="text-sm font-semibold text-glass-900 mb-2">Dynamic Status</div>
                {dynamicStatus ? (
                  dynamicStatus.exists ? (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-glass-500">Updated</div>
                        <div className="font-medium text-glass-900">
                          {dynamicStatus.updatedAt
                            ? new Date(dynamicStatus.updatedAt).toLocaleString()
                            : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-glass-500">Tours</div>
                        <div className="font-medium text-glass-900">
                          {dynamicStatus.itemCount ?? 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-glass-500">Events</div>
                        <div className="font-medium text-glass-900">
                          {dynamicStatus.totalEvents ?? 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-glass-500">Lang</div>
                        <div className="font-medium text-glass-900">
                          {dynamicStatus.language ?? 'N/A'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-red-600">{dynamicStatus.message || 'Missing'}</div>
                  )
                ) : (
                  <div className="text-xs text-glass-500">Loading...</div>
                )}
              </div>
            </div>

            {/* Refresh Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleRefreshCatalog('core')}
                disabled={refreshState.loading || !password}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {refreshState.loading && refreshState.mode === 'core' ? (
                  'Rebuilding Core...'
                ) : (
                  'Rebuild Core'
                )}
              </button>
              <button
                onClick={() => handleRefreshCatalog('dynamic')}
                disabled={refreshState.loading || !password}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {refreshState.loading && refreshState.mode === 'dynamic' ? (
                  'Rebuilding Dynamic...'
                ) : (
                  'Rebuild Dynamic'
                )}
              </button>
              <button
                onClick={() => handleRefreshCatalog('full')}
                disabled={refreshState.loading || !password}
                className="px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {refreshState.loading && refreshState.mode === 'full' ? (
                  'Rebuilding Full...'
                ) : (
                  'Rebuild Full'
                )}
              </button>
            </div>

            {/* Refresh State Feedback */}
            {refreshState.loading && (
              <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                <div>Refreshing {refreshState.mode} cache...</div>
              </div>
            )}
            {refreshState.error && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                <div>{refreshState.error}</div>
              </div>
            )}
            {refreshState.ms && !refreshState.loading && refreshState.itemCount !== undefined && (
              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                <div>
                  {refreshState.mode} cache refreshed successfully! ({refreshState.itemCount} items
                  {refreshState.totalEvents && `, ${refreshState.totalEvents} events`},{' '}
                  {Math.round(refreshState.ms / 1000)}s)
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <button
              onClick={loadActivities}
              disabled={loading}
              className="px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load Activities'}
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search activities..."
              className="flex-1 px-4 py-2 border border-glass-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
            />
          </div>
          <p className="text-sm text-glass-600 mb-4">
            {filteredItems.length} activities loaded | {selectedIds.size} selected
          </p>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-semibold text-blue-900">Bulk Actions ({selectedIds.size} selected):</span>
                <button
                  onClick={() => handleBulkAction('enable')}
                  disabled={bulkLoading}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                >
                  Bulk Enable
                </button>
                <button
                  onClick={() => handleBulkAction('disable')}
                  disabled={bulkLoading}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                >
                  Bulk Disable
                </button>
                <button
                  onClick={() => handleBulkAction('featuredOff')}
                  disabled={bulkLoading}
                  className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 disabled:opacity-50"
                >
                  Bulk Featured OFF
                </button>
                <button
                  onClick={() => handleBulkAction('priorityAuto')}
                  disabled={bulkLoading}
                  className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
                >
                  Bulk Set Priority (Auto)
                </button>
              </div>
            </div>
          )}

          {/* Image Import */}
          <div className="mb-4 p-4 bg-glass-50 border border-glass-200 rounded-lg">
            <h3 className="text-sm font-semibold text-glass-900 mb-2">Import Images</h3>
            <p className="text-xs text-glass-600 mb-2">
              Format: one line per tour = &quot;id,url&quot; or &quot;slug,url&quot;
            </p>
            <textarea
              value={imageImportText}
              onChange={(e) => setImageImportText(e.target.value)}
              placeholder="1317,https://.../teide.webp&#10;teide-sunset-tour,https://.../teide2.jpg"
              className="w-full px-3 py-2 border border-glass-300 rounded text-sm font-mono mb-2"
              rows={4}
            />
            <button
              onClick={handleImageImport}
              disabled={bulkLoading || !imageImportText.trim()}
              className="px-4 py-2 bg-ocean-600 text-white text-sm rounded hover:bg-ocean-700 disabled:opacity-50"
            >
              {bulkLoading ? 'Applying...' : 'Apply'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-glass-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-glass-900">
                    <input
                      type="checkbox"
                      checked={filteredItems.length > 0 && filteredItems.every((item) => selectedIds.has(item.id))}
                      onChange={handleSelectAllFiltered}
                      className="w-4 h-4"
                      title="Select all filtered"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-glass-900">Title</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-glass-900">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-glass-900">Image</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-glass-900">Price</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-glass-900">Vibe</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-glass-900">Enabled</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-glass-900">Featured</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-glass-900">Priority</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-glass-900">Image Override</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-glass-900">Title Override</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-glass-900">Desc Override</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-glass-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-200">
                {filteredItems.map((item) => (
                  <ExperienceRow
                    key={item.id}
                    item={item}
                    curation={curated[item.id]}
                    vibes={vibes}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    saving={saving[item.id]}
                    selected={selectedIds.has(item.id)}
                    onToggleSelect={handleToggleSelect}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

