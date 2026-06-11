import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function RiskBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const styles = {
    high:   'bg-red-900/60 text-red-300 border border-red-800',
    medium: 'bg-yellow-900/60 text-yellow-300 border border-yellow-800',
    low:    'bg-green-900/60 text-green-300 border border-green-800',
  }
  const labels = { high: 'Alto', medium: 'Medio', low: 'Bajo' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[level]}`}>
      {labels[level]}
    </span>
  )
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function RiesgoLegalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: appUser } = await supabase.from('app_users').select('role').eq('id', user.id).single()
  if (appUser?.role !== 'admin') redirect('/dashboard')

  // Employees with > 60 days balance (High risk: MITRADEL)
  const { data: highRisk } = await supabase
    .from('employees')
    .select('id, full_name, position, dias_pendientes, hire_date, companies(name), projects(name)')
    .gt('dias_pendientes', 60)
    .in('status', ['active', 'on_vacation', 'on_leave'])
    .order('dias_pendientes', { ascending: false })

  // Employees with 45-60 days (Medium risk: approaching limit)
  const { data: mediumRisk } = await supabase
    .from('employees')
    .select('id, full_name, position, dias_pendientes, hire_date, companies(name), projects(name)')
    .gte('dias_pendientes', 45)
    .lte('dias_pendientes', 60)
    .in('status', ['active', 'on_vacation', 'on_leave'])
    .order('dias_pendientes', { ascending: false })

  // Pending requests older than 10 days (approval risk)
  const tenDaysAgo = new Date()
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)
  const { data: stalePending } = await supabase
    .from('vacation_requests')
    .select('id, start_date, business_days, submitted_at, employees(full_name, companies(name))')
    .eq('status', 'pending')
    .lt('submitted_at', tenDaysAgo.toISOString())
    .order('submitted_at', { ascending: true })

  const highCount = highRisk?.length ?? 0
  const medCount = mediumRisk?.length ?? 0
  const staleCount = stalePending?.length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Riesgo Legal</h1>
        <p className="text-gray-400 text-sm mt-1">Alertas de cumplimiento con el Código de Trabajo de Panamá</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-red-950/40 border border-red-800/50 rounded-2xl p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Alto Riesgo</p>
          <p className="text-3xl font-bold text-red-400">{highCount}</p>
          <p className="text-xs text-gray-500 mt-1">Empleados &gt;60 días (MITRADEL)</p>
        </div>
        <div className="bg-yellow-950/40 border border-yellow-800/50 rounded-2xl p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Riesgo Medio</p>
          <p className="text-3xl font-bold text-yellow-400">{medCount}</p>
          <p className="text-xs text-gray-500 mt-1">Empleados 45-60 días</p>
        </div>
        <div className="bg-orange-950/40 border border-orange-800/50 rounded-2xl p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Aprobaciones Tardías</p>
          <p className="text-3xl font-bold text-orange-400">{staleCount}</p>
          <p className="text-xs text-gray-500 mt-1">Pendientes &gt;10 días</p>
        </div>
      </div>

      {/* Legal framework reminder */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Marco Legal — Código de Trabajo de Panamá</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-400">
          <p><span className="text-white font-medium">Art. 51:</span> 30 días de vacaciones por cada 11 meses trabajados (tasa: 2.7272 días/mes).</p>
          <p><span className="text-white font-medium">Art. 54:</span> El pago de vacaciones debe hacerse 3 días antes del inicio.</p>
          <p><span className="text-white font-medium">Art. 55:</span> Las vacaciones son continuas; fraccionamiento solo por convención colectiva.</p>
          <p><span className="text-white font-medium">Art. 56:</span> El empleado debe avisar con 60 días de anticipación.</p>
          <p><span className="text-white font-medium">Art. 57:</span> Acumulación máxima de 2 períodos (60 días); exceso requiere autorización de MITRADEL.</p>
        </div>
      </div>

      {/* High risk table */}
      {highCount > 0 && (
        <div className="bg-gray-900 border border-red-900/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
            <RiskBadge level="high" />
            <h2 className="text-sm font-semibold text-white">Empleados con saldo superior a 60 días</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Empleado</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Empresa</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Ingreso</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Saldo</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Exceso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {highRisk?.map((emp) => {
                  const dias = Number(emp.dias_pendientes)
                  const excess = dias - 60
                  return (
                    <tr key={emp.id} className="hover:bg-red-950/20">
                      <td className="px-5 py-3.5">
                        <p className="text-white font-medium">{emp.full_name}</p>
                        <p className="text-xs text-gray-500">{emp.position ?? '—'}</p>
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">
                        {(emp as { companies?: { name: string } | null }).companies?.name ?? '—'}
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">{formatDate(emp.hire_date)}</td>
                      <td className="px-5 py-3.5 text-right font-bold font-mono text-red-400">{dias.toFixed(1)}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-red-300 text-xs">+{excess.toFixed(1)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Medium risk */}
      {medCount > 0 && (
        <div className="bg-gray-900 border border-yellow-900/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
            <RiskBadge level="medium" />
            <h2 className="text-sm font-semibold text-white">Empleados con saldo entre 45-60 días</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Empleado</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Empresa</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {mediumRisk?.map((emp) => (
                  <tr key={emp.id} className="hover:bg-yellow-950/20">
                    <td className="px-5 py-3.5">
                      <p className="text-white">{emp.full_name}</p>
                      <p className="text-xs text-gray-500">{emp.position ?? '—'}</p>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">
                      {(emp as { companies?: { name: string } | null }).companies?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold font-mono text-yellow-400">
                      {Number(emp.dias_pendientes).toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stale pending */}
      {staleCount > 0 && (
        <div className="bg-gray-900 border border-orange-900/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-white">Solicitudes pendientes sin respuesta (&gt;10 días)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Empleado</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Fecha solicitud</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Inicio solicitado</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Días</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {stalePending?.map((req) => (
                  <tr key={req.id} className="hover:bg-orange-950/20">
                    <td className="px-5 py-3.5 text-white">
                      {(req as { employees?: { full_name: string; companies?: { name: string } | null } | null }).employees?.full_name ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-orange-400 text-xs">{req.submitted_at ? formatDate(req.submitted_at) : '—'}</td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">{formatDate(req.start_date)}</td>
                    <td className="px-5 py-3.5 text-right text-white">{req.business_days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {highCount === 0 && medCount === 0 && staleCount === 0 && (
        <div className="bg-green-950/40 border border-green-800/50 rounded-2xl py-12 text-center">
          <svg className="w-12 h-12 text-green-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
          </svg>
          <p className="text-green-400 font-medium">Sin alertas de riesgo legal activas</p>
          <p className="text-xs text-gray-500 mt-1">Todos los empleados están dentro de los límites permitidos por ley.</p>
        </div>
      )}
    </div>
  )
}
