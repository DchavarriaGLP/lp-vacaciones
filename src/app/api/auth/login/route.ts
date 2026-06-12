import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createSessionCookie, buildSetCookieHeader } from '@/lib/auth/session'

export async function POST(req: NextRequest) {
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
    p_hash: appUser.password_hash,
    p_password: password,
  })

  if (!valid) {
    return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 })
  }

  // Obtener employee_id
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', appUser.id)
    .single()

  const sessionToken = await createSessionCookie({
    id: appUser.id,
    username: appUser.username,
    role: appUser.role as 'admin' | 'manager' | 'employee',
    employeeId: employee?.id ?? null,
  })

  const response = NextResponse.json({ ok: true })
  response.headers.set('Set-Cookie', buildSetCookieHeader(sessionToken))
  return response
}
