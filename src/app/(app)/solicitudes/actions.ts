'use server'

/**
 * Server Actions de gestión de solicitudes (solo admin).
 * Permite cambiar el estado de una solicitud de vacaciones.
 */

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'

type ActionResult = { ok?: boolean; error?: string }

const schema = z.object({
  requestId: z.string().uuid('ID inválido'),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']),
  notes: z.string().max(500).optional(),
})

export async function setRequestStatus(
  requestId: string,
  status: string,
  notes?: string
): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { error: 'No autenticado' }
  if (session.role !== 'admin') return { error: 'No autorizado' }

  const parsed = schema.safeParse({ requestId, status, notes })
  if (!parsed.success) return { error: 'Datos inválidos' }

  const supabase = createAdminClient()

  const { data: before } = await supabase
    .from('vacation_requests')
    .select('id, company_id, status')
    .eq('id', parsed.data.requestId)
    .single()

  if (!before) return { error: 'Solicitud no encontrada' }

  const { error } = await supabase
    .from('vacation_requests')
    .update({
      status: parsed.data.status,
      decided_at: new Date().toISOString(),
      decided_by: session.id,
      decision_notes: parsed.data.notes ?? null,
    })
    .eq('id', parsed.data.requestId)

  if (error) return { error: error.message }

  await supabase.from('audit_logs').insert({
    company_id: before.company_id,
    actor_id: session.id,
    actor_email: session.username,
    action: 'update_status',
    entity_type: 'vacation_request',
    entity_id: before.id,
    before_state: { status: before.status },
    after_state: { status: parsed.data.status },
  })

  revalidatePath('/solicitudes')
  revalidatePath('/aprobaciones')
  return { ok: true }
}
