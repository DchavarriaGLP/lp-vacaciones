import { getSession } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { AprobacionesClient } from './AprobacionesClient'

export const dynamic = 'force-dynamic'

export default async function AprobacionesPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const supabase = createAdminClient()

  const role = session.role
  if (role === 'employee') redirect('/dashboard')

  // Get pending approval steps for this approver
  const { data: steps } = await supabase
    .from('approval_steps')
    .select(`
      id, step_order, decision, created_at,
      request_id,
      vacation_requests!inner(
        id, start_date, end_date, business_days, calendar_days,
        status, reason, short_notice, submitted_at, request_type, incapacidad_url,
        employees!inner(
          id, full_name, position, dias_pendientes,
          companies(name),
          projects(name)
        ),
        leave_types(name_es)
      )
    `)
    .eq('approver_id', session.id)
    .eq('decision', 'pending')
    .eq('vacation_requests.status', 'pending')
    .order('created_at', { ascending: false })

  // Also get all requests visible to admin
  let allRequests = null
  if (role === 'admin') {
    const { data } = await supabase
      .from('vacation_requests')
      .select(`
        id, start_date, end_date, business_days, status, submitted_at, short_notice, reason, request_type, incapacidad_url,
        employees(id, full_name, position, dias_pendientes, companies(name), projects(name)),
        leave_types(name_es),
        approval_steps(id, approver_id, decision, decided_at)
      `)
      .in('status', ['pending', 'approved', 'rejected'])
      .order('submitted_at', { ascending: false })
      .limit(50)
    allRequests = data
  }

  return (
    <AprobacionesClient
      pendingSteps={steps ?? []}
      allRequests={allRequests}
      role={role}
      userId={session.id}
    />
  )
}
