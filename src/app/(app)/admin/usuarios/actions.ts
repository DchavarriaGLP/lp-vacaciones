'use server'

/**
 * Server Actions del panel de administración de usuarios.
 * Solo accesibles para usuarios con rol "admin".
 */

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'

const DEFAULT_PASSWORD = '12345'

type ActionResult = { ok?: boolean; error?: string }

async function requireAdmin(): Promise<ActionResult | null> {
  const session = await getSession()
  if (!session) return { error: 'No autenticado' }
  if (session.role !== 'admin') return { error: 'No autorizado' }
  return null
}

const userIdSchema = z.string().uuid('ID de usuario inválido')

export async function resetUserPassword(userId: string): Promise<ActionResult> {
  const denied = await requireAdmin()
  if (denied) return denied

  const parsed = userIdSchema.safeParse(userId)
  if (!parsed.success) return { error: 'ID de usuario inválido' }

  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('admin_reset_password', {
    p_user_id: parsed.data,
    p_new_password: DEFAULT_PASSWORD,
  })

  if (error) return { error: error.message }
  if (data === false) return { error: 'Usuario no encontrado' }

  revalidatePath('/admin/usuarios')
  return { ok: true }
}

const updateRoleSchema = z.object({
  userId: z.string().uuid('ID de usuario inválido'),
  role: z.enum(['admin', 'manager', 'employee']),
})

export async function updateUserRole(
  userId: string,
  role: string
): Promise<ActionResult> {
  const denied = await requireAdmin()
  if (denied) return denied

  const parsed = updateRoleSchema.safeParse({ userId, role })
  if (!parsed.success) return { error: 'Datos inválidos' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('app_users')
    .update({ role: parsed.data.role })
    .eq('id', parsed.data.userId)

  if (error) return { error: error.message }

  revalidatePath('/admin/usuarios')
  return { ok: true }
}


const createUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(60)
    .regex(/^[a-z0-9._-]+$/, 'Solo minúsculas, números, punto, guion'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  role: z.enum(['admin', 'manager', 'employee']),
})

/**
 * Crea un nuevo usuario con contraseña por defecto (12345).
 * - admin: puede crear cualquier rol.
 * - manager: solo puede crear 'employee'.
 */
export async function createUser(input: {
  username: string
  email?: string
  role: string
}): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: 'No autenticado' }
  if (session.role !== 'admin' && session.role !== 'manager') {
    return { error: 'No autorizado' }
  }

  const parsed = createUserSchema.safeParse({
    username: input.username?.toLowerCase().trim(),
    email: input.email?.trim() ?? '',
    role: input.role,
  })
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Datos inválidos' }
  }

  // Un manager solo puede crear empleados
  if (session.role === 'manager' && parsed.data.role !== 'employee') {
    return { error: 'Un jefe solo puede crear empleados' }
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('create_app_user', {
    p_username: parsed.data.username,
    p_email: parsed.data.email ? parsed.data.email : null,
    p_role: parsed.data.role,
    p_password: DEFAULT_PASSWORD,
  })

  if (error) {
    if (error.message.includes('duplicate') || error.code === '23505') {
      return { error: 'El usuario ya existe' }
    }
    return { error: error.message }
  }
  if (data === false) return { error: 'El usuario ya existe' }

  revalidatePath('/admin/usuarios')
  return { ok: true }
}
