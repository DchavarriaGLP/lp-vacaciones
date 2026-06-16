import { getSession } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { VacationRequestFormClient } from './VacationRequestFormClient'

export default async function NuevaVacacionPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const supabase = createAdminClient()

  const { data: employee } = await supabase
    .from('employees')
    .select('id, full_name, dias_pendientes, hire_date, company_id')
    .eq('user_id', session.id)
    .single()

  if (!employee) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 dark:text-gray-600 dark:text-gray-400">No se encontró tu perfil de empleado. Contacta a RRHH.</p>
      </div>
    )
  }

  const currentYear = new Date().getFullYear()
  const { data: balance } = await supabase
    .from('vacation_balances')
    .select('available_days, used_days, accrued_days, policy_id')
    .eq('employee_id', employee.id)
    .eq('period_year', currentYear)
    .single()

  const { data: policy } = balance?.policy_id
    ? await supabase
        .from('vacation_policies')
        .select('*')
        .eq('id', balance.policy_id)
        .single()
    : await supabase
        .from('vacation_policies')
        .select('*')
        .eq('is_default', true)
        .single()

  const { data: leaveTypes } = await supabase
    .from('leave_types')
    .select('id, name_es, code, is_paid, requires_document, max_days_per_year, affects_balance')
    .eq('active', true)
    .order('name_es')

  const availDays = balance?.available_days ?? employee.dias_pendientes ?? 0

  return (
    <VacationRequestFormClient
      employee={employee}
      balance={{
        available_days: Number(availDays),
        used_days: Number(balance?.used_days ?? 0),
        accrued_days: Number(balance?.accrued_days ?? availDays),
      }}
      policy={policy}
      leaveTypes={leaveTypes ?? []}
    />
  )
}
