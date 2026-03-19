export default async function V2Page({
  params,
}: {
  params: { locale: string }
}) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">V2 Test</h1>
      <p>Locale: {params.locale}</p>
    </div>
  )
}

