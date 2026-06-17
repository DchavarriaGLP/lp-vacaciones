// Reglas de negocio puras (sin dependencias de DB ni UI).
// Codifican la legislación panameña + política de la empresa.
// Documentadas en docs/01-legislacion-panama.md

import type { VacationPolicy, VacationBalance } from "@/lib/types/domain";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function diffCalendarDays(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
}

export function diffBusinessDays(start: Date, end: Date): number {
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getUTCDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

export function isShortNotice(
  startDate: Date,
  today: Date,
  policy: Pick<VacationPolicy, "advanceNoticeDays">
): boolean {
  const diff = Math.floor((startDate.getTime() - today.getTime()) / MS_PER_DAY);
  return diff < policy.advanceNoticeDays;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Valida una solicitud contra la política y el balance del empleado.
 * No hace I/O - recibe todo precargado.
 */
export function validateVacationRequest(input: {
  startDate: Date;
  endDate: Date;
  fractionIndex: number;
  fractionTotal: number;
  shortNoticeAck: boolean;
  policy: VacationPolicy;
  balance: VacationBalance;
  today?: Date;
}): ValidationResult {
  const today = input.today ?? new Date();
  const errors: string[] = [];
  const warnings: string[] = [];

  if (input.endDate < input.startDate) {
    errors.push("La fecha fin debe ser posterior a la de inicio.");
  }

  if (input.startDate < today) {
    errors.push("Las vacaciones no pueden iniciar en el pasado.");
  }

  const requestedBusiness = diffBusinessDays(input.startDate, input.endDate);
  if (requestedBusiness <= 0) {
    errors.push("El rango no contiene días hábiles.");
  }

  if (requestedBusiness > input.balance.availableDays) {
    errors.push(
      `Saldo insuficiente: solicitas ${requestedBusiness} días pero tienes ${input.balance.availableDays} disponibles.`
    );
  }

  if (input.fractionTotal > 1 && !input.policy.allowFraction) {
    errors.push(
      "La política de la empresa no permite fraccionamiento de vacaciones (Art. 55 del Código de Trabajo requiere convención colectiva)."
    );
  }

  if (input.fractionTotal > input.policy.maxFractions) {
    errors.push(`No se pueden hacer más de ${input.policy.maxFractions} fracciones.`);
  }

  if (isShortNotice(input.startDate, today, input.policy)) {
    if (!input.shortNoticeAck) {
      errors.push(
        `Preaviso menor a ${input.policy.advanceNoticeDays} días. Marca el acuerdo expreso entre empleador y trabajador.`
      );
    } else {
      warnings.push(
        `Preaviso menor a ${input.policy.advanceNoticeDays} días - se registra con acuerdo expreso.`
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Calcula la fecha de pago anticipado (Art. 54: 3 días antes del inicio).
 */
export function paymentScheduleDate(
  startDate: Date,
  policy: Pick<VacationPolicy, "paymentLeadDays">
): Date {
  const d = new Date(startDate);
  d.setUTCDate(d.getUTCDate() - policy.paymentLeadDays);
  return d;
}

/**
 * Saldo de vacaciones dinámico (no se resetea, crece con el tiempo).
 * Ley panameña Art. 54: 30 días por cada 11 meses = 30/365 días por día calendario.
 *
 *   saldoActual = dias_base + díasTranscurridos(desde fecha_base) * (30/365)
 *
 * Si dias_base o fecha_base son null, se usa dias_pendientes tal cual.
 * Fechas en formato 'YYYY-MM-DD'. Se usa UTC para evitar desfases de zona horaria.
 */
export function saldoVacaciones(
  diasBase: number | null,
  fechaBase: string | null,
  diasPendientes: number
): number {
  if (diasBase == null || fechaBase == null) return diasPendientes;

  const base = new Date(`${fechaBase}T00:00:00Z`).getTime();
  if (Number.isNaN(base)) return diasPendientes;

  const now = Date.now();
  const diasTranscurridos = Math.max(0, Math.floor((now - base) / MS_PER_DAY));
  const saldo = diasBase + diasTranscurridos * (30 / 365);
  return Math.round(saldo * 10) / 10;
}
