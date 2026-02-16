/**
 * Loading skeleton for catalog page
 */

export default function CatalogLoading() {
  return (
    <div className="min-h-screen bg-glass-50 py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-10 bg-gray-200 rounded w-1/4 mb-2 animate-pulse"></div>
          <div className="h-5 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm animate-pulse"
            >
              <div className="w-full aspect-[4/3] bg-gray-300"></div>
              <div className="p-4 flex flex-col gap-3">
                <div className="h-6 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                <div className="h-10 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


























