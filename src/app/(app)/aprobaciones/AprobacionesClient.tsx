'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { decideApproval } from '@/modules/vacations/actions'
import { cn } from '@/lib/utils'

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending:  'bg-yellow-900/60 text-yellow-300',
    approved: 'bg-green-900/60 text-green-300',
    rejected: 'bg-red-900/60 text-red-300',
  }
  const labels: Record<string, string> = {
    pending:  'Pendiente',
    approved: 'Aprobada',
    rejected: 'Rechazada',
  }
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', styles[status] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-600 dark:text-gray-400')}>
      {labels[status] ?? status}
    </span>
  )
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-PA', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

interface PendingStep {
  id: string
  request_id: string
  vacation_requests: {
    id: string
    start_date: string
    end_date: string
    business_days: number
    short_notice: boolean
    reason: string | null
    submitted_at: string | null
    employees: {
      full_name: string
      position: string | null
      dias_pendientes: number
      companies: { name: string } | null
      projects: { name: string } | null
    }
    leave_types: { name_es: string } | null
  }
}

interface Props {
  pendingSteps: PendingStep[]
  allRequests: unknown[] | null
  role: string
  userId: string
}

interface DecisionModalProps {
  stepId: string
  requestId: string
  employeeName: string
  onClose: () => void
  onDone: () => void
}

function DecisionModal({ stepId, requestId, employeeName, onClose, onDone }: DecisionModalProps) {
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!decision) return
    setLoading(true)
    setError(null)
    const result = await decideApproval({ requestId, stepId, decision, notes })
    if (!result.ok) {
      setError(typeof result.error === 'string' ? result.error : 'Error al procesar')
      setLoading(false)
      return
    }
    onDone()
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Decisión de aprobación</h3>
        <p className="text-sm text-gray-500 dark:text-gray-600 dark:text-gray-400 mb-5">{employeeName}</p>

        <div className="flex gap-3 mb-5">
          <button
            onClick={() => setDecision('approved')}
            className={cn(
              'flex-1 py-3 rounded-xl text-sm font-semibold border transition-colors',
              decision === 'approved'
                ? 'bg-green-700 border-green-600 text-gray-900 dark:text-white'
                : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-600 dark:text-gray-400 hover:border-green-700 hover:text-green-400'
            )}
          >
            Aprobar
          </button>
          <button
            onClick={() => setDecision('rejected')}
            className={cn(
              'flex-1 py-3 rounded-xl text-sm font-semibold border transition-colors',
              decision === 'rejected'
                ? 'bg-red-700 border-red-600 text-gray-900 dark:text-white'
                : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-600 dark:text-gray-400 hover:border-red-700 hover:text-red-400'
            )}
          >
            Rechazar
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Notas {decision === 'rejected' && <span className="text-red-400">*</span>}
            {decision === 'approved' && <span className="text-gray-500 dark:text-gray-500">(opcional)</span>}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={decision === 'rejected' ? 'Explica el motivo del rechazo...' : 'Comentarios adicionales...'}
            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder-gray-400 dark:placeholder-gray-600"
          />
        </div>

        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={!decision || loading || (decision === 'rejected' && !notes.trim())}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            {loading ? 'Procesando...' : 'Confirmar decisión'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700 rounded-lg hover:text-white transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

export function AprobacionesClient({ pendingSteps, allRequests, role }: Props) {
  const router = useRouter()
  const [activeModal, setActiveModal] = useState<{
    stepId: string
    requestId: string
    employeeName: string
  } | null>(null)
  const [, startTransition] = useTransition()

  function handleDone() {
    setActiveModal(null)
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Aprobaciones</h1>
        <p className="text-gray-500 dark:text-gray-600 dark:text-gray-400 text-sm mt-1">
          {pendingSteps.length > 0
            ? `${pendingSteps.length} solicitud${pendingSteps.length !== 1 ? 'es' : ''} pendiente${pendingSteps.length !== 1 ? 's' : ''}`
            : 'Sin solicitudes pendientes'}
        </p>
      </div>

      {/* Pending approvals */}
      {pendingSteps.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Pendientes de tu aprobación</h2>
          <div className="space-y-3">
            {pendingSteps.map((step) => {
              const req = step.vacation_requests
              const emp = req.employees
              return (
                <div
                  key={step.id}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 dark:text-white">{emp.full_name}</p>
                      {step.vacation_requests.short_notice && (
                        <span className="text-xs bg-orange-900/60 text-orange-300 px-2 py-0.5 rounded-full">Preaviso corto</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {emp.companies?.name ?? '—'} · {emp.projects?.name ?? '—'} · {emp.position ?? '—'}
                    </p>
                    <p className="text-sm text-gray-300">
                      {req.leave_types?.name_es ?? 'Vacaciones'} ·{' '}
                      <strong>{formatDate(req.start_date)} → {formatDate(req.end_date)}</strong> ·{' '}
                      <strong>{req.business_days} días hábiles</strong>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Saldo actual: <strong className={Number(emp.dias_pendientes) > 60 ? 'text-red-400' : 'text-gray-300'}>{Number(emp.dias_pendientes).toFixed(1)} días</strong>
                      {req.reason && ` · "${req.reason}"`}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveModal({ stepId: step.id, requestId: req.id, employeeName: emp.full_name })}
                    className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    Revisar
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {pendingSteps.length === 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl py-16 text-center">
          <svg className="w-12 h-12 text-gray-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-500">No tienes solicitudes pendientes de aprobación.</p>
        </div>
      )}

      {/* Admin: all requests */}
      {role === 'admin' && allRequests && allRequests.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Historial de solicitudes (admin)</h2>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">Empleado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">Empresa</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">Fechas</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">Días</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {(allRequests as Array<{
                    id: string
                    start_date: string
                    end_date: string
                    business_days: number
                    status: string
                    employees: { full_name: string; companies: { name: string } | null } | null
                  }>).map((req) => (
                    <tr key={req.id} className="hover:bg-gray-800/40">
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{req.employees?.full_name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-600 dark:text-gray-400 text-xs">{req.employees?.companies?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-300 text-xs">
                        {formatDate(req.start_date)} → {formatDate(req.end_date)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-white">{req.business_days}</td>
                      <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {activeModal && (
        <DecisionModal
          {...activeModal}
          onClose={() => setActiveModal(null)}
          onDone={handleDone}
        />
      )}
    </div>
  )
}
