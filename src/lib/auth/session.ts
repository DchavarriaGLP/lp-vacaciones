/**
 * Sesión simple basada en cookie HttpOnly firmada con HMAC-SHA256.
 * No depende de Supabase Auth — usa Supabase solo como base de datos.
 */

import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

export interface SessionUser {
  id: string          // app_users.id (UUID)
  username: string    // nombre.apellido
  role: 'admin' | 'manager' | 'employee'
  employeeId: string | null
}

const COOKIE_NAME = 'lp_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 días

function getSecret(): string {
  return process.env.SESSION_SECRET ?? 'lp-dev-secret-change-in-prod-2024'
}

async function sign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function verify(payload: string, signature: string, secret: string): Promise<boolean> {
  const expected = await sign(payload, secret)
  return expected === signature
}

export function encodeSession(user: SessionUser): Promise<string> {
  const payload = btoa(JSON.stringify(user))
  return sign(payload, getSecret()).then(sig => `${payload}.${sig}`)
}

export async function decodeSession(token: string): Promise<SessionUser | null> {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payload, sig] = parts
  const valid = await verify(payload, sig, getSecret())
  if (!valid) return null
  try {
    return JSON.parse(atob(payload)) as SessionUser
  } catch {
    return null
  }
}

/** Leer sesión en Server Components / Server Actions */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return decodeSession(token)
}

/** Leer sesión en middleware (Request) */
export async function getSessionFromRequest(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return decodeSession(token)
}

/** Crear sesión — llamar desde API route */
export async function createSessionCookie(user: SessionUser): Promise<string> {
  return encodeSession(user)
}

export function buildSetCookieHeader(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`
}

export function buildClearCookieHeader(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
}
