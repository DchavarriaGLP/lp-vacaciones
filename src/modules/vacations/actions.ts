"use server";

import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

// Server Actions del módulo de vacaciones.
// Aplican: validación Zod + validación de negocio + Supabase + auditoría.

import { revalidatePath } from "next/cache";
import {
  vacationRequestInputSchema,
  approvalDecisionSchema,
} from "@/lib/schemas/vacation";
import {
  validateVacationRequest,
  diffBusinessDays,
  diffCalendarDays,
  isShortNotice,
} from "@/lib/domain/vacation-rules";
import type { ValidationResult } from "@/lib/domain/vacation-rules";

/**
 * Sube un archivo de incapacidad al bucket privado 'incapacidades'.
 * Devuelve la ruta almacenada (path) para guardarla en vacation_requests.incapacidad_url.
 */
export async function uploadIncapacidad(formData: FormData) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "No autenticado" };

  const file = formData.get("file");
  const employeeId = formData.get("employeeId");

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "Archivo no válido" };
  }
  if (typeof employeeId !== "string" || !employeeId) {
    return { ok: false as const, error: "Empleado no válido" };
  }

  const supabase = createAdminClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${employeeId}/${Date.now()}_${safeName}`;

  const { error } = await supabase.storage
    .from("incapacidades")
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) return { ok: false as const, error: error.message };

  return { ok: true as const, path };
}

/**
 * Genera una URL firmada temporal (1h) para descargar/ver una incapacidad.
 */
export async function getIncapacidadSignedUrl(path: string) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "No autenticado" };
  if (!path) return { ok: false as const, error: "Ruta no válida" };

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from("incapacidades")
    .createSignedUrl(path, 3600);

  if (error || !data) return { ok: false as const, error: error?.message ?? "No se pudo generar el enlace" };
  return { ok: true as const, url: data.signedUrl };
}

export async function submitVacationRequest(formData: unknown) {
  const session = await getSession();
  if (!session) return { ok: false, error: "No autenticado" };
  const supabase = createAdminClient();

  const parsed = vacationRequestInputSchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten() };
  }
  const input = parsed.data;
  const isSick = input.requestType === "sick";

  // Cargar política, balance y empleado
  const [{ data: policy }, { data: balance }, { data: employee }] =
    await Promise.all([
      supabase.from("vacation_policies").select("*").eq("id", input.policyId).single(),
      supabase
        .from("vacation_balances")
        .select("*")
        .eq("employee_id", input.employeeId)
        .eq("period_year", new Date().getUTCFullYear())
        .single(),
      supabase.from("employees").select("id, company_id, manager_id, user_id").eq("id", input.employeeId).single(),
    ]);

  // Para enfermedad no se requiere balance de vacaciones.
  if (!policy || !employee || (!isSick && !balance)) {
    return { ok: false, error: "Datos no encontrados" };
  }

  const start = new Date(input.startDate);
  const end = new Date(input.endDate);

  // Las solicitudes de enfermedad NO se validan contra el saldo de vacaciones.
  let validation: ValidationResult = { ok: true, errors: [], warnings: [] };
  if (!isSick && balance) {
    validation = validateVacationRequest({
      startDate: start,
      endDate: end,
      fractionIndex: input.fractionIndex,
      fractionTotal: input.fractionTotal,
      shortNoticeAck: input.shortNoticeAck,
      policy: {
        id: policy.id,
        companyId: policy.company_id ?? "",
        name: policy.name,
        isDefault: policy.is_default,
        accrualDaysPerMonth: Number(policy.accrual_days_per_month),
        maxAccumulatedPeriods: policy.max_accumulated_periods,
        allowFraction: policy.allow_fraction,
        maxFractions: policy.max_fractions,
        advanceNoticeDays: policy.advance_notice_days,
        paymentLeadDays: policy.payment_lead_days,
        paymentCalcBasis: policy.payment_calc_basis,
        approvalLevels: policy.approval_levels,
      },
      balance: {
        id: balance.id,
        employeeId: balance.employee_id,
        periodYear: balance.period_year,
        accruedDays: Number(balance.accrued_days),
        usedDays: Number(balance.used_days),
        availableDays: Number(balance.available_days),
        accumulationAuthorizedAt: balance.accumulation_authorized_at,
      },
    });

    if (!validation.ok) return { ok: false, error: validation.errors };
  }

  // Insertar request
  const { data: request, error: insertErr } = await supabase
    .from("vacation_requests")
    .insert({
      company_id: employee.company_id,
      employee_id: input.employeeId,
      policy_id: input.policyId,
      leave_type_id: input.leaveTypeId ?? null,
      request_type: input.requestType,
      start_date: input.startDate,
      end_date: input.endDate,
      business_days: diffBusinessDays(start, end),
      calendar_days: diffCalendarDays(start, end),
      reason: input.reason,
      incapacidad_url: input.incapacidadUrl ?? null,
      incapacidad_ref: input.incapacidadRef ?? null,
      status: "pending",
      fraction_index: input.fractionIndex,
      fraction_total: input.fractionTotal,
      short_notice: isShortNotice(start, new Date(), {
        advanceNoticeDays: policy.advance_notice_days,
      }),
      short_notice_ack: input.shortNoticeAck,
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertErr || !request) return { ok: false, error: insertErr?.message };

  // Crear approval step para el manager
  if (employee.manager_id) {
    const { data: manager } = await supabase
      .from("employees")
      .select("user_id")
      .eq("id", employee.manager_id)
      .single();

    if (manager?.user_id) {
      await supabase.from("approval_steps").insert({
        company_id: employee.company_id,
        request_id: request.id,
        step_order: 1,
        approver_id: manager.user_id,
      });

      await supabase.from("notifications").insert({
        company_id: employee.company_id,
        recipient_id: manager.user_id,
        type: "request_submitted",
        title: isSick ? "Nueva solicitud de incapacidad" : "Nueva solicitud de vacaciones",
        body: `Tienes una solicitud${isSick ? " de incapacidad" : ""} pendiente de aprobación para el período ${input.startDate} a ${input.endDate}.`,
        link_url: `/aprobaciones/${request.id}`,
      });
    }
  }

  // Auditoría
  await supabase.from("audit_logs").insert({
    company_id: employee.company_id,
    actor_id: session.id,
    actor_email: session.username,
    action: "create",
    entity_type: "vacation_request",
    entity_id: request.id,
    after_state: request,
  });

  revalidatePath("/vacaciones");
  return { ok: true, data: request, warnings: validation.warnings };
}

export async function decideApproval(formData: unknown) {
  const session = await getSession();
  if (!session) return { ok: false, error: "No autenticado" };
  const supabase = createAdminClient();

  const parsed = approvalDecisionSchema.safeParse(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.flatten() };
  const { requestId, stepId, decision, notes } = parsed.data;

  // Cargar request actual para auditoría
  const { data: before } = await supabase
    .from("vacation_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  // Actualizar step
  const { error: stepErr } = await supabase
    .from("approval_steps")
    .update({ decision, decided_at: new Date().toISOString(), notes })
    .eq("id", stepId);

  if (stepErr) return { ok: false, error: stepErr.message };

  // Si fue rechazo, marcar request inmediatamente
  // Si fue aprobación, verificar si todos los pasos están aprobados
  let newStatus: "approved" | "rejected" | "pending" = "pending";

  if (decision === "rejected") {
    newStatus = "rejected";
  } else {
    const { data: steps } = await supabase
      .from("approval_steps")
      .select("decision")
      .eq("request_id", requestId);
    const allApproved = steps?.every((s) => s.decision === "approved");
    if (allApproved) newStatus = "approved";
  }

  if (newStatus !== "pending") {
    await supabase
      .from("vacation_requests")
      .update({
        status: newStatus,
        decided_at: new Date().toISOString(),
        decided_by: session.id,
        decision_notes: notes,
      })
      .eq("id", requestId);

    // Si fue aprobado: descontar saldo según tipo de solicitud
    if (newStatus === "approved" && before) {
      const isSick = before.request_type === "sick";

      if (isSick) {
        // Enfermedad: NO toca vacaciones. Descuenta de employees.dias_enfermedad.
        const { data: emp } = await supabase
          .from("employees")
          .select("dias_enfermedad")
          .eq("id", before.employee_id)
          .single();

        const current = Number(emp?.dias_enfermedad ?? 0);
        const next = current - Number(before.business_days);

        await supabase
          .from("employees")
          .update({ dias_enfermedad: next })
          .eq("id", before.employee_id);
      } else {
        // Vacaciones: actualizar balance + crear payroll_event (comportamiento existente).
        await supabase.rpc("increment_used_days", {
          p_employee_id: before.employee_id,
          p_period_year: new Date(before.start_date).getUTCFullYear(),
          p_days: before.business_days,
        });

        // Descontar los días aprobados del saldo base para que el saldo
        // dinámico (saldoVacaciones) refleje el consumo. Best-effort.
        const { data: empBal } = await supabase
          .from("employees")
          .select("dias_base, dias_pendientes")
          .eq("id", before.employee_id)
          .single();

        if (empBal) {
          const used = Number(before.business_days);
          const updates: { dias_base?: number; dias_pendientes?: number } = {};
          if (empBal.dias_base != null) {
            updates.dias_base = Number(empBal.dias_base) - used;
          }
          updates.dias_pendientes = Number(empBal.dias_pendientes ?? 0) - used;
          await supabase
            .from("employees")
            .update(updates)
            .eq("id", before.employee_id);
        }

        const { data: policy } = await supabase
          .from("vacation_policies")
          .select("payment_lead_days, payment_calc_basis")
          .eq("id", before.policy_id)
          .single();

        if (policy) {
          const payDate = new Date(before.start_date);
          payDate.setUTCDate(payDate.getUTCDate() - policy.payment_lead_days);

          await supabase.from("payroll_events").insert({
            company_id: before.company_id,
            employee_id: before.employee_id,
            source_type: "vacation_request",
            source_id: before.id,
            event_type: "vacation_payment",
            scheduled_at: payDate.toISOString().slice(0, 10),
            calc_basis: policy.payment_calc_basis,
          });
        }
      }
    }

    // Notificar al empleado
    const { data: emp } = await supabase
      .from("employees")
      .select("user_id")
      .eq("id", before?.employee_id ?? "")
      .single();
    if (emp?.user_id) {
      await supabase.from("notifications").insert({
        company_id: before!.company_id,
        recipient_id: emp.user_id,
        type: newStatus === "approved" ? "approved" : "rejected",
        title:
          newStatus === "approved"
            ? "Vacaciones aprobadas"
            : "Solicitud de vacaciones rechazada",
        body: notes ?? "",
        link_url: `/vacaciones/${requestId}`,
      });
    }
  }

  // Auditoría
  await supabase.from("audit_logs").insert({
    company_id: before?.company_id,
    actor_id: session.id,
    actor_email: session.username,
    action: decision === "approved" ? "approve" : "reject",
    entity_type: "vacation_request",
    entity_id: requestId,
    before_state: before,
  });

  revalidatePath("/aprobaciones");
  revalidatePath("/vacaciones");
  return { ok: true };
}
