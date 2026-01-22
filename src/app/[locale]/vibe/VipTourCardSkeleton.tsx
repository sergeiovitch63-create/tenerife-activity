/**
 * VIP Tour Card Skeleton Component
 * 
 * Placeholder UI that matches the exact structure and dimensions of VipTourRowCard.
 * Used for loading states and placeholder content.
 */

export function VipTourCardSkeleton() {
  return (
    <div className="bg-white border border-glass-200 rounded-lg overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-stretch">
        {/* Left: Image skeleton - Full height, same as real card */}
        <div className="md:w-64 md:flex-shrink-0 md:self-stretch">
          <div className="w-full h-full md:h-full">
            <div className="w-full h-full bg-gradient-to-br from-glass-200 to-glass-300 animate-pulse rounded-t-lg md:rounded-l-lg md:rounded-t-none" />
          </div>
        </div>

        {/* Middle: Content skeleton */}
        <div className="flex-1 p-4 md:p-6 flex flex-col">
          {/* Title skeleton */}
          <div className="mb-2">
            <div className="h-7 md:h-8 bg-glass-200 rounded animate-pulse w-3/4" />
          </div>

          {/* Description skeleton - 2 lines */}
          <div className="mb-4 space-y-2">
            <div className="h-4 bg-glass-200 rounded animate-pulse w-full" />
            <div className="h-4 bg-glass-200 rounded animate-pulse w-5/6" />
          </div>

          {/* Info rows skeleton - 3 bullet points */}
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-glass-200 rounded animate-pulse" />
              <div className="h-4 bg-glass-200 rounded animate-pulse w-32" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-glass-200 rounded animate-pulse" />
              <div className="h-4 bg-glass-200 rounded animate-pulse w-36" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-glass-200 rounded animate-pulse" />
              <div className="h-4 bg-glass-200 rounded animate-pulse w-28" />
            </div>
          </div>

          {/* View button skeleton */}
          <div className="mt-auto pt-4">
            <div className="inline-block px-4 py-2 bg-glass-200 rounded-lg animate-pulse w-32" />
          </div>
        </div>

        {/* Right: Price skeleton */}
        <div className="md:w-48 md:flex-shrink-0 p-4 md:p-6 bg-glass-50 flex items-center justify-center md:border-l border-glass-200">
          <div className="text-center w-full">
            <div className="h-4 bg-glass-200 rounded animate-pulse w-16 mx-auto mb-2" />
            <div className="h-9 bg-glass-200 rounded animate-pulse w-24 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  )
}

