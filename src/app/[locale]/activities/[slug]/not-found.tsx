/**
 * Not Found page for activity detail
 */

import { Link } from '@/navigation'

export default function ActivityNotFound() {
  return (
    <div className="min-h-screen bg-glass-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold text-glass-900 mb-4">Activity Not Found</h1>
        <p className="text-glass-600 mb-6">
          The activity you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/activities"
          className="inline-block px-6 py-3 bg-ocean-600 text-white font-medium rounded-lg hover:bg-ocean-700 transition-colors"
        >
          Back to Activities
        </Link>
      </div>
    </div>
  )
}



