/**
 * Loading skeleton for Activities page
 */

export default function ActivitiesLoading() {
  return (
    <div className="min-h-screen bg-glass-50 py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-10 w-48 bg-glass-200 rounded mb-2 animate-pulse" />
          <div className="h-6 w-64 bg-glass-200 rounded animate-pulse" />
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white border border-glass-200 rounded-lg overflow-hidden"
            >
              {/* Image Skeleton */}
              <div className="w-full aspect-[4/3] bg-glass-200 animate-pulse" />

              {/* Content Skeleton */}
              <div className="p-4 space-y-3">
                <div className="h-6 bg-glass-200 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-glass-200 rounded animate-pulse" />
                <div className="flex justify-between">
                  <div className="h-4 w-24 bg-glass-200 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-glass-200 rounded animate-pulse" />
                </div>
                <div className="h-10 w-full bg-glass-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


















