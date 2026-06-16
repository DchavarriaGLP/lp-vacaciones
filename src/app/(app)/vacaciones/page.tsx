import { getSession } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending:   'bg-yellow-900/60 text-yellow-300 border border-yellow-800',
    approved:  'bg-green-900/60 text-green-300 border border-green-800',
    rejected:  'bg-red-900/60 text-red-300 border border-red-800',
    draft:     'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700',
    cancelled: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700',
  }
  const labels: Record<string, string> = {
    pending:   'Pendiente',
    approved:  'Aprobada',
    rejected:  'Rechazada',
    draft:     'Borrador',
    cancelled: 'Cancelada',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-600 dark:text-gray-400'}`}>
      {labels[status] ?? status}
    </span>
  )
}

export default async function VacacionesPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const supabase = createAdminClient()

  const { data: employee } = await supabase
    .from('employees')
    .select('id, full_name, dias_pendientes')
    .eq('user_id', session.id)
    .single()

  const currentYear = new Date().getFullYear()
  const { data: balance } = employee
    ? await supabase
        .from('vacation_balances')
        .select('available_days, used_days, accrued_days')
        .eq('employee_id', employee.id)
        .eq('period_year', currentYear)
        .single()
    : { data: null }

  const { data: requests } = employee
    ? await supabase
        .from('vacation_requests')
        .select('id, start_date, end_date, business_days, calendar_days, status, reason, submitted_at, decision_notes, leave_types(name_es)')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false })
    : { data: [] }

  const availDays = balance?.available_days ?? employee?.dias_pendientes ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mis Vacaciones</h1>
          <p className="text-gray-500 dark:text-gray-600 dark:text-gray-400 text-sm mt-1">Historial de solicitudes</p>
        </div>
        <Link
          href="/vacaciones/nueva"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nueva solicitud
        </Link>
      </div>

      {/* Balance card */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide mb-1">Disponibles</p>
          <p className={`text-2xl font-bold ${Number(availDays) > 60 ? 'text-red-400' : Number(availDays) > 30 ? 'text-yellow-400' : 'text-green-400'}`}>
            {Number(availDays).toFixed(1)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-600">días</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide mb-1">Usados</p>
          <p className="text-2xl font-bold text-blue-400">{Number(balance?.used_days ?? 0).toFixed(1)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-600">días</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide mb-1">Total acumulado</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{Number(balance?.accrued_days ?? availDays).toFixed(1)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-600">días</p>
        </div>
      </div>

      {/* Requests table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        {!requests || requests.length === 0 ? (
          <div className="py-16 text-center">
            <svg className="w-12 h-12 text-gray-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            <p className="text-gray-500 dark:text-gray-500 text-sm">No tienes solicitudes de vacaciones</p>
            <Link href="/vacaciones/nueva" className="inline-block mt-3 text-indigo-400 hover:text-indigo-300 text-sm">
              Crear tu primera solicitud →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wide">Tipo</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wide">Fecha inicio</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wide">Fecha fin</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wide">Días</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wide">Enviada</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wide">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3.5 text-gray-900 dark:text-white">
                      {(req as { leave_types?: { name_es: string } | null }).leave_types?.name_es ?? 'Vacaciones Anuales'}
                    </td>
                    <td className="px-5 py-3.5 text-gray-300">{formatDate(req.start_date)}</td>
                    <td className="px-5 py-3.5 text-gray-300">{formatDate(req.end_date)}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-gray-900 dark:text-white">{req.business_days}</td>
                    <td className="px-5 py-3.5 text-gray-500 dark:text-gray-600 dark:text-gray-400 text-xs">{req.submitted_at ? formatDate(req.submitted_at) : '—'}</td>
                    <td className="px-5 py-3.5">
                      <div>
                        <StatusBadge status={req.status} />
                        {req.status === 'rejected' && req.decision_notes && (
                          <p className="text-xs text-red-400 mt-1">{req.decision_notes}</p>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
