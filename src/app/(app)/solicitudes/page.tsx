import { getSession } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { SolicitudesClient } from './SolicitudesClient'

export const dynamic = 'force-dynamic'

export default async function SolicitudesPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/dashboard')

  const supabase = createAdminClient()

  const { data: requests } = await supabase
    .from('vacation_requests')
    .select(`
      id, start_date, end_date, business_days, status,
      submitted_at, short_notice, decision_notes,
      employees(full_name, position, companies(name), projects(name)),
      leave_types(name_es)
    `)
    .order('submitted_at', { ascending: false })
    .limit(200)

  type Row = {
    id: string; start_date: string; end_date: string; business_days: number
    status: string; submitted_at: string | null; short_notice: boolean
    decision_notes: string | null
    employees?: { full_name?: string; position?: string | null; companies?: { name?: string } | null } | null
    leave_types?: { name_es?: string } | null
  }

  const initial = ((requests ?? []) as Row[]).map((r) => ({
    id: r.id,
    start_date: r.start_date,
    end_date: r.end_date,
    business_days: r.business_days,
    status: r.status,
    submitted_at: r.submitted_at,
    short_notice: r.short_notice,
    decision_notes: r.decision_notes,
    employee_name: r.employees?.full_name ?? '—',
    employee_position: r.employees?.position ?? '',
    company_name: r.employees?.companies?.name ?? '—',
    leave_type: r.leave_types?.name_es ?? 'Vacaciones',
  }))

  return <SolicitudesClient initial={initial} />
}
