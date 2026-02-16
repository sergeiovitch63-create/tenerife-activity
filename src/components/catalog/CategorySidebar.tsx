'use client'

type Classification = {
  id?: string | number
  code?: string
  name?: string
  [key: string]: unknown
}

interface CategorySidebarProps {
  classifications: Classification[]
  selectedClassificationId: string | null
  groupsByClassification: Record<string, unknown[]>
  onSelect: (classificationId: string | null) => void
}

function getClassificationIdString(cls: Classification | null): string | null {
  if (!cls || cls.id === undefined || cls.id === null) return null
  const v = String(cls.id).trim()
  return v ? v : null
}

export function CategorySidebar({
  classifications,
  selectedClassificationId,
  groupsByClassification,
  onSelect,
}: CategorySidebarProps) {
  return (
    <div className="bg-white border border-glass-200 rounded-lg p-4 md:p-6 shadow-sm">
      <h2 className="text-xl font-bold text-glass-900 mb-4">Categories</h2>
      <div className="space-y-2">
        <button
          onClick={() => onSelect(null)}
          className={`w-full text-left p-3 rounded-lg border transition-colors ${
            selectedClassificationId === null
              ? 'bg-ocean-50 border-ocean-600 text-ocean-900'
              : 'bg-glass-50 border-glass-200 hover:border-ocean-300 text-glass-900'
          }`}
        >
          <div className="font-medium">All Categories</div>
          <div className="text-xs text-glass-600 mt-1">
            {Object.values(groupsByClassification).reduce((sum, groups) => sum + (Array.isArray(groups) ? groups.length : 0), 0)} tours
          </div>
        </button>
        {classifications.map((c) => {
          const clsId = getClassificationIdString(c)
          if (!clsId) return null
          const groups = groupsByClassification[clsId] || []
          const count = Array.isArray(groups) ? groups.length : 0
          const isSelected = clsId === selectedClassificationId

          return (
            <button
              key={clsId}
              onClick={() => onSelect(clsId)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                isSelected
                  ? 'bg-ocean-50 border-ocean-600 text-ocean-900'
                  : 'bg-glass-50 border-glass-200 hover:border-ocean-300 text-glass-900'
              }`}
            >
              <div className="font-medium">{c.name || '—'}</div>
              <div className="text-xs text-glass-600 mt-1">{count} {count === 1 ? 'tour' : 'tours'}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}














