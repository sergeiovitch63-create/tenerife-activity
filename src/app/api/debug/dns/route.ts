/**
 * GET /api/debug/dns
 * 
 * DEV ONLY endpoint to diagnose DNS issues with Supabase URL.
 * Tests DNS resolution and HTTP connectivity.
 * 
 * Disabled in production for security.
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { lookup } from 'dns/promises'

export async function GET(request: NextRequest) {
  // Disable in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoint disabled in production' },
      { status: 403 }
    )
  }

  const urlRaw = (process.env.SUPABASE_URL ?? '').trim()
  const cleanUrl = urlRaw.replace(/\/+$/, '')

  if (!cleanUrl) {
    return NextResponse.json({
      ok: false,
      error: 'SUPABASE_URL is empty',
    })
  }

  let hostname: string
  try {
    const urlObj = new URL(cleanUrl)
    hostname = urlObj.hostname
  } catch (urlErr) {
    return NextResponse.json({
      ok: false,
      error: 'Invalid URL format',
      url: cleanUrl.substring(0, 50),
      urlLength: cleanUrl.length,
    })
  }

  const hasWhitespace = /\s/.test(cleanUrl)
  const hostnameLength = hostname.length

  // Test DNS lookup
  let dnsResult: { ok: boolean; errorCode?: string; address?: string } = { ok: false }
  try {
    const addresses = await lookup(hostname)
    dnsResult = {
      ok: true,
      address: addresses.address,
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('[DNS_DEBUG] dns.lookup success:', {
        hostname,
        address: addresses.address,
        family: addresses.family,
      })
    }
  } catch (dnsErr: any) {
    dnsResult = {
      ok: false,
      errorCode: dnsErr.code || 'UNKNOWN',
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('[DNS_DEBUG] dns.lookup failed:', {
        hostname,
        code: dnsErr.code,
        message: dnsErr.message,
      })
    }

    // Try IPv4 fallback if ENOTFOUND
    if (dnsErr.code === 'ENOTFOUND') {
      try {
        const { setDefaultResultOrder } = await import('dns')
        setDefaultResultOrder('ipv4first')
        const addressesRetry = await lookup(hostname)
        dnsResult = {
          ok: true,
          address: addressesRetry.address,
        }
        if (process.env.NODE_ENV === 'development') {
          console.log('[DNS_DEBUG] dns.lookup retry (ipv4first) success:', {
            hostname,
            address: addressesRetry.address,
          })
        }
      } catch (retryErr: any) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[DNS_DEBUG] dns.lookup retry failed:', {
            hostname,
            code: retryErr.code,
            message: retryErr.message,
          })
        }
      }
    }
  }

  // Test HTTP fetch
  let fetchResult: { ok: boolean; status?: number; error?: string } = { ok: false }
  try {
    const testUrl = `${cleanUrl}/rest/v1/`
    const response = await fetch(testUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    })
    fetchResult = {
      ok: response.ok || response.status < 500,
      status: response.status,
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('[DNS_DEBUG] fetch HEAD success:', {
        url: testUrl,
        status: response.status,
        statusText: response.statusText,
      })
    }
  } catch (fetchErr: any) {
    fetchResult = {
      ok: false,
      error: fetchErr.message || 'Unknown fetch error',
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('[DNS_DEBUG] fetch HEAD failed:', {
        url: `${cleanUrl}/rest/v1/`,
        message: fetchErr.message,
        code: fetchErr.code,
      })
    }
  }

  return NextResponse.json({
    ok: dnsResult.ok && fetchResult.ok,
    hostname,
    hostnameLength,
    envLength: cleanUrl.length,
    hasWhitespace,
    dns: dnsResult,
    fetch: fetchResult,
  })
}
























