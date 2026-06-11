'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { submitVacationRequest } from '@/modules/vacations/actions'
import { cn } from '@/lib/utils'

const formSchema = z.object({
  leaveTypeId: z.string().min(1, 'Selecciona un tipo de licencia'),
  startDate: z.string().min(1, 'Selecciona fecha de inicio'),
  endDate: z.string().min(1, 'Selecciona fecha de fin'),
  reason: z.string().max(500).optional(),
  fractionIndex: z.number().int().min(1).max(2).default(1),
  fractionTotal: z.number().int().min(1).max(2).default(1),
  shortNoticeAck: z.boolean().default(false),
})

type FormValues = z.infer<typeof formSchema>

interface Employee {
  id: string
  full_name: string
  dias_pendientes: number
  hire_date: string
  company_id: string
}

interface Balance {
  available_days: number
  used_days: number
  accrued_days: number
}

interface Policy {
  id: string
  advance_notice_days: number
  payment_lead_days: number
  max_accumulated_days: number
  allow_fraction: boolean
  max_fractions: number
}

interface LeaveType {
  id: string
  name_es: string
  code: string
  is_paid: boolean
  requires_document: boolean
  max_days_per_year: number | null
  affects_balance: boolean
}

interface Props {
  employee: Employee
  balance: Balance
  policy: Policy | null
  leaveTypes: LeaveType[]
}

function diffBusinessDays(start: string, end: string): number {
  if (!start || !end) return 0
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  if (e < s) return 0
  let count = 0
  const cur = new Date(s)
  while (cur <= e) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function isShortNotice(startDate: string, advanceDays: number): boolean {
  if (!startDate) return false
  const today = new Date()
  const start = new Date(startDate + 'T00:00:00')
  const diff = Math.floor((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diff < advanceDays
}

function paymentDate(startDate: string, leadDays: number): string {
  if (!startDate) return ''
  const d = new Date(startDate + 'T00:00:00')
  d.setDate(d.getDate() - leadDays)
  return d.toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function VacationRequestFormClient({ employee, balance, policy, leaveTypes }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [serverErrors, setServerErrors] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fractionIndex: 1,
      fractionTotal: 1,
      shortNoticeAck: false,
    },
  })

  const startDate = watch('startDate')
  const endDate = watch('endDate')
  const leaveTypeId = watch('leaveTypeId')
  const shortNoticeAck = watch('shortNoticeAck')

  const requestedDays = diffBusinessDays(startDate, endDate)
  const shortNotice = policy ? isShortNotice(startDate, policy.advance_notice_days) : false
  const remainingAfter = balance.available_days - requestedDays
  const selectedLeaveType = leaveTypes.find((lt) => lt.id === leaveTypeId)
  const pDate = policy && startDate ? paymentDate(startDate, policy.payment_lead_days) : ''

  const onSubmit = useCallback(
    async (values: FormValues) => {
      setLoading(true)
      setServerErrors([])
      setWarnings([])

      const defaultPolicy = policy
      if (!defaultPolicy) {
        setServerErrors(['No se encontró la política de vacaciones.'])
        setLoading(false)
        return
      }

      const result = await submitVacationRequest({
        employeeId: employee.id,
        policyId: defaultPolicy.id,
        startDate: values.startDate,
        endDate: values.endDate,
        reason: values.reason ?? null,
        fractionIndex: values.fractionIndex,
        fractionTotal: values.fractionTotal,
        shortNoticeAck: values.shortNoticeAck,
      })

      if (!result.ok) {
        const errs = result.error
        if (Array.isArray(errs)) setServerErrors(errs)
        else if (typeof errs === 'string') setServerErrors([errs])
        else setServerErrors(['Error al enviar la solicitud'])
        setLoading(false)
        return
      }

      if (result.warnings && result.warnings.length > 0) {
        setWarnings(result.warnings as string[])
      }

      setSuccess(true)
      setTimeout(() => router.push('/vacaciones'), 1500)
    },
    [employee.id, policy, router]
  )

  if (success) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <div className="w-16 h-16 bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Solicitud enviada</h2>
        <p className="text-gray-400">Tu solicitud de vacaciones fue enviada para aprobación.</p>
        {warnings.length > 0 && (
          <div className="mt-4 text-left">
            {warnings.map((w, i) => (
              <p key={i} className="text-sm text-yellow-400">{w}</p>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Nueva solicitud de vacaciones</h1>
        <p className="text-gray-400 text-sm mt-1">{employee.full_name}</p>
      </div>

      {/* Balance info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex gap-6">
        <div>
          <p className="text-xs text-gray-500">Saldo disponible</p>
          <p className={cn(
            'text-2xl font-bold',
            balance.available_days > 60 ? 'text-red-400' :
            balance.available_days > 30 ? 'text-yellow-400' : 'text-green-400'
          )}>
            {balance.available_days.toFixed(1)}
          </p>
          <p className="text-xs text-gray-600">días</p>
        </div>
        {startDate && endDate && requestedDays > 0 && (
          <div>
            <p className="text-xs text-gray-500">Días solicitados</p>
            <p className={cn('text-2xl font-bold', remainingAfter < 0 ? 'text-red-400' : 'text-blue-400')}>
              {requestedDays}
            </p>
            <p className="text-xs text-gray-600">días hábiles</p>
          </div>
        )}
        {startDate && endDate && requestedDays > 0 && (
          <div>
            <p className="text-xs text-gray-500">Quedarían</p>
            <p className={cn('text-2xl font-bold', remainingAfter < 0 ? 'text-red-400' : 'text-white')}>
              {remainingAfter.toFixed(1)}
            </p>
            <p className="text-xs text-gray-600">días</p>
          </div>
        )}
      </div>

      {/* Alerts */}
      {balance.available_days > 60 && (
        <div className="flex gap-2 bg-red-950 border border-red-800 rounded-lg px-4 py-3">
          <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <p className="text-xs text-red-300">
            <strong>Alerta Art. 57:</strong> Tienes más de 60 días acumulados. Se recomienda programar vacaciones inmediatamente para evitar sanciones de MITRADEL.
          </p>
        </div>
      )}

      {shortNotice && startDate && (
        <div className="flex gap-2 bg-yellow-950 border border-yellow-800 rounded-lg px-4 py-3">
          <svg className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <p className="text-xs text-yellow-300">
            <strong>Preaviso insuficiente (Art. 56):</strong> La ley exige {policy?.advance_notice_days ?? 60} días de preaviso. Marca el acuerdo mutuo para continuar.
          </p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">

        {/* Leave type */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Tipo de licencia <span className="text-red-400">*</span>
          </label>
          <select
            {...register('leaveTypeId')}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Selecciona un tipo...</option>
            {leaveTypes.map((lt) => (
              <option key={lt.id} value={lt.id}>
                {lt.name_es}
                {!lt.is_paid ? ' (sin goce)' : ''}
                {lt.requires_document ? ' ⚠ Requiere documento' : ''}
              </option>
            ))}
          </select>
          {errors.leaveTypeId && (
            <p className="text-xs text-red-400 mt-1">{errors.leaveTypeId.message}</p>
          )}
          {selectedLeaveType?.requires_document && (
            <p className="text-xs text-yellow-400 mt-1">
              Este tipo de licencia requiere documentación de respaldo.
            </p>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Fecha de inicio <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              {...register('startDate')}
              min={new Date().toISOString().slice(0, 10)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.startDate && (
              <p className="text-xs text-red-400 mt-1">{errors.startDate.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Fecha de fin <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              {...register('endDate')}
              min={startDate || new Date().toISOString().slice(0, 10)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.endDate && (
              <p className="text-xs text-red-400 mt-1">{errors.endDate.message}</p>
            )}
          </div>
        </div>

        {/* Days summary */}
        {startDate && endDate && requestedDays > 0 && (
          <div className="bg-gray-800/50 rounded-lg px-4 py-3 text-sm text-gray-300 space-y-1">
            <p>Días hábiles solicitados: <strong className="text-white">{requestedDays}</strong></p>
            {pDate && (
              <p>Fecha de pago anticipado (Art. 54): <strong className="text-indigo-300">{pDate}</strong></p>
            )}
            {remainingAfter < 0 && (
              <p className="text-red-400">Saldo insuficiente: te faltan {Math.abs(remainingAfter).toFixed(1)} días.</p>
            )}
          </div>
        )}

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Motivo <span className="text-gray-500">(opcional)</span>
          </label>
          <textarea
            {...register('reason')}
            rows={3}
            placeholder="Describe brevemente el motivo de tu solicitud..."
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder-gray-600"
          />
          {errors.reason && (
            <p className="text-xs text-red-400 mt-1">{errors.reason.message}</p>
          )}
        </div>

        {/* Short notice ack */}
        {shortNotice && startDate && (
          <div className="flex items-start gap-3">
            <input
              id="shortNoticeAck"
              type="checkbox"
              {...register('shortNoticeAck')}
              className="mt-0.5 h-4 w-4 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="shortNoticeAck" className="text-sm text-gray-300">
              Confirmo que existe <strong>acuerdo mutuo</strong> entre empleador y trabajador para este preaviso reducido (Art. 56 Código de Trabajo).
            </label>
          </div>
        )}

        {/* Server errors */}
        {serverErrors.length > 0 && (
          <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 space-y-1">
            {serverErrors.map((err, i) => (
              <p key={i} className="text-sm text-red-300">{err}</p>
            ))}
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="bg-yellow-950 border border-yellow-800 rounded-lg px-4 py-3 space-y-1">
            {warnings.map((w, i) => (
              <p key={i} className="text-sm text-yellow-300">{w}</p>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || remainingAfter < 0}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors"
          >
            {loading ? 'Enviando...' : 'Enviar solicitud'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>

      <p className="text-xs text-gray-600 text-center">
        Al enviar esta solicitud, reconoces que has leído la política de vacaciones de LP Development Corp y que cumple con la legislación laboral panameña.
      </p>
    </div>
  )
}
