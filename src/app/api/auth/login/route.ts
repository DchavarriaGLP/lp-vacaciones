import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createSessionCookie, buildSetCookieHeader } from '@/lib/auth/session'

// Rate limiting en memoria por IP. Mitiga fuerza bruta (OWASP A07).
// Nota: por-instancia. Para multi-región usar Upstash/Redis.
const WINDOW_MS = 15 * 60 * 1000 // 15 min
const MAX_ATTEMPTS = 10
const attempts = new Map<string, { count: number; resetAt: number }>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const rec = attempts.get(ip)
  if (!rec || now > rec.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  rec.count++
  return rec.count > MAX_ATTEMPTS
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'

  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' },
      { status: 429 }
    )
  }

  const { username, password } = await req.json()

  if (!username || !password) {
    return NextResponse.json({ error: 'Usuario y contraseña requeridos' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Buscar usuario por username en app_users
  const { data: appUser, error: userError } = await supabase
    .from('app_users')
    .select('id, username, role, password_hash')
    .eq('username', username.toLowerCase().trim())
    .single()

  if (userError || !appUser) {
    return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 })
  }

  // Verificar contraseña con pgcrypto via RPC
  const { data: valid } = await supabase.rpc('verify_password', {
    p_hash: appUser.password_hash ?? '',
    p_password: password,
  })

  if (!valid) {
    return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 })
  }

  // Obtener employee_id: primero por user_id, fallback por username.
  let employeeId: string | null = null
  const { data: empByUser } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', appUser.id)
    .maybeSingle()

  if (empByUser) {
    employeeId = empByUser.id
  } else {
    const { data: empByUsername } = await supabase
      .from('employees')
      .select('id')
      .eq('username', appUser.username)
      .maybeSingle()
    employeeId = empByUsername?.id ?? null
  }

  const sessionToken = await createSessionCookie({
    id: appUser.id,
    username: appUser.username,
    role: appUser.role as 'admin' | 'manager' | 'employee',
    employeeId,
  })

  const response = NextResponse.json({ ok: true })
  response.headers.set('Set-Cookie', buildSetCookieHeader(sessionToken))
  return response
}
