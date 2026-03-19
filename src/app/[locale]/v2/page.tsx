import { getClassifications, getTours } from '@/lib/atlantico.api'

export default async function V2Page({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  let classifications: unknown[] = []
  let tours: unknown[] = []
  let classError: string | null = null
  let toursError: string | null = null

  try {
    const data = await getClassifications(locale)
    classifications = Array.isArray(data) ? data : []
  } catch (e) {
    classError = String(e)
    console.error('getClassifications failed:', e)
    classifications = []
  }

  try {
    const data = await getTours(locale)
    tours = Array.isArray(data) ? data : []
  } catch (e) {
    toursError = String(e)
    console.error('getTours failed:', e)
    tours = []
  }

  return (
    <div className="space-y-4 p-8">
      <h1 className="text-2xl font-bold">V2 Debug</h1>
      <p>Locale: {locale}</p>
      <p>Classifications: {classifications.length}</p>
      <p>Tours: {tours.length}</p>
      {classError && (
        <p className="rounded bg-red-50 p-4 text-red-500">
          Classifications error: {classError}
        </p>
      )}
      {toursError && (
        <p className="rounded bg-red-50 p-4 text-red-500">
          Tours error: {toursError}
        </p>
      )}
      {classifications.length > 0 && (
        <pre className="overflow-auto rounded bg-gray-100 p-4 text-sm">
          {JSON.stringify(classifications[0], null, 2)}
        </pre>
      )}
    </div>
  )
}

