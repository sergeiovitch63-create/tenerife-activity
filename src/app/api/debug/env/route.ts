/**
 * GET /api/debug/env
 * 
 * DEV ONLY endpoint to check if environment variables are loaded.
 * Returns metadata about env vars without exposing their values.
 * 
 * Disabled in production for security.
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  // Disable in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoint disabled in production' },
      { status: 403 }
    )
  }

  const adminPassword = process.env.ADMIN_PASSWORD ?? ''

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    hasAdminPassword: !!adminPassword,
    adminLen: adminPassword.length,
  })
}
























