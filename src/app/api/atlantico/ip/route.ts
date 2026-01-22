import { NextResponse } from 'next/server'

/**
 * GET /api/atlantico/ip
 * 
 * Returns the public egress IP address of the server making the request.
 * This is the IP that Atlantico needs to whitelist.
 * 
 * Uses ipify.org to determine the server's public IP address.
 */
export async function GET() {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    try {
      const response = await fetch('https://api.ipify.org?format=json', {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch IP: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json() as { ip: string }
      
      return NextResponse.json({
        ip: data.ip,
        timestamp: new Date().toISOString(),
        note: 'This is the public egress IP that Atlantico needs to whitelist',
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error('Request to ipify.org timed out')
      }
      
      throw fetchError
    }
  } catch (error) {
    console.error('[Atlantico IP] Error:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to determine server IP',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}



