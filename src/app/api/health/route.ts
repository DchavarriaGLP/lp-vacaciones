import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Health check para monitoreo/uptime. Público (incluido en middleware
 * PUBLIC_PATHS). No expone información sensible.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'lp-vacaciones',
    time: new Date().toISOString(),
  })
}
