import { getSession } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending:   'bg-yellow-900/60 text-yellow-300',
    approved:  'bg-green-900/60 text-green-300',
    rejected:  'bg-red-900/60 text-red-300',
    draft:     'bg-gray-800 text-gray-400',
    cancelled: 'bg-gray-800 text-gray-400',
  }
  const labels: Record<string, string> = {
    pending:   'Pendiente',
    approved:  'Aprobada',
    rejected:  'Rechazada',
    draft:     'Borrador',
    cancelled: 'Cancelada',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? 'bg-gray-800 text-gray-400'}`}>
      {labels[status] ?? status}
    </span>
  )
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function SolicitudesPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const supabase = createAdminClient()

  const { data: appUser } = await supabase.from('app_users').select('role').eq('id', session.id).single()
  if (appUser?.role !== 'admin') redirect('/dashboard')

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

  const counts = {
    pending:  requests?.filter((r) => r.status === 'pending').length ?? 0,
    approved: requests?.filter((r) => r.status === 'approved').length ?? 0,
    rejected: requests?.filter((r) => r.status === 'rejected').length ?? 0,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Todas las Solicitudes</h1>
        <p className="text-gray-400 text-sm mt-1">Vista completa · {requests?.length ?? 0} registros</p>
      </div>

      <div className="flex gap-4">
        <span className="text-sm text-yellow-400">{counts.pending} pendientes</span>
        <span className="text-sm text-green-400">{counts.approved} aprobadas</span>
        <span className="text-sm text-red-400">{counts.rejected} rechazadas</span>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Empleado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Empresa</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fechas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Días</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Enviada</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {!requests || requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">Sin solicitudes registradas.</td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-800/40">
                    <td className="px-4 py-3">
                      <p className="text-white">{(req as { employees?: { full_name: string } | null }).employees?.full_name ?? '—'}</p>
                      <p className="text-xs text-gray-500">{(req as { employees?: { position?: string | null } | null }).employees?.position ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {(req as { employees?: { companies?: { name: string } | null } | null }).employees?.companies?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs">
                      {(req as { leave_types?: { name_es: string } | null }).leave_types?.name_es ?? 'Vacaciones'}
                      {req.short_notice && (
                        <span className="ml-1 text-orange-400 text-xs">⚡</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs">
                      {formatDate(req.start_date)} → {formatDate(req.end_date)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-white">{req.business_days}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{req.submitted_at ? formatDate(req.submitted_at) : '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
