'use client'

import { useState, useTransition } from 'react'
import { setRequestStatus } from './actions'

type Req = {
  id: string
  start_date: string
  end_date: string
  business_days: number
  status: string
  submitted_at: string | null
  short_notice: boolean
  decision_notes: string | null
  employee_name: string
  employee_position: string
  company_name: string
  leave_type: string
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-900/60 text-yellow-300',
    approved: 'bg-green-900/60 text-green-300',
    rejected: 'bg-red-900/60 text-red-300',
    draft: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-600 dark:text-gray-400',
    cancelled: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-600 dark:text-gray-400',
  }
  const labels: Record<string, string> = {
    pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada',
    draft: 'Borrador', cancelled: 'Cancelada',
  }
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-600 dark:text-gray-400'}`}>{labels[status] ?? status}</span>
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function SolicitudesClient({ initial }: { initial: Req[] }) {
  const [requests, setRequests] = useState<Req[]>(initial)
  const [filter, setFilter] = useState<string>('all')
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null)

  const counts = {
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  }

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter)

  function changeStatus(id: string, status: string) {
    const labels: Record<string, string> = { approved: 'aprobar', rejected: 'rechazar', cancelled: 'cancelar' }
    if (!confirm(`¿Seguro que deseas ${labels[status] ?? status} esta solicitud?`)) return
    startTransition(async () => {
      const res = await setRequestStatus(id, status)
      if (res.error) {
        setMsg({ id, text: res.error, ok: false })
      } else {
        setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status } : r))
        setMsg({ id, text: 'Actualizada', ok: true })
      }
      setTimeout(() => setMsg(null), 2500)
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Todas las Solicitudes</h1>
        <p className="text-gray-500 dark:text-gray-600 dark:text-gray-400 text-sm mt-1">Vista completa · {requests.length} registros</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { k: 'all', label: `Todas (${requests.length})` },
          { k: 'pending', label: `Pendientes (${counts.pending})` },
          { k: 'approved', label: `Aprobadas (${counts.approved})` },
          { k: 'rejected', label: `Rechazadas (${counts.rejected})` },
        ].map((f) => (
          <button key={f.k} onClick={() => setFilter(f.k)}
            className={`text-xs px-3 py-1.5 rounded-lg border ${filter === f.k ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">Empleado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">Empresa</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">Fechas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">Días</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500 dark:text-gray-500">Sin solicitudes.</td></tr>
              ) : (
                filtered.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-800/40">
                    <td className="px-4 py-3">
                      <p className="text-gray-900 dark:text-white">{req.employee_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">{req.employee_position}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-600 dark:text-gray-400 text-xs">{req.company_name}</td>
                    <td className="px-4 py-3 text-gray-300 text-xs">{req.leave_type}{req.short_notice && <span className="ml-1 text-orange-400">⚡</span>}</td>
                    <td className="px-4 py-3 text-gray-300 text-xs">{formatDate(req.start_date)} → {formatDate(req.end_date)}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-white">{req.business_days}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={req.status} />
                      {msg?.id === req.id && <span className={`ml-2 text-xs ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</span>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {req.status !== 'approved' && (
                        <button onClick={() => changeStatus(req.id, 'approved')} disabled={isPending} className="text-xs text-green-400 hover:text-green-300 disabled:opacity-40 mr-2">Aprobar</button>
                      )}
                      {req.status !== 'rejected' && (
                        <button onClick={() => changeStatus(req.id, 'rejected')} disabled={isPending} className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40 mr-2">Rechazar</button>
                      )}
                      {req.status !== 'cancelled' && (
                        <button onClick={() => changeStatus(req.id, 'cancelled')} disabled={isPending} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-40">Cancelar</button>
                      )}
                    </td>
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
