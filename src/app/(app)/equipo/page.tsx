import { getSession } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { saldoVacaciones } from '@/lib/domain/vacation-rules'

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const dynamic = 'force-dynamic'

export default async function EquipoPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const supabase = createAdminClient()

  const { data: appUser } = await supabase.from('app_users').select('role').eq('id', session.id).single()
  const role = appUser?.role ?? 'employee'
  if (role === 'employee') redirect('/dashboard')

  const { data: employee } = await supabase.from('employees').select('id, full_name, company_id').eq('user_id', session.id).single()

  // Team members: employees who have this person as jefe_directo
  const { data: directReports } = employee
    ? await supabase
        .from('employees')
        .select('id, full_name, position, hire_date, dias_pendientes, dias_base, fecha_base, status, email')
        .eq('manager_id', employee.id)
        .eq('status', 'active')
        .order('full_name')
    : { data: [] }

  // Current vacations (approved + today within range)
  const today = new Date().toISOString().slice(0, 10)
  const { data: onVacation } = await supabase
    .from('vacation_requests')
    .select('id, start_date, end_date, business_days, employees(full_name)')
    .eq('status', 'approved')
    .lte('start_date', today)
    .gte('end_date', today)

  // Upcoming (next 30 days)
  const future = new Date()
  future.setDate(future.getDate() + 30)
  const { data: upcoming } = await supabase
    .from('vacation_requests')
    .select('id, start_date, end_date, business_days, employees(full_name)')
    .eq('status', 'approved')
    .gt('start_date', today)
    .lte('start_date', future.toISOString().slice(0, 10))
    .order('start_date')
    .limit(10)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mi Equipo</h1>
        <p className="text-gray-500 dark:text-gray-600 dark:text-gray-400 text-sm mt-1">
          {directReports?.length ?? 0} reporte{(directReports?.length ?? 0) !== 1 ? 's' : ''} directo{(directReports?.length ?? 0) !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Currently on vacation */}
      {onVacation && onVacation.length > 0 && (
        <div className="bg-blue-950/40 border border-blue-800/50 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-blue-300 mb-3">En vacaciones hoy ({onVacation.length})</h2>
          <div className="space-y-2">
            {onVacation.map((r) => (
              <div key={r.id} className="flex justify-between items-center">
                <p className="text-sm text-gray-900 dark:text-white">{(r as { employees?: { full_name: string } | null }).employees?.full_name ?? '—'}</p>
                <p className="text-xs text-blue-400">{formatDate(r.start_date)} → {formatDate(r.end_date)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Direct reports */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Reportes directos</h2>
        </div>
        {!directReports || directReports.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-500 p-8 text-center">
            No se encontraron reportes directos. El sistema vincula jefes a través del campo &ldquo;jefe_directo&rdquo;.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">Nombre</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">Cargo</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">Ingreso</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {directReports.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-800/40">
                    <td className="px-5 py-3.5">
                      <p className="text-gray-900 dark:text-white font-medium">{emp.full_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">{emp.email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 dark:text-gray-600 dark:text-gray-400 text-xs">{emp.position ?? '—'}</td>
                    <td className="px-5 py-3.5 text-gray-500 dark:text-gray-600 dark:text-gray-400 text-xs">{formatDate(emp.hire_date)}</td>
                    <td className="px-5 py-3.5 text-right">
                      {(() => {
                        const saldo = saldoVacaciones(emp.dias_base, emp.fecha_base, Number(emp.dias_pendientes))
                        return (
                          <span className={saldo > 60 ? 'text-red-400 font-bold' : saldo > 30 ? 'text-yellow-400' : 'text-green-400'}>
                            {saldo.toFixed(1)}
                          </span>
                        )
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upcoming vacations */}
      {upcoming && upcoming.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Próximas vacaciones (30 días)</h2>
          <div className="space-y-3">
            {upcoming.map((r) => (
              <div key={r.id} className="flex justify-between items-center">
                <p className="text-sm text-gray-900 dark:text-white">{(r as { employees?: { full_name: string } | null }).employees?.full_name ?? '—'}</p>
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-600 dark:text-gray-400">{formatDate(r.start_date)} → {formatDate(r.end_date)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-600">{r.business_days} días hábiles</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
