'use server'

/**
 * Server Actions del módulo de empleados.
 * Solo accesibles para administradores.
 */

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'

type ActionResult = { ok?: boolean; error?: string }

async function requireAdmin() {
  const session = await getSession()
  if (!session) return { session: null, denied: { error: 'No autenticado' } as ActionResult }
  if (session.role !== 'admin') return { session, denied: { error: 'No autorizado' } as ActionResult }
  return { session, denied: null }
}

const updateDaysSchema = z.object({
  employeeId: z.string().uuid('ID inválido'),
  dias: z.number().min(0, 'No puede ser negativo').max(365, 'Valor demasiado alto'),
})

/** Actualiza los días pendientes (saldo de vacaciones) de un empleado. */
export async function updateEmployeeDays(
  employeeId: string,
  dias: number
): Promise<ActionResult> {
  const { session, denied } = await requireAdmin()
  if (denied) return denied

  const parsed = updateDaysSchema.safeParse({ employeeId, dias })
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Datos inválidos' }
  }

  const supabase = createAdminClient()

  // Estado anterior para auditoría
  const { data: before } = await supabase
    .from('employees')
    .select('id, company_id, dias_pendientes')
    .eq('id', parsed.data.employeeId)
    .single()

  if (!before) return { error: 'Empleado no encontrado' }

  const { error } = await supabase
    .from('employees')
    .update({ dias_pendientes: parsed.data.dias })
    .eq('id', parsed.data.employeeId)

  if (error) return { error: error.message }

  // Auditoría (best-effort)
  await supabase.from('audit_logs').insert({
    company_id: before.company_id,
    actor_id: session!.id,
    actor_email: session!.username,
    action: 'update',
    entity_type: 'employee_balance',
    entity_id: before.id,
    before_state: { dias_pendientes: before.dias_pendientes },
    after_state: { dias_pendientes: parsed.data.dias },
  })

  revalidatePath('/empleados')
  revalidatePath('/dashboard')
  return { ok: true }
}
