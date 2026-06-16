import { NextResponse } from 'next/server'
import { buildClearCookieHeader } from '@/lib/auth/session'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.headers.set('Set-Cookie', buildClearCookieHeader())
  return response
}
