import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils'
import { saldoVacaciones } from '@/lib/domain/vacation-rules'

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: 'green' | 'yellow' | 'red' | 'blue' | 'indigo'
}) {
  const colors = {
    green:  'from-green-900/40 border-green-800/50 text-green-400',
    yellow: 'from-yellow-900/40 border-yellow-800/50 text-yellow-400',
    red:    'from-red-900/40 border-red-800/50 text-red-400',
    blue:   'from-blue-900/40 border-blue-800/50 text-blue-400',
    indigo: 'from-indigo-900/40 border-indigo-800/50 text-indigo-400',
  }
  const cls = accent ? colors[accent] : 'from-gray-800/40 border-gray-300 dark:border-gray-700/50 text-gray-300'
  return (
    <div className={`bg-gradient-to-br ${cls} border rounded-2xl p-5`}>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${accent ? '' : 'text-gray-900 dark:text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:  'bg-yellow-900 text-yellow-300',
    approved: 'bg-green-900 text-green-300',
    rejected: 'bg-red-900 text-red-300',
    draft:    'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-600 dark:text-gray-400',
    cancelled:'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-600 dark:text-gray-400',
  }
  const label: Record<string, string> = {
    pending:  'Pendiente',
    approved: 'Aprobada',
    rejected: 'Rechazada',
    draft:    'Borrador',
    cancelled:'Cancelada',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-600 dark:text-gray-400'}`}>
      {label[status] ?? status}
    </span>
  )
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const supabase = createAdminClient()

  // Get employee record
  const { data: employee } = await supabase
    .from('employees')
    .select('*, companies(name), projects(name)')
    .eq('user_id', session.id)
    .single()

  const role = session.role

  // Get current year balance
  const currentYear = new Date().getFullYear()
  const { data: balance } = await supabase
    .from('vacation_balances')
    .select('*')
    .eq('employee_id', employee?.id ?? '')
    .eq('period_year', currentYear)
    .single()

  // Get my vacation requests (last 5)
  const { data: myRequests } = employee
    ? await supabase
        .from('vacation_requests')
        .select('id, start_date, end_date, business_days, status, leave_types(name_es)')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false })
        .limit(5)
    : { data: [] }

  // For manager/admin: pending approvals count
  let pendingCount = 0
  let teamOnVacation = 0

  if (role === 'manager' || role === 'admin') {
    const { count } = await supabase
      .from('approval_steps')
      .select('*', { count: 'exact', head: true })
      .eq('approver_id', session.id)
      .eq('decision', 'pending')
    pendingCount = count ?? 0

    // Team currently on vacation
    const today = new Date().toISOString().slice(0, 10)
    const { count: vacCount } = await supabase
      .from('vacation_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .lte('start_date', today)
      .gte('end_date', today)
    teamOnVacation = vacCount ?? 0
  }

  const availDays = balance?.available_days
    ?? saldoVacaciones(
      (employee?.dias_base ?? null) as number | null,
      (employee?.fecha_base ?? null) as string | null,
      Number(employee?.dias_pendientes ?? 0)
    )
  const isOverLimit = Number(availDays) > 60
  const accentDays = Number(availDays) > 60 ? 'red' : Number(availDays) > 30 ? 'yellow' : 'green'

  // Upcoming approved vacations (for team)
  const today = new Date().toISOString().slice(0, 10)
  const { data: upcoming } = await supabase
    .from('vacation_requests')
    .select('id, start_date, end_date, business_days, employees(full_name)')
    .eq('status', 'approved')
    .gte('start_date', today)
    .order('start_date', { ascending: true })
    .limit(6)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Bienvenido{employee ? `, ${employee.full_name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-gray-500 dark:text-gray-600 dark:text-gray-400 text-sm mt-1">
          {(employee as { companies?: { name: string } } | null)?.companies?.name ?? ''}{' '}
          {(employee as { projects?: { name: string } } | null)?.projects?.name ? `· ${(employee as { projects?: { name: string } } | null)?.projects?.name}` : ''}
        </p>
      </div>

      {/* Alerta acumulación */}
      {isOverLimit && (
        <div className="flex items-start gap-3 bg-red-950 border border-red-800 rounded-xl px-5 py-4">
          <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-red-300">Alerta: Saldo superior a 60 días</p>
            <p className="text-xs text-red-400 mt-0.5">
              Tienes {Number(availDays).toFixed(1)} días acumulados. Por ley panameña (Art. 57), la acumulación máxima sin autorización de MITRADEL es de 60 días. Programa tus vacaciones pronto.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Días disponibles"
          value={Number(availDays).toFixed(1)}
          sub={`Período ${currentYear}`}
          accent={accentDays as 'green' | 'yellow' | 'red'}
        />
        <StatCard
          label="Días usados"
          value={Number(balance?.used_days ?? 0).toFixed(1)}
          sub={`Período ${currentYear}`}
          accent="blue"
        />
        {(role === 'manager' || role === 'admin') && (
          <>
            <StatCard
              label="Aprobaciones pendientes"
              value={pendingCount}
              sub="Requieren tu decisión"
              accent={pendingCount > 0 ? 'yellow' : 'indigo'}
            />
            <StatCard
              label="Equipo en vacaciones"
              value={teamOnVacation}
              sub="Hoy"
              accent="indigo"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mis solicitudes recientes */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Mis solicitudes recientes</h2>
            <Link href="/vacaciones" className="text-xs text-indigo-400 hover:text-indigo-300">
              Ver todas →
            </Link>
          </div>
          {!myRequests || myRequests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500 dark:text-gray-500">Sin solicitudes aún</p>
              <Link href="/vacaciones/nueva" className="inline-block mt-3 text-xs text-indigo-400 hover:text-indigo-300">
                + Crear solicitud
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {formatDate(req.start_date)} → {formatDate(req.end_date)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {(req as { leave_types?: { name_es: string } | null }).leave_types?.name_es ?? 'Vacaciones'} · {req.business_days} días hábiles
                    </p>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximas vacaciones del equipo */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Próximas vacaciones del equipo</h2>
          {!upcoming || upcoming.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-500 py-8 text-center">Sin vacaciones programadas</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((req) => (
                <div key={req.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {(req as { employees?: { full_name: string } | null }).employees?.full_name ?? '—'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {formatDate(req.start_date)} → {formatDate(req.end_date)} · {req.business_days}d
                    </p>
                  </div>
                  <span className="text-xs text-green-400 bg-green-900/40 px-2 py-0.5 rounded-full">Aprobado</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/vacaciones/nueva"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nueva solicitud
        </Link>
        {(role === 'manager' || role === 'admin') && pendingCount > 0 && (
          <Link
            href="/aprobaciones"
            className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-gray-900 dark:text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            Revisar {pendingCount} aprobación{pendingCount !== 1 ? 'es' : ''}
          </Link>
        )}
      </div>
    </div>
  )
}
