'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface EventImage {
  eventId: string
  eventCode: string
  eventName: string
  images: Array<{
    field: string
    value: string
    url: string
    status: 'testing' | 'found' | 'not-found' | 'error'
  }>
}

export default function DebugImagesPage() {
  const [events, setEvents] = useState<EventImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [testedUrls, setTestedUrls] = useState<Record<string, 'testing' | 'found' | 'not-found'>>({})

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        setError(null)

        // Use the server-side API that tests all images
        const response = await fetch('/api/debug/all-images')
        if (!response.ok) {
          throw new Error('Failed to fetch images')
        }

        const data = await response.json()
        
        // Convert API response to component format
        const allEvents: EventImage[] = data.events.map((event: any) => ({
          eventId: event.eventId,
          eventCode: event.eventCode,
          eventName: event.eventName,
          images: event.images.map((img: any) => ({
            field: img.field,
            value: img.value,
            url: img.url,
            status: img.found ? 'found' : 'not-found',
          })),
        }))

        setEvents(allEvents)

        // Mark all URLs as tested
        const urls: Record<string, 'found' | 'not-found'> = {}
        allEvents.forEach(event => {
          event.images.forEach(img => {
            urls[img.url] = img.status === 'found' ? 'found' : 'not-found'
          })
        })
        setTestedUrls(urls)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  function buildImageUrls(filenameOrUrl: string): string[] {
    const urls: string[] = []

    // If already a full URL, use it
    if (filenameOrUrl.startsWith('http://') || filenameOrUrl.startsWith('https://')) {
      urls.push(filenameOrUrl)
      return urls
    }

    // Build URLs with different base paths
    const bases = [
      'https://api.atlanticoexcursiones.com/images',
      'https://api.atlanticoexcursiones.com/img',
      'https://api.atlanticoexcursiones.com/uploads',
      'https://api.atlanticoexcursiones.com/files',
      'https://testapi.atlanticoexcursiones.com/images',
      'https://testapi.atlanticoexcursiones.com/img',
    ]

    for (const base of bases) {
      urls.push(`${base}/${encodeURIComponent(filenameOrUrl)}`)
    }

    return urls
  }

  async function testImageUrl(url: string): Promise<'found' | 'not-found'> {
    try {
      const response = await fetch(url, { method: 'HEAD', cache: 'no-store' })
      return response.ok ? 'found' : 'not-found'
    } catch {
      return 'not-found'
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>Chargement des events et images...</h1>
        <p>Récupération de tous les events et test des images disponibles...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '40px' }}>
        <h1 style={{ color: '#c33' }}>Erreur</h1>
        <p>{error}</p>
      </div>
    )
  }

  const foundImages = events.filter(e => 
    e.images.some(img => testedUrls[img.url] === 'found')
  )

  return (
    <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '10px' }}>Debug: Images disponibles par Event</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Total: {events.length} events | {foundImages.length} events avec images trouvées | 
        Total images testées: {events.reduce((sum, e) => sum + e.images.length, 0)} | 
        Images trouvées: {events.reduce((sum, e) => sum + e.images.filter(img => testedUrls[img.url] === 'found').length, 0)}
      </p>

      <div style={{ marginBottom: '30px', padding: '15px', background: '#e3f2fd', borderRadius: '8px' }}>
        <h2>Légende:</h2>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <span style={{ padding: '5px 10px', background: '#4caf50', color: 'white', borderRadius: '4px' }}>
            ✅ Trouvé
          </span>
          <span style={{ padding: '5px 10px', background: '#f44336', color: 'white', borderRadius: '4px' }}>
            ❌ Non trouvé
          </span>
          <span style={{ padding: '5px 10px', background: '#ff9800', color: 'white', borderRadius: '4px' }}>
            ⏳ Test en cours
          </span>
        </div>
      </div>

      {events.map((event) => {
        const hasFoundImages = event.images.some(img => testedUrls[img.url] === 'found')
        
        return (
          <div
            key={event.eventId}
            style={{
              marginBottom: '30px',
              padding: '20px',
              border: hasFoundImages ? '2px solid #4caf50' : '1px solid #ddd',
              borderRadius: '8px',
              background: hasFoundImages ? '#f1f8f4' : '#fff',
            }}
          >
            <h2 style={{ marginBottom: '10px' }}>
              Event {event.eventCode} ({event.eventId})
            </h2>
            <p style={{ color: '#666', marginBottom: '15px' }}>
              {event.eventName || 'Sans nom'}
            </p>

            {event.images.length === 0 ? (
              <p style={{ color: '#999', fontStyle: 'italic' }}>Aucune image trouvée dans les champs</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                {event.images.map((img, idx) => {
                  const status = testedUrls[img.url] || 'testing'
                  const isFound = status === 'found'

                  return (
                    <div
                      key={`${img.url}-${idx}`}
                      style={{
                        padding: '15px',
                        border: `2px solid ${isFound ? '#4caf50' : status === 'not-found' ? '#f44336' : '#ff9800'}`,
                        borderRadius: '8px',
                        background: isFound ? '#f1f8f4' : '#fff',
                      }}
                    >
                      <div style={{ marginBottom: '10px' }}>
                        <strong>Champ:</strong> {img.field}
                      </div>
                      <div style={{ marginBottom: '10px', fontSize: '12px', color: '#666' }}>
                        <strong>Valeur:</strong> {img.value}
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <strong>URL:</strong>
                        <code style={{ fontSize: '11px', wordBreak: 'break-all', display: 'block', marginTop: '5px' }}>
                          {img.url}
                        </code>
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <span
                          style={{
                            padding: '5px 10px',
                            background:
                              status === 'found'
                                ? '#4caf50'
                                : status === 'not-found'
                                ? '#f44336'
                                : '#ff9800',
                            color: 'white',
                            borderRadius: '4px',
                            fontSize: '12px',
                          }}
                        >
                          {status === 'found' ? '✅ Trouvé' : status === 'not-found' ? '❌ Non trouvé' : '⏳ Test en cours'}
                        </span>
                      </div>
                      {isFound && (
                        <div
                          style={{
                            position: 'relative',
                            width: '100%',
                            aspectRatio: '16/9',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            marginTop: '10px',
                          }}
                        >
                          <Image
                            src={img.url}
                            alt={`${event.eventCode} - ${img.field}`}
                            fill
                            style={{ objectFit: 'contain' }}
                            unoptimized
                            onError={() => {
                              setTestedUrls(prev => ({ ...prev, [img.url]: 'not-found' }))
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {events.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
          <p>Aucun event trouvé</p>
        </div>
      )}
    </div>
  )
}

