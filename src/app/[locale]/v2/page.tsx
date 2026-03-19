import { getClassifications, getTours } from '@/lib/atlantico.api'

export default async function V2Page({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  let classifications = [] as unknown[]
  let tours = [] as unknown[]

  try {
    const data = await getClassifications(locale)
    classifications = Array.isArray(data) ? data : []
  } catch (e) {
    console.error('getClassifications failed:', e)
    classifications = []
  }

  try {
    const data = await getTours(locale)
    tours = Array.isArray(data) ? data : []
  } catch (e) {
    console.error('getTours failed:', e)
    tours = []
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">V2 Test</h1>
      <p>Locale: {locale}</p>
      <p>Classifications: {classifications.length}</p>
      <p>Tours: {tours.length}</p>
    </div>
  )
}

