'use client'

import { useState, useMemo, useTransition } from 'react'
import { updateEmployeeDays } from './actions'
import { cn } from '@/lib/utils'
import { saldoVacaciones } from '@/lib/domain/vacation-rules'

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    admin:    'bg-purple-900/60 text-purple-300',
    manager:  'bg-blue-900/60 text-blue-300',
    employee: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-600 dark:text-gray-400',
  }
  const labels: Record<string, string> = {
    admin: 'Admin', manager: 'Gerente', employee: 'Empleado',
  }
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', styles[role] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-600 dark:text-gray-400')}>{labels[role] ?? role}</span>
}

function StatusDot({ status }: { status: string }) {
  return (
    <span className={cn(
      'inline-block w-2 h-2 rounded-full mr-1.5',
      status === 'active' ? 'bg-green-400' :
      status === 'inactive' ? 'bg-gray-600' :
      status === 'on_vacation' ? 'bg-blue-400' : 'bg-yellow-400'
    )} />
  )
}

interface Employee {
  id: string
  employee_code: string
  cedula: string | null
  full_name: string
  position: string | null
  email: string
  username: string
  hire_date: string
  dias_pendientes: number
  dias_base: number | null
  fecha_base: string | null
  dias_enfermedad: number
  status: string
  role: string
  jefe_directo: string | null
  companies: { id: string; name: string } | null
  projects: { id: string; name: string } | null
}

interface Company {
  id: string
  name: string
}

interface Project {
  id: string
  name: string
  company_id: string
}

interface Props {
  employees: Employee[]
  companies: Company[]
  projects: Project[]
  currentUserRole: string
}

interface ProfileModalProps {
  employee: Employee
  onClose: () => void
  canEdit?: boolean
  onSaved?: (id: string, dias: number) => void
}

function ProfileModal({ employee, onClose, canEdit, onSaved }: ProfileModalProps) {
  const dias = saldoVacaciones(employee.dias_base, employee.fecha_base, Number(employee.dias_pendientes))
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(dias.toFixed(1))
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function save() {
    const num = parseFloat(value)
    if (Number.isNaN(num) || num < 0) { setMsg('Valor inválido'); return }
    startTransition(async () => {
      const res = await updateEmployeeDays(employee.id, num)
      if (res.error) { setMsg(res.error) }
      else { setMsg('Guardado'); setEditing(false); onSaved?.(employee.id, num) }
      setTimeout(() => setMsg(null), 2500)
    })
  }
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 pt-16 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{employee.full_name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-600 dark:text-gray-400">{employee.position ?? '—'}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-500 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {dias > 60 && (
          <div className="mb-4 flex gap-2 bg-red-950 border border-red-800 rounded-lg px-3 py-2.5">
            <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <p className="text-xs text-red-300">Saldo de {dias.toFixed(1)} días supera el límite de 60 días permitido por ley (Art. 57 Cód. de Trabajo).</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500">Código</p>
            <p className="text-gray-900 dark:text-white font-mono">{employee.employee_code}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500">Estado</p>
            <div className="flex items-center">
              <StatusDot status={employee.status} />
              <p className="text-gray-900 dark:text-white capitalize">{employee.status}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500">Empresa</p>
            <p className="text-gray-900 dark:text-white">{employee.companies?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500">Proyecto</p>
            <p className="text-gray-900 dark:text-white">{employee.projects?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500">Email</p>
            <p className="text-gray-900 dark:text-white text-xs break-all">{employee.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500">Usuario</p>
            <p className="text-gray-900 dark:text-white">{employee.username}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500">Fecha de ingreso</p>
            <p className="text-gray-900 dark:text-white">{formatDate(employee.hire_date)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500">Jefe directo</p>
            <p className="text-gray-900 dark:text-white">{employee.jefe_directo || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500">Saldo vacaciones</p>
            {editing ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number" step="0.1" min="0"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-24 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button onClick={save} disabled={isPending} className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-2.5 py-1 rounded-lg">Guardar</button>
                <button onClick={() => { setEditing(false); setValue(dias.toFixed(1)) }} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Cancelar</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className={cn('text-xl font-bold', dias > 60 ? 'text-red-400' : dias > 30 ? 'text-yellow-400' : 'text-green-400')}>
                  {dias.toFixed(1)} días
                </p>
                {canEdit && (
                  <button onClick={() => setEditing(true)} className="text-xs text-indigo-400 hover:text-indigo-300">Editar</button>
                )}
              </div>
            )}
            {msg && <p className={cn('text-xs mt-1', msg === 'Guardado' ? 'text-green-400' : 'text-red-400')}>{msg}</p>}
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500">Días de enfermedad disponibles</p>
            <p className="text-xl font-bold text-sky-400">
              {Number(employee.dias_enfermedad ?? 0).toFixed(1)} días
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-600">Art. 200 C.T. (18 días/año)</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500">Rol</p>
            <RoleBadge role={employee.role} />
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-800">
          <button onClick={onClose} className="w-full py-2.5 text-sm text-gray-500 dark:text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700 rounded-lg hover:text-white transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export function EmpleadosClient({ employees: initialEmployees, companies, projects, currentUserRole }: Props) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees)
  const isAdmin = currentUserRole === 'admin'
  const [search, setSearch] = useState('')
  const [filterCompany, setFilterCompany] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

  function handleSaved(id: string, dias: number) {
    const today = new Date().toISOString().slice(0, 10)
    setEmployees((prev) => prev.map((e) => e.id === id ? { ...e, dias_pendientes: dias, dias_base: dias, fecha_base: today } : e))
    setSelectedEmployee((prev) => prev && prev.id === id ? { ...prev, dias_pendientes: dias, dias_base: dias, fecha_base: today } : prev)
  }

  function exportCSV() {
    const esc = (val: unknown) => {
      const str = val === null || val === undefined ? '' : String(val)
      if (/[",\n;]/.test(str)) return '"' + str.replace(/"/g, '""') + '"'
      return str
    }
    const statusLabels: Record<string, string> = {
      active: 'Activo', inactive: 'Inactivo', on_vacation: 'En vacaciones',
      on_leave: 'En licencia', terminated: 'Terminado',
    }
    const roleLabels: Record<string, string> = {
      admin: 'Admin', manager: 'Gerente', employee: 'Empleado',
    }
    const headers = [
      'Código', 'Nombre', 'Cédula', 'Cargo', 'Empresa', 'Proyecto',
      'Fecha ingreso', 'Días vacaciones', 'Días enfermedad', 'Estado', 'Rol',
    ]
    const rows = employees.map((e) => [
      e.employee_code,
      e.full_name,
      e.cedula ?? '',
      e.position ?? '',
      e.companies?.name ?? '',
      e.projects?.name ?? '',
      e.hire_date ?? '',
      saldoVacaciones(e.dias_base, e.fecha_base, Number(e.dias_pendientes ?? 0)).toFixed(1),
      Number(e.dias_enfermedad ?? 0).toFixed(1),
      statusLabels[e.status] ?? e.status,
      roleLabels[e.role] ?? e.role,
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map(esc).join(','))
      .join('\r\n')
    // BOM para que Excel respete los acentos.
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const today = new Date().toISOString().slice(0, 10)
    const a = document.createElement('a')
    a.href = url
    a.download = `empleados_${today}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const activeEmployees = useMemo(() =>
    employees.filter((e) => e.status === 'active' || e.status === 'on_vacation' || e.status === 'on_leave'),
    [employees]
  )

  const inactiveEmployees = useMemo(() =>
    employees.filter((e) => e.status === 'inactive' || e.status === 'terminated'),
    [employees]
  )

  const filteredActive = useMemo(() => {
    let list = activeEmployees
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((e) =>
        e.full_name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.username.toLowerCase().includes(q) ||
        (e.position ?? '').toLowerCase().includes(q)
      )
    }
    if (filterCompany) list = list.filter((e) => e.companies?.id === filterCompany)
    if (filterProject) list = list.filter((e) => e.projects?.id === filterProject)
    return list
  }, [activeEmployees, search, filterCompany, filterProject])

  const filteredProjects = filterCompany
    ? projects.filter((p) => p.company_id === filterCompany)
    : projects

  const overLimit = filteredActive.filter((e) => saldoVacaciones(e.dias_base, e.fecha_base, Number(e.dias_pendientes)) > 60).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Empleados</h1>
          <p className="text-gray-500 dark:text-gray-600 dark:text-gray-400 text-sm mt-1">
            {filteredActive.length} activos · {inactiveEmployees.length} inactivos
            {overLimit > 0 && (
              <span className="ml-2 text-red-400 font-medium">· {overLimit} con saldo &gt;60 días</span>
            )}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={exportCSV}
            className="shrink-0 inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Exportar reporte (CSV)
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-48">
          <input
            type="text"
            placeholder="Buscar por nombre, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400 dark:placeholder-gray-600"
          />
        </div>
        <select
          value={filterCompany}
          onChange={(e) => { setFilterCompany(e.target.value); setFilterProject('') }}
          className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todas las empresas</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos los proyectos</option>
          {filteredProjects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Active employees table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">Cargo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">Empresa</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">Ingreso</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">Saldo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">Rol</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredActive.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500 dark:text-gray-500 text-sm">
                    No se encontraron empleados con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredActive.map((emp) => {
                  const dias = saldoVacaciones(emp.dias_base, emp.fecha_base, Number(emp.dias_pendientes))
                  const overMax = dias > 60
                  return (
                    <tr
                      key={emp.id}
                      className={cn(
                        'hover:bg-gray-800/50 transition-colors cursor-pointer',
                        overMax ? 'bg-red-950/20' : ''
                      )}
                      onClick={() => setSelectedEmployee(emp)}
                    >
                      <td className="px-4 py-3 font-mono text-gray-500 dark:text-gray-500 text-xs">{emp.employee_code}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StatusDot status={emp.status} />
                          <span className="text-gray-900 dark:text-white font-medium">{emp.full_name}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-500 ml-3.5">{emp.email}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-600 dark:text-gray-400 text-xs">{emp.position ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-600 dark:text-gray-400 text-xs">{emp.companies?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-600 dark:text-gray-400 text-xs">{formatDate(emp.hire_date)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn(
                          'font-bold font-mono',
                          overMax ? 'text-red-400' : dias > 30 ? 'text-yellow-400' : 'text-green-400'
                        )}>
                          {dias.toFixed(1)}
                        </span>
                        {overMax && (
                          <span className="ml-1 text-red-500 text-xs" title="Supera límite MITRADEL">⚠</span>
                        )}
                      </td>
                      <td className="px-4 py-3"><RoleBadge role={emp.role} /></td>
                      <td className="px-4 py-3">
                        <button className="text-xs text-indigo-400 hover:text-indigo-300">Ver</button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inactive employees */}
      <div>
        <button
          onClick={() => setShowInactive(!showInactive)}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <svg className={cn('w-4 h-4 transition-transform', showInactive ? 'rotate-90' : '')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
          Empleados inactivos ({inactiveEmployees.length})
        </button>

        {showInactive && (
          <div className="mt-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">Nombre</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">Cargo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">Empresa</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase">Saldo pendiente</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {inactiveEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-800/40 opacity-60 cursor-pointer" onClick={() => setSelectedEmployee(emp)}>
                      <td className="px-4 py-3 text-gray-300">{emp.full_name}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-500 text-xs">{emp.position ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-500 text-xs">{emp.companies?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-500 dark:text-gray-600 dark:text-gray-400">{saldoVacaciones(emp.dias_base, emp.fecha_base, Number(emp.dias_pendientes)).toFixed(1)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-600">Inactivo</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {selectedEmployee && (
        <ProfileModal employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} canEdit={isAdmin} onSaved={handleSaved} />
      )}
    </div>
  )
}
